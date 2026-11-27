import type {Campaign} from './campaign';
import {battlefieldBlocked,battlefieldContains,battlefieldOpeningWithinReach,battlefieldDifficult,battlefieldOpaqueSightBlocked,toggleBattlefieldOpening,validateBattlefield,type Battlefield,type BattlefieldPoint} from './battlefield';
import {buildSoloEncounter,SOLO_ROGUE_ENCOUNTERS,type SoloEncounterId} from './encounterDirector';

/** A scene is a saved physical view of a narrative location, not a second combat engine.
 * The DM alone decides when this view appears. Combat retains action economy and rolls. */
export interface ExplorationScene {
 id:string; title:string; location:string; visible:boolean; battlefield:Battlefield;
 playerPosition:BattlefieldPoint; templateId?:SoloEncounterId; seed?:string; updatedAt:string;
 features?:ExplorationFeature[];
}
export type ExplorationFeature={
 id:string;kind:'clue'|'trap';label:string;position:BattlefieldPoint;
 dc:10|15|20;skill:'Investigation'|'Perception';discovered:boolean;disarmed?:boolean;
};
export type SceneCheckIntent={sceneId:string;featureId:string;goal:'discover'|'disarm'};
export type PendingSceneCheck=SceneCheckIntent&{token:string};
type SceneShow={type:'show';id:string;title:string;templateId?:SoloEncounterId;battlefield?:unknown;features?:unknown[]};
type SceneMove={type:'move';id:string;x:number;y:number};
type SceneHide={type:'hide'};
type SceneOpening={type:'open'|'close';id:string;objectId:string};
export type DmSceneAction=SceneShow|SceneHide|SceneOpening|SceneMove;
const slug=/^[a-z0-9][a-z0-9-]{2,63}$/;
const compact=(value:unknown)=>typeof value==='string'?value.trim():'';
const isTemplate=(id:string):id is SoloEncounterId=>Object.hasOwn(SOLO_ROGUE_ENCOUNTERS,id);
const movementIntent=/\b(?:move|walk|go|head|approach|step|sneak|creep|run|cross|enter|follow|advance|retreat|return|travel|climb)\b/i;
const positionKey=(p:BattlefieldPoint)=>p.x+','+p.y;
const around=[[-1,0],[0,-1],[0,1],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]] as const;
const distance=(a:BattlefieldPoint,b:BattlefieldPoint)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
/** Pure path validation, with the exact authoritative blocked/difficult terrain.
 * No character position changes until a player movement intent and DM action agree. */
