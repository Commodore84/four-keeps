import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {carryingCapacity,carriedWeight,purchaseWeightAfter,purchaseWeight} from './carryingCapacity';
const make=()=>({...newCampaign('Carry','carry-test'),character:{...newCampaign('Carry','carry-test').character!,scores:{str:8,dex:10,con:10,int:10,wis:10,cha:10}},inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:10,PP:0},gear:[{name:'Arrows',quantity:40}]}});
describe('2024 carrying capacity and merchant weight projections',()=>{
 it('counts coins and ammunition even when arrows are carried outside a quiver',()=>{
  const c=make();expect(carryingCapacity(c)).toBe(120);expect(carriedWeight(c).weight).toBeCloseTo(2.2);
 });
 it('projects three 20-arrow bundles, including change in coin weight',()=>{
  const c=make();const projected=purchaseWeightAfter(c,[{itemId:'arrows',quantity:60}],300)!;
  expect(projected.weight).toBeCloseTo(5.14);expect(projected.capacity).toBe(120);
 });
 it('counts the individual contents of equipment packs',()=>{expect(purchaseWeight('burglar-s-pack',1)).toBeGreaterThan(10);});
 it('flags unrecognized gear instead of pretending it is weightless',()=>{expect(carriedWeight({...make(),inventoryLedger:{...make().inventoryLedger,gear:[{name:'Unlisted artifact',quantity:1}]}}).unknown).toEqual(['Unlisted artifact']);});
});
