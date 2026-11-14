import {describe,it,expect} from 'vitest';
import {SUBCLASSES} from './creationSubclasses';
import {SUBCLASS_FEATURES,subclassFeatureAt,subclassFeatureCoverage,earnedSubclassFeatures,subclassActivation} from './creationSubclassFeatures';
import {progressionFeatures} from './creationProgression';
describe('subclass named feature coverage',()=>{
 it('gates every subclass reference by earned level and labels unverified activation',()=>{
  for(const subclass of SUBCLASSES){
   expect(earnedSubclassFeatures(subclass.id,2),subclass.id).toEqual([]);
   const all=earnedSubclassFeatures(subclass.id,20);
   expect(all.length,subclass.id).toBeGreaterThanOrEqual(3);
   for(const level of [3,6,7,9,10,13,14,15,17,18,20]){
    const earned=earnedSubclassFeatures(subclass.id,level);
    expect(earned.every(feature=>feature.level<=level),subclass.id).toBe(true);
    expect(earned.every(feature=>all.includes(feature)),subclass.id).toBe(true);
   }
   for(const feature of all){
    expect(subclassActivation(feature).length).toBeGreaterThan(4);
    if(!feature.appliedToProjection)expect(feature.description.length).toBeGreaterThan(20);
   }
  }
  expect(earnedSubclassFeatures('wizard-diviner',3).some(f=>f.name.includes('Portent'))).toBe(true);
  expect(earnedSubclassFeatures('wizard-diviner',3).some(f=>f.name.includes('Greater Portent'))).toBe(false);
 });

 it('indexes each of the 48 PHB 2024 subclasses at all scheduled levels',()=>{
  expect(subclassFeatureCoverage().subclasses).toBe(48);
  for(const subclass of SUBCLASSES){
   const entries=SUBCLASS_FEATURES.filter(f=>f.subclassId===subclass.id);
   expect(entries.length,subclass.id).toBeGreaterThanOrEqual(3);
   expect(entries[0].level).toBe(3);
   for(const entry of entries){
    expect(entry.name.length,subclass.id+' '+entry.level).toBeGreaterThan(4);
    expect(subclassFeatureAt(subclass.id,entry.level)).toEqual(entry);
    expect(progressionFeatures(subclass.classId,entry.level,subclass.name).some(f=>f.source==='subclass'&&f.name===entry.name)).toBe(true);
    if(entry.appliedToProjection)expect(entry.confidence).toBe('verified-mechanics');
   }
  }
 });
 it('distinguishes reviewed reference text from applied mechanics',()=>{
  for(const id of ['rogue-arcane-trickster','rogue-assassin','rogue-thief','wizard-diviner','wizard-abjurer','fighter-champion']){
   const features=earnedSubclassFeatures(id,20);
   expect(features.length,id).toBeGreaterThanOrEqual(4);
   for(const feature of features){
    expect(['verified-reference','verified-mechanics'],id+' '+feature.level).toContain(feature.confidence);
    if(feature.confidence==='verified-reference')expect(feature.appliedToProjection).toBe(false);
    expect(feature.description.length).toBeGreaterThan(60);
   }
  }
 });
 it('never claims unverified feature mechanics are calculated',()=>{
  expect(subclassFeatureCoverage().verified).toBeGreaterThan(0);
  expect(SUBCLASS_FEATURES.filter(f=>f.confidence==='preview-needs-verification').every(f=>!f.appliedToProjection)).toBe(true);
 });
});
