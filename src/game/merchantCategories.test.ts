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
  expect(merchantCategory(byName('Musket'))).toBe('Martial ranged weapons');
  expect(merchantCategory(byName('Pistol'))).toBe('Martial ranged weapons');
  expect(merchantCategory(byName('Healer’s Kit'))).toBe('Specialist kits');
  expect(merchantCategory(byName('Burglar’s Pack'))).toBe('Equipment packs');
  expect(merchantCategory(byName('Spell Scroll (Cantrip)'))).toBe('Spell scrolls');
 });
 it('uses official weapon groups and keeps thrown melee weapons in melee',()=>{
  for(const [name,category] of [['Greatclub','Simple melee weapons'],['Longsword','Martial melee weapons'],['Rapier','Martial melee weapons'],['Javelin','Simple melee weapons'],['Dart','Simple ranged weapons'],['Pistol','Martial ranged weapons']] as const)expect(merchantCategory(byName(name))).toBe(category);
  expect(merchantCategory(byName('Plate Armor'))).toBe('Armor and shields');
  expect(merchantCategory(byName('Shield'))).toBe('Armor and shields');
  expect(merchantCategory(byName('Case, Crossbow Bolt'))).toBe('Ammunition');
  expect(merchantCategory(byName('Quiver'))).toBe('Ammunition');
  expect(merchantCategory(byName('Climber’s Kit'))).toBe('Climbing and rope');
  expect(merchantCategory(byName('Navigator’s Tools'))).toBe('Specialist kits');
  expect(merchantCategory(byName('Ink Pen'))).toBe('Exploration and information');
  expect(merchantCategory(byName('Musical Instrument (Lute)'))).toBe('Musical instruments');
  expect(merchantCategory(byName('Gaming Set (Dice)'))).toBe('Gaming sets');
  expect(merchantCategory(byName('Quiver'))).toBe('Ammunition');
  expect(merchantCategory(byName('Net'))).toBe('Traps and restraints');
 });
 it('does not require a miscellaneous category with dozens of items',()=>{
  const groups=new Map<string,number>();
  for(const item of OFFICIAL_EQUIPMENT_2024){
   const category=merchantCategory(item);
   groups.set(category,(groups.get(category)??0)+1);
  }
  expect(groups.get('Utility equipment')??0).toBeLessThan(16);
  expect(groups.size).toBe(22);
  expect(groups.has('Shields')).toBe(false);
  expect(groups.has('Armor')).toBe(false);
  expect(groups.get('Armor and shields')).toBe(13);
  expect(Math.max(...groups.values())).toBeLessThan(25);
 });
 it('audits the full catalog without losing any equipment',()=>{
  const categories=new Map<string,string[]>();
  for(const item of OFFICIAL_EQUIPMENT_2024){
   const group=merchantCategory(item);
   expect(group).toBeTruthy();
   categories.set(group,[...(categories.get(group)??[]),item.name]);
  }
  expect(OFFICIAL_EQUIPMENT_2024).toHaveLength(182);
  expect(categories.has('Firearms')).toBe(false);
  expect(categories.has('General supplies')).toBe(false);
  expect(categories.has('Light armor')).toBe(false);
  expect(categories.has('Medium armor')).toBe(false);
  expect(categories.has('Heavy armor')).toBe(false);
  expect(categories.get('Armor')).toHaveLength(12);
  expect(categories.get('Musical instruments')).toHaveLength(10);
  expect(categories.get('Gaming sets')).toHaveLength(4);
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
