import {awardExperience,type Campaign} from './campaign';
export interface EncounterRewards {xp:number;gold:number;items:{name:string;quantity:number}[]}
/** One atomic campaign update, persisted by the existing transactional save path.
 * Encounter ID is also the XP idempotency key. Repeated submissions cannot mint loot.
 */
export function settleEncounterRewards(campaign:Campaign,rewards:EncounterRewards,now=new Date().toISOString()):Campaign{
 const battle=campaign.companionEncounter;
 if(!battle||battle.status!=='completed')throw Error('Complete the encounter before recording rewards');
 if(battle.settlement)throw Error('Encounter rewards already recorded');
 if(!Number.isSafeInteger(rewards.xp)||rewards.xp<0||rewards.xp>100000||!Number.isSafeInteger(rewards.gold)||rewards.gold<0||rewards.gold>100000||!Array.isArray(rewards.items)||rewards.items.length>100||rewards.items.some(i=>!i.name.trim()||i.name.length>80||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>999))throw Error('Invalid encounter rewards');
 const id=battle.id??crypto.randomUUID();
 const next=rewards.xp?awardExperience(campaign,rewards.xp,'Encounter rewards','encounter-'+id):campaign;
 const ledger=next.inventoryLedger??{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[]};
 const gear=ledger.gear.map(i=>({...i}));
 for(const item of rewards.items){const name=item.name.trim();const existing=gear.find(i=>i.name.toLowerCase()===name.toLowerCase());if(existing)existing.quantity+=item.quantity;else gear.push({name,quantity:item.quantity});}
 const gold=ledger.currency.GP+rewards.gold;
 if(!Number.isSafeInteger(gold)||gear.some(i=>!Number.isSafeInteger(i.quantity)))throw Error('Inventory exceeds safe range');
 return {...next,updatedAt:now,inventoryLedger:{currency:{...ledger.currency,GP:gold},gear},companionEncounter:{...battle,id,settlement:{...rewards,items:rewards.items.map(i=>({name:i.name.trim(),quantity:i.quantity})),completedAt:now}},journal:[...next.journal,{id:'settlement-'+id,kind:'system',text:'Encounter rewards saved: '+rewards.xp+' XP, '+rewards.gold+' GP'+(rewards.items.length?', '+rewards.items.map(i=>i.name+' ×'+i.quantity).join(', '):'')+'.',createdAt:now}]};
}
