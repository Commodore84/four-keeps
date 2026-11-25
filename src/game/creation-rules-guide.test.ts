import {describe,it,expect} from 'vitest';
import {SPECIES,BACKGROUNDS} from './creationOrigins';
import {CLASSES,classChoices} from './creationClasses';
import {SPECIES_TRAITS,LINEAGE_DETAILS,ORIGIN_FEATS,CLASS_OVERVIEW,CHOICE_DETAILS,SKILL_DETAILS,choiceExplanation} from './creationRulesGuide';
describe('character creation rules guide coverage',()=>{
 it('explains every 2024 species trait and lineage',()=>{for(const species of SPECIES){for(const trait of species.traits)expect(SPECIES_TRAITS[trait]?.length,trait).toBeGreaterThan(30);for(const lineage of species.lineages??[])expect(LINEAGE_DETAILS[lineage.id]?.length,lineage.id).toBeGreaterThan(70)}});
 it('explains every origin feat and background skill',()=>{for(const bg of BACKGROUNDS){expect(ORIGIN_FEATS[bg.feat]?.length,bg.feat).toBeGreaterThan(80);for(const skill of bg.skills)expect(SKILL_DETAILS[skill]?.length,skill).toBeGreaterThan(25)}});
 it('explains every class and all selectable fighting styles and divine/primal orders',()=>{for(const cls of CLASSES){expect(CLASS_OVERVIEW[cls.id]?.length,cls.name).toBeGreaterThan(110);for(const d of classChoices(cls.id)){if(['fighting-style','divine-order','primal-order'].includes(d.kind))for(const option of d.options)expect(choiceExplanation(option,d.kind).length,option).toBeGreaterThan(40)}}});
 it('explains weapon masteries by their actual property instead of repeating generic instructions',()=>{
  for(const [weapon,property] of [['Dagger','Nick'],['Club','Slow'],['Dart','Vex'],['Light Hammer','Nick'],['Hand Crossbow','Vex']] as const){
   const description=choiceExplanation(weapon,'weapon-mastery');
   expect(description.startsWith(property+' — '),weapon).toBe(true);
   expect(description.length).toBeLessThan(240);
   expect(description).not.toContain('Compare the item');
  }
  for(const cls of CLASSES)for(const choice of classChoices(cls.id)){
   if(choice.kind==='weapon-mastery')for(const weapon of choice.options)expect(choiceExplanation(weapon,'weapon-mastery')).toMatch(/^(Slow|Nick|Vex|Push|Topple|Graze|Cleave|Sap) — /);
  }
 });
 it('includes a selection guide for all weapon mastery effects',()=>{for(const property of ['Slow','Nick','Vex','Push','Topple','Graze','Cleave','Sap'])expect(CHOICE_DETAILS[property]?.length).toBeGreaterThan(35)});
});
