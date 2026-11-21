import {describe,it,expect} from 'vitest';
import {encounterKind,recordEncounter,legacyEncounters,recallJournal,groundedRecount,refineEncounterAtDowntime,answerRecall} from './encounterJournal';
import type {Campaign} from './campaign';
describe('encounter journal persistence',()=>{
 const campaign={schemaVersion:1,character:{level:3},encounterJournal:[]} as unknown as Campaign;
 it('records one encounter per authoritative action id',()=>{
  const first=recordEncounter(campaign,'action-1','I ask the merchant','The merchant describes a missing wagon.','2026-11-18T12:00:00Z');
  expect(first.encounterJournal).toHaveLength(1);
  expect(first.encounterJournal?.[0]).toMatchObject({level:3,kind:'Conversation',sourceActionId:'action-1'});
  expect(recordEncounter(first,'action-1','again','Different response','2026-11-18T12:01:00Z')).toBe(first);
  expect(campaign.encounterJournal).toHaveLength(0);
 });
 it('retains legacy DM history alongside new records and searches without changing state',()=>{
  const prior={...campaign,journal:[{id:'old-dm',kind:'dm',text:'The old bridge was damaged.',createdAt:'2025-01-01'}]} as unknown as Campaign;
  const updated=recordEncounter(prior,'new','I look around','I see a broken bridge.','2026-01-01');
  expect(legacyEncounters(updated)).toHaveLength(2);
  expect(recallJournal(updated,'bridge')).toContain('old bridge');
  expect(updated.journal).toHaveLength(1);
 });
 it('reconstructs legacy first-person recount from paired recorded turns without rewriting history',()=>{
  const prior={...campaign,journal:[
   {id:'old-player',kind:'player',text:'I inspect the road.',createdAt:'2025-01-01'},
   {id:'old-dm',kind:'dm',text:'The road is blocked by a fallen tree.',createdAt:'2025-01-01'}
  ]} as unknown as Campaign;
  const original=JSON.stringify(prior);
  const entry=legacyEncounters(prior)[0];
  expect(entry.recount).toBe('I inspect the road.\n\nThe road is blocked by a fallen tree.');
  expect(entry.originalNarration).toBe('The road is blocked by a fallen tree.');
  expect(JSON.stringify(prior)).toBe(original);
 });
 it('builds grounded first-person recounts without inventing DM details',()=>{
  expect(groundedRecount('I ask Elira about the road.','Elira says the road is closed.')).toBe('I ask Elira about the road.\n\nElira says the road is closed.');
  const saved=recordEncounter(campaign,'action-2','I inspect the door','The door is locked.','2026-11-18');
  expect(saved.encounterJournal?.[0].recount).toContain('I inspect the door.');
  const refined=refineEncounterAtDowntime(saved,'2026-11-19');
  expect(refined.encounterJournal?.[0].refinedAt).toBe('2026-11-19');
  expect(refineEncounterAtDowntime(refined,'2026-11-20')).toBe(refined);
 });
 it('supports safe follow-up recall without changing campaign state',()=>{
  const prior={...campaign,world:{npcs:[{id:'n1',name:'Elira',role:'watchkeeper',location:'Dasahi',relationship:'neutral',notes:['Saw a broken wagon']}],places:[],clues:[],quests:[]},journal:[]} as unknown as Campaign;
  const before=JSON.stringify(prior);
  const first=answerRecall(prior,'What did Elira tell us?');
  expect(first.answer).toContain('broken wagon');
  expect(answerRecall(prior,'Tell me more',first).answer).toContain('Elira');
  expect(answerRecall(prior,'Tell me more').answer).toContain('Ask about');
  expect(JSON.stringify(prior)).toBe(before);
 });
 it('does not invent a recount or classify without evidence',()=>{
  expect(encounterKind('I draw my sword','The bandits attack')).toBe('Combat');
  expect(encounterKind('I travel north','The road is clear')).toBe('Exploration');
  expect(encounterKind('I accept the offer','He nods')).toBe('Decision');
  expect(recordEncounter(campaign,'empty','look','  ','now')).toBe(campaign);
 });
});
