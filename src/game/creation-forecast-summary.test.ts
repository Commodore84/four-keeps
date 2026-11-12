import {describe,it,expect} from 'vitest';
import {forecastSummary} from './creationForecastSummary';
import {emptyForecast,updateLevelPlan} from './creationForecast';
const scores={Str:8,Dex:17,Con:14,Int:14,Wis:12,Cha:10};
describe('forecast roadmap',()=>{
 it('includes every rogue ASI and epic boon milestone through 20',()=>{const result=forecastSummary('rogue',scores,emptyForecast());expect(result.map(r=>r.level)).toEqual([4,8,10,12,16,19]);expect(result.at(-1)?.scores).toEqual(scores)});
 it('shows cumulative changes without counting incompatible legacy feats',()=>{let f=emptyForecast();f=updateLevelPlan(f,4,{featPlan:'Elven Accuracy',featAbility:'Dex'});f=updateLevelPlan(f,8,{featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});const ok=forecastSummary('rogue',scores,f,{speciesId:'elf',lineageId:'wood-elf',allowCompatibleLegacy:true});expect(ok[0].changes).toEqual(['Dex 17 → 18']);expect(ok[1].changes).toEqual(['Dex 18 → 20']);expect(ok.at(-1)?.scores.Dex).toBe(20);const invalid=forecastSummary('rogue',scores,f,{speciesId:'dwarf',allowCompatibleLegacy:true});expect(invalid[0].changes).toEqual([]);expect(invalid[1].changes).toEqual(['Dex 17 → 19'])});
});
