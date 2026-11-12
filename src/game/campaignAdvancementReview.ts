import {emptyForecast} from './creationForecast';
import type {Campaign} from './campaign';
import {reviewPlannedAdvancement} from './creationFeatReview';
import {totalScores} from './creationAbilities';
/** Read-only handoff: forecast is not authority to mutate an active campaign. */
export function campaignAdvancementReview(campaign:Campaign){
 const draft=campaign.characterBuild;
 if(!draft||!campaign.character)return {available:false,reason:'No imported character build is attached.'};
 const classId=draft.selections.classId;
 if(!classId)return {available:false,reason:'Imported character class is missing.'};
 const nextLevel=(campaign.character.level??1)+1;
 if(nextLevel>20)return {available:false,reason:'Maximum level reached.'};
 const plan=reviewPlannedAdvancement(classId,totalScores(draft.selections.abilities!),draft.forecast??emptyForecast(),nextLevel,{speciesId:draft.selections.speciesId,lineageId:draft.selections.lineageId,allowCompatibleLegacy:draft.rules.allowCompatibleLegacy});
 return {available:true,nextLevel,plan,requiresConfirmation:true,reason:'Forecast is advisory; confirm all choices against the live character before applying a level-up.'};
}
