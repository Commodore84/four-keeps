import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {knownMonsterFacts,recordMonsterAbility,recordMonsterSighting} from './monsterKnowledge';
describe('campaign-specific monster knowledge',()=>{
 it('does not reveal the GM stat block and persists first sighting across repeated encounters',()=>{
  const initial=newCampaign('Bestiary test');
  expect(initial.monsterKnowledge).toBeUndefined();
  const seen=recordMonsterSighting({...initial,location:'Dasahi docks'},['giant-rat','giant-rat','bandit','ancient-dragon'],'2026-11-24T15:00:00Z');
  expect(Object.keys(seen.monsterKnowledge??{})).toEqual(['giant-rat','bandit']);
  expect(seen.monsterKnowledge?.['giant-rat']).toMatchObject({encounters:1,firstSeenLocation:'Dasahi docks',observedAbilities:[]});
  expect(knownMonsterFacts(seen.monsterKnowledge!['giant-rat']!)?.known).toEqual([]);
  const observed=recordMonsterAbility(seen,'giant-rat','bite');
  expect(knownMonsterFacts(observed.monsterKnowledge!['giant-rat']!)?.known.map(x=>x.name)).toEqual(['Bite']);
  expect(recordMonsterAbility(observed,'giant-rat','impossible-power')).toBe(observed);
  expect(recordMonsterAbility(observed,'giant-rat','bite')).toBe(observed);
  const remembered=recordMonsterSighting(observed,['giant-rat'],'2026-11-25T15:00:00Z');
  expect(remembered.monsterKnowledge?.['giant-rat']).toMatchObject({encounters:2,firstSeenAt:'2026-11-24T15:00:00Z',observedAbilities:['bite']});
  expect(JSON.parse(JSON.stringify(remembered)).monsterKnowledge['giant-rat'].encounters).toBe(2);
 });
});
