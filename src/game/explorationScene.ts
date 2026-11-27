import type {Campaign} from './campaign';
import type {NPCRecord} from './world';
import {carryingCapacity} from './carryingCapacity';
import {battlefieldBlocked,battlefieldContains,battlefieldOpeningWithinReach,battlefieldDifficult,battlefieldOpaqueSightBlocked,toggleBattlefieldOpening,validateBattlefield,type Battlefield,type BattlefieldPoint} from './battlefield';
import {buildSoloEncounter,SOLO_ROGUE_ENCOUNTERS,type SoloEncounterId} from './encounterDirector';

/** A scene is a saved physical view of a narrative location, not a second combat engine.
 * The DM alone decides when this view appears. Combat retains action economy and rolls. */
export interface ExplorationScene {
 id:string; title:string; location:string; visible:boolean; battlefield:Battlefield;
 playerPosition:BattlefieldPoint; templateId?:SoloEncounterId; seed?:string; updatedAt:string;
 features?:ExplorationFeature[];npcs?:SceneNpc[];
}
export interface SceneNpc {
 /** Exact stable world record ID, never a second identity or separate relationship. */
 npcId:string;position:BattlefieldPoint;strength:number;following?:boolean;
}
export type ExplorationFeature={
 id:string;kind:'clue'|'trap'|'mechanism'|'key'|'obstacle';label:string;position:BattlefieldPoint;
 dc:10|15|20;skill:'Investigation'|'Perception';discovered:boolean;disarmed?:boolean;
 triggered?:boolean;trapEffect?:TrapEffect;
 /** Traps mounted on a specific door/window trigger from object interaction, not walking. */
 targetObjectId?:string;
 /** A persistent physical lever/plate/button. Requires discovery of an established clue. */
 linkedObjectId?:string;requiresFeatureId?:string;activated?:boolean;
 /** Finite, saved puzzle dependencies: only earlier activated mechanisms and scene-local keys qualify. */
 requiresMechanismIds?:string[];requiresKeyId?:string;
 /** A turn always changes one notch; reaching target activates the mechanism permanently. */
 rotation?:{positions:2|3|4;current:number;target:number};
 /** A scene-local key is acquired once by an explicit player action, never minted into shop gear. */
 collected?:boolean;
 /** Heavy scene interaction is an authored physical check, not arbitrary narrated displacement. */
 obstacleMode?:'shift'|'lift';weightLb?:number;completed?:boolean;
 /** Scene-authored affordances, never created during a pending check. */
 leveragePoint?:boolean;
 rig?:{label:string;multiplier:2};
 helper?:{label:string;strength:number;position:BattlefieldPoint};
 /** Dynamic helper resolves through a present NPC with the same world identity. */
 helperNpcId?:string;
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
export type SceneCheckIntent={sceneId:string;featureId:string;goal:'discover'|'disarm'|'unlock'|'heavy-shift'|'heavy-lift';x?:number;y?:number;method?:'crowbar'|'rig'|'helper'};
export type PendingSceneCheck=SceneCheckIntent&{token:string};
type SceneShow={type:'show';id:string;title:string;templateId?:SoloEncounterId;battlefield?:unknown;features?:unknown[];npcs?:unknown[]};
type SceneMove={type:'move';id:string;x:number;y:number};
type SceneNpcAction={type:'npc';id:string;npcId:string;behavior:'move'|'follow'|'wait'|'operate'|'inspect';x?:number;y?:number;featureId?:string};
type SceneHide={type:'hide'};
type SceneOpening={type:'open'|'close';id:string;objectId:string};
type SceneActivation={type:'activate';id:string;featureId:string};
type SceneTake={type:'take';id:string;featureId:string};
type SceneShift={type:'shift';id:string;objectId:string;x:number;y:number};
export type DmSceneAction=SceneShow|SceneHide|SceneOpening|SceneMove|SceneActivation|SceneShift|SceneTake|SceneNpcAction;
const slug=/^[a-z0-9][a-z0-9-]{2,63}$/;
const compact=(value:unknown)=>typeof value==='string'?value.trim():'';
const isTemplate=(id:string):id is SoloEncounterId=>Object.hasOwn(SOLO_ROGUE_ENCOUNTERS,id);
const heavyIntent=/\b(?:push|pull|drag|shift|move|shove|heave|lift|raise|force|haul)\b/i;
const shiftIntent=/\b(?:push|pull|move|drag|slide|shove|shift|reposition)\b/i;
const takingIntent=/\b(?:take|pick up|collect|retrieve|grab|pocket|carry)\b/i;
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
export function explorationRoute(map:Battlefield,start:BattlefieldPoint,target:BattlefieldPoint,occupied:BattlefieldPoint[]=[]){
 const occupiedKeys=new Set(occupied.map(positionKey));
 const blocked=(point:BattlefieldPoint)=>battlefieldBlocked(map,point)||occupiedKeys.has(positionKey(point));
 if(map.width*map.height>4096||blocked(start)||blocked(target))return undefined;
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
   if(blocked(next)||dx&&dy&&(blocked({x:point.x+dx,y:point.y})||
     blocked({x:point.x,y:point.y+dy})))continue;
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
function normalizeSceneNpcs(value:unknown,map:Battlefield,player:BattlefieldPoint):SceneNpc[]{
 if(!Array.isArray(value)||value.length>12)throw Error('Invalid scene NPC placements.');
 const seen=new Set<string>(),positions=new Set<string>([positionKey(player)]);
 return value.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid scene NPC placement.');
  const n=raw as Record<string,unknown>,npcId=compact(n.npcId),p=n.position as BattlefieldPoint;
  if(!slug.test(npcId)||seen.has(npcId)||Object.keys(n).some(k=>!['npcId','position','strength','following'].includes(k))||
    !p||typeof p!=='object'||!Number.isInteger(p.x)||!Number.isInteger(p.y)||
    !battlefieldContains(map,p)||battlefieldBlocked(map,p)||positions.has(positionKey(p))||
    !Number.isInteger(n.strength)||Number(n.strength)<1||Number(n.strength)>30||
    (n.following!==undefined&&typeof n.following!=='boolean'))
   throw Error('Invalid scene NPC placement.');
  seen.add(npcId);positions.add(positionKey(p));
  return {npcId,position:{x:p.x,y:p.y},strength:n.strength as number,
    ...(n.following===true?{following:true}:{})};
 });
}
const npcKnown=(campaign:Campaign,npcId:string):NPCRecord|undefined=>
 campaign.world?.npcs.find(n=>n.id===npcId);
