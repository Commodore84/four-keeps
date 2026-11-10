import {describe,it,expect} from 'vitest';
import {initialSubclassCombatState,canApplyCondition,resolveSubclassDamage,finishSubclassRest,selectFiendResistance,spendDarkOnesOwnLuck} from './subclassCombatRules';
describe('2024 subclass combat and rest state transitions',()=>{
 it('Devotion immunity requires an active aura and a target within it',()=>{
  const paladin=initialSubclassCombatState('paladin','paladin-devotion',7,3);
  expect(canApplyCondition(paladin,'Charmed',{auraActive:true,withinDevotionAura:true})).toBe(false);
  expect(canApplyCondition(paladin,'Charmed',{auraActive:false,withinDevotionAura:true})).toBe(true);
  expect(canApplyCondition(paladin,'Charmed',{auraActive:true,withinDevotionAura:false})).toBe(true);
  expect(canApplyCondition({...paladin,level:6},'Charmed',{auraActive:true,withinDevotionAura:true})).toBe(true);
 });
 it('Land resists matching damage and is immune to Poisoned at level ten',()=>{
  const land=initialSubclassCombatState('druid','druid-land',10,0,'arid');
  expect(canApplyCondition(land,'Poisoned')).toBe(false);
  expect(resolveSubclassDamage(land,9,'Fire')).toBe(4);
  expect(resolveSubclassDamage(land,9,'Cold')).toBe(9);
  expect(canApplyCondition({...land,level:9},'Poisoned')).toBe(true);
 });
 it('Land terrain changes on Long Rest, not Short Rest',()=>{
  const land=initialSubclassCombatState('druid','druid-land',10,0,'arid');
  expect(()=>finishSubclassRest(land,'short',{terrain:'polar'})).toThrow();
  const polar=finishSubclassRest(land,'long',{terrain:'polar'});
  expect(resolveSubclassDamage(polar,11,'Cold')).toBe(5);
  expect(resolveSubclassDamage(polar,11,'Fire')).toBe(11);
 });
 it('Fiendish Resilience requires explicit non-Force selection',()=>{
  const fiend=initialSubclassCombatState('warlock','warlock-fiend',10,3);
  expect(resolveSubclassDamage(fiend,11,'Fire')).toBe(11);
  expect(()=>selectFiendResistance(fiend,'Force')).toThrow();
  const chosen=finishSubclassRest(fiend,'short',{fiendResistance:'Fire'});
  expect(resolveSubclassDamage(chosen,11,'Fire')).toBe(5);
  expect(resolveSubclassDamage(chosen,11,'Cold')).toBe(11);
 });
 it('Dark One’s Own Luck spends one charge and refreshes only on Long Rest',()=>{
  const fiend=initialSubclassCombatState('warlock','warlock-fiend',6,3);
  const used=spendDarkOnesOwnLuck(fiend,7);
  expect(used.bonus).toBe(7);
  expect(used.state.luckRemaining).toBe(2);
  expect(finishSubclassRest(used.state,'short').luckRemaining).toBe(2);
  expect(finishSubclassRest(used.state,'long').luckRemaining).toBe(3);
  expect(()=>spendDarkOnesOwnLuck({...fiend,luckRemaining:0},5)).toThrow();
  expect(()=>spendDarkOnesOwnLuck(fiend,11)).toThrow();
 });
});
