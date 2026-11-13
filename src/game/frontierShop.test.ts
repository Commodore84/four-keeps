import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {buyFrontierItem,frontierShopStock,frontierMerchantContext,formatFrontierPrice,parseFrontierPurchase,prepareMerchantPurchase,settleMerchantPurchase,walletCopper,remainingMerchantStock,merchantCatalog,isMerchantBrowseRequest,approveMerchantDiscount,isMerchantPurchaseRequest,merchantNegotiationTarget,beginMerchantNegotiation,resolveMerchantNegotiation} from './frontierShop';
function fixture(){const c=newCampaign('Shop','shop-test');return beginAdventureSession({...c,characterIdentity:{name:'Test',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},inventoryLedger:{currency:{GP:10,SP:0,CP:0,EP:0,PP:0},gear:[]}})}
describe('deterministic merchant negotiation check lifecycle',()=>{
 const pending=(token='social-1')=>({...fixture(),pendingCheck:{token,skill:'Persuasion' as const,mode:'normal' as const,reason:'Negotiate the dagger price'}});
 it('requires an authoritative matching social check before any discount',()=>{
  const c=pending();
  expect(()=>beginMerchantNegotiation(c,'dagger','wrong','Persuasion')).toThrow();
  expect(()=>beginMerchantNegotiation(c,'dagger','social-1','Athletics')).toThrow();
  const prepared=beginMerchantNegotiation(c,'dagger','social-1','Persuasion');
  expect(prepared.merchantDiscount).toBeUndefined();
  expect(prepared.pendingMerchantNegotiation?.itemId).toBe('dagger');
  const saved=JSON.parse(JSON.stringify(prepared));
  expect(()=>resolveMerchantNegotiation(saved,'other',true,22)).toThrow();
  const approved=resolveMerchantNegotiation(saved,'social-1',true,22);
  expect(approved.merchantDiscount).toMatchObject({itemId:'dagger',percent:20});
  expect(approved.pendingMerchantNegotiation).toBeUndefined();
  expect(()=>resolveMerchantNegotiation(approved,'social-1',true,22)).toThrow();
 });
 it('refuses failed bargains and grants only 10% for ordinary successful checks',()=>{
  const c=beginMerchantNegotiation(pending(),'dagger','social-1','Persuasion');
  expect(resolveMerchantNegotiation(c,'social-1',false,25).merchantDiscount).toBeUndefined();
  expect(resolveMerchantNegotiation(c,'social-1',true,15).merchantDiscount?.percent).toBe(10);
  const approved=resolveMerchantNegotiation(c,'social-1',true,15);
  const purchase=prepareMerchantPurchase(approved,'dagger',1,'negotiated');
  expect(purchase.pendingMerchantPurchase?.unitCostCp).toBe(180);
  expect(settleMerchantPurchase(purchase,'negotiated',true).inventoryLedger?.currency.GP).toBe(8);
 });
});
describe('2024 merchant catalog compatibility and ammunition',()=>{
 it('sells only canonical entries from the explicitly selected merchant stock',()=>{
  expect(frontierShopStock.every(item=>item.official2024)).toBe(true);
  expect(frontierShopStock.some(item=>item.id==='greatsword')).toBe(false);
  expect(frontierShopStock.find(item=>item.id==='bolts')).toMatchObject({costCp:5});
  expect(frontierShopStock.find(item=>item.id==='bullets-sling')).toMatchObject({costCp:4,packQuantity:20});
  expect(merchantCatalog(fixture())).toContain('per pack of 20');
 });
 it('prices sling bullets by a 20-piece pack in integer copper and persists stock and ammunition',()=>{
  const c=fixture();
  const pending=prepareMerchantPurchase(c,'bullets-sling',2,'pack-1');
  expect(pending.pendingMerchantPurchase?.unitCostCp).toBe(4);
  expect(pending.inventoryLedger).toEqual(c.inventoryLedger);
  const bought=settleMerchantPurchase(JSON.parse(JSON.stringify(pending)),'pack-1',true);
  expect(bought.inventoryLedger?.gear).toContainEqual({name:'Bullets, Sling (20)',quantity:40});
  expect(walletCopper(bought.inventoryLedger?.currency)).toBe(992);
  expect(remainingMerchantStock(bought,'bullets-sling')).toBe(3);
  expect(()=>settleMerchantPurchase(bought,'pack-1',true)).toThrow();
 });
 it('rejects unlisted merchandise and tampered discount without spending money',()=>{
  const c=fixture();
  expect(isMerchantPurchaseRequest('I will buy a greatsword')).toBe(true);
  expect(merchantNegotiationTarget('Can you discount the dagger?')).toBe('dagger');
  expect(merchantNegotiationTarget('Can you discount everything?')).toBeNull();
  expect(merchantNegotiationTarget('Can you discount the dagger and rope?')).toBeNull();
  expect(parseFrontierPurchase('I will buy a greatsword')).toBeNull();
  expect(parseFrontierPurchase('I will buy 2 packs of sling bullets')).toEqual({itemId:'bullets-sling',quantity:2});
  expect(parseFrontierPurchase('I will buy 3 crossbow bolts')).toEqual({itemId:'bolts',quantity:3});
  expect(()=>prepareMerchantPurchase(c,'greatsword',1,'no-stock')).toThrow();
  const tampered={...c,merchantDiscount:{itemId:'dagger',percent:90,approvalId:'invalid'}};
  expect(()=>prepareMerchantPurchase(tampered,'dagger',1,'bad-discount')).toThrow();
  expect(c.inventoryLedger?.currency.GP).toBe(10);
 });
});
describe('first visit shop',()=>{
 it('shows standard prices in gold, silver and copper',()=>{expect(formatFrontierPrice(200)).toBe('2 GP');expect(formatFrontierPrice(125)).toBe('1.25 GP');expect(formatFrontierPrice(5)).toBe('0.05 GP');expect(formatFrontierPrice(0)).toBe('0 GP')});
 it('uses the canonical item catalog and deducts exact copper pieces',()=>{const item=frontierShopStock.find(i=>i.id==='dagger')!;expect(item.costCp).toBe(200);const c=buyFrontierItem(fixture(),'dagger',2);expect(c.inventoryLedger?.currency.GP).toBe(6);expect(c.inventoryLedger?.gear).toContainEqual({name:'Dagger',quantity:2});expect(JSON.parse(JSON.stringify(c)).inventoryLedger.gear[0].quantity).toBe(2)});
 it('does not mutate a campaign on invalid, unavailable or unaffordable purchases',()=>{const c=fixture();for(const [id,q] of [['dagger',21],['greatsword',1],['dagger',6]] as const)expect(()=>buyFrontierItem(c,id,q)).toThrow();expect(c.inventoryLedger?.currency.GP).toBe(10)});
 it('exposes authoritative shop prices and wallet to merchant conversation without transactions',()=>{const c=fixture();const ctx=frontierMerchantContext(c)!;expect(ctx.items).toContainEqual({id:'potion-of-healing',name:'Potion of Healing',costCp:5000,packQuantity:1,remaining:3});expect(ctx.walletCp).toBe(1000);expect(ctx.purchaseRule).toContain('explicit confirmation');expect(c.inventoryLedger?.gear).toEqual([])});
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

describe('finite stock and bounded merchant prices',()=>{
 it('lists actual quantities and rejects purchases beyond stock',()=>{
  const c=fixture();expect(isMerchantBrowseRequest('What do you sell?')).toBe(true);
  expect(merchantCatalog(c)).toContain('Dagger: 2 GP each (8 available)');
  expect(()=>prepareMerchantPurchase(c,'dagger',9,'too-many')).toThrow('stock');
  const bought=buyFrontierItem(c,'dagger',2);
  expect(remainingMerchantStock(bought,'dagger')).toBe(6);
  expect(remainingMerchantStock(JSON.parse(JSON.stringify(bought)),'dagger')).toBe(6);
  expect(()=>buyFrontierItem(bought,'dagger',7)).toThrow('stock');
 });
 it('bounds DM-approved discounts and consumes them on purchase',()=>{
  const c=fixture();
  expect(()=>approveMerchantDiscount(c,'dagger',25,'bad')).toThrow();
  const discounted=approveMerchantDiscount(c,'dagger',20,'dm-approved');
  const pending=prepareMerchantPurchase(discounted,'dagger',2,'txn');
  expect(pending.pendingMerchantPurchase?.unitCostCp).toBe(160);
  const settled=settleMerchantPurchase(pending,'txn',true);
  expect(walletCopper(settled.inventoryLedger?.currency)).toBe(680);
  expect(settled.merchantDiscount).toBeUndefined();
  expect(remainingMerchantStock(settled,'dagger')).toBe(6);
 });
});
