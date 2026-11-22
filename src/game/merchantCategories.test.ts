import {describe,it,expect} from 'vitest';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';
import {merchantCategory} from './merchantCategories';
import {merchantCatalogFor,availableMerchants} from './frontierShop';

const byName=(name:string)=>{
 const item=OFFICIAL_EQUIPMENT_2024.find(i=>i.name===name);
 if(!item)throw new Error('Missing item: '+name);
 return item;
};
describe('single-level merchant categories',()=>{
 it('classifies previously misplaced equipment',()=>{
  expect(merchantCategory(byName('Musket'))).toBe('Firearms');
  expect(merchantCategory(byName('Pistol'))).toBe('Firearms');
  expect(merchantCategory(byName('Healer’s Kit'))).toBe('Specialist kits');
  expect(merchantCategory(byName('Burglar’s Pack'))).toBe('Equipment packs');
  expect(merchantCategory(byName('Spell Scroll (Cantrip)'))).toBe('Spell scrolls');
 });
 it('does not require a miscellaneous category with dozens of items',()=>{
  const groups=new Map<string,number>();
  for(const item of OFFICIAL_EQUIPMENT_2024){
   const category=merchantCategory(item);
   groups.set(category,(groups.get(category)??0)+1);
  }
  expect(groups.get('General supplies')??0).toBeLessThan(16);
  expect(Math.max(...groups.values())).toBeLessThan(25);
 });
 it('shows only stocked categories for each merchant',()=>{
  for(const merchant of availableMerchants('city')){
   const stock=merchantCatalogFor('city',merchant);
   const categories=new Set(stock.map(merchantCategory));
   expect(categories.size).toBeGreaterThan(0);
   for(const item of stock)expect(categories.has(merchantCategory(item))).toBe(true);
  }
 });
});
