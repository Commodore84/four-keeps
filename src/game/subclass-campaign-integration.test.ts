import {describe,it,expect} from 'vitest';
import {newCampaign,registerSubclassActor,restSubclassActor,chooseSubclassResistance,useSubclassLuck,adjudicateSubclassActorDamage,adjudicateSubclassActorCondition} from './campaign';
import {initialSubclassCombatState} from './subclassCombatRules';
describe('persisted actor-scoped subclass integration',()=>{
 it('does not grant Nighthawk a foreign subclass or allow replacing prototype actor',()=>{
  const campaign=newCampaign('Integration test');
  expect(campaign.subclassActors).toBeUndefined();
  expect(()=>registerSubclassActor(campaign,'nighthawk',initialSubclassCombatState('paladin','paladin-devotion',7,3))).toThrow();
  expect(()=>adjudicateSubclassActorDamage(campaign,'nighthawk',10,'Fire')).toThrow();
 });
 it('persists Devotion aura immunity and respects context',()=>{
  const c=registerSubclassActor(newCampaign('Test'),'ally-paladin',initialSubclassCombatState('paladin','paladin-devotion',7,3));
  expect(adjudicateSubclassActorCondition(c,'ally-paladin','Charmed',{withinDevotionAura:true,auraActive:true})).toBe(false);
  expect(adjudicateSubclassActorCondition(c,'ally-paladin','Charmed',{withinDevotionAura:false,auraActive:true})).toBe(true);
  expect(JSON.parse(JSON.stringify(c)).subclassActors['ally-paladin'].subclassId).toBe('paladin-devotion');
 });
 it('persists Druid terrain after Long Rest and applies matching resistance',()=>{
  const c=registerSubclassActor(newCampaign('Test'),'ally-druid',initialSubclassCombatState('druid','druid-land',10,0,'arid'));
  const rested=restSubclassActor(c,'ally-druid','long',{terrain:'polar'});
  expect(adjudicateSubclassActorDamage(rested,'ally-druid',11,'Cold')).toBe(5);
  expect(adjudicateSubclassActorCondition(rested,'ally-druid','Poisoned')).toBe(false);
  expect(c.subclassActors?.['ally-druid'].terrain).toBe('arid');
 });
 it('persists Fiend Luck expenditure and rest recovery and explicit resistance',()=>{
  let c=registerSubclassActor(newCampaign('Test'),'ally-fiend',initialSubclassCombatState('warlock','warlock-fiend',10,3));
  c=chooseSubclassResistance(c,'ally-fiend','Fire');
  expect(adjudicateSubclassActorDamage(c,'ally-fiend',11,'Fire')).toBe(5);
  const used=useSubclassLuck(c,'ally-fiend',8);
  expect(used.bonus).toBe(8);
  expect(used.campaign.subclassActors?.['ally-fiend'].luckRemaining).toBe(2);
  expect(restSubclassActor(used.campaign,'ally-fiend','short').subclassActors?.['ally-fiend'].luckRemaining).toBe(2);
  expect(restSubclassActor(used.campaign,'ally-fiend','long').subclassActors?.['ally-fiend'].luckRemaining).toBe(3);
 });
});
