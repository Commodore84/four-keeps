import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import type {Campaign} from './campaign';
import {applyImportedLevelUp,importedLevelUpIssues} from './importedLevelUp';
import {startUnifiedEncounter,addCompanionEnemy,applyCompanionCondition,attackCompanion,setNighthawkEncounterLoadout} from './companionEncounter';
function rogue():Campaign{
 const c=newCampaign('Elven Accuracy');
 return {...c,xp:2700,character:{...c.character!,level:3,classId:'rogue'},characterIdentity:{name:'Elf Rogue',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'elf',pronouns:'',appearance:'',personality:'',backstory:''},characterBuild:{rules:{allowCompatibleLegacy:true}} as Campaign['characterBuild']};
}
const feat={hpGain:5,confirm:true,featPlan:'Elven Accuracy',featAbility:'Dex' as const,legacyApproved:true};
function encounter(earned:boolean){
 const c=rogue();
 const advanced=earned?applyImportedLevelUp(c,feat):{...c,character:{...c.character!,level:4}};
 const ready={...advanced,equipment:{daggers:2,arrows:0,caltrops:0,ballBearings:0},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Dagger',quantity:2}]}} as Campaign;
 let battle=startUnifiedEncounter(ready,{nighthawk:25},{nighthawk:{x:1,y:1}},{});
 battle=addCompanionEnemy(battle,'target',30,{x:2,y:1},20,20,0);
 battle=setNighthawkEncounterLoadout(battle,'weaponId','dagger');
 return applyCompanionCondition(battle,'target','Restrained');
}
describe('earned Elven Accuracy level four',()=>{
 it('requires enabled legacy rules, valid ability and explicit DM approval',()=>{
  const c=rogue();
  expect(importedLevelUpIssues(c,{...feat,legacyApproved:false}).join(' ')).toContain('DM approval');
  expect(importedLevelUpIssues(c,{...feat,featAbility:'Str'}).join(' ')).toContain('eligible');
  expect(importedLevelUpIssues({...c,characterBuild:{rules:{allowCompatibleLegacy:false}} as Campaign['characterBuild']},feat).join(' ')).toContain('disabled');
  const next=applyImportedLevelUp(c,feat);
  expect(next.character?.level).toBe(4);
  expect(next.importedEarnedFeats).toEqual([{level:4,name:'Elven Accuracy',ability:'Dex',legacyApproved:true}]);
  expect(c.importedEarnedFeats).toBeUndefined();
 });
 it('rerolls lower advantage die, uses result for hit and critical and persists log',()=>{
  const c=encounter(true);
  const result=attackCompanion(c,'nighthawk','target',3,5,20,4,3,'Piercing',5,8,20);
  expect(result.companionEncounter?.log.at(-1)).toContain('Elven Accuracy reroll 20');
  expect(result.companionEncounter?.log.at(-1)).toContain('critical hit');
  expect(result.companionEncounter?.participants.target.hp).toBeLessThan(c.companionEncounter!.participants.target.hp);
  expect(c.companionEncounter?.participants.nighthawk.actionUsed).toBe(false);
 });
 it('rejects unearned feat, invalid reroll, and no uncancelled advantage',()=>{
  const c=encounter(true);
  expect(()=>attackCompanion(encounter(false),'nighthawk','target',3,5,20,4,3,'Piercing',5,8,20)).toThrow('Elven Accuracy');
  expect(()=>attackCompanion(c,'nighthawk','target',3,5,20,4,3,'Piercing',5,8,21)).toThrow('Elven Accuracy');
  expect(()=>attackCompanion(c,'nighthawk','target',3,5,20,4,3,'Piercing',5,undefined,20)).toThrow();
  const cancelled=applyCompanionCondition(c,'nighthawk','Poisoned');
  expect(()=>attackCompanion(cancelled,'nighthawk','target',3,5,20,4,3,'Piercing',5,8,20)).toThrow('Elven Accuracy');
 });
});
