import {spellcastingAtLevel,classSummary} from './creationClasses';
import {ABILITIES,modifier,type Scores,type Ability} from './creationAbilities';
import {plannedLevel,type AdvancementForecast} from './creationForecast';
export interface ProjectedLevel {
 level:number;proficiencyBonus:number;hitPoints:number;hitPointsLabel:string;scores:Scores;modifiers:Scores;
 spellSlots:{spellLevel:number;count:number}[];pactSlotLevel:number|null;spellAttack:number|null;spellSaveDC:number|null;
 subclassName:string|null;improvementLevels:number[];assumptions:string[];
}
const fullCasters=new Set(['bard','cleric','druid','sorcerer','wizard']);
const halfCasters=new Set(['paladin','ranger']);
export function forecastImprovementLevels(classId:string):number[]{return classId==='fighter'?[4,6,8,12,14,16,19]:classId==='rogue'?[4,8,10,12,16,19]:[4,8,12,16,19]}
export function projectCharacterLevel(classId:string,baseScores:Scores,forecast:AdvancementForecast,level:number):ProjectedLevel{
 const cls=classSummary(classId);const safeLevel=Math.max(1,Math.min(20,Math.trunc(level)));
 const scores={...baseScores};const assumptions:string[]=[];
 const improvementLevels=forecastImprovementLevels(classId).filter(l=>l<=safeLevel);
 for(const l of improvementLevels){
  const p=plannedLevel(forecast,l);
  if(p.abilityIncreases){
   for(const ability of ABILITIES){const value=p.abilityIncreases[ability]??0;if(Number.isInteger(value)&&value>=0&&value<=2)scores[ability]=Math.min(20,scores[ability]+value)}
  }else assumptions.push('Level '+l+' ability improvement not selected; scores stay unchanged');
 }
 const modifiers=Object.fromEntries(ABILITIES.map(a=>[a,modifier(scores[a])])) as Scores;
 const proficiencyBonus=2+Math.floor((safeLevel-1)/4);
 const conMod=modifier(scores.Con);
 const firstDie=cls?.hitDie??8;
 let hitPoints=firstDie+modifier(baseScores.Con);
 for(let l=2;l<=safeLevel;l++){
  const previousCon=modifier(baseScores.Con)+0;
  hitPoints+=Math.floor(firstDie/2)+1+previousCon;
 }
 hitPoints+=safeLevel*(conMod-modifier(baseScores.Con));
 hitPoints=Math.max(safeLevel,hitPoints);
 const spellcasting=spellcastingAtLevel(classId,safeLevel);
 const slots=spellcasting?.slots??[];
 const pactSlotLevel=spellcasting?.kind==='pact'?Math.min(5,Math.ceil(safeLevel/2)):null;
 const spellSlots=slots.map((count,index)=>({spellLevel:pactSlotLevel??index+1,count})).filter(x=>x.count>0);
 const spellAbility=spellcasting?.ability;
 const spellAttack=spellAbility?proficiencyBonus+modifier(scores[spellAbility]):null;
 const spellSaveDC=spellAttack===null?null:8+spellAttack;
 const selected=plannedLevel(forecast,3).subclassId;
 const subclassName=safeLevel>=3&&selected?selected.split('-').slice(1).map(x=>x[0].toUpperCase()+x.slice(1)).join(' '):null;
 assumptions.push('HP assumes fixed average hit-die increases; no rolled HP or additional feat effects');
 if(fullCasters.has(classId)||halfCasters.has(classId)||classId==='warlock')assumptions.push('Spell slots are class-only; no multiclassing, items, or special recovery effects');
 if(classId==='rogue'||classId==='fighter')assumptions.push('Subclass spellcasting is not yet included in the projection');
 return {level:safeLevel,proficiencyBonus,hitPoints,hitPointsLabel:'Estimated HP',scores,modifiers,spellSlots,pactSlotLevel,spellAttack,spellSaveDC,subclassName,improvementLevels,assumptions};
}
export function applyAbilityIncrease(forecast:AdvancementForecast,level:number,ability:Ability,delta:-1|1):AdvancementForecast{
 if(!forecastImprovementLevels('fighter').includes(level))return forecast;
 const p=plannedLevel(forecast,level);const current=p.abilityIncreases??{};const next=Math.max(0,Math.min(2,(current[ability]??0)+delta));
 const increases={...current,[ability]:next};
 if(Object.values(increases).reduce((sum,n)=>sum+n,0)>2)return forecast;
 return {...forecast,levels:[...forecast.levels.filter(x=>x.level!==level),{...p,level,abilityIncreases:increases}].sort((a,b)=>a.level-b.level)};
}
