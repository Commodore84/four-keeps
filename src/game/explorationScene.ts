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
 id:string;kind:'clue'|'trap'|'mechanism';label:string;position:BattlefieldPoint;
 dc:10|15|20;skill:'Investigation'|'Perception';discovered:boolean;disarmed?:boolean;
 triggered?:boolean;trapEffect?:TrapEffect;
 /** Traps mounted on a specific door/window trigger from object interaction, not walking. */
 targetObjectId?:string;
 /** A persistent physical lever/plate/button. Requires discovery of an established clue. */
 linkedObjectId?:string;requiresFeatureId?:string;activated?:boolean;
};
/** Trap profiles are part of the saved DM scene; no effect may be invented
 * when a roll resolves. Older saved traps without a profile remain harmless. */
export type TrapEffect={
 saveAbility:'dex'|'con'|'wis';saveDC:10|15|20;
 damageDice:'1d4'|'1d6'|'2d4'|'2d6';damageType:'piercing'|'poison'|'fire'|'bludgeoning';
 onSave:'half'|'none';
};
export type PendingTrapSave={
 sceneId:string;featureId:string;stage:'hazard'|'concentration';concentrationDC?:number;
 die?:number;damageDice?:number[];
};
const trapDice=(dice:TrapEffect['damageDice'])=>({count:Number(dice[0]),sides:Number(dice.slice(2))});
export function pendingTrapValid(value:unknown):value is PendingTrapSave{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as Record<string,unknown>;
 return slug.test(compact(p.sceneId))&&slug.test(compact(p.featureId))&&
 ['hazard','concentration'].includes(String(p.stage))&&
 (p.concentrationDC===undefined||Number.isInteger(p.concentrationDC)&&Number(p.concentrationDC)>=10&&Number(p.concentrationDC)<=30)&&
 (p.die===undefined||Number.isInteger(p.die)&&Number(p.die)>=1&&Number(p.die)<=20)&&
 (p.damageDice===undefined||Array.isArray(p.damageDice)&&p.damageDice.length<=2&&p.damageDice.every(d=>Number.isInteger(d)&&d>=1&&d<=6))&&
 (p.die!==undefined||p.damageDice===undefined)&&
 (p.stage==='hazard'&&p.concentrationDC===undefined||p.stage==='concentration'&&p.concentrationDC!==undefined);
}
const trapEffectValid=(value:unknown):value is TrapEffect=>{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const e=value as Record<string,unknown>;
 return Object.keys(e).length===5&&['dex','con','wis'].includes(String(e.saveAbility))&&
  [10,15,20].includes(Number(e.saveDC))&&['1d4','1d6','2d4','2d6'].includes(String(e.damageDice))&&
  ['piercing','poison','fire','bludgeoning'].includes(String(e.damageType))&&
  ['half','none'].includes(String(e.onSave));
};
export type SceneCheckIntent={sceneId:string;featureId:string;goal:'discover'|'disarm'|'unlock'};
export type PendingSceneCheck=SceneCheckIntent&{token:string};
type SceneShow={type:'show';id:string;title:string;templateId?:SoloEncounterId;battlefield?:unknown;features?:unknown[]};
type SceneMove={type:'move';id:string;x:number;y:number};
type SceneHide={type:'hide'};
type SceneOpening={type:'open'|'close';id:string;objectId:string};
type SceneActivation={type:'activate';id:string;featureId:string};
type SceneShift={type:'shift';id:string;objectId:string;x:number;y:number};
export type DmSceneAction=SceneShow|SceneHide|SceneOpening|SceneMove|SceneActivation|SceneShift;
const slug=/^[a-z0-9][a-z0-9-]{2,63}$/;
const compact=(value:unknown)=>typeof value==='string'?value.trim():'';
const isTemplate=(id:string):id is SoloEncounterId=>Object.hasOwn(SOLO_ROGUE_ENCOUNTERS,id);
const shiftIntent=/\b(?:push|pull|move|drag|slide|shove|shift|reposition)\b/i;
const activationIntent=/\b(?:pull|push|press|turn|flip|activate|operate|use|slide|rotate|twist|lift|move|throw|trigger)\b/i;
const openingIntent=/\b(?:open|close|shut|push|pull|turn|lift|slide|unlock)\b/i;
const toolOwned=(campaign:Campaign)=>(campaign.inventoryLedger?.gear??[]).some(item=>
 item.quantity>0&&item.name.toLowerCase().replace(/[’']/g,'')==='thieves tools');
const validDoor=(map:Battlefield,id:string)=>map.objects.find(o=>o.id===id&&['door','window'].includes(o.kind)&&!o.destroyed);
const movementIntent=/\b(?:move|walk|go|head|approach|step|sneak|creep|run|cross|enter|follow|advance|retreat|return|travel|climb|continue|proceed|keep going)\b/i;
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
const objectAtPosition=(map:Battlefield,id:string,p:BattlefieldPoint)=>
 map.objects.some(o=>o.id===id&&p.x>=o.x&&p.x<o.x+o.width&&p.y>=o.y&&p.y<o.y+o.height);
function normalizeFeatures(value:unknown,map:Battlefield):ExplorationFeature[]{
 if(!Array.isArray(value)||value.length>12)throw Error('Invalid scene features.');
 const ids=new Set<string>();
 const normalized=value.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid scene feature.');
  const f=raw as Record<string,unknown>,id=compact(f.id),label=compact(f.label);
  const position=f.position as BattlefieldPoint;
  if(!slug.test(id)||ids.has(id)||!['clue','trap','mechanism'].includes(String(f.kind))||
    label.length<2||label.length>90||!position||!battlefieldContains(map,position)||
    ![10,15,20].includes(Number(f.dc))||!['Investigation','Perception'].includes(String(f.skill))||
    (f.discovered!==undefined&&typeof f.discovered!=='boolean')||
    (f.disarmed!==undefined&&(f.kind!=='trap'||typeof f.disarmed!=='boolean'||!f.discovered&&f.disarmed))||
    (f.triggered!==undefined&&(f.kind!=='trap'||typeof f.triggered!=='boolean'||!f.discovered&&f.triggered))||
    (f.trapEffect!==undefined&&(f.kind!=='trap'||!trapEffectValid(f.trapEffect)||
      (f.targetObjectId===undefined&&battlefieldBlocked(map,position))))||
    (f.targetObjectId!==undefined&&(f.kind!=='trap'||!slug.test(compact(f.targetObjectId))||
      !validDoor(map,String(f.targetObjectId))||
      !objectAtPosition(map,String(f.targetObjectId),position)))||
    (f.linkedObjectId!==undefined&&(f.kind!=='mechanism'||!slug.test(compact(f.linkedObjectId))||
      !validDoor(map,String(f.linkedObjectId))))||
    (f.requiresFeatureId!==undefined&&(f.kind!=='mechanism'||!slug.test(compact(f.requiresFeatureId))))||
    (f.activated!==undefined&&(f.kind!=='mechanism'||typeof f.activated!=='boolean'||f.activated&&!f.discovered)))
    throw Error('Invalid scene feature.');
  ids.add(id);
  return {id,kind:f.kind as ExplorationFeature['kind'],label,position:{x:position.x,y:position.y},
    dc:f.dc as 10|15|20,skill:f.skill as ExplorationFeature['skill'],discovered:f.discovered===true,
    ...(f.kind==='trap'&&f.disarmed===true?{disarmed:true}:{}),
    ...(f.kind==='trap'&&f.triggered===true?{triggered:true}:{}),
    ...(f.kind==='trap'&&f.trapEffect!==undefined?{trapEffect:{...(f.trapEffect as TrapEffect)}}:{}),
    ...(f.kind==='trap'&&f.targetObjectId!==undefined?{targetObjectId:String(f.targetObjectId)}:{}),
    ...(f.kind==='mechanism'&&f.linkedObjectId!==undefined?{linkedObjectId:String(f.linkedObjectId)}:{}),
    ...(f.kind==='mechanism'&&f.requiresFeatureId!==undefined?{requiresFeatureId:String(f.requiresFeatureId)}:{}),
    ...(f.kind==='mechanism'&&f.activated===true?{activated:true}:{})};
 });
 for(const f of normalized){
  if(f.kind==='mechanism'){
   if(!f.linkedObjectId||f.requiresFeatureId===f.id||
      f.requiresFeatureId&&!normalized.some(x=>x.id===f.requiresFeatureId&&x.kind==='clue'))
    throw Error('Invalid scene mechanism prerequisites.');
  }
  if(f.kind==='trap'&&f.targetObjectId&&
    normalized.filter(x=>x.kind==='trap'&&x.targetObjectId===f.targetObjectId).length>1)
    throw Error('A door may have only one saved trap.');
 }
 return normalized;
}
export function sceneCheckRequest(campaign:Campaign,request:unknown,check:{skill:string;tool?:string;token:string}):PendingSceneCheck|undefined{
 const scene=campaign.explorationScene;
 if(!request||typeof request!=='object'||!scene||!scene.visible||scene.location!==campaign.location)return undefined;
 const intent=request as Record<string,unknown>;
 if(intent.sceneId!==scene.id||typeof intent.featureId!=='string'||!['discover','disarm','unlock'].includes(String(intent.goal)))return undefined;
 if(intent.goal==='unlock'){
  const object=validDoor(scene.battlefield,intent.featureId);
  if(!object||!object.locked||!toolOwned(campaign)||
     !battlefieldOpeningWithinReach(object,scene.playerPosition)||
     check.skill!=='Sleight of Hand'||check.tool?.toLowerCase().replace(/[’']/g,'')!=='thieves tools')
    return undefined;
  return {sceneId:scene.id,featureId:object.id,goal:'unlock',token:check.token};
 }
 const feature=scene.features?.find(x=>x.id===intent.featureId);
 if(!feature)return undefined;
 if(intent.goal==='discover'){
  const mounted=feature.kind==='trap'&&feature.targetObjectId?
    validDoor(scene.battlefield,feature.targetObjectId):undefined;
  // Inspect the near face of a physical door, not a ray through its opaque center.
  if(feature.discovered||check.skill!==feature.skill||
     (mounted? !battlefieldOpeningWithinReach(mounted,scene.playerPosition):
      distance(scene.playerPosition,feature.position)>6||
      battlefieldOpaqueSightBlocked(scene.battlefield,scene.playerPosition,feature.position)))return undefined;
 }else{
  if(feature.kind!=='trap'||!feature.discovered||feature.disarmed||feature.triggered||!toolOwned(campaign)||check.skill!=='Sleight of Hand'||
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
 if(!scene||scene.id!==pending.sceneId||!scene.visible||scene.location!==campaign.location)return rest;
 if(!success){
  const feature=scene.features?.find(f=>f.id===pending.featureId);
  if(pending.goal!=='disarm'||!feature||feature.kind!=='trap'||feature.disarmed||feature.triggered||!feature.trapEffect)
   return rest;
  const features=scene.features!.map(f=>f.id===feature.id?{...f,discovered:true,triggered:true}:f);
  return {...rest,explorationScene:{...scene,features,updatedAt:campaign.updatedAt},
   pendingTrapSave:{sceneId:scene.id,featureId:feature.id,stage:'hazard'},
   journal:[...campaign.journal,{id:'trap-disarm-'+scene.id+'-'+feature.id,kind:'system',
    text:'Disarming '+feature.label+' failed. The trap springs; resolve the saved '+feature.trapEffect.saveAbility.toUpperCase()+' saving throw.',createdAt:campaign.updatedAt}]};
 }
 if(pending.goal==='unlock'){
  const object=validDoor(scene.battlefield,pending.featureId);
  if(!object||!object.locked)return rest;
  return {...rest,explorationScene:{...scene,battlefield:{...scene.battlefield,
   objects:scene.battlefield.objects.map(o=>o.id===object.id?{...o,locked:false}:o)},updatedAt:campaign.updatedAt}};
 }
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
  if(campaign.pendingTrapSave)throw Error('Resolve the triggered trap before moving.');
  if((campaign.character?.currentHitPoints??1)<=0)throw Error('An unconscious character cannot move.');
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
    !Number.isInteger(a.x)||!Number.isInteger(a.y)||Object.keys(a).some(k=>!['type','id','x','y'].includes(k))||
    !movementIntent.test(playerMessage))throw Error('Movement requires the player to request it in this scene.');
  const target={x:a.x as number,y:a.y as number};
  const path=explorationRoute(before.battlefield,before.playerPosition,target);
  if(!path)throw Error('No traversable route to the requested square.');
  const trapStep=path.route.slice(1).find(point=>
    before.features?.some(f=>f.kind==='trap'&&!f.disarmed&&!f.triggered&&f.trapEffect&&
      f.position.x===point.x&&f.position.y===point.y));
  if(trapStep){
   if(!campaign.character)throw Error('The character sheet is needed to resolve a damaging trap.');
   const trap=before.features!.find(f=>f.kind==='trap'&&!f.disarmed&&!f.triggered&&f.trapEffect&&
      f.position.x===trapStep.x&&f.position.y===trapStep.y)!;
   const features=before.features!.map(f=>f.id===trap.id?{...f,discovered:true,triggered:true}:f);
   return {...campaign,explorationScene:{...before,playerPosition:trapStep,features,updatedAt:now},
     pendingTrapSave:{sceneId:before.id,featureId:trap.id,stage:'hazard'},updatedAt:now,
     journal:[...campaign.journal,{id:'trap-trigger-'+before.id+'-'+trap.id,
       kind:'system',text:'Movement stops: '+trap.label+' triggers. Roll the '+trap.trapEffect!.saveAbility.toUpperCase()+
       ' save before continuing.',createdAt:now}]};
  }
  return {...campaign,explorationScene:{...before,playerPosition:target,updatedAt:now}};
 }
 if(a.type==='shift'){
  if(campaign.pendingTrapSave)throw Error('Resolve the triggered trap before manipulating objects.');
  if((campaign.character?.currentHitPoints??1)<=0)throw Error('An unconscious character cannot move objects.');
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
    typeof a.objectId!=='string'||!Number.isInteger(a.x)||!Number.isInteger(a.y)||
    Object.keys(a).some(k=>!['type','id','objectId','x','y'].includes(k))||
    !shiftIntent.test(playerMessage))throw Error('Moving an object requires explicit player intent.');
  const obj=before.battlefield.objects.find(o=>o.id===a.objectId);
  if(!obj||!['crate','chair'].includes(obj.kind)||obj.destroyed||obj.width!==1||obj.height!==1)
    throw Error('This scene object cannot be shifted without a separate ruling.');
  if(distance(before.playerPosition,{x:obj.x,y:obj.y})>1||
    Math.abs(obj.x-(a.x as number))+Math.abs(obj.y-(a.y as number))!==1)
    throw Error('The object is out of reach or cannot move that far.');
  const direction={dx:(a.x as number)-obj.x,dy:(a.y as number)-obj.y};
  const words=playerMessage.toLowerCase();
  if(/\b(?:north|up)\b/.test(words)&&direction.dy!==-1||
     /\b(?:south|down)\b/.test(words)&&direction.dy!==1||
     /\b(?:east|right)\b/.test(words)&&direction.dx!==1||
     /\b(?:west|left)\b/.test(words)&&direction.dx!==-1)
    throw Error('The object direction does not match the player request.');
  const destination={x:a.x as number,y:a.y as number};
  const rest={...before.battlefield,objects:before.battlefield.objects.filter(o=>o.id!==obj.id)};
  if(!battlefieldContains(rest,destination)||battlefieldBlocked(rest,destination)||
    rest.objects.some(o=>destination.x>=o.x&&destination.x<o.x+o.width&&destination.y>=o.y&&destination.y<o.y+o.height)||
    destination.x===before.playerPosition.x&&destination.y===before.playerPosition.y||
    before.features?.some(f=>f.kind==='trap'&&!f.disarmed&&!f.triggered&&f.trapEffect&&
      destination.x===f.position.x&&destination.y===f.position.y))
    throw Error('The object destination is blocked, occupied or unsafe.');
  const battlefield={...before.battlefield,objects:before.battlefield.objects.map(o=>
    o.id===obj.id?{...o,x:destination.x,y:destination.y}:o)};
  return {...campaign,explorationScene:{...before,battlefield,updatedAt:now},
    journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',
      text:'Moved '+obj.kind+' '+obj.id+' to square '+(destination.x+1)+','+(destination.y+1)+'.',createdAt:now}]};
 }
 if(a.type==='activate'){
  if(campaign.pendingTrapSave)throw Error('Resolve the triggered trap before using a mechanism.');
  if((campaign.character?.currentHitPoints??1)<=0)throw Error('An unconscious character cannot use a mechanism.');
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
   typeof a.featureId!=='string'||Object.keys(a).some(k=>!['type','id','featureId'].includes(k))||
   !activationIntent.test(playerMessage))throw Error('Activation requires an explicit player interaction.');
  const mechanism=before.features?.find(f=>f.kind==='mechanism'&&f.id===a.featureId);
  if(!mechanism||!mechanism.discovered||mechanism.activated||!mechanism.linkedObjectId||
    distance(before.playerPosition,mechanism.position)>1||
    battlefieldOpaqueSightBlocked(before.battlefield,before.playerPosition,mechanism.position))
    throw Error('The mechanism is not accessible.');
  if(mechanism.requiresFeatureId&&!before.features?.some(f=>f.id===mechanism.requiresFeatureId&&f.kind==='clue'&&f.discovered))
    throw Error('The mechanism prerequisite has not been discovered.');
  const target=validDoor(before.battlefield,mechanism.linkedObjectId);
  if(!target)throw Error('The linked opening is no longer present.');
  // The lever releases its lock; the player must still explicitly open it.
  const battlefield={...before.battlefield,objects:before.battlefield.objects.map(o=>
    o.id===target.id?{...o,locked:false}:o)};
  const features=before.features!.map(f=>f.id===mechanism.id?{...f,activated:true}:f);
  return {...campaign,explorationScene:{...before,battlefield,features,updatedAt:now},
   journal:[...campaign.journal,{id:'mechanism-'+before.id+'-'+mechanism.id,kind:'system',
    text:'You activate '+mechanism.label+'. The mechanism releases '+target.id+'.',createdAt:now}]};
 }
 if(a.type==='open'||a.type==='close'){
  if(campaign.pendingTrapSave)throw Error('Resolve the triggered trap before manipulating an opening.');
  if((campaign.character?.currentHitPoints??1)<=0)throw Error('An unconscious character cannot open a door.');
  if(playerMessage&&!openingIntent.test(playerMessage))throw Error('An opening requires explicit player interaction.');
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
    typeof a.objectId!=='string'||Object.keys(a).some(k=>!['type','id','objectId'].includes(k)))
   throw Error('The scene object is no longer present.');
  const obj=before.battlefield.objects.find(x=>x.id===a.objectId);
  if(!obj||!battlefieldOpeningWithinReach(obj,before.playerPosition))throw Error('The opening is out of reach.');
  if(!['door','window'].includes(obj.kind)||obj.destroyed||obj.locked||
    !['open','close'].includes(a.type)||Boolean(obj.open)===(a.type==='open'))
   throw Error('The opening cannot be changed by narration.');
  const trap=a.type==='open'&&before.features?.find(f=>f.kind==='trap'&&f.targetObjectId===obj.id&&
    !f.disarmed&&!f.triggered&&f.trapEffect);
  if(trap){
   if(!campaign.character)throw Error('The character sheet is needed to resolve a dangerous door.');
   const features=before.features!.map(f=>f.id===trap.id?{...f,discovered:true,triggered:true}:f);
   return {...campaign,explorationScene:{...before,features,updatedAt:now},
    pendingTrapSave:{sceneId:before.id,featureId:trap.id,stage:'hazard'},updatedAt:now,
    journal:[...campaign.journal,{id:'trap-door-'+before.id+'-'+trap.id,kind:'system',
     text:'Opening '+obj.id+' springs '+trap.label+'. Resolve the saving throw before trying again.',createdAt:now}]};
  }
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
 const features=a.features===undefined?undefined:normalizeFeatures(a.features,battlefield).map(f=>({...f,discovered:f.kind==='mechanism',disarmed:undefined,triggered:undefined,activated:undefined}));
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


/** A saved hazard event always resolves at most once. Reopening a campaign
 * with the pending event never requires the DM to remember dice or damage. */
export function pendingTrapEffect(campaign:Campaign):TrapEffect|undefined{
 const pending=campaign.pendingTrapSave,scene=campaign.explorationScene;
 if(!pending||!scene||!scene.visible||scene.location!==campaign.location||
    pending.sceneId!==scene.id)return undefined;
 const feature=scene.features?.find(f=>f.id===pending.featureId&&f.kind==='trap'&&f.triggered);
 return feature?.trapEffect;
}
export function pendingTrapRoll(campaign:Campaign,die:number,damageDice:number[]=[]):Campaign{
 const pending=campaign.pendingTrapSave,effect=pendingTrapEffect(campaign);
 if(!pending||!effect||!Number.isInteger(die)||die<1||die>20)throw Error('Invalid pending trap saving throw.');
 if(pending.stage==='hazard'){
  const {count,sides}=trapDice(effect.damageDice);
  if(damageDice.length!==count||damageDice.some(n=>!Number.isInteger(n)||n<1||n>sides))
   throw Error('Invalid trap damage dice.');
 }else if(damageDice.length!==0)throw Error('A concentration save does not deal damage.');
 if(pending.die!==undefined){
  if(pending.die!==die||JSON.stringify(pending.damageDice??[])!==JSON.stringify(damageDice))
   throw Error('The saved trap dice cannot be rerolled.');
  return campaign;
 }
 return {...campaign,pendingTrapSave:{...pending,die,damageDice}};
}
export function resolvePendingTrap(campaign:Campaign,saveModifier:number,now=new Date().toISOString()):Campaign{
 const pending=campaign.pendingTrapSave,effect=pendingTrapEffect(campaign);
 if(!pending||!effect||pending.die===undefined||!Number.isInteger(saveModifier)||saveModifier<-30||saveModifier>40)
  throw Error('A verified saved trap roll is required.');
 const character=campaign.character;
 if(!character)throw Error('A character is required to resolve environmental damage.');
 const dc=pending.stage==='concentration'?pending.concentrationDC:effect.saveDC;
 if(dc===undefined||!Number.isInteger(dc)||dc<1||dc>30)throw Error('Invalid trap save DC.');
 if(pending.stage==='hazard'){
  const {count,sides}=trapDice(effect.damageDice);
  if(pending.damageDice?.length!==count||pending.damageDice.some(n=>!Number.isInteger(n)||n<1||n>sides))
   throw Error('Saved trap damage dice are invalid.');
 }else if(pending.damageDice?.length)throw Error('Concentration cannot carry damage dice.');
 const total=pending.die+saveModifier,success=total>=dc;
 const name=campaign.characterIdentity?.name??'Character',feature=campaign.explorationScene!.features!.find(f=>f.id===pending.featureId)!;
 const eventId='trap-'+pending.stage+'-'+pending.sceneId+'-'+pending.featureId;
 if(pending.stage==='concentration'){
  const lost=!success;
  const spell=campaign.concentration?.spell;
  const next={...campaign,pendingTrapSave:undefined,
   ...(lost?{concentration:undefined,
     spellEffects:(campaign.spellEffects??[]).filter(e=>e.spell!==spell||e.status!=='active')}:{}) ,
   updatedAt:now,journal:[...campaign.journal,{id:eventId,kind:'system' as const,
     text:name+' CON concentration save '+pending.die+(saveModifier>=0?'+':'')+saveModifier+'='+total+
       ' vs DC '+dc+': '+(success?'concentration maintained.':'concentration lost.'),createdAt:now}]};
  return next;
 }
 const raw=(pending.damageDice??[]).reduce((a,b)=>a+b,0);
 const damage=success?(effect.onSave==='none'?0:Math.floor(raw/2)):raw;
 const before=character.currentHitPoints??character.maxHitPoints??10;
 const temporary=character.temporaryHitPoints??0;
 const absorb=Math.min(temporary,damage);
 const after=Math.max(0,before-(damage-absorb));
 const knockedOut=before>0&&after===0;
 const instantlyDead=knockedOut&&damage-absorb-before>=(character.maxHitPoints??10);
 const updatedCharacter={...character,currentHitPoints:after,
  ...(character.temporaryHitPoints!==undefined?{temporaryHitPoints:temporary-absorb}:{}),
  ...(knockedOut?{conditions:[...new Set([...(character.conditions??[]),'Unconscious'])],
    deathSaves:{successes:0,failures:0,stable:false,dead:instantlyDead}}:{})};
 const concentration=campaign.concentration;
 const nextSave:PendingTrapSave|undefined=concentration&&damage>0&&after>0?
  {sceneId:pending.sceneId,featureId:pending.featureId,stage:'concentration',
   concentrationDC:Math.max(10,Math.floor(damage/2))}:undefined;
 return {...campaign,character:updatedCharacter,pendingTrapSave:nextSave,
  ...(after===0&&concentration?{concentration:undefined,
   spellEffects:(campaign.spellEffects??[]).filter(e=>e.spell!==concentration.spell||e.status!=='active')}:{}) ,
  updatedAt:now,journal:[...campaign.journal,{id:eventId,kind:'system',
   text:name+' '+effect.saveAbility.toUpperCase()+' save '+pending.die+(saveModifier>=0?'+':'')+
     saveModifier+'='+total+' vs DC '+dc+': '+(success?'success':'failure')+'. '+
     (damage?feature.label+' deals '+damage+' '+effect.damageType+' damage'+(absorb?' ('+absorb+' absorbed by temporary HP)':'')+'. ':feature.label+' deals no damage. ')+
     'HP '+before+' → '+after+'/'+(character.maxHitPoints??10)+'.'+
     (instantlyDead?' Instant death from massive damage.':knockedOut?' Unconscious at 0 HP.':'')+
     (nextSave?' Concentration saving throw required.':''),createdAt:now}]};
}
