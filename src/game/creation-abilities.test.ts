import {describe,it,expect} from 'vitest';
import {ABILITIES,STANDARD_ARRAY,emptyAbilityDraft,pointCost,rollAbility,rollSet,totalScores,modifier,validateAbilityDraft} from './creationAbilities';
const assigned=()=>({...emptyAbilityDraft(),base:{Str:15,Dex:14,Con:13,Int:12,Wis:10,Cha:8},bonuses:{Str:2,Dex:1}});
describe('2024 ability creation',()=>{
 it('uses each standard score exactly once',()=>{
  expect(validateAbilityDraft(assigned(),['Str','Dex','Con'])).toEqual([]);
  expect(validateAbilityDraft({...assigned(),base:{Str:15,Dex:15,Con:13,Int:12,Wis:10,Cha:8}},['Str','Dex','Con'])).not.toEqual([]);
  expect(STANDARD_ARRAY).toEqual([15,14,13,12,10,8]);
 });
 it('enforces background eligibility and distinct bonus distributions',()=>{
  expect(validateAbilityDraft(assigned(),['Dex','Con','Int'])).toContain('Background bonuses must use eligible abilities.');
  expect(validateAbilityDraft({...assigned(),bonuses:{Str:2,Dex:2}},['Str','Dex','Con']).length).toBeGreaterThan(0);
  expect(validateAbilityDraft({...assigned(),bonusMode:'one-one-one',bonuses:{Str:1,Dex:1,Con:1}},['Str','Dex','Con'])).toEqual([]);
 });
 it('calculates point buy costs and prevents overspending',()=>{
  expect(pointCost({Str:15,Dex:15,Con:15,Int:8,Wis:8,Cha:8})).toBe(27);
  expect(pointCost({Str:15,Dex:15,Con:15,Int:15,Wis:8,Cha:8})).toBe(36);
  expect(validateAbilityDraft({...assigned(),method:'point-buy',base:{Str:15,Dex:15,Con:15,Int:15,Wis:8,Cha:8}},['Str','Dex','Con'])).toContain('Point Buy exceeds 27 points.');
  expect(validateAbilityDraft({...assigned(),method:'point-buy',base:{Str:16,Dex:8,Con:8,Int:8,Wis:8,Cha:8}},['Str','Dex','Con'])).toContain('Point Buy scores must be between 8 and 15.');
 });
 it('rolls 4d6 dropping lowest and validates rolled score permutations',()=>{
  expect(rollAbility(()=>0)).toEqual({dice:[1,1,1,1],score:3});
  expect(rollAbility(()=>0.9999)).toEqual({dice:[6,6,6,6],score:18});
  const rolled=rollSet(()=>0.5);expect(rolled.rolls).toHaveLength(6);expect(rolled.rollDice.every(x=>x.length===4)).toBe(true);
  const draft={...assigned(),method:'rolled' as const,rolls:[18,15,12,9,7,3],base:{Str:18,Dex:15,Con:12,Int:9,Wis:7,Cha:3}};
  expect(validateAbilityDraft(draft,['Str','Dex','Con'])).toEqual([]);
  expect(validateAbilityDraft({...draft,base:{...draft.base,Cha:18}},['Str','Dex','Con'])).not.toEqual([]);
 });
 it('computes modifiers and final totals',()=>{
  expect(totalScores(assigned())).toEqual({Str:17,Dex:15,Con:13,Int:12,Wis:10,Cha:8});
  expect(modifier(17)).toBe(3);expect(modifier(8)).toBe(-1);
  expect(ABILITIES).toHaveLength(6);
 });
});
