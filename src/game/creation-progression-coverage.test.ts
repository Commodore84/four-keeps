import {describe,it,expect} from 'vitest';
import {CLASSES} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
import {progressionFeatures} from './creationProgression';
describe('all-class advancement explanation coverage',()=>{
 it('provides readable explanations for every class milestone',()=>{
  for(const cls of CLASSES)for(let level=2;level<=20;level++){
   for(const feature of progressionFeatures(cls.id,level)){
    expect(feature.description.length,cls.id+' level '+level+' '+feature.name).toBeGreaterThan(60);
    expect(feature.description,cls.id+' level '+level).not.toMatch(/^Class milestone at this level/);
   }
  }
 });
 it('provides subclass tier previews for every 2024 subclass',()=>{
  for(const cls of CLASSES)for(const subclass of subclassesForClass(cls.id)){
   const features=Array.from({length:18},(_,i)=>progressionFeatures(cls.id,i+3,subclass.name)).flat().filter(f=>f.source==='subclass');
   expect(features.length,subclass.name).toBeGreaterThanOrEqual(3);
   for(const feature of features)expect(feature.description.length,subclass.name+' '+feature.level).toBeGreaterThan(75);
  }
 });
});
