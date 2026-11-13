import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {applyImportedLevelUp,importedLevelUpIssues} from './importedLevelUp';
import type {Campaign} from './campaign';
function fixture(level=1,xp=0):Campaign{const c=newCampaign('Imported');return {...c,xp,character:{...c.character!,level,classId:'rogue'},characterIdentity:{name:'Test',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'test',pronouns:'',appearance:'',personality:'',backstory:''},characterBuild:{rules:{allowCompatibleLegacy:false}} as Campaign['characterBuild']}}
describe('imported level up',()=>{
 it('Rogue level eight requires an eligible improvement, applies ASI and preserves source',()=>{const c=fixture(7,34000);expect(importedLevelUpIssues(c,{hpGain:5,confirm:true}).join(' ')).toContain('valid feat');const next=applyImportedLevelUp(c,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});expect(next.character!.level).toBe(8);expect(next.character!.scores.dex).toBe(c.character!.scores.dex+2);expect(next.character!.maxHitPoints).toBe(c.character!.maxHitPoints!+5);expect(c.character!.level).toBe(7);expect(()=>applyImportedLevelUp(c,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:3}})).toThrow();});
 it('Rogue level eight rejects advancement without sufficient XP',()=>{const c=fixture(7,23000);expect(importedLevelUpIssues(c,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}}).join(' ')).toContain('34000 XP');});

 it('permits Rogue level seven advancement while retaining existing Expertise',()=>{const c=fixture(6,23000);const next=applyImportedLevelUp(c,{hpGain:5,confirm:true});expect(next.character!.level).toBe(7);expect(next.character!.maxHitPoints).toBe(c.character!.maxHitPoints!+5);expect(c.character!.level).toBe(6);});

 it('requires XP and explicit confirmation, and never mutates source',()=>{const c=fixture();const choice={hpGain:5,confirm:true};expect(importedLevelUpIssues(c,choice).join(' ')).toContain('300 XP');expect(()=>applyImportedLevelUp(c,choice)).toThrow();const eligible=fixture(1,300);expect(importedLevelUpIssues(eligible,{hpGain:5,confirm:false})).toContain('Explicit confirmation required.');const next=applyImportedLevelUp(eligible,choice);expect(next.character?.level).toBe(2);expect(eligible.character?.level).toBe(1);expect(next.character!.maxHitPoints).toBe(eligible.character!.maxHitPoints!+5)});
 it('unlocks Rogue levels five and six but rejects missing or duplicate Expertise',()=>{const five=fixture(4,6500);five.importedSubclassId='rogue-arcane-trickster';five.character!.spellSlots={level1:2,usedLevel1:1};const advanced=applyImportedLevelUp(five,{hpGain:5,confirm:true});expect(advanced.character!.level).toBe(5);expect(advanced.character!.spellSlots?.level1).toBe(3);expect(five.character!.level).toBe(4);const six={...advanced,xp:14000};expect(importedLevelUpIssues(six,{hpGain:5,confirm:true}).join(' ')).toContain('two distinct');const candidates=six.character!.proficientSkills.filter(skill=>!six.character!.expertiseSkills?.includes(skill)).slice(0,2);const result=applyImportedLevelUp(six,{hpGain:5,confirm:true,rogueExpertise:candidates});expect(result.character!.level).toBe(6);expect(result.character!.expertiseSkills).toEqual(expect.arrayContaining(candidates));expect(applyImportedLevelUp({...result,xp:23000},{hpGain:5,confirm:true}).character!.level).toBe(7);});
 it('requires valid subclass at level three',()=>{const c=fixture(2,900);expect(importedLevelUpIssues(c,{hpGain:5,confirm:true})).toContain('Choose a valid subclass.');expect(importedLevelUpIssues(c,{hpGain:5,confirm:true,subclassId:'rogue-thief'}).join(' ')).toContain('unsupported mechanics');const next=applyImportedLevelUp(c,{hpGain:5,confirm:true,subclassId:'rogue-arcane-trickster',arcaneCantrips:['Minor Illusion','Message'],arcaneSpells:['Shield','Magic Missile','Disguise Self']});expect(next.importedSubclassId).toBe('rogue-arcane-trickster');expect(next.character?.level).toBe(3);expect(next.character?.cantrips).toContain('Mage Hand');expect(next.character?.spellSlots?.level1).toBe(2)});
 it('validates ASI points and updates ability scores at level four',()=>{const c=fixture(3,2700);expect(importedLevelUpIssues(c,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:1}})).toContain('Allocate exactly two ASI points.');const next=applyImportedLevelUp(c,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});expect(next.character?.scores.dex).toBe(c.character!.scores.dex+2);expect(next.character?.level).toBe(4)});
 it('rejects incomplete feat application rather than silently granting only ability bonuses',()=>{const c=fixture(3,2700);expect(importedLevelUpIssues(c,{hpGain:5,confirm:true,featPlan:'Fey-Touched',featAbility:'Int'}).join(' ')).toContain('not yet implemented')});
});
describe('complete feat and Constitution progression',()=>{
 it('grants Skill Expert proficiency, expertise and +1 ability only with valid selections',()=>{
  const c=fixture(3,2700);c.character!.scores.dex=17;
  const base={hpGain:5,confirm:true,featPlan:'Skill Expert',featAbility:'Dex' as const,skillProficiency:'Acrobatics' as const,skillExpertise:'Acrobatics' as const};
  expect(importedLevelUpIssues(c,base)).toEqual([]);
  const next=applyImportedLevelUp(c,base);
  expect(next.character!.scores.dex).toBe(18);
  expect(next.character!.proficientSkills).toContain('Acrobatics');
  expect(next.character!.expertiseSkills).toContain('Acrobatics');
  expect(c.character!.proficientSkills).not.toContain('Acrobatics');
  expect(importedLevelUpIssues(c,{...base,skillExpertise:'Arcana'}).join(' ')).toContain('Choose one proficient skill');
 });
 it('retroactively updates maximum HP for a Constitution ASI',()=>{
  const c=fixture(3,2700);c.character!.scores.con=13;
  const next=applyImportedLevelUp(c,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Con:2}});
  expect(next.character!.scores.con).toBe(15);
  expect(next.character!.maxHitPoints).toBe(c.character!.maxHitPoints!+5+4);
 });
});
describe('Arcane Trickster progression gates',()=>{
 it('rejects duplicate and non-Wizard spells without changing the campaign',()=>{
  const c=fixture(2,900);const choice={hpGain:5,confirm:true,subclassId:'rogue-arcane-trickster',arcaneCantrips:['Minor Illusion','Minor Illusion'],arcaneSpells:['Shield','Magic Missile','Cure Wounds']};
  const before=JSON.stringify(c);
  expect(importedLevelUpIssues(c,choice).join(' ')).toContain('two distinct Wizard cantrips');
  expect(importedLevelUpIssues(c,choice).join(' ')).toContain('three distinct level-1 Wizard spells');
  expect(()=>applyImportedLevelUp(c,choice)).toThrow();expect(JSON.stringify(c)).toBe(before);
 });
 it('retains Mage Hand and prepared spells when advancing to level four',()=>{
  const c=applyImportedLevelUp(fixture(2,900),{hpGain:5,confirm:true,subclassId:'rogue-arcane-trickster',arcaneCantrips:['Minor Illusion','Message'],arcaneSpells:['Shield','Magic Missile','Disguise Self']});
  const next=applyImportedLevelUp({...c,xp:2700},{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});
  expect(next.character?.level).toBe(4);expect(next.character?.cantrips).toContain('Mage Hand');expect(next.character?.preparedSpells).toContain('Shield');expect(next.character?.spellSlots?.level1).toBe(2);
 });
});
