import {advanceProvisionsClock} from './provisionsClock';
import type {Campaign} from './campaign';
import {basicPoisonWeapon,igniteGroundOil,throwConsumable,type HolyWaterTargetType} from './companionEncounter';
export const equipmentLightRules={
 Candle:{seconds:3600,bright:5,dim:5},
 Lamp:{seconds:21600,bright:15,dim:30},
 Torch:{seconds:3600,bright:20,dim:20},
} as const;
export type EquipmentLight=keyof typeof equipmentLightRules;

function equipmentTime(campaign:Campaign){
 return (campaign.elapsedMinutes??0)*60+(campaign.equipmentCombatSeconds??0);
}

export function equipmentLightRemaining(campaign:Campaign,name:EquipmentLight){
 const light=campaign.equipmentLights?.[name];
 if(!light)return 0;
 return Math.max(0,Math.min(equipmentLightRules[name].seconds,light.remainingSeconds)-Math.max(0,light.startedAt===undefined?0:equipmentTime(campaign)-light.startedAt));
}

export type ConsumableName=EquipmentLight|'Ball Bearings'|'Caltrops'|'Rations'|'Waterskin'|'Rope'|'Poison, Basic'|'Oil'|'Alchemist’s Fire'|'Acid'|'Holy Water'|'Antitoxin'|"Healer's Kit";

export function antitoxinSecondsRemaining(campaign: Campaign): number {
 const minutes = (campaign.antitoxinUntilMinute ?? 0) - (campaign.elapsedMinutes ?? 0);
 return Math.max(0, minutes * 60 - (campaign.antitoxinCombatSeconds ?? 0));
}
/** Only advance time from a verified gameplay time event; never from a UI refresh. */
export function advanceConsumableTime(c:Campaign,minutes:number):Campaign{
 if(!Number.isSafeInteger(minutes)||minutes<=0||minutes>1440||!Number.isSafeInteger(c.elapsedMinutes??0)|| (c.elapsedMinutes??0)<0||!Number.isSafeInteger((c.elapsedMinutes??0)+minutes))throw Error('Invalid elapsed game time');
 return advanceProvisionsClock(c,{...c,elapsedMinutes:(c.elapsedMinutes??0)+minutes});
}

export function provisionsToday(campaign:Campaign){
 const day=Math.floor((campaign.elapsedMinutes??0)/1440);
 return campaign.provisions?.day===day?campaign.provisions:{day,rations:0,waterPints:0};
}

