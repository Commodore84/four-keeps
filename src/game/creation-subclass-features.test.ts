import {describe,it,expect} from 'vitest';
import {SUBCLASSES} from './creationSubclasses';
import {SUBCLASS_FEATURES,subclassFeatureAt,subclassFeatureCoverage} from './creationSubclassFeatures';
import {progressionFeatures} from './creationProgression';
describe('subclass named feature coverage',()=>{
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
 it('never claims unverified feature mechanics are calculated',()=>{
  expect(subclassFeatureCoverage().verified).toBeGreaterThan(0);
  expect(SUBCLASS_FEATURES.filter(f=>f.confidence==='preview-needs-verification').every(f=>!f.appliedToProjection)).toBe(true);
 });
});
