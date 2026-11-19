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

/** Confirmed, immutable out-of-combat use. Caller must persist the returned Campaign atomically.
 * This is deliberately not a UI action and cannot run during active encounters.
 */
export function useOwnedHealingPotion(campaign:Campaign,request:{
 name:HealingPotionName;confirmed:boolean;expectedQuantity:number;expectedHP:number;rollDie:()=>number;requestId:string;
}):Campaign{
 if(!request.confirmed)throw Error('Potion use requires confirmation');
 if(!request.requestId.trim())throw Error('Potion request ID required');
 if(campaign.healingPotionUseIds?.includes(request.requestId))return campaign;
 if(!isHealingPotion(request.name))throw Error('Unknown healing potion');
 const battle=campaign.companionEncounter;
 if(campaign.combat?.status==='initiative-set'||campaign.combat?.status==='awaiting-initiative')throw Error('Legacy encounter potion use unsupported');
 if(battle?.status==='active'&&(battle.mode!=='unified'||battle.order[battle.turnIndex]!=='nighthawk'||!battle.participants.nighthawk||battle.participants.nighthawk.bonusActionUsed))throw Error('Bonus Action unavailable in current encounter');
 const ch=campaign.character;
 if(!ch||typeof ch.currentHitPoints!=='number'||typeof ch.maxHitPoints!=='number'||!Number.isFinite(ch.currentHitPoints)||!Number.isFinite(ch.maxHitPoints))throw Error('Character HP unavailable');
 if(ch.currentHitPoints!==request.expectedHP)throw Error('Stale character HP');
 if(battle?.status==='active'&&(battle.participants.nighthawk.hp!==ch.currentHitPoints||battle.nighthawkSheetHpSnapshot!==undefined&&battle.nighthawkSheetHpSnapshot!==ch.currentHitPoints))throw Error('Encounter HP snapshot mismatch');
 const gear=campaign.inventoryLedger?.gear;
 const index=gear?.findIndex(g=>g.name===request.name);
 if(index===undefined||index<0||!gear)throw Error('Potion not owned');
 const owned=gear[index].quantity;
 if(!Number.isInteger(owned)||owned<1||owned!==request.expectedQuantity)throw Error('Stale or insufficient potion quantity');
 if(ch.currentHitPoints<=0||ch.currentHitPoints>=ch.maxHitPoints)throw Error('Potion cannot heal this character');
 const heal=healingPotionAmount(request.name,request.rollDie);
 const nextBattle=battle?.status==='active'?{...battle,participants:{...battle.participants,nighthawk:{...battle.participants.nighthawk,bonusActionUsed:true,hp:Math.min(battle.participants.nighthawk.maxHp,battle.participants.nighthawk.hp+heal)}},nighthawkSheetHpSnapshot:Math.min(ch.maxHitPoints,ch.currentHitPoints+heal),log:[...battle.log,'Nighthawk drank '+request.name]}:battle;
 return {...campaign,healingPotionUseIds:[...(campaign.healingPotionUseIds??[]),request.requestId],...(nextBattle?{companionEncounter:nextBattle}:{}),character:{...ch,currentHitPoints:Math.min(ch.maxHitPoints,ch.currentHitPoints+heal)},
  inventoryLedger:{...campaign.inventoryLedger!,gear:gear.map((g,i)=>i===index?{...g,quantity:g.quantity-1}:g)},
  updatedAt:new Date().toISOString()};
}
