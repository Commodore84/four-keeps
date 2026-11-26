import {battlefieldBlocked,battlefieldCover,battlefieldDifficult,battlefieldOpaqueSightBlocked,objectAt,type Battlefield,type BattlefieldPoint} from './battlefield';

/** Pure, deterministic enemy decisions on the authoritative saved battlefield.
 * 2024 physical cover is directional: the target's AC bonus is calculated from
 * attacker to target, while the enemy's defensive cover is the reverse ray.
 * No artwork or DOM state is ever consulted for rules.
 */
export type EnemyTacticalRole='goblin'|'bandit'|'rat'|'melee';
export type EnemyTacticalMode='melee'|'ranged'|'search'|'wait';
export type EnemyTacticalPlan={position:BattlefieldPoint;movementFeet:number;mode:EnemyTacticalMode;
 targetCover:0|2|5|'total';defensiveCover:0|2|5|'total';distanceFeet:number;reason:string};
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
export function selectEnemyTactic(opts:{map:Battlefield;start:BattlefieldPoint;target:BattlefieldPoint;
 ally?:BattlefieldPoint;speedFeet:number;role:EnemyTacticalRole;hidden?:boolean;
 lastKnown?:BattlefieldPoint}):EnemyTacticalPlan{
 const {map,start,ally,role}=opts;
 const apparentTarget=opts.hidden?opts.lastKnown??start:opts.target;
 const maxMovement=Math.max(0,opts.speedFeet);
 const ranged=role==='goblin'||role==='bandit';
 const visibleToEnemy=!opts.hidden||!isConcealedFrom(map,opts.target,start);
 const searching=!!opts.hidden&&!visibleToEnemy;
 const target=searching?apparentTarget:opts.target;
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
  const d=range(point,target),attackCover=battlefieldCover(map,point,target);
  const defense=battlefieldCover(map,target,point);
  if(searching)return 100-d*8-spent*.06+coverValue(defense)*.4;
  if(!ranged)return 180-d*18-spent*.06+(d<=1?30:0);
  // Ranged opponents use their printed 80-foot normal range (16 squares).
  // Close enemies are handled with their existing melee attack; do not
  // retreat through a player to manufacture a ranged opportunity.
  if(range(start,opts.target)<=1)return 250-d*20-spent*.1;
  const line=d>1&&d<=64&&attackCover!=='total';
  const longRange=d>16;
  const ideal=role==='goblin'?9:7;
  const advantageCover=coverValue(defense)*2.6;
  // Two bandits prefer separate firing lanes so one obstacle cannot
  // neutralize both attackers. This is tactical positioning, not free
  // flanking Advantage on a ranged attack.
  const coordinated=role==='bandit'&&ally?
   (Math.abs((point.x-target.x)*(ally.y-target.y)-(point.y-target.y)*(ally.x-target.x))>=12?8:0)
    -Math.max(0,3-range(point,ally))*4:0;
  return (line?(longRange?205:260):70)-(line?Math.abs(d-ideal)*2:d*7)-
   (attackCover==='total'?55:coverValue(attackCover)*2) +advantageCover+coordinated-spent*.23;
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
 else if(distanceFeet<=5&&targetCover!=='total')mode='melee';
 else if(ranged&&distanceFeet<=320&&targetCover!=='total')mode='ranged';
 const reason=mode==='search'?'Searches for the hidden opponent':
  mode==='melee'?(role==='rat'?'Rushes into biting range':'Closes for a melee strike'):
  mode==='ranged'?(defensiveCover===5||defensiveCover==='total'?'Takes a protected firing position':
    role==='goblin'?'Keeps distance and lines up a shortbow shot':
    ally?'Separates from an ally to establish a second firing lane':'Lines up a crossbow shot'):
  'Cannot establish a clear attack';
 return {position:point,movementFeet:best.spent,mode,targetCover,defensiveCover,distanceFeet,reason};
}
