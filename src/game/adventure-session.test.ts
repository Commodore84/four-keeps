import {describe,it,expect} from 'vitest';
import {newCampaign,registerSubclassActor} from './campaign';
import {initialSubclassCombatState} from './subclassCombatRules';
import {beginAdventureSession,travelAdventure,interactAdventure,enterAdventureEncounter,resumeAdventureExploration} from './adventureSession';
import {finishCompanionEncounter} from './companionEncounter';
describe('persistent adventure session',()=>{
 const base=()=>newCampaign('Frontier Test','adventure-test','2026-11-10T00:00:00.000Z');
 it('starts with the saved character and keeps legacy combat untouched',()=>{
  const c=base(),next=beginAdventureSession(c);
  expect(next.adventureSession).toMatchObject({site:'frontier',status:'exploring',characterSource:'campaign-character'});
  expect(next.character).toEqual(c.character);
  expect(next.combat).toEqual(c.combat);
  expect(()=>beginAdventureSession(next)).toThrow('already exists');
 });
 it('records narrative choices, blocks invalid travel and survives serialization',()=>{
  const c=beginAdventureSession(base());
  expect(()=>travelAdventure(c,'watchtower')).toThrow('not adjacent');
  const spoken=interactAdventure(c,'speak-watchkeeper');
  expect(spoken.adventureSession?.interactions).toHaveLength(1);
  expect(spoken.journal.at(-1)?.text).toContain('watchkeeper');
  expect(()=>interactAdventure(spoken,'inspect-ruins')).toThrow('unavailable');
  const traveled=travelAdventure(travelAdventure(spoken,'crossroads'),'watchtower');
  expect(traveled.location).toBe('Old Watchtower');
  expect(traveled.adventureSession?.visited).toEqual(['frontier','crossroads','watchtower']);
  expect(JSON.parse(JSON.stringify(traveled)).adventureSession.interactions).toHaveLength(1);
 });
 it('requires verified companion, HP and initiative to hand off to the existing encounter',()=>{
  let c=travelAdventure(travelAdventure(beginAdventureSession(base()),'crossroads'),'watchtower');
  expect(()=>enterAdventureEncounter(c,'paladin',{nighthawk:20,companion:10},20)).toThrow('registered companion');
  c=registerSubclassActor(c,'paladin',initialSubclassCombatState('paladin','devotion',3,2));
  expect(()=>enterAdventureEncounter(c,'paladin',{nighthawk:20,companion:10},0)).toThrow('verified companion HP');
  const next=enterAdventureEncounter(c,'paladin',{nighthawk:20,companion:10},20);
  expect(next.adventureSession?.status).toBe('encounter');
  expect(next.companionEncounter?.participants.nighthawk.hp).toBe(c.character?.currentHitPoints);
  expect(next.companionEncounter?.participants.paladin.hp).toBe(20);
  expect(next.combat).toEqual(c.combat);
  expect(()=>resumeAdventureExploration(next)).toThrow('Finish the linked encounter');
  const completed=finishCompanionEncounter(next);
  const resumed=resumeAdventureExploration(completed);
  expect(resumed.adventureSession?.status).toBe('exploring');
  expect(resumed.location).toBe('Old Watchtower');
  expect(resumed.combat).toEqual(c.combat);
  expect(JSON.parse(JSON.stringify(resumed)).adventureSession.status).toBe('exploring');
 });
});
