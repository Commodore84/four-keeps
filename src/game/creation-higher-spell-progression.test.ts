import {describe,it,expect} from 'vitest';
import {forecastSpellOptions,emptyForecast,toggleForecastSpell,plannedLevel,updateLevelPlan} from './creationForecast';
const levels=(cls:string,level:number,subclass?:string)=>forecastSpellOptions(cls,subclass,level).map(spell=>spell.level);
const contains=(cls:string,level:number,name:string,subclass?:string)=>forecastSpellOptions(cls,subclass,level).some(spell=>spell.name===name);
describe('curated higher-level spell gating',()=>{
 it('unlocks full-caster spell levels progressively through ninth level',()=>{
  expect(contains('wizard',2,'Fireball')).toBe(false);
  expect(contains('wizard',5,'Fireball')).toBe(true);
  expect(contains('wizard',6,'Polymorph')).toBe(false);
  expect(contains('wizard',7,'Polymorph')).toBe(true);
  expect(contains('wizard',16,'Wish')).toBe(false);
  expect(contains('wizard',17,'Wish')).toBe(true);
 });
 it('enforces half-caster and third-caster spell ceilings',()=>{
  expect(contains('paladin',4,'Revivify')).toBe(false);
  expect(contains('paladin',9,'Revivify')).toBe(true);
  expect(Math.max(...levels('paladin',20))).toBe(5);
  expect(Math.max(...levels('fighter',6,'fighter-eldritch-knight'))).toBe(1);
  expect(Math.max(...levels('fighter',7,'fighter-eldritch-knight'))).toBe(2);
  expect(Math.max(...levels('rogue',20,'rogue-arcane-trickster'))).toBe(4);
 });
 it('separates warlock pact spell tiers from Mystic Arcanum',()=>{
  expect(contains('warlock',10,'Eyebite')).toBe(false);
  expect(contains('warlock',11,'Eyebite')).toBe(true);
  expect(contains('warlock',12,'Forcecage')).toBe(false);
  expect(contains('warlock',13,'Forcecage')).toBe(true);
  expect(contains('warlock',17,'Foresight')).toBe(true);
 });
 it('rejects early high-level spell selections',()=>{
  const fireball=forecastSpellOptions('wizard',undefined,5).find(spell=>spell.name==='Fireball')!;
  expect(toggleForecastSpell(emptyForecast(),'wizard',4,fireball.id)).toEqual(emptyForecast());
  const forecast=toggleForecastSpell(emptyForecast(),'wizard',5,fireball.id);
  expect(plannedLevel(forecast,5).plannedSpellIds).toContain(fireball.id);
 });
 it('keeps noncasting subclasses spell-free',()=>{
  const f=updateLevelPlan(emptyForecast(),3,{subclassId:'fighter-champion'});
  expect(forecastSpellOptions('fighter',plannedLevel(f,3).subclassId,20)).toEqual([]);
 });
});