export function explorationRoute(map:Battlefield,start:BattlefieldPoint,target:BattlefieldPoint){
 if(map.width*map.height>4096||battlefieldBlocked(map,start)||battlefieldBlocked(map,target))return undefined;
 const costs=new Map<string,number>([[positionKey(start),0]]);
 const parents=new Map<string,string>();
 const cells=new Map<string,BattlefieldPoint>([[positionKey(start),start]]);
 const todo=[{point:start,cost:0}];
 const targetKey=positionKey(target);
 while(todo.length){
  todo.sort((a,b)=>a.cost-b.cost||a.point.y-b.point.y||a.point.x-b.point.x);
  const {point,cost}=todo.shift()!;
  const current=positionKey(point);
  if(cost!==costs.get(current))continue;
  if(current===targetKey){
   const route=[point];let at=current;
   while(parents.has(at)){at=parents.get(at)!;route.push(cells.get(at)!);}
   return {route:route.reverse(),distanceFeet:cost};
  }
  for(const [dx,dy] of around){
   const next={x:point.x+dx,y:point.y+dy};
   if(battlefieldBlocked(map,next)||dx&&dy&&(battlefieldBlocked(map,{x:point.x+dx,y:point.y})||
     battlefieldBlocked(map,{x:point.x,y:point.y+dy})))continue;
   const nextCost=cost+(battlefieldDifficult(map,next)?10:5);
   const key=positionKey(next);
   if(nextCost>=(costs.get(key)??Infinity))continue;
   costs.set(key,nextCost);parents.set(key,current);cells.set(key,next);todo.push({point:next,cost:nextCost});
  }
 }
 return undefined;
}
function normalizeFeatures(value:unknown,map:Battlefield):ExplorationFeature[]{
 if(!Array.isArray(value)||value.length>12)throw Error('Invalid scene features.');
 const ids=new Set<string>();
 return value.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid scene feature.');
  const f=raw as Record<string,unknown>,id=compact(f.id),label=compact(f.label);
  const position=f.position as BattlefieldPoint;
  if(!slug.test(id)||ids.has(id)||!['clue','trap'].includes(String(f.kind))||
    label.length<2||label.length>90||!position||!battlefieldContains(map,position)||
    ![10,15,20].includes(Number(f.dc))||!['Investigation','Perception'].includes(String(f.skill))||
    (f.discovered!==undefined&&typeof f.discovered!=='boolean')||
    (f.disarmed!==undefined&&(f.kind!=='trap'||typeof f.disarmed!=='boolean'||!f.discovered&&f.disarmed)))
    throw Error('Invalid scene feature.');
  ids.add(id);
  return {id,kind:f.kind as 'clue'|'trap',label,position:{x:position.x,y:position.y},
    dc:f.dc as 10|15|20,skill:f.skill as ExplorationFeature['skill'],discovered:f.discovered===true,
    ...(f.kind==='trap'&&f.disarmed===true?{disarmed:true}:{})};
 });
}
export function sceneCheckRequest(campaign:Campaign,request:unknown,check:{skill:string;tool?:string;token:string}):PendingSceneCheck|undefined{
 const scene=campaign.explorationScene;
 if(!request||typeof request!=='object'||!scene||!scene.visible||scene.location!==campaign.location)return undefined;
 const intent=request as Record<string,unknown>;
 if(intent.sceneId!==scene.id||typeof intent.featureId!=='string'||!['discover','disarm'].includes(String(intent.goal)))return undefined;
 const feature=scene.features?.find(x=>x.id===intent.featureId);
 if(!feature)return undefined;
 if(intent.goal==='discover'){
  if(feature.discovered||check.skill!==feature.skill||distance(scene.playerPosition,feature.position)>6||
    battlefieldOpaqueSightBlocked(scene.battlefield,scene.playerPosition,feature.position))return undefined;
 }else{
  const hasTools=(campaign.inventoryLedger?.gear??[]).some(item=>item.quantity>0&&
    item.name.toLowerCase().replace(/[’']/g,'')==='thieves tools');
  if(feature.kind!=='trap'||!feature.discovered||feature.disarmed||!hasTools||check.skill!=='Sleight of Hand'||
     distance(scene.playerPosition,feature.position)>1||
     check.tool?.toLowerCase().replace(/[’']/g,'')!=='thieves tools')return undefined;
 }
 return {sceneId:scene.id,featureId:feature.id,goal:intent.goal as PendingSceneCheck['goal'],token:check.token};
}
/** A sealed server check result, not unverified narration, changes feature state. */
export function resolveSceneCheck(campaign:Campaign,token:string,success:boolean):Campaign{
 const pending=campaign.pendingSceneCheck;
 if(!pending||pending.token!==token)return campaign;
 const {pendingSceneCheck:_pending,...rest}=campaign;
 const scene=campaign.explorationScene;
 if(!scene||scene.id!==pending.sceneId||!scene.visible||scene.location!==campaign.location||!success)return rest;
 const features=scene.features?.map(f=>f.id!==pending.featureId?f:
   pending.goal==='discover'&&!f.discovered?{...f,discovered:true}:
   pending.goal==='disarm'&&f.kind==='trap'&&f.discovered&&!f.disarmed?{...f,disarmed:true}:f);
 return {...rest,explorationScene:{...scene,features,updatedAt:campaign.updatedAt}};
}


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
  const features=o.features===undefined?undefined:normalizeFeatures(o.features,battlefield);
  return {id:o.id as string,title:o.title as string,location:o.location as string,
   visible:o.visible,battlefield,playerPosition:{x:p.x,y:p.y},updatedAt:o.updatedAt,
   ...(templateId?{templateId}:{}),...(seed?{seed}:{}),...(features?{features}:{})};
 }catch{return undefined;}
}

/** Unsolicited narration never moves a character, places enemies or reveals a map.
 * Only an explicit DM directive creates/shows the saved physical scene. */
export function applyDmSceneAction(campaign:Campaign,action:unknown,now=new Date().toISOString(),playerMessage=''):Campaign{
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
 if(a.type==='move'){
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
    !Number.isInteger(a.x)||!Number.isInteger(a.y)||Object.keys(a).some(k=>!['type','id','x','y'].includes(k))||
    !movementIntent.test(playerMessage))throw Error('Movement requires the player to request it in this scene.');
  const target={x:a.x as number,y:a.y as number};
  const path=explorationRoute(before.battlefield,before.playerPosition,target);
  if(!path)throw Error('No traversable route to the requested square.');
  return {...campaign,explorationScene:{...before,playerPosition:target,updatedAt:now}};
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
    Object.keys(a).some(k=>!['type','id','title','templateId','battlefield','features'].includes(k)))
  throw Error('Invalid DM scene declaration.');
 if(a.templateId!==undefined&&a.battlefield!==undefined)throw Error('Choose one authoritative map source.');
 if(a.templateId!==undefined&&(!isTemplate(compact(a.templateId))))throw Error('Unknown scene template.');
 const matching=before?.id===a.id&&before.location===campaign.location?before:undefined;
 if(matching){
  if(a.templateId!==undefined&&matching.templateId!==a.templateId)throw Error('Cannot replace a saved scene template.');
  if(a.battlefield!==undefined)throw Error('Cannot silently replace existing scene geometry.');
  if(a.features!==undefined)throw Error('Cannot rewrite discovered features on a saved scene.');
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
 const features=a.features===undefined?undefined:normalizeFeatures(a.features,battlefield).map(f=>({...f,discovered:false,disarmed:undefined}));
 return {...campaign,explorationScene:{id:a.id,title:a.title.trim(),location:campaign.location,
  visible:true,battlefield,playerPosition,updatedAt:now,
  ...(features?{features}:{}),...(typeof a.templateId==='string'?{templateId:a.templateId as SoloEncounterId,seed}:{})}};
}

/** Keep identical map geometry across exploration and the matching encounter. */
export function scenarioFromExplorationScene(campaign:Campaign,templateId:unknown){
 const scene=campaign.explorationScene;
 if(!scene||!scene.visible||scene.location!==campaign.location||!scene.templateId||scene.templateId!==templateId||!scene.seed)return undefined;
 const scenario=buildSoloEncounter(scene.templateId,campaign.location.toLowerCase(),scene.seed).scenario;
 if(scene.battlefield.width!==scenario.battlefield?.width||scene.battlefield.height!==scenario.battlefield?.height)
  return undefined;
 return {...scenario,battlefield:structuredClone(scene.battlefield),starts:[scene.playerPosition],entryOptions:[{label:'Current explored position',square:scene.playerPosition}]};
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
