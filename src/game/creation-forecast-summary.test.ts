import {describe,it,expect} from 'vitest';
import {forecastSummary} from './creationForecastSummary';
import {emptyForecast,updateLevelPlan} from './creationForecast';
const scores={Str:8,Dex:17,Con:14,Int:14,Wis:12,Cha:10};
describe('forecast roadmap',()=>{
 it('includes every rogue ASI and epic boon milestone through 20',()=>{const result=forecastSummary('rogue',scores,emptyForecast());expect(result.map(r=>r.level)).toEqual([4,8,10,12,16,19]);expect(result.at(-1)?.scores).toEqual(scores)});
 it('shows cumulative changes without counting incompatible legacy feats',()=>{let f=emptyForecast();f=updateLevelPlan(f,4,{featPlan:'Elven Accuracy',featAbility:'Dex'});f=updateLevelPlan(f,8,{featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});const ok=forecastSummary('rogue',scores,f,{speciesId:'elf',lineageId:'wood-elf',allowCompatibleLegacy:true});expect(ok[0].changes).toEqual(['Dex 17 → 18']);expect(ok[1].changes).toEqual(['Dex 18 → 20']);expect(ok.at(-1)?.scores.Dex).toBe(20);const invalid=forecastSummary('rogue',scores,f,{speciesId:'dwarf',allowCompatibleLegacy:true});expect(invalid[0].changes).toEqual([]);expect(invalid[1].changes).toEqual(['Dex 17 → 19'])});
});

import {featPlanningIssues,featRequirementLabel} from './creationFeatPlanning';
import {futureFeat} from './creationFutureFeats';
describe('level-aware feat planning',()=>{
 it('checks prerequisites using ability scores from earlier planned levels',()=>{let f=emptyForecast();f=updateLevelPlan(f,4,{featPlan:'Ability Score Improvement',abilityIncreases:{Str:2}});const feat=futureFeat('Great Weapon Master')!;expect(featPlanningIssues(feat,'rogue',{...scores,Str:11},emptyForecast(),8)).toContain('Str 13 required');expect(featPlanningIssues(feat,'rogue',{...scores,Str:11},f,8)).toEqual([])});
 it('distinguishes legacy species and lineage restrictions',()=>{const f=futureFeat('Wood Elf Magic')!;expect(featRequirementLabel(f)).toContain('Lineage: wood-elf');expect(featPlanningIssues(f,'rogue',scores,emptyForecast(),4,{speciesId:'elf',lineageId:'high-elf',allowCompatibleLegacy:true}).join(' ')).toContain('wood-elf')});
 it('labels armor and spellcasting prerequisites',()=>{expect(featRequirementLabel(futureFeat('Elemental Adept')!)).toContain('spellcasting');expect(featPlanningIssues(futureFeat('Elemental Adept')!,'rogue',scores,emptyForecast(),4)).toContain('Spellcasting or Pact Magic feature required')});
});
