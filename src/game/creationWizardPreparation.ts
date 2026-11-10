import {preparedSpellsAtLevel} from './creationClasses';
import {SPELLS} from './creationMagic';
import {HIGHER_LEVEL_FORECAST_SPELLS} from './creationHigherSpellCatalog';
import type {AdvancementForecast} from './creationForecast';

const catalog=[...SPELLS,...HIGHER_LEVEL_FORECAST_SPELLS];
export function wizardSpellbookAtLevel(initialSpellbook:readonly string[],forecast:AdvancementForecast,level:number):string[]{
 const ids=[...initialSpellbook];
 for(const plan of [...forecast.levels].sort((a,b)=>a.level-b.level)){
  if(plan.level>level)break;
  for(const id of plan.plannedSpellIds??[]){
   const spell=catalog.find(s=>s.id===id);
   if(spell?.classes.includes('wizard')&&spell.level>0&&!ids.includes(id))ids.push(id);
  }
 }
 return ids;
}
export function wizardPreparationWarnings(spellbook:readonly string[],prepared:readonly string[],level:number):string[]{
 const warnings:string[]=[];
 const cap=preparedSpellsAtLevel('wizard',level);
 if(cap===null)return ['Wizard level must be between 1 and 20.'];
 if(new Set(prepared).size!==prepared.length)warnings.push('Prepared Wizard spells must be unique.');
 if(prepared.length>cap)warnings.push('Wizard can prepare at most '+cap+' spells at level '+level+'.');
 for(const id of prepared){
  const spell=catalog.find(s=>s.id===id);
  if(!spell||spell.level===0||!spell.classes.includes('wizard')||!spellbook.includes(id))warnings.push('Prepared spell '+id+' must be a leveled Wizard spell in the spellbook.');
 }
 return warnings;
}
export function changeWizardPreparation(spellbook:readonly string[],prepared:readonly string[],removeId:string,addId:string,level:number):string[]{
 const next=prepared.filter(id=>id!==removeId);
 if(!next.includes(addId))next.push(addId);
 return wizardPreparationWarnings(spellbook,next,level).length?[...prepared]:next;
}
