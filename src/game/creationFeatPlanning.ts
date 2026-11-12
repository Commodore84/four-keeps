import {featEligibility,type FutureFeat,type FeatContext} from './creationFutureFeats';
import {projectCharacterLevel} from './creationProjection';
import type {AdvancementForecast} from './creationForecast';
import type {Scores} from './creationAbilities';
/** Prerequisites are checked against the scores immediately before the planned level. */
export function featPlanningIssues(feat:FutureFeat,classId:string,base:Scores,forecast:AdvancementForecast,level:number,context:FeatContext={}):string[]{
 const before=projectCharacterLevel(classId,base,forecast,level-1,context).scores;
 const classContext:FeatContext={classId,spellcasting:['bard','cleric','druid','sorcerer','wizard','paladin','ranger','warlock'].includes(classId)||classId==='rogue'&&forecast.levels.some(p=>p.level===3&&p.subclassId==='rogue-arcane-trickster')||classId==='fighter'&&forecast.levels.some(p=>p.level===3&&p.subclassId==='fighter-eldritch-knight'),heavyArmor:['fighter','paladin'].includes(classId),mediumArmor:['fighter','paladin','ranger','cleric','druid','barbarian'].includes(classId),shield:['fighter','paladin','ranger','cleric','druid','barbarian'].includes(classId),...context};
 return featEligibility(feat,before,classContext);
}
export function featRequirementLabel(feat:FutureFeat):string{
 const requirements=[...Object.entries(feat.minimum??{}).map(([a,n])=>`${a} ${n}+`),...(feat.requirement?[feat.requirement.replaceAll('-',' ')]:[]),...(feat.species?[`Species: ${feat.species.join('/')}`]:[]),...(feat.lineages?[`Lineage: ${feat.lineages.join('/')}`]:[])];
 return requirements.length?requirements.join(' · '):'No additional prerequisites';
}
