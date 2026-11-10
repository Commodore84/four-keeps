import {describe,it,expect} from 'vitest';
import {emptyForecast,forecastSpellOptions,toggleForecastSpell,plannedLevel,forecastReplacementWarnings,forecastArcanumReplacementWarnings,updateLevelPlan} from './creationForecast';
describe('Mystic Arcanum and stateful replacement regression',()=>{
 it('rejects replacing a spell with one already prepared even when forecast levels are unordered',()=>{
  const spells=forecastSpellOptions('bard',undefined,5).filter(spell=>spell.level===1);
  if(spells.length<3)return;
  let forecast=updateLevelPlan(emptyForecast(),5,{replacementSpellId:spells[0].id,replacementWithSpellId:spells[1].id});
  forecast=updateLevelPlan(forecast,3,{replacementSpellId:spells[2].id,replacementWithSpellId:spells[1].id});
  expect(forecastReplacementWarnings('bard',forecast,[spells[0].id,spells[2].id]).some(w=>w.includes('already among'))).toBe(true);
 });

 it('replaces an unlocked arcanum without granting another tier selection',()=>{
  const choices=forecastSpellOptions('warlock',undefined,13).filter(spell=>spell.level===6);
  if(choices.length<2)return;
  let forecast=toggleForecastSpell(emptyForecast(),'warlock',11,choices[0].id);
  forecast=updateLevelPlan(forecast,12,{arcanumReplacementFromId:choices[0].id,arcanumReplacementToId:choices[1].id});
  expect(forecastArcanumReplacementWarnings(forecast)).toEqual([]);
  forecast=updateLevelPlan(forecast,13,{arcanumReplacementFromId:choices[0].id,arcanumReplacementToId:choices[1].id});
  expect(forecastArcanumReplacementWarnings(forecast).some(w=>w.includes('not currently active'))).toBe(true);
 });
 it('rejects replacing an arcanum with a different tier',()=>{
  const sixth=forecastSpellOptions('warlock',undefined,17).find(spell=>spell.level===6);
  const seventh=forecastSpellOptions('warlock',undefined,17).find(spell=>spell.level===7);
  if(!sixth||!seventh)return;
  let forecast=toggleForecastSpell(emptyForecast(),'warlock',11,sixth.id);
  forecast=updateLevelPlan(forecast,14,{arcanumReplacementFromId:sixth.id,arcanumReplacementToId:seventh.id});
  expect(forecastArcanumReplacementWarnings(forecast).some(w=>w.includes('same spell level'))).toBe(true);
 });

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