const occupiedFor=(scene:ExplorationScene,excludeId?:string)=>[
 ...(scene.npcs??[]).filter(n=>n.npcId!==excludeId).map(n=>n.position)
];
function sceneNpcPath(scene:ExplorationScene,npcId:string,target:BattlefieldPoint){
 const npc=scene.npcs?.find(n=>n.npcId===npcId);
 if(!npc)return undefined;
 const occupied=[scene.playerPosition,...occupiedFor(scene,npcId),
   ...(scene.features??[]).filter(f=>f.kind==='trap'&&!f.targetObjectId&&!f.disarmed&&!f.triggered&&f.trapEffect).map(f=>f.position)];
 return explorationRoute(scene.battlefield,npc.position,target,occupied);
}
/** Movement of previously consenting followers is bounded to 30 feet, not teleportation. */
function advanceFollowers(scene:ExplorationScene,playerTarget:BattlefieldPoint):SceneNpc[]|undefined{
 if(!scene.npcs?.some(n=>n.following))return scene.npcs;
 const updated=scene.npcs.map(n=>({...n,position:{...n.position}}));
 const traps=(scene.features??[]).filter(f=>f.kind==='trap'&&!f.targetObjectId&&!f.disarmed&&!f.triggered&&f.trapEffect).map(f=>f.position);
 for(const npc of updated.filter(n=>n.following)){
  const occupied=[playerTarget,...updated.filter(n=>n.npcId!==npc.npcId).map(n=>n.position),...traps];
  const routes=around.map(([dx,dy])=>({x:playerTarget.x+dx,y:playerTarget.y+dy}))
    .filter(p=>battlefieldContains(scene.battlefield,p)&&!battlefieldBlocked(scene.battlefield,p)&&
      !occupied.some(o=>o.x===p.x&&o.y===p.y))
    .map(p=>explorationRoute(scene.battlefield,npc.position,p,occupied)).filter((r):r is NonNullable<typeof r>=>!!r)
    .sort((a,b)=>a.distanceFeet-b.distanceFeet||a.route.length-b.route.length);
  if(!routes.length)continue;
  let traveled=0,at=npc.position;
  for(let i=1;i<routes[0].route.length;i++){
   const step=routes[0].route[i];
   const feet=battlefieldDifficult(scene.battlefield,step)?10:5;
   if(traveled+feet>30)break;
   traveled+=feet;at=step;
  }
  npc.position={...at};
 }
 return updated;
}
function normalizeFeatures(value:unknown,map:Battlefield):ExplorationFeature[]{
 if(!Array.isArray(value)||value.length>12)throw Error('Invalid scene features.');
 const ids=new Set<string>();
 const normalized=value.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid scene feature.');
  const f=raw as Record<string,unknown>,id=compact(f.id),label=compact(f.label);
  const position=f.position as BattlefieldPoint;
  if(!slug.test(id)||ids.has(id)||!['clue','trap','mechanism','key','obstacle'].includes(String(f.kind))||
    label.length<2||label.length>90||!position||!battlefieldContains(map,position)||
    ![10,15,20].includes(Number(f.dc))||
    (f.kind==='obstacle'?f.skill!=='Athletics':!['Investigation','Perception'].includes(String(f.skill)))||
    (f.discovered!==undefined&&typeof f.discovered!=='boolean')||
    (f.disarmed!==undefined&&(f.kind!=='trap'||typeof f.disarmed!=='boolean'||!f.discovered&&f.disarmed))||
    (f.triggered!==undefined&&(f.kind!=='trap'||typeof f.triggered!=='boolean'||!f.discovered&&f.triggered))||
    (f.trapEffect!==undefined&&(f.kind!=='trap'||!trapEffectValid(f.trapEffect)||
      (f.targetObjectId===undefined&&battlefieldBlocked(map,position))))||
    (f.targetObjectId!==undefined&&(!['trap','obstacle'].includes(String(f.kind))||!slug.test(compact(f.targetObjectId))||
      (f.kind==='trap'?!validDoor(map,String(f.targetObjectId)):!map.objects.some(o=>o.id===f.targetObjectId))||
      !objectAtPosition(map,String(f.targetObjectId),position)))||
    (f.obstacleMode!==undefined&&(f.kind!=='obstacle'||!['shift','lift'].includes(String(f.obstacleMode))))||
    (f.weightLb!==undefined&&(f.kind!=='obstacle'||!Number.isSafeInteger(f.weightLb)||Number(f.weightLb)<1||Number(f.weightLb)>6000))||
    (f.leveragePoint!==undefined&&(f.kind!=='obstacle'||typeof f.leveragePoint!=='boolean'))||
    (f.rig!==undefined&&(f.kind!=='obstacle'||!f.rig||typeof f.rig!=='object'||Array.isArray(f.rig)||
      Object.keys(f.rig).some(key=>!['label','multiplier'].includes(key))||
      typeof (f.rig as Record<string,unknown>).label!=='string'||
      String((f.rig as Record<string,unknown>).label).length>60||
      String((f.rig as Record<string,unknown>).label).trim().length<2||
      (f.rig as Record<string,unknown>).multiplier!==2))||
    (f.helperNpcId!==undefined&&(f.kind!=='obstacle'||!slug.test(compact(f.helperNpcId))||f.helper!==undefined))||
    (f.helper!==undefined&&(f.kind!=='obstacle'||!f.helper||typeof f.helper!=='object'||Array.isArray(f.helper)||
      Object.keys(f.helper).some(key=>!['label','strength','position'].includes(key))||
      typeof (f.helper as Record<string,unknown>).label!=='string'||
      String((f.helper as Record<string,unknown>).label).trim().length<2||
      String((f.helper as Record<string,unknown>).label).length>60||
      !Number.isInteger((f.helper as Record<string,unknown>).strength)||
      Number((f.helper as Record<string,unknown>).strength)<1||
      Number((f.helper as Record<string,unknown>).strength)>30||
      !(f.helper as Record<string,unknown>).position||
      !battlefieldContains(map,(f.helper as Record<string,unknown>).position as BattlefieldPoint)||
      battlefieldBlocked(map,(f.helper as Record<string,unknown>).position as BattlefieldPoint)))||
    (f.completed!==undefined&&(f.kind!=='obstacle'||typeof f.completed!=='boolean'||f.completed&&(!f.discovered||f.obstacleMode!=='lift')))||
    (f.kind==='obstacle'&&(!f.targetObjectId||!f.obstacleMode||!f.weightLb||
      !map.objects.some(o=>o.id===f.targetObjectId&&!o.destroyed&&
        (f.obstacleMode==='lift'?['door','window'].includes(o.kind):
        ['statue','cargo','rock','table'].includes(o.kind)&&o.width<=3&&o.height<=3)&&
        (f.obstacleMode!=='lift'||o.forceDC===undefined||o.forceDC===f.dc))))||
    (f.linkedObjectId!==undefined&&(f.kind!=='mechanism'||!slug.test(compact(f.linkedObjectId))||
      !validDoor(map,String(f.linkedObjectId))))||
    (f.requiresFeatureId!==undefined&&(f.kind!=='mechanism'||!slug.test(compact(f.requiresFeatureId))))||
    (f.requiresKeyId!==undefined&&(f.kind!=='mechanism'||!slug.test(compact(f.requiresKeyId))))||
    (f.requiresMechanismIds!==undefined&&(f.kind!=='mechanism'||!Array.isArray(f.requiresMechanismIds)||
      f.requiresMechanismIds.length>4||new Set(f.requiresMechanismIds).size!==f.requiresMechanismIds.length||
      !f.requiresMechanismIds.every((ref:unknown)=>typeof ref==='string'&&slug.test(ref))))||
    (f.rotation!==undefined&&(f.kind!=='mechanism'||!f.rotation||typeof f.rotation!=='object'||Array.isArray(f.rotation)||
      Object.keys(f.rotation).some(key=>!['positions','current','target'].includes(key))||
      ![2,3,4].includes((f.rotation as Record<string,unknown>).positions as number)||
      !Number.isInteger((f.rotation as Record<string,unknown>).current)||
      !Number.isInteger((f.rotation as Record<string,unknown>).target)||
      Number((f.rotation as Record<string,unknown>).target)<1||
      Number((f.rotation as Record<string,unknown>).target)>=Number((f.rotation as Record<string,unknown>).positions)||
      Number((f.rotation as Record<string,unknown>).current)<0||
      Number((f.rotation as Record<string,unknown>).current)>=Number((f.rotation as Record<string,unknown>).positions)))||
    (f.collected!==undefined&&(f.kind!=='key'||typeof f.collected!=='boolean'||f.collected&&!f.discovered))||
    (f.activated!==undefined&&(f.kind!=='mechanism'||typeof f.activated!=='boolean'||f.activated&&!f.discovered||f.activated&&f.rotation&&Number((f.rotation as Record<string,unknown>).current)!==Number((f.rotation as Record<string,unknown>).target))))
    throw Error('Invalid scene feature.');
  ids.add(id);
  return {id,kind:f.kind as ExplorationFeature['kind'],label,position:{x:position.x,y:position.y},
    dc:f.dc as 10|15|20,skill:f.skill as ExplorationFeature['skill'],discovered:f.discovered===true,
    ...(f.kind==='trap'&&f.disarmed===true?{disarmed:true}:{}),
    ...(f.kind==='trap'&&f.triggered===true?{triggered:true}:{}),
    ...(f.kind==='trap'&&f.trapEffect!==undefined?{trapEffect:{...(f.trapEffect as TrapEffect)}}:{}),
    ...((f.kind==='trap'||f.kind==='obstacle')&&f.targetObjectId!==undefined?{targetObjectId:String(f.targetObjectId)}:{}),
    ...(f.kind==='mechanism'&&f.linkedObjectId!==undefined?{linkedObjectId:String(f.linkedObjectId)}:{}),
    ...(f.kind==='mechanism'&&f.requiresFeatureId!==undefined?{requiresFeatureId:String(f.requiresFeatureId)}:{}),
    ...(f.kind==='mechanism'&&f.activated===true?{activated:true}:{}),
    ...(f.kind==='mechanism'&&Array.isArray(f.requiresMechanismIds)?{requiresMechanismIds:[...f.requiresMechanismIds] as string[]}:{}),
    ...(f.kind==='mechanism'&&f.requiresKeyId!==undefined?{requiresKeyId:String(f.requiresKeyId)}:{}),
    ...(f.kind==='mechanism'&&f.rotation!==undefined?{rotation:{...(f.rotation as ExplorationFeature['rotation'])!}}:{}),
    ...(f.kind==='key'&&f.collected===true?{collected:true}:{}),
    ...(f.kind==='obstacle'?{obstacleMode:f.obstacleMode as 'shift'|'lift',weightLb:Number(f.weightLb)}:{}),
    ...(f.kind==='obstacle'&&f.leveragePoint===true?{leveragePoint:true}:{}),
    ...(f.kind==='obstacle'&&f.rig?{rig:{label:String((f.rig as {label:string}).label),multiplier:2 as const}}:{}),
    ...(f.kind==='obstacle'&&f.helperNpcId!==undefined?{helperNpcId:String(f.helperNpcId)}:{}),
    ...(f.kind==='obstacle'&&f.helper?{helper:{label:String((f.helper as {label:string}).label),
      strength:Number((f.helper as {strength:number}).strength),
      position:{...(f.helper as {position:BattlefieldPoint}).position}}}:{}),
    ...(f.kind==='obstacle'&&f.completed===true?{completed:true}:{})};
 });
 for(const f of normalized){
  if(f.kind==='mechanism'){
   if((!f.linkedObjectId&&!f.rotation)||f.requiresFeatureId===f.id||
      f.requiresFeatureId&&!normalized.some(x=>x.id===f.requiresFeatureId&&x.kind==='clue')||
      f.requiresKeyId&&!normalized.some(x=>x.id===f.requiresKeyId&&x.kind==='key')||
      f.requiresMechanismIds?.some(ref=>ref===f.id||!normalized.some(x=>x.id===ref&&x.kind==='mechanism')))
    throw Error('Invalid scene mechanism prerequisites.');
  }
  if(f.kind==='trap'&&f.targetObjectId&&
    normalized.filter(x=>x.kind==='trap'&&x.targetObjectId===f.targetObjectId).length>1)
    throw Error('A door may have only one saved trap.');
  if(f.kind==='obstacle'&&normalized.filter(x=>x.kind==='obstacle'&&x.targetObjectId===f.targetObjectId).length>1)
    throw Error('An object may have only one heavy obstacle definition.');
 }
 // Detect cycles before any state is saved: no mechanism can depend on itself indirectly.
 const visiting=new Set<string>(),done=new Set<string>();
 const visit=(id:string):void=>{
  if(visiting.has(id))throw Error('Cyclic scene mechanism prerequisites.');
  if(done.has(id))return;
  visiting.add(id);
  for(const ref of normalized.find(f=>f.id===id)?.requiresMechanismIds??[])visit(ref);
  visiting.delete(id);done.add(id);
 };
 for(const f of normalized.filter(f=>f.kind==='mechanism'))visit(f.id);
 return normalized;
}
/** Validate the saved geometry before a sealed Athletics check and on result.
 * Heavy shifts move one five-foot cell and cannot overlay other saved features. */
