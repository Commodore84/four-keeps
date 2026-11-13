import {describe,expect,it} from 'vitest';
import {ITEMS,ITEM_BY_ID} from './creationEquipment';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';
import {frontierShopStock} from './frontierShop';

describe('D&D 2024 equipment source audit',()=>{
 it('contains the official equipment tables without duplicate identifiers or invalid copper values',()=>{
  expect(OFFICIAL_EQUIPMENT_2024).toHaveLength(182);
  expect(new Set(OFFICIAL_EQUIPMENT_2024.map(item=>item.id)).size).toBe(182);
  expect(OFFICIAL_EQUIPMENT_2024.filter(item=>item.category==='weapon')).toHaveLength(38);
  expect(OFFICIAL_EQUIPMENT_2024.filter(item=>item.category==='armor')).toHaveLength(12);
  expect(OFFICIAL_EQUIPMENT_2024.filter(item=>item.category==='shield')).toHaveLength(1);
  expect(OFFICIAL_EQUIPMENT_2024.filter(item=>item.category==='tool')).toHaveLength(37);
  for(const item of OFFICIAL_EQUIPMENT_2024){
   expect(item.official2024).toBe(true);
   expect(Number.isSafeInteger(item.costCp)).toBe(true);
   expect(item.costCp).toBeGreaterThan(0);
   expect(Number.isFinite(item.weight)).toBe(true);
   expect(item.weight).toBeGreaterThanOrEqual(0);
   expect(ITEM_BY_ID[item.id]).toEqual(item);
  }
 });
 it('retains original equipment identifiers for previously saved campaigns',()=>{
  for(const id of ['dagger','rope','torch','rations','waterskin','arrows','potion-of-healing','crossbow-bolts','sling-bullets','spellbook','thieves-tools']){
   expect(ITEM_BY_ID[id]).toBeDefined();
  }
  expect(ITEMS.length).toBeGreaterThan(OFFICIAL_EQUIPMENT_2024.length);
 });
 it('uses 2024 weapon costs, damage, mastery, weights and armor rules',()=>{
  expect(ITEM_BY_ID['dagger']).toMatchObject({costCp:200,weight:1,damage:'1d4 piercing',mastery:'Nick',weaponGroup:'simple'});
  expect(ITEM_BY_ID['dart']).toMatchObject({costCp:5,weight:.25,mastery:'Vex'});
  expect(ITEM_BY_ID['musket']).toMatchObject({costCp:50000,weight:10,mastery:'Slow'});
  expect(ITEM_BY_ID['half-plate-armor']).toMatchObject({costCp:75000,weight:40,baseAC:15,dexCap:2,stealthDisadvantage:true});
  expect(ITEM_BY_ID['plate-armor']).toMatchObject({costCp:150000,weight:65,baseAC:18,strength:15});
  expect(ITEM_BY_ID['shield']).toMatchObject({costCp:1000,weight:6,category:'shield'});
 });
 it('uses canonical adventuring gear, tools and ammunition without fractional copper',()=>{
  expect(ITEM_BY_ID['sack']).toMatchObject({costCp:1,weight:.5});
  expect(ITEM_BY_ID['potion-of-healing']).toMatchObject({costCp:5000,weight:.5});
  expect(ITEM_BY_ID['alchemist-s-supplies']).toMatchObject({costCp:5000,weight:8,category:'tool'});
  expect(ITEM_BY_ID['arrows']).toMatchObject({costCp:5,weight:.05});
  expect(ITEM_BY_ID['bullets-sling']).toMatchObject({costCp:4,weight:1.5,packQuantity:20});
  for(const shopItem of frontierShopStock)expect(shopItem).toBe(ITEM_BY_ID[shopItem.id]);
 });
});
