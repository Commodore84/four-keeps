import {ABILITIES,type Scores} from './creationAbilities';
import {futureFeat,eligibleFeatAbility,type FeatContext} from './creationFutureFeats';
import {featPlanningIssues} from './creationFeatPlanning';
import {forecastImprovementLevels,projectCharacterLevel} from './creationProjection';
import {plannedLevel,type AdvancementForecast} from './creationForecast';
/** Forecasts are advice, never an automatic mutation of an imported campaign. */
export function reviewPlannedAdvancement(classId:string,base:Scores,forecast:AdvancementForecast,level:number,context:FeatContext={}){
 const plan=plannedLevel(forecast,level);const issues:string[]=[];
 if(!forecastImprovementLevels(classId).includes(level))return {ready:false,issues:['This level does not grant an ASI or General feat.'],choice:undefined,changes:[] as string[]};
 const before=projectCharacterLevel(classId,base,forecast,level-1,context).scores;
 if(!plan.featPlan)issues.push('Choose an ASI or feat.');
 else if(plan.featPlan==='Ability Score Improvement'){
  const increases=plan.abilityIncreases??{};
  const total=ABILITIES.reduce((sum,a)=>sum+(increases[a]??0),0);
  if(total!==2)issues.push('Assign exactly two ability points.');
  for(const a of ABILITIES){const n=increases[a]??0;if(!Number.isInteger(n)||n<0||n>2||before[a]+n>20)issues.push(`${a} increase exceeds the allowed limit.`)}
 }else{
  const feat=futureFeat(plan.featPlan);
  if(!feat)issues.push('Unknown feat.');
  else{
   issues.push(...featPlanningIssues(feat,classId,base,forecast,level,context));
   if(feat.abilityBonus!==0&&(!plan.featAbility||!eligibleFeatAbility(feat,plan.featAbility,before)))issues.push('Choose an eligible +1 ability.');
   if(feat.source==='2017')issues.push('Legacy feat requires DM approval before applying it.');
  }
 }
 const after=projectCharacterLevel(classId,base,forecast,level,context).scores;
 return {ready:issues.length===0,issues,choice:plan.featPlan,changes:ABILITIES.filter(a=>after[a]!==before[a]).map(a=>`${a} ${before[a]} → ${after[a]}`)};
}
/** Original explanatory summaries, not a substitute for the official feat rules text. */
export const FEAT_BENEFIT_DETAILS:Readonly<Record<string,readonly string[]>>={
 'Elven Accuracy':['Choose Dexterity, Intelligence, Wisdom, or Charisma for +1.','When you have advantage on an eligible attack roll using one of those abilities, reroll one of the dice once.','Requires Elf or Half-Elf heritage under the legacy feat rules; DM approval is needed in a 2024 campaign.'],
 'Fey-Touched':['Increase Intelligence, Wisdom, or Charisma by 1.','Gain Misty Step and one eligible level 1 Divination or Enchantment spell.','Spell use and spellcasting ability follow the feat; the forecast does not choose or grant the spells automatically.'],
 'Shadow-Touched':['Increase Intelligence, Wisdom, or Charisma by 1.','Gain Invisibility and one eligible level 1 Illusion or Necromancy spell.','Spell selection and casting remain future level-up choices.'],
 'Skill Expert':['Increase one ability by 1.','Gain one skill proficiency and expertise in one skill you are proficient in.','The planner tracks the ability increase only; proficiency and expertise choices remain pending.'],
 'Telekinetic':['Increase Intelligence, Wisdom, or Charisma by 1.','Gain or improve Mage Hand and gain a bonus-action telekinetic shove.'],
 'Telepathic':['Increase Intelligence, Wisdom, or Charisma by 1.','Gain limited-range telepathic communication and Detect Thoughts.'],
 'Alert':['Improve initiative and exchange initiative with a willing ally as permitted by the feat.','Origin feat: no ability score increase.'],
 'Skilled':['Gain three skill or tool proficiencies in any combination.','Origin feat: no ability score increase.'],
 'Lucky':['Gain Luck Points usable to influence eligible d20 tests.','Origin feat: no ability score increase.'],
 'Magic Initiate':['Choose a spell list, two cantrips, and one level 1 spell from that list.','Origin feat: no ability score increase; spell selections remain pending.'],
};
export function featBenefitDetails(name:string):readonly string[]{return FEAT_BENEFIT_DETAILS[name]??[futureFeat(name)?.description??'Unknown feat.','Additional benefit selections and rules interactions are resolved when the character levels up.'];}
