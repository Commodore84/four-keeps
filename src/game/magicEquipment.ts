import {ITEM_BY_ID} from './creationEquipment';
import type {Campaign} from './campaign';

// These specific SRD wearables have reviewed runtime behavior. The compendium
// describes many other items whose effects are resolved in conversation.
const wearable = {
 'cloak-of-protection': {name:'Cloak of Protection', attunement:true, protection:1},
 'ring-of-protection': {name:'Ring of Protection', attunement:true, protection:1},
 'boots-of-elvenkind': {name:'Boots of Elvenkind', attunement:false, protection:0},
 'wand-of-magic-missiles': {name:'Wand of Magic Missiles', attunement:false, protection:0},
 'wand-of-web': {name:'Wand of Web', attunement:true, protection:0},
} as const;
type WearableId=keyof typeof wearable;
export type WornMagicItem={worn?:true;attuned?:true;charges?:number;lastRechargeDay?:number};
export type MagicEquipmentState=Partial<Record<WearableId,WornMagicItem>>;
export type MagicAttunementChoice={itemId:WearableId;end?:boolean};

export function ownedMagicWearables(campaign:Campaign) {
 return (Object.keys(wearable) as WearableId[]).filter(id=>campaign.inventoryLedger?.gear.some(row=>row.name===wearable[id].name&&row.quantity>0)).map(id=>({
  id,...wearable[id],worn:!!campaign.magicEquipment?.[id]?.worn,attuned:!!campaign.magicEquipment?.[id]?.attuned,
 }));
}

export function wearMagicItem(campaign:Campaign,itemId:WearableId,worn:boolean):Campaign {
 if(campaign.companionEncounter?.status==='active'||campaign.combat&&campaign.combat.status!=='completed')throw Error('Adjust magic equipment outside combat.');
 if(!ownedMagicWearables(campaign).some(item=>item.id===itemId))throw Error('The magic item is not in inventory.');
 if(worn&&itemId.startsWith('wand-')){
  const weapon=ITEM_BY_ID[campaign.encounterLoadout?.weaponId??''];
  if(weapon?.properties?.includes('Two-Handed')||weapon&&campaign.encounterLoadout?.shieldId||
    ownedMagicWearables(campaign).some(item=>item.id!==itemId&&item.worn&&item.id.startsWith('wand-')))throw Error('Free a hand before holding this wand.');
 }
 return {...campaign,magicEquipment:{...campaign.magicEquipment,[itemId]:{...campaign.magicEquipment?.[itemId],worn:worn?true:undefined}}};
}

/** Called by the short-rest transaction after all rest selections are validated. */
export function completeMagicAttunement(campaign:Campaign,choice:MagicAttunementChoice):MagicEquipmentState {
 const items=ownedMagicWearables(campaign);
 const item=items.find(item=>item.id===choice.itemId);
 if(!item?.attunement)throw Error('This item cannot be attuned through the current rules.');
 if(choice.end&&item.attuned){
  return {...campaign.magicEquipment,[item.id]:{...campaign.magicEquipment?.[item.id],attuned:undefined}};
 }
 if(choice.end||item.attuned)throw Error('Attunement status is already set.');
 if(item.id==='wand-of-web'&&!campaign.character?.cantrips?.length&&!campaign.character?.preparedSpells?.length)throw Error('The Wand of Web requires a Spellcaster.');
 if(items.filter(item=>item.attuned).length>=3)throw Error('You may attune to at most three items.');
 return {...campaign.magicEquipment,[item.id]:{...campaign.magicEquipment?.[item.id],attuned:true}};
}

export function magicProtectionBonus(campaign:Campaign):number {
 return ownedMagicWearables(campaign).reduce((sum,item)=>sum+(item.worn&&(!item.attunement||item.attuned)?item.protection:0),0);
}

export function forgetSoldMagicEquipment(campaign:Campaign,name:string):MagicEquipmentState|undefined {
 const state=campaign.magicEquipment;
 const item=ownedMagicWearables(campaign).find(item=>item.name===name);
 if(!state||!item)return state;
 const next={...state};
 delete next[item.id];
 return next;
}

