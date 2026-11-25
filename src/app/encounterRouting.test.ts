import {describe,it,expect} from 'vitest';
import type {Campaign} from '../game/campaign';
import {shouldRenderTacticalBattlefield} from './encounterRouting';

const campaign=(overrides:Record<string,unknown>):Campaign=>overrides as unknown as Campaign;

describe('encounter screen ownership',()=>{
 it('does not replace an active classic combat even when Phase 3 setup exists',()=>{
  expect(shouldRenderTacticalBattlefield(campaign({combat:{status:'active'},adventureSession:{pendingEncounter:{scenario:{actors:[]}}}}))).toBe(false);
 });
 it('does not replace classic combat when a concurrent Phase 3 battle is active',()=>{
  expect(shouldRenderTacticalBattlefield(campaign({combat:{status:'active'},adventureSession:{status:'encounter'},companionEncounter:{phaseThree:{}}}))).toBe(false);
 });
 it('opens a new tactical encounter when its scenario is ready',()=>{
  expect(shouldRenderTacticalBattlefield(campaign({adventureSession:{pendingEncounter:{scenario:{actors:[]}}}}))).toBe(true);
 });
 it('resumes Phase 3 combat and ignores incomplete encounter proposals',()=>{
  expect(shouldRenderTacticalBattlefield(campaign({adventureSession:{status:'encounter'},companionEncounter:{phaseThree:{}}}))).toBe(true);
  expect(shouldRenderTacticalBattlefield(campaign({adventureSession:{pendingEncounter:{actionId:'pending'}}}))).toBe(false);
  expect(shouldRenderTacticalBattlefield(null)).toBe(false);
 });
});
