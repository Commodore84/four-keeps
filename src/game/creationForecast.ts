import type {Ability} from './creationAbilities';
import {CLASSES} from './creationClasses';
import {SPELLS} from './creationMagic';
import {HIGHER_LEVEL_FORECAST_SPELLS} from './creationHigherSpellCatalog';
import {spellcastingAtLevel} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
export interface LevelPlan {level:number;subclassId?:string;abilityPlan?:string;abilityIncreases?:Partial<Record<Ability,number>>;featPlan?:string;spellPlan?:string;plannedSpellIds?:string[];replacementSpellId?:string;replacementWithSpellId?:string;notes?:string}
export interface AdvancementForecast {targetLevel:number;levels:LevelPlan[]}
export type SpellAcquisitionMode='spellbook'|'prepared'|'pact-prepared'|'subclass';
export interface ForecastSpellPolicy {mode:SpellAcquisitionMode;canReplaceOnLevelUp:boolean;replacementLimit:number;replacementTiming:'level-up'|'long-rest'|'none';description:string}
const PREPARATION_POLICIES:Record<string,ForecastSpellPolicy>={
 wizard:{mode:'spellbook',canReplaceOnLevelUp:false,replacementLimit:0,replacementTiming:'long-rest',description:'Two Wizard spells are added to your spellbook on each Wizard level. Preparing spells and copying spells are separate choices.'},
 bard:{mode:'prepared',canReplaceOnLevelUp:true,replacementLimit:1,replacementTiming:'level-up',description:'Bard prepared-spell progression is separate from a once-per-level replacement of one Bard spell.'},
 sorcerer:{mode:'prepared',canReplaceOnLevelUp:true,replacementLimit:1,replacementTiming:'level-up',description:'Sorcerer prepared-spell progression is separate from a once-per-level replacement of one Sorcerer spell.'},
 cleric:{mode:'prepared',canReplaceOnLevelUp:true,replacementLimit:20,replacementTiming:'long-rest',description:'Clerics can replace any number of prepared Cleric spells after a Long Rest; level-up selections are not a permanent learned-spell list.'},
 druid:{mode:'prepared',canReplaceOnLevelUp:true,replacementLimit:20,replacementTiming:'long-rest',description:'Druids can replace any number of prepared Druid spells after a Long Rest; level-up selections are not a permanent learned-spell list.'},
 paladin:{mode:'prepared',canReplaceOnLevelUp:true,replacementLimit:1,replacementTiming:'long-rest',description:'Paladins can replace one prepared Paladin spell after a Long Rest; level-up selections are not a permanent learned-spell list.'},
 ranger:{mode:'prepared',canReplaceOnLevelUp:true,replacementLimit:1,replacementTiming:'long-rest',description:'Rangers can replace one prepared Ranger spell after a Long Rest; level-up selections are not a permanent learned-spell list.'},
 warlock:{mode:'pact-prepared',canReplaceOnLevelUp:true,replacementLimit:1,replacementTiming:'level-up',description:'Warlock Pact Magic prepared spells, spell replacement, and Mystic Arcanum choices are distinct.'}
};
export function forecastSpellPolicy(classId:string):ForecastSpellPolicy|null{return PREPARATION_POLICIES[classId]??null;}
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
 return [...errors,...forecastSpellWarnings(classId,forecast),...forecastReplacementWarnings(classId,forecast)];
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
 if(!(plannedLevel(forecast,level).plannedSpellIds??[]).includes(spellId)&&forecast.levels.some(plan=>plan.level!==level&&(plan.plannedSpellIds??[]).includes(spellId)))return forecast;
 if(!(plannedLevel(forecast,level).plannedSpellIds??[]).includes(spellId)&&forecastSpellSelectionWarnings(classId,forecast,level,spellId).length)return forecast;
 const plan=plannedLevel(forecast,level);
 const previous=plan.plannedSpellIds??[];
 const plannedSpellIds=previous.includes(spellId)?previous.filter(id=>id!==spellId):[...previous,spellId];
 return updateLevelPlan(forecast,level,{plannedSpellIds});
}
/** Limits are applied only where the existing rules data establishes a reliable cap.
 * The curated catalog does not yet encode per-class prepared-spell advancement,
 * so applying an invented universal one-spell-per-level cap would be incorrect. */