function validHeavyShift(scene:ExplorationScene,feature:ExplorationFeature,x:number,y:number):boolean{
 const o=scene.battlefield.objects.find(obj=>obj.id===feature.targetObjectId);
 if(!o||o.destroyed||o.width>3||o.height>3||
    !Number.isInteger(x)||!Number.isInteger(y)||Math.abs(o.x-x)+Math.abs(o.y-y)!==1||
    !battlefieldOpeningWithinReach(o,scene.playerPosition))return false;
 const rest=scene.battlefield.objects.filter(obj=>obj.id!==o.id);
 // Every destination footprint cell must be clear, not just its north-west corner.
 for(let dx=0;dx<o.width;dx++)for(let dy=0;dy<o.height;dy++){
  const cell={x:x+dx,y:y+dy};
  if(!battlefieldContains(scene.battlefield,cell)||
     cell.x===scene.playerPosition.x&&cell.y===scene.playerPosition.y||
     feature.helper?.position.x===cell.x&&feature.helper?.position.y===cell.y||
     scene.npcs?.some(n=>n.position.x===cell.x&&n.position.y===cell.y)||
     rest.some(obj=>cell.x>=obj.x&&cell.x<obj.x+obj.width&&cell.y>=obj.y&&cell.y<obj.y+obj.height)||
     scene.features?.some(f=>f.id!==feature.id&&f.position.x===cell.x&&f.position.y===cell.y))
    return false;
 }
 // Never detach authored fixtures from another embedded feature.
 return !scene.features?.some(f=>f.id!==feature.id&&f.position.x>=o.x&&f.position.x<o.x+o.width&&
   f.position.y>=o.y&&f.position.y<o.y+o.height);
}
const heavyDirection=(from:BattlefieldPoint,to:BattlefieldPoint):'north'|'south'|'east'|'west'|undefined=>
 to.x===from.x&&to.y===from.y-1?'north':to.x===from.x&&to.y===from.y+1?'south':
 to.y===from.y&&to.x===from.x+1?'east':to.y===from.y&&to.x===from.x-1?'west':undefined;
