import {carryingCapacity} from './carryingCapacity';
import {nighthawkEquippedAttack} from './companionEncounter';
import {describe,expect,it} from 'vitest';
import {newCampaign} from './campaign';
import type {Campaign} from './campaign';
import {activeTemporaryEffects} from './temporaryEffects';
import {useOwnedConsumable,advanceConsumableTime,type ConsumableRequest} from './consumables';
import {addCompanionEnemy,damageCompanion,endCompanionTurn,escapeItemWeb,freeHuntingTrapTarget,moveCompanion,
 pendingWebSave,resolveWebTurnSave,setCompanionConcentration,startUnifiedEncounter,thrownConsumableTargets} from './companionEncounter';
import {castOwnedSpellScroll} from './spellScrolls';
import {magicWandStatus,rechargeMagicWand,selectMagicWandCopy,spendMagicWand} from './magicEquipment';
import {discardInventoryItem} from './inventoryDiscard';

const restore=(c:Campaign)=>JSON.parse(JSON.stringify(c)) as Campaign;
function owned(gear:{name:string;quantity:number}[],classId='wizard'){
 const base=newCampaign('Phase 2');
 return {...base,characterIdentity:{name:'Tester',speciesId:'elf',classId,backgroundId:'sage',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},
  character:{...base.character!,level:classId==='rogue'?7:1,...(classId==='rogue'?{subclass:'Arcane Trickster'}:{})},
  inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear}} as Campaign;
}
function arena(c:Campaign){
 return addCompanionEnemy(startUnifiedEncounter(c,{nighthawk:20},{nighthawk:{x:2,y:2}},{}),'guard',10,{x:4,y:2},20,12,3);
}
function request(c:Campaign,name:ConsumableRequest['name'],id:string):ConsumableRequest{
 const b=c.companionEncounter;
 return {name,requestId:id,confirmed:true,expectedQuantity:1,expectedElapsedMinutes:c.elapsedMinutes??0,
  ...(b?{expectedEncounterId:b.id,expectedTurnIndex:b.turnIndex,expectedRound:b.round,expectedActorPosition:{x:2,y:2}}:{})};
}
describe('Phase 2 consumable transactions',()=>{
 it('persists potion resistance, applies it to typed damage, and stops applying it at expiry',()=>{
  const campaign=arena(owned([{name:'Potion of Resistance',quantity:1}]));
  const action={...request(campaign,'Potion of Resistance','resist'),resistanceType:'Fire' as const};
  const applied=restore(useOwnedConsumable(campaign,action));
  expect(applied.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(applied.companionEncounter?.participants.nighthawk.bonusActionUsed).toBe(true);
  expect(useOwnedConsumable(applied,action)).toBe(applied);
  const hp=applied.companionEncounter!.participants.nighthawk.hp;
  expect(damageCompanion(applied,'nighthawk',5,'Fire').companionEncounter?.participants.nighthawk.hp).toBe(hp-2);
  const expired=advanceConsumableTime(applied,60);
  expect(activeTemporaryEffects(expired)).toEqual([]);
  expect(damageCompanion(expired,'nighthawk',5,'Fire').companionEncounter?.participants.nighthawk.hp).toBe(hp-5);
 });
 it('uses temporary Strength for carrying and attacks without rewriting the saved score',()=>{
  const c=owned([{name:'Potion of Hill Giant Strength',quantity:1},{name:'Club',quantity:1}]);
  const base={...c,encounterLoadout:{weaponId:'club'}};
  const potion=useOwnedConsumable(base,request(base,'Potion of Hill Giant Strength','strength'));
  expect(carryingCapacity(potion)).toBe(315);
  expect(nighthawkEquippedAttack(potion)?.damageModifier).toBe(5);
  expect(potion.character?.scores.str).toBe(base.character?.scores.str);
  const expired=advanceConsumableTime(potion,60);
  expect(carryingCapacity(expired)).toBe(carryingCapacity(base));
 });
 it('uses a trap, validates the d4, restricts movement and charges the escape action',()=>{
  const c=arena(owned([{name:'Hunting Trap',quantity:1}],'rogue'));
  const set=useOwnedConsumable(c,{...request(c,'Hunting Trap','trap'),ground:{x:3,y:2,anchored:true,level:true}});
  const enemy=endCompanionTurn(set,'nighthawk');
  expect(()=>moveCompanion(enemy,'guard',3,2,12)).toThrow('d4');
  const caught=restore(moveCompanion(enemy,'guard',3,2,12,4));
  expect(caught.companionEncounter?.participants.guard.hp).toBe(16);
  expect(()=>moveCompanion(caught,'guard',4,2)).toThrow('cannot move');
  const trapped=freeHuntingTrapTarget(caught,'guard',12);
  expect(trapped.companionEncounter?.participants.guard.hp).toBe(15);
  expect(trapped.companionEncounter?.participants.guard.actionUsed).toBe(true);
 });
 it('enables thrown gear for an advanced Rogue and spends an Action',()=>{
  const c=arena(owned([{name:'Acid',quantity:1}],'rogue'));
  expect(thrownConsumableTargets(c)).toContain('guard');
  const used=useOwnedConsumable(c,{...request(c,'Acid','acid'),targetId:'guard',expectedTargetHP:20,expectedTargetPosition:{x:4,y:2},throwRolls:{saveTotal:1,damage:8}});
  expect(used.companionEncounter?.participants.guard.hp).toBe(12);
  expect(used.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
 });
 it('keeps wand copies independent through reload, combat, recharge and discard',()=>{
  const id='wand-of-magic-missiles';
  const c=selectMagicWandCopy(owned([{name:'Wand of Magic Missiles',quantity:2}]),id,1);
  const active=arena(c);
  const spell={id:'wand',confirmed:true,target:'guard',spent:1,copyIndex:1,missile:{targets:['guard','guard','guard'],dice:[1,2,3]}};
  expect(()=>spendMagicWand(active,id,{...spell,spent:2})).toThrow('dart');
  const used=restore(spendMagicWand(active,id,spell));
  expect(used.companionEncounter?.participants.guard.hp).toBe(11);
  expect(magicWandStatus(used,id)?.copies.map(copy=>copy.charges)).toEqual([7,6]);
  expect(()=>spendMagicWand(used,id,spell)).toThrow('already recorded');
  const dawn={...c,magicEquipment:used.magicEquipment,elapsedMinutes:1440};
  const recharged=rechargeMagicWand(dawn,id,1,1);
  expect(magicWandStatus(recharged,id)?.charges).toBe(7);
  expect(magicWandStatus(discardInventoryItem(dawn,'Wand of Magic Missiles',1,2),id)?.copies.map(copy=>copy.charges)).toEqual([7]);
 });
 it('consumes a failed higher-level scroll and resolves Web for an Arcane Trickster',()=>{
  const name='Spell Scroll (Level 2): Web';
  const wizard=arena(owned([{name,quantity:1}]));
  const input={requestId:'scroll',itemName:name,spell:'Web',dmConfirmed:true,web:{x:3,y:2,anchored:true}};
  expect(()=>castOwnedSpellScroll(wizard,input)).toThrow('DC 12');
  const failed=castOwnedSpellScroll(wizard,{...input,checkRoll:1});
  expect(failed.inventoryLedger?.gear).toHaveLength(0);
  expect(failed.companionEncounter?.web).toBeUndefined();
  const rogue=arena(owned([{name,quantity:1}],'rogue'));
  const cast=restore(castOwnedSpellScroll(rogue,input));
  expect(cast.inventoryLedger?.gear).toHaveLength(0);
  expect(cast.character?.spellSlots).toEqual(rogue.character?.spellSlots);
  const enemy=endCompanionTurn(cast,'nighthawk');
  expect(pendingWebSave(enemy.companionEncounter!)).toBe('guard');
  const restrained=resolveWebTurnSave(enemy,3);
  expect(restrained.companionEncounter?.participants.guard.conditions).toContain('Restrained');
  const escaped=escapeItemWeb(restrained,13);
  expect(escaped.companionEncounter?.participants.guard.conditions).not.toContain('Restrained');
  expect(setCompanionConcentration(restrained,'nighthawk',null).companionEncounter?.web).toBeUndefined();
 });
});
