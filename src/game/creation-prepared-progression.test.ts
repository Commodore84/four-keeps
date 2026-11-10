import {describe,it,expect} from 'vitest';
import {preparedSpellsAtLevel,PREPARED_SPELL_PROGRESSION,spellcastingAtLevel} from './creationClasses';
import {emptyForecast,forecastSpellOptions,forecastSpellSelectionWarnings,forecastReplacementWarnings,toggleForecastSpell,updateLevelPlan} from './creationForecast';
describe('2024 prepared spell progression',()=>{
 it('has twenty verified counts per spellcasting class',()=>{
  for(const cls of ['bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard']){
   expect(PREPARED_SPELL_PROGRESSION[cls]).toHaveLength(20);
   expect(preparedSpellsAtLevel(cls,1)).toBeGreaterThan(0);
   expect(spellcastingAtLevel(cls,20)?.preparedSpells).toBe(preparedSpellsAtLevel(cls,20));
  }
  expect(preparedSpellsAtLevel('fighter',10)).toBeNull();
  expect(preparedSpellsAtLevel('bard',21)).toBeNull();
 });
 it('handles class-specific irregular jumps',()=>{
  expect(preparedSpellsAtLevel('sorcerer',2)).toBe(4);
  expect(preparedSpellsAtLevel('warlock',10)).toBe(10);
  expect(preparedSpellsAtLevel('wizard',16)).toBe(21);
  expect(preparedSpellsAtLevel('ranger',6)).toBe(6);
 });
 it('caps additions by the increase at that level',()=>{
  const spells=forecastSpellOptions('bard',undefined,5).filter(s=>s.level>0);
  let plan=emptyForecast();
  plan=toggleForecastSpell(plan,'bard',5,spells[0].id);
  plan=toggleForecastSpell(plan,'bard',5,spells[1].id);
  expect(forecastSpellSelectionWarnings('bard',plan,5,spells[2].id)[0]).toContain('no additional');
  expect(toggleForecastSpell(plan,'bard',5,spells[2].id)).toEqual(plan);
 });
 it('tracks replacement ownership through successive levels',()=>{
  const spells=forecastSpellOptions('bard',undefined,5).filter(s=>s.level===1);
  let plan=updateLevelPlan(emptyForecast(),3,{replacementSpellId:spells[0].id,replacementWithSpellId:spells[1].id});
  plan=updateLevelPlan(plan,4,{replacementSpellId:spells[1].id,replacementWithSpellId:spells[2].id});
  expect(forecastReplacementWarnings('bard',plan,[spells[0].id])).toEqual([]);
  plan=updateLevelPlan(plan,5,{replacementSpellId:spells[0].id,replacementWithSpellId:spells[3].id});
  expect(forecastReplacementWarnings('bard',plan,[spells[0].id])).toHaveLength(1);
 });
});