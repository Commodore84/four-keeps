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
  expect(lab.equipment).toEqual({...rogue.equipment,arrows:20});
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
 it('starts every disposable encounter fully healed, fully stocked, and with all class resources ready',()=>{
  const base=newCampaign('Depleted real adventure','real-depleted');
  const source={
   ...base,
   characterIdentity:{name:'Riven',classId:'rogue',draftId:'riven-draft'} as NonNullable<typeof base.characterIdentity>,
   character:{...base.character!,classId:'rogue',level:5,maxHitPoints:38,currentHitPoints:2,
    temporaryHitPoints:6,conditions:['Poisoned','Exhaustion'],exhaustionLevel:3,
    deathSaves:{successes:1,failures:2,stable:false,dead:false},
    resources:{'Second Wind':{maximum:2,used:2,recovery:'short' as const}},
    spellSlots:{level1:3,usedLevel1:3,level2:2,usedLevel2:2}},
   hitDiceRemaining:0,
   equipment:{daggers:0,arrows:0,caltrops:0,ballBearings:0},
   healerKitUsesRemaining:1,waterskinPints:1,
   inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:22,PP:0},gear:[
    {name:'Dagger',quantity:0},{name:'Arrows',quantity:0},
    {name:'Crossbow Bolts',quantity:2},{name:'Potion of Healing',quantity:0},
    {name:'Oil',quantity:0},{name:'Torch',quantity:0},
    {name:'Caltrops',quantity:0},{name:'Ball Bearings',quantity:0},
    {name:"Healer's Kit",quantity:0},{name:'Waterskin',quantity:1},
    {name:'Shortbow',quantity:1},{name:'Thieves’ Tools',quantity:1}
   ]}
  };
  const snapshot=structuredClone(source);
  for(const environment of COMBAT_LAB_SCENARIOS){
   const lab=makeCombatLabEncounter(environment,'lab-feedf00d',source);
   expect(lab.character?.currentHitPoints).toBe(38);
   expect(lab.character?.temporaryHitPoints).toBe(0);
   expect(lab.character?.conditions).toEqual([]);
   expect(lab.character?.exhaustionLevel).toBe(0);
   expect(lab.character?.deathSaves).toMatchObject({successes:0,failures:0,dead:false});
   expect(lab.character?.resources?.['Second Wind']?.used).toBe(0);
   expect(lab.character?.spellSlots).toMatchObject({usedLevel1:0,usedLevel2:0});
   expect(lab.hitDiceRemaining).toBe(5);
   expect(lab.equipment).toEqual({daggers:2,arrows:20,caltrops:1,ballBearings:1});
   const gear=Object.fromEntries(lab.inventoryLedger?.gear.map(row=>[row.name,row.quantity])??[]);
   expect(gear).toMatchObject({'Arrows':20,'Crossbow Bolts':20,'Dagger':2,
    'Potion of Healing':1,'Oil':1,'Torch':1,'Caltrops':1,'Ball Bearings':1,"Healer's Kit":1});
   expect(gear['Shortbow']).toBe(1);
   expect(lab.healerKitUsesRemaining).toBe(10);
   expect(lab.waterskinPints).toBe(4);
   expect(lab.inventoryLedger?.currency.GP).toBe(22);
   const rolled=rollDuelInitiative(lab);
   expect(rolled.combat?.arrowsRemaining).toBe(20);
   expect(rolled.combat?.daggersAvailable).toBe(2);
   // Spending resources in one lab may not taint the next lab or story.
   lab.inventoryLedger!.gear.find(row=>row.name==='Potion of Healing')!.quantity=0;
   lab.character!.currentHitPoints=1;
   expect(makeCombatLabEncounter(environment,'lab-feedf00e',source).character?.currentHitPoints).toBe(38);
   expect(source).toEqual(snapshot);
  }
 });
 it('keeps ordinary permanent possessions and gold unchanged in the practice copy',()=>{
  const source=newCampaign('Original adventure','ledger-test');
  source.inventoryLedger={currency:{CP:3,SP:2,EP:0,GP:19,PP:0},
   gear:[{name:'Potion of Healing',quantity:5},{name:'Torch',quantity:0},
    {name:'Shortbow',quantity:0},{name:'Rope',quantity:1},{name:'Arrows',quantity:42}]};
  const before=structuredClone(source);
  const lab=makeCombatLabEncounter('roadside-bandit','lab-6789abcd',source);
  expect(lab.inventoryLedger?.gear).toEqual([
   {name:'Potion of Healing',quantity:5},{name:'Torch',quantity:1},
   {name:'Shortbow',quantity:0},{name:'Rope',quantity:1},{name:'Arrows',quantity:42}
  ]);
  expect(lab.equipment?.arrows).toBe(42);
  expect(source).toEqual(before);
 });
 it('refreshes a throwing dagger from character-creation gear even if its last ledger row is gone',()=>{
  // Imported builds may retain an original dagger while the live campaign
  // no longer has a ledger row after throwing or losing it.
  // The training counters still guarantee two daggers for the classic engine.
  const c=newCampaign('Practice fallback','practitioner');
  const lab=makeCombatLabEncounter('warehouse-vermin','lab-2222bbaa',{
   ...c,characterIdentity:{name:'Rogue',classId:'rogue'} as NonNullable<typeof c.characterIdentity>,
   equipment:{daggers:0,arrows:0,caltrops:0,ballBearings:0},
   inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[]}
  });
  expect(lab.equipment?.daggers).toBe(2);
  expect(lab.equipment?.arrows).toBe(20);
  expect(lab.combat?.arrowsRemaining).toBe(20);
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
