import {describe,it,expect} from 'vitest';
import {emptyForecast,forecastSpellOptions,toggleForecastSpell,plannedLevel,forecastReplacementWarnings,updateLevelPlan} from './creationForecast';
describe('Mystic Arcanum and stateful replacement regression',()=>{
 it('unlocks each Mystic Arcanum tier at its exact Warlock level',()=>{
  for(const [spellLevel,unlock] of [[6,11],[7,13],[8,15],[9,17]]){
   const spell=forecastSpellOptions('warlock',undefined,unlock).find(s=>s.level===spellLevel);
   if(!spell)continue;
   expect(plannedLevel(toggleForecastSpell(emptyForecast(),'warlock',unlock-1,spell.id),unlock-1).plannedSpellIds).toBeUndefined();
   expect(plannedLevel(toggleForecastSpell(emptyForecast(),'warlock',unlock,spell.id),unlock).plannedSpellIds).toContain(spell.id);
   expect(plannedLevel(toggleForecastSpell(emptyForecast(),'warlock',unlock+1,spell.id),unlock+1).plannedSpellIds).toBeUndefined();
  }
 });
 it('tracks replacements through successive levels and rejects replacing a removed spell',()=>{
  const spells=forecastSpellOptions('bard',undefined,5).filter(s=>s.level===1);
  expect(spells.length).toBeGreaterThanOrEqual(4);
  let plan=updateLevelPlan(emptyForecast(),3,{replacementSpellId:spells[0].id,replacementWithSpellId:spells[1].id});
  plan=updateLevelPlan(plan,4,{replacementSpellId:spells[1].id,replacementWithSpellId:spells[2].id});
  expect(forecastReplacementWarnings('bard',plan,[spells[0].id])).toEqual([]);
  plan=updateLevelPlan(plan,5,{replacementSpellId:spells[0].id,replacementWithSpellId:spells[3].id});
  expect(forecastReplacementWarnings('bard',plan,[spells[0].id]).some(w=>w.includes('not in'))).toBe(true);
 });
});