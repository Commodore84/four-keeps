import type {Campaign} from './campaign';
export type ConsumableName='Antitoxin'|"Healer's Kit";
export interface ConsumableRequest {
 name:ConsumableName;requestId:string;confirmed:boolean;expectedQuantity:number;
 expectedElapsedMinutes:number;expectedKitUses?:number;targetId?:string;expectedTargetHP?:number;
 expectedTurnIndex?:number;expectedRound?:number;expectedActorPosition?:{x:number;y:number};
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
 if(r.name!=='Antitoxin'&&r.name!=="Healer's Kit")throw Error('Unknown consumable');
 if((c.elapsedMinutes??0)!==r.expectedElapsedMinutes)throw Error('Stale campaign time');
 if(c.combat?.status==='initiative-set'||c.combat?.status==='awaiting-initiative')throw Error('Legacy combat unsupported');
 const b=c.companionEncounter,active=b?.status==='active',actor=active?b.participants.nighthawk:undefined;
 if(active&&(b.mode!=='unified'||b.order[b.turnIndex]!=='nighthawk'||!actor))throw Error('Unsupported encounter turn');
 if(active&&(r.expectedRound!==b.round||r.expectedTurnIndex!==b.turnIndex))throw Error('Stale encounter turn');
 if(actor&&(r.expectedActorPosition?.x!==actor.x||r.expectedActorPosition?.y!==actor.y))throw Error('Stale actor position');
 if(actor&&(actor.hp<=0||actor.conditions.some(x=>['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious'].includes(x))))throw Error('Actor cannot act');
 if(actor&&(r.name==='Antitoxin'?actor.bonusActionUsed:actor.actionUsed))throw Error('Required action already spent');
 const gear=c.inventoryLedger?.gear,idx=gear?.findIndex(g=>g.name===r.name);
 if(!gear||idx===undefined||idx<0||gear[idx].quantity!==r.expectedQuantity||gear[idx].quantity<1)throw Error('Stale consumable inventory');
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
 const nextBattle=active&&b?{...b,participants:{...b.participants,nighthawk:{...actor!,...(r.name==='Antitoxin'?{bonusActionUsed:true}:{actionUsed:true})},...nextTarget},log:[...b.log,r.name+' used by Nighthawk']} :b;
 return {...c,consumableUseIds:[...(c.consumableUseIds??[]),r.requestId],
  ...(r.name==='Antitoxin'?{antitoxinUntilMinute:(c.elapsedMinutes??0)+60}:{healerKitUsesRemaining:kitUses===0?10:kitUses}),
  ...(nextBattle?{companionEncounter:nextBattle}:{}),
  inventoryLedger:{...c.inventoryLedger!,gear:gear.map((g,i)=>i===idx?{...g,quantity:g.quantity-(consume?1:0)}:g)},
  updatedAt:new Date().toISOString()};
}
