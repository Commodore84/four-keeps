import {describe,it,expect} from 'vitest';
import {emptyForecast,extendForecast,updateLevelPlan} from './creationForecast';
import {applyAbilityIncrease,forecastImprovementLevels,projectCharacterLevel} from './creationProjection';
const scores={Str:8,Dex:16,Con:14,Int:10,Wis:12,Cha:16};
describe('rules-driven advancement projections',()=>{
 it('calculates fixed HP, proficiency and spell DCs without modifying level one',()=>{const f=emptyForecast();const first=projectCharacterLevel('warlock',scores,f,1);expect(first.hitPoints).toBe(10);expect(first.proficiencyBonus).toBe(2);expect(first.spellSaveDC).toBe(13);const fifth=projectCharacterLevel('warlock',scores,{...f,targetLevel:5},5);expect(fifth.hitPoints).toBe(38);expect(fifth.proficiencyBonus).toBe(3);expect(fifth.pactSlotLevel).toBe(3);expect(fifth.spellSlots).toEqual([{spellLevel:3,count:2}]);expect(scores.Cha).toBe(16)});
 it('includes fighter and rogue extra ability improvement levels',()=>{expect(forecastImprovementLevels('fighter')).toContain(6);expect(forecastImprovementLevels('rogue')).toContain(10);expect(forecastImprovementLevels('warlock')).not.toContain(6)});
 it('applies provisional ability increases and recalculates spellcasting',()=>{let f=emptyForecast();for(let i=1;i<4;i++)f=extendForecast(f);f=applyAbilityIncrease(f,4,'Cha',1);f=applyAbilityIncrease(f,4,'Cha',1);expect(projectCharacterLevel('warlock',scores,f,4).spellSaveDC).toBe(14);expect(projectCharacterLevel('warlock',scores,f,4).scores.Cha).toBe(18);expect(applyAbilityIncrease(f,4,'Con',1)).toEqual(f)});
 it('tracks the planned subclass without treating it as an applied level-one feature',()=>{const f=updateLevelPlan(emptyForecast(),3,{subclassId:'warlock-archfey'});expect(projectCharacterLevel('warlock',scores,f,2).subclassName).toBeNull();expect(projectCharacterLevel('warlock',scores,f,3).subclassName).toBe('Archfey')});
});
