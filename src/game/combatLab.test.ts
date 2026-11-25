import {describe,it,expect} from 'vitest';
import {newCampaign,rollDuelInitiative} from './campaign';
import {buildSoloEncounter} from './encounterDirector';
import {COMBAT_LAB_SCENARIOS,isCombatLab,makeCombatLabEncounter,replayCombatLabGeometry,sampleRandomCombatLab} from './combatLab';
import {validateGeneratedBattlefield,battlefieldTacticalProfile,generateBattlefield} from './battlefieldGenerator';

describe('shared Combat Lab test entry point',()=>{
 it('starts each seeded environment in the real classic-combat handoff, not a second engine',()=>{
  for(const environment of COMBAT_LAB_SCENARIOS){
   const lab=makeCombatLabEncounter(environment,'lab-deadbeef',null,'2026-11-25T14:00:00.000Z');
   const normal=buildSoloEncounter(environment,'combat-lab','lab-deadbeef').scenario;
   expect(isCombatLab(lab)).toBe(true);
   expect(lab.combatLab?.seed).toBe('lab-deadbeef');
   expect(lab.combat?.classicAdventure?.origin).toBe('dm');
   expect(lab.combat?.status).toBe('awaiting-initiative');
   expect(lab.combat?.battlefield).toEqual(normal.battlefield);
   expect(lab.combat?.playerPosition).toEqual(normal.starts[0]);
   expect(lab.combat?.enemyPosition).toEqual(normal.actors[0].square);
   expect(lab.combat?.secondEnemy).toBeUndefined();
   expect(lab.combat?.secondStart).toEqual(normal.actors[1].square);
   expect(lab.combat?.battlefield).toEqual(replayCombatLabGeometry(lab.combatLab!).battlefield);
   expect(JSON.parse(JSON.stringify(lab)).combat.battlefield).toEqual(normal.battlefield);
  }
 });
 it('creates isolated new campaigns without editing live character, journal, money, or resources',()=>{
  const real=newCampaign('Story campaign','the-real-campaign');
  const source=structuredClone(real);
  const first=makeCombatLabEncounter('warehouse-vermin','lab-12345678',real);
  const second=makeCombatLabEncounter('roadside-bandit','lab-12345679',real);
  expect(real).toEqual(source);
  expect(first.id).not.toBe(real.id);
  expect(first.id).not.toBe(second.id);
  expect(first.combatLab?.originCampaignId).toBe(real.id);
  expect(second.combatLab?.originCampaignId).toBe(real.id);
  expect(isCombatLab(real)).toBe(false);
  expect(first.journal.some(e=>e.text.includes('original practice-combat interface'))).toBe(true);
 });
 it('copies a Rogue character into the disposable session without mutating their campaign',()=>{
  const original=newCampaign('Live adventurer','live-rogue');
  const rogue={...original,characterIdentity:{name:'Bran',classId:'rogue',speciesId:'elf'} as NonNullable<typeof original.characterIdentity>,
   equipment:{daggers:5,arrows:19,caltrops:0,ballBearings:0},
   inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:123,PP:0},gear:[{name:'Thieves\' Tools',quantity:1}]}};
  const before=structuredClone(rogue);
  const lab=makeCombatLabEncounter('ruins-goblin-scouts','lab-ff00ff11',rogue);
  expect(lab.combatLab?.originCampaignId).toBe('live-rogue');
  expect(lab.characterIdentity).toEqual(rogue.characterIdentity);
  expect(lab.equipment).toEqual(rogue.equipment);
  expect(lab.inventoryLedger).toEqual(rogue.inventoryLedger);
  lab.inventoryLedger!.currency.GP=0;
  lab.character!.scores.dex=8;
  expect(rogue).toEqual(before);
  expect(lab.combat?.classicAdventure?.origin).toBe('dm');
 });
 it('provides isolated practice daggers when the source Rogue owns none',()=>{
  const source=newCampaign('Empty inventory','out-of-daggers');
  const depleted={...source,characterIdentity:{name:'Nighthawk',classId:'rogue'} as NonNullable<typeof source.characterIdentity>,
    equipment:{...source.equipment!,daggers:0},inventoryLedger:source.inventoryLedger};
  const before=structuredClone(depleted);
  const lab=makeCombatLabEncounter('warehouse-vermin','lab-1234aaaa',depleted);
  expect(lab.equipment?.daggers).toBe(2);
  expect(lab.combat?.daggersAvailable).toBe(2);
  expect(lab.combatLab?.originCampaignId).toBe(depleted.id);
  expect(depleted).toEqual(before);
 });
 it('retains generated positions and objects after initiative and moving a character',()=>{
  const lab=makeCombatLabEncounter('roadside-bandit','lab-11112222');
  const rolled=rollDuelInitiative(lab);
  expect(rolled.combat?.status).toBe('initiative-set');
  expect(rolled.combat?.battlefield).toEqual(lab.combat?.battlefield);
  expect(rolled.combatLab).toEqual(lab.combatLab);
  expect(rolled.combat?.enemyPosition).toEqual(lab.combat?.enemyPosition);
 });
 it('random button deterministically chooses all three templates and retains full reproducible seeds',()=>{
  for(let i=0;i<3;i++){
    const value=sampleRandomCombatLab(()=>i);
    expect(value.environment).toBe(COMBAT_LAB_SCENARIOS[i]);
    expect(value.seed).toBe('lab-'+i.toString(16).padStart(8,'0'));
  }
  expect(()=>sampleRandomCombatLab(()=>NaN)).toThrow();
  expect(()=>makeCombatLabEncounter('warehouse-vermin','../invalid')).toThrow();
 });
 it('varies physical prop and enemy placements across seeds while preserving valid routes',()=>{
  for(const environment of COMBAT_LAB_SCENARIOS){
   const samples=Array.from({length:20},(_,i)=>generateBattlefield(environment,'lab-seed-'+i));
   const variants=new Set(samples.map(v=>JSON.stringify(v.battlefield.objects.map(o=>[o.kind,o.x,o.y,o.width,o.height]))));
   const spawns=new Set(samples.map(v=>JSON.stringify(v.enemyStarts)));
   expect(variants.size).toBeGreaterThan(10);
   expect(spawns.size).toBeGreaterThan(2);
   for(const generated of samples){
     expect(validateGeneratedBattlefield(generated)).toBe(true);
     expect(battlefieldTacticalProfile(generated).alternativeApproaches).toBeGreaterThanOrEqual(2);
   }
  }
 });
});
