import type {Campaign} from './campaign';
import {battlefieldBlocked,battlefieldContains,battlefieldOpeningWithinReach,toggleBattlefieldOpening,validateBattlefield,type Battlefield,type BattlefieldPoint} from './battlefield';
import {buildSoloEncounter,SOLO_ROGUE_ENCOUNTERS,type SoloEncounterId} from './encounterDirector';

/** A scene is a saved physical view of a narrative location, not a second combat engine.
 * The DM alone decides when this view appears. Combat retains action economy and rolls. */
export interface ExplorationScene {
 id:string; title:string; location:string; visible:boolean; battlefield:Battlefield;
 playerPosition:BattlefieldPoint; templateId?:SoloEncounterId; seed?:string; updatedAt:string;
}
type SceneShow={type:'show';id:string;title:string;templateId?:SoloEncounterId;battlefield?:unknown};
type SceneHide={type:'hide'};
type SceneOpening={type:'open'|'close';id:string;objectId:string};
export type DmSceneAction=SceneShow|SceneHide|SceneOpening;
const slug=/^[a-z0-9][a-z0-9-]{2,63}$/;
const compact=(value:unknown)=>typeof value==='string'?value.trim():'';
const isTemplate=(id:string):id is SoloEncounterId=>Object.hasOwn(SOLO_ROGUE_ENCOUNTERS,id);

export function normalizeExplorationScene(value:unknown):ExplorationScene|undefined{
 if(!value||typeof value!=='object')return undefined;
 const o=value as Record<string,unknown>;
 if(!slug.test(compact(o.id))||!compact(o.title)||compact(o.title).length>100||
    !compact(o.location)||compact(o.location).length>120||typeof o.visible!=='boolean'||
    typeof o.updatedAt!=='string'||!Number.isFinite(Date.parse(o.updatedAt)))return undefined;
 try{
  const battlefield=validateBattlefield(o.battlefield);
  if(battlefield.width*battlefield.height>4096||battlefield.objects.length>300)return undefined;
  const p=o.playerPosition as BattlefieldPoint;
  if(!p||!battlefieldContains(battlefield,p)||battlefieldBlocked(battlefield,p))return undefined;
  const templateId=typeof o.templateId==='string'&&isTemplate(o.templateId)?o.templateId:undefined;
  const seed=typeof o.seed==='string'&&o.seed.length<=150?o.seed:undefined;
  return {id:o.id as string,title:o.title as string,location:o.location as string,
   visible:o.visible,battlefield,playerPosition:{x:p.x,y:p.y},updatedAt:o.updatedAt,
   ...(templateId?{templateId}:{}),...(seed?{seed}:{})};
 }catch{return undefined;}
}

/** Unsolicited narration never moves a character, places enemies or reveals a map.
 * Only an explicit DM directive creates/shows the saved physical scene. */
