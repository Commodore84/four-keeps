import {CLASSES} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
export interface LevelPlan {level:number;subclassId?:string;abilityPlan?:string;featPlan?:string;spellPlan?:string;notes?:string}
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
  return {level,plan,features,subclass,subclassChoices:level===3?subclassesForClass(classId):[],abilityImprovement:level===4||level===8||level===12||level===16||level===19};
 });
}
export function validateForecast(classId:string,forecast:AdvancementForecast):string[]{
 if(!Number.isInteger(forecast.targetLevel)||forecast.targetLevel<1||forecast.targetLevel>LEVEL_CAP)return ['Forecast level must be between 1 and 20.'];
 const options=subclassesForClass(classId);
 const subclassId=plannedLevel(forecast,3).subclassId;
 return subclassId&&!options.some(s=>s.id===subclassId)?['Planned subclass does not belong to the current class.']:[];
}
