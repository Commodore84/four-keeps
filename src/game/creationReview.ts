import type {CharacterDraft} from '../app/CharacterCreator';
import {validateOrigins,resolveBackground,originBenefits,validateSkillReplacements,effectiveBackgroundSkills,validateToolReplacement} from './creationOrigins';
import {validateClassAgainstBackground,classSummary} from './creationClasses';
import {emptyAbilityDraft,totalScores,validateAbilityDraft,modifier,ABILITIES} from './creationAbilities';
import {emptyEquipment,equipmentErrors,armorClass,remainingCp,inventory,ITEM_BY_ID} from './creationEquipment';
import {emptyMagic,validateMagic,spellStats,SPELL_BY_ID,emptyOriginMagic,validateOriginMagic,innateOriginSpells} from './creationMagic';
export function reviewErrors(d:CharacterDraft):string[]{
 const s=d.selections;
 const background=resolveBackground(s,d.rules.allowCompatibleLegacy);
 const abilities=s.abilities??emptyAbilityDraft();
 return [...(d.identity.name.trim()?[]:['Character name is required.']),...validateOrigins(s,d.rules.allowCompatibleLegacy),
 ...validateClassAgainstBackground(s.classId,s.classChoices??{},[]),
 ...validateSkillReplacements(s.classChoices?.['class-skills']??[],background?.skills??[],s.skillReplacements),
 ...validateToolReplacement(classSummary(s.classId??'')?.tools??[],background?.tool??'',s.toolReplacement),
 ...validateAbilityDraft(abilities,background?.abilities??[]),
 ...equipmentErrors(s.equipment??emptyEquipment(),s.classId??'',s.backgroundId??'',totalScores(abilities)),
 ...validateMagic(s.classId??'',s.magic??emptyMagic()),...validateOriginMagic(s.backgroundId??'',s.originMagic??emptyOriginMagic(),s.customBackground?.feat)];
}
export function reviewCharacter(d:CharacterDraft){
 const s=d.selections,cls=classSummary(s.classId??''),scores=totalScores(s.abilities??emptyAbilityDraft());
 const eq=s.equipment??emptyEquipment(),magic=s.magic??emptyMagic();
 const origins=originBenefits(s,d.rules.allowCompatibleLegacy);
 return {name:d.identity.name,origins,className:cls?.name??null,level:1,
  scores:ABILITIES.map(ability=>({ability,score:scores[ability],modifier:modifier(scores[ability])})),
  hitPoints:cls?cls.hitDie+modifier(scores.Con):null,armorClass:armorClass(eq,s.classId??'',s.backgroundId??'',scores),
  proficiencyBonus:2,initiative:modifier(scores.Dex),
  skills:[...new Set([...effectiveBackgroundSkills(s.classChoices?.['class-skills']??[],origins.skills,s.skillReplacements),...(s.classChoices?.['class-skills']??[])])],
  skillSources:[...(s.classChoices?.['class-skills']??[]).map(skill=>({skill,source:'Class'})),...origins.skills.map(skill=>({skill:s.classChoices?.['class-skills']?.includes(skill)?s.skillReplacements?.[skill]??skill:skill,source:s.classChoices?.['class-skills']?.includes(skill)?'Background (replaces '+skill+')':'Background'}))],

  toolProficiencies:[...new Set([...(cls?.tools??[]).filter(Boolean),s.toolReplacement??origins.tool].filter((tool):tool is string=>!!tool))],
  saves:cls?.savingThrows??[],features:cls?.features.filter(f=>f.level===1).flatMap(f=>f.names)??[],
  equipment:Object.entries(inventory(eq,s.classId??'',s.backgroundId??'')).filter(([,n])=>n>0).map(([id,n])=>({name:ITEM_BY_ID[id]?.name??id,quantity:n})),
  remainingGold:remainingCp(eq,s.classId??'',s.backgroundId??'')/100,
  spells:{cantrips:magic.cantrips.map(id=>SPELL_BY_ID[id]?.name??id),prepared:magic.prepared.map(id=>SPELL_BY_ID[id]?.name??id),spellbook:magic.spellbook.map(id=>SPELL_BY_ID[id]?.name??id),invocations:magic.invocations,innate:innateOriginSpells(s.speciesId??'',s.lineageId).map(id=>SPELL_BY_ID[id]?.name??id),originCantrips:(s.originMagic?.cantrips??[]).map(id=>SPELL_BY_ID[id]?.name??id),originSpell:s.originMagic?.spell?SPELL_BY_ID[s.originMagic.spell]?.name??s.originMagic.spell:null,stats:spellStats(s.classId??'',scores)},
  errors:reviewErrors(d)};
}
