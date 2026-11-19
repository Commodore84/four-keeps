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
  const req={name:'Potion of Healing' as const,confirmed:true,expectedQuantity:1,expectedHP:5,rollDie:()=>4};
  expect(()=>useOwnedHealingPotion(campaign,{...req,confirmed:false})).toThrow('confirmation');
  const used=useOwnedHealingPotion(campaign,req);
  expect(used.character?.currentHitPoints).toBe(15);
  expect(used.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(campaign.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(()=>useOwnedHealingPotion(used,req)).toThrow('Stale character HP');
  expect(()=>useOwnedHealingPotion({...campaign,companionEncounter:{status:'active'} as Campaign['companionEncounter']},req)).toThrow('Encounter');
 });
});
