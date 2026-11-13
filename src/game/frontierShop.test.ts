import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {buyFrontierItem,frontierShopStock,frontierMerchantContext,formatFrontierPrice,parseFrontierPurchase,prepareMerchantPurchase,settleMerchantPurchase,walletCopper} from './frontierShop';
function fixture(){const c=newCampaign('Shop','shop-test');return beginAdventureSession({...c,characterIdentity:{name:'Test',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},inventoryLedger:{currency:{GP:10,SP:0,CP:0,EP:0,PP:0},gear:[]}})}
describe('first visit shop',()=>{
 it('shows standard prices in gold, silver and copper',()=>{expect(formatFrontierPrice(200)).toBe('2 GP');expect(formatFrontierPrice(125)).toBe('1.25 GP');expect(formatFrontierPrice(5)).toBe('0.05 GP');expect(formatFrontierPrice(0)).toBe('0 GP')});
 it('uses the canonical item catalog and deducts exact copper pieces',()=>{const item=frontierShopStock.find(i=>i.id==='dagger')!;expect(item.costCp).toBe(200);const c=buyFrontierItem(fixture(),'dagger',2);expect(c.inventoryLedger?.currency.GP).toBe(6);expect(c.inventoryLedger?.gear).toContainEqual({name:'Dagger',quantity:2});expect(JSON.parse(JSON.stringify(c)).inventoryLedger.gear[0].quantity).toBe(2)});
 it('does not mutate a campaign on invalid, unavailable or unaffordable purchases',()=>{const c=fixture();for(const [id,q] of [['dagger',21],['greatsword',1],['dagger',6]] as const)expect(()=>buyFrontierItem(c,id,q)).toThrow();expect(c.inventoryLedger?.currency.GP).toBe(10)});
 it('exposes authoritative shop prices and wallet to merchant conversation without transactions',()=>{const c=fixture();const ctx=frontierMerchantContext(c)!;expect(ctx.items).toContainEqual({id:'potion-of-healing',name:'Potion of Healing',costCp:5000});expect(ctx.walletCp).toBe(1000);expect(ctx.purchaseRule).toContain('explicit confirmation');expect(c.inventoryLedger?.gear).toEqual([])});
 it('requires a started imported character in Frontier Village',()=>{const c=fixture();expect(()=>buyFrontierItem({...c,adventureSession:{...c.adventureSession!,site:'crossroads'}},'dagger')).toThrow('not available')});
});

describe('conversational merchant transaction lifecycle',()=>{
 it('recognizes a single listed item and refuses ambiguous or invalid requests',()=>{
  expect(parseFrontierPurchase('I will buy 2 daggers')).toEqual({itemId:'dagger',quantity:2});
  expect(parseFrontierPurchase('What do you sell?')).toBeNull();
  expect(parseFrontierPurchase('Buy 30 daggers')).toBeNull();
  expect(parseFrontierPurchase('Buy a greatsword')).toBeNull();
 });
 it('requires confirmation, survives serialization and rejects duplicate settlement',()=>{
  const initial=fixture();
  const pending=prepareMerchantPurchase(initial,'dagger',2,'transaction-1');
  expect(walletCopper(pending.inventoryLedger?.currency)).toBe(1000);
  const reloaded=JSON.parse(JSON.stringify(pending));
  const done=settleMerchantPurchase(reloaded,'transaction-1',true);
  expect(walletCopper(done.inventoryLedger?.currency)).toBe(600);
  expect(done.inventoryLedger?.gear).toContainEqual({name:'Dagger',quantity:2});
  expect(()=>settleMerchantPurchase(done,'transaction-1',true)).toThrow();
  expect(done.completedMerchantPurchaseIds).toContain('transaction-1');
 });
 it('cancels without spending and rejects insufficient funds',()=>{
  const pending=prepareMerchantPurchase(fixture(),'dagger',1,'transaction-2');
  const canceled=settleMerchantPurchase(pending,'transaction-2',false);
  expect(walletCopper(canceled.inventoryLedger?.currency)).toBe(1000);
  expect(canceled.pendingMerchantPurchase).toBeUndefined();
  expect(()=>prepareMerchantPurchase(fixture(),'potion-of-healing',1,'unaffordable')).toThrow();
  expect(()=>prepareMerchantPurchase(pending,'dagger',1,'overlap')).toThrow();
 });
});
