import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import type {Campaign} from './campaign';
import {startUnifiedEncounter,addCompanionEnemy,castArcaneTricksterHoldPerson,resolveArcaneTricksterHoldPersonEndSave,endCompanionTurn,setCompanionConcentration,resolveCompanionConcentrationSave,damageCompanion} from './companionEncounter';
function fixture(level=9):Campaign{
 const c=newCampaign('Trickster');
 const rogue={...c,characterIdentity:{name:'Trickster',classId:'rogue',speciesId:'human',backgroundId:'sage',draftId:'r',pronouns:'',appearance:'',personality:'',backstory:''},importedSubclassId:'rogue-arcane-trickster',character:{...c.character!,classId:'rogue',level,preparedSpells:['Hold Person'],spellSlots:{level1:4,usedLevel1:0,level2:2,usedLevel2:0}}} as Campaign;
 return addCompanionEnemy(startUnifiedEncounter(rogue,{nighthawk:20},{nighthawk:{x:2,y:2}},{}),'goblin',10,{x:3,y:2},40,10,3);
}
const choice={targetId:'goblin',slotLevel:2 as const,humanoidConfirmed:true,hiddenFromTarget:true,saveRolls:[18,2] as [number,number],saveModifier:2};
describe('Arcane Trickster verified encounter casting',()=>{
 it('spends slot, verifies target and applies Magical Ambush from level nine',()=>{
  const c=fixture(),before=JSON.stringify(c);
  const next=castArcaneTricksterHoldPerson(c,choice);
  expect(next.character!.spellSlots!.usedLevel2).toBe(1);
  expect(next.companionEncounter!.participants.goblin.conditions).toContain('Paralyzed');
  expect(next.companionEncounter!.log.at(-1)).toContain('Magical Ambush disadvantage');
  expect(JSON.stringify(c)).toBe(before);
  expect(()=>castArcaneTricksterHoldPerson(next,choice)).toThrow();
  expect(()=>castArcaneTricksterHoldPerson(c,{...choice,humanoidConfirmed:false})).toThrow('humanoid');
  expect(()=>castArcaneTricksterHoldPerson(c,{...choice,saveRolls:[21,2]})).toThrow('verified');
 });
 it('does not apply disadvantage before level nine or without DM-confirmed hidden state',()=>{
  const eight=castArcaneTricksterHoldPerson(fixture(8),choice);
  expect(eight.companionEncounter!.log.at(-1)).toContain('normal save');
  expect(eight.companionEncounter!.participants.goblin.conditions).not.toContain('Paralyzed');
  const visible=castArcaneTricksterHoldPerson(fixture(),{...choice,hiddenFromTarget:false});
  expect(visible.companionEncounter!.participants.goblin.conditions).not.toContain('Paralyzed');
 });
 it('requires end-turn save and releases tracked paralysis on success',()=>{
  const held=castArcaneTricksterHoldPerson(fixture(),choice);
  const enemyTurn=endCompanionTurn(held,'nighthawk');
  expect(()=>endCompanionTurn(enemyTurn,'goblin')).toThrow('end-of-turn');
  const freed=resolveArcaneTricksterHoldPersonEndSave(enemyTurn,'goblin',20);
  expect(freed.companionEncounter!.participants.goblin.conditions).not.toContain('Paralyzed');
  expect(endCompanionTurn(freed,'goblin').companionEncounter!.round).toBeGreaterThan(1);
 });
 it('clears paralysis on concentration replacement and failed concentration save',()=>{
  const held=castArcaneTricksterHoldPerson(fixture(),choice);
  expect(setCompanionConcentration(held,'nighthawk','Invisibility').companionEncounter!.participants.goblin.conditions).not.toContain('Paralyzed');
  expect(resolveCompanionConcentrationSave(held,'nighthawk',12,4).companionEncounter!.participants.goblin.conditions).not.toContain('Paralyzed');
  expect(damageCompanion(held,'nighthawk',999,'Force').companionEncounter!.participants.goblin.conditions).not.toContain('Paralyzed');
 });
});
