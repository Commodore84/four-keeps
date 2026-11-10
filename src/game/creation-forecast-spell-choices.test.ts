import {describe,it,expect} from 'vitest';
import {emptyForecast,forecastSpellOptions,plannedLevel,toggleForecastSpell,updateLevelPlan,forecastSpellWarnings} from './creationForecast';
describe('structured spell forecasting',()=>{
 it('stores and removes class-eligible spells without mutating earlier drafts',()=>{
  const start=emptyForecast();
  const magicMissile=forecastSpellOptions('wizard').find(s=>s.name==='Magic Missile');
  expect(magicMissile).toBeDefined();
  const selected=toggleForecastSpell(start,'wizard',4,magicMissile!.id);
  expect(plannedLevel(start,4).plannedSpellIds).toBeUndefined();
  expect(plannedLevel(selected,4).plannedSpellIds).toEqual([magicMissile!.id]);
  expect(plannedLevel(toggleForecastSpell(selected,'wizard',4,magicMissile!.id),4).plannedSpellIds).toEqual([]);
  expect(toggleForecastSpell(start,'barbarian',4,magicMissile!.id)).toEqual(start);
 });
 it('offers wizard spells to third casters after subclass selection',()=>{
  const start=updateLevelPlan(emptyForecast(),3,{subclassId:'rogue-arcane-trickster'});
  const mageHand=forecastSpellOptions('rogue','rogue-arcane-trickster').find(s=>s.name==='Mage Hand');
  expect(mageHand).toBeDefined();
  expect(plannedLevel(toggleForecastSpell(start,'rogue',3,mageHand!.id),3).plannedSpellIds).toContain(mageHand!.id);
  expect(toggleForecastSpell(start,'rogue',2,mageHand!.id)).toEqual(start);
  expect(toggleForecastSpell(emptyForecast(),'rogue',3,mageHand!.id)).toEqual(emptyForecast());
 });
 it('blocks spells before casting unlock and flags duplicates and stale subclass choices',()=>{
  const wizardSpell=forecastSpellOptions('wizard').find(spell=>spell.name==='Magic Missile')!;
  expect(forecastSpellOptions('paladin',undefined,1)).toEqual([]);
  expect(forecastSpellOptions('fighter','fighter-eldritch-knight',2)).toEqual([]);
  expect(toggleForecastSpell(emptyForecast(),'fighter',2,wizardSpell.id)).toEqual(emptyForecast());
  const once=toggleForecastSpell(emptyForecast(),'wizard',3,wizardSpell.id);
  const twice=toggleForecastSpell(once,'wizard',4,wizardSpell.id);
  expect(forecastSpellWarnings('wizard',twice).some(warning=>warning.includes('already selected'))).toBe(true);
  const trickster=updateLevelPlan(emptyForecast(),3,{subclassId:'rogue-arcane-trickster'});
  const selected=toggleForecastSpell(trickster,'rogue',3,wizardSpell.id);
  const changed=updateLevelPlan(selected,3,{subclassId:'rogue-thief'});
  expect(forecastSpellWarnings('rogue',changed).some(warning=>warning.includes('not eligible'))).toBe(true);
 });
 it('does not offer third-caster spell lists to unrelated subclasses',()=>{
  expect(forecastSpellOptions('fighter','fighter-champion')).toEqual([]);
  expect(forecastSpellOptions('rogue','rogue-thief')).toEqual([]);
 });
});
