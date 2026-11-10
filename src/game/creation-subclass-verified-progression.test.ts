import {describe,it,expect} from 'vitest';
import {subclassFeatureAt} from './creationSubclassFeatures';
describe('2024 free-rules subclass feature progression',()=>{
 it.each([
  ['paladin-devotion',3,'Sacred Weapon'],['paladin-devotion',7,'Aura of Devotion'],['paladin-devotion',15,'Smite of Protection'],['paladin-devotion',20,'Holy Nimbus'],
  ['druid-land',3,'Land’s Aid'],['druid-land',6,'Natural Recovery'],['druid-land',10,'Nature’s Ward'],['druid-land',14,'Nature’s Sanctuary'],
  ['warlock-fiend',3,'Dark One’s Blessing'],['warlock-fiend',6,'Dark One’s Own Luck'],['warlock-fiend',10,'Fiendish Resilience'],['warlock-fiend',14,'Hurl Through Hell']
 ])('%s at level %i includes %s', (subclass,level,name)=>{
  const feature=subclassFeatureAt(subclass,level);
  expect(feature?.confidence).toBe('verified-mechanics');
  expect(feature?.name).toContain(name);
  expect(feature?.description.length).toBeGreaterThan(80);
  expect(feature?.appliedToProjection).toBe(false);
 });
 it('does not incorrectly grant a subclass feature on an unrelated level',()=>{
  expect(subclassFeatureAt('druid-land',5)).toBeUndefined();
  expect(subclassFeatureAt('warlock-fiend',7)).toBeUndefined();
 });
});
