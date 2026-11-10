import {describe,it,expect} from 'vitest';
import {projectCharacterLevel} from './creationProjection';
import {emptyForecast,updateLevelPlan} from './creationForecast';
import {subclassFeatureAt} from './creationSubclassFeatures';
const scores={Str:12,Dex:16,Con:14,Int:10,Wis:10,Cha:18};
describe('verified subclass projections',()=>{
 it('applies Champion critical thresholds at 3 and 15 only',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'fighter-champion'});
  expect(projectCharacterLevel('fighter',scores,forecast,2).criticalHitMinimum).toBe(20);
  expect(projectCharacterLevel('fighter',scores,forecast,3).criticalHitMinimum).toBe(19);
  expect(projectCharacterLevel('fighter',scores,forecast,14).criticalHitMinimum).toBe(19);
  expect(projectCharacterLevel('fighter',scores,forecast,15).criticalHitMinimum).toBe(18);
  expect(subclassFeatureAt('fighter-champion',15)?.confidence).toBe('verified-mechanics');
 });
 it('applies Draconic Resilience max HP and unarmored AC without modifying base scores',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'sorcerer-draconic-sorcery'});
  const base=projectCharacterLevel('sorcerer',scores,emptyForecast(),3);
  const projected=projectCharacterLevel('sorcerer',scores,forecast,3);
  expect(projected.hitPoints).toBe(base.hitPoints+3);
  expect(projected.unarmoredArmorClass).toBe(17);
  const higher=projectCharacterLevel('sorcerer',scores,forecast,10);
  expect(higher.hitPoints-projectCharacterLevel('sorcerer',scores,emptyForecast(),10).hitPoints).toBe(10);
  expect(scores.Cha).toBe(18);
 });
 it('does not apply unverified subclass benefits',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'fighter-battle-master'});
  expect(projectCharacterLevel('fighter',scores,forecast,10).subclassBonuses).toEqual([]);
 });
});
