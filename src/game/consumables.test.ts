import {moveCompanionForced,bindCompanionWithRope,escapeCompanionRope,moveCompanion,attackCompanion,addCompanionObject,recordCompanionObjectFire,igniteGroundOil,resolveGroundOilHazard,damageCompanion,endCompanionTurn,extinguishCompanionFire,resolveCompanionSavingThrow} from './companionEncounter';
import {advanceConsumableTime,antitoxinSecondsRemaining,equipmentLightRemaining,provisionsToday} from './consumables';
import {describe,it,expect} from 'vitest';
import {useOwnedConsumable,eligibleKitTargets} from './consumables';
import type {Campaign} from './campaign';
const base=()=>({elapsedMinutes:100,inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Antitoxin',quantity:2},{name:"Healer's Kit",quantity:1}]},character:{currentHitPoints:12,maxHitPoints:20}} as unknown as Campaign);
const actor={x:2,y:2,hp:12,maxHp:20,conditions:[] as ('Unconscious')[],actionUsed:false,bonusActionUsed:false,actorKind:'party' as const};
const ally={...actor,x:3,hp:0,conditions:['Unconscious'] as ('Unconscious')[],deathSaves:{successes:1,failures:1,stable:false,dead:false}};
const encounter=()=>({...base(),companionEncounter:{status:'active',mode:'unified',round:2,turnIndex:0,order:['nighthawk','ally'],participants:{nighthawk:actor,ally},log:[]}} as unknown as Campaign);
describe('SRD 5.2.1 adventuring consumables',()=>{
 it('antitoxin uses bonus action, expires at game minute 160, rejects stale and duplicate',()=>{
  const c=encounter(),r={name:'Antitoxin' as const,confirmed:true,requestId:'a1',expectedQuantity:2,expectedElapsedMinutes:100,expectedRound:2,expectedTurnIndex:0,expectedActorPosition:{x:2,y:2}};
  const n=useOwnedConsumable(c,r);
  expect(n.antitoxinUntilMinute).toBe(160);expect(n.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(n.companionEncounter?.participants.nighthawk.bonusActionUsed).toBe(true);
  expect(useOwnedConsumable(n,r)).toBe(n);
  expect(()=>useOwnedConsumable(c,{...r,confirmed:false})).toThrow('confirmation');
  expect(()=>useOwnedConsumable(c,{...r,expectedElapsedMinutes:99})).toThrow('Stale campaign time');
  expect(()=>useOwnedConsumable(c,{...r,expectedQuantity:1})).toThrow('Stale consumable inventory');
  expect(()=>useOwnedConsumable(n,{...r,requestId:'a2',expectedQuantity:1})).toThrow('action already spent');
  expect(()=>useOwnedConsumable(c,{...r,expectedRound:3})).toThrow('Stale encounter');
 });
 it('healer kit stabilizes adjacent unconscious ally without HP gain; ten uses consume one kit',()=>{
  let c=encounter();
  const req={name:"Healer's Kit" as const,confirmed:true,requestId:'k0',expectedQuantity:1,expectedElapsedMinutes:100,expectedKitUses:10,targetId:'ally',expectedTargetHP:0,expectedRound:2,expectedTurnIndex:0,expectedActorPosition:{x:2,y:2},expectedTargetPosition:{x:3,y:2}};
  expect(eligibleKitTargets(c)).toHaveLength(1);
  const n=useOwnedConsumable(c,req);
  expect(n.companionEncounter?.participants.ally.hp).toBe(0);
  expect(n.companionEncounter?.participants.ally.deathSaves?.stable).toBe(true);
  expect(n.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(n.healerKitUsesRemaining).toBe(9);expect(n.inventoryLedger?.gear[1].quantity).toBe(1);
  expect(()=>useOwnedConsumable(n,{...req,requestId:'k1',expectedKitUses:9})).toThrow('action already spent');
  expect(()=>useOwnedConsumable(c,{...req,expectedTargetPosition:{x:4,y:2}})).toThrow('Stale target');
  expect(()=>useOwnedConsumable({...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,ally:{...c.companionEncounter!.participants.ally,x:8}}}},req)).toThrow('adjacent');
  expect(()=>useOwnedConsumable(c,{...req,expectedKitUses:9})).toThrow('Stale kit charges');
  c={...c,healerKitUsesRemaining:1};
  const last=useOwnedConsumable(c,{...req,expectedKitUses:1});
  expect(last.healerKitUsesRemaining).toBe(10);expect(last.inventoryLedger?.gear[1].quantity).toBe(0);
 });
});

describe('antitoxin save advantage and clock boundaries',()=>{
 it('only applies to avoid/end Poisoned while active; requires both totals',()=>{
  const c={...encounter(),antitoxinUntilMinute:160};
  expect(resolveCompanionSavingThrow(c,'nighthawk','Constitution',8,13,17,{purpose:'avoid-poisoned'}).success).toBe(true);
  const poisoned=resolveCompanionSavingThrow(c,'nighthawk','Constitution',8,13,9,{purpose:'avoid-poisoned'}).campaign;
  expect(poisoned.companionEncounter?.participants.nighthawk.conditions).toContain('Poisoned');
  const recovered=resolveCompanionSavingThrow(poisoned,'nighthawk','Constitution',8,13,17,{purpose:'end-poisoned'});
  expect(recovered.effectiveTotal).toBe(17);
  expect(recovered.campaign.companionEncounter?.participants.nighthawk.conditions).not.toContain('Poisoned');
  expect(resolveCompanionSavingThrow(c,'nighthawk','Constitution',8,13,17,{purpose:'other'}).success).toBe(false);
  expect(()=>resolveCompanionSavingThrow(c,'nighthawk','Constitution',8,13,undefined,{purpose:'avoid-poisoned'})).toThrow('second total');
  expect(resolveCompanionSavingThrow(advanceConsumableTime(c,60),'nighthawk','Constitution',8,13,17,{purpose:'avoid-poisoned'}).success).toBe(false);
  expect(resolveCompanionSavingThrow(advanceConsumableTime(c,59),'nighthawk','Constitution',8,13,17,{purpose:'avoid-poisoned'}).success).toBe(true);
 });
 it('does not grant advantage to allies and cancels disadvantage',()=>{
  const c={...encounter(),antitoxinUntilMinute:160};
  expect(resolveCompanionSavingThrow(c,'ally','Constitution',8,13,17,{purpose:'avoid-poisoned'}).success).toBe(false);
  const restrained={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,nighthawk:{...c.companionEncounter!.participants.nighthawk,conditions:['Restrained']}}}} as Campaign;
  expect(resolveCompanionSavingThrow(restrained,'nighthawk','Dexterity',14,13,undefined,{purpose:'avoid-poisoned'}).effectiveTotal).toBe(14);
  expect(()=>advanceConsumableTime(c,0)).toThrow();
 });
});

