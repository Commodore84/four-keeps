import {describe,it,expect} from 'vitest';
import {HEALING_POTIONS,healingPotionAmount,isHealingPotion,useOwnedHealingPotion} from './healingPotions';
import type {Campaign} from './campaign';
import {MAGIC_ITEMS} from './magicWishlist';
describe('SRD 5.2.1 healing potions',()=>{
 it('preserves all four precise dice formulas and rarity tiers',()=>{
  expect(Object.values(HEALING_POTIONS).map(x=>[x.dice,x.faces,x.bonus,x.rarity])).toEqual([[2,4,2,'Common'],[4,4,4,'Uncommon'],[8,4,8,'Rare'],[10,4,20,'Very Rare']]);
 });
 it('rolls bounded healing and rejects invalid dice',()=>{
  for(const [name,formula] of Object.entries(HEALING_POTIONS)){
   expect(healingPotionAmount(name as keyof typeof HEALING_POTIONS,()=>1)).toBe(formula.dice+formula.bonus);
   expect(healingPotionAmount(name as keyof typeof HEALING_POTIONS,()=>4)).toBe(formula.dice*4+formula.bonus);
  }
  expect(()=>healingPotionAmount('Potion of Healing',()=>5)).toThrow('Invalid healing die');
 });
 it('never treats wishlist-only catalog records as owned consumables',()=>{
  expect(isHealingPotion('Potions of Healing')).toBe(false);
  expect(isHealingPotion('Potion of Healing (greater)')).toBe(true);
  expect(MAGIC_ITEMS.find(x=>x.id==='potions-of-healing')?.mechanics?.verification).toBe('verified-srd');
 });
 it('requires confirmation, owned stock and fresh HP/quantity; consumes exactly once',()=>{
  const campaign={character:{currentHitPoints:5,maxHitPoints:20},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion of Healing',quantity:1}]}} as Campaign;
  const req={name:'Potion of Healing' as const,confirmed:true,expectedQuantity:1,expectedHP:5,rollDie:()=>4,requestId:'use-1'};
  expect(()=>useOwnedHealingPotion(campaign,{...req,confirmed:false})).toThrow('confirmation');
  const used=useOwnedHealingPotion(campaign,req);
  expect(used.character?.currentHitPoints).toBe(15);
  expect(used.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(campaign.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(useOwnedHealingPotion(used,req)).toBe(used);
  expect(()=>useOwnedHealingPotion({...campaign,companionEncounter:{status:'active'} as Campaign['companionEncounter']},req)).toThrow('Bonus Action');
 });
 it('enforces unified encounter turn, Bonus Action, and synchronized HP',()=>{
  const campaign={character:{currentHitPoints:5,maxHitPoints:20},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion of Healing',quantity:1}]},companionEncounter:{status:'active',mode:'unified',log:[],turnIndex:0,order:['nighthawk'],participants:{nighthawk:{hp:5,maxHp:20,bonusActionUsed:false}}}} as unknown as Campaign;
  const req={name:'Potion of Healing' as const,confirmed:true,expectedQuantity:1,expectedHP:5,rollDie:()=>4,requestId:'encounter-use'};
  const next=useOwnedHealingPotion(campaign,req);
  expect(next.companionEncounter?.participants.nighthawk.bonusActionUsed).toBe(true);
  expect(next.companionEncounter?.participants.nighthawk.hp).toBe(15);
  expect(next.character?.currentHitPoints).toBe(15);
  expect(()=>useOwnedHealingPotion(next,{...req,requestId:'another',expectedQuantity:0,expectedHP:15})).toThrow('Bonus Action');
  expect(()=>useOwnedHealingPotion({...campaign,companionEncounter:{...campaign.companionEncounter!,order:['enemy']}},req)).toThrow('Bonus Action');
  expect(()=>useOwnedHealingPotion({...campaign,companionEncounter:{...campaign.companionEncounter!,participants:{nighthawk:{...campaign.companionEncounter!.participants.nighthawk,hp:4}}}},req)).toThrow('snapshot');
 });
 it('rejects stale inventory and stale HP, never healing or consuming on a failed attempt',()=>{
  const campaign={character:{currentHitPoints:5,maxHitPoints:20},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion of Healing',quantity:2}]}} as Campaign;
  const req={name:'Potion of Healing' as const,confirmed:true,expectedQuantity:2,expectedHP:5,rollDie:()=>4,requestId:'stale-1'};
  expect(()=>useOwnedHealingPotion(campaign,{...req,expectedQuantity:1})).toThrow('Stale');
  expect(()=>useOwnedHealingPotion(campaign,{...req,expectedHP:6})).toThrow('Stale');
  expect(()=>useOwnedHealingPotion({...campaign,character:{...campaign.character!,currentHitPoints:20}}, {...req,expectedHP:20})).toThrow('cannot heal');
  expect(campaign.inventoryLedger?.gear[0].quantity).toBe(2);
 });
});
