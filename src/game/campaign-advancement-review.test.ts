import {describe,it,expect} from 'vitest';
import {campaignAdvancementReview} from './campaignAdvancementReview';
import {newCampaign} from './campaign';
import {emptyForecast,updateLevelPlan} from './creationForecast';
describe('imported campaign advancement handoff',()=>{
 it('does not silently apply future feat choices or mutate campaign',()=>{const c=newCampaign('Review');const f=updateLevelPlan(emptyForecast(),4,{featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});c.characterBuild={selections:{classId:'rogue',abilities:{base:{Dex:15},bonuses:{Dex:2}}},forecast:f,rules:{allowCompatibleLegacy:false}} as typeof c.characterBuild;c.character={...c.character!,level:3};const original=JSON.stringify(c);const result=campaignAdvancementReview(c);expect(result.available).toBe(true);expect(result.nextLevel).toBe(4);expect(result.plan?.ready).toBe(true);expect(result.requiresConfirmation).toBe(true);expect(JSON.stringify(c)).toBe(original)});
 it('reports missing import rather than inventing a plan',()=>{expect(campaignAdvancementReview(newCampaign('Legacy')).available).toBe(false)});
});
