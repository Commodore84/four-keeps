import {describe,it,expect} from 'vitest';
import {newCampaign,registerSubclassActor,chooseSubclassResistance} from './campaign';
import {initialSubclassCombatState} from './subclassCombatRules';
import {startCompanionEncounter,moveCompanion,endCompanionTurn,damageCompanion,conditionCompanion,finishCompanionEncounter,attackCompanion,setCompanionSpeed ,useCompanionAction,setCompanionObstacles,companionLineOfSight,companionOpportunityAttackEligible,setCompanionCover,companionCoverStatus,companionPartySnapshot,startUnifiedEncounter,synchronizeNighthawkHitPoints,recordCompanionReaction,removeCompanionCondition,nighthawkEncounterStatistics,useCompanionBonusAction,setCompanionConcentration,companionConcentrationSaveDC,resolveCompanionConcentrationSave,setCompanionConsumable,spendCompanionConsumable,spendUnifiedNighthawkSpellSlot,resolveCompanionOpportunityAttack,nighthawkEncounterInventory,companionOpportunityCandidates,spendUnifiedNighthawkInventory,setCompanionTactics,applyCompanionCondition,nighthawkEquipmentReferences,addCompanionEnemy,companionConditionEffects,setNighthawkEncounterLoadout,resolveCompanionSavingThrow,nighthawkEquippedAttack,nighthawkEquippedDefense,standCompanionFromProne,attackCompanionWithVerifiedStats,resolveCompanionDeathSave,healCompanion,configureEnemyTactic,previewEnemyTurn,refreshNighthawkEncounterStatistics,executeEnemyMovementTurn,stabilizeCompanion,recoverStableCompanion,attackWithThrownEquippedWeapon,executeEnemyMoveAndAttackTurn,executeEnemyAttackTurn,dismissEnemyOpportunityReactions,recoverEncounterThrownWeapons,recoverEncounterAmmunition,resumeEnemyInterruptedMovement,configureEnemyRangedAttack,executeEnemyRangedAttackTurn} from './companionEncounter';
const build=()=>{
 let c=newCampaign('Companion test');
 c=registerSubclassActor(c,'paladin',initialSubclassCombatState('paladin','paladin-devotion',7,3));
 c=registerSubclassActor(c,'druid',initialSubclassCombatState('druid','druid-land',10,1,'polar'));
 c=registerSubclassActor(c,'fiend',initialSubclassCombatState('warlock','warlock-fiend',10,3));
 c=chooseSubclassResistance(c,'fiend','Fire');
 return c;
};
const start=()=>startCompanionEncounter(build(),{paladin:15,druid:12,fiend:9},{paladin:{x:0,y:0},druid:{x:1,y:0},fiend:{x:5,y:5}},{paladin:30,druid:22,fiend:25});
describe('isolated companion encounter vertical slice',()=>{
 it('resolves reaction at pre-exit square once and resumes without spending the enemy action',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:7,y:0},paladin:{x:1,y:1}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:1,y:0},12,13,4);
  c=configureEnemyTactic(c,'goblin1','lowest-hp');
  c=endCompanionTurn(c,'nighthawk');
  c=executeEnemyMoveAndAttackTurn(c,'goblin1',17,4,'Piercing');
  const from=c.companionEncounter!.pendingOpportunity!.from;
  c=resolveCompanionOpportunityAttack(c,'paladin','goblin1',18,5,13,2,0,'Slashing');
  expect(c.companionEncounter?.participants.goblin1.hp).toBe(10);
  expect(c.companionEncounter?.participants.paladin.reactionUsed).toBe(true);
  expect(c.companionEncounter?.pendingOpportunity?.attackerIds).toEqual([]);
  c=resumeEnemyInterruptedMovement(c,'goblin1');
  expect(c.companionEncounter?.participants.goblin1.x).toBeGreaterThan(from.x);
  expect(c.companionEncounter?.participants.goblin1.actionUsed).toBe(false);
  expect(c.combat).toEqual(base.combat);
 });

 it('requires verified ranged profile and uses DM-supplied rolls for enemy ranged attack',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:8},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'archer1',15,{x:6,y:8},12,13,4,30,5,2,'1d6 piercing');
  c=endCompanionTurn(c,'nighthawk');
  expect(()=>executeEnemyRangedAttackTurn(c,'archer1','nighthawk',16,4,'Piercing')).toThrow('Verified hostile ranged');
  c=configureEnemyRangedAttack(c,'archer1',60);
  c=executeEnemyRangedAttackTurn(c,'archer1','nighthawk',16,4,'Piercing');
  expect(c.companionEncounter?.participants.nighthawk.hp).toBe(4);
  expect(c.companionEncounter?.order[c.companionEncounter.turnIndex]).toBe('paladin');
  expect(c.combat).toEqual(base.combat);
  expect(JSON.parse(JSON.stringify(c)).companionEncounter.participants.archer1.rangedAttackFeet).toBe(60);
 });

 it('interrupts enemy movement at exact reach-exit square, survives serialization and resumes after declined reaction',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:7,y:0},paladin:{x:1,y:1}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:1,y:0},12,13,4);
  c=configureEnemyTactic(c,'goblin1','lowest-hp');
  c=endCompanionTurn(c,'nighthawk');
  c=executeEnemyMoveAndAttackTurn(c,'goblin1',16,3,'Piercing');
  const pending=c.companionEncounter?.pendingOpportunity;
  expect(pending?.moverId).toBe('goblin1');
  expect(pending?.attackerIds).toContain('paladin');
  expect(c.companionEncounter?.participants.goblin1).toMatchObject(pending!.from);
  expect(pending?.destination).toBeDefined();
  expect(pending?.to).not.toEqual(pending?.from);
  expect(c.companionEncounter?.participants.goblin1.actionUsed).toBe(false);
  expect(()=>resumeEnemyInterruptedMovement(c,'goblin1')).toThrow('Pending opportunity');
  c=JSON.parse(JSON.stringify(c)) as typeof c;
  c=dismissEnemyOpportunityReactions(c,'goblin1');
  c=resumeEnemyInterruptedMovement(c,'goblin1');
  expect(c.companionEncounter?.pendingOpportunity).toBeUndefined();
  expect(c.companionEncounter?.participants.goblin1.x).toBeGreaterThan(pending!.from.x);
  expect(c.combat).toEqual(base.combat);
 });

 it('reconciles expended ammunition after completing an encounter without changing legacy combat',()=>{
  const base=build();
  let c=startUnifiedEncounter({...base,equipment:{daggers:0,arrows:2,caltrops:0,ballBearings:0},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Shortbow',quantity:1}]}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:2,y:2},12,13,4);
  c=setNighthawkEncounterLoadout(c,'weaponId','shortbow');
  c=attackCompanionWithVerifiedStats(c,'nighthawk','goblin1',15,2,'Piercing',80);
  c=finishCompanionEncounter(c);
  c=recoverEncounterAmmunition(c,'arrows',1);
  expect(c.companionEncounter?.status).toBe('completed');
  expect(c.equipment?.arrows).toBe(2);
  expect(c.combat).toEqual(base.combat);
 });

 it('reconciles only previously spent verified arrows and persists ledger state',()=>{
  const base=build();
  let c=startUnifiedEncounter({...base,equipment:{daggers:0,arrows:2,caltrops:0,ballBearings:0},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Shortbow',quantity:1}]}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:2,y:2},12,13,4);
  c=setNighthawkEncounterLoadout(c,'weaponId','shortbow');
  c=attackCompanionWithVerifiedStats(c,'nighthawk','goblin1',16,2,'Piercing',80);
  expect(c.equipment?.arrows).toBe(1);
  expect(c.companionEncounter?.ammunitionPendingRecovery?.arrows).toBe(1);
  expect(()=>recoverEncounterAmmunition(c,'arrows',2)).toThrow('Invalid ammunition recovery');
  c=recoverEncounterAmmunition(c,'arrows',1);
  expect(c.equipment?.arrows).toBe(2);
  expect(()=>recoverEncounterAmmunition(c,'arrows',1)).toThrow('Invalid ammunition recovery');
  expect(c.combat).toEqual(base.combat);
  expect(JSON.parse(JSON.stringify(c)).equipment.arrows).toBe(2);
 });

 it('executes an enemy move and DM-rolled attack while keeping legacy combat unchanged',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:8},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:3,y:8},12,13,4,30,5,2,'1d6 piercing');
  c=configureEnemyTactic(c,'goblin1','nearest');
  c=endCompanionTurn(c,'nighthawk');
  c=executeEnemyMoveAndAttackTurn(c,'goblin1',17,4,'Piercing');
  expect(c.companionEncounter?.participants.nighthawk.hp).toBe(4);
  expect(c.companionEncounter?.order[c.companionEncounter.turnIndex]).toBe('paladin');
  expect(c.companionEncounter?.participants.goblin1.actionUsed).toBe(true);
  expect(c.combat).toEqual(base.combat);
  const persisted=JSON.parse(JSON.stringify(c)) as typeof c;
  expect(persisted.companionEncounter?.participants.nighthawk.hp).toBe(4);
 });
 it('never spends a pending enemy attack before the DM resolves movement reactions',()=>{
  let c=startUnifiedEncounter(build(),{nighthawk:20,paladin:10},{nighthawk:{x:0,y:8},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:3,y:8},12,13,4,30);
  c=configureEnemyTactic(c,'goblin1','nearest');
  c=endCompanionTurn(c,'nighthawk');
  // A verified pending reaction is retained instead of silently skipped.
  c={...c,companionEncounter:{...c.companionEncounter!,pendingOpportunity:{moverId:'goblin1',attackerIds:['paladin'],from:{x:3,y:8},to:{x:1,y:8}}}};
  expect(()=>executeEnemyAttackTurn(c,'goblin1',15,3,'Piercing')).toThrow('Pending opportunity');
  expect(c.companionEncounter?.participants.goblin1.actionUsed).toBe(false);
  c=dismissEnemyOpportunityReactions(c,'goblin1');
  expect(c.companionEncounter?.pendingOpportunity).toBeUndefined();
 });
 it('recovers only DM-confirmed thrown daggers once and preserves campaign combat',()=>{
  const base=build();
  let c=startUnifiedEncounter({...base,equipment:{daggers:2,arrows:0,caltrops:0,ballBearings:0}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:2,y:2},12,13,4);
  c=setNighthawkEncounterLoadout(c,'weaponId','dagger');
  c=attackWithThrownEquippedWeapon(c,'nighthawk','goblin1',15,2,'Piercing',20);
  expect(c.companionEncounter?.thrownWeaponsPendingRecovery?.daggers).toBe(1);
  expect(c.equipment?.daggers).toBe(1);
  c=recoverEncounterThrownWeapons(c,'daggers',1);
  expect(c.equipment?.daggers).toBe(2);
  expect(c.companionEncounter?.thrownWeaponsPendingRecovery?.daggers).toBe(0);
  expect(()=>recoverEncounterThrownWeapons(c,'daggers',1)).toThrow('Invalid thrown-weapon recovery');
  expect(c.combat).toEqual(base.combat);
 });

 it('resets death saves and unconsciousness after a natural 20',()=>{
  let c=startUnifiedEncounter(build(),{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',10,'Fire');
  c=resolveCompanionDeathSave(c,'nighthawk',20);
  expect(c.companionEncounter?.participants.nighthawk.hp).toBe(1);
  expect(c.companionEncounter?.participants.nighthawk.deathSaves).toBeUndefined();
  expect(c.companionEncounter?.participants.nighthawk.conditions).not.toContain('Unconscious');
 });
 it('damage breaks stabilization and restarts failures without changing the legacy combat',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',10,'Fire');
  c=stabilizeCompanion(c,'nighthawk');
  c=damageCompanion(c,'nighthawk',1,'Fire');
  expect(c.companionEncounter?.participants.nighthawk.deathSaves).toMatchObject({stable:false,failures:1});
  expect(c.combat).toEqual(base.combat);
 });

 it('moves a configured enemy deterministically along valid grid paths and ends its turn',()=>{
  let c=startUnifiedEncounter(build(),{nighthawk:20,paladin:10},{nighthawk:{x:0,y:8},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:8,y:8},12,13,4,20);
  c=configureEnemyTactic(c,'goblin1','nearest');
  c=endCompanionTurn(c,'nighthawk');
  const next=executeEnemyMovementTurn(c,'goblin1');
  expect(next.companionEncounter?.participants.goblin1.movementSpentFeet).toBe(20);
  expect(next.companionEncounter?.order[next.companionEncounter.turnIndex]).toBe('paladin');
  expect(next.companionEncounter?.participants.goblin1.x).toBeLessThan(8);
  expect(next.combat).toEqual(c.combat);
  expect(JSON.parse(JSON.stringify(next)).companionEncounter.participants.goblin1.enemyTactic).toBe('nearest');
 });
 it('stabilizes at zero HP, rejects premature recovery and restores 1 HP after supplied d4 hours',()=>{
  let c=startUnifiedEncounter(build(),{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',10,'Fire');
  c=stabilizeCompanion(c,'nighthawk');
  expect(c.companionEncounter?.participants.nighthawk.deathSaves).toMatchObject({stable:true,successes:0,failures:0});
  expect(()=>resolveCompanionDeathSave(c,'nighthawk',10)).toThrow('already resolved');
  expect(()=>recoverStableCompanion(c,'nighthawk',1,2)).toThrow('requirements');
  c=recoverStableCompanion(c,'nighthawk',2,2);
  expect(c.companionEncounter?.participants.nighthawk.hp).toBe(1);
  expect(c.companionEncounter?.participants.nighthawk.deathSaves).toBeUndefined();
 });
 it('spends a verified thrown dagger but not a verified melee dagger',()=>{
  const base=build();
  let c=startUnifiedEncounter({...base,equipment:{daggers:2,arrows:0,caltrops:0,ballBearings:0}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:2,y:2},12,13,4);
  c=setNighthawkEncounterLoadout(c,'weaponId','dagger');
  c=attackWithThrownEquippedWeapon(c,'nighthawk','goblin1',15,2,'Piercing',20);
  expect(c.equipment?.daggers).toBe(1);
  expect(c.combat).toEqual(base.combat);
  expect(()=>attackWithThrownEquippedWeapon(c,'nighthawk','goblin1',15,2,'Piercing',20)).toThrow();
 });

 it('refreshes verified sheet speed and max HP without rewriting encounter damage or legacy combat',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',3,'Fire');
  c={...c,character:{...c.character!,speed:40,maxHitPoints:12}};
  const next=refreshNighthawkEncounterStatistics(c);
  expect(next.companionEncounter?.participants.nighthawk).toMatchObject({hp:7,maxHp:12,speedFeet:40});
  expect(next.combat).toEqual(base.combat);
  const persisted=JSON.parse(JSON.stringify(next)) as typeof next;
  expect(persisted.companionEncounter?.participants.nighthawk.hp).toBe(7);
  expect(persisted.companionEncounter?.nighthawkSheetHpSnapshot).toBe(10);
  expect(()=>refreshNighthawkEncounterStatistics({...c,character:{...c.character!,maxHitPoints:5}})).toThrow('reconcile manually');
 });

 it('marks massive damage as immediate death and prevents healing the dead',()=>{
  let c=startUnifiedEncounter(build(),{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',20,'Fire');
  expect(c.companionEncounter?.participants.nighthawk.deathSaves?.dead).toBe(true);
  expect(()=>healCompanion(c,'nighthawk',10)).toThrow('Invalid healing');
  expect(()=>resolveCompanionDeathSave(c,'nighthawk',20)).toThrow('already resolved');
 });
 it('applies two failed death saves on a melee critical hit against unconscious target',()=>{
  let c=startUnifiedEncounter(build(),{nighthawk:20,paladin:10},{nighthawk:{x:0,y:1},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',10,'Fire');
  c=addCompanionEnemy(c,'goblin1',15,{x:1,y:1},10,12,5,30,5,0,'1d4 piercing');
  c=endCompanionTurn(c,'nighthawk');
  c=attackCompanionWithVerifiedStats(c,'goblin1','nighthawk',14,2,'Piercing',5,18);
  expect(c.companionEncounter?.participants.nighthawk.deathSaves?.failures).toBe(2);
  expect(c.companionEncounter?.log.at(-1)).toContain('critical hit');
 });
 it('spends ledger crossbow bolts for verified equipped crossbow and persists count',()=>{
  const base=build();
  let c=startUnifiedEncounter({...base,inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Light Crossbow',quantity:1},{name:'Crossbow Bolts',quantity:2}]}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:2,y:2},12,13,4);
  c=setNighthawkEncounterLoadout(c,'weaponId','light-crossbow');
  c=attackCompanionWithVerifiedStats(c,'nighthawk','goblin1',16,3,'Piercing',80);
  expect(c.inventoryLedger?.gear.find(g=>g.name==='Crossbow Bolts')?.quantity).toBe(1);
  expect(c.combat).toEqual(base.combat);
 });
 it('previews DM-configured enemy tactics deterministically and persists them',()=>{
  let c=startUnifiedEncounter(build(),{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:2,y:2},12,13,4);
  c=endCompanionTurn(c,'nighthawk');
  expect(previewEnemyTurn(c,'goblin1').targetId).toBeNull();
  c=configureEnemyTactic(c,'goblin1','nearest');
  expect(previewEnemyTurn(c,'goblin1')).toMatchObject({tactic:'nearest',targetId:'nighthawk',distanceFeet:10,inReach:false});
  c=configureEnemyTactic(c,'goblin1','lowest-hp');
  expect(previewEnemyTurn(c,'goblin1').targetId).toBe('nighthawk');
  expect(c.companionEncounter?.participants.goblin1.enemyTactic).toBe('lowest-hp');
 });

 it('rejects stale character HP synchronization rather than overwriting sheet edits',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',3,'Fire');
  const edited={...c,character:{...c.character!,currentHitPoints:9}};
  expect(()=>synchronizeNighthawkHitPoints(edited)).toThrow('changed since encounter snapshot');
  expect(edited.character.currentHitPoints).toBe(9);
  const synced=synchronizeNighthawkHitPoints(c);
  expect(synced.character?.currentHitPoints).toBe(7);
  expect(synced.companionEncounter?.nighthawkSheetHpSnapshot).toBe(7);
 });

 it('uses DM-verified enemy damage modifier without writing character sheet',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:1,y:2},12,13,4,30,5,3,'1d6 slashing');
  c=endCompanionTurn(c,'nighthawk');
  expect(c.companionEncounter?.participants.goblin1).toMatchObject({damageModifier:3,damageDice:'1d6 slashing'});
  c=attackCompanionWithVerifiedStats(c,'goblin1','nighthawk',15,4,'Slashing',5);
  expect(c.companionEncounter?.participants.nighthawk.hp).toBe(3);
  expect(c.character).toEqual(base.character);
  expect(c.combat).toEqual(base.combat);
 });
 it('tracks death saves, critical failures, stability and healing without changing legacy combat',()=>{
  const base=build();
  let c=startUnifiedEncounter(base,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',10,'Fire');
  expect(c.companionEncounter?.participants.nighthawk.conditions).toContain('Unconscious');
  c=resolveCompanionDeathSave(c,'nighthawk',1);
  expect(c.companionEncounter?.participants.nighthawk.deathSaves?.failures).toBe(2);
  c=endCompanionTurn(c,'nighthawk');c=endCompanionTurn(c,'paladin');
  c=resolveCompanionDeathSave(c,'nighthawk',11);
  expect(c.companionEncounter?.participants.nighthawk.deathSaves?.successes).toBe(1);
  c=healCompanion(c,'nighthawk',4);
  expect(c.companionEncounter?.participants.nighthawk).toMatchObject({hp:4});
  expect(c.companionEncounter?.participants.nighthawk.deathSaves).toBeUndefined();
  expect(c.companionEncounter?.participants.nighthawk.conditions).not.toContain('Unconscious');
  expect(c.character).toEqual(base.character);
  expect(c.combat).toEqual(base.combat);
 });
 it('automatically expends exactly one verified shortbow arrow on successful attack resolution',()=>{
  const base=build();
  let c=startUnifiedEncounter({...base,equipment:{daggers:0,arrows:2,caltrops:0,ballBearings:0},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Shortbow',quantity:1}]}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=addCompanionEnemy(c,'goblin1',15,{x:2,y:2},12,13,4);
  c=setNighthawkEncounterLoadout(c,'weaponId','shortbow');
  expect(()=>attackCompanionWithVerifiedStats(c,'nighthawk','goblin1',0,4,'Piercing',80)).toThrow();
  expect(c.equipment?.arrows).toBe(2);
  c=attackCompanionWithVerifiedStats(c,'nighthawk','goblin1',15,4,'Piercing',80);
  expect(c.equipment?.arrows).toBe(1);
  expect(c.combat).toEqual(base.combat);
 });

 it('resolves invisible attack advantage and opposing disadvantage cancellation',()=>{
  let c=applyCompanionCondition(start(),'paladin','Invisible');
  expect(()=>attackCompanion(c,'paladin','druid',6,0,12,3,0,'Fire',5)).toThrow('second d20');
  const hit=attackCompanion(c,'paladin','druid',6,0,12,3,0,'Fire',5,19);
  expect(hit.companionEncounter?.participants.druid.hp).toBe(19);
  c=applyCompanionCondition(c,'druid','Invisible');
  // Both Invisible: advantage and disadvantage cancel, so no second roll required.
  c=endCompanionTurn(c,'paladin');
  c=endCompanionTurn(c,'druid');
  c=endCompanionTurn(c,'fiend');
  expect(()=>attackCompanion(c,'paladin','druid',6,0,12,3,0,'Fire',5)).not.toThrow();
 });

 it('resolves equipped Nighthawk versus enemy AC and enemy versus character-sheet AC',()=>{
  const base=build();
  let c=startUnifiedEncounter({...base,equipment:{daggers:2,arrows:0,caltrops:0,ballBearings:0}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=setNighthawkEncounterLoadout(c,'weaponId','dagger');
  c=addCompanionEnemy(c,'goblin1',15,{x:1,y:2},12,13,4);
  const legacy=c.combat;
  c=attackCompanionWithVerifiedStats(c,'nighthawk','goblin1',12,4,'Piercing',5);
  expect(c.companionEncounter?.participants.goblin1.hp).toBe(5);
  expect(c.combat).toEqual(legacy);
  c=endCompanionTurn(c,'nighthawk');
  expect(c.companionEncounter?.order[c.companionEncounter.turnIndex]).toBe('goblin1');
  c=attackCompanionWithVerifiedStats(c,'goblin1','nighthawk',12,5,'Slashing',5);
  expect(c.companionEncounter?.participants.nighthawk.hp).toBe((base.character?.currentHitPoints??base.character?.maxHitPoints??10)-5);
  expect(c.character).toEqual(base.character);
 });

 it('derives verified Rogue dagger attacks and equipped leather armor without changing legacy combat',()=>{
  const base=build();
  const c=startUnifiedEncounter({...base,equipment:{daggers:2,arrows:0,caltrops:0,ballBearings:0},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Leather Armor',quantity:1}]}},{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  expect(nighthawkEquippedAttack(c)).toBeNull();
  const dagger=setNighthawkEncounterLoadout(c,'weaponId','dagger');
  expect(nighthawkEquippedAttack(dagger)).toMatchObject({damageDice:'1d4 piercing',attackModifier:5,damageModifier:3,proficient:true});
  const armor=setNighthawkEncounterLoadout(dagger,'armorId','leather-armor');
  expect(nighthawkEquippedDefense(armor)).toMatchObject({armorClass:14,source:'verified-loadout'});
  expect(armor.combat).toEqual(base.combat);
 });
 it('charges double movement for crawling and half speed to stand from prone',()=>{
  let c=applyCompanionCondition(start(),'paladin','Prone');
  c=moveCompanion(c,'paladin',0,1);
  expect(c.companionEncounter?.participants.paladin.movementSpentFeet).toBe(10);
  c=standCompanionFromProne(c,'paladin');
  expect(c.companionEncounter?.participants.paladin.movementSpentFeet).toBe(25);
  expect(c.companionEncounter?.participants.paladin.conditions).not.toContain('Prone');
  expect(()=>standCompanionFromProne(c,'paladin')).toThrow('not prone');
 });

 it('uses prone advantage at five feet and disadvantage beyond five feet',()=>{
  let c=applyCompanionCondition(start(),'druid','Prone');
  expect(()=>attackCompanion(c,'paladin','druid',5,0,12,4,0,'Fire',5)).toThrow('second d20');
  const hit=attackCompanion(c,'paladin','druid',5,0,12,4,0,'Fire',5,18);
  expect(hit.companionEncounter?.participants.druid.hp).toBe(18);
  c=applyCompanionCondition(start(),'fiend','Prone');
  const miss=attackCompanion(c,'paladin','fiend',20,0,12,4,0,'Fire',50,2);
  expect(miss.companionEncounter?.participants.fiend.hp).toBe(25);
 });

 it('adjudicates saving throws under Stunned and Restrained without inventing rolls',()=>{
  let c=applyCompanionCondition(start(),'paladin','Stunned');
  const forced=resolveCompanionSavingThrow(c,'paladin','Dexterity',25,10);
  expect(forced.success).toBe(false);
  expect(forced.effectiveTotal).toBeNull();
  c=removeCompanionCondition(c,'paladin','Stunned');
  c=applyCompanionCondition(c,'paladin','Restrained');
  expect(()=>resolveCompanionSavingThrow(c,'paladin','Dexterity',18,12)).toThrow('second total');
  expect(resolveCompanionSavingThrow(c,'paladin','Dexterity',18,12,8).success).toBe(false);
  expect(resolveCompanionSavingThrow(c,'paladin','Constitution',18,12).success).toBe(true);
 });

 it('equips only verified catalog items from authoritative campaign inventory',()=>{
  const base=build();
  const original={...base,equipment:{daggers:2,arrows:0,caltrops:0,ballBearings:0},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Leather Armor',quantity:1}]}};
  const c=startUnifiedEncounter(original,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  expect(()=>setNighthawkEncounterLoadout(c,'weaponId','greatsword')).toThrow('not verified');
  const equipped=setNighthawkEncounterLoadout(c,'weaponId','dagger');
  expect(equipped.encounterLoadout?.weaponId).toBe('dagger');
  expect(equipped.equipment?.daggers).toBe(2);
  expect(equipped.combat).toEqual(original.combat);
  expect(setNighthawkEncounterLoadout(equipped,'armorId','leather-armor').encounterLoadout?.armorId).toBe('leather-armor');
 });

 it('adds a first-class enemy with supplied statistics and retains initiative and faction',()=>{
  let c=start();
  const legacy=c.combat;
  c=addCompanionEnemy(c,'goblin1',15,{x:6,y:6},12,15,4,30,5);
  expect(c.companionEncounter?.participants.goblin1).toMatchObject({actorKind:'enemy',faction:'enemies',hp:12,armorClass:15,attackModifier:4});
  expect(c.companionEncounter?.order).toContain('goblin1');
  expect(c.combat).toEqual(legacy);
  expect(()=>addCompanionEnemy(c,'goblin1',15,{x:7,y:7},12,15,4)).toThrow('duplicate');
  c=damageCompanion(c,'goblin1',5,'Fire');
  expect(c.companionEncounter?.participants.goblin1.hp).toBe(7);
 });
 it('enforces immobility and incapacitation and reports supported save modifiers',()=>{
  let c=start();
  c=applyCompanionCondition(c,'paladin','Grappled');
  expect(companionConditionEffects(c,'paladin').canMove).toBe(false);
  expect(()=>moveCompanion(c,'paladin',1,1)).toThrow('Condition prevents movement');
  c=removeCompanionCondition(c,'paladin','Grappled');
  c=applyCompanionCondition(c,'paladin','Stunned');
  expect(companionConditionEffects(c,'paladin')).toMatchObject({canAct:false,canMove:false,automaticStrengthDexSaveFailure:true});
  expect(()=>useCompanionAction(c,'paladin','Dash')).toThrow('Condition prevents action');
  c=removeCompanionCondition(c,'paladin','Stunned');
  c=applyCompanionCondition(c,'paladin','Poisoned');
  expect(companionConditionEffects(c,'paladin').attackDisadvantage).toBe(true);
 });

 it('exposes verified catalog damage for carried daggers without assuming equipped gear',()=>{
  const c={...build(),equipment:{daggers:1,arrows:0,caltrops:0,ballBearings:0}};
  const references=nighthawkEquipmentReferences(c);
  expect(references.items).toContainEqual(expect.objectContaining({name:'Dagger',damage:'1d4 piercing'}));
  expect(references.armorClass).toBe(c.character?.armorClass);
  expect(references.equippedWeapon).toBeNull();
  expect(references.equippedArmor).toBeNull();
 });

 it('records DM-confirmed conditions and ends concentration on incapacitation',()=>{
  let c=start();
  c=setCompanionConcentration(c,'fiend','Hex');
  c=applyCompanionCondition(c,'fiend','Stunned');
  expect(c.companionEncounter?.participants.fiend.conditions).toContain('Stunned');
  expect(c.companionEncounter?.participants.fiend.concentratingOn).toBeUndefined();
  c=removeCompanionCondition(c,'fiend','Stunned');
  expect(c.companionEncounter?.participants.fiend.conditions).not.toContain('Stunned');
 });

 it('honors configured factions and reach when detecting opportunity exits',()=>{
  let c=start();
  c=setCompanionTactics(c,'paladin','allies',5);
  c=setCompanionTactics(c,'druid','allies',10);
  expect(companionOpportunityCandidates(c.companionEncounter!,'paladin',{x:0,y:0},{x:0,y:3})).toEqual([]);
  c=setCompanionTactics(c,'druid','enemies',10);
  expect(companionOpportunityCandidates(c.companionEncounter!,'paladin',{x:0,y:0},{x:0,y:2})).toEqual([]);
  expect(companionOpportunityCandidates(c.companionEncounter!,'paladin',{x:0,y:0},{x:0,y:3})).toEqual(['druid']);
  expect(()=>setCompanionTactics(c,'druid','enemies',7)).toThrow('Invalid');
 });

 it('spends authoritative arrows and ledger gear with no negative balances or prototype changes',()=>{
  const base=build();
  const original={...base,equipment:{daggers:2,arrows:3,caltrops:1,ballBearings:0},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion',quantity:2}]}};
  const c=startUnifiedEncounter(original,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  const spent=spendUnifiedNighthawkInventory(c,'arrows',2);
  expect(spent.equipment?.arrows).toBe(1);
  expect(c.equipment?.arrows).toBe(3);
  expect(spent.combat).toEqual(original.combat);
  expect(()=>spendUnifiedNighthawkInventory(spent,'arrows',2)).toThrow('Insufficient');
  const potion=spendUnifiedNighthawkInventory(spent,'Potion',1);
  expect(potion.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(spent.inventoryLedger?.gear[0].quantity).toBe(2);
  expect(()=>spendUnifiedNighthawkInventory(potion,'Potion',2)).toThrow('Insufficient');
 });

 it('detects potential opportunity attacks when leaving adjacency, not when approaching or Disengaged',()=>{
  let c=start();
  const battle=c.companionEncounter!;
  expect(companionOpportunityCandidates(battle,'paladin',{x:0,y:0},{x:0,y:1})).toEqual([]);
  expect(companionOpportunityCandidates(battle,'paladin',{x:0,y:0},{x:0,y:2})).toEqual(['druid']);
  c=moveCompanion(c,'paladin',0,2);
  expect(c.companionEncounter?.pendingOpportunity?.attackerIds).toEqual(['druid']);
  expect(c.companionEncounter?.pendingOpportunity?.moverId).toBe('paladin');
  let d=start();
  d=useCompanionAction(d,'paladin','Disengage');
  d=moveCompanion(d,'paladin',0,2);
  expect(d.companionEncounter?.pendingOpportunity).toBeUndefined();
 });

 it('exposes campaign-owned ammunition and gear without mutating inventory',()=>{
  const c={...build(),equipment:{daggers:2,arrows:17,caltrops:1,ballBearings:1},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Healing Potion',quantity:2}]}};
  const snapshot=nighthawkEncounterInventory(c);
  expect(snapshot.ammunition.arrows).toBe(17);
  expect(snapshot.gear).toEqual([{name:'Healing Potion',quantity:2}]);
  snapshot.gear[0].quantity=0;
  expect(c.inventoryLedger.gear[0].quantity).toBe(2);
 });

 it('spends verified Nighthawk spell slots atomically and preserves prototype combat',()=>{
  const base=build();
  const character={...base.character!,preparedSpells:['Shield','Magic Missile'],spellSlots:{level1:2,usedLevel1:0}};
  const initial={...base,character};
  const c=startUnifiedEncounter(initial,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  const cast=spendUnifiedNighthawkSpellSlot(c,'Magic Missile');
  expect(cast.character?.spellSlots?.usedLevel1).toBe(1);
  expect(cast.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(cast.combat).toEqual(initial.combat);
  expect(()=>spendUnifiedNighthawkSpellSlot(cast,'Magic Missile')).toThrow('unavailable');
  expect(()=>spendUnifiedNighthawkSpellSlot(c,'Unprepared')).toThrow('not prepared');
 });
 it('resolves DM-verified opportunity reactions without spending the active turn action',()=>{
  let c=start();
  c=resolveCompanionOpportunityAttack(c,'fiend','paladin',18,3,12,5,2,'Fire');
  expect(c.companionEncounter?.participants.fiend.reactionUsed).toBe(true);
  expect(c.companionEncounter?.participants.paladin.hp).toBe(23);
  expect(c.companionEncounter?.participants.paladin.actionUsed).toBe(false);
  expect(()=>resolveCompanionOpportunityAttack(c,'fiend','paladin',18,3,12,5,2,'Fire')).toThrow('unavailable');
  c=useCompanionAction(c,'paladin','Disengage');
  expect(()=>resolveCompanionOpportunityAttack(c,'druid','paladin',18,3,12,5,2,'Fire')).toThrow('Disengage');
 });

 it('ends Disengage at the end of its turn but preserves Dodge until its next turn',()=>{
  let c=start();
  c=useCompanionAction(c,'paladin','Disengage');
  expect(companionOpportunityAttackEligible(c,'paladin')).toBe(false);
  c=endCompanionTurn(c,'paladin');
  expect(companionOpportunityAttackEligible(c,'paladin')).toBe(true);
  c=endCompanionTurn(c,'druid');
  c=endCompanionTurn(c,'fiend');
  c=useCompanionAction(c,'paladin','Dodge');
  c=endCompanionTurn(c,'paladin');
  expect(c.companionEncounter?.participants.paladin.dodging).toBe(true);
  c=endCompanionTurn(c,'druid');
  c=endCompanionTurn(c,'fiend');
  expect(c.companionEncounter?.participants.paladin.dodging).toBe(false);
 });
 it('resolves concentration with a supplied Constitution saving throw total',()=>{
  let c=start();
  c=setCompanionConcentration(c,'fiend','Hex');
  c=resolveCompanionConcentrationSave(c,'fiend',22,11);
  expect(c.companionEncounter?.participants.fiend.concentratingOn).toBe('Hex');
  c=resolveCompanionConcentrationSave(c,'fiend',22,10);
  expect(c.companionEncounter?.participants.fiend.concentratingOn).toBeUndefined();
  expect(()=>resolveCompanionConcentrationSave(c,'fiend',22,20)).toThrow('not concentrating');
 });

 it('derives Nighthawk defense and ability modifiers without guessing weapon proficiency',()=>{
  const stats=nighthawkEncounterStatistics(newCampaign('Stats'));
  expect(stats.armorClass).toBe(14);
  expect(stats.dexterityModifier).toBe(3);
  expect(stats.proficiencyBonus).toBe(2);
  expect(stats.weaponAttackModifier).toBeNull();
 });
 it('spends only verified bonus actions and tracks actor-specific consumables',()=>{
  let c=start();
  expect(()=>useCompanionBonusAction(c,'paladin','feature',false)).toThrow('eligibility');
  c=useCompanionBonusAction(c,'paladin','verified feature',true);
  expect(()=>useCompanionBonusAction(c,'paladin','again',true)).toThrow('unavailable');
  c=setCompanionConsumable(c,'paladin','Potion',2);
  c=spendCompanionConsumable(c,'paladin','Potion');
  expect(c.companionEncounter?.participants.paladin.consumables?.Potion).toBe(1);
  expect(c.companionEncounter?.participants.fiend.consumables).toBeUndefined();
 });
 it('tracks concentration save DC and ends concentration on zero HP',()=>{
  let c=start();
  c=setCompanionConcentration(c,'paladin','Bless');
  expect(companionConcentrationSaveDC(30)).toBe(15);
  c=damageCompanion(c,'paladin',4,'Fire');
  expect(c.companionEncounter?.log.at(-1)).toContain('DC 10');
  expect(c.companionEncounter?.participants.paladin.concentratingOn).toBe('Bless');
  c=damageCompanion(c,'paladin',100,'Fire');
  expect(c.companionEncounter?.participants.paladin.concentratingOn).toBeUndefined();
 });

 it('syncs unified Nighthawk HP only on explicit command and never changes legacy combat',()=>{
  const original={...start(),companionEncounter:undefined};
  let c=startUnifiedEncounter(original,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:2},paladin:{x:0,y:0}},{paladin:20});
  c=damageCompanion(c,'nighthawk',3,'Fire');
  expect(c.character?.currentHitPoints).toBe(original.character?.currentHitPoints);
  const synced=synchronizeNighthawkHitPoints(c);
  expect(synced.character?.currentHitPoints).toBe(7);
  expect(synced.combat).toEqual(original.combat);
  expect(()=>synchronizeNighthawkHitPoints(start())).toThrow('No unified');
 });
 it('tracks per-actor reactions and DM condition removal without touching other actors',()=>{
  let c=start();
  c=recordCompanionReaction(c,'fiend','Opportunity attack');
  expect(c.companionEncounter?.participants.fiend.reactionUsed).toBe(true);
  expect(()=>recordCompanionReaction(c,'fiend','Again')).toThrow('already used');
  c=conditionCompanion(c,'fiend','Poisoned');
  c=removeCompanionCondition(c,'fiend','Poisoned');
  expect(c.companionEncounter?.participants.fiend.conditions).not.toContain('Poisoned');
  expect(c.companionEncounter?.participants.paladin.reactionUsed).toBe(false);
  expect(c.combat).toEqual(start().combat);
 });

 it('rejects reserved, case-colliding and unsafe registered identities',()=>{
  const c=newCampaign('Identity test');
  const state=initialSubclassCombatState('paladin','paladin-devotion',7,2);
  expect(()=>registerSubclassActor(c,'NIGHTHAWK',state)).toThrow('reserved');
  expect(()=>registerSubclassActor(c,'__proto__',state)).toThrow('reserved');
  const registered=registerSubclassActor(c,'Paladin',state);
  expect(()=>registerSubclassActor(registered,'paladin',state)).toThrow('already registered');
 });

 it('unifies Nighthawk and companions in shared initiative without changing prototype combat',()=>{
  const original=start();
  const c=startUnifiedEncounter({...original,companionEncounter:undefined},{nighthawk:20,paladin:18,fiend:12},{nighthawk:{x:0,y:2},paladin:{x:0,y:0},fiend:{x:5,y:5}},{paladin:20,fiend:25});
  expect(c.companionEncounter?.mode).toBe('unified');
  expect(c.companionEncounter?.order).toEqual(['nighthawk','paladin','fiend']);
  expect(c.companionEncounter?.participants.nighthawk.speedFeet).toBe(c.character?.speed);
  expect(c.companionEncounter?.participants.nighthawk.hp).toBe(c.character?.currentHitPoints);
  expect(c.combat).toEqual(original.combat);
  const moved=moveCompanion(c,'nighthawk',0,3);
  expect(moved.companionEncounter?.participants.nighthawk.movementSpentFeet).toBe(5);
  const attacked=attackCompanion(moved,'nighthawk','fiend',20,5,12,8,3,'Piercing',60);
  expect(attacked.companionEncounter?.participants.fiend.hp).toBe(14);
  expect(attacked.combat).toEqual(original.combat);
  expect(JSON.parse(JSON.stringify(attacked)).companionEncounter.mode).toBe('unified');
 });
 it('rejects unknown unified identities and overlapping Nighthawk positions',()=>{
  const c={...start(),companionEncounter:undefined};
  expect(()=>startUnifiedEncounter(c,{nighthawk:20,unknown:10},{nighthawk:{x:0,y:2},unknown:{x:3,y:3}},{unknown:20})).toThrow('Unregistered');
  expect(()=>startUnifiedEncounter(c,{nighthawk:20,paladin:10},{nighthawk:{x:0,y:0},paladin:{x:0,y:0}},{paladin:20})).toThrow('position');
 });

 it('keeps annotated cover separate from solid obstacles and requires DM review',()=>{
  let c=start();
  c=setCompanionCover(c,[{x:5,y:5}]);
  expect(companionCoverStatus(c,'fiend')).toBe('annotated');
  expect(()=>attackCompanion(c,'paladin','fiend',20,0,10,10,0,'Fire',100)).toThrow('DM must supply adjusted AC');
  expect(()=>setCompanionObstacles(c,[{x:5,y:5}])).toThrow();
  c=setCompanionCover(c,[]);
  expect(companionCoverStatus(c,'fiend')).toBe('none');
  expect(c.combat).toEqual(start().combat);
 });
 it('exposes a read-only Nighthawk and companion bridge without merging combat',()=>{
  const c=start();
  const snapshot=companionPartySnapshot(c);
  expect(snapshot.nighthawk.id).toBe('nighthawk');
  expect(snapshot.nighthawk.includedInCompanionEncounter).toBe(false);
  expect(snapshot.companions).toHaveLength(3);
  expect(snapshot.readyForUnifiedCombat).toBe(false);
  expect(c.combat).toEqual(start().combat);
 });

 it('routes around solid obstacles and rejects occupied obstacle squares',()=>{
  let c=start();
  expect(()=>setCompanionObstacles(c,[{x:0,y:0}])).toThrow('overlaps');
  c=setCompanionObstacles(c,[{x:0,y:1},{x:1,y:1},{x:2,y:1}]);
  expect(()=>moveCompanion(c,'paladin',0,2)).toThrow('No unobstructed path');
  expect(c.companionEncounter?.participants.paladin.movementSpentFeet).toBe(0);
  expect(c.combat).toEqual(start().combat);
 });
 it('blocks line of sight through a solid obstacle and persists map geometry',()=>{
  let c=start();
  c=setCompanionObstacles(c,[{x:3,y:3}]);
  expect(companionLineOfSight(c.companionEncounter!,{x:0,y:0},{x:5,y:5})).toBe(false);
  expect(()=>attackCompanion(c,'paladin','fiend',20,0,10,10,0,'Fire',100)).toThrow('Line of sight');
  expect(JSON.parse(JSON.stringify(c)).companionEncounter.obstacles).toEqual([{x:3,y:3}]);
 });
 it('Dodge requires two rolls and uses the lower result; Disengage suppresses opportunity attacks',()=>{
  let c=start();
  c=endCompanionTurn(c,'paladin');
  c=useCompanionAction(c,'druid','Dodge');
  c=endCompanionTurn(c,'druid');
  c=endCompanionTurn(c,'fiend');
  expect(()=>attackCompanion(c,'paladin','druid',20,0,15,10,0,'Fire',10)).toThrow('second d20');
  c=attackCompanion(c,'paladin','druid',20,0,15,10,0,'Fire',10,4);
  expect(c.companionEncounter?.participants.druid.hp).toBe(22);
  c=endCompanionTurn(c,'paladin');
  c=endCompanionTurn(c,'druid');
  c=useCompanionAction(c,'fiend','Disengage');
  expect(companionOpportunityAttackEligible(c,'fiend')).toBe(false);
  expect(c.companionEncounter?.participants.fiend.disengaged).toBe(true);
 });

 it('uses diagonal grid movement and validates declared attack range',()=>{
  let c=start();
  c=moveCompanion(c,'paladin',2,2);
  expect(c.companionEncounter?.participants.paladin.movementSpentFeet).toBe(10);
  expect(()=>attackCompanion(c,'paladin','fiend',15,3,12,8,0,'Fire',10)).toThrow('outside declared');
  expect(c.companionEncounter?.participants.paladin.actionUsed).toBe(false);
  c=attackCompanion(c,'paladin','fiend',15,3,12,8,0,'Fire',15);
  expect(c.companionEncounter?.participants.fiend.hp).toBe(21);
 });
 it('Dash adds movement and consumes action; other choices track without invented benefits',()=>{
  let c=start();
  c=useCompanionAction(c,'paladin','Dash');
  expect(c.companionEncounter?.participants.paladin.dashFeet).toBe(30);
  expect(()=>attackCompanion(c,'paladin','fiend',15,0,10,8,0,'Fire',100)).toThrow('Action already used');
  c=moveCompanion(c,'paladin',0,9);
  expect(c.companionEncounter?.participants.paladin.movementSpentFeet).toBe(45);
  c=endCompanionTurn(c,'paladin');
  c=useCompanionAction(c,'druid','Help');
  expect(c.companionEncounter?.log.at(-1)).toContain('requires DM adjudication');
  c=endCompanionTurn(c,'druid');
  c=endCompanionTurn(c,'fiend');
  expect(c.companionEncounter?.participants.paladin.dashFeet).toBe(0);
 });

 it('tracks cumulative movement and resets budget on next turn',()=>{
  let c=start();
  c=moveCompanion(c,'paladin',0,3);
  expect(c.companionEncounter?.participants.paladin.movementSpentFeet).toBe(15);
  expect(()=>moveCompanion(c,'paladin',0,7)).toThrow();
  c=endCompanionTurn(c,'paladin');
  c=endCompanionTurn(c,'druid');
  c=endCompanionTurn(c,'fiend');
  expect(c.companionEncounter?.participants.paladin.movementSpentFeet).toBe(0);
  c=setCompanionSpeed(c,'paladin',35);
  expect(c.companionEncounter?.participants.paladin.speedFeet).toBe(35);
 });
 it('resolves manual attack rolls, natural one/twenty, damage resistance and action usage',()=>{
  let c=start();
  c=attackCompanion(c,'paladin','druid',15,3,16,11,2,'Cold');
  expect(c.companionEncounter?.participants.druid.hp).toBe(16);
  expect(c.companionEncounter?.participants.paladin.actionUsed).toBe(true);
  expect(()=>attackCompanion(c,'paladin','fiend',20,0,30,10,0,'Fire')).toThrow('Action already used');
  c=endCompanionTurn(c,'paladin');
  c=attackCompanion(c,'druid','fiend',1,30,5,10,0,'Fire');
  expect(c.companionEncounter?.participants.fiend.hp).toBe(25);
  c=endCompanionTurn(c,'druid');
  c=attackCompanion(c,'fiend','paladin',20,-5,40,12,2,'Fire');
  expect(c.companionEncounter?.participants.paladin.hp).toBe(16);
  expect(c.companionEncounter?.log.at(-1)).toContain('critical hit');
  expect(c.combat).toEqual(start().combat);
 });

 it('sorts initiative, advances turn and round and preserves original Rogue combat',()=>{
  const c=start();
  expect(c.companionEncounter?.order).toEqual(['paladin','druid','fiend']);
  expect(()=>moveCompanion(c,'druid',2,0)).toThrow('Not this actor');
  let next=endCompanionTurn(c,'paladin');
  next=endCompanionTurn(next,'druid');
  next=endCompanionTurn(next,'fiend');
  expect(next.companionEncounter?.round).toBe(2);
  expect(next.companionEncounter?.turnIndex).toBe(0);
  expect(next.combat).toEqual(c.combat);
  expect(next.subclassActors).toEqual(c.subclassActors);
 });
 it('validates movement bounds and occupancy',()=>{
  const c=start();
  expect(()=>moveCompanion(c,'paladin',1,0)).toThrow('occupied');
  expect(()=>moveCompanion(c,'paladin',19,19)).toThrow();
  expect(moveCompanion(c,'paladin',0,2).companionEncounter?.participants.paladin.y).toBe(2);
 });
 it('applies selected damage resistances to registered actor HP',()=>{
  let c=start();
  c=damageCompanion(c,'druid',11,'Cold');
  expect(c.companionEncounter?.participants.druid.hp).toBe(17);
  c=damageCompanion(c,'fiend',9,'Fire');
  expect(c.companionEncounter?.participants.fiend.hp).toBe(21);
  expect(c.companionEncounter?.log.at(-1)).toContain('resisted');
 });
 it('blocks Charmed in Devotion aura and Poisoned for Land but not unprotected Fiend',()=>{
  let c=start();
  c=conditionCompanion(c,'druid','Charmed','paladin');
  expect(c.companionEncounter?.participants.druid.conditions).toEqual([]);
  c=conditionCompanion(c,'druid','Poisoned');
  expect(c.companionEncounter?.participants.druid.conditions).toEqual([]);
  c=conditionCompanion(c,'fiend','Charmed','paladin');
  expect(c.companionEncounter?.participants.fiend.conditions).toContain('Charmed');
 });
 it('persists the separate encounter and prevents unregistered or overlapping actors',()=>{
  const c=start();
  expect(JSON.parse(JSON.stringify(c)).companionEncounter.participants.fiend.hp).toBe(25);
  expect(()=>startCompanionEncounter(c,{fiend:10},{fiend:{x:0,y:0}},{fiend:20})).toThrow('existing');
  expect(()=>startCompanionEncounter(build(),{stranger:10},{stranger:{x:0,y:0}},{stranger:20})).toThrow('registered');
  expect(finishCompanionEncounter(c).companionEncounter?.status).toBe('completed');
 });
});
