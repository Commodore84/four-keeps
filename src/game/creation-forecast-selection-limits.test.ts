import {describe,it,expect} from 'vitest';
import {emptyForecast,forecastSpellOptions,plannedLevel,toggleForecastSpell,updateLevelPlan,forecastSpellSelectionWarnings} from './creationForecast';
const spell=(cls:string,level:number,name:string)=>forecastSpellOptions(cls,undefined,level).find(item=>item.name===name)!;
describe('forecast spell choice limits',()=>{
 it('rejects duplicate selections across levels without altering the forecast',()=>{
  const id=spell('wizard',5,'Fireball').id;
  const first=toggleForecastSpell(emptyForecast(),'wizard',5,id);
  expect(toggleForecastSpell(first,'wizard',6,id)).toEqual(first);
  expect(plannedLevel(first,5).plannedSpellIds).toEqual([id]);
 });
 it('does not invent new cantrip choices on levels without a cantrip increase',()=>{
  const cantrip=forecastSpellOptions('wizard',undefined,2).find(item=>item.level===0)!;
  expect(toggleForecastSpell(emptyForecast(),'wizard',2,cantrip.id)).toEqual(emptyForecast());
  expect(forecastSpellSelectionWarnings('wizard',emptyForecast(),2,cantrip.id).length).toBeGreaterThan(0);
 });
 it('permits a cantrip choice when class progression grants one',()=>{
  const cantrip=forecastSpellOptions('wizard',undefined,4).find(item=>item.level===0)!;
  expect(plannedLevel(toggleForecastSpell(emptyForecast(),'wizard',4,cantrip.id),4).plannedSpellIds).toContain(cantrip.id);
 });
 it('limits wizard spellbook additions to two leveled spells per wizard level',()=>{
  const options=forecastSpellOptions('wizard',undefined,5).filter(item=>item.level>0);
  let forecast=emptyForecast();
  forecast=toggleForecastSpell(forecast,'wizard',5,options[0].id);
  forecast=toggleForecastSpell(forecast,'wizard',5,options[1].id);
  expect(toggleForecastSpell(forecast,'wizard',5,options[2].id)).toEqual(forecast);
  expect(forecastSpellSelectionWarnings('wizard',forecast,5,options[2].id)).toHaveLength(1);
 });
 it('rejects unrelated subclass spell choices',()=>{
  const id=spell('wizard',5,'Fireball').id;
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'fighter-champion'});
  expect(toggleForecastSpell(forecast,'fighter',5,id)).toEqual(forecast);
 });
});