export interface ConsumableRequest {
 name:ConsumableName;requestId:string;confirmed:boolean;expectedQuantity:number;
 expectedElapsedMinutes:number;expectedKitUses?:number;targetId?:string;expectedTargetHP?:number;
 expectedEncounterId?:string;expectedTurnIndex?:number;expectedRound?:number;expectedActorPosition?:{x:number;y:number};
 throwRolls?:{saveTotal:number;damage:number;targetType?:HolyWaterTargetType};
 lightOperation?:'light'|'extinguish';expectedLight?:string;expectedFuelQuantity?:number;
 recoverGround?:{id:string;accessConfirmed:boolean};
 ground?:{x:number;y:number;level:boolean};
 igniteOilId?:string;
 supplyOperation?:'drink'|'refill'|'track';expectedSupplyState?:string;ropeCheck?:number;
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
 if(r.igniteOilId){
  const battle=c.companionEncounter;
  if(!battle||battle.status!=='active'||battle.mode!=='unified'||battle.id!==r.expectedEncounterId||battle.round!==r.expectedRound||battle.turnIndex!==r.expectedTurnIndex||
   (c.elapsedMinutes??0)!==r.expectedElapsedMinutes)throw Error('Stale Oil ignition request');
  const ignited=igniteGroundOil(c,r.igniteOilId);
  return {...ignited,consumableUseIds:[...(c.consumableUseIds??[]),r.requestId]};
 }
 const name=r.name;
 const groundSupply=name==='Ball Bearings'||name==='Caltrops';
 const fieldSupply=name==='Rations'||name==='Waterskin'||name==='Rope';
 const isLight=name==='Candle'||name==='Lamp'||name==='Torch';
 const extinguishing=isLight&&r.lightOperation==='extinguish';
 if(!groundSupply&&!fieldSupply&&!isLight&&r.name!=='Poison, Basic' &&r.name!=='Oil'&&r.name!=='Alchemist’s Fire'&&r.name!=='Holy Water'&&r.name!=='Acid'&&r.name!=='Antitoxin'&&r.name!=="Healer's Kit")throw Error('Unknown consumable');
 if((c.elapsedMinutes??0)!==r.expectedElapsedMinutes)throw Error('Stale campaign time');
 if(c.combat?.status==='initiative-set'||c.combat?.status==='awaiting-initiative')throw Error('Legacy combat unsupported');
 const b=c.companionEncounter,active=b?.status==='active',actor=active?b.participants.nighthawk:undefined;
 if(r.supplyOperation==='track'){
  if(name!=='Rations'||active||!c.characterIdentity||!c.character||c.provisionTracking)
   throw Error('Supply tracking requires an imported character outside combat');
  const minutes=c.elapsedMinutes??0;
  return {...c,provisionTracking:{nextDay:Math.ceil(minutes/1440),missedFood:0,foodLevels:0,waterLevels:0},
   consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],updatedAt:new Date().toISOString()};
 }
 if(r.recoverGround){
  const supply=b?.groundSupplies?.find(entry=>entry.id===r.recoverGround!.id);
  if(!groundSupply||b?.status!=='completed'||b.mode!=='unified'||!supply||supply.name!==name||
     b.id!==r.expectedEncounterId||!r.recoverGround.accessConfirmed)
   throw Error('Confirm access to a deployed supply in the completed encounter');
  const ledger=c.inventoryLedger;
  const gear=ledger?.gear;
  const item=gear?.find(entry=>entry.name===name);
  if(!ledger||!gear||(item?.quantity??0)!==r.expectedQuantity)throw Error('Stale recovery inventory');
  const timed=advanceConsumableTime(c,10);
  return {...timed,
   consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],
   companionEncounter:{...b,groundSupplies:b.groundSupplies!.filter(entry=>entry.id!==supply.id),
    log:[...b.log,name+' recovered after 10 minutes']},
   inventoryLedger:{...ledger,gear:item?gear.map(entry=>entry===item?{...entry,quantity:entry.quantity+1}:entry)
    :[...gear,{name,quantity:1}]},updatedAt:new Date().toISOString()};
 }
 if(active&&(b.mode!=='unified'||b.order[b.turnIndex]!=='nighthawk'||!actor))throw Error('Unsupported encounter turn');
 if((active?b.id:undefined)!==r.expectedEncounterId||!active&&(r.expectedRound!==undefined||r.expectedTurnIndex!==undefined))throw Error('Stale encounter');
 if(active&&(r.expectedRound!==b.round||r.expectedTurnIndex!==b.turnIndex))throw Error('Stale encounter turn');
 if(actor&&(r.expectedActorPosition?.x!==actor.x||r.expectedActorPosition?.y!==actor.y))throw Error('Stale actor position');
 if(actor&&(actor.hp<=0||actor.conditions.some(x=>['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious'].includes(x))))throw Error('Actor cannot act');
 if(actor?.rogueDazeTurns!==undefined&&(actor.rogueDazeChoice==='movement'||actor.movementSpentFeet>0||actor.actionUsed||actor.bonusActionUsed))throw Error('Dazed: choose movement or one action or bonus action');
 if(actor&&fieldSupply&&name!=='Rope')throw Error('Use provisions during exploration');
 if(actor&&(r.name==='Antitoxin'||r.name==='Poison, Basic'||isLight&&!extinguishing?actor.bonusActionUsed:actor.actionUsed))throw Error('Required action already spent');
 if(isLight){
  const light=c.equipmentLights?.[name];
  const remaining=equipmentLightRemaining(c,name);
  if(JSON.stringify(light??null)!==r.expectedLight)throw Error('Stale light state');
  if(r.lightOperation!=='light'&&r.lightOperation!=='extinguish')throw Error('Confirm a light operation');
  const gear=c.inventoryLedger?.gear;
  const item=gear?.find(entry=>entry.name===name);
  if(!gear||(item?.quantity??0)!==r.expectedQuantity)throw Error('Stale light inventory');
  const oil=gear.find(entry=>entry.name==='Oil');
  const refill=name==='Lamp'&&!extinguishing&&remaining===0;
  if(extinguishing){
   if(name!=='Lamp'||!remaining||light?.startedAt===undefined)throw Error('No lit lamp to extinguish');
  }else{
   if(!item?.quantity)throw Error('Light source is not owned');
   if(remaining&&light?.startedAt!==undefined)throw Error('This type of light is already burning');
   if(!gear.some(entry=>entry.name==='Tinderbox'&&entry.quantity>0))throw Error('An owned Tinderbox is required');
   if(refill&&(!oil?.quantity||oil.quantity!==r.expectedFuelQuantity))throw Error('Current Oil flask is required');
  }
  const burnedItem=extinguishing?null:refill?oil:name==='Lamp'?null:item;
  const nextLight=extinguishing?{remainingSeconds:remaining}
   :{remainingSeconds:remaining||equipmentLightRules[name].seconds,startedAt:equipmentTime(c)};
  return {...c,equipmentLights:{...c.equipmentLights,[name]:nextLight},
   consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],
   ...(b&&active&&actor?{companionEncounter:{...b,participants:{...b.participants,nighthawk:{
    ...actor,...(extinguishing?{actionUsed:true}:{bonusActionUsed:true}),
    ...(actor.rogueDazeTurns!==undefined?{rogueDazeChoice:'action' as const}:{})}},
    log:[...b.log,name+(extinguishing?' extinguished':' lit')]}}:{}),
   inventoryLedger:{...c.inventoryLedger!,gear:gear.map(entry=>entry===burnedItem?{...entry,quantity:entry.quantity-1}:entry)},
   updatedAt:new Date().toISOString()};
 }
 const gear=c.inventoryLedger?.gear,idx=gear?.findIndex(g=>g.name===r.name);
 if(!gear||idx===undefined||idx<0||gear[idx].quantity!==r.expectedQuantity||gear[idx].quantity<1)throw Error('Stale consumable inventory');
 if(groundSupply||name==='Oil'&&r.ground){
  const ground=r.ground,size=name==='Ball Bearings'?2:1,reach=name==='Ball Bearings'?2:1;
  if(!b||!active||!actor||!ground?.level||!Number.isInteger(ground.x)||!Number.isInteger(ground.y)||
   ground.x<0||ground.y<0||ground.x+size>20||ground.y+size>20||
   Math.max(Math.abs(ground.x-actor.x),Math.abs(ground.y-actor.y))>reach)
   throw Error('Choose verified level ground in range');
  const overlaps=b.groundSupplies?.some(supply=>{
   const existing=supply.name==='Ball Bearings'?2:1;
   return supply.x<ground.x+size&&ground.x<supply.x+existing&&supply.y<ground.y+size&&ground.y<supply.y+existing;
  });
  if(overlaps||b.groundOil?.some(o=>o.x===ground.x&&o.y===ground.y&&b.round<o.expiresRound))throw Error('Ground supplies already occupy that space');
  return {...c,consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],
   inventoryLedger:{...c.inventoryLedger!,gear:gear.map((item,index)=>index===idx?{...item,quantity:item.quantity-1}:item)},
   companionEncounter:{...b,...(name==='Oil'?{groundOil:[...(b.groundOil??[]),{id:r.requestId,x:ground.x,y:ground.y,expiresRound:b.round+10}]}:{groundSupplies:[...(b.groundSupplies??[]),{id:r.requestId,name:name as 'Ball Bearings'|'Caltrops',x:ground.x,y:ground.y}]}),
    participants:{...b.participants,nighthawk:{...actor,actionUsed:true,
      ...(actor.rogueDazeTurns!==undefined?{rogueDazeChoice:'action' as const}:{})}},
    log:[...b.log,name+' deployed (Utilize)']},updatedAt:new Date().toISOString()};
 }
 if(fieldSupply){
  const today=provisionsToday(c);
  const pints=c.waterskinPints??4;
  const state=name==='Rope'?c.ropeKnotted??false:name==='Waterskin'?{today,pints}:today;
  if(r.expectedSupplyState!==JSON.stringify(state))throw Error('Stale supply state');
  const confirmed={...c,consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],updatedAt:new Date().toISOString()};
  if(name==='Rations'){
   return {...confirmed,...(c.provisionTracking?{provisionTracking:{...c.provisionTracking,foodLevels:0,missedFood:0}}:{}),provisions:{...today,rations:today.rations+1},
    inventoryLedger:{...c.inventoryLedger!,gear:gear.map((item,index)=>index===idx?{...item,quantity:item.quantity-1}:item)}};
  }
  if(name==='Waterskin'){
   if(gear[idx].quantity!==1)throw Error('Individual waterskins require a single tracked container');
   if(r.supplyOperation==='refill'){
    if(pints>=4)throw Error('Waterskin is already full');
    return {...confirmed,waterskinPints:4};
   }
   if(r.supplyOperation!=='drink'||pints<=0)throw Error('Choose a drink from a nonempty waterskin');
   return {...confirmed,...(c.provisionTracking&&today.waterPints+1>=8?{provisionTracking:{...c.provisionTracking,waterLevels:0}}:{}),waterskinPints:pints-1,provisions:{...today,waterPints:today.waterPints+1}};
  }
  if(gear[idx].quantity!==1||c.ropeKnotted||Object.values(b?.participants??{}).some(actor=>actor.ropeBound)||!Number.isInteger(r.ropeCheck)||Math.abs(r.ropeCheck!)>100)
   throw Error('An unknotted, individually tracked rope and a verified check are required');
  const success=r.ropeCheck!>=10;
  return {...confirmed,ropeKnotted:success,
   journal:[...c.journal,{id:r.requestId,text:success?'Tied a Rope knot':'Failed to tie a Rope knot',
    createdAt:confirmed.updatedAt,kind:'system'}],
   ...(active&&b&&actor?{companionEncounter:{...b,participants:{...b.participants,
    nighthawk:{...actor,actionUsed:true,...(actor.rogueDazeTurns!==undefined?{rogueDazeChoice:'action' as const}:{})}},
    log:[...b.log,success?'Rope knot tied (Utilize)':'Rope knot check failed (Utilize)']}}:{})};
 }
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