function ownsCrowbar(campaign:Campaign):boolean{
 return (campaign.inventoryLedger?.gear??[]).some(item=>item.quantity>0&&item.name.toLowerCase()==='crowbar');
}
function resolvedNpcHelper(campaign:Campaign,scene:ExplorationScene,feature:ExplorationFeature){
 if(!feature.helperNpcId)return feature.helper;
 const npc=scene.npcs?.find(n=>n.npcId===feature.helperNpcId);
 const record=npcKnown(campaign,feature.helperNpcId);
 return npc&&record?{label:record.name,strength:npc.strength,position:npc.position}:undefined;
}
function heavyEligible(campaign:Campaign,scene:ExplorationScene,feature:ExplorationFeature,
 goal:'heavy-shift'|'heavy-lift',target?:BattlefieldPoint,method?:SceneCheckIntent['method']):boolean{
 if(feature.kind!=='obstacle'||!feature.discovered||feature.completed||
    feature.obstacleMode!==(goal==='heavy-shift'?'shift':'lift')||!campaign.character||
    (campaign.character.currentHitPoints??1)<=0||campaign.pendingTrapSave)return false;
 const o=scene.battlefield.objects.find(obj=>obj.id===feature.targetObjectId);
 if(!o||o.destroyed||!battlefieldOpeningWithinReach(o,scene.playerPosition))return false;
 if(method==='crowbar'&&(!feature.leveragePoint||!ownsCrowbar(campaign)))return false;
 if(method==='rig'&&!feature.rig)return false;
 const helper=resolvedNpcHelper(campaign,scene,feature);
 if(method==='helper'&&(!helper||!battlefieldOpeningWithinReach(o,helper.position)))return false;
 const base=(carryingCapacity(campaign)??0)*2;
 const max=(method==='rig'?base*2:base)+(method==='helper'?(helper?.strength??0)*30:0);
 if((feature.weightLb??Infinity)>max)return false;
 if(goal==='heavy-lift')return ['door','window'].includes(o.kind)&&!!o.locked&&target===undefined;
 return !!target&&validHeavyShift(scene,feature,target.x,target.y);
}
export function sceneCheckRequest(campaign:Campaign,request:unknown,check:{skill:string;tool?:string;token:string},playerMessage=''):PendingSceneCheck|undefined{
 const scene=campaign.explorationScene;
 if(!request||typeof request!=='object'||!scene||!scene.visible||scene.location!==campaign.location)return undefined;
 const intent=request as Record<string,unknown>;
 if(intent.sceneId!==scene.id||typeof intent.featureId!=='string'||!['discover','disarm','unlock','heavy-shift','heavy-lift'].includes(String(intent.goal)))return undefined;
 if(intent.goal==='heavy-shift'||intent.goal==='heavy-lift'){
  const feature=scene.features?.find(f=>f.id===intent.featureId&&f.kind==='obstacle');
  const target=intent.goal==='heavy-shift'?{x:intent.x as number,y:intent.y as number}:undefined;
  const method=intent.method===undefined?undefined:intent.method as SceneCheckIntent['method'];
  if(method!==undefined&&!['crowbar','rig','helper'].includes(method))return undefined;
  if(!feature||check.skill!=='Athletics'||check.tool||
    !heavyEligible(campaign,scene,feature,intent.goal,target,method)||
    (method==='crowbar'&&!/\bcrowbar\b/i.test(playerMessage))||
    (method==='rig'&&!playerMessage.toLowerCase().includes(feature.rig?.label.toLowerCase()??'__missing_rig__'))||
    (method==='helper'&&!playerMessage.toLowerCase().includes(resolvedNpcHelper(campaign,scene,feature)?.label.toLowerCase()??'__missing_helper__'))||
    !playerMessage.toLowerCase().includes(feature.label.toLowerCase())||!heavyIntent.test(playerMessage)||
    (intent.goal==='heavy-lift'&&(intent.x!==undefined||intent.y!==undefined))||
    (target&&(!shiftIntent.test(playerMessage)||
      !playerMessage.toLowerCase().includes(heavyDirection(
       scene.battlefield.objects.find(o=>o.id===feature.targetObjectId)!,target)??'__missing_direction__'))))
   return undefined;
  return {sceneId:scene.id,featureId:feature.id,goal:intent.goal,token:check.token,
    ...(target?{x:target.x,y:target.y}:{}),...(method?{method}:{})};
 }
 if(intent.x!==undefined||intent.y!==undefined)return undefined;
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
 if(pending.goal==='heavy-shift'||pending.goal==='heavy-lift'){
  const f=scene.features?.find(feature=>feature.id===pending.featureId&&feature.kind==='obstacle');
  const target=pending.goal==='heavy-shift'?{x:pending.x!,y:pending.y!}:undefined;
  if(!f||!heavyEligible(campaign,scene,f,pending.goal,target,pending.method))return rest;
  const o=scene.battlefield.objects.find(obj=>obj.id===f.targetObjectId)!;
  if(pending.goal==='heavy-shift'){
   const battlefield={...scene.battlefield,objects:scene.battlefield.objects.map(obj=>
     obj.id===o.id?{...obj,x:target!.x,y:target!.y}:obj)};
   const features=scene.features!.map(feature=>feature.id===f.id?{...feature,
     position:{x:feature.position.x+target!.x-o.x,y:feature.position.y+target!.y-o.y}}:feature);
   return {...rest,explorationScene:{...scene,battlefield,features,updatedAt:campaign.updatedAt},
     journal:[...campaign.journal,{id:'heavy-shift-'+crypto.randomUUID(),kind:'system',
       text:'Athletics success: moved '+f.label+' one square; position saved.',createdAt:campaign.updatedAt}]};
  }
  const trap=scene.features?.find(feature=>feature.kind==='trap'&&feature.targetObjectId===o.id&&
    !feature.disarmed&&!feature.triggered&&feature.trapEffect);
  const battlefield={...scene.battlefield,objects:scene.battlefield.objects.map(obj=>
    obj.id===o.id?{...obj,locked:false,...(trap?{}:{open:true})}:obj)};
  const features=scene.features!.map(feature=>feature.id===f.id?{...feature,completed:true}:
    feature.id===trap?.id?{...feature,discovered:true,triggered:true}:feature);
  return {...rest,explorationScene:{...scene,battlefield,features,updatedAt:campaign.updatedAt},
    ...(trap?{pendingTrapSave:{sceneId:scene.id,featureId:trap.id,stage:'hazard' as const}}:{}),
    journal:[...campaign.journal,{id:'heavy-lift-'+scene.id+'-'+f.id,kind:'system',
      text:'Athletics success: '+f.label+' lifted'+(trap?' but a trap springs; resolve the saved saving throw.':'. The gate is open.'),createdAt:campaign.updatedAt}]};
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
  const npcs=o.npcs===undefined?undefined:normalizeSceneNpcs(o.npcs,battlefield,p);
  for(const feature of features??[])if(feature.helperNpcId&&!npcs?.some(n=>n.npcId===feature.helperNpcId))
   throw Error('Missing mapped NPC helper.');
  return {id:o.id as string,title:o.title as string,location:o.location as string,
   visible:o.visible,battlefield,playerPosition:{x:p.x,y:p.y},updatedAt:o.updatedAt,
   ...(templateId?{templateId}:{}),...(seed?{seed}:{}),...(features?{features}:{}),...(npcs?{npcs}:{})};
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
 if(a.type==='npc'){
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
   campaign.pendingTrapSave||(campaign.character?.currentHitPoints??1)<=0||
   typeof a.npcId!=='string'||!['move','follow','wait','operate','inspect'].includes(String(a.behavior))||
   Object.keys(a).some(k=>!['type','id','npcId','behavior','x','y','featureId'].includes(k)))
   throw Error('An NPC action requires an active, safe exploration scene.');
  const npc=before.npcs?.find(n=>n.npcId===a.npcId);
  const record=npc&&npcKnown(campaign,npc.npcId);
  if(!npc||!record||!playerMessage.toLowerCase().includes(record.name.toLowerCase())||
    !/\b(?:ask|tell|request|invite|instruct|persuade|convince|call|signal)\b/i.test(playerMessage))
   throw Error('The named NPC must already exist and the player must make a request.');
  if(a.behavior==='follow'||a.behavior==='wait'){
   if(a.x!==undefined||a.y!==undefined||a.featureId!==undefined||
     !(a.behavior==='follow'?/\b(?:follow|come along|join me|come with)\b/i:/\b(?:wait|stay|hold position|stop following)\b/i).test(playerMessage))
    throw Error('NPC following requires an explicit matching request.');
   const npcs=before.npcs!.map(n=>{if(n.npcId!==npc.npcId)return n;const {following:_previous,...rest}=n;return {...rest,...(a.behavior==='follow'?{following:true}:{})};});
   return {...campaign,explorationScene:{...before,npcs,updatedAt:now},
    journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',
     text:record.name+(a.behavior==='follow'?' agrees to follow.':' agrees to wait.'),createdAt:now}]};
  }
  if(a.behavior==='move'){
   if(!Number.isInteger(a.x)||!Number.isInteger(a.y)||a.featureId!==undefined||
     !movementIntent.test(playerMessage))throw Error('NPC movement requires a destination and explicit request.');
   const target={x:a.x as number,y:a.y as number};
   if(!new RegExp('\\bsquare\\s+'+(target.x+1)+'\\s*,\\s*'+(target.y+1)+'\\b','i').test(playerMessage))
    throw Error('NPC movement must match the requested square.');
   const path=sceneNpcPath(before,npc.npcId,target);
   if(!path||path.distanceFeet>60)throw Error('NPC destination is unreachable within a normal exploration move.');
   const npcs=before.npcs!.map(n=>n.npcId===npc.npcId?{...n,position:target}:n);
   return {...campaign,explorationScene:{...before,npcs,updatedAt:now}};
  }
  if(typeof a.featureId!=='string'||a.x!==undefined||a.y!==undefined)
   throw Error('NPC interaction requires a saved target feature.');
  const feature=before.features?.find(f=>f.id===a.featureId&&f.discovered);
  if(!feature||distance(npc.position,feature.position)>1||
    battlefieldOpaqueSightBlocked(before.battlefield,npc.position,feature.position)||
    !playerMessage.toLowerCase().includes(feature.label.toLowerCase()))
   throw Error('The named NPC cannot reach the requested feature.');
  if(a.behavior==='inspect'){
   if(!/\b(?:inspect|investigate|examine|search|look at|study)\b/i.test(playerMessage))
    throw Error('NPC inspection requires a matching player request.');
   // An NPC may investigate, but a mere narrative action cannot reveal concealed clues.
   return {...campaign,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',
     text:record.name+' examines '+feature.label+'. Any discoveries require separate adjudication.',createdAt:now}]};
  }
  if(a.behavior==='operate'){
   if(feature.kind!=='mechanism'||!activationIntent.test(playerMessage))throw Error('NPC can operate only a known mechanism.');
   const actorScene={...before,playerPosition:npc.position};
   const result=applyDmSceneAction({...campaign,explorationScene:actorScene},
     {type:'activate',id:before.id,featureId:feature.id},now,playerMessage);
   const last=result.journal.at(-1);
   return {...result,explorationScene:{...result.explorationScene!,playerPosition:before.playerPosition},
     journal:last?[...result.journal.slice(0,-1),{...last,text:record.name+': '+last.text}]:result.journal};
  }
 }
 if(a.type==='move'){
  if(campaign.pendingTrapSave)throw Error('Resolve the triggered trap before moving.');
  if((campaign.character?.currentHitPoints??1)<=0)throw Error('An unconscious character cannot move.');
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
    !Number.isInteger(a.x)||!Number.isInteger(a.y)||Object.keys(a).some(k=>!['type','id','x','y'].includes(k))||
    !movementIntent.test(playerMessage))throw Error('Movement requires the player to request it in this scene.');
  const target={x:a.x as number,y:a.y as number};
  const path=explorationRoute(before.battlefield,before.playerPosition,target,occupiedFor(before));
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
  return {...campaign,explorationScene:{...before,playerPosition:target,
    ...(before.npcs?{npcs:advanceFollowers(before,target)}:{}),updatedAt:now}};
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
 if(a.type==='take'){
  if(campaign.pendingTrapSave)throw Error('Resolve the triggered trap before taking a key.');
  if((campaign.character?.currentHitPoints??1)<=0)throw Error('An unconscious character cannot take an object.');
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
    typeof a.featureId!=='string'||Object.keys(a).some(k=>!['type','id','featureId'].includes(k))||
    !takingIntent.test(playerMessage))throw Error('Taking an object requires explicit player intent.');
  const key=before.features?.find(f=>f.kind==='key'&&f.id===a.featureId);
  if(!key||!key.discovered||key.collected||distance(before.playerPosition,key.position)>1||
     battlefieldOpaqueSightBlocked(before.battlefield,before.playerPosition,key.position)||
     !playerMessage.toLowerCase().includes(key.label.toLowerCase()))
   throw Error('The key is unknown, out of reach, already collected, or not the requested object.');
  const features=before.features!.map(f=>f.id===key.id?{...f,collected:true}:f);
  return {...campaign,explorationScene:{...before,features,updatedAt:now},
   journal:[...campaign.journal,{id:'key-'+before.id+'-'+key.id,kind:'system',
    text:'You collected '+key.label+'. It remains available in this scene.',createdAt:now}]};
 }
 if(a.type==='activate'){
  if(campaign.pendingTrapSave)throw Error('Resolve the triggered trap before using a mechanism.');
  if((campaign.character?.currentHitPoints??1)<=0)throw Error('An unconscious character cannot use a mechanism.');
  if(!before||!before.visible||before.location!==campaign.location||a.id!==before.id||
   typeof a.featureId!=='string'||Object.keys(a).some(k=>!['type','id','featureId'].includes(k))||
   !activationIntent.test(playerMessage))throw Error('Activation requires an explicit player interaction.');
  const mechanism=before.features?.find(f=>f.kind==='mechanism'&&f.id===a.featureId);
  if(!mechanism||!mechanism.discovered||mechanism.activated||
    distance(before.playerPosition,mechanism.position)>1||
    battlefieldOpaqueSightBlocked(before.battlefield,before.playerPosition,mechanism.position))
    throw Error('The mechanism is not accessible.');
  if(mechanism.requiresFeatureId&&!before.features?.some(f=>f.id===mechanism.requiresFeatureId&&f.kind==='clue'&&f.discovered))
    throw Error('The mechanism prerequisite has not been discovered.');
  if(mechanism.requiresKeyId&&!before.features?.some(f=>f.id===mechanism.requiresKeyId&&f.kind==='key'&&f.collected))
    throw Error('The required key has not been collected.');
  if(mechanism.requiresMechanismIds?.some(ref=>!before.features?.some(f=>f.id===ref&&f.kind==='mechanism'&&f.activated)))
    throw Error('Other mechanisms must be aligned first.');
  if(!playerMessage.toLowerCase().includes(mechanism.label.toLowerCase()))
    throw Error('The requested mechanism does not match the player action.');
  if(mechanism.rotation&&!/\b(?:rotate|turn|twist)\b/i.test(playerMessage))
    throw Error('Rotating a mechanism requires an explicit turn.');
  const rotation=mechanism.rotation?{...mechanism.rotation,
    current:(mechanism.rotation.current+(/\b(?:counterclockwise|anti-clockwise|anticlockwise)\b/i.test(playerMessage)?-1:1)+mechanism.rotation.positions)%mechanism.rotation.positions}:undefined;
  const aligned=!rotation||rotation.current===rotation.target;
  const target=mechanism.linkedObjectId?validDoor(before.battlefield,mechanism.linkedObjectId):undefined;
  if(mechanism.linkedObjectId&&!target)throw Error('The linked opening is no longer present.');
  // A rotated intermediary only aligns when the correct notch is reached. The
  // final linked latch releases the lock, but opening remains a separate action.
  const battlefield=target&&aligned?{...before.battlefield,objects:before.battlefield.objects.map(o=>
    o.id===target.id?{...o,locked:false}:o)}:before.battlefield;
  const features=before.features!.map(f=>{if(f.id!==mechanism.id)return f;
   const {activated:_previous,...rest}=f;return {...rest,...(rotation?{rotation}:{}),...(aligned?{activated:true}:{})};});
  return {...campaign,explorationScene:{...before,battlefield,features,updatedAt:now},
   journal:[...campaign.journal,{id:aligned?'mechanism-'+before.id+'-'+mechanism.id:crypto.randomUUID(),kind:'system',
    text:aligned?'You align '+mechanism.label+(target?'. The mechanism releases '+target.id+'.':'.'):
      'You rotate '+mechanism.label+' to notch '+(rotation!.current+1)+' of '+rotation!.positions+'.',createdAt:now}]};
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
    Object.keys(a).some(k=>!['type','id','title','templateId','battlefield','features','npcs'].includes(k)))
  throw Error('Invalid DM scene declaration.');
 if(a.templateId!==undefined&&a.battlefield!==undefined)throw Error('Choose one authoritative map source.');
 if(a.templateId!==undefined&&(!isTemplate(compact(a.templateId))))throw Error('Unknown scene template.');
 const matching=before?.id===a.id&&before.location===campaign.location?before:undefined;
 if(matching){
  if(a.templateId!==undefined&&matching.templateId!==a.templateId)throw Error('Cannot replace a saved scene template.');
  if(a.battlefield!==undefined)throw Error('Cannot silently replace existing scene geometry.');
  if(a.features!==undefined)throw Error('Cannot rewrite discovered features on a saved scene.');
  if(a.npcs!==undefined)throw Error('Cannot reset NPC placements on a saved scene.');
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
 const features=a.features===undefined?undefined:normalizeFeatures(a.features,battlefield).map(f=>({...f,discovered:f.kind==='mechanism'||f.kind==='obstacle',disarmed:undefined,triggered:undefined,activated:undefined,collected:undefined,completed:undefined}));
 const npcs=a.npcs===undefined?undefined:normalizeSceneNpcs(a.npcs,battlefield,playerPosition);
 if(npcs?.some(n=>n.following))throw Error('An initial scene cannot assume NPC agreement to follow.');
 for(const npc of npcs??[]){
  if(!npcKnown(campaign,npc.npcId))throw Error('A mapped NPC must reference an established world person.');
  if(features?.some(f=>f.kind==='trap'&&!f.targetObjectId&&f.trapEffect&&
     f.position.x===npc.position.x&&f.position.y===npc.position.y))
   throw Error('NPCs may not spawn on an active floor hazard.');
 }
 for(const feature of features??[])if(feature.helperNpcId&&!npcs?.some(n=>n.npcId===feature.helperNpcId))
  throw Error('A dynamic helper must reference an established mapped NPC.');
 return {...campaign,explorationScene:{id:a.id,title:a.title.trim(),location:campaign.location,
  visible:true,battlefield,playerPosition,updatedAt:now,
  ...(features?{features}:{}),...(npcs?{npcs}:{}),...(typeof a.templateId==='string'?{templateId:a.templateId as SoloEncounterId,seed}:{})}};
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
