import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {prepareCitySupplyOrder,confirmCitySupplyOrder,collectCitySupplyOrder,resupplyTravelingMerchant} from './merchantSupply';
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
