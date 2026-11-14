import {describe,it,expect} from 'vitest';
import {CLASSES} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
import {progressionFeatures,earnedClassMilestones} from './creationProgression';
describe('all-class advancement explanation coverage',()=>{
 it('shows only earned class milestones without duplicating the class catalog',()=>{
  for(const cls of CLASSES){
   expect(earnedClassMilestones(cls.id,1,cls.features)).toEqual([]);
   const atFive=earnedClassMilestones(cls.id,5,cls.features);
   expect(atFive.every(feature=>feature.level<=5&&feature.source==='class'),cls.id).toBe(true);
   expect(atFive.some(feature=>feature.level>5),cls.id).toBe(false);
   expect(atFive.every(feature=>!cls.features.some(group=>group.level<=feature.level&&group.names.includes(feature.name))),cls.id).toBe(true);
   expect(earnedClassMilestones(cls.id,20,cls.features).some(feature=>feature.name==='Epic Boon'),cls.id).toBe(true);
  }
 });

 it('provides readable explanations for every class milestone',()=>{
  for(const cls of CLASSES)for(let level=2;level<=20;level++){
   for(const feature of progressionFeatures(cls.id,level)){
    expect(feature.description.length,cls.id+' level '+level+' '+feature.name).toBeGreaterThan(30);
    expect(feature.description,cls.id+' level '+level).not.toMatch(/^Class milestone at this level/);
   }
  }
 });
 it('provides subclass tier previews for every 2024 subclass',()=>{
  for(const cls of CLASSES)for(const subclass of subclassesForClass(cls.id)){
   const features=Array.from({length:18},(_,i)=>progressionFeatures(cls.id,i+3,subclass.name)).flat().filter(f=>f.source==='subclass');
   expect(features.length,subclass.name).toBeGreaterThanOrEqual(3);
   for(const feature of features)expect(feature.description.length,subclass.name+' '+feature.level).toBeGreaterThan(65);
  }
 });
});
