import { canNighthawkHide, combatRangedFiringPosition, trainingCoverBlocksSight, trainingTerrain, type Campaign } from './campaign';
import {isConcealedFrom} from './tacticalEnemyAI';
import {accessibleOrdinaryAttacks,planOrdinaryWeaponAttack,canOrdinaryActionAttack} from './ordinaryWeaponCombat';
import {ITEMS} from './creationEquipment';

type Combat = NonNullable<Campaign['combat']>;
export type CombatRollLabel = 'Normal roll'|'Advantage'|'Disadvantage';

// Shared between the overview, grid, and regression tests.
export function availableCombatMovement(c: Combat): number {
  return c.steadyAim || c.playerGrappled ? 0 : Math.max(0,(c.movementAllowance??35)-(c.movementUsed??0));
}
export function combatHideStatus(c: Combat): { available:boolean; reason:string; visibleTo:string[] } {
  const p=c.playerPosition??{x:2,y:4};
  // The same directional spectator check used by the rule engine determines
  // what the player sees here; undergrowth conceals the player, not the foe.
  const concealed=(enemy:{x:number;y:number})=>c.battlefield?
    isConcealedFrom(c.battlefield,p,enemy):
    trainingCoverBlocksSight(p,enemy)||(trainingTerrain(p.x,p.y)==='brush'&&
      Math.max(Math.abs(p.x-enemy.x),Math.abs(p.y-enemy.y))>1);
  const visibleTo=[
    ...((c.enemyHp??12)>0&&!concealed(c.enemyPosition??{x:6,y:4})?[c.enemyName]:[]),
    ...(c.secondEnemy&&c.secondEnemy.hp>0&&!concealed(c.secondEnemy.position)?[c.secondEnemy.name]:[]),
  ];
  const resourcesSpent=!!c.bonusActionUsed&&(!!c.actionUsed||!!c.attack);
  const coverEligible=canNighthawkHide(c);
  const available=coverEligible&&!resourcesSpent&&!c.playerHidden;
  const reason=c.playerHidden?'Already Hidden — no new check needed':
    resourcesSpent?'Hide unavailable: Action and Bonus Action spent':
    !coverEligible?'Hide requires heavy obscurity or solid cover out of every living enemy’s sight'+(visibleTo.length?' (seen by '+visibleTo.join(' and ')+')':'')+'.':
    'Out of sight of all enemies — Hide available (DC 15 Dexterity (Stealth))';
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
export function combatWeaponChoices(c:Combat,campaign?:Campaign){
 const p=c.playerPosition??{x:2,y:4},e=c.selectedEnemy==='second'&&c.secondEnemy?c.secondEnemy.position:c.enemyPosition??{x:6,y:4};
 const firing=combatRangedFiringPosition(c,e),origin=firing?.position??p;
 const distance=5*Math.max(Math.abs(origin.x-e.x),Math.abs(origin.y-e.y));
 if(campaign?.characterIdentity){
  const profiles=accessibleOrdinaryAttacks(campaign);
  const actualMeleeDistance=5*Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y));
  const choices=profiles.map(profile=>{
   const handPlan=planOrdinaryWeaponAttack(campaign,profile);
   const range=profile.ranged?distance:actualMeleeDistance;
   const near=range<=5;
   const long=profile.ranged&&range>profile.normalRange;
   const targetProne=c.selectedEnemy==='second'?!!c.secondEnemy?.prone:!!c.enemyProne;
   const hasAdvantage=!!c.playerHidden||!!c.steadyAim||
    (!!c.owl&&c.owl.helpTarget===(c.selectedEnemy==='second'?'second':'first'))||
    (targetProne&&!profile.ranged&&near);
   const hasDisadvantage=profile.heavyPenalty||
    (profile.ranged&&(near||long||targetProne));
   const roll:CombatRollLabel=hasAdvantage===hasDisadvantage?'Normal roll':hasAdvantage?'Advantage':'Disadvantage';
   const pending=!!c.attack&&c.attack.phase!=='resolved';
   const duplicates=profile.action==='bonus'&&profile.mode==='offhand'&&profile.itemId===c.lightAttackWeaponId&&
    (campaign.inventoryLedger?.gear.find(row=>row.name.toLowerCase()===profile.name.replace(' (Off Hand)','').toLowerCase())?.quantity??0)<2;
   const loading=profile.action==='action'&&!!c.loadingAttackThisAction&&
    !!ITEMS.find(item=>item.id===profile.itemId)?.properties?.includes('Loading');
   const actionBlocked=pending||duplicates||loading||(profile.action==='action'?!canOrdinaryActionAttack(campaign):
    !!c.bonusActionUsed||profile.mode==='offhand'&&(!c.actionUsed||!c.lightAttackWeaponId));
   const missingAmmo=!!profile.ammoName&&profile.count<=0;

   const outOfRange=range>profile.maximumRange;
   const coverBlocked=profile.ranged&&!!c.battlefield&&!firing;
   const reason=actionBlocked?'Action not available':
    missingAmmo?'No '+profile.ammoName+' remaining':
    !handPlan.eligible?handPlan.reason:
    outOfRange?'Out of range ('+profile.maximumRange+' ft maximum)':
    coverBlocked?'No clear attack line':
    profile.mode==='thrown'&&profile.count<=0?'No '+profile.name+' remaining':undefined;
   return {id:profile.id,label:profile.name,detail:profile.damageDice+' damage · '+
    (profile.ranged?profile.normalRange+'/'+profile.maximumRange:profile.reach)+' ft'+
    (profile.ammoName?' · 1 '+profile.ammoName:'')+
    (!profile.proficient?' · Not proficient':'')+
    (handPlan.interactions.length?' · '+handPlan.summary:' · Held'),
    roll,eligible:!reason,reason,count:profile.count};
  });
  return {distance,choices,peek:!!firing?.peek};
 }
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