describe('consumable confirmations and Poisoned saves',()=>{
 it('rejects a confirmation after the encounter is replaced or ends',()=>{
  const c=encounter();
  const battle={...c.companionEncounter!,id:'second'};
  const request={name:'Antitoxin' as const,confirmed:true,requestId:'old',expectedQuantity:2,
   expectedElapsedMinutes:100,expectedEncounterId:'first',expectedRound:2,expectedTurnIndex:0,
   expectedActorPosition:{x:2,y:2}};
  expect(()=>useOwnedConsumable({...c,companionEncounter:battle},request)).toThrow('Stale encounter');
  expect(()=>useOwnedConsumable({...c,companionEncounter:{...battle,status:'completed'}},request)).toThrow('Stale encounter');
  expect(c.inventoryLedger?.gear[0].quantity).toBe(2);
 });

 it('prevents a Poisoned application against an immune target',()=>{
  const c=encounter();
  const battle=c.companionEncounter!;
  const immune={...battle.participants.ally,conditionImmunities:['Poisoned']};
  const saved=resolveCompanionSavingThrow({...c,companionEncounter:{
   ...battle,participants:{...battle.participants,ally:immune},
  }},'ally','Constitution',1,13,undefined,{purpose:'avoid-poisoned'});
  expect(saved.effectiveTotal).toBeNull();
  expect(saved.campaign.companionEncounter?.participants.ally.conditions).not.toContain('Poisoned');
 });

 it('refreshes the one-hour duration on a second confirmed dose',()=>{
  const request={name:'Antitoxin' as const,confirmed:true,requestId:'first',expectedQuantity:2,expectedElapsedMinutes:100};
  const first=useOwnedConsumable(base(),request);
  const reloaded=JSON.parse(JSON.stringify(advanceConsumableTime(first,30))) as Campaign;
  const second=useOwnedConsumable(reloaded,{...request,requestId:'second',expectedQuantity:1,expectedElapsedMinutes:130});
  expect(second.antitoxinUntilMinute).toBe(190);
  expect(second.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(useOwnedConsumable(second,request)).toBe(second);
 });
});

it('counts completed combat rounds across reload without changing merchant time',()=>{
 const c=encounter();
 const battle=c.companionEncounter!;
 const active={...c,antitoxinUntilMinute:101,antitoxinCombatSeconds:54,
  companionEncounter:{...battle,order:['nighthawk']}};
 const reloaded=JSON.parse(JSON.stringify(active)) as Campaign;
 expect(antitoxinSecondsRemaining(reloaded)).toBe(6);
 const expired=endCompanionTurn(reloaded,'nighthawk');
 expect(antitoxinSecondsRemaining(expired)).toBe(0);
 expect(expired.elapsedMinutes).toBe(100);
 expect(resolveCompanionSavingThrow(expired,'nighthawk','Constitution',8,13,17,
  {purpose:'avoid-poisoned'}).success).toBe(false);
});

describe('Acid in a single-attack unified encounter',()=>{
 const request={
  name:'Acid' as const,confirmed:true,requestId:'acid-1',expectedQuantity:1,
  expectedElapsedMinutes:100,expectedRound:2,expectedTurnIndex:0,
  expectedActorPosition:{x:2,y:2},targetId:'enemy',expectedTargetHP:12,
  expectedTargetPosition:{x:6,y:2},throwRolls:{saveTotal:12,damage:7},
 };
 function fixture(){
  const campaign=encounter(),battle=campaign.companionEncounter!;
  return {...campaign,
   characterIdentity:{} as NonNullable<Campaign['characterIdentity']>,
   character:{...campaign.character!,level:1,proficiencyBonus:2,scores:{...campaign.character!.scores,dex:16}},
   inventoryLedger:{...campaign.inventoryLedger!,gear:[{name:'Acid',quantity:1}]},
   companionEncounter:{...battle,order:['nighthawk','enemy'],participants:{
    nighthawk:battle.participants.nighthawk,enemy:{...battle.participants.nighthawk,x:6,actorKind:'enemy'},
   }},
  } as Campaign;
 }
 it('uses the attack and vial once and deals 2d6 damage on a failed save',()=>{
  const current=fixture(), next=useOwnedConsumable(current,request);
  expect(next.companionEncounter?.participants.enemy.hp).toBe(5);
  expect(next.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(next.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(useOwnedConsumable(next,request)).toBe(next);
  expect(current.companionEncounter?.participants.enemy.hp).toBe(12);
 });
 it('consumes the vial on a successful save without dealing damage',()=>{
  const next=useOwnedConsumable(fixture(),{...request,throwRolls:{saveTotal:13,damage:7}});
  expect(next.companionEncounter?.participants.enemy.hp).toBe(12);
  expect(next.inventoryLedger?.gear[0].quantity).toBe(0);
 });
 it('rejects stale or out-of-range targets and unverified rolls',()=>{
  const current=fixture(),battle=current.companionEncounter!;
  expect(()=>useOwnedConsumable(current,{...request,expectedTargetHP:11})).toThrow('Stale target');
  expect(()=>useOwnedConsumable(current,{...request,throwRolls:{saveTotal:8,damage:13}})).toThrow('Invalid verified Acid rolls');
  const distant={...current,companionEncounter:{...battle,participants:{
   ...battle.participants,enemy:{...battle.participants.enemy,x:7},
  }}};
  expect(()=>useOwnedConsumable(distant,{...request,expectedTargetPosition:{x:7,y:2}})).toThrow('within 20 feet');
  expect(current.inventoryLedger?.gear[0].quantity).toBe(1);
 });
 it.each([['Fiend',5],['Undead',5],['Other',12]] as const)('uses Holy Water against a verified %s', (targetType,hp)=>{
  const source=fixture();
  const campaign={...source,inventoryLedger:{...source.inventoryLedger!,gear:[{name:'Holy Water',quantity:1}]}};
  const next=useOwnedConsumable(campaign,{...request,name:'Holy Water',throwRolls:{saveTotal:12,damage:7,targetType}});
  expect(next.companionEncounter?.participants.enemy.hp).toBe(hp);
  expect(next.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(next.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(()=>useOwnedConsumable(campaign,{...request,name:'Holy Water'})).toThrow('DM-verified creature type');
 });

 it('ignites a creature, ticks once at turn start after reload, and ends with the Prone action',()=>{
  const source=fixture();
  const campaign={...source,inventoryLedger:{...source.inventoryLedger!,gear:[{name:'Alchemist’s Fire',quantity:1}]}};
  const flask={...request,name:'Alchemist’s Fire' as const,throwRolls:{saveTotal:12,damage:3}};
  const hit=useOwnedConsumable(campaign,flask);
  expect(hit.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(hit.companionEncounter?.participants.enemy.hp).toBe(9);
  expect(hit.companionEncounter?.burningCreatures).toEqual(['enemy']);
  const reloaded=JSON.parse(JSON.stringify(hit)) as Campaign;
  const tick=endCompanionTurn(reloaded,'nighthawk',()=>2);
  expect(tick.companionEncounter?.participants.enemy.hp).toBe(7);
  const extinguished=extinguishCompanionFire(tick,'enemy','Roll on ground');
  expect(extinguished.companionEncounter?.burningCreatures).toEqual([]);
  expect(extinguished.companionEncounter?.participants.enemy.conditions).toContain('Prone');
  expect(extinguished.companionEncounter?.participants.enemy.actionUsed).toBe(true);
  const next=endCompanionTurn(endCompanionTurn(extinguished,'enemy'),'nighthawk');
  expect(next.companionEncounter?.participants.enemy.hp).toBe(7);
 });
 it('spends the flask on a successful save and allows verified environmental extinguishing',()=>{
  const source=fixture();
  const campaign={...source,inventoryLedger:{...source.inventoryLedger!,gear:[{name:'Alchemist’s Fire',quantity:1}]}};
  const flask={...request,name:'Alchemist’s Fire' as const,throwRolls:{saveTotal:13,damage:4}};
  const saved=useOwnedConsumable(campaign,flask);
  expect(saved.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(saved.companionEncounter?.burningCreatures).toBeUndefined();
  const hit=useOwnedConsumable(campaign,{...flask,throwRolls:{...flask.throwRolls,saveTotal:12}});
  const doused=extinguishCompanionFire(hit,'enemy','DM verified');
  expect(doused.companionEncounter?.participants.enemy.actionUsed).toBe(false);
  expect(doused.companionEncounter?.burningCreatures).toEqual([]);
 });

 it('coats without impact damage and adds five fire damage once after reload',()=>{
  const source=fixture();
  const campaign={...source,inventoryLedger:{...source.inventoryLedger!,gear:[{name:'Oil',quantity:1}]}};
  const oil={...request,name:'Oil' as const,throwRolls:{saveTotal:12,damage:0}};
  const coated=useOwnedConsumable(campaign,oil);
  expect(coated.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(coated.companionEncounter?.participants.enemy.hp).toBe(12);
  const reloaded=JSON.parse(JSON.stringify(coated)) as Campaign;
  const acid=damageCompanion(reloaded,'enemy',1,'Acid');
  const ignited=damageCompanion(acid,'enemy',2,'Fire');
  expect(ignited.companionEncounter?.participants.enemy.hp).toBe(4);
  expect(ignited.companionEncounter?.participants.enemy.oilExpires).toBeUndefined();
  expect(damageCompanion(ignited,'enemy',2,'Fire').companionEncounter?.participants.enemy.hp).toBe(2);
 });
 it('expires at the corresponding turn ten rounds later and does not coat on a successful save',()=>{
  const source=fixture();
  const campaign={...source,inventoryLedger:{...source.inventoryLedger!,gear:[{name:'Oil',quantity:1}]}};
  const requestOil={...request,name:'Oil' as const,throwRolls:{saveTotal:13,damage:0}};
  expect(useOwnedConsumable(campaign,requestOil).companionEncounter?.participants.enemy.oilExpires).toBeUndefined();
  let coated=useOwnedConsumable(campaign,{...requestOil,throwRolls:{saveTotal:12,damage:0}});
  for(let round=0;round<9;round++)coated=endCompanionTurn(endCompanionTurn(coated,'nighthawk'),'enemy');
  coated=endCompanionTurn(coated,'nighthawk');
  expect(coated.companionEncounter?.participants.enemy.oilExpires).toBeDefined();
  const dry=endCompanionTurn(coated,'enemy');
  expect(dry.companionEncounter?.participants.enemy.oilExpires).toBeUndefined();
  expect(damageCompanion(dry,'enemy',2,'Fire').companionEncounter?.participants.enemy.hp).toBe(10);
 });

 it('automatically fails an object save, consumes Acid once and persists destruction',()=>{
  const campaign=addCompanionObject(fixture(),'Crate',6,2,7);
  const throwRequest={...request,targetId:'Crate',expectedTargetHP:7,throwRolls:{saveTotal:100,damage:7}};
  const hit=useOwnedConsumable(campaign,throwRequest);
  expect(hit.companionEncounter?.objects?.Crate.hp).toBe(0);
  expect(hit.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(useOwnedConsumable(hit,throwRequest)).toBe(hit);
 });
 it('coats an object and ignites the coating exactly once after reload',()=>{
  const original=fixture();
  const campaign=addCompanionObject({...original,inventoryLedger:{...original.inventoryLedger!,gear:[{name:'Oil',quantity:1}]}},'Crate',6,2,12);
  const coated=useOwnedConsumable(campaign,{...request,name:'Oil',targetId:'Crate',throwRolls:{saveTotal:100,damage:0}});
  const reloaded=JSON.parse(JSON.stringify(coated)) as Campaign;
  const ignited=recordCompanionObjectFire(reloaded,'Crate',2);
  expect(ignited.companionEncounter?.objects?.Crate.hp).toBe(5);
  expect(recordCompanionObjectFire(ignited,'Crate',2).companionEncounter?.objects?.Crate.hp).toBe(3);
 });

 it('coats one verified weapon, survives reload and deals Poison once on qualifying damage',()=>{
  const source=fixture();
  const campaign={...source,encounterLoadout:{weaponId:'dagger'},
   inventoryLedger:{...source.inventoryLedger!,gear:[{name:'Dagger',quantity:1},{name:'Poison, Basic',quantity:1}]}};
  const use={...request,name:'Poison, Basic' as const,expectedWeaponId:'dagger'};
  const coated=useOwnedConsumable(campaign,use);
  expect(coated.companionEncounter?.participants.nighthawk.bonusActionUsed).toBe(true);
  expect(coated.inventoryLedger?.gear[1].quantity).toBe(0);
  expect(useOwnedConsumable(coated,use)).toBe(coated);
  const loaded=JSON.parse(JSON.stringify(coated)) as Campaign;
  const missed=attackCompanion(loaded,'nighthawk','enemy',1,3,10,3,0,'Piercing',20,undefined,undefined,'dagger',()=>4);
  expect(missed.companionEncounter?.basicPoison).toBeDefined();
  const ready=endCompanionTurn(endCompanionTurn(missed,'nighthawk'),'enemy');
  const hit=attackCompanion(ready,'nighthawk','enemy',15,3,10,3,0,'Piercing',20,undefined,undefined,'dagger',()=>4);
  expect(hit.companionEncounter?.participants.enemy.hp).toBe(5);
  expect(hit.companionEncounter?.basicPoison).toBeUndefined();
 });
 it('expires a Basic Poison coating ten rounds after confirmation',()=>{
  const source=fixture();
  let campaign:Campaign={...source,encounterLoadout:{weaponId:'dagger'},
   inventoryLedger:{...source.inventoryLedger!,gear:[{name:'Dagger',quantity:1},{name:'Poison, Basic',quantity:1}]}};
  campaign=useOwnedConsumable(campaign,{...request,name:'Poison, Basic',expectedWeaponId:'dagger'});
  for(let round=0;round<10;round++)campaign=endCompanionTurn(endCompanionTurn(campaign,'nighthawk'),'enemy');
  expect(campaign.companionEncounter?.basicPoison).toBeUndefined();
 });

});

describe('confirmed adventuring lights',()=>{
 function supplies(){
  const campaign=base();
  return {...campaign,inventoryLedger:{...campaign.inventoryLedger!,gear:[
   {name:'Candle',quantity:2},{name:'Torch',quantity:1},{name:'Lamp',quantity:1},
   {name:'Oil',quantity:1},{name:'Tinderbox',quantity:1},
  ]}};
 }
 const light={confirmed:true,requestId:'ignition',expectedElapsedMinutes:100,expectedLight:'null',
  lightOperation:'light' as const,expectedQuantity:1};
 it.each([['Candle',2],['Torch',1]] as const)('lights a %s for one hour and retains the Tinderbox',(name,quantity)=>{
  const before=supplies();
  const request={...light,name,expectedQuantity:quantity};
  const lit=useOwnedConsumable(before,request);
  expect(lit.inventoryLedger?.gear.find(item=>item.name===name)?.quantity).toBe(quantity-1);
  expect(lit.inventoryLedger?.gear.find(item=>item.name==='Tinderbox')?.quantity).toBe(1);
  expect(useOwnedConsumable(lit,request)).toBe(lit);
  expect(equipmentLightRemaining(advanceConsumableTime(lit,59),name)).toBe(60);
  expect(equipmentLightRemaining(advanceConsumableTime(lit,60),name)).toBe(0);
 });
 it('requires a Tinderbox and checks current lamp fuel ownership',()=>{
  const before=supplies();
  const noTinderbox={...before,inventoryLedger:{...before.inventoryLedger,gear:before.inventoryLedger.gear.filter(item=>item.name!=='Tinderbox')}};
  expect(()=>useOwnedConsumable(noTinderbox,{...light,name:'Torch'})).toThrow('Tinderbox');
  expect(()=>useOwnedConsumable(before,{...light,name:'Lamp',expectedFuelQuantity:2})).toThrow('Oil');
 });
 it('pauses and resumes cumulative lamp fuel without spending another flask',()=>{
  const lit=useOwnedConsumable(supplies(),{...light,name:'Lamp',expectedFuelQuantity:1});
  const later=advanceConsumableTime(lit,60);
  const paused=useOwnedConsumable(later,{...light,name:'Lamp',requestId:'pause',
   expectedElapsedMinutes:160,expectedLight:JSON.stringify(later.equipmentLights?.Lamp),lightOperation:'extinguish'});
  const reloaded=JSON.parse(JSON.stringify(advanceConsumableTime(paused,30))) as Campaign;
  expect(equipmentLightRemaining(reloaded,'Lamp')).toBe(18000);
  const resumed=useOwnedConsumable(reloaded,{...light,name:'Lamp',requestId:'resume',
   expectedElapsedMinutes:190,expectedLight:JSON.stringify(reloaded.equipmentLights?.Lamp)});
  expect(resumed.inventoryLedger?.gear.find(item=>item.name==='Oil')?.quantity).toBe(0);
  expect(equipmentLightRemaining(advanceConsumableTime(resumed,300),'Lamp')).toBe(0);
 });
 it('uses the combat Bonus Action to light and counts six seconds per round',()=>{
  const source=encounter(),battle=source.companionEncounter!;
  const current={...source,inventoryLedger:supplies().inventoryLedger,companionEncounter:{...battle,
   participants:{...battle.participants,ally:{...battle.participants.ally,actorKind:'enemy' as const}}}};
  const lit=useOwnedConsumable(current,{...light,name:'Torch',expectedRound:2,expectedTurnIndex:0,expectedActorPosition:{x:2,y:2}});
  expect(lit.companionEncounter?.participants.nighthawk.bonusActionUsed).toBe(true);
  const next=endCompanionTurn(endCompanionTurn(lit,'nighthawk'),'ally');
  expect(equipmentLightRemaining(next,'Torch')).toBe(3594);
 });
});

describe('field supplies',()=>{
 const request={confirmed:true,requestId:'supply',expectedQuantity:1,expectedElapsedMinutes:100};
 function supplies(name:string,combat=false){
  const source=combat?encounter():base();
  return {...source,journal:[],inventoryLedger:{...source.inventoryLedger!,gear:[{name,quantity:1}]}};
 }
 it('consumes and records one ration for the current day',()=>{
  const current=supplies('Rations');
  const next=useOwnedConsumable(current,{...request,name:'Rations',expectedSupplyState:JSON.stringify(provisionsToday(current))});
  expect(next.inventoryLedger?.gear[0].quantity).toBe(0);
  expect(provisionsToday(next).rations).toBe(1);
  expect(provisionsToday({...next,elapsedMinutes:1440}).rations).toBe(0);
 });
 it('drinks and refills one waterskin without consuming the container',()=>{
  const current=supplies('Waterskin');
  const drink=useOwnedConsumable(current,{...request,name:'Waterskin',supplyOperation:'drink',
   expectedSupplyState:JSON.stringify({today:provisionsToday(current),pints:4})});
  expect(drink.waterskinPints).toBe(3);
  const refill=useOwnedConsumable(drink,{...request,requestId:'refill',name:'Waterskin',supplyOperation:'refill',
   expectedSupplyState:JSON.stringify({today:provisionsToday(drink),pints:3})});
  expect(refill.waterskinPints).toBe(4);
  expect(provisionsToday(refill).waterPints).toBe(1);
  expect(refill.inventoryLedger?.gear[0].quantity).toBe(1);
 });
 it('records a successful verified Rope knot without consuming the rope',()=>{
  const current=supplies('Rope');
  const tied=useOwnedConsumable(current,{...request,name:'Rope',ropeCheck:10,expectedSupplyState:'false'});
  expect(tied.ropeKnotted).toBe(true);
  expect(tied.inventoryLedger?.gear[0].quantity).toBe(1);
 });
 it.each(['Ball Bearings','Caltrops'] as const)('deploys %s and resolves normal grid entry once per turn',(name)=>{
  const current=supplies(name,true),battle=current.companionEncounter!;
  const source={...current,companionEncounter:{...battle,participants:{...battle.participants,
   nighthawk:{...battle.participants.nighthawk,speedFeet:30,dashFeet:0,movementSpentFeet:0}}}};
  const deployed=useOwnedConsumable(source,{...request,name,ground:{x:2,y:1,level:true},
   expectedRound:2,expectedTurnIndex:0,expectedActorPosition:{x:2,y:2}});
  expect(deployed.inventoryLedger?.gear[0].quantity).toBe(0);
  // Bearings cover two squares in each direction. Approach from a non-covered square.
  const active=deployed.companionEncounter!;
  const staged={...deployed,companionEncounter:{...active,participants:{
   ...active.participants,nighthawk:{...active.participants.nighthawk,x:1,y:1},
  }}};
  expect(()=>moveCompanion(staged,'nighthawk',2,1)).toThrow('verified Dexterity save');
  const entered=moveCompanion(staged,'nighthawk',2,1,5);
  expect(entered.companionEncounter?.groundEntries).toEqual([JSON.stringify(['nighthawk','supply'])]);
  if(name==='Ball Bearings')expect(entered.companionEncounter?.participants.nighthawk.conditions).toContain('Prone');
  else{
   expect(entered.companionEncounter?.participants.nighthawk.hp).toBe(11);
   expect(()=>moveCompanion(entered,'nighthawk',1,1)).toThrow('zero HP or speed');
  }
 });
});

describe('recover deployed supplies',()=>{
 it.each(['Ball Bearings','Caltrops'] as const)('recovers %s once and advances ten minutes',(name)=>{
  const source=encounter(),battle=source.companionEncounter!;
  const deployed={...source,companionEncounter:{...battle,id:'recovery-encounter',status:'completed' as const,
   groundSupplies:[{id:'deployment',name,x:2,y:1}]}};
  const request={name,requestId:'recovery',confirmed:true,expectedQuantity:0,expectedElapsedMinutes:100,
   expectedEncounterId:'recovery-encounter',recoverGround:{id:'deployment',accessConfirmed:true}};
  expect(()=>useOwnedConsumable(deployed,{...request,recoverGround:{...request.recoverGround,accessConfirmed:false}})).toThrow('Confirm access');
  expect(()=>useOwnedConsumable({...deployed,companionEncounter:{...deployed.companionEncounter,status:'active'}},request)).toThrow('completed encounter');
  const recovered=useOwnedConsumable(deployed,request);
  expect(recovered.elapsedMinutes).toBe(110);
  expect(recovered.companionEncounter?.groundSupplies).toEqual([]);
  expect(recovered.inventoryLedger?.gear.find(item=>item.name===name)?.quantity).toBe(1);
  expect(useOwnedConsumable(recovered,request)).toBe(recovered);
  expect(()=>useOwnedConsumable(recovered,{...request,requestId:'replay',expectedElapsedMinutes:110})).toThrow('Confirm access');
 });
});

describe('equipment rules follow-up',()=>{
 function field(){
  const campaign=encounter(),battle=campaign.companionEncounter!;
  return {...campaign,inventoryLedger:{...campaign.inventoryLedger!,gear:[{name:'Rope',quantity:1}]},
   companionEncounter:{...battle,participants:{...battle.participants,
    ally:{...battle.participants.ally,actorKind:'enemy' as const,hp:12,
     conditions:['Grappled' as const],deathSaves:undefined}}}};
 }
 it('checks each displaced creature once per deployment per turn across reload',()=>{
  const source=field(),battle=source.companionEncounter;
  const deployed={...source,companionEncounter:{...battle,groundSupplies:[
   {id:'bearings',name:'Ball Bearings' as const,x:4,y:2}]}};
  expect(()=>moveCompanionForced(deployed,'ally',4,2)).toThrow('verified Dexterity save');
  const first=moveCompanionForced(deployed,'ally',4,2,1);
  expect(first.companionEncounter?.participants.ally.conditions).toContain('Prone');
  expect(first.companionEncounter?.pendingOpportunity).toBeUndefined();
  const reloaded=JSON.parse(JSON.stringify(first)) as Campaign;
  const back=moveCompanionForced(reloaded,'ally',3,2);
  const twice=moveCompanionForced(back,'ally',4,2);
  expect(twice.companionEncounter?.groundEntries).toHaveLength(1);
  const near=moveCompanionForced(twice,'nighthawk',3,3);
  const second=moveCompanionForced(near,'nighthawk',4,3,15);
  expect(second.companionEncounter?.groundEntries).toHaveLength(2);
 });
 it('binds with Utilize, checks an escape on the target turn and keeps the rope',()=>{
  const bound=bindCompanionWithRope(field(),'ally');
  expect(bound.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(bound.companionEncounter?.participants.ally.conditions).toContain('Restrained');
  const turn=endCompanionTurn(bound,'nighthawk');
  const escaped=escapeCompanionRope(turn,'ally',15,'escape');
  expect(escaped.companionEncounter?.participants.ally.conditions).toEqual(['Grappled']);
  expect(escaped.inventoryLedger?.gear[0].quantity).toBe(1);
 });
 it('breaks rope at DC 20 while preserving prior restraint',()=>{
  const source=field();
  const already={...source,companionEncounter:{...source.companionEncounter,participants:{
   ...source.companionEncounter.participants,ally:{...source.companionEncounter.participants.ally,conditions:['Restrained' as const]}}}};
  const turn=endCompanionTurn(bindCompanionWithRope(already,'ally'),'nighthawk');
  const broken=escapeCompanionRope(turn,'ally',20,'break');
  expect(broken.companionEncounter?.participants.ally.conditions).toContain('Restrained');
  expect(broken.inventoryLedger?.gear[0].quantity).toBe(0);
 });
 it('assesses dehydration after the first full opted-in day',()=>{
  const current={...base(),characterIdentity:{} as NonNullable<Campaign['characterIdentity']>};
  const track=useOwnedConsumable(current,{name:'Rations',confirmed:true,requestId:'track',
   expectedQuantity:0,expectedElapsedMinutes:100,supplyOperation:'track'});
  const incomplete=advanceConsumableTime(track,1340);
  expect(incomplete.character?.exhaustionLevel).toBeUndefined();
  const complete=advanceConsumableTime(incomplete,1440);
  expect(complete.character?.exhaustionLevel).toBe(1);
  expect(complete.provisionTracking).toMatchObject({nextDay:2,missedFood:1,waterLevels:1});
 });
 it('counts successive foodless days and applies exhaustion after five hydrated days',()=>{
  let current:Campaign={...base(),elapsedMinutes:0,provisionTracking:{nextDay:0,missedFood:0,foodLevels:0,waterLevels:0}};
  for(let day=0;day<5;day++)current=advanceConsumableTime({...current,provisions:{day,rations:0,waterPints:8}},1440);
  expect(current.character?.exhaustionLevel).toBe(1);
  expect(current.provisionTracking?.foodLevels).toBe(1);
 });
});

describe('persisted equipment light clock boundaries',()=>{
 it('never increases a light duration when a saved start time is in the future',()=>{
  const c={...base(),elapsedMinutes:100,equipmentLights:{Torch:{remainingSeconds:120,startedAt:6060}}} as unknown as Campaign;
  expect(equipmentLightRemaining(c,'Torch')).toBe(120);
  expect(equipmentLightRemaining(advanceConsumableTime(c,1),'Torch')).toBe(120);
  expect(equipmentLightRemaining(advanceConsumableTime(c,2),'Torch')).toBe(60);
 });
 it('clamps malformed persisted duration to the SRD maximum',()=>{
  const c={...base(),equipmentLights:{Candle:{remainingSeconds:999999}}} as unknown as Campaign;
  expect(equipmentLightRemaining(c,'Candle')).toBe(3600);
 });
});

describe('persisted consumable time integrity',()=>{
 it('rejects a negative, fractional or overflowing saved game clock before advancing',()=>{
  for(const elapsedMinutes of [-1,1.5,Number.MAX_SAFE_INTEGER]){
   const campaign={...base(),elapsedMinutes} as Campaign;
   expect(()=>advanceConsumableTime(campaign,1)).toThrow('Invalid elapsed game time');
   expect(campaign.elapsedMinutes).toBe(elapsedMinutes);
  }
 });
});

describe('SRD ground Oil deployment integrity',()=>{
 it('spills one flask atomically, persists square and rejects duplicate confirmation',()=>{
  const c={...encounter(),inventoryLedger:{...base().inventoryLedger!,gear:[{name:'Oil',quantity:2}]}} as Campaign;
  const request={name:'Oil' as const,confirmed:true,requestId:'oil-square-1',expectedQuantity:2,expectedElapsedMinutes:100,expectedRound:2,expectedTurnIndex:0,expectedActorPosition:{x:2,y:2},ground:{x:3,y:2,level:true}};
  const used=useOwnedConsumable(c,request);
  expect(used.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(used.companionEncounter?.groundOil).toEqual([{id:'oil-square-1',x:3,y:2,expiresRound:12}]);
  expect(used.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(useOwnedConsumable(used,request)).toBe(used);
  const lit=igniteGroundOil(used,'oil-square-1');
  expect(lit.companionEncounter?.groundOil?.[0].ignitedRound).toBe(2);
  const entered={...lit,companionEncounter:{...lit.companionEncounter!,participants:{...lit.companionEncounter!.participants,nighthawk:{...lit.companionEncounter!.participants.nighthawk,x:3,y:2}}}};
  const damaged=resolveGroundOilHazard(entered,'nighthawk');
  expect(damaged.companionEncounter?.participants.nighthawk.hp).toBe(entered.companionEncounter.participants.nighthawk.hp-5);
  expect(resolveGroundOilHazard(damaged,'nighthawk').companionEncounter?.participants.nighthawk.hp).toBe(damaged.companionEncounter?.participants.nighthawk.hp);
  expect(()=>igniteGroundOil(lit,'oil-square-1')).toThrow('No unignited ground Oil');
  const igniteRequest={name:'Oil' as const,requestId:'ignite-square-1',confirmed:true,expectedQuantity:0,expectedElapsedMinutes:100,expectedEncounterId:used.companionEncounter?.id,expectedRound:2,expectedTurnIndex:0,igniteOilId:'oil-square-1'};
  const confirmed=useOwnedConsumable(used,igniteRequest);
  expect(confirmed.companionEncounter?.groundOil?.[0].ignitedRound).toBe(2);
  expect(useOwnedConsumable(confirmed,igniteRequest)).toBe(confirmed);
  expect(confirmed.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(()=>useOwnedConsumable(used,{...igniteRequest,expectedRound:3})).toThrow('Stale Oil ignition');
  const expired={...lit,companionEncounter:{...lit.companionEncounter!,round:5}} as Campaign;
  expect(resolveGroundOilHazard(expired,'nighthawk')).toBe(expired);
  const boundary={...lit,companionEncounter:{...lit.companionEncounter!,round:4,turnIndex:0,groundOil:lit.companionEncounter!.groundOil!.map(o=>({...o,damagedActorsThisTurn:[]})),participants:{...lit.companionEncounter!.participants,nighthawk:{...lit.companionEncounter!.participants.nighthawk,x:3,y:2}}}} as Campaign;
  expect(resolveGroundOilHazard(boundary,'nighthawk').companionEncounter?.participants.nighthawk.hp).toBe(boundary.companionEncounter!.participants.nighthawk.hp-5);
  const pastBoundary={...boundary,companionEncounter:{...boundary.companionEncounter!,turnIndex:1}};
  expect(resolveGroundOilHazard(pastBoundary,'nighthawk')).toBe(pastBoundary);
  expect(()=>useOwnedConsumable(c,{...request,ground:{x:5,y:2,level:true}})).toThrow('verified level ground');
  expect(()=>useOwnedConsumable(c,{...request,confirmed:false})).toThrow('confirmation');
 });
});

describe('ground Oil combat turn integration',()=>{
 const staged=()=>{
  const c=encounter(),b=c.companionEncounter!;
  return {...c,companionEncounter:{...b,groundOil:[{id:'slick',x:3,y:2,expiresRound:12,ignitedRound:2,ignitedTurn:0}],participants:{...b.participants,nighthawk:{...b.participants.nighthawk,speedFeet:30,dashFeet:0,movementSpentFeet:0,rogueMovedThisTurn:false},ally:{...b.participants.ally,x:6,y:6}}}} as Campaign;
 };
 it('applies fire on verified entry, not again on exit or turn end, and persists after reload',()=>{
  const c=staged();
  const moved=moveCompanion(c,'nighthawk',3,2);
  expect(moved.companionEncounter!.participants.nighthawk.hp).toBe(7);
  const persisted=JSON.parse(JSON.stringify(moved)) as Campaign;
  const departed=moveCompanion(persisted,'nighthawk',2,2);
  expect(departed.companionEncounter!.participants.nighthawk.hp).toBe(7);
  expect(endCompanionTurn(departed,'nighthawk').companionEncounter!.participants.nighthawk.hp).toBe(7);
 });
 it('applies end-turn damage if stationary and clears per-turn damage tracking',()=>{
  const c=staged(),b=c.companionEncounter!;
  const stationary={...c,companionEncounter:{...b,participants:{...b.participants,nighthawk:{...b.participants.nighthawk,x:3,y:2}}}} as Campaign;
  const ended=endCompanionTurn(stationary,'nighthawk');
  expect(ended.companionEncounter!.participants.nighthawk.hp).toBe(7);
  expect(ended.companionEncounter!.groundOil?.[0].damagedActorsThisTurn).toEqual([]);
 });
 it('expires unlit slicks after one minute of combat rounds',()=>{
  const c=staged(),b=c.companionEncounter!;
  const dry={...c,companionEncounter:{...b,round:11,turnIndex:1,groundOil:[{id:'dry',x:3,y:2,expiresRound:12}]}} as Campaign;
  const advanced=endCompanionTurn(dry,'ally');
  expect(advanced.companionEncounter!.groundOil).toEqual([]);
 });
});
