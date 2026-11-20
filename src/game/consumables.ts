import type {Campaign} from './campaign';
import {basicPoisonWeapon,throwConsumable,type HolyWaterTargetType} from './companionEncounter';
export type ConsumableName='Poison, Basic'|'Oil'|'Alchemist’s Fire'|'Acid'|'Holy Water'|'Antitoxin'|"Healer's Kit";

export function antitoxinSecondsRemaining(campaign: Campaign): number {
 const minutes = (campaign.antitoxinUntilMinute ?? 0) - (campaign.elapsedMinutes ?? 0);
 return Math.max(0, minutes * 60 - (campaign.antitoxinCombatSeconds ?? 0));
}
/** Only advance time from a verified gameplay time event; never from a UI refresh. */
export function advanceConsumableTime(c:Campaign,minutes:number):Campaign{
 if(!Number.isSafeInteger(minutes)||minutes<=0||minutes>1440)throw Error('Invalid elapsed game time');
 return {...c,elapsedMinutes:(c.elapsedMinutes??0)+minutes};
}

export interface ConsumableRequest {
 name:ConsumableName;requestId:string;confirmed:boolean;expectedQuantity:number;
 expectedElapsedMinutes:number;expectedKitUses?:number;targetId?:string;expectedTargetHP?:number;
 expectedEncounterId?:string;expectedTurnIndex?:number;expectedRound?:number;expectedActorPosition?:{x:number;y:number};
 throwRolls?:{saveTotal:number;damage:number;targetType?:HolyWaterTargetType};
 expectedWeaponId?:string;
 expectedTargetPosition?:{x:number;y:number};
}
export function eligibleKitTargets(c:Campaign){
 const b=c.companionEncounter,actor=b?.participants.nighthawk;
 if(!b||b.status!=='active'||b.mode!=='unified'||b.order[b.turnIndex]!=='nighthawk'||!actor)return [];
 return Object.entries(b.participants).filter(([id,p])=>id!=='nighthawk'&&p.actorKind!=='enemy'&&(p.actorKind==='party'||!!c.subclassActors?.[id])&&p.hp===0&&p.conditions.includes('Unconscious')&&!p.deathSaves?.dead&&!p.deathSaves?.stable&&Math.max(Math.abs(p.x-actor.x),Math.abs(p.y-actor.y))<=1).map(([id,p])=>({id,hp:p.hp}));
}
export function useOwnedConsumable(c:Campaign,r:ConsumableRequest):Campaign{
 if(!r.confirmed||!r.requestId.trim())throw Error('Consumable confirmation and request ID required');
 if(c.consumableUseIds?.includes(r.requestId))return c;
 if(r.name!=='Poison, Basic'&&r.name!=='Oil'&&r.name!=='Alchemist’s Fire'&&r.name!=='Holy Water'&&r.name!=='Acid'&&r.name!=='Antitoxin'&&r.name!=="Healer's Kit")throw Error('Unknown consumable');
 if((c.elapsedMinutes??0)!==r.expectedElapsedMinutes)throw Error('Stale campaign time');
 if(c.combat?.status==='initiative-set'||c.combat?.status==='awaiting-initiative')throw Error('Legacy combat unsupported');
 const b=c.companionEncounter,active=b?.status==='active',actor=active?b.participants.nighthawk:undefined;
 if(active&&(b.mode!=='unified'||b.order[b.turnIndex]!=='nighthawk'||!actor))throw Error('Unsupported encounter turn');
 if((active?b.id:undefined)!==r.expectedEncounterId||!active&&(r.expectedRound!==undefined||r.expectedTurnIndex!==undefined))throw Error('Stale encounter');
 if(active&&(r.expectedRound!==b.round||r.expectedTurnIndex!==b.turnIndex))throw Error('Stale encounter turn');
 if(actor&&(r.expectedActorPosition?.x!==actor.x||r.expectedActorPosition?.y!==actor.y))throw Error('Stale actor position');
 if(actor&&(actor.hp<=0||actor.conditions.some(x=>['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious'].includes(x))))throw Error('Actor cannot act');
 if(actor?.rogueDazeTurns!==undefined&&(actor.rogueDazeChoice==='movement'||actor.movementSpentFeet>0||actor.actionUsed||actor.bonusActionUsed))throw Error('Dazed: choose movement or one action or bonus action');
 if(actor&&(r.name==='Antitoxin'||r.name==='Poison, Basic'?actor.bonusActionUsed:actor.actionUsed))throw Error('Required action already spent');
 const gear=c.inventoryLedger?.gear,idx=gear?.findIndex(g=>g.name===r.name);
 if(!gear||idx===undefined||idx<0||gear[idx].quantity!==r.expectedQuantity||gear[idx].quantity<1)throw Error('Stale consumable inventory');
 if(r.name==='Poison, Basic'){
  const weapon=basicPoisonWeapon(c);
  if(!active||!b||!actor||!weapon||weapon.id!==r.expectedWeaponId||b.basicPoison)
   throw Error('Basic Poison requires an uncoated, individually verified equipped weapon on your turn');
  return {...c,consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],
   companionEncounter:{...b,basicPoison:{weaponId:weapon.id,expiresRound:b.round+10},
    participants:{...b.participants,nighthawk:{...actor,bonusActionUsed:true,
     ...(actor.rogueDazeTurns!==undefined?{rogueDazeChoice:'action' as const}:{})}},
    log:[...b.log,weapon.name+' coated with Basic Poison']},
   inventoryLedger:{...c.inventoryLedger!,gear:gear.map((item,index)=>index===idx?{...item,quantity:item.quantity-1}:item)},
   updatedAt:new Date().toISOString()};
 }
 if(r.name==='Oil'||r.name==='Alchemist’s Fire'||r.name==='Acid'||r.name==='Holy Water'){
  const target=b?.participants[r.targetId??'']??b?.objects?.[r.targetId??''];
  if(!active||!target||!r.targetId||!r.throwRolls)throw Error(r.name+' requires an encounter target and verified rolls');
  if(r.expectedTargetHP!==target.hp||r.expectedTargetPosition?.x!==target.x||r.expectedTargetPosition?.y!==target.y)throw Error('Stale target');
  const resolved=throwConsumable(c,r.name,r.targetId,r.throwRolls.saveTotal,r.throwRolls.damage,r.throwRolls.targetType);
  return {...resolved,consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],
   inventoryLedger:{...c.inventoryLedger!,gear:gear.map((item,index)=>index===idx?{...item,quantity:item.quantity-1}:item)}};
 }
 let nextTarget;
 if(r.name==="Healer's Kit"){
  if(!active||!b||!actor)throw Error('Kit administration requires unified encounter');
  if(r.expectedKitUses!==(c.healerKitUsesRemaining??10))throw Error('Stale kit charges');
  const id=r.targetId??'',p=b.participants[id];
  if(!p||!eligibleKitTargets(c).some(t=>t.id===id))throw Error('Target must be an adjacent unconscious ally at zero HP');
  if(r.expectedTargetHP!==p.hp||r.expectedTargetPosition?.x!==p.x||r.expectedTargetPosition?.y!==p.y)throw Error('Stale target');
  nextTarget={[id]:{...p,deathSaves:{successes:p.deathSaves?.successes??0,failures:p.deathSaves?.failures??0,stable:true,dead:false}}};
 }else if(r.targetId&&r.targetId!=='nighthawk')throw Error('Antitoxin must be drunk by its user');
 const kitUses=r.name==="Healer's Kit"?(c.healerKitUsesRemaining??10)-1:undefined;
 const consume=r.name==='Antitoxin'||kitUses===0;
 const nextBattle=active&&b?{...b,participants:{...b.participants,nighthawk:{...actor!,...(actor!.rogueDazeTurns!==undefined?{rogueDazeChoice:'action' as const}:{}),...(r.name==='Antitoxin'?{bonusActionUsed:true}:{actionUsed:true})},...nextTarget},log:[...b.log,r.name+' used by Nighthawk']} :b;
 return {...c,consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],
  ...(r.name==='Antitoxin'?{antitoxinUntilMinute:(c.elapsedMinutes??0)+60,antitoxinCombatSeconds:0}:{healerKitUsesRemaining:kitUses===0?10:kitUses}),
  ...(nextBattle?{companionEncounter:nextBattle}:{}),
  inventoryLedger:{...c.inventoryLedger!,gear:gear.map((g,i)=>i===idx?{...g,quantity:g.quantity-(consume?1:0)}:g)},
  updatedAt:new Date().toISOString()};
}
