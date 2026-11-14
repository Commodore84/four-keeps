import { describe, expect, it } from 'vitest';
import { abilityModifier, describeCheck, prototypeNighthawk, resolveCheck, rollCheck, skillModifier } from './checks';
describe('deterministic skill checks', () => {
  it('calculates ability and proficiency modifiers', () => {
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(16)).toBe(3);
    expect(skillModifier(prototypeNighthawk,'Stealth')).toBe(7);
    expect(skillModifier(prototypeNighthawk,'Athletics')).toBe(-1);
  });
  it('resolves advantage and disadvantage from supplied dice', () => {
    expect(resolveCheck(prototypeNighthawk,'Stealth','advantage',[4,17]).total).toBe(24);
    expect(resolveCheck(prototypeNighthawk,'Stealth','disadvantage',[4,17]).total).toBe(11);
  });
  it('generates a bounded d20 roll and does not assign success', () => {
    const result = rollCheck(prototypeNighthawk,'Investigation','normal',()=>0.999);
    expect(result.dice).toEqual([20]);
    expect(result.total).toBe(26);
    expect(describeCheck(result)).toContain('Outcome awaits DM adjudication');
  });
  it('rejects out of range dice', () => {
    expect(()=>resolveCheck(prototypeNighthawk,'Stealth','normal',[21])).toThrow();
  });
});

 describe('2024 Rogue Reliable Talent',()=>{
  const rogue={...prototypeNighthawk,classId:'rogue',level:7,proficientSkills:['Stealth' as const],expertiseSkills:['Stealth' as const]};
  it('raises selected low d20 rolls to ten only on proficient Rogue checks',()=>{
   const result=resolveCheck(rogue,'Stealth','normal',[2]);
   expect(result.selected).toBe(10);
   expect(result.total).toBe(10+result.modifier);
   expect(resolveCheck(rogue,'Athletics','normal',[2]).selected).toBe(2);
   expect(resolveCheck({...rogue,level:6},'Stealth','normal',[2]).selected).toBe(2);
   expect(resolveCheck({...rogue,classId:'fighter'},'Stealth','normal',[2]).selected).toBe(2);
  });
  it('applies after advantage/disadvantage and preserves natural high rolls',()=>{
   expect(resolveCheck(rogue,'Stealth','advantage',[3,19]).selected).toBe(19);
   expect(resolveCheck(rogue,'Stealth','disadvantage',[3,19]).selected).toBe(10);
   expect(resolveCheck(rogue,'Stealth','normal',[20]).selected).toBe(20);
  });
 });
