import type {Campaign} from './campaign';
import {describe,it,expect} from 'vitest';
import {newCampaign,registerSubclassActor} from './campaign';
import {initialSubclassCombatState} from './subclassCombatRules';
import {beginAdventureSession,travelAdventure,interactAdventure,enterAdventureEncounter,resumeAdventureExploration,proposeAdventureEncounter,declineAdventureEncounter,enterSoloAdventureEncounter} from './adventureSession';
import {finishCompanionEncounter,damageCompanion,spendPlayerResource} from './companionEncounter';
import {settleEncounterRewards} from './encounterRewards';
import {prepareAdventureAction,commitAdventureAction,pauseAdventureForClarification,answerAdventureClarification} from './adventureOrchestrator';
describe('persistent adventure session',()=>{
 const base=()=>newCampaign('Frontier Test','adventure-test','2026-11-10T00:00:00.000Z');
 it('pauses clarification without advancing world and resolves the original action once',()=>{
  const initial=beginAdventureSession(base());
  const pending=prepareAdventureAction(initial,'Attack the dragon with my dagger','dragon-action');
  const asked=pauseAdventureForClarification(pending,'dragon-action','Are you sure?');
  expect(asked.journal).toEqual(pending.journal);
  expect(asked.world).toEqual(pending.world);
  expect(asked.adventureSession).toEqual(pending.adventureSession);
  expect(()=>pauseAdventureForClarification(pending,'wrong','Question')).toThrow();
  const answered=answerAdventureClarification(JSON.parse(JSON.stringify(asked)),'Yes. I attack.');
  expect(answered.pendingAdventureAction?.id).toBe('dragon-action');
  const resolved={...commitAdventureAction(answered,'dragon-action','You charge forward.'),pendingClarification:undefined};
  expect(resolved.pendingAdventureAction).toBeUndefined();
  expect(resolved.pendingClarification).toBeUndefined();
  expect(commitAdventureAction(resolved,'dragon-action','Duplicate')).toEqual(resolved);
 });
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


describe('organic AI combat handoff for an imported character',()=>{
 const make=()=>({...beginAdventureSession(newCampaign('Raven story','raven-organic','2026-11-11T00:00:00Z')),characterIdentity:{name:'Raven',speciesId:'elf',backgroundId:'criminal',classId:'rogue',draftId:'validated-raven',pronouns:'',appearance:'',personality:'',backstory:''}});
 const verified={playerInitiative:18,enemyInitiative:12,enemyId:'enemy-road-bandit',hitPoints:11,armorClass:12,attackModifier:3,damageModifier:1,damageDice:'1d6'};
 it('stores only an encounter proposal without changing player HP, location or rolling dice',()=>{
  const c=make(),proposed=proposeAdventureEncounter(c,'Road bandit','action-1');
  expect(proposed.adventureSession?.pendingEncounter).toEqual({enemyName:'Road bandit',actionId:'action-1'});
  expect(proposed.companionEncounter).toBeUndefined();
  expect(proposed.character).toEqual(c.character);
  expect(proposed.location).toBe(c.location);
  expect(proposeAdventureEncounter(proposed,'Another bandit','action-1')).toBe(proposed);
  expect(proposeAdventureEncounter(proposed,'Another bandit','action-2')).toBe(proposed);
  expect(JSON.parse(JSON.stringify(proposed)).adventureSession.pendingEncounter.enemyName).toBe('Road bandit');
 });
 it('enters verified combat at the current site, retains imported identity and rejects mismatched opponents',()=>{
  const c=proposeAdventureEncounter(make(),'Road bandit','action-1');
  expect(()=>enterSoloAdventureEncounter(c,{...verified,enemyId:'Different foe'})).toThrow('must match');
  const battle=enterSoloAdventureEncounter(c,verified);
  expect(battle.adventureSession).toMatchObject({status:'encounter',site:'frontier',encounterActorId:'enemy-road-bandit'});
  expect(battle.adventureSession?.pendingEncounter).toBeUndefined();
  expect(battle.characterIdentity).toEqual(c.characterIdentity);
  expect(battle.location).toBe(c.location);
  expect(battle.companionEncounter?.participants['enemy-road-bandit']).toMatchObject({hp:11,armorClass:12,attackModifier:3});
  expect(battle.companionEncounter?.participants.nighthawk.hp).toBe(c.character?.currentHitPoints??c.character?.maxHitPoints);
  expect(()=>enterSoloAdventureEncounter(battle,verified)).toThrow('required');
 });
 it('rejects invalid proposals and leaves legacy sessions unchanged',()=>{
  const legacy=beginAdventureSession(newCampaign('Legacy','legacy-organic'));
  expect(proposeAdventureEncounter(legacy,'Bandit','action-1')).toBe(legacy);
  const c=make();
  expect(proposeAdventureEncounter(c,'  ','action-1')).toBe(c);
  expect(proposeAdventureEncounter(c,'Bandit','')).toBe(c);
 });
});


describe('organic encounter completion and narrative continuity',()=>{
 it('synchronizes HP and resources, settles rewards once, and resumes without moving the imported character',()=>{
  const initial=beginAdventureSession(newCampaign('Continuity','continuity'));
  const imported:Campaign={...initial,characterIdentity:{name:'Aster',speciesId:'elf',backgroundId:'criminal',classId:'fighter',draftId:'aster-draft',pronouns:'',appearance:'',personality:'',backstory:''},character:{...initial.character!,resources:{'Second Wind':{maximum:2,used:0,recovery:'short'}}}};
  const proposal=proposeAdventureEncounter(imported,'Bridge robber','action-bridge');
  const encounter=enterSoloAdventureEncounter(proposal,{playerInitiative:18,enemyInitiative:12,enemyId:'enemy-bridge-robber',hitPoints:10,armorClass:12,attackModifier:3,damageModifier:1,damageDice:'1d6'});
  const spent=spendPlayerResource(encounter,'Second Wind');
  const injured=damageCompanion(spent,'nighthawk',3,'Slashing');
  const completed=finishCompanionEncounter(injured);
  expect(completed.character?.currentHitPoints).toBe(imported.character!.currentHitPoints!-3);
  expect(completed.character?.resources?.['Second Wind'].used).toBe(1);
  expect(()=>resumeAdventureExploration(completed)).toThrow('Record encounter rewards');
  const settled=settleEncounterRewards(completed,{xp:45,gold:7,items:[{name:'Bridge token',quantity:1}]});
  expect(()=>settleEncounterRewards(settled,{xp:45,gold:7,items:[]})).toThrow('already recorded');
  const resumed=resumeAdventureExploration(settled);
  expect(resumed.location).toBe(imported.location);
  expect(resumed.characterIdentity).toEqual(imported.characterIdentity);
  expect(resumed.character?.currentHitPoints).toBe(imported.character!.currentHitPoints!-3);
  expect(resumed.character?.resources?.['Second Wind'].used).toBe(1);
  expect(resumed.inventoryLedger?.currency.GP).toBe((imported.inventoryLedger?.currency.GP??0)+7);
  expect(resumed.adventureSession?.status).toBe('exploring');
  expect(()=>resumeAdventureExploration(resumed)).toThrow('Finish the linked encounter');
  const pending=prepareAdventureAction(resumed,'Speak to the guard','after-combat');
  const narrated=commitAdventureAction(pending,'after-combat','The guard thanks Aster.');
  expect(narrated.characterIdentity).toEqual(imported.characterIdentity);
  expect(narrated.location).toBe(imported.location);
  expect(narrated.companionEncounter?.settlement).toEqual(settled.companionEncounter?.settlement);
  expect(commitAdventureAction(narrated,'after-combat','A duplicate response')).toBe(narrated);
  expect(JSON.parse(JSON.stringify(narrated)).adventureSession.status).toBe('exploring');
 });
});

describe('organic encounter retry and rejection safety',()=>{
 const character=()=>({...beginAdventureSession(newCampaign('Encounter safety','encounter-safety')),characterIdentity:{name:'Raven',speciesId:'elf',backgroundId:'criminal',classId:'rogue',draftId:'raven',pronouns:'',appearance:'',personality:'',backstory:''}});
 const stats={playerInitiative:18,enemyInitiative:12,enemyId:'enemy-road-bandit',hitPoints:11,armorClass:12,attackModifier:3,damageModifier:1,damageDice:'1d6'};
 it('declines a false positive without changing HP, location or world facts and rejects stale actions',()=>{
  const start=character(),pending=proposeAdventureEncounter(start,'Road bandit','action-1');
  expect(()=>declineAdventureEncounter(pending,'stale-action')).toThrow('no longer pending');
  const declined=declineAdventureEncounter(pending,'action-1');
  expect(declined.adventureSession?.pendingEncounter).toBeUndefined();
  expect(declined.character).toEqual(start.character);
  expect(declined.location).toBe(start.location);
  expect(declined.world).toEqual(start.world);
  expect(declined.journal.at(-1)?.id).toBe('declined-encounter-action-1');
  expect(()=>declineAdventureEncounter(declined,'action-1')).toThrow('no longer pending');
  expect(()=>enterSoloAdventureEncounter(declined,stats)).toThrow('required');
  const next=proposeAdventureEncounter(declined,'Road bandit','action-2');
  expect(next.adventureSession?.pendingEncounter?.actionId).toBe('action-2');
  expect(JSON.parse(JSON.stringify(declined)).adventureSession.status).toBe('exploring');
 });
 it('does not mutate the proposal or launch combat for invalid initiative and enemy statistics',()=>{
  const pending=proposeAdventureEncounter(character(),'Road bandit','action-1');
  for(const change of [{playerInitiative:0},{enemyInitiative:41},{hitPoints:0},{armorClass:41},{attackModifier:100},{damageModifier:-30},{damageDice:'unknown'}]){
   expect(()=>enterSoloAdventureEncounter(pending,{...stats,...change})).toThrow();
   expect(pending.companionEncounter).toBeUndefined();
   expect(pending.adventureSession?.pendingEncounter?.actionId).toBe('action-1');
  }
  expect(enterSoloAdventureEncounter(pending,stats).adventureSession?.status).toBe('encounter');
 });
});
