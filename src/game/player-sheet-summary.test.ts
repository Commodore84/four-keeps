import {discardInventoryItem} from './inventoryDiscard';
import {magicProtectionBonus,magicWandStatus,rechargeMagicWand,spendMagicWand,wearMagicItem} from './magicEquipment';
import {completePlayerRest} from './playerRecovery';
import {campaignPlayerContext} from './campaignContext';
import {armorEffects,equipmentRollMode,requireArmorSpellcasting} from './armorEffects';
import {setPlayerLoadout} from './companionEncounter';
import {describe,it,expect} from 'vitest';
import {createCharacterDraft} from '../app/CharacterCreator';
import {campaignFromCharacterDraft} from './characterImport';
import {playerSheetSummary} from './playerSheetSummary';
import {newCampaign} from './campaign';

function rogue(){
 const d=createCharacterDraft();d.identity.name='Raven';d.identity.backstory='A scholar from the borderlands';
 d.selections.speciesId='elf';d.selections.lineageId='wood-elf';d.selections.backgroundId='criminal';d.selections.classId='rogue';d.selections.toolReplacement='Herbalism Kit';
 d.selections.classChoices={'class-skills':['Perception','Acrobatics','Investigation','Deception'],'expertise':['Perception','Acrobatics'],'weapon-mastery':['Dagger','Shortbow']};
 d.selections.abilities={method:'standard',base:{Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Dex:2,Int:1},rolls:[],rollDice:[]};
 d.selections.equipment={classPackage:0,backgroundPackage:0,purchases:{},equipped:{weapons:[]}};
 return campaignFromCharacterDraft(d,'Raven adventure');
}
describe('authoritative Player sheet summary',()=>{
 it('discards an exact quantity and clears a removed equipped item without changing currency',()=>{
  const c=setPlayerLoadout(rogue(),'armorId','leather-armor');
  expect(()=>discardInventoryItem(c,'Leather Armor',2,1)).toThrow('quantity');
  expect(()=>discardInventoryItem(c,'Leather Armor',1,2)).toThrow('Inventory changed');
  const changed=discardInventoryItem(c,'Leather Armor',1,1);
  expect(changed.inventoryLedger?.gear.some(row=>row.name==='Leather Armor')).toBe(false);
  expect(changed.inventoryLedger?.currency).toEqual(c.inventoryLedger?.currency);
  expect(playerSheetSummary(JSON.parse(JSON.stringify(changed)))?.armorClass).toBe(13);
 });
 it('calculates equipped and explicitly unarmored AC after serialization',()=>{
  const c=rogue();
  const equipped=setPlayerLoadout(c,'armorId','leather-armor');
  expect(playerSheetSummary(equipped)?.armorClass).toBe(14);
  const removed=setPlayerLoadout(equipped,'armorId','');
  expect(playerSheetSummary(JSON.parse(JSON.stringify(removed)))?.armorClass).toBe(13);
  expect(equipped.encounterLoadout?.armorId).toBe('leather-armor');
  expect(removed.inventoryLedger).toEqual(c.inventoryLedger);
  expect(()=>setPlayerLoadout(c,'armorId','plate-armor')).toThrow('owned');
 });
 it('applies heavy armor AC, untrained penalties and the Strength speed penalty',()=>{
  const c=rogue();
  c.inventoryLedger!.gear=[{name:'Chain Mail',quantity:1}];
  const armored=setPlayerLoadout(c,'armorId','chain-mail');
  expect(playerSheetSummary(armored)?.armorClass).toBe(16);
  expect(playerSheetSummary(armored)?.speed).toBe((c.character?.speed??0)-10);
  expect(armorEffects(armored)).toMatchObject({untrainedArmor:true,speedPenalty:10,stealthDisadvantage:true});
  expect(equipmentRollMode(armored,'normal','dex',true)).toBe('disadvantage');
  expect(equipmentRollMode(armored,'advantage','str')).toBe('normal');
  expect(equipmentRollMode(armored,'normal','wis')).toBe('normal');
  expect(()=>requireArmorSpellcasting(armored)).toThrow('without training');
 });
 it('requires a free hand for equipped two-handed weapons',()=>{
  const c=rogue();
  c.inventoryLedger?.gear.push({name:'Shield',quantity:1});
  const shielded=setPlayerLoadout(c,'shieldId','shield');
  expect(()=>setPlayerLoadout(shielded,'weaponId','shortbow')).toThrow('two-handed weapon');
  expect(setPlayerLoadout(setPlayerLoadout(shielded,'shieldId',''),'weaponId','shortbow').encounterLoadout?.weaponId).toBe('shortbow');
 });
 it('requires a completed Short Rest and equipped ownership for protection bonuses',()=>{
  const c=rogue();
  c.inventoryLedger?.gear.push({name:'Ring of Protection',quantity:1});
  const worn=wearMagicItem(c,'ring-of-protection',true);
  const baseAC=playerSheetSummary(worn)?.armorClass??0;
  const options={confirmedSafe:true,attunement:{itemId:'ring-of-protection' as const}};
  expect(magicProtectionBonus(worn)).toBe(0);
  expect(()=>completePlayerRest(worn,'long',options)).toThrow('Short Rest');
  const attuned=completePlayerRest(worn,'short',options);
  const restored=JSON.parse(JSON.stringify(attuned));
  expect(playerSheetSummary(restored)?.armorClass).toBe(baseAC+1);
  expect(campaignPlayerContext(restored).equipment).toMatchObject({equipped:['Ring of Protection'],attuned:['Ring of Protection']});
  expect(magicProtectionBonus(wearMagicItem(restored,'ring-of-protection',false))).toBe(0);
  expect(()=>completePlayerRest(attuned,'short',options)).toThrow('already set');
  const ended=completePlayerRest(attuned,'short',{...options,attunement:{...options.attunement,end:true}});
  expect(playerSheetSummary(ended)?.armorClass).toBe(baseAC);
 });
 it('tracks wand expenditure, dawn recharge and last-charge destruction without applying spell effects',()=>{
  const c=rogue();
  c.inventoryLedger?.gear.push({name:'Wand of Magic Missiles',quantity:1},{name:'Wand of Web',quantity:1});
  const noncaster={...c,character:{...c.character!,cantrips:[],preparedSpells:[]}};
  expect(()=>completePlayerRest(noncaster,'short',{confirmedSafe:true,attunement:{itemId:'wand-of-web'}})).toThrow('Spellcaster');
  const held=wearMagicItem(c,'wand-of-magic-missiles',true);
  const request={id:'wand-1',spent:3,target:'guard',confirmed:true};
  const first=spendMagicWand(held,'wand-of-magic-missiles',request);
  expect(magicWandStatus(first,'wand-of-magic-missiles')?.charges).toBe(4);
  expect(first.spellEffects?.at(-1)).toMatchObject({id:'wand-1',spell:'Magic Missile',status:'awaiting-adjudication'});
  expect(()=>spendMagicWand(first,'wand-of-magic-missiles',request)).toThrow('already recorded');
  expect(()=>rechargeMagicWand(first,'wand-of-magic-missiles',2)).toThrow('No dawn');
  const dawn=JSON.parse(JSON.stringify({...first,elapsedMinutes:1440}));
  const recharged=rechargeMagicWand(dawn,'wand-of-magic-missiles',1);
  expect(magicWandStatus(recharged,'wand-of-magic-missiles')?.charges).toBe(6);
  expect(()=>rechargeMagicWand(recharged,'wand-of-magic-missiles',6)).toThrow('No dawn');
  const nearlySpent=spendMagicWand(recharged,'wand-of-magic-missiles',{...request,id:'wand-2'});
  const final={...request,id:'wand-3'};
  expect(()=>spendMagicWand(nearlySpent,'wand-of-magic-missiles',final)).toThrow('last-charge');
  const destroyed=spendMagicWand(nearlySpent,'wand-of-magic-missiles',{...final,lastChargeRoll:1});
  expect(magicWandStatus(destroyed,'wand-of-magic-missiles')).toBeNull();
  expect(destroyed.inventoryLedger?.gear.find(row=>row.name==='Wand of Magic Missiles')).toBeUndefined();
 });
 it('uses imported origin tool replacement without granting duplicate tool proficiency',()=>{
  const c=rogue(),s=playerSheetSummary(c)!;
  expect(s.tools).toContain('Herbalism Kit');
  expect(s.tools.filter(x=>x==='Herbalism Kit')).toHaveLength(1);
  expect(s.initiative).toBe(3);
  expect(playerSheetSummary(JSON.parse(JSON.stringify(c)))).toEqual(s);
 });
 it('lists verified owned weapons only and derives attack bonuses without mutating campaign',()=>{
  const c=rogue(),snapshot=JSON.stringify(c);
  c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Dagger',quantity:2},{name:'Club',quantity:1},{name:'Unknown artifact',quantity:1}]};
  const s=playerSheetSummary(c)!;
  expect(s.attacks.map(a=>a.name)).toEqual(['Dagger','Club']);
  expect(s.attacks[0]).toMatchObject({quantity:2,attackModifier:5,damageModifier:3,masteryTrained:true,proficient:true});
  expect(s.attacks[1]).toMatchObject({quantity:1,attackModifier:1,damageModifier:-1,masteryTrained:false});
  expect(s.totalKnownWeight).toBe(4);
  expect(s.unverifiedWeight).toEqual(['Unknown artifact']);
  expect(JSON.stringify(c)).not.toBe(snapshot);
  expect(playerSheetSummary(c)).toEqual(s);
 });
 it('does not derive imported character data from legacy campaign',()=>{
  expect(playerSheetSummary(newCampaign('Legacy'))).toBeNull();
 });
});

