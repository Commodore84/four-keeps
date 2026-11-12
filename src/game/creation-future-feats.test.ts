import {describe,it,expect} from 'vitest';
import {projectCharacterLevel} from './creationProjection';
import {emptyForecast,updateLevelPlan} from './creationForecast';
import {featEligibility,futureFeat} from './creationFutureFeats';
const scores={Str:8,Dex:17,Con:14,Int:14,Wis:12,Cha:10};
describe('future feat projections',()=>{
 it('applies eligible feat increases cumulatively',()=>{const forecast=updateLevelPlan(emptyForecast(),4,{featPlan:'Skill Expert',featAbility:'Int'});expect(projectCharacterLevel('rogue',scores,forecast,8).scores.Int).toBe(15)});
 it('does not apply unselected or invalid feat bonuses',()=>{const forecast=updateLevelPlan(emptyForecast(),4,{featPlan:'Skill Expert',featAbility:'Str'});expect(projectCharacterLevel('rogue',scores,forecast,8).scores.Str).toBe(9);expect(projectCharacterLevel('rogue',scores,updateLevelPlan(forecast,4,{featAbility:undefined}),8).scores.Str).toBe(8)});
 it('checks numeric prerequisites',()=>{expect(featEligibility(futureFeat('Defensive Duelist')!,{...scores,Dex:12})).toContain('Dex 13 required')});
 it('preserves fighter and rogue additional ASI levels',()=>{expect(projectCharacterLevel('fighter',scores,emptyForecast(),20).improvementLevels).toContain(14);expect(projectCharacterLevel('rogue',scores,emptyForecast(),20).improvementLevels).toContain(10)});
});
