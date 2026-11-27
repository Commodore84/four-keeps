import {battlefieldBlocked,battlefieldContains,battlefieldObjectBlocks,battlefieldCover,battlefieldDifficult,battlefieldOpaqueSightBlocked,objectAt,type Battlefield,type BattlefieldPoint} from './battlefield';

/** Pure, deterministic enemy decisions on the authoritative saved battlefield.
 * 2024 physical cover is directional: the target's AC bonus is calculated from
 * attacker to target, while the enemy's defensive cover is the reverse ray.
 * No artwork or DOM state is ever consulted for rules.
 */
export type EnemyTacticalRole='goblin'|'bandit'|'rat'|'melee';
export type EnemyTacticalMode='melee'|'ranged'|'search'|'wait';
export type EnemyTacticalPlan={position:BattlefieldPoint;movementFeet:number;mode:EnemyTacticalMode;
 targetCover:0|2|5|'total';defensiveCover:0|2|5|'total';distanceFeet:number;reason:string;openingId?:string};
export const enemyRole=(name:string):EnemyTacticalRole=>
 /goblin/i.test(name)?'goblin':/bandit/i.test(name)?'bandit':/(giant rat|\brat\b|vermin)/i.test(name)?'rat':'melee';
const range=(a:BattlefieldPoint,b:BattlefieldPoint)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const key=(p:BattlefieldPoint)=>p.x+','+p.y;
const directions=[[-1,0],[0,-1],[0,1],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]] as const;
const coverValue=(c:0|2|5|'total')=>c==='total'?12:c;

/** An undergrowth tile is heavily obscuring at tactical scale in this engine.
 * Ordinary rubble or water is difficult terrain but does not grant concealment. */
export function obscuredAt(map:Battlefield,point:BattlefieldPoint):boolean{
 return objectAt(map,point).some(o=>!o.destroyed&&o.kind==='undergrowth');
}
export function tacticalSight(map:Battlefield,viewer:BattlefieldPoint,target:BattlefieldPoint){
 const cover=battlefieldCover(map,viewer,target);
 return {cover,visible:cover!=='total'&&!battlefieldOpaqueSightBlocked(map,viewer,target),heavyObscurement:obscuredAt(map,target)};
}
/** Out of line of sight, or heavily obscured, is required for concealed movement.
 * Partial cover alone never makes a creature invisible to observers.
 */
export function isConcealedFrom(map:Battlefield,position:BattlefieldPoint,viewer:BattlefieldPoint):boolean{
 const s=tacticalSight(map,viewer,position);
 return !s.visible||s.heavyObscurement;
}
/** An attack needs both the directional cover test and an unobstructed
 * center-to-center ray. Total Cover is not the only way solid geometry blocks sight. */
export function enemyHasAttackLine(map:Battlefield,from:BattlefieldPoint,to:BattlefieldPoint):boolean{
 return battlefieldCover(map,from,to)!=='total'&&!battlefieldOpaqueSightBlocked(map,from,to);
}

/** Multi-turn route costs toward physical engagement squares. Locked doors remain
 * impassable; unlocked doors may be opened on approach, never walked through
 * while closed. Full-map routing is limited to normal tactical map sizes. */
