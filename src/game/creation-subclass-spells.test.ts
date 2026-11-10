import {describe,it,expect} from 'vitest';
import {alwaysPreparedSubclassSpells,isAlwaysPreparedSubclassSpell} from './creationSubclassSpells';
import {emptyForecast,forecastSpellSelectionWarnings,updateLevelPlan} from './creationForecast';
describe('2024 always-prepared subclass spells',()=>{
 it('unlocks Life Domain spells cumulatively at levels 3, 5, 7 and 9',()=>{
  expect(alwaysPreparedSubclassSpells('cleric-life',2)).toEqual([]);
  expect(alwaysPreparedSubclassSpells('cleric-life',3)).toHaveLength(4);
  expect(alwaysPreparedSubclassSpells('cleric-life',4)).toHaveLength(4);
  expect(alwaysPreparedSubclassSpells('cleric-life',5)).toHaveLength(6);
  expect(alwaysPreparedSubclassSpells('cleric-life',7)).toHaveLength(8);
  expect(alwaysPreparedSubclassSpells('cleric-life',9)).toHaveLength(10);
 });
 it('unlocks Devotion spells cumulatively at levels 3, 5, 9, 13 and 17',()=>{
  expect(alwaysPreparedSubclassSpells('paladin-devotion',2)).toEqual([]);
  for(const [level,count] of [[3,2],[5,4],[9,6],[13,8],[17,10]])expect(alwaysPreparedSubclassSpells('paladin-devotion',level)).toHaveLength(count);
  expect(isAlwaysPreparedSubclassSpell('paladin-devotion',3,'Shield of Faith')).toBe(true);
  expect(isAlwaysPreparedSubclassSpell('paladin-devotion',3,'Commune')).toBe(false);
 });
 it('does not consume a preparation choice for an always-prepared spell',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'cleric-life'});
  expect(forecastSpellSelectionWarnings('cleric',forecast,3,'aid')[0]).toContain('always prepared');
 });
 it('does not infer lists for unverified subclasses',()=>{
  expect(alwaysPreparedSubclassSpells('cleric-light',20)).toEqual([]);
 });
});