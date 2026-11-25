import {describe,it,expect} from 'vitest';
import type {Campaign} from './campaign';
import {authorizeQuestMagicSale,completeQuestMagicSale,pendingQuestMagicOffer} from './frontierShop';
const base=()=>({characterIdentity:{name:'Tester'},adventureSession:{site:'frontier',status:'exploring'},journal:[{id:'dm-1',kind:'dm',text:'Collector offers to buy Bag of Holding for quest-1',createdAt:'2026-01-01'}],inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Bag of Holding',quantity:2}]}} as Campaign);
const terms={buyer:'Collector',questId:'quest-1',itemName:'Bag of Holding',quantity:1,proceedsCp:12500,approvalId:'dm-1'};
describe('DM-approved quest magic resale',()=>{
 it('requires valid approval and owned inventory',()=>{
  expect(()=>authorizeQuestMagicSale(base(),{...terms,approvalId:''})).toThrow();
  expect(()=>authorizeQuestMagicSale({...base(),journal:[]},terms)).toThrow(/DM must/);
  expect(()=>authorizeQuestMagicSale(base(),{...terms,quantity:3})).toThrow();
  expect(()=>authorizeQuestMagicSale(base(),{...terms,itemName:'Dagger'})).toThrow();
 });
 it('transfers exactly once and leaves input unchanged',()=>{
  const original=base();const approved=authorizeQuestMagicSale(original,terms);
  expect(original.magicSaleAuthorization).toBeUndefined();
  const sold=completeQuestMagicSale(approved,'dm-1');
  expect(sold.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(sold.inventoryLedger?.currency.PP).toBe(12);
  expect(sold.inventoryLedger?.currency.GP).toBe(5);
  expect(()=>completeQuestMagicSale(sold,'dm-1')).toThrow();
  expect(()=>authorizeQuestMagicSale(sold,terms)).toThrow();
 });
 it('only recognizes explicit DM journal sale offers',()=>{
  const c=base();const journal=[...c.journal,{id:'dm-2',kind:'dm' as const,text:'Magic-item buyer: Collector; quest: quest-1; item: Bag of Holding; quantity: 1; offer: 12500 CP',createdAt:'2026-01-01'}];
  expect(pendingQuestMagicOffer({...c,journal})?.proceedsCp).toBe(12500);
  expect(pendingQuestMagicOffer({...c,journal:[...c.journal,{...journal[1],kind:'player'}]})).toBeUndefined();
 });
 it('rejects wallet overflow and duplicate replay after serialization',()=>{
  const c=base();const approved=authorizeQuestMagicSale(c,terms);
  const huge={...approved,inventoryLedger:{...approved.inventoryLedger!,currency:{CP:0,SP:0,EP:0,GP:Number.MAX_SAFE_INTEGER,PP:0}}};
  expect(()=>completeQuestMagicSale(huge,'dm-1')).toThrow(/overflow/);
  const restored=JSON.parse(JSON.stringify(completeQuestMagicSale(approved,'dm-1'))) as Campaign;
  expect(restored.completedMagicSales).toContain('dm-1');
  expect(pendingQuestMagicOffer(restored)).toBeUndefined();
 });
 it('does not mutate when inventory changes before settlement',()=>{
  const approved=authorizeQuestMagicSale(base(),terms);
  const changed={...approved,inventoryLedger:{...approved.inventoryLedger!,gear:[]}};
  expect(()=>completeQuestMagicSale(changed,'dm-1')).toThrow();
  expect(changed.magicSaleAuthorization).toEqual(terms);
 });
});
