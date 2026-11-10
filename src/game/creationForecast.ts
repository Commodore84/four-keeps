import type {Ability} from './creationAbilities';
import {CLASSES} from './creationClasses';
import {SPELLS} from './creationMagic';
import {HIGHER_LEVEL_FORECAST_SPELLS} from './creationHigherSpellCatalog';
import {spellcastingAtLevel,preparedSpellsAtLevel} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
import {alwaysPreparedSubclassSpells} from './creationSubclassSpells';
export interface LevelPlan {level:number;subclassId?:string;abilityPlan?:string;abilityIncreases?:Partial<Record<Ability,number>>;featPlan?:string;spellPlan?:string;plannedSpellIds?:string[];wizardPreparedSpellIds?:string[];arcanumReplacementFromId?:string;arcanumReplacementToId?:string;replacementSpellId?:string;replacementWithSpellId?:string;notes?:string}
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
/** Optional Wizard preparation snapshot; spellbook ownership is unchanged. */
export function setWizardPreparedSpells(forecast:AdvancementForecast,level:number,spellIds:readonly string[]):AdvancementForecast{
 if(!Number.isInteger(level)||level<2||level>LEVEL_CAP)return forecast;
 return updateLevelPlan(forecast,level,{wizardPreparedSpellIds:[...new Set(spellIds)]});
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
export function validateForecast(classId:string,forecast:AdvancementForecast,initialPreparedSpellIds:readonly string[]=[]):string[]{
 if(!Number.isInteger(forecast.targetLevel)||forecast.targetLevel<1||forecast.targetLevel>LEVEL_CAP)return ['Forecast level must be between 1 and 20.'];
 const options=subclassesForClass(classId);
 const subclassId=plannedLevel(forecast,3).subclassId;
 const errors=subclassId&&!options.some(s=>s.id===subclassId)?['Planned subclass does not belong to the current class.']:[];
 return [...errors,...forecastSpellWarnings(classId,forecast),...forecastReplacementWarnings(classId,forecast,initialPreparedSpellIds)];
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
 * Prepared-spell growth, spellbook additions, and Mystic Arcanum are separate. */
export function forecastSpellSelectionWarnings(classId:string,forecast:AdvancementForecast,level:number,spellId:string):string[]{
 const spell=forecastSpellOptions(classId,plannedLevel(forecast,3).subclassId,level).find(item=>item.id===spellId);
 if(!spell)return ['Level '+level+': spell is not eligible.'];
 if(alwaysPreparedSubclassSpells(plannedLevel(forecast,3).subclassId,level).includes(spell.name))return ['Level '+level+': this spell is already always prepared by the subclass and does not consume a class preparation choice.'];
 const previous=plannedLevel(forecast,level).plannedSpellIds??[];
 if(previous.includes(spellId))return [];
 const selected=previous.map(id=>[...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS].find(item=>item.id===id)).filter((item):item is NonNullable<typeof item>=>Boolean(item));
 if(classId==='warlock'&&spell.level>=6&&level!==({6:11,7:13,8:15,9:17} as Record<number,number>)[spell.level])return ['Level '+level+': Mystic Arcanum of spell level '+spell.level+' unlocks at its corresponding Warlock level.'];
 if(classId==='warlock'&&spell.level>=6&&forecast.levels.some(plan=>plan.level!==level&&(plan.plannedSpellIds??[]).some(id=>[...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS].some(item=>item.id===id&&item.level===spell.level))))return ['Level '+level+': a Mystic Arcanum spell of level '+spell.level+' is already planned at another level.'];
 if(classId==='warlock'&&spell.level>=6&&selected.some(item=>item.level===spell.level))return ['Level '+level+': only one Mystic Arcanum spell of level '+spell.level+' may be selected.'];
 if(preparedSpellsAtLevel(classId,level)!==null&&classId!=='wizard'&&spell.level>0&&spell.level<=5){
  const cap=Math.max(0,(preparedSpellsAtLevel(classId,level)??0)-(preparedSpellsAtLevel(classId,level-1)??0));
  if(selected.filter(item=>item.level>0&&item.level<=5).length>=cap)return ['Level '+level+': no additional prepared-spell choices are gained at this level (limit '+cap+').'];
 }
 if(classId==='wizard'&&spell.level>0&&selected.filter(item=>item.level>0).length>=2)return ['Level '+level+': Wizards add two spells to their spellbook on gaining a Wizard level.'];
 const current=spellcastingAtLevel(classId,level);
 const prior=spellcastingAtLevel(classId,level-1);
 if(spell.level===0&&current?.cantrips!==null&&current?.cantrips!==undefined){
  const gained=Math.max(0,current.cantrips-(prior?.cantrips??0));
  if(selected.filter(item=>item.level===0).length>=gained)return ['Level '+level+': no additional class cantrip choices are available at this level.'];
 }
 return [];
}
/** Active Mystic Arcanum spells at a forecast level, after earlier replacements. */
export function activeMysticArcanumAtLevel(forecast:AdvancementForecast,level:number):string[]{
 const spells=[...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS];
 const active=new Map<number,string>();
 for(const plan of [...forecast.levels].filter(p=>p.level<=level).sort((a,b)=>a.level-b.level)){
  for(const id of plan.plannedSpellIds??[]){
   const spell=spells.find(item=>item.id===id);
   if(spell&&spell.level>=6&&spell.level<=9&&[11,13,15,17][spell.level-6]===plan.level)active.set(spell.level,id);
  }
  const from=plan.arcanumReplacementFromId,to=plan.arcanumReplacementToId;
  if(!from||!to)continue;
  const oldSpell=spells.find(item=>item.id===from);
  const newSpell=spells.find(item=>item.id===to);
  if(oldSpell&&newSpell&&oldSpell.level===newSpell.level&&oldSpell.level>=6&&oldSpell.level<=9&&newSpell.classes.includes('warlock')&&from!==to&&active.get(oldSpell.level)===from)active.set(oldSpell.level,to);
 }
 return [...active.values()];
}
/** Mystic Arcanum replacements are separate from the one-time tier unlock. */
export function forecastArcanumReplacementWarnings(forecast:AdvancementForecast):string[]{
 const warnings:string[]=[];
 const spells=[...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS];
 const active=new Map<number,string>();
 for(const plan of [...forecast.levels].sort((a,b)=>a.level-b.level)){
  for(const id of plan.plannedSpellIds??[]){
   const spell=spells.find(item=>item.id===id);
   if(spell&&spell.level>=6&&spell.level<=9&&[11,13,15,17][spell.level-6]===plan.level)active.set(spell.level,id);
  }
  const from=plan.arcanumReplacementFromId,to=plan.arcanumReplacementToId;
  if(!from&&!to)continue;
  if(!from||!to){warnings.push('Level '+plan.level+': choose both Mystic Arcanum replacement spells.');continue;}
  const oldSpell=spells.find(item=>item.id===from);
  const newSpell=spells.find(item=>item.id===to);
  if(!oldSpell||!newSpell||oldSpell.level<6||oldSpell.level>9||oldSpell.level!==newSpell.level||!newSpell.classes.includes('warlock')){
   warnings.push('Level '+plan.level+': Mystic Arcanum replacement must be a Warlock spell of the same spell level.');continue;
  }
  if(from===to){warnings.push('Level '+plan.level+': Mystic Arcanum replacement must change the spell.');continue;}
  if(active.get(oldSpell.level)!==from){warnings.push('Level '+plan.level+': the replaced Mystic Arcanum is not currently active.');continue;}
  if(plan.level<([11,13,15,17][oldSpell.level-6])){warnings.push('Level '+plan.level+': Mystic Arcanum tier is not yet unlocked.');continue;}
  active.set(oldSpell.level,to);
 }
 return warnings;
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
export function forecastReplacementWarnings(classId:string,forecast:AdvancementForecast,initialPreparedSpellIds:readonly string[]=[]):string[]{
 if(classId==='warlock')return [...forecastArcanumReplacementWarnings(forecast),...forecastOrdinaryReplacementWarnings(classId,forecast,initialPreparedSpellIds)];
 return forecastOrdinaryReplacementWarnings(classId,forecast,initialPreparedSpellIds);
}
function forecastOrdinaryReplacementWarnings(classId:string,forecast:AdvancementForecast,initialPreparedSpellIds:readonly string[]=[]):string[]{
 const policy=forecastSpellPolicy(classId);
 const warnings:string[]=[];
 for(const plan of [...forecast.levels].sort((a,b)=>a.level-b.level)){
  const from=plan.replacementSpellId,to=plan.replacementWithSpellId;
  if(!from&&!to)continue;
  if(!policy||classId==='wizard'){warnings.push('Level '+plan.level+': Wizard spellbook preparation changes are handled after a Long Rest, not by this level-up replacement planner.');continue;}
  if(!from||!to){warnings.push('Level '+plan.level+': choose both the spell to replace and its replacement.');continue;}
  if(from===to){warnings.push('Level '+plan.level+': replacement must be a different spell.');continue;}
  const subclassId=plannedLevel(forecast,3).subclassId;
  const options=forecastSpellOptions(classId,subclassId,plan.level);
  if(alwaysPreparedSubclassSpells(subclassId,plan.level).some(name=>options.some(spell=>spell.id===to&&spell.name===name)))warnings.push('Level '+plan.level+': the replacement is already always prepared by the subclass.');
  if(!options.some(spell=>spell.id===to&&spell.level>0))warnings.push('Level '+plan.level+': replacement spell is not eligible for this class and level.');
  if(![...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS].some(spell=>spell.id===from))warnings.push('Level '+plan.level+': original spell is not in the curated catalog.');
  const owned=new Set(initialPreparedSpellIds);
  for(const prior of [...forecast.levels].filter(p=>p.level<plan.level).sort((a,b)=>a.level-b.level)){
   for(const id of prior.plannedSpellIds??[])owned.add(id);
   if(prior.replacementSpellId&&prior.replacementWithSpellId&&owned.has(prior.replacementSpellId)){owned.delete(prior.replacementSpellId);owned.add(prior.replacementWithSpellId);}
  }
  if(!owned.has(from))warnings.push('Level '+plan.level+': original spell is not in the level-one prepared spells or earlier active forecast selections.');
  if(owned.has(to))warnings.push('Level '+plan.level+': replacement spell is already among the active prepared spells.');
  if(alwaysPreparedSubclassSpells(subclassId,plan.level).some(name=>[...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS].some(spell=>spell.id===from&&spell.name===name)))warnings.push('Level '+plan.level+': an always-prepared subclass spell cannot be replaced.');
 }
 return warnings;
}
