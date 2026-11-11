import {describe,it,expect} from 'vitest';
import {CLASSES,classChoices,validateClass,setChoice,validateChoices,reconcileChoices} from '../src/game/creationClasses';
describe('2024 class selection engine',()=>{
 it('catalogs twelve distinct classes with proficiencies and progression',()=>{
  expect(CLASSES).toHaveLength(12);
  expect(new Set(CLASSES.map(c=>c.id)).size).toBe(12);
  for(const c of CLASSES){expect(c.source).toBe('PHB2024');expect(c.hitDie).toBeGreaterThanOrEqual(6);expect(c.savingThrows).toHaveLength(2);expect(c.skillOptions.length).toBeGreaterThanOrEqual(c.skillCount);expect(c.features.some(f=>f.level===1)).toBe(true);}
 });
 it('enforces class-specific skill counts',()=>{
  for(const c of CLASSES){
   expect(validateClass(c.id,{}).length).toBeGreaterThan(0);
   const picks:Record<string,string[]>={};
   for(const d of classChoices(c.id,c.skillOptions.slice(0,c.skillCount))){picks[d.id]=d.options.slice(0,d.count);}
   expect(validateClass(c.id,picks)).toEqual([]);
  }
 });
 it('supports toggle, count limits, uniqueness and invalid choice rejection',()=>{
  const d={id:'test',label:'Test',kind:'skill' as const,count:2,options:['A','B','C']};
  let s=setChoice({},d,'A');s=setChoice(s,d,'B');
  expect(validateChoices([d],s)).toEqual([]);
  s=setChoice(s,d,'C');expect(s.test).toEqual(['B','C']);
  expect(setChoice(s,d,'Not allowed')).toBe(s);
  expect(validateChoices([d],{test:['A','A']})).not.toEqual([]);
  expect(reconcileChoices([d],{test:['A','A','Not allowed','B']})).toEqual({test:['A','B']});
 });
 it('limits rogue expertise to selected skills or thieves tools',()=>{
  const d=classChoices('rogue',['Stealth','Perception','Deception','Athletics']);
  const expertise=d.find(x=>x.id==='expertise');
  expect(expertise?.options).toContain('Stealth');
  expect(expertise?.options).toContain('Thieves Tools');
  expect(expertise?.options).not.toContain('Arcana');
 });
 it('rejects unknown classes and invalid choices',()=>{
  expect(validateClass('unknown',{})).toEqual(['Choose a supported class.']);
  expect(validateClass('fighter',{'class-skills':['Arcana','History']})).not.toEqual([]);
 });
});
