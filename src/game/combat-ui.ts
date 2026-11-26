import { canNighthawkHide, combatRangedFiringPosition, trainingCoverBlocksSight, type Campaign } from './campaign';

type Combat = NonNullable<Campaign['combat']>;
export type CombatRollLabel = 'Normal roll'|'Advantage'|'Disadvantage';

// Shared between the overview, grid, and regression tests.
export function availableCombatMovement(c: Combat): number {
  return c.steadyAim || c.playerGrappled ? 0 : Math.max(0,(c.movementAllowance??35)-(c.movementUsed??0));
}
export function combatHideStatus(c: Combat): { available:boolean; reason:string; visibleTo:string[] } {
  const p=c.playerPosition??{x:2,y:4};
  const visibleTo=[
    ...((c.enemyHp??12)>0&&!trainingCoverBlocksSight(p,c.enemyPosition??{x:6,y:4},c.battlefield)?['Dummy 1']:[]),
    ...(c.secondEnemy&&c.secondEnemy.hp>0&&!trainingCoverBlocksSight(p,c.secondEnemy.position,c.battlefield)?['Dummy 2']:[]),
  ];
  const resourcesSpent=!!c.bonusActionUsed&&(!!c.actionUsed||!!c.attack);
  const available=canNighthawkHide(c)&&!resourcesSpent&&!c.playerHidden;
  const reason=c.playerHidden?'Already Hidden — no new check needed':
    visibleTo.length?'Hide unavailable: visible to '+visibleTo.join(' and '):
    resourcesSpent?'Hide unavailable: Action and Bonus Action spent':
    'Out of sight of all enemies — Hide available';
  return {available,reason,visibleTo};
}
export function combatAttackRollPreview(c:Combat,weapon:'dagger'|'throw-dagger'|'shortbow'):CombatRollLabel {
  const p=c.playerPosition??{x:2,y:4};
  const e=c.selectedEnemy==='second'&&c.secondEnemy?c.secondEnemy.position:c.enemyPosition??{x:6,y:4};
  const firing=weapon==='dagger'?undefined:combatRangedFiringPosition(c,e);
  const origin=firing?.position??p;
  const distance=5*Math.max(Math.abs(origin.x-e.x),Math.abs(origin.y-e.y));
  const ranged=weapon!=='dagger';
  const targetProne=c.selectedEnemy==='second'?!!c.secondEnemy?.prone:!!c.enemyProne;
  const hasAdvantage=!!c.steadyAim||!!c.playerHidden||
    (!!c.owl&&c.owl.helpTarget===(c.selectedEnemy==='second'?'second':'first'))||
    (targetProne&&!ranged&&distance<=5);
  const hasDisadvantage=(ranged&&(distance<=5||distance>(weapon==='shortbow'?80:20)))||
    (targetProne&&ranged);
  return hasAdvantage===hasDisadvantage?'Normal roll':hasAdvantage?'Advantage':'Disadvantage';
}


/** Weapon availability is shared by the normal game and the disposable lab.
 * Keep out-of-ammo weapons visible and accurately disabled instead of silently
 * removing attack types from the interface. The rules engine still authorizes
 * range, cover and inventory at the moment the attack is committed. */
export function combatWeaponChoices(c:Combat){
 const p=c.playerPosition??{x:2,y:4},e=c.selectedEnemy==='second'&&c.secondEnemy?c.secondEnemy.position:c.enemyPosition??{x:6,y:4};
 const firing=combatRangedFiringPosition(c,e),origin=firing?.position??p;
 const distance=5*Math.max(Math.abs(origin.x-e.x),Math.abs(origin.y-e.y));
 const blocked=!!c.battlefield&&!firing;
 const melee=5*Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))<=5,daggers=c.daggersAvailable??2,arrows=c.arrowsRemaining??20;
 const dagger=melee?'dagger' as const:'throw-dagger' as const;
 const choices=[
  {id:dagger,label:melee?'Dagger (Melee)':'Dagger (Throw)',detail:melee?'1d4 piercing · 5 ft':'1d4 piercing · 20/60 ft',
   roll:combatAttackRollPreview(c,dagger),eligible:distance<=60&&daggers>0&&(!blocked||distance<=5),
   reason:daggers<=0?'No daggers available':distance>60?'Out of range (60 ft maximum)':blocked?'No line of fire through total cover':undefined,count:daggers},
  {id:'shortbow' as const,label:'Shortbow',detail:'1d6 piercing · 80/320 ft · 1 arrow',
   roll:combatAttackRollPreview(c,'shortbow'),eligible:distance<=320&&arrows>0&&!blocked,
   reason:arrows<=0?'No arrows remaining':distance>320?'Out of range (320 ft maximum)':blocked?'No line of fire through total cover':undefined,count:arrows}
 ];
 return {distance,choices,peek:!!firing?.peek};
}
