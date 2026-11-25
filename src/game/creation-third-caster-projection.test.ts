import {describe,it,expect} from 'vitest';
import {projectCharacterLevel} from './creationProjection';
import {emptyForecast,forecastForClass,updateLevelPlan} from './creationForecast';
const scores={Str:10,Dex:16,Con:14,Int:16,Wis:12,Cha:8};
describe('third-caster progression and ASI schedules',()=>{
 it.each([['rogue','rogue-arcane-trickster'],['fighter','fighter-eldritch-knight']])('%s gains subclass spellcasting from level 3', (cls,id)=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:id});
  expect(projectCharacterLevel(cls,scores,forecast,2).spellSlots).toEqual([]);
  expect(projectCharacterLevel(cls,scores,forecast,3).spellSlots).toEqual([{spellLevel:1,count:2}]);
  expect(projectCharacterLevel(cls,scores,forecast,7).spellSlots).toEqual([{spellLevel:1,count:4},{spellLevel:2,count:2}]);
  expect(projectCharacterLevel(cls,scores,forecast,19).spellSlots).toEqual([{spellLevel:1,count:4},{spellLevel:2,count:3},{spellLevel:3,count:3},{spellLevel:4,count:1}]);
  expect(projectCharacterLevel(cls,scores,forecast,3).spellSaveDC).toBe(13);
 });
 it('does not grant subclass spells to noncasters',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'rogue-thief'});
  expect(projectCharacterLevel('rogue',scores,forecast,20).spellSlots).toEqual([]);
 });
 it('offers Fighter and Rogue bonus ASIs but not a level 19 ordinary ASI',()=>{
  const forecast={...emptyForecast(),targetLevel:20};
  const levels=(cls:string)=>forecastForClass(cls,forecast).filter(x=>x.abilityImprovement).map(x=>x.level);
  expect(levels('fighter')).toEqual([4,6,8,12,14,16]);
  expect(levels('rogue')).toEqual([4,8,10,12,16]);
  expect(levels('wizard')).toEqual([4,8,12,16]);
 });
});