export function applyDmSceneAction(campaign:Campaign,action:unknown,now=new Date().toISOString()):Campaign{
 if(action===undefined||action===null)return campaign;
 if(!campaign.adventureSession||campaign.adventureSession.status!=='exploring'||campaign.combat?.status==='initiative-set')
  throw Error('A DM scene directive is only available during exploration.');
 if(!action||typeof action!=='object'||Array.isArray(action))throw Error('Invalid scene directive.');
 const a=action as Record<string,unknown>;
 const before=campaign.explorationScene;
 if(a.type==='hide'){
  if(Object.keys(a).some(k=>k!=='type'))throw Error('Invalid scene dismissal.');
  return before?{...campaign,explorationScene:{...before,visible:false,updatedAt:now}}:campaign;
 }
 if(a.type==='open'||a.type==='close'){
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
    typeof a.objectId!=='string'||Object.keys(a).some(k=>!['type','id','objectId'].includes(k)))
   throw Error('The scene object is no longer present.');
  const obj=before.battlefield.objects.find(x=>x.id===a.objectId);
  if(!obj||!battlefieldOpeningWithinReach(obj,before.playerPosition))throw Error('The opening is out of reach.');
  if(!['door','window'].includes(obj.kind)||obj.destroyed||obj.locked||
    !['open','close'].includes(a.type)||Boolean(obj.open)===(a.type==='open'))
   throw Error('The opening cannot be changed by narration.');
  const battlefield=toggleBattlefieldOpening(before.battlefield,obj.id,[before.playerPosition]);
  return {...campaign,explorationScene:{...before,battlefield,updatedAt:now}};
 }
 if(a.type!=='show'||typeof a.id!=='string'||!slug.test(a.id)||
    typeof a.title!=='string'||!a.title.trim()||a.title.length>100||
    Object.keys(a).some(k=>!['type','id','title','templateId','battlefield'].includes(k)))
  throw Error('Invalid DM scene declaration.');
 if(a.templateId!==undefined&&a.battlefield!==undefined)throw Error('Choose one authoritative map source.');
 if(a.templateId!==undefined&&(!isTemplate(compact(a.templateId))))throw Error('Unknown scene template.');
 const matching=before?.id===a.id&&before.location===campaign.location?before:undefined;
 if(matching){
  if(a.templateId!==undefined&&matching.templateId!==a.templateId)throw Error('Cannot replace a saved scene template.');
  if(a.battlefield!==undefined)throw Error('Cannot silently replace existing scene geometry.');
  return {...campaign,explorationScene:{...matching,title:a.title.trim(),visible:true,updatedAt:now}};
 }
 let battlefield:Battlefield,playerPosition:BattlefieldPoint,seed:string|undefined;
 if(typeof a.templateId==='string'){
  seed=campaign.id+':scene:'+a.id;
  const scenario=buildSoloEncounter(a.templateId as SoloEncounterId,campaign.location.toLowerCase(),seed).scenario;
  battlefield=scenario.battlefield!;
  playerPosition=scenario.starts[0];
 }else{
  if(a.battlefield===undefined)throw Error('A new scene requires a saved map or verified template.');
  battlefield=validateBattlefield(a.battlefield);
  if(battlefield.width*battlefield.height>4096||battlefield.objects.length>300)
   throw Error('Scene exceeds the current mobile map budget.');
  // A custom scene without a verified character placement uses the first accessible square.
  const square=Array.from({length:battlefield.width*battlefield.height},(_,i)=>({x:i%battlefield.width,y:Math.floor(i/battlefield.width)})).find(p=>!battlefieldBlocked(battlefield,p));
  if(!square)throw Error('Scene contains no accessible position.');
  playerPosition=square;
 }
 return {...campaign,explorationScene:{id:a.id,title:a.title.trim(),location:campaign.location,
  visible:true,battlefield,playerPosition,updatedAt:now,
  ...(typeof a.templateId==='string'?{templateId:a.templateId as SoloEncounterId,seed}:{})}};
}

/** Keep identical map geometry across exploration and the matching encounter. */
export function scenarioFromExplorationScene(campaign:Campaign,templateId:unknown){
 const scene=campaign.explorationScene;
 if(!scene||!scene.visible||scene.location!==campaign.location||!scene.templateId||scene.templateId!==templateId||!scene.seed)return undefined;
 const scenario=buildSoloEncounter(scene.templateId,campaign.location.toLowerCase(),scene.seed).scenario;
 if(scene.battlefield.width!==scenario.battlefield?.width||scene.battlefield.height!==scenario.battlefield?.height)
  return undefined;
 return {...scenario,battlefield:structuredClone(scene.battlefield)};
}
export function syncSceneWithCombat(campaign:Campaign):Campaign{
 const scene=campaign.explorationScene,combat=campaign.combat;
 if(!scene||!combat?.battlefield||!scene.visible||scene.location!==campaign.location||!scene.templateId||
    combat.classicAdventure?.origin!=='dm'||!combat.classicAdventure.scenarioLocation||
    scene.battlefield.width!==combat.battlefield.width||scene.battlefield.height!==combat.battlefield.height)
  return campaign;
 // Synchronize only exact existing physical objects, not a fresh unrelated map.
 const ids=scene.battlefield.objects.map(x=>x.id).join('|');
 if(ids!==combat.battlefield.objects.map(x=>x.id).join('|'))return campaign;
 const playerPosition=combat.playerPosition&&battlefieldContains(combat.battlefield,combat.playerPosition)&&
   !battlefieldBlocked(combat.battlefield,combat.playerPosition)?combat.playerPosition:scene.playerPosition;
 return {...campaign,explorationScene:{...scene,battlefield:structuredClone(combat.battlefield),playerPosition,updatedAt:campaign.updatedAt}};
}
