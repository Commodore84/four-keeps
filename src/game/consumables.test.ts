import {resolveCompanionSavingThrow} from './companionEncounter';
import {advanceConsumableTime} from './consumables';
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
  expect(resolveCompanionSavingThrow(c,'nighthawk','Constitution',8,13,17,{purpose:'end-poisoned'}).effectiveTotal).toBe(17);
  expect(resolveCompanionSavingThrow(c,'nighthawk','Constitution',8,13,17,{purpose:'other'}).success).toBe(false);
  expect(()=>resolveCompanionSavingThrow(c,'nighthawk','Constitution',8,13,undefined,{purpose:'avoid-poisoned'})).toThrow('second total');
  expect(resolveCompanionSavingThrow(advanceConsumableTime(c,60),'nighthawk','Constitution',8,13,17,{purpose:'avoid-poisoned'}).success).toBe(false);
  expect(resolveCompanionSavingThrow(advanceConsumableTime(c,59),'nighthawk','Constitution',8,13,17,{purpose:'avoid-poisoned'}).success).toBe(true);
 });
 it('does not grant advantage to allies and cancels disadvantage',()=>{
  const c={...encounter(),antitoxinUntilMinute:160};
  expect(resolveCompanionSavingThrow(c,'ally','Constitution',8,13,17,{purpose:'avoid-poisoned'}).success).toBe(false);
  const restrained={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,nighthawk:{...c.companionEncounter!.participants.nighthawk,conditions:['Restrained']}}}} as Campaign;
  expect(resolveCompanionSavingThrow(restrained,'nighthawk','Dexterity',14,13,2,{purpose:'avoid-poisoned'}).effectiveTotal).toBe(14);
  expect(()=>advanceConsumableTime(c,0)).toThrow();
 });
});
