import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {prepareCitySupplyOrder,confirmCitySupplyOrder,collectCitySupplyOrder,resupplyTravelingMerchant,isSupplierBrowseRequest} from './merchantSupply';
import {remainingMerchantStock,merchantStockKeyForCampaign,walletCopper} from './frontierShop';
const fixture=()=>beginAdventureSession({...newCampaign('Supplier','supplier-test'),location:'Dasahi',merchantSettlementTier:'city' as const,characterIdentity:{name:'Tester',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},inventoryLedger:{currency:{GP:100,SP:0,CP:0,EP:0,PP:0},gear:[]}});
describe('city supplier order lifecycle',()=>{
 it('requires confirmation, charges once, and grants only at collection',()=>{
  const c=fixture();
  const quote=prepareCitySupplyOrder(c,'dagger',2,'order-1');
  expect(quote.inventoryLedger?.currency.GP).toBe(100);
  const paid=confirmCitySupplyOrder(JSON.parse(JSON.stringify(quote)),'order-1',true);
  expect(walletCopper(paid.inventoryLedger?.currency)).toBe(9600);
  expect(paid.inventoryLedger?.gear).toEqual([]);
  expect(()=>confirmCitySupplyOrder(paid,'order-1',true)).toThrow();
  expect(()=>collectCitySupplyOrder(paid,'order-1')).toThrow();
  const arrived={...paid,elapsedMinutes:paid.merchantSupplyOrders![0].readyAtMinutes};
  const collected=collectCitySupplyOrder(JSON.parse(JSON.stringify(arrived)),'order-1');
  expect(collected.inventoryLedger?.gear.find(x=>x.name==='Dagger')?.quantity).toBe(2);
  expect(()=>collectCitySupplyOrder(collected,'order-1')).toThrow();
 });
 it('cancels without charging and rejects changed-city collection',()=>{
  const quote=prepareCitySupplyOrder(fixture(),'dagger',1,'order-2');
  expect(confirmCitySupplyOrder(quote,'order-2',false).inventoryLedger?.currency.GP).toBe(100);
  const paid=confirmCitySupplyOrder(quote,'order-2',true);
  expect(()=>collectCitySupplyOrder({...paid,location:'Miwillia',elapsedMinutes:10080},'order-2')).toThrow();
 });
});
describe('trader route arrival resupply',()=>{
 it('resupplies once per arrival and never refreshes merely because a week passes',()=>{
  const c={...fixture(),location:'Trade Road',merchantSettlementTier:'traveling' as const,merchantShopType:'trader' as const};
  const key=merchantStockKeyForCampaign(c,'trader','torch');
  const exhausted={...c,merchantStockRemaining:{[key]:0},elapsedMinutes:20000};
  expect(remainingMerchantStock(exhausted,'torch')).toBe(0);
  const supplied=resupplyTravelingMerchant(exhausted,'north-road','arrival-1');
  expect(remainingMerchantStock(supplied,'torch')).toBeGreaterThan(0);
  expect(resupplyTravelingMerchant(supplied,'north-road','arrival-1')).toBe(supplied);
 });
});

describe('supplier conversation intent',()=>{
 it('opens controls for explicit merchandise ordering without triggering unrelated questions',()=>{
  expect(isSupplierBrowseRequest('Can you special-order a sword that is out of stock?')).toBe(true);
  expect(isSupplierBrowseRequest('Could the blacksmith procure a shield?')).toBe(true);
  expect(isSupplierBrowseRequest('What rumors have you heard about the merchant guild?')).toBe(false);
  expect(isSupplierBrowseRequest('Where is the blacksmith?')).toBe(false);
 });
});

describe('supplier persistence and quote expiration',()=>{
 it('preserves paid orders through reload and refuses a second collection',()=>{
  const base=fixture();
  const quote=prepareCitySupplyOrder(base,'dagger',1,'reload-order');
  const paid=confirmCitySupplyOrder(JSON.parse(JSON.stringify(quote)),'reload-order',true);
  const delivered=JSON.parse(JSON.stringify({...paid,elapsedMinutes:paid.merchantSupplyOrders![0].readyAtMinutes}));
  const once=collectCitySupplyOrder(delivered,'reload-order');
  const twice=JSON.parse(JSON.stringify(once));
  expect(()=>collectCitySupplyOrder(twice,'reload-order')).toThrow();
  expect(walletCopper(twice.inventoryLedger.currency)).toBe(walletCopper(paid.inventoryLedger?.currency));
 });
 it('rejects a quote whose delivery window has already elapsed without charging',()=>{
  const quote=prepareCitySupplyOrder(fixture(),'dagger',1,'expired-quote');
  const later={...quote,elapsedMinutes:quote.pendingMerchantSupplyOrder!.readyAtMinutes+1};
  expect(()=>confirmCitySupplyOrder(later,'expired-quote',true)).toThrow('expired');
  expect(walletCopper(later.inventoryLedger?.currency)).toBe(10000);
 });
});
