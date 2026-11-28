import {describe,expect,it} from 'vitest';
import type {Campaign} from './campaign';
import {rollDuelInitiative,requireLegacyNighthawk} from './campaign';
import {resolveDmBattlefield} from './encounterDirector';
import {restorePracticeEncounter} from './practiceEncounterBridge';

const scenario=()=>resolveDmBattlefield({templateId:'warehouse-vermin'},'dasahi');

function original():Campaign{
 return {schemaVersion:1,id:'saved-nighthawk',journal:[],
  characterIdentity:{classId:'rogue'},
  adventureSession:{status:'exploring',site:'frontier',characterSource:'campaign-character',
   visited:[],interactions:[],pendingEncounter:{actionId:'warehouse-job-1',enemyName:'Giant Rats',scenario:scenario()}}
 } as unknown as Campaign;
}

describe('reinstated Begin Practice Encounter handoff',()=>{
 it('converts a DM-approved warehouse job into an original combat save without deleting its campaign',()=>{
  const before=original(),next=restorePracticeEncounter(before);
  expect(next).not.toBe(before);
  expect(before.combat).toBeUndefined();
  expect(next.id).toBe(before.id);
  expect(next.characterIdentity).toEqual(before.characterIdentity);
  expect(next.combat?.status).toBe('awaiting-initiative');
  expect(next.combat?.classicAdventure?.second).toBeDefined();
  expect(next.adventureSession?.pendingEncounter).toBeUndefined();
  expect(next.adventureSession?.status).toBe('encounter');
  expect(restorePracticeEncounter(next)).toBe(next);
 });
 it('rolls initiative in the original engine with both verified opponents',()=>{
  const converted=restorePracticeEncounter(original());
  expect(()=>requireLegacyNighthawk(converted)).not.toThrow();
  const rolled=rollDuelInitiative(converted);
  expect(rolled.combat?.status).toBe('initiative-set');
  expect(rolled.combat?.secondEnemy?.name).toBe(converted.combat?.classicAdventure?.second?.name);
  expect(rolled.combat?.enemyMaxHp).toBe(converted.combat?.classicAdventure?.first.maxHp);
  expect(rolled.combat?.order).toHaveLength(3);
 });
 it('retains current HP, round, and turn when moving a saved active encounter',()=>{
  const initial=original(),battlefield=scenario(),first=battlefield.actors[0],second=battlefield.actors[1];
  const phase={scenario:battlefield,initiative:[{actor:'nighthawk',dice:[14],modifier:3,total:17},{actor:first.id,dice:[9],modifier:1,total:10},{actor:second.id,dice:[7],modifier:1,total:8}],actors:{}};
  const base={x:1,y:1,hp:7,maxHp:7,initiative:10,speedFeet:30,movementSpentFeet:0,
   actionUsed:false,bonusActionUsed:false,conditions:[],dashFeet:0,disengaged:false,dodging:false};
  const saved={...initial,adventureSession:{...initial.adventureSession!,status:'encounter' as const,pendingEncounter:undefined},
   companionEncounter:{status:'active' as const,mode:'unified' as const,round:3,turnIndex:1,order:['nighthawk',first.id,second.id],
    participants:{nighthawk:{...base,initiative:17,hp:5,maxHp:12},[first.id]:{...base,hp:2},[second.id]:{...base,x:3,y:3}},phaseThree:phase}
  } as unknown as Campaign;
  const restored=restorePracticeEncounter(saved);
  expect(restored.combat?.status).toBe('initiative-set');
  expect(restored.combat?.round).toBe(3);
  expect(restored.combat?.turnIndex).toBe(1);
  expect(restored.combat?.enemyHp).toBe(2);
  expect(restored.combat?.secondEnemy?.hp).toBe(7);
  expect(restored.companionEncounter).toBe(saved.companionEncounter);
 });
 it('preserves existing combats and opens the same classic arena for Fighter and Monk baseline weapon tests',()=>{
  const source=original();
  const current={...source,combat:{status:'awaiting-initiative',enemyName:'Training Dummy',enemyInitiative:4,round:1}} as Campaign;
  expect(restorePracticeEncounter(current)).toBe(current);
  for(const classId of ['fighter','monk']){
   const imported={...source,characterIdentity:{...source.characterIdentity!,classId}} as Campaign;
   const converted=restorePracticeEncounter(imported);
   expect(converted).not.toBe(imported);
   expect(converted.characterIdentity?.classId).toBe(classId);
   expect(converted.combat?.classicAdventure?.origin).toBe('dm');
   expect(converted.combat?.status).toBe('awaiting-initiative');
   expect(converted.combat?.classicAdventure?.second).toBeDefined();
   expect(imported.combat).toBeUndefined();
   expect(restorePracticeEncounter(converted)).toBe(converted);
  }
 });
});
