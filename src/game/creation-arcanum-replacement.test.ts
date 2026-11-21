import {describe,it,expect} from 'vitest';
import {emptyForecast,forecastSpellOptions,toggleForecastSpell,plannedLevel,forecastReplacementWarnings,forecastArcanumReplacementWarnings,activeMysticArcanumAtLevel,updateLevelPlan} from './creationForecast';
describe('Mystic Arcanum and stateful replacement regression',()=>{
 it('ignores non-Warlock spells injected into Mystic Arcanum unlocks',()=>{
  const bardOnly=forecastSpellOptions('bard',undefined,11).find(spell=>spell.level===6&&!spell.classes.includes('warlock'));
  expect(bardOnly).toBeDefined();
  if(!bardOnly)return;
  const forecast=updateLevelPlan(emptyForecast(),11,{plannedSpellIds:[bardOnly.id]});
  expect(activeMysticArcanumAtLevel(forecast,11)).toEqual([]);
 });
 it('does not activate a replacement for an unowned Warlock arcanum',()=>{
  const choices=forecastSpellOptions('warlock',undefined,12).filter(spell=>spell.level===6);
  expect(choices.length).toBeGreaterThanOrEqual(2);
  const forecast=updateLevelPlan(emptyForecast(),12,{arcanumReplacementFromId:choices[0].id,arcanumReplacementToId:choices[1].id});
  expect(activeMysticArcanumAtLevel(forecast,12)).toEqual([]);
  expect(forecastArcanumReplacementWarnings(forecast).some(message=>message.includes('not currently active'))).toBe(true);
 });

 it('requires both replacement fields and rejects an unchanged Arcanum',()=>{
  const sixth=forecastSpellOptions('warlock',undefined,11).find(spell=>spell.level===6);
  expect(sixth).toBeDefined();
  if(!sixth)return;
  let forecast=toggleForecastSpell(emptyForecast(),'warlock',11,sixth.id);
  forecast=updateLevelPlan(forecast,12,{arcanumReplacementFromId:sixth.id});
  expect(forecastArcanumReplacementWarnings(forecast).some(w=>w.includes('choose both'))).toBe(true);
  forecast=updateLevelPlan(forecast,12,{arcanumReplacementToId:sixth.id});
  expect(forecastArcanumReplacementWarnings(forecast).some(w=>w.includes('must change'))).toBe(true);
 });
 it('rejects an Arcanum replacement before any tier has been unlocked',()=>{
  const sixth=forecastSpellOptions('warlock',undefined,11).filter(spell=>spell.level===6);
  expect(sixth.length).toBeGreaterThanOrEqual(2);
  const forecast=updateLevelPlan(emptyForecast(),10,{arcanumReplacementFromId:sixth[0].id,arcanumReplacementToId:sixth[1].id});
  expect(forecastArcanumReplacementWarnings(forecast).length).toBeGreaterThan(0);
  expect(activeMysticArcanumAtLevel(forecast,10)).toEqual([]);
 });

 it('shows the active replacement spell rather than the retired Arcanum',()=>{
  const spells=forecastSpellOptions('warlock',undefined,13).filter(spell=>spell.level===6);
  if(spells.length<2)return;
  let forecast=toggleForecastSpell(emptyForecast(),'warlock',11,spells[0].id);
  expect(activeMysticArcanumAtLevel(forecast,11)).toContain(spells[0].id);
  forecast=updateLevelPlan(forecast,12,{arcanumReplacementFromId:spells[0].id,arcanumReplacementToId:spells[1].id});
  expect(activeMysticArcanumAtLevel(forecast,12)).toContain(spells[1].id);
  expect(activeMysticArcanumAtLevel(forecast,12)).not.toContain(spells[0].id);
  expect(activeMysticArcanumAtLevel(forecast,11)).toContain(spells[0].id);
 });

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