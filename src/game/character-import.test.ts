import {describe,it,expect} from 'vitest';
import {createCharacterDraft} from '../app/CharacterCreator';
import {reviewErrors} from './creationReview';
import {campaignFromCharacterDraft,characterDraftImportOptions,startingCurrency,reconcileStartingCurrency} from './characterImport';
import {beginAdventureSession} from './adventureSession';
import {carriedWeight,coinWeight} from './carryingCapacity';
import {isCampaign,newCampaign} from './campaign';
function validRogue(){
 const d=createCharacterDraft();
 d.identity.name='Raven';
 d.identity.backstory='A scholar from the borderlands';
 d.selections.speciesId='elf';d.selections.lineageId='wood-elf';d.selections.backgroundId='criminal';d.selections.classId='rogue';d.selections.toolReplacement='Herbalism Kit';
 d.selections.classChoices={'class-skills':['Perception','Acrobatics','Investigation','Deception'],'expertise':['Perception','Acrobatics'],'weapon-mastery':['Dagger','Shortbow']};
 d.selections.abilities={method:'standard',base:{Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Dex:2,Int:1},rolls:[],rollDice:[]};
 d.selections.equipment={classPackage:0,backgroundPackage:0,purchases:{},equipped:{weapons:[]}};
 return d;
}
describe('validated character draft to campaign import',()=>{
 it('rejects incomplete and invalid drafts without creating campaigns',()=>{
  const d=createCharacterDraft();
  expect(characterDraftImportOptions([d])[0].valid).toBe(false);
  expect(()=>campaignFromCharacterDraft(d,'New Campaign')).toThrow('incomplete');
  expect(newCampaign('Legacy').characterIdentity).toBeUndefined();
 });
 it('imports a fully reviewed character with identity, stats and equipment',()=>{
  const d=validRogue();
  expect(reviewErrors(d)).toEqual([]);
  const c=campaignFromCharacterDraft(d,'Raven adventure','raven-campaign','2026-11-10T00:00:00.000Z');
  expect(c.location).toBe('Dasahi');
  expect(c.journal[0].text).toContain('Dasahi');
  expect(c.characterIdentity).toMatchObject({name:'Raven',classId:'rogue',speciesId:'elf',lineageId:'wood-elf',draftId:d.id});
  expect(c.character).toMatchObject({scores:{str:8,dex:17,con:14,int:14,wis:12,cha:10},level:1,maxHitPoints:10,currentHitPoints:10,speed:35,proficiencyBonus:2});
  expect(c.character?.proficientSkills).toContain('Stealth');
  expect(c.combat).toBeUndefined();
  expect(c.journal[0].text).toContain('Raven');
  expect(isCampaign(c)).toBe(true);
  expect(JSON.parse(JSON.stringify(c)).characterIdentity.name).toBe('Raven');
  expect(beginAdventureSession(c).characterIdentity?.name).toBe('Raven');
  expect(isCampaign({...c,characterIdentity:{...c.characterIdentity!,name:''}})).toBe(false);
  const session=beginAdventureSession(c);
  expect(isCampaign({...session,adventureSession:{...session.adventureSession!,site:'unknown' as 'frontier'}})).toBe(false);
 });
});

it('imports Wizard slots and class saving throws without Rogue proficiency',()=>{
 const d=validRogue();d.selections.classId='wizard';d.selections.classChoices={'class-skills':['Arcana','History'],expertise:['Arcana'],'divine-order':['Protector']};
 d.selections.magic={cantrips:['fire-bolt','mage-hand','minor-illusion'],prepared:['alarm','burning-hands','charm-person','detect-magic'],spellbook:['alarm','burning-hands','charm-person','detect-magic','find-familiar','magic-missile'],invocations:[]};
 const c=campaignFromCharacterDraft(d,'Wizard import');expect(c.character).toMatchObject({classId:'wizard',maxHitPoints:8,savingThrowProficiencies:['int','wis'],weaponProficiencies:['Simple'],spellSlots:{level1:2,usedLevel1:0}});
 expect(c.character?.expertiseSkills).toEqual([]);expect(c.character?.weaponProficiencies).not.toContain('Martial');expect(c.character?.preparedSpells).toContain('Alarm');expect(c.character?.resources?.['Arcane Recovery'].maximum).toBe(1);
});

describe('future forecast import persistence',()=>{
 it('keeps planned subclass, legacy feat and ASIs in imported character snapshot',async()=>{const {emptyForecast,updateLevelPlan}=await import('./creationForecast');const d=validRogue();d.rules.allowCompatibleLegacy=true;let f=emptyForecast();f=updateLevelPlan(f,3,{subclassId:'rogue-arcane-trickster'});f=updateLevelPlan(f,4,{featPlan:'Elven Accuracy',featAbility:'Dex'});f=updateLevelPlan(f,8,{featPlan:'Ability Score Improvement',abilityIncreases:{Dex:2}});d.forecast=f;const c=campaignFromCharacterDraft(d,'Forecast adventure');expect(c.characterBuild?.forecast).toEqual(f);d.forecast.levels[0].subclassId='rogue-assassin';expect(c.characterBuild?.forecast?.levels.find(x=>x.level===3)?.subclassId).toBe('rogue-arcane-trickster')});
});

describe('starting inventory canonicalization',()=>{
 it('expands starting equipment packs into individual gear',()=>{
  const campaign=campaignFromCharacterDraft(validRogue(),'Starting gear');
  const gear=campaign.inventoryLedger!.gear;
  expect(gear.some(item=>item.name==='Backpack')).toBe(true);
  expect(carriedWeight(campaign).unknown).toEqual([]);
 });
});

it('issues 150 GP as 150 gold coins and preserves fractional change',()=>{
 expect(startingCurrency(15000)).toEqual({CP:0,SP:0,EP:0,GP:150,PP:0});
 expect(startingCurrency(15023)).toEqual({CP:3,SP:2,EP:0,GP:150,PP:0});
});
it('repairs a legacy imported wallet without changing value or other campaign data',()=>{
 const c=campaignFromCharacterDraft(validRogue(),'Legacy wallet');
 const money=c.inventoryLedger!.currency;
 const cp=money.GP*100+money.SP*10+money.CP;
 expect(cp).toBeGreaterThanOrEqual(100);
 const legacy={...c,inventoryLedger:{...c.inventoryLedger!,currency:{CP:cp,SP:0,EP:0,GP:0,PP:0}}};
 const fixed=reconcileStartingCurrency(legacy);
 expect(fixed).toEqual(c);
 expect(coinWeight(fixed)).toBeLessThan(coinWeight(legacy));
 expect(reconcileStartingCurrency(fixed)).toBe(fixed);
 const mixed={...legacy,inventoryLedger:{...legacy.inventoryLedger,currency:{...legacy.inventoryLedger.currency,GP:1}}};
 expect(reconcileStartingCurrency(mixed)).toBe(mixed);
});
