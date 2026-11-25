import {ABILITIES,type Scores} from './creationAbilities';
import {projectCharacterLevel,forecastImprovementLevels} from './creationProjection';
import {plannedLevel,type AdvancementForecast} from './creationForecast';
import type {FeatContext} from './creationFutureFeats';
export function forecastSummary(classId:string,baseScores:Scores,forecast:AdvancementForecast,context:FeatContext={}){
 const milestones=[...forecastImprovementLevels(classId),19];
 return milestones.map(level=>{
  const plan=plannedLevel(forecast,level);
  const before=projectCharacterLevel(classId,baseScores,forecast,level-1,context).scores;
  const after=projectCharacterLevel(classId,baseScores,forecast,level,context).scores;
  return {level,choice:level===19?plan.epicBoon:plan.featPlan,changes:ABILITIES.filter(a=>after[a]!==before[a]).map(a=>`${a} ${before[a]} → ${after[a]}`),scores:after};
 });
}
