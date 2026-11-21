import {describe,it,expect} from 'vitest';
import {emptyForecast,updateLevelPlan,landTerrainAtLevel,forecastSpellOptions,toggleForecastSpell,activeMysticArcanumAtLevel,forecastArcanumReplacementWarnings,validateForecast,forecastSpellSelectionWarnings} from './creationForecast';
import {allAlwaysPreparedSpells} from './creationSubclassSpells';

describe('character-builder forecast integration',()=>{
 it('preserves Paladin class and subclass automatic spell unlocks across advancement',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'paladin-devotion'});
  expect(validateForecast('paladin',forecast)).toEqual([]);
  const atThree=allAlwaysPreparedSpells('paladin','paladin-devotion',3);
  const atFive=allAlwaysPreparedSpells('paladin','paladin-devotion',5);
  expect(atThree).toContain('Divine Smite');
  expect(atThree).not.toContain('Find Steed');
  expect(atFive).toContain('Find Steed');
  expect(atFive).toContain('Zone of Truth');
 });
 it('switches Land terrain without retroactively changing earlier forecast preparations',()=>{
  let forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'druid-land',landTerrain:'arid'});
  forecast=updateLevelPlan(forecast,6,{landTerrain:'polar'});
  expect(validateForecast('druid',forecast)).toEqual([]);
  expect(landTerrainAtLevel(forecast,5)).toBe('arid');
  expect(landTerrainAtLevel(forecast,6)).toBe('polar');
  expect(allAlwaysPreparedSpells('druid','druid-land',5,landTerrainAtLevel(forecast,5))).toContain('Fireball');
  expect(allAlwaysPreparedSpells('druid','druid-land',6,landTerrainAtLevel(forecast,6))).toContain('Sleet Storm');
  expect(allAlwaysPreparedSpells('druid','druid-land',6,landTerrainAtLevel(forecast,6))).not.toContain('Fireball');
 });
 it('keeps Warlock Mystic Arcanum replacement separate from tier unlock and historical state',()=>{
  const sixth=forecastSpellOptions('warlock',undefined,12).filter(spell=>spell.level===6);
  expect(sixth.length).toBeGreaterThanOrEqual(2);
  let forecast=toggleForecastSpell(emptyForecast(),'warlock',11,sixth[0].id);
  forecast=updateLevelPlan(forecast,12,{arcanumReplacementFromId:sixth[0].id,arcanumReplacementToId:sixth[1].id});
  expect(forecastArcanumReplacementWarnings(forecast)).toEqual([]);
  expect(activeMysticArcanumAtLevel(forecast,11)).toEqual([sixth[0].id]);
  expect(activeMysticArcanumAtLevel(forecast,12)).toEqual([sixth[1].id]);
  expect(validateForecast('warlock',forecast)).toEqual([]);
  forecast=updateLevelPlan(forecast,13,{arcanumReplacementFromId:sixth[0].id,arcanumReplacementToId:sixth[1].id});
  expect(validateForecast('warlock',forecast).some(error=>error.includes('not currently active'))).toBe(true);
 });
 it('rejects a duplicate ordinary preparation of an automatically prepared subclass spell',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'cleric-life'});
  const aid=forecastSpellOptions('cleric','cleric-life',3).find(spell=>spell.name==='Aid');
  expect(aid).toBeDefined();
  if(!aid)return;
  expect(forecastSpellSelectionWarnings('cleric',forecast,3,aid.id).some(message=>message.includes('always prepared'))).toBe(true);
  expect(toggleForecastSpell(forecast,'cleric',3,aid.id)).toEqual(forecast);
 });
});
