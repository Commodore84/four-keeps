import type {Ability} from './creationAbilities';
import {CLASSES} from './creationClasses';
import {SPELLS} from './creationMagic';
import {HIGHER_LEVEL_FORECAST_SPELLS} from './creationHigherSpellCatalog';
import {spellcastingAtLevel} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
export interface LevelPlan {level:number;subclassId?:string;abilityPlan?:string;abilityIncreases?:Partial<Record<Ability,number>>;featPlan?:string;spellPlan?:string;plannedSpellIds?:string[];notes?:string}
export interface AdvancementForecast {targetLevel:number;levels:LevelPlan[]}
export const LEVEL_CAP=20;
export function emptyForecast():AdvancementForecast{return {targetLevel:1,levels:[]}}
export function plannedLevel(forecast:AdvancementForecast,level:number):LevelPlan{return forecast.levels.find(p=>p.level===level)??{level}}
export function updateLevelPlan(forecast:AdvancementForecast,level:number,patch:Partial<LevelPlan>):AdvancementForecast{
 if(!Number.isInteger(level)||level<2||level>LEVEL_CAP)return forecast;
 const existing=plannedLevel(forecast,level);
 const updated={...existing,...patch,level};
 return {...forecast,levels:[...forecast.levels.filter(p=>p.level!==level),updated].sort((a,b)=>a.level-b.level)};
}
export function extendForecast(forecast:AdvancementForecast):AdvancementForecast{return {...forecast,targetLevel:Math.min(LEVEL_CAP,Math.max(1,forecast.targetLevel)+1)}}
export function forecastForClass(classId:string,forecast:AdvancementForecast){
 const cls=CLASSES.find(c=>c.id===classId);
 return Array.from({length:Math.max(0,Math.min(LEVEL_CAP,forecast.targetLevel)-1)},(_,index)=>{
  const level=index+2;
  const plan=plannedLevel(forecast,level);
  const features=cls?.features.find(f=>f.level===level)?.names??[];
  const subclass=level>=3?subclassesForClass(classId).find(s=>s.id===plannedLevel(forecast,3).subclassId):undefined;
  return {level,plan,features,subclass,subclassChoices:level===3?subclassesForClass(classId):[],abilityImprovement:(classId==='fighter'?[4,6,8,12,14,16]:classId==='rogue'?[4,8,10,12,16]:[4,8,12,16]).includes(level)};
 });
}
export function validateForecast(classId:string,forecast:AdvancementForecast):string[]{
 if(!Number.isInteger(forecast.targetLevel)||forecast.targetLevel<1||forecast.targetLevel>LEVEL_CAP)return ['Forecast level must be between 1 and 20.'];
 const options=subclassesForClass(classId);
 const subclassId=plannedLevel(forecast,3).subclassId;
 const errors=subclassId&&!options.some(s=>s.id===subclassId)?['Planned subclass does not belong to the current class.']:[];
 return [...errors,...forecastSpellWarnings(classId,forecast)];
}

/** Curated, incomplete spell catalog. Forecast selections are not prepared spells. */
export function forecastSpellOptions(classId:string,subclassId?:string,level=20){
 const thirdCaster=(classId==='rogue'&&subclassId==='rogue-arcane-trickster')||(classId==='fighter'&&subclassId==='fighter-eldritch-knight');
 const listClass=thirdCaster?'wizard':classId;
 if(thirdCaster&&level<3)return [];
 const casting=thirdCaster?null:spellcastingAtLevel(classId,level);
 if(!thirdCaster&&!casting)return [];
 const thirdCasterSlots=[0,0,0,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4];
 const highest=thirdCaster?thirdCasterSlots[level]:casting?.kind==='pact'?Math.min(5,Math.ceil(level/2)):casting?.slots.reduce((max,count,index)=>count>0?index+1:max,0)??0;
 const arcanum=classId==='warlock'?([11,13,15,17] as const).filter(unlock=>level>=unlock).map((_,index)=>index+6):[];
 return [...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS].filter(spell=>spell.classes.includes(listClass)&&(spell.level===0||spell.level<=highest||arcanum.includes(spell.level))).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
}
export function toggleForecastSpell(forecast:AdvancementForecast,classId:string,level:number,spellId:string):AdvancementForecast{
 if(!Number.isInteger(level)||level<2||level>LEVEL_CAP)return forecast;
 const subclassId=plannedLevel(forecast,3).subclassId;
 const eligible=forecastSpellOptions(classId,subclassId,level).find(spell=>spell.id===spellId);
 if(!eligible)return forecast;
 const plan=plannedLevel(forecast,level);
 const previous=plan.plannedSpellIds??[];
 const plannedSpellIds=previous.includes(spellId)?previous.filter(id=>id!==spellId):[...previous,spellId];
 return updateLevelPlan(forecast,level,{plannedSpellIds});
}
export function forecastSpellWarnings(classId:string,forecast:AdvancementForecast):string[]{
 const warnings:string[]=[];
 const subclassId=plannedLevel(forecast,3).subclassId;
 const seen=new Set<string>();
 for(const plan of [...forecast.levels].sort((a,b)=>a.level-b.level)){
  for(const id of plan.plannedSpellIds??[]){
   if(!forecastSpellOptions(classId,subclassId,plan.level).some(spell=>spell.id===id))warnings.push('Level '+plan.level+': spell '+id+' is not eligible for the selected class, subclass, or level.');
   if(seen.has(id))warnings.push('Level '+plan.level+': spell '+id+' was already selected at an earlier level.');
   seen.add(id);
  }
 }
 return warnings;
}
