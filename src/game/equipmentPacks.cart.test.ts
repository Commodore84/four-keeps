import {describe,it,expect} from 'vitest';
import {packCartContents} from './equipmentPacks';
describe('pack contents in shop cart',()=>{
 it('marks a backpack and the other contents when Dungeoneer’s Pack is added',()=>{
  const contents=packCartContents({'dungeoneer-s-pack':1});
  expect(contents.get('backpack')).toEqual({quantity:1,packs:['Dungeoneer’s Pack']});
  expect(contents.get('torch')?.quantity).toBe(10);
 });
 it('aggregates multiple packs and their quantities without duplicating direct purchases',()=>{
  const contents=packCartContents({'dungeoneer-s-pack':2,'explorer-s-pack':1,backpack:3});
  expect(contents.get('backpack')?.quantity).toBe(3);
  expect(contents.get('backpack')?.packs).toHaveLength(2);
  expect(contents.get('torch')?.quantity).toBe(30);
 });
 it('ignores empty, invalid and ordinary cart entries',()=>{
  expect(packCartContents({'dungeoneer-s-pack':0,'explorer-s-pack':-2,backpack:5}).size).toBe(0);
 });
});
