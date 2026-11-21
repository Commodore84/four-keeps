import type {Campaign} from './campaign';
// SRD 5.2.1: preserve the four potencies without changing the legacy compendium ID.
export const HEALING_POTIONS = {
  'Potion of Healing': {dice:2,faces:4,bonus:2,rarity:'Common'},
  'Potion of Healing (greater)': {dice:4,faces:4,bonus:4,rarity:'Uncommon'},
  'Potion of Healing (superior)': {dice:8,faces:4,bonus:8,rarity:'Rare'},
  'Potion of Healing (supreme)': {dice:10,faces:4,bonus:20,rarity:'Very Rare'},
} as const;
export type HealingPotionName = keyof typeof HEALING_POTIONS;
export function isHealingPotion(name:string):name is HealingPotionName {
 return Object.prototype.hasOwnProperty.call(HEALING_POTIONS,name);
}
export function healingPotionAmount(name:HealingPotionName,rollDie:()=>number):number {
 const {dice,faces,bonus}=HEALING_POTIONS[name];
 let total=bonus;
 for(let i=0;i<dice;i++){const roll=rollDie();if(!Number.isInteger(roll)||roll<1||roll>faces)throw Error('Invalid healing die');total+=roll;}
 return total;
}

export interface HealingPotionRequest {
 name:HealingPotionName;confirmed:boolean;expectedQuantity:number;expectedHP:number;
 rollDie:()=>number;requestId:string;targetId?:string;expectedTargetHP?:number;
 expectedTurnIndex?:number;expectedRound?:number;expectedActorPosition?:{x:number;y:number};expectedTargetPosition?:{x:number;y:number};
}
export function eligiblePotionTargets(campaign:Campaign):{id:string;hp:number;maxHp:number}[]{
 const battle=campaign.companionEncounter;
 if(battle?.status!=='active'||battle.mode!=='unified'||battle.order[battle.turnIndex]!=='nighthawk')return [];
 const actor=battle.participants.nighthawk;
 if(!actor)return [];
 return Object.entries(battle.participants).filter(([id,p])=>id!=='nighthawk'&&p.actorKind!=='enemy'&&(p.actorKind==='party'||!!campaign.subclassActors?.[id])&&p.hp>=0&&!p.deathSaves?.dead&&p.hp<p.maxHp&&Math.max(Math.abs(p.x-actor.x),Math.abs(p.y-actor.y))<=1).map(([id,p])=>({id,hp:p.hp,maxHp:p.maxHp}));
}
/** Pure validation and resolution; the storage transaction commits this result atomically. */
export function useOwnedHealingPotion(campaign:Campaign,request:HealingPotionRequest):Campaign{
 if(!request.confirmed)throw Error('Potion use requires confirmation');
 if(!request.requestId.trim())throw Error('Potion request ID required');
 if(campaign.healingPotionUseIds?.includes(request.requestId))return campaign;
 if(!isHealingPotion(request.name))throw Error('Unknown healing potion');
 const battle=campaign.companionEncounter;
 if(campaign.combat?.status==='initiative-set'||campaign.combat?.status==='awaiting-initiative')throw Error('Legacy encounter potion use unsupported');
 const targetId=request.targetId??'nighthawk';
 if(battle?.status==='active'&&(battle.mode!=='unified'||battle.order[battle.turnIndex]!=='nighthawk'||!battle.participants.nighthawk))throw Error('Unsupported encounter or actor turn');
 if(targetId!=='nighthawk'&&(!battle||battle.status!=='active'||battle.mode!=='unified'))throw Error('Companion administration requires an active unified encounter');
 if(battle?.status==='active'&&(request.expectedTurnIndex!==undefined&&request.expectedTurnIndex!==battle.turnIndex||request.expectedRound!==undefined&&request.expectedRound!==battle.round))throw Error('Stale encounter turn');
 const ch=campaign.character;
 if(!ch||typeof ch.currentHitPoints!=='number'||typeof ch.maxHitPoints!=='number'||!Number.isFinite(ch.currentHitPoints)||!Number.isFinite(ch.maxHitPoints))throw Error('Character HP unavailable');
 if(ch.currentHitPoints!==request.expectedHP)throw Error('Stale character HP');
 if(battle?.status==='active'&&(battle.participants.nighthawk.hp!==ch.currentHitPoints||battle.nighthawkSheetHpSnapshot!==undefined&&battle.nighthawkSheetHpSnapshot!==ch.currentHitPoints))throw Error('Encounter HP snapshot mismatch');
 const actor=battle?.status==='active'?battle.participants.nighthawk:undefined;
 if(actor&&(actor.conditions?.some(c=>['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious'].includes(c))||actor.hp<=0))throw Error('Actor cannot take actions');
 if(actor&&request.expectedActorPosition&&(request.expectedActorPosition.x!==actor.x||request.expectedActorPosition.y!==actor.y))throw Error('Stale actor position');
 if(actor?.bonusActionUsed)throw Error('Bonus Action already spent');
 const recipient=targetId==='nighthawk'?undefined:battle?.participants[targetId];
 if(targetId!=='nighthawk'&&(!recipient||recipient.actorKind==='enemy'||!eligiblePotionTargets(campaign).some(t=>t.id===targetId)))throw Error('Target is not an eligible adjacent ally');
 if(recipient&&(request.expectedTargetHP!==recipient.hp||!request.expectedTargetPosition||request.expectedTargetPosition.x!==recipient.x||request.expectedTargetPosition.y!==recipient.y))throw Error('Stale target HP or position');
 const gear=campaign.inventoryLedger?.gear;
 const index=gear?.findIndex(g=>g.name===request.name);
 if(index===undefined||index<0||!gear)throw Error('Potion not owned');
 const owned=gear[index].quantity;
 if(!Number.isInteger(owned)||owned<1||owned!==request.expectedQuantity)throw Error('Stale or insufficient potion quantity');
 if(targetId==='nighthawk'&&(ch.currentHitPoints<=0||ch.currentHitPoints>=ch.maxHitPoints))throw Error('Potion cannot heal this character');
 const heal=healingPotionAmount(request.name,request.rollDie);
 const hp=targetId==='nighthawk'?Math.min(ch.maxHitPoints,ch.currentHitPoints+heal):ch.currentHitPoints;
 const nextBattle=battle?.status==='active'?{...battle,participants:{...battle.participants,nighthawk:{...battle.participants.nighthawk,...(targetId==='nighthawk'?{bonusActionUsed:true,hp}:{bonusActionUsed:true})},...(recipient?{[targetId]:{...recipient,hp:Math.min(recipient.maxHp,recipient.hp+heal),...(recipient.hp===0?{conditions:recipient.conditions.filter(c=>c!=='Unconscious'),...(recipient.deathSaves?{deathSaves:{successes:0,failures:0,stable:false,dead:false}}:{})}:{})}}:{})},nighthawkSheetHpSnapshot:hp,log:[...battle.log,'Nighthawk used '+request.name+' on '+targetId]}:battle;
 return {...campaign,healingPotionUseIds:[...(campaign.healingPotionUseIds??[]),request.requestId],...(nextBattle?{companionEncounter:nextBattle}:{}),character:{...ch,currentHitPoints:hp},
  inventoryLedger:{...campaign.inventoryLedger!,gear:gear.map((g,i)=>i===index?{...g,quantity:g.quantity-1}:g)},updatedAt:new Date().toISOString()};
}
