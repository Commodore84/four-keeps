import {describe,it,expect} from 'vitest';
import {CLASSES,FULL_CASTER_SLOTS,HALF_CASTER_SLOTS,spellcastingAtLevel,validateClassAgainstBackground,classChoices} from '../src/game/creationClasses';
describe('class rules integration',()=>{
 it('defines spell slots for every level 1–20',()=>{
  expect(FULL_CASTER_SLOTS).toHaveLength(21);expect(HALF_CASTER_SLOTS).toHaveLength(21);
  for(let level=1;level<=20;level++){
   expect(FULL_CASTER_SLOTS[level].length).toBeGreaterThan(0);
   expect(HALF_CASTER_SLOTS[level].length).toBeGreaterThan(0);
   for(const id of ['bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard'])expect(spellcastingAtLevel(id,level)?.slots.length).toBeGreaterThan(0);
  }
 });
 it('rejects invalid levels and nonspellcasters',()=>{
  expect(spellcastingAtLevel('rogue',1)).toBeNull();
  expect(spellcastingAtLevel('wizard',0)).toBeNull();
  expect(spellcastingAtLevel('wizard',21)).toBeNull();
 });
 it('distinguishes full, half, and pact progression',()=>{
  expect(spellcastingAtLevel('wizard',1)).toMatchObject({kind:'full',ability:'Int',slots:[2],cantrips:3});
  expect(spellcastingAtLevel('paladin',1)).toMatchObject({kind:'half',ability:'Cha',slots:[2]});
  expect(spellcastingAtLevel('warlock',1)).toMatchObject({kind:'pact',ability:'Cha',slots:[1]});
  expect(spellcastingAtLevel('wizard',20)?.slots).toEqual([4,3,3,3,3,2,2,1,1]);
 });
 it('blocks duplicate class/background skills',()=>{
  const selections={'class-skills':['Stealth','Perception','Acrobatics','Investigation'],'expertise':['Stealth','Perception'],'weapon-mastery':['Dagger','Shortbow']};
  expect(validateClassAgainstBackground('rogue',selections,['Stealth','Insight'])).toContain('Duplicate background and class skill proficiency: Stealth. Choose different class skills.');
  expect(validateClassAgainstBackground('rogue',selections,['History','Arcana'])).toEqual([]);
 });
 it('constrains rogue weapon mastery to eligible weapons',()=>{
  const d=classChoices('rogue').find(x=>x.id==='weapon-mastery');
  expect(d?.options).toContain('Shortbow');
  expect(d?.options).not.toContain('Greatsword');
 });
 it('retains twelve supported classes',()=>expect(CLASSES).toHaveLength(12));
});
