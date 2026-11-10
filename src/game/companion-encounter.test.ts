import {describe,it,expect} from 'vitest';
import {newCampaign,registerSubclassActor,chooseSubclassResistance} from './campaign';
import {initialSubclassCombatState} from './subclassCombatRules';
import {startCompanionEncounter,moveCompanion,endCompanionTurn,damageCompanion,conditionCompanion,finishCompanionEncounter,attackCompanion,setCompanionSpeed ,useCompanionAction,setCompanionObstacles,companionLineOfSight,companionOpportunityAttackEligible,setCompanionCover,companionCoverStatus,companionPartySnapshot,startUnifiedEncounter,synchronizeNighthawkHitPoints,recordCompanionReaction,removeCompanionCondition,nighthawkEncounterStatistics,useCompanionBonusAction,setCompanionConcentration,companionConcentrationSaveDC,setCompanionConsumable,spendCompanionConsumable} from './companionEncounter';
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