function approachCosts(map:Battlefield,target:BattlefieldPoint,ally:BattlefieldPoint|undefined,
 role:EnemyTacticalRole,searching:boolean,rangedAvailable:boolean):Map<string,number>{
 const costs=new Map<string,number>();
 if(map.width*map.height>4096)return costs;
 const occupied=(p:BattlefieldPoint)=>key(p)===key(target)||!!ally&&key(p)===key(ally);
 const walkable=(p:BattlefieldPoint)=>{
  if(!battlefieldContains(map,p)||occupied(p))return false;
  const blockers=objectAt(map,p).filter(battlefieldObjectBlocks);
  return blockers.every(o=>o.kind==='door'&&!o.locked);
 };
 const queue:BattlefieldPoint[]=[];
 const ranged=!searching&&rangedAvailable&&(role==='bandit'||role==='goblin');
 const ideal=role==='goblin'?9:7;
 const seed=(p:BattlefieldPoint,weight:number)=>{
  const k=key(p);if(weight>=(costs.get(k)??Infinity))return;
  costs.set(k,weight);queue.push(p);
 };
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const p={x,y};if(!walkable(p)||battlefieldBlocked(map,p))continue;
  const d=range(p,target);
  if(ranged){
   if(d<=1||d>16||!enemyHasAttackLine(map,p,target))continue;
   const defensive=battlefieldCover(map,target,p);
   const protection=defensive==='total'?8:defensive===5?7:defensive===2?3:0;
   const spread=role==='bandit'&&ally?Math.max(0,3-range(p,ally))*3:0;
   seed(p,12+Math.abs(d-ideal)*2+spread-protection);
  }else if(d<=1)seed(p,0);
 }
 // If all normal-range firing squares are inaccessible, route toward melee
 // rather than indefinitely holding a blocked ranged position.
 if(!queue.length&&ranged){
  for(const [dx,dy] of directions){
   const p={x:target.x+dx,y:target.y+dy};
   if(walkable(p)&&!battlefieldBlocked(map,p))seed(p,0);
  }
 }
 // Queue-based positive-weight relaxation handles normal/difficult terrain,
 // without requiring a second movement engine or virtual map geometry.
 for(let head=0;head<queue.length;head++){
  const current=queue[head],value=costs.get(key(current))!;
  for(const [dx,dy] of directions){
   const next={x:current.x+dx,y:current.y+dy};
   if(!walkable(next))continue;
   if(dx&&dy&&(!walkable({x:current.x+dx,y:current.y})||
               !walkable({x:current.x,y:current.y+dy})))continue;
   const nextCost=value+(battlefieldDifficult(map,current)?10:5);
   const k=key(next);
   if(nextCost>=(costs.get(k)??Infinity))continue;
   costs.set(k,nextCost);queue.push(next);
  }
 }
 return costs;
}

