import {futureFeat,featEligibility} from './creationFutureFeats';
import {mysticArcanumLevel} from './creationProgression';
import {subclassesForClass} from './creationSubclasses';
import {spellcastingAtLevel,classSummary} from './creationClasses';
import {ABILITIES,modifier,type Scores,type Ability} from './creationAbilities';
import {plannedLevel,landTerrainAtLevel,type AdvancementForecast} from './creationForecast';
export interface ProjectedLevel {
 level:number;proficiencyBonus:number;hitPoints:number;hitPointsLabel:string;scores:Scores;modifiers:Scores;
 spellSlots:{spellLevel:number;count:number}[];pactSlotLevel:number|null;spellAttack:number|null;spellSaveDC:number|null;
 subclassName:string|null;criticalHitMinimum:number;unarmoredArmorClass:number|null;subclassBonuses:string[];subclassResistances:string[];subclassConditionImmunities:string[];subclassResources:{name:string;maximum:number;recovery:string}[];improvementLevels:number[];mysticArcanumLevels:number[];assumptions:string[];
}
const THIRD_CASTER_SLOTS:readonly number[][]=[
 [],[],[],[2],[3],[3],[3],[4,2],[4,2],[4,2],[4,3],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1]
];
const fullCasters=new Set(['bard','cleric','druid','sorcerer','wizard']);
const halfCasters=new Set(['paladin','ranger']);
export function forecastImprovementLevels(classId:string):number[]{return classId==='fighter'?[4,6,8,12,14,16]:classId==='rogue'?[4,8,10,12,16]:[4,8,12,16]}
export function projectCharacterLevel(classId:string,baseScores:Scores,forecast:AdvancementForecast,level:number):ProjectedLevel{
 const cls=classSummary(classId);const safeLevel=Math.max(1,Math.min(20,Math.trunc(level)));
 const scores={...baseScores};const assumptions:string[]=[];
 const improvementLevels=forecastImprovementLevels(classId).filter(l=>l<=safeLevel);
 for(const l of improvementLevels){
  const p=plannedLevel(forecast,l);
  if(p.featPlan&&p.featPlan!=='Ability Score Improvement'){const feat=futureFeat(p.featPlan);if(feat&&p.featAbility&&feat.abilities.includes(p.featAbility)&&featEligibility(feat,scores).length===0&&scores[p.featAbility]<20)scores[p.featAbility]++;else assumptions.push('Level '+l+' feat ability increase is not eligible or not selected');continue;}
  if(p.featPlan&&p.featPlan!=='Ability Score Improvement')continue;
  if(p.abilityIncreases){
   const total=ABILITIES.reduce((sum,ability)=>sum+(p.abilityIncreases?.[ability]??0),0);
   if(total>2){assumptions.push('Level '+l+' ability increases exceed the two-point budget; ignored');continue;}
   for(const ability of ABILITIES){const value=p.abilityIncreases[ability]??0;if(Number.isInteger(value)&&value>=0&&value<=2)scores[ability]=Math.min(20,scores[ability]+value)}
  }else assumptions.push('Level '+l+' ability improvement not selected; scores stay unchanged');
 }
 const modifiers=Object.fromEntries(ABILITIES.map(a=>[a,modifier(scores[a])])) as Scores;
 const proficiencyBonus=2+Math.floor((safeLevel-1)/4);
 const conMod=modifier(scores.Con);
 const firstDie=cls?.hitDie??8;
 let hitPoints=firstDie+conMod;
 for(let l=2;l<=safeLevel;l++)hitPoints+=Math.max(1,Math.floor(firstDie/2)+1+conMod);
 hitPoints=Math.max(safeLevel,hitPoints);
 const spellcasting=spellcastingAtLevel(classId,safeLevel);
 const selected=plannedLevel(forecast,3).subclassId;
 const thirdCaster=safeLevel>=3&&((classId==='rogue'&&selected==='rogue-arcane-trickster')||(classId==='fighter'&&selected==='fighter-eldritch-knight'));
 const slots=thirdCaster?THIRD_CASTER_SLOTS[safeLevel]:spellcasting?.slots??[];
 const pactSlotLevel=spellcasting?.kind==='pact'?Math.min(5,Math.ceil(safeLevel/2)):null;
 const spellSlots=slots.map((count,index)=>({spellLevel:pactSlotLevel??index+1,count})).filter(x=>x.count>0);
 const spellAbility=thirdCaster?'Int':spellcasting?.ability;
 const spellAttack=spellAbility?proficiencyBonus+modifier(scores[spellAbility]):null;
 const spellSaveDC=spellAttack===null?null:8+spellAttack;
 const subclassName=safeLevel>=3?subclassesForClass(classId).find(x=>x.id===selected)?.name??null:null;
 const subclassBonuses:string[]=[];
 const subclassResistances:string[]=[];
 const subclassConditionImmunities:string[]=[];
 if(selected==='paladin-devotion'&&safeLevel>=7){
  subclassConditionImmunities.push('Charmed (you and allies within Aura of Protection; aura inactive while Incapacitated)');
 }
 if(selected==='druid-land'&&safeLevel>=10){
  subclassConditionImmunities.push('Poisoned');
  const terrain=landTerrainAtLevel(forecast,safeLevel);
  const resistance=terrain?({arid:'Fire',polar:'Cold',temperate:'Lightning',tropical:'Poison'} as const)[terrain]:undefined;
  if(resistance)subclassResistances.push(resistance+' (Circle of the Land: '+terrain+')');
  else assumptions.push('Circle of the Land resistance requires a terrain choice after a Long Rest');
 }
 if(selected==='warlock-fiend'&&safeLevel>=10)assumptions.push('Fiendish Resilience damage resistance is chosen after each Short or Long Rest; no type is assumed in the forecast');

 const subclassResources:{name:string;maximum:number;recovery:string}[]=[];
 if(safeLevel>=3&&selected==='fighter-battle-master')subclassResources.push({name:'Superiority Dice',maximum:safeLevel>=15?6:safeLevel>=7?5:4,recovery:'Short or Long Rest'});
 if(safeLevel>=3&&selected==='fighter-psi-warrior')subclassResources.push({name:'Psionic Energy Dice',maximum:2*proficiencyBonus,recovery:'Long Rest; one die also restored by a Bonus Action once per Short or Long Rest'});
 if(safeLevel>=3&&selected==='rogue-soulknife')subclassResources.push({name:'Psionic Energy Dice',maximum:2*proficiencyBonus,recovery:'Long Rest; one die also restored by a Bonus Action once per Short or Long Rest'});
 if(safeLevel>=6&&selected==='warlock-fiend')subclassResources.push({name:'Dark One’s Own Luck (d10)',maximum:Math.max(1,modifier(scores.Cha)),recovery:'Long Rest'});
 if(safeLevel>=3&&selected==='warlock-celestial')subclassResources.push({name:'Healing Light dice',maximum:1+safeLevel,recovery:'Long Rest'});
 const criticalHitMinimum=selected==='fighter-champion'&&safeLevel>=15?18:selected==='fighter-champion'&&safeLevel>=3?19:20;
 if(criticalHitMinimum<20)subclassBonuses.push('Weapon and Unarmed Strike critical hits on '+criticalHitMinimum+'–20');
 const unarmoredArmorClass=selected==='sorcerer-draconic-sorcery'&&safeLevel>=3?10+modifier(scores.Dex)+modifier(scores.Cha):null;
 if(unarmoredArmorClass!==null){hitPoints+=safeLevel;subclassBonuses.push('Draconic Resilience: +'+safeLevel+' maximum HP; unarmored AC '+unarmoredArmorClass)}
 assumptions.push('HP assumes fixed average hit-die increases; no rolled HP or additional feat effects');
 if(fullCasters.has(classId)||halfCasters.has(classId)||classId==='warlock')assumptions.push('Spell slots are class-only; no multiclassing, items, or special recovery effects');
 if(thirdCaster)assumptions.push('Subclass spell slots are projected; spell selections, cantrips and casting components remain unimplemented');
 return {level:safeLevel,proficiencyBonus,hitPoints,hitPointsLabel:'Estimated HP',scores,modifiers,spellSlots,pactSlotLevel,spellAttack,spellSaveDC,subclassName,criticalHitMinimum,unarmoredArmorClass,subclassBonuses,subclassResistances,subclassConditionImmunities,subclassResources,improvementLevels,mysticArcanumLevels:classId==='warlock'?mysticArcanumLevel(safeLevel):[],assumptions};
}
export function applyAbilityIncrease(forecast:AdvancementForecast,level:number,ability:Ability,delta:-1|1):AdvancementForecast{
 if(!forecastImprovementLevels('fighter').includes(level))return forecast;
 const p=plannedLevel(forecast,level);const current=p.abilityIncreases??{};const next=Math.max(0,Math.min(2,(current[ability]??0)+delta));
 const increases={...current,[ability]:next};
 if(Object.values(increases).reduce((sum,n)=>sum+n,0)>2)return forecast;
 return {...forecast,levels:[...forecast.levels.filter(x=>x.level!==level),{...p,level,abilityIncreases:increases}].sort((a,b)=>a.level-b.level)};
}
