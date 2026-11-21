import {describe,expect,it,vi} from 'vitest';
import {MAGIC_ITEMS,MAGIC_ITEM_PRODUCTS,isConcreteMagicItem,readMagicWishlist,writeMagicWishlist} from '../game/magicWishlist';
import {itemGroup,itemSubgroup} from './MagicItemCompendium';

describe('magic item taxonomy',()=>{
 it('classifies every catalog entry without dropping any of the 511 items',()=>{
  expect(MAGIC_ITEMS).toHaveLength(511);
  expect(new Set(MAGIC_ITEMS.map(item=>item.id)).size).toBe(511);
  for(const item of MAGIC_ITEMS){
   expect(itemGroup(item.category,item.name).trim()).not.toBe('');
   expect(itemSubgroup(item.category,item.name).trim()).not.toBe('');
  }
 });
 it.each([
  ['Rod of Absorption','Wondrous Items','Rods','Magic rods'],
  ['Spell Scroll','Wondrous Items','Scrolls','Spell scrolls'],
  ['Bag of Holding','Wondrous Items','Storage and containers','Containers and storage'],
  ['Carpet of Flying','Wondrous Items','Constructs, companions and transport','Travel and vehicles'],
  ['Manual of Golems','Wondrous Items','Books, decks and knowledge','Books, decks and knowledge'],
  ['Ioun Stone','Wondrous Items','Gems, stones and magical substances','Figurines, stones and gems'],
 ])('places %s into a meaningful group and subgroup',(name,category,group,subgroup)=>{
  expect(itemGroup(category,name)).toBe(group);
  expect(itemSubgroup(category,name)).toBe(subgroup);
 });
 it('keeps all 13 multi-rarity references but never exposes them as concrete products',()=>{
  const references=MAGIC_ITEMS.filter(item=>!isConcreteMagicItem(item));
  expect(references).toHaveLength(13);
  expect(MAGIC_ITEM_PRODUCTS).toHaveLength(498);
  expect(new Set(MAGIC_ITEM_PRODUCTS.map(item=>item.id)).size).toBe(498);
  expect(MAGIC_ITEM_PRODUCTS.every(item=>!item.rarity.includes(',')&&!item.rarity.includes('Varies'))).toBe(true);
  for(const id of ['ammunition-1','ammunition-2','ammunition-3','armor-1','armor-2','armor-3','shield-1','shield-2','shield-3','weapon-1','weapon-2','weapon-3']){
   expect(MAGIC_ITEM_PRODUCTS.some(item=>item.id===id)).toBe(true);
  }
 });
 it('rejects ambiguous rarity references from saved wishlists',()=>{
  const storage=new Map<string,string>();
  vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
  const id='variant-test-campaign';
  writeMagicWishlist(id,['ammunition','ammunition-1','shield','shield-2']);
  expect(readMagicWishlist(id)).toEqual(['ammunition-1','shield-2']);
  vi.unstubAllGlobals();
 });
 it('provides precise effects for every giant belt and potion tier',()=>{
  const strengths={hill:21,frost:23,stone:23,fire:25,cloud:27,storm:29};
  for(const [giant,strength] of Object.entries(strengths)){
   for(const kind of ['belt','potion']){
    const id='dmg24-'+kind+'-of-'+giant+'-giant-strength';
    const item=MAGIC_ITEM_PRODUCTS.find(item=>item.id===id);
    expect(item,id).toBeDefined();
    expect(item!.description).toContain(String(strength));
    expect(item!.description).not.toContain('associated with');
   }
  }
 });
 it.each([['healing','2d4 + 2'],['greater-healing','4d4 + 4'],['superior-healing','8d4 + 8'],['supreme-healing','10d4 + 20']])('describes %s potion healing precisely',(kind,amount)=>{
  const item=MAGIC_ITEM_PRODUCTS.find(item=>item.id==='dmg24-potion-of-'+kind);
  expect(item?.description).toContain(amount);
 });
});
