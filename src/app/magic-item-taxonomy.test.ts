import {describe,expect,it} from 'vitest';
import {MAGIC_ITEMS} from '../game/magicWishlist';
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
});
