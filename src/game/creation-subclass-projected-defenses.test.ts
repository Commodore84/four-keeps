import {describe,it,expect} from 'vitest';
import {emptyForecast,updateLevelPlan} from './creationForecast';
import {projectCharacterLevel} from './creationProjection';
const base={Str:12,Dex:14,Con:14,Int:10,Wis:12,Cha:16};
describe('2024 deterministic subclass forecast defenses and resources',()=>{
 it('Devotion aura grants Charmed immunity only from level 7',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'paladin-devotion'});
  expect(projectCharacterLevel('paladin',base,forecast,6).subclassConditionImmunities).toEqual([]);
  expect(projectCharacterLevel('paladin',base,forecast,7).subclassConditionImmunities.join(' ')).toContain('Charmed');
 });
 it.each([['arid','Fire'],['polar','Cold'],['temperate','Lightning'],['tropical','Poison']] as const)('Land %s grants %s resistance from level 10', (terrain,resistance)=>{
  let forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'druid-land',landTerrain:terrain});
  expect(projectCharacterLevel('druid',base,forecast,9).subclassResistances).toEqual([]);
  expect(projectCharacterLevel('druid',base,forecast,10).subclassResistances.join(' ')).toContain(resistance);
  forecast=updateLevelPlan(forecast,11,{landTerrain:'polar'});
  expect(projectCharacterLevel('druid',base,forecast,11).subclassResistances.join(' ')).toContain('Cold');
  expect(projectCharacterLevel('druid',base,forecast,10).subclassResistances.join(' ')).toContain(resistance);
 });
 it('Land has Poisoned immunity without a terrain and does not invent a resistance',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'druid-land'});
  const projection=projectCharacterLevel('druid',base,forecast,10);
  expect(projection.subclassConditionImmunities).toContain('Poisoned');
  expect(projection.subclassResistances).toEqual([]);
  expect(projection.assumptions.join(' ')).toContain('requires a terrain choice');
 });
 it('Fiend Luck uses the projected Charisma modifier and has a minimum of one',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'warlock-fiend'});
  expect(projectCharacterLevel('warlock',base,forecast,5).subclassResources.some(x=>x.name.includes('Luck'))).toBe(false);
  expect(projectCharacterLevel('warlock',base,forecast,6).subclassResources.find(x=>x.name.includes('Luck'))?.maximum).toBe(3);
  expect(projectCharacterLevel('warlock',{...base,Cha:8},forecast,6).subclassResources.find(x=>x.name.includes('Luck'))?.maximum).toBe(1);
 });
 it('Fiend resistance remains a rest-dependent choice rather than an invented passive resistance',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'warlock-fiend'});
  const projection=projectCharacterLevel('warlock',base,forecast,10);
  expect(projection.subclassResistances).toEqual([]);
  expect(projection.assumptions.join(' ')).toContain('Fiendish Resilience');
 });
});
