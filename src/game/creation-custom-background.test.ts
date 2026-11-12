import {describe,it,expect} from 'vitest';
import {createCharacterDraft} from '../app/CharacterCreator';
import {resolveBackground,validateOrigins,validateCustomBackground,requiredSkillReplacements,validateSkillReplacements,effectiveBackgroundSkills,validateToolReplacement} from './creationOrigins';
import {reviewErrors,reviewCharacter} from './creationReview';
import {magicInitiateClass,emptyOriginMagic,validateOriginMagic} from './creationMagic';
import {BACKGROUND_PACKAGES,emptyEquipment,remainingCp} from './creationEquipment';
const custom={name:'Frontier Scout',abilities:['Dex','Wis','Con'],feat:'Alert',skills:['Stealth','Survival'],tool:'Cartographer’s Tools'};
describe('custom backgrounds and overlapping proficiencies',()=>{
 it('accepts a fully configured 2024 custom background with a 50 GP package',()=>{
  const d=createCharacterDraft();d.selections={classId:'rogue',speciesId:'elf',lineageId:'wood-elf',backgroundId:'custom',customBackground:custom};
  expect(validateOrigins(d.selections,false)).toEqual([]);
  expect(resolveBackground(d.selections,false)?.feat).toBe('Alert');
  expect(resolveBackground(d.selections,false)?.skills).toEqual(['Stealth','Survival']);
 });
 it('tracks species skill choice and resolves background overlaps against class and species',()=>{
  const d=createCharacterDraft();
  d.selections={classId:'rogue',speciesId:'elf',lineageId:'wood-elf',speciesSkill:'Survival',backgroundId:'custom',customBackground:{...custom,skills:['Survival','Arcana']},classChoices:{'class-skills':['Stealth','Insight','Perception','Acrobatics']},skillReplacements:{Survival:'History'}};
  expect(validateOrigins(d.selections,false)).toEqual([]);
  expect(validateSkillReplacements(['Stealth','Insight','Perception','Acrobatics','Survival'],['Survival','Arcana'],{Survival:'History'})).toEqual([]);
  const review=reviewCharacter(d);
  expect(review.skills).toContain('Survival');
  expect(review.skills).toContain('History');
  expect(review.skillSources).toContainEqual({skill:'Survival',source:'Species'});
  expect(review.skillSources).toContainEqual({skill:'History',source:'Background (replaces Survival)'});
  d.selections.speciesSkill='Insight';
  expect(reviewErrors(d).join(' ')).toContain('Species skill duplicates a class skill');
 });
 it('supports custom Magic Initiate choices and the standard 50 GP equipment alternative',()=>{
  expect(magicInitiateClass('custom','Magic Initiate (Wizard)')).toBe('wizard');
  expect(validateOriginMagic('custom',emptyOriginMagic(),'Magic Initiate (Wizard)')).toContain('Select two legal Magic Initiate cantrips.');
  expect(BACKGROUND_PACKAGES.custom[0].gold).toBe(50);
  expect(remainingCp({...emptyEquipment(),classPackage:0,backgroundPackage:0},'rogue','custom')).toBeGreaterThanOrEqual(5000);
 });
 it('rejects missing, repeated, or invalid custom selections',()=>{
  expect(validateCustomBackground(undefined).length).toBeGreaterThan(0);
  expect(validateCustomBackground({...custom,skills:['Stealth','Stealth']}).join(' ')).toContain('two distinct');
  expect(validateCustomBackground({...custom,abilities:['Dex','Dex','Con']}).join(' ')).toContain('three distinct');
  expect(validateCustomBackground({...custom,feat:'Unrestricted feat'}).join(' ')).toContain('valid Origin feat');
 });
 it('replaces a background skill duplicated by a class without granting expertise',()=>{
  expect(requiredSkillReplacements(['Stealth','Insight'],['Stealth','Survival'])).toEqual(['Stealth']);
  expect(validateSkillReplacements(['Stealth','Insight'],['Stealth','Survival'],{})).toHaveLength(1);
  expect(validateSkillReplacements(['Stealth','Insight'],['Stealth','Survival'],{Stealth:'Stealth'})).toHaveLength(1);
  expect(validateSkillReplacements(['Stealth','Insight'],['Stealth','Survival'],{Stealth:'Arcana'})).toEqual([]);
  expect(effectiveBackgroundSkills(['Stealth','Insight'],['Stealth','Survival'],{Stealth:'Arcana'})).toEqual(['Arcana','Survival']);
 });
 it('requires a replacement when class and background both grant the same tool',()=>{
  expect(validateToolReplacement(['Thieves Tools'],'Thieves’ Tools')).toHaveLength(1);
  expect(validateToolReplacement(['Thieves Tools'],'Thieves’ Tools','Herbalism Kit')).toEqual([]);
  expect(validateToolReplacement(['Thieves Tools'],'Cartographer’s Tools')).toEqual([]);
 });
 it('persists the replacement into review skills and rejects an unresolved overlap',()=>{
  const d=createCharacterDraft();d.identity.name='Scout';d.selections={classId:'rogue',speciesId:'elf',lineageId:'wood-elf',backgroundId:'custom',customBackground:custom,classChoices:{'class-skills':['Stealth','Insight']}};
  expect(reviewErrors(d).join(' ')).toContain('overlapping Stealth');
  d.selections.skillReplacements={Stealth:'Arcana'};
  expect(reviewErrors(d).join(' ')).not.toContain('overlapping Stealth');
  expect(reviewCharacter(d).skills).toContain('Arcana');
  expect(reviewCharacter(d).skillSources).toContainEqual({skill:'Arcana',source:'Background (replaces Stealth)'});
 });
});
