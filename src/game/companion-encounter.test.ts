import {describe,it,expect} from 'vitest';
import {newCampaign,registerSubclassActor,chooseSubclassResistance} from './campaign';
import {initialSubclassCombatState} from './subclassCombatRules';
import {startCompanionEncounter,moveCompanion,endCompanionTurn,damageCompanion,conditionCompanion,finishCompanionEncounter} from './companionEncounter';
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