export function forecastSpellSelectionWarnings(classId:string,forecast:AdvancementForecast,level:number,spellId:string):string[]{
 const spell=forecastSpellOptions(classId,plannedLevel(forecast,3).subclassId,level).find(item=>item.id===spellId);
 if(!spell)return ['Level '+level+': spell is not eligible.'];
 const previous=plannedLevel(forecast,level).plannedSpellIds??[];
 if(previous.includes(spellId))return [];
 const selected=previous.map(id=>[...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS].find(item=>item.id===id)).filter((item):item is NonNullable<typeof item>=>Boolean(item));
 if(classId==='warlock'&&spell.level>=6&&selected.some(item=>item.level===spell.level))return ['Level '+level+': only one Mystic Arcanum spell of level '+spell.level+' may be selected.'];
 if(classId==='wizard'&&spell.level>0&&selected.filter(item=>item.level>0).length>=2)return ['Level '+level+': Wizards add two spells to their spellbook on gaining a Wizard level.'];
 const current=spellcastingAtLevel(classId,level);
 const prior=spellcastingAtLevel(classId,level-1);
 if(spell.level===0&&current?.cantrips!==null&&current?.cantrips!==undefined){
  const gained=Math.max(0,current.cantrips-(prior?.cantrips??0));
  if(selected.filter(item=>item.level===0).length>=gained)return ['Level '+level+': no additional class cantrip choices are available at this level.'];
 }
 return [];
}
export function forecastSpellWarnings(classId:string,forecast:AdvancementForecast):string[]{
 const warnings:string[]=[];
 const subclassId=plannedLevel(forecast,3).subclassId;
 const seen=new Set<string>();
 for(const plan of [...forecast.levels].sort((a,b)=>a.level-b.level)){
  for(const id of plan.plannedSpellIds??[]){
   if(!forecastSpellOptions(classId,subclassId,plan.level).some(spell=>spell.id===id))warnings.push('Level '+plan.level+': spell '+id+' is not eligible for the selected class, subclass, or level.');
   if(seen.has(id))warnings.push('Level '+plan.level+': spell '+id+' was already selected at an earlier level.');
   warnings.push(...forecastSpellSelectionWarnings(classId,{...forecast,levels:forecast.levels.map(p=>p.level===plan.level?{...p,plannedSpellIds:(p.plannedSpellIds??[]).filter(x=>x!==id)}:p)},plan.level,id));
   seen.add(id);
  }
 }
 return warnings;
}

/** Replacement intent is recorded independently; it never mutates prepared spells. */
export function forecastReplacementWarnings(classId:string,forecast:AdvancementForecast):string[]{
 const policy=forecastSpellPolicy(classId);
 const warnings:string[]=[];
 for(const plan of forecast.levels){
  const from=plan.replacementSpellId,to=plan.replacementWithSpellId;
  if(!from&&!to)continue;
  if(!policy){warnings.push('Level '+plan.level+': this class has no supported forecast spell-replacement operation.');continue;}
  if(!from||!to){warnings.push('Level '+plan.level+': choose both the spell to replace and its replacement.');continue;}
  if(from===to){warnings.push('Level '+plan.level+': replacement must be a different spell.');continue;}
  const subclassId=plannedLevel(forecast,3).subclassId;
  const options=forecastSpellOptions(classId,subclassId,plan.level);
  if(!options.some(spell=>spell.id===to&&spell.level>0))warnings.push('Level '+plan.level+': replacement spell is not eligible for this class and level.');
  if(![...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS].some(spell=>spell.id===from))warnings.push('Level '+plan.level+': original spell is not in the curated catalog.');
  if(!forecast.levels.some(p=>p.level<plan.level&&(p.plannedSpellIds??[]).includes(from)))warnings.push('Level '+plan.level+': original spell is not established by an earlier forecast choice; level-one prepared spells are not yet linked.');
 }
 return warnings;
}
