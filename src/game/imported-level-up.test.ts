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

describe('Rogue level nine and ten advancement',()=>{
 it('advances level nine only with XP and keeps other class caps',()=>{
  const c=fixture(8,48000);
  expect(importedLevelUpIssues(c,{hpGain:5,confirm:true})).toEqual([]);
  const next=applyImportedLevelUp(c,{hpGain:5,confirm:true});
  expect(next.character?.level).toBe(9);
  expect(c.character?.level).toBe(8);
  expect(importedLevelUpIssues(fixture(8,34000),{hpGain:5,confirm:true})).toContain('Requires 48000 XP for level 9.');
 });
 it('level ten requires and persists ASI',()=>{
  const c=fixture(9,64000);
  expect(importedLevelUpIssues(c,{hpGain:5,confirm:true})).toContain('Choose a valid feat or ASI.');
  const next=applyImportedLevelUp(c,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});
  expect(next.character?.level).toBe(10);
  expect(next.character?.scores.dex).toBe(c.character!.scores.dex+2);
 });
 it('Arcane Trickster requires distinct prepared spells and upgrades slots',()=>{
  const c=fixture(8,48000);c.importedSubclassId='rogue-arcane-trickster';
  c.character!.preparedSpells=['Shield','Magic Missile','Sleep','Charm Person','Disguise Self'];
  const spells=['Detect Magic'];
  expect(importedLevelUpIssues(c,{hpGain:5,confirm:true,arcaneSpells:spells})).toEqual([]);
  const next=applyImportedLevelUp(c,{hpGain:5,confirm:true,arcaneSpells:spells});
  expect(next.character!.preparedSpells).toContain('Detect Magic');
  expect(next.character!.spellSlots?.level2).toBe(2);
  expect(c.character!.preparedSpells).not.toContain('Detect Magic');
 });
});

 describe('Rogue level eleven advancement',()=>{
  it('requires XP and confirmation, then advances without adding forecast feats',()=>{
   const atTen=fixture(10,85000);atTen.importedSubclassId='rogue-arcane-trickster';
   const choice={hpGain:5,confirm:true};
   expect(importedLevelUpIssues({...atTen,xp:84999},choice).join(' ')).toContain('85000 XP');
   expect(importedLevelUpIssues(atTen,{...choice,confirm:false}).join(' ')).toContain('Explicit confirmation');
   const next=applyImportedLevelUp(atTen,choice);
   expect(next.character!.level).toBe(11);
   expect(next.character!.proficiencyBonus).toBe(4);
   expect(next.importedEarnedFeats??[]).toEqual(atTen.importedEarnedFeats??[]);
   expect(atTen.character!.level).toBe(10);
   expect(importedLevelUpIssues(next,choice).join(' ')).toContain('Requires 100000 XP');
  });
 });

 describe('Rogue levels twelve through fourteen',()=>{
  it('requires a level-12 improvement and persists earned scores without applying subclass effects',()=>{
   const twelve=fixture(11,100000);twelve.importedSubclassId='rogue-arcane-trickster';
   expect(importedLevelUpIssues(twelve,{hpGain:5,confirm:true}).join(' ')).toContain('Choose a valid feat or ASI');
   const advanced=applyImportedLevelUp(twelve,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});
   expect(advanced.character!.level).toBe(12);
   expect(advanced.character!.scores.dex).toBe(twelve.character!.scores.dex+2);
   expect(twelve.character!.level).toBe(11);
  });
  it('advances at XP thresholds 120000 and 140000 without granting unsupported spells or resources',()=>{
   const thirteen=fixture(12,120000);thirteen.importedSubclassId='rogue-arcane-trickster';
   const after13=applyImportedLevelUp(thirteen,{hpGain:5,confirm:true});
   expect(after13.character!.level).toBe(13);
   expect(after13.character!.preparedSpells).toEqual(thirteen.character!.preparedSpells);
   expect(after13.character!.resources).toEqual(thirteen.character!.resources);
   const after14=applyImportedLevelUp({...after13,xp:140000},{hpGain:5,confirm:true});
   expect(after14.character!.level).toBe(14);
   expect(after14.character!.proficiencyBonus).toBe(5);
   expect(importedLevelUpIssues({...after14,xp:164999},{hpGain:5,confirm:true}).join(' ')).toContain('165000 XP');
  });
 });

 describe('Rogue levels fifteen through seventeen',()=>{
  it('grants Slippery Mind saving throw proficiency once, with XP and confirmation checks',()=>{
   const at14=fixture(14,165000);at14.character!.savingThrowProficiencies=['dex','int'];
   expect(importedLevelUpIssues({...at14,xp:164999},{hpGain:5,confirm:true}).join(' ')).toContain('165000 XP');
   expect(importedLevelUpIssues(at14,{hpGain:5,confirm:false}).join(' ')).toContain('Explicit confirmation');
   const next=applyImportedLevelUp(at14,{hpGain:5,confirm:true});
   expect(next.character!.savingThrowProficiencies).toEqual(['dex','int','wis','cha']);
   expect(next.character!.proficiencyBonus).toBe(5);
   expect(at14.character!.savingThrowProficiencies).toEqual(['dex','int']);
  });
  it('requires level sixteen improvement and advances level seventeen without subclass resource grants',()=>{
   const at15=fixture(15,195000);at15.importedSubclassId='rogue-arcane-trickster';
   expect(importedLevelUpIssues(at15,{hpGain:5,confirm:true}).join(' ')).toContain('valid feat');
   const at16=applyImportedLevelUp(at15,{hpGain:5,confirm:true,featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});
   expect(at16.character!.level).toBe(16);
   const at17=applyImportedLevelUp({...at16,xp:225000},{hpGain:5,confirm:true});
   expect(at17.character!.level).toBe(17);
   expect(at17.character!.proficiencyBonus).toBe(6);
   expect(at17.character!.resources).toEqual(at16.character!.resources);
   expect(at17.character!.preparedSpells).toEqual(at16.character!.preparedSpells);
   expect(importedLevelUpIssues({...at17,xp:265000},{hpGain:5,confirm:true}).join(' ')).toContain('supports Rogue levels 2–17');
  });
 });