export function selectEnemyTactic(opts:{map:Battlefield;start:BattlefieldPoint;target:BattlefieldPoint;
 ally?:BattlefieldPoint;speedFeet:number;role:EnemyTacticalRole;hidden?:boolean;
 lastKnown?:BattlefieldPoint;rangedAvailable?:boolean}):EnemyTacticalPlan{
 const {map,start,ally,role}=opts;
 const apparentTarget=opts.hidden?opts.lastKnown??start:opts.target;
 const maxMovement=Math.max(0,opts.speedFeet);
 const ranged=(role==='goblin'||role==='bandit')&&(opts.rangedAvailable??true);
 const visibleToEnemy=!opts.hidden||!isConcealedFrom(map,opts.target,start);
 const searching=!!opts.hidden&&!visibleToEnemy;
 const target=searching?apparentTarget:opts.target;
 const future=approachCosts(map,target,ally,role,searching,ranged);
 const cells=new Map<string,{point:BattlefieldPoint;spent:number}>();
 const pending=[{point:start,spent:0}],costs=new Map([[key(start),0]]);
 while(pending.length){
  pending.sort((a,b)=>a.spent-b.spent||a.point.y-b.point.y||a.point.x-b.point.x);
  const current=pending.shift()!;
  if(current.spent!==costs.get(key(current.point)))continue;
  cells.set(key(current.point),current);
  for(const [dx,dy] of directions){
   const next={x:current.point.x+dx,y:current.point.y+dy};
   if(battlefieldBlocked(map,next)||key(next)===key(opts.target)||ally&&key(next)===key(ally))continue;
   if(dx&&dy&&(battlefieldBlocked(map,{x:current.point.x+dx,y:current.point.y})||
     battlefieldBlocked(map,{x:current.point.x,y:current.point.y+dy})))continue;
   const spent=current.spent+(battlefieldDifficult(map,next)?10:5);
   if(spent>maxMovement||spent>=(costs.get(key(next))??Infinity))continue;
   costs.set(key(next),spent);
   pending.push({point:next,spent});
  }
 }
 const evaluate=(point:BattlefieldPoint,spent:number)=>{
  const d=range(point,target);
  const defense=battlefieldCover(map,target,point);
  const remaining=future.get(key(point));
  const distanceToGoal=remaining??d*8+60;
  if(searching)return 110-distanceToGoal*1.7-spent*.03+coverValue(defense)*.3;
  if(!ranged)return 190-distanceToGoal*2.3-spent*.04+(d<=1&&enemyHasAttackLine(map,point,target)?30:0);
  const attackLine=enemyHasAttackLine(map,point,target);
  // Adjacent enemies use the existing legal melee attack, never fire
  // a ranged weapon merely to avoid close-combat disadvantage.
  if(range(start,opts.target)<=1)return 250-distanceToGoal*2-spent*.04;
  const normal=d<=16,canShoot=d>1&&d<=64&&attackLine;
  const ideal=role==='goblin'?9:7;
  const protection=coverValue(defense)*2;
  const coordinated=role==='bandit'&&ally?
   (Math.abs((point.x-target.x)*(ally.y-target.y)-(point.y-target.y)*(ally.x-target.x))>=12?8:0)
    -Math.max(0,3-range(point,ally))*4:0;
  // A blocked shot is not a valid firing lane; advance along a genuine
  // multi-turn route to a legal angle, instead of chasing map distance.
  return (canShoot?(normal?260:160):95)-(canShoot?Math.abs(d-ideal)*1.5:0)
    -distanceToGoal*(canShoot?.15:2.5)+protection+coordinated-spent*.1;
 };
 let best={point:start,spent:0},bestScore=-Infinity;
 for(const node of cells.values()){
  const score=evaluate(node.point,node.spent);
  if(score>bestScore+1e-8||(Math.abs(score-bestScore)<1e-8&&node.spent<best.spent)){
   bestScore=score;best=node;
  }
 }
 const point=best.point;
 const distanceFeet=5*range(point,target);
 const targetCover=battlefieldCover(map,point,target),defensiveCover=battlefieldCover(map,target,point);
 let mode:EnemyTacticalMode='wait';
 if(searching)mode='search';
 else if(distanceFeet<=5&&enemyHasAttackLine(map,point,target))mode='melee';
 else if(ranged&&distanceFeet<=320&&enemyHasAttackLine(map,point,target))mode='ranged';
 // A single free object interaction opens only a reachable, unlocked door.
 // Never step into a closed door this turn or bypass a locked opening.
 let openingId:string|undefined;
 if(mode==='wait'||mode==='search'){
  const distanceFrom= future.get(key(point))??Infinity;
  for(const door of map.objects){
   if(door.kind!=='door'||door.open||door.locked||door.destroyed||
      Math.max(Math.abs(point.x-door.x),Math.abs(point.y-door.y))>1)continue;
   const distanceThrough=future.get(key({x:door.x,y:door.y}))??Infinity;
   if(distanceThrough<distanceFrom&&Number.isFinite(distanceThrough)){
    openingId=door.id;break;
   }
  }
 }
 const reason=openingId?'Opens an unlocked door to continue the approach':
  mode==='search'?'Searches for the hidden opponent':
  mode==='melee'?(role==='rat'?'Rushes into biting range':'Closes for a melee strike'):
  mode==='ranged'?(defensiveCover===5||defensiveCover==='total'?'Takes a protected firing position':
   role==='goblin'?'Keeps distance and lines up a shortbow shot':
   ally?'Separates from an ally to establish a second firing lane':'Lines up a crossbow shot'):
  'Advances toward a reachable attack position';
 return {position:point,movementFeet:best.spent,mode,targetCover,defensiveCover,distanceFeet,reason,
  ...(openingId?{openingId}:{})};
}