const wands={
 'wand-of-magic-missiles':{spell:'Magic Missile',maxSpend:3},
 'wand-of-web':{spell:'Web',maxSpend:1},
} as const;
export type WandId=keyof typeof wands;

export function magicWandStatus(campaign:Campaign,itemId:string) {
 if(!Object.hasOwn(wands,itemId))return null;
 const id=itemId as WandId;
 const item=ownedMagicWearables(campaign).find(entry=>entry.id===id);
 const quantity=campaign.inventoryLedger?.gear.find(entry=>entry.name===item?.name)?.quantity??0;
 if(!item)return null;
 const state=campaign.magicEquipment?.[id];
 const day=Math.floor((campaign.elapsedMinutes??0)/1440);
 const charges=state?.charges??7;
 return {id,name:item.name,...wands[id],charges,day,held:item.worn,ready:quantity===1&&item.worn&&(!item.attunement||item.attuned),multiple:quantity!==1,canRecharge:quantity===1&&charges<7&&day>(state?.lastRechargeDay??day)};
}

export function spendMagicWand(campaign:Campaign,itemId:WandId,request:{id:string;spent:number;target:string;confirmed:boolean;lastChargeRoll?:number}):Campaign {
 if(campaign.consumableUseIds?.includes(request.id))throw Error('Wand action already recorded.');
 if(campaign.companionEncounter?.status==='active'||campaign.combat&&campaign.combat.status!=='completed')throw Error('DM must adjudicate combat wand use.');
 const item=magicWandStatus(campaign,itemId);
 if(!item?.ready)throw Error('Hold the owned wand and satisfy its attunement requirement first.');
 if(!request.confirmed||!request.id.trim()||!request.target.trim()||request.target.length>100)throw Error('Confirm the target or area with the DM.');
 if(!Number.isInteger(request.spent)||request.spent<1||request.spent>item.maxSpend||request.spent>item.charges)throw Error('Invalid wand charge expenditure.');
 const charges=item.charges-request.spent;
 if(charges===0&&(!Number.isInteger(request.lastChargeRoll)||request.lastChargeRoll!<1||request.lastChargeRoll!>20))throw Error('Enter the last-charge d20 roll.');
 const destroyed=charges===0&&request.lastChargeRoll===1;
 const state:MagicEquipmentState={...campaign.magicEquipment,[itemId]:{...campaign.magicEquipment?.[itemId],charges,lastRechargeDay:campaign.magicEquipment?.[itemId]?.lastRechargeDay??item.day}};
 if(destroyed)delete state[itemId];
 const now=new Date().toISOString();
 return {...campaign,magicEquipment:state,
  ...(destroyed&&campaign.inventoryLedger?{inventoryLedger:{...campaign.inventoryLedger,gear:campaign.inventoryLedger.gear.filter(row=>row.name!==item.name)}}:{}),
  consumableUseIds:[...(campaign.consumableUseIds??[]),request.id],
  spellEffects:[...(campaign.spellEffects??[]),{id:request.id,spell:item.spell,target:request.target.trim(),status:'awaiting-adjudication',createdAt:now}],
  journal:[...campaign.journal,{id:request.id,kind:'system',createdAt:now,text:item.name+' spent '+request.spent+' charge(s) for '+item.spell+(itemId==='wand-of-magic-missiles'?' at rank '+request.spent:'')+'. Spell effects require DM adjudication.'+(destroyed?' The wand was destroyed on its last charge.':'')}],
 };
}

export function rechargeMagicWand(campaign:Campaign,itemId:WandId,d6:number):Campaign {
 const item=magicWandStatus(campaign,itemId);
 if(!item?.canRecharge)throw Error('No dawn recharge is available for this wand.');
 if(!Number.isInteger(d6)||d6<1||d6>6)throw Error('Enter a verified recharge d6 roll.');
 return {...campaign,magicEquipment:{...campaign.magicEquipment,[itemId]:{...campaign.magicEquipment?.[itemId],charges:Math.min(7,item.charges+d6+1),lastRechargeDay:item.day}}};
}
