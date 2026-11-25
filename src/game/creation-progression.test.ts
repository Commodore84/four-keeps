import {describe,it,expect} from 'vitest';
import {CLASSES} from './creationClasses';
import {progressionFeatures,mysticArcanumLevel} from './creationProgression';
import {emptyForecast,updateLevelPlan} from './creationForecast';
import {projectCharacterLevel} from './creationProjection';
describe('future class and subclass milestones',()=>{
 it('covers every core class with level 3 subclass and level 19 epic boon',()=>{for(const cls of CLASSES){expect(progressionFeatures(cls.id,3,'Example').some(f=>f.source==='subclass'),cls.id).toBe(true);expect(progressionFeatures(cls.id,19).some(f=>f.name==='Epic Boon'),cls.id).toBe(true)}});
 it('tracks the correct subclass feature schedules for warlock and rogue',()=>{for(const level of [3,6,10,14])expect(progressionFeatures('warlock',level,'Archfey').some(f=>f.source==='subclass')).toBe(true);for(const level of [3,9,13,17])expect(progressionFeatures('rogue',level,'Arcane Trickster').some(f=>f.source==='subclass')).toBe(true);expect(progressionFeatures('rogue',6,'Arcane Trickster').some(f=>f.source==='subclass')).toBe(false);expect(progressionFeatures('warlock',3,'Celestial').some(f=>f.name==='Healing Light')).toBe(true);expect(progressionFeatures('warlock',14,'Fiend').some(f=>f.name==='Hurl Through Hell')).toBe(true)});
 it('projects Mystic Arcanum independently of Pact Magic slots',()=>{expect(mysticArcanumLevel(10)).toEqual([]);expect(mysticArcanumLevel(11)).toEqual([6]);expect(mysticArcanumLevel(17)).toEqual([6,7,8,9]);const scores={Str:8,Dex:14,Con:14,Int:12,Wis:10,Cha:18};const forecast=updateLevelPlan(emptyForecast(),3,{subclassId:'warlock-great-old-one'});const p=projectCharacterLevel('warlock',scores,forecast,17);expect(p.mysticArcanumLevels).toEqual([6,7,8,9]);expect(p.pactSlotLevel).toBe(5);expect(p.subclassName).toBe('Great Old One')});
});
