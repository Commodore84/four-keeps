import {describe,it,expect} from 'vitest';
import {alwaysPreparedSubclassSpells,isAlwaysPreparedSubclassSpell} from './creationSubclassSpells';
import {emptyForecast,forecastSpellSelectionWarnings,updateLevelPlan} from './creationForecast';
describe('2024 always-prepared subclass spells',()=>{
 it('unlocks 2024 Trickery and War Domain spells at the correct levels',()=>{
  for(const subclass of ['cleric-trickery','cleric-war']){
   expect(alwaysPreparedSubclassSpells(subclass,2)).toEqual([]);
   for(const [level,count] of [[3,4],[5,6],[7,8],[9,10]])expect(alwaysPreparedSubclassSpells(subclass,level)).toHaveLength(count);
  }
  expect(isAlwaysPreparedSubclassSpell('cleric-trickery',3,'Invisibility')).toBe(true);
  expect(isAlwaysPreparedSubclassSpell('cleric-trickery',5,'Hypnotic Pattern')).toBe(true);
  expect(isAlwaysPreparedSubclassSpell('cleric-war',9,'Steel Wind Strike')).toBe(true);
  expect(isAlwaysPreparedSubclassSpell('cleric-war',8,'Steel Wind Strike')).toBe(false);
 });

 it('unlocks verified Light Domain and Fiend Patron lists cumulatively',()=>{
  for(const subclass of ['cleric-light','warlock-fiend']){
   expect(alwaysPreparedSubclassSpells(subclass,2)).toEqual([]);
   for(const [level,count] of [[3,4],[5,6],[7,8],[9,10]])expect(alwaysPreparedSubclassSpells(subclass,level)).toHaveLength(count);
  }
  expect(isAlwaysPreparedSubclassSpell('cleric-light',5,'Fireball')).toBe(true);
  expect(isAlwaysPreparedSubclassSpell('warlock-fiend',5,'Stinking Cloud')).toBe(true);
  expect(isAlwaysPreparedSubclassSpell('warlock-fiend',4,'Stinking Cloud')).toBe(false);
 });

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
  expect(alwaysPreparedSubclassSpells('warlock-archfey',20)).toEqual([]);
 });
});