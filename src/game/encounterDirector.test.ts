import {describe,it,expect} from 'vitest';
import {getMonster,monsterIds} from './monsterCompendium';
import {buildSoloEncounter,levelOneEncounterBudget,SOLO_ROGUE_ENCOUNTERS} from './encounterDirector';
import {TACTICAL_PROFILES,validateCombatScenario} from './combatScenario';
describe('SRD 5.2.1 monster compendium and solo encounter director',()=>{
 it('uses documented full stats rather than invented enemy HP and attacks',()=>{
  expect(monsterIds).toEqual(['giant-rat','bandit','goblin-minion']);
  expect(getMonster('giant-rat')?.ac).toBe(13);
  expect(getMonster('giant-rat')?.actions[0].attack?.bonus).toBe(5);
  expect(getMonster('giant-rat')?.traits[0].effect).toBe('pack-tactics');
  expect(getMonster('bandit')?.languages).toContain("Thieves' Cant");
  expect(getMonster('goblin-minion')?.bonusActions[0].effect).toBe('nimble-escape');
  expect(getMonster('__proto__')).toBeUndefined();
 });
 it('resolves playable combat profiles directly from the monster registry',()=>{
  for(const id of monsterIds){
   const monster=getMonster(id)!;
   const profile=TACTICAL_PROFILES[id];
   expect(profile.hp).toBe(monster.hp);
   expect(profile.ac).toBe(monster.ac);
   expect(profile.weapons[0].bonus).toBe(monster.actions[0].attack?.bonus);
  }
 });
 it('uses 2024 level-one XP budgets with an additional solo multi-enemy warning',()=>{
  expect(levelOneEncounterBudget(['giant-rat']).xp).toBe(25);
  expect(levelOneEncounterBudget(['bandit']).difficulty).toBe('Low');
  const duo=levelOneEncounterBudget(['goblin-minion','goblin-minion']);
  expect(duo).toMatchObject({xp:50,difficulty:'Low',soloActionEconomyWarning:true,aboveLevelOneBudget:false});
  expect(levelOneEncounterBudget(['bandit','bandit','bandit','bandit']).difficulty).toBe('High');
  expect(levelOneEncounterBudget(['bandit','bandit','bandit','bandit','bandit']).difficulty).toBe('Over budget');
  expect(levelOneEncounterBudget(['goblin-minion','goblin-minion'],2).soloActionEconomyWarning).toBe(false);
  expect(()=>levelOneEncounterBudget(['giant-rat'],0)).toThrow();
 });
 it('provides three distinct coherent battlefield test templates with alternatives',()=>{
  const ids=['warehouse-vermin','roadside-bandit','ruins-goblin-scouts'] as const;
  expect(Object.keys(SOLO_ROGUE_ENCOUNTERS)).toEqual(ids);
  for(const id of ids){
   const {scenario,assessment}=buildSoloEncounter(id,'dasahi');
   expect(validateCombatScenario(scenario,'dasahi').actors).toHaveLength(SOLO_ROGUE_ENCOUNTERS[id].monsterIds.length);
   expect(assessment.xp).toBe(id==='ruins-goblin-scouts'?50:25);
   expect(SOLO_ROGUE_ENCOUNTERS[id].alternatives).toContain('withdraw');
   expect(scenario.exits).not.toHaveLength(0);
  }
 });
 it('rejects unknown profiles or arbitrary combat abilities',()=>{
  expect(()=>validateCombatScenario({size:8,starts:[{x:1,y:1}],actors:[
   {id:'bad',label:'Impossible',profile:'ancient-dragon',side:'enemies',square:{x:3,y:3}}
  ]},'dasahi')).toThrow();
 });
});