import {CLASSES} from './creationClasses';
describe('Player sheet across all twelve classes',()=>{
 it('derives defenses and inventory without changing any saved class state',()=>{
  expect(CLASSES).toHaveLength(12);
  for(const cls of CLASSES){
   const base=rogue();
   const c={...base,characterIdentity:{...base.characterIdentity!,classId:cls.id},character:{...base.character!,classId:cls.id,weaponProficiencies:[...cls.weapons],resources:{'Tracked feature':{maximum:2,used:1,recovery:'long' as const}}}};
   const snapshot=JSON.stringify(c);
   const summary=playerSheetSummary(c)!;
   expect(summary.proficiencyBonus).toBe(c.character.proficiencyBonus);
   expect(summary.speed).toBe(c.character.speed);
   expect(summary.tools).toEqual(expect.arrayContaining(cls.tools));
   expect(summary.attacks.every(a=>Number.isFinite(a.attackModifier))).toBe(true);
   expect(JSON.stringify(c)).toBe(snapshot);
   expect(playerSheetSummary(JSON.parse(snapshot))).toEqual(summary);
  }
 });
 it('never treats unknown inventory as zero-weight verified gear',()=>{
  const c=rogue();c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Uncatalogued relic',quantity:3}]};
  const s=playerSheetSummary(c)!;
  expect(s.totalKnownWeight).toBe(0);
  expect(s.unverifiedWeight).toEqual(['Uncatalogued relic']);
  expect(s.attacks).toEqual([]);
 });
});
