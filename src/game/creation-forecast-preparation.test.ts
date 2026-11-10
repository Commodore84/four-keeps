import {describe,it,expect} from 'vitest';
import {emptyForecast,forecastSpellOptions,forecastSpellPolicy,forecastReplacementWarnings,updateLevelPlan,validateForecast} from './creationForecast';
describe('class spell preparation and replacement forecasts',()=>{
 it('distinguishes spellbook, prepared, and pact magic for all eight spellcasting classes',()=>{
  expect(forecastSpellPolicy('wizard')?.mode).toBe('spellbook');
  expect(forecastSpellPolicy('warlock')?.mode).toBe('pact-prepared');
  for(const cls of ['bard','sorcerer','cleric','druid','paladin','ranger'])expect(forecastSpellPolicy(cls)?.mode).toBe('prepared');
  expect(forecastSpellPolicy('barbarian')).toBeNull();
 });
 it('requires a complete, different and eligible replacement',()=>{
  const options=forecastSpellOptions('bard',undefined,5).filter(s=>s.level>0);
  const partial=updateLevelPlan(emptyForecast(),5,{replacementSpellId:options[0].id});
  expect(forecastReplacementWarnings('bard',partial)).toHaveLength(1);
  const same=updateLevelPlan(partial,5,{replacementWithSpellId:options[0].id});
  expect(forecastReplacementWarnings('bard',same)[0]).toContain('different');
  const valid=updateLevelPlan(same,5,{replacementWithSpellId:options[1].id});
  expect(forecastReplacementWarnings('bard',valid)[0]).toContain('not in the level-one prepared spells');
  expect(validateForecast('bard',valid).length).toBeGreaterThan(0);
 });
 it('recognizes level-one prepared spells as valid replacement ownership',()=>{
  const options=forecastSpellOptions('bard',undefined,5).filter(s=>s.level===1);
  const forecast=updateLevelPlan(emptyForecast(),5,{replacementSpellId:options[0].id,replacementWithSpellId:options[1].id});
  expect(forecastReplacementWarnings('bard',forecast,[options[0].id])).toEqual([]);
  expect(forecastReplacementWarnings('bard',forecast)).toHaveLength(1);
 });
 it('separates Wizard spellbook additions from preparation and Pact Magic arcanum',()=>{
  expect(forecastSpellPolicy('wizard')?.mode).toBe('spellbook');
  expect(forecastSpellPolicy('warlock')?.mode).toBe('pact-prepared');
  const sixth=forecastSpellOptions('warlock',undefined,11).find(spell=>spell.level===6);
  if(sixth){
   const early=updateLevelPlan(emptyForecast(),10,{plannedSpellIds:[sixth.id]});
   expect(validateForecast('warlock',early).some(w=>w.includes('not eligible'))).toBe(true);
  }
 });
 it('uses the correct 2024 replacement timing',()=>{
  for(const cls of ['cleric','druid','paladin','ranger','wizard'])expect(forecastSpellPolicy(cls)?.replacementTiming).toBe('long-rest');
  for(const cls of ['bard','sorcerer','warlock'])expect(forecastSpellPolicy(cls)?.replacementTiming).toBe('level-up');
  expect(forecastSpellPolicy('cleric')?.replacementLimit).toBeGreaterThan(1);
 });
 it('does not permit replacement intent for wizard spellbook additions',()=>{
  const options=forecastSpellOptions('wizard',undefined,4).filter(s=>s.level>0);
  const forecast=updateLevelPlan(emptyForecast(),4,{replacementSpellId:options[0].id,replacementWithSpellId:options[1].id});
  expect(forecastReplacementWarnings('wizard',forecast)).toHaveLength(1);
 });
});