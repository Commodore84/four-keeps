import { canNighthawkHide, trainingCoverBlocksSight, type Campaign } from './campaign';

type Combat = NonNullable<Campaign['combat']>;
export type CombatRollLabel = 'Normal roll'|'Advantage'|'Disadvantage';

// Shared between the overview, grid, and regression tests.
export function availableCombatMovement(c: Combat): number {
  return c.steadyAim || c.playerGrappled ? 0 : Math.max(0,(c.movementAllowance??35)-(c.movementUsed??0));
}
export function combatHideStatus(c: Combat): { available:boolean; reason:string; visibleTo:string[] } {
  const p=c.playerPosition??{x:2,y:4};
  const visibleTo=[
    ...((c.enemyHp??12)>0&&!trainingCoverBlocksSight(p,c.enemyPosition??{x:6,y:4})?['Dummy 1']:[]),
    ...(c.secondEnemy&&c.secondEnemy.hp>0&&!trainingCoverBlocksSight(p,c.secondEnemy.position)?['Dummy 2']:[]),
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
  const distance=5*Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y));
  const ranged=weapon!=='dagger';
  const targetProne=c.selectedEnemy==='second'?!!c.secondEnemy?.prone:!!c.enemyProne;
  const hasAdvantage=!!c.steadyAim||!!c.playerHidden||
    (!!c.owl&&c.owl.helpTarget===(c.selectedEnemy==='second'?'second':'first'))||
    (targetProne&&!ranged&&distance<=5);
  const hasDisadvantage=(ranged&&(distance<=5||distance>(weapon==='shortbow'?80:20)))||
    (targetProne&&ranged);
  return hasAdvantage===hasDisadvantage?'Normal roll':hasAdvantage?'Advantage':'Disadvantage';
}
