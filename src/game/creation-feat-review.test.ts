import {describe,it,expect} from 'vitest';
import {reviewPlannedAdvancement,featBenefitDetails} from './creationFeatReview';
import {emptyForecast,updateLevelPlan} from './creationForecast';
const scores={Str:8,Dex:17,Con:14,Int:14,Wis:12,Cha:10};
describe('advancement handoff review',()=>{
 it('requires exactly two valid ASI points and respects caps',()=>{let f=updateLevelPlan(emptyForecast(),4,{featPlan:'Ability Score Improvement',abilityIncreases:{Dex:1}});expect(reviewPlannedAdvancement('rogue',scores,f,4).ready).toBe(false);f=updateLevelPlan(f,4,{abilityIncreases:{Dex:2}});expect(reviewPlannedAdvancement('rogue',scores,f,4).ready).toBe(true);expect(reviewPlannedAdvancement('rogue',{...scores,Dex:19},f,4).issues.join(' ')).toContain('limit')});
 it('requires valid feat ability and flags legacy approval',()=>{let f=updateLevelPlan(emptyForecast(),4,{featPlan:'Elven Accuracy',featAbility:'Str'});expect(reviewPlannedAdvancement('rogue',scores,f,4,{speciesId:'elf',allowCompatibleLegacy:true}).issues.join(' ')).toContain('eligible +1 ability');f=updateLevelPlan(f,4,{featAbility:'Dex'});expect(reviewPlannedAdvancement('rogue',scores,f,4,{speciesId:'elf',allowCompatibleLegacy:true}).issues.join(' ')).toContain('DM approval')});
 it('does not treat planned spells or benefit text as granted gameplay features',()=>{expect(featBenefitDetails('Fey-Touched').join(' ')).toContain('Misty Step');expect(reviewPlannedAdvancement('rogue',scores,emptyForecast(),4).ready).toBe(false);expect(reviewPlannedAdvancement('rogue',scores,emptyForecast(),5).ready).toBe(false)});
});
