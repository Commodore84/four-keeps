import {castItemMagicMissile,castItemWeb,type WebPlacement} from './companionEncounter';
import {requireArmorSpellcasting} from './armorEffects';
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
type WandCopy={charges:number;lastRechargeDay?:number};
export type WornMagicItem={worn?:true;attuned?:true;charges?:number;lastRechargeDay?:number;copies?:WandCopy[];activeCopy?:number;attunedCopy?:number};
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
  if(weapon?.properties?.includes('Two-Handed')||campaign.encounterLoadout?.offhandWeaponId||weapon&&campaign.encounterLoadout?.shieldId||
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
 return {...campaign.magicEquipment,[item.id]:{...campaign.magicEquipment?.[item.id],attuned:true,...(item.id==='wand-of-web'?{attunedCopy:campaign.magicEquipment?.[item.id]?.activeCopy??0}:{})}};
}

export function magicProtectionBonus(campaign:Campaign):number {
 return ownedMagicWearables(campaign).reduce((sum,item)=>sum+(item.worn&&(!item.attunement||item.attuned)?item.protection:0),0);
}

export function forgetSoldMagicEquipment(campaign:Campaign,name:string,remaining=0):MagicEquipmentState|undefined {
 const state=campaign.magicEquipment;
 const item=ownedMagicWearables(campaign).find(item=>item.name===name);
 if(!state||!item)return state;
 const next={...state};
 if(remaining===0)delete next[item.id];
 else if(item.id.startsWith('wand-')){
  const old=next[item.id];
  if(old)next[item.id]={...old,copies:old.copies?.slice(0,remaining),
   ...((old.activeCopy??0)>=remaining?{activeCopy:0,worn:undefined}:{}),
   ...((old.attunedCopy??0)>=remaining?{attunedCopy:undefined,attuned:undefined}:{})};
 }
 return next;
}

const wands={
 'wand-of-magic-missiles':{spell:'Magic Missile',maxSpend:3},
 'wand-of-web':{spell:'Web',maxSpend:1},
} as const;
export type WandId=keyof typeof wands;

function wandCopies(campaign:Campaign,id:WandId,quantity:number):WandCopy[]{
 const state=campaign.magicEquipment?.[id];
 return Array.from({length:quantity},(_,index)=>state?.copies?.[index]??(index===0?{charges:state?.charges??7,lastRechargeDay:state?.lastRechargeDay}:{charges:7}));
}

export function magicWandStatus(campaign:Campaign,itemId:string,copyIndex?:number) {
 if(!Object.hasOwn(wands,itemId))return null;
 const id=itemId as WandId;
 const item=ownedMagicWearables(campaign).find(entry=>entry.id===id);
 if(!item)return null;
 const quantity=campaign.inventoryLedger?.gear.find(entry=>entry.name===item.name)?.quantity??0;
 const state=campaign.magicEquipment?.[id];
 const activeCopy=state?.activeCopy??0;
 const index=copyIndex??activeCopy;
 if(!Number.isSafeInteger(index)||index<0||index>=quantity)return null;
 const copies=wandCopies(campaign,id,quantity);
 const copy=copies[index];
 const day=Math.floor((campaign.elapsedMinutes??0)/1440);
 return {id,name:item.name,...wands[id],charges:copy.charges,day,held:item.worn&&activeCopy===index,
  ready:item.worn&&activeCopy===index&&(!item.attunement||item.attuned&&(state?.attunedCopy??0)===index),
  copyIndex:index,quantity,copies,canRecharge:copy.charges<7&&day>(copy.lastRechargeDay??day)};
}

export function selectMagicWandCopy(campaign:Campaign,itemId:WandId,index:number):Campaign{
 const wand=magicWandStatus(campaign,itemId,index);
 if(!wand)throw Error('This wand copy is not owned.');
 const readied=wearMagicItem(campaign,itemId,true);
 return {...readied,magicEquipment:{...readied.magicEquipment,[itemId]:{...readied.magicEquipment?.[itemId],activeCopy:index}}};
}

export type WandUseRequest={id:string;spent:number;target:string;confirmed:boolean;lastChargeRoll?:number;copyIndex?:number;
 missile?:{targets:string[];dice:number[];shieldedTargets?:string[]};web?:WebPlacement};

export function spendMagicWand(campaign:Campaign,itemId:WandId,request:WandUseRequest):Campaign {
 requireArmorSpellcasting(campaign);
 if(campaign.consumableUseIds?.includes(request.id))throw Error('Wand action already recorded.');
 if(campaign.combat&&campaign.combat.status!=='completed')throw Error('Wands require a unified encounter for combat use.');
 const item=magicWandStatus(campaign,itemId,request.copyIndex);
 if(!item?.ready)throw Error('Hold the owned wand and satisfy its attunement requirement first.');
 if(!request.confirmed||!request.id.trim()||!request.target.trim()||request.target.length>100)throw Error('Confirm the target or area with the DM.');
 if(!Number.isInteger(request.spent)||request.spent<1||request.spent>item.maxSpend||request.spent>item.charges)throw Error('Invalid wand charge expenditure.');
 const charges=item.charges-request.spent;
 if(charges===0&&(!Number.isInteger(request.lastChargeRoll)||request.lastChargeRoll!<1||request.lastChargeRoll!>20))throw Error('Enter the last-charge d20 roll.');
 const destroyed=charges===0&&request.lastChargeRoll===1;
 const active=campaign.companionEncounter?.status==='active';
 let resolved=campaign;
 if(active){
  if(itemId==='wand-of-magic-missiles'&&request.missile)resolved=castItemMagicMissile(campaign,request.spent,request.missile.targets,request.missile.dice,request.missile.shieldedTargets);
  else if(itemId==='wand-of-web'&&request.web)resolved=castItemWeb(campaign,request.web,13);
  else throw Error('Provide the verified encounter targets, dice or Web origin.');
 }
 const state:MagicEquipmentState={...resolved.magicEquipment};
 const prior=state[itemId];
 const copies=[...item.copies];
 copies[item.copyIndex]={charges,lastRechargeDay:copies[item.copyIndex].lastRechargeDay??item.day};
 if(destroyed)copies.splice(item.copyIndex,1);
 if(!copies.length)delete state[itemId];
 else if(destroyed){
  const attunedCopy=prior?.attunedCopy??0;
  state[itemId]={...prior,copies,worn:undefined,activeCopy:0,attuned:attunedCopy===item.copyIndex?undefined:prior?.attuned,
   attunedCopy:attunedCopy===item.copyIndex?undefined:attunedCopy-(attunedCopy>item.copyIndex?1:0)};
 } else state[itemId]={...prior,copies};
 const now=new Date().toISOString();
 return {...resolved,magicEquipment:state,
  ...(destroyed&&resolved.inventoryLedger?{inventoryLedger:{...resolved.inventoryLedger,gear:resolved.inventoryLedger.gear.flatMap(row=>row.name!==item.name?[row]:row.quantity>1?[{...row,quantity:row.quantity-1}]:[])}}:{}),
  consumableUseIds:[...(resolved.consumableUseIds??[]),request.id],
  ...(active?{}:{spellEffects:[...(resolved.spellEffects??[]),{id:request.id,spell:item.spell,target:request.target.trim(),status:'awaiting-adjudication',createdAt:now}]}),
  journal:[...resolved.journal,{id:request.id,kind:'system',createdAt:now,text:item.name+' spent '+request.spent+' charge(s) for '+item.spell+'. '+(active?'Resolved in encounter.':'Spell effects require DM adjudication.')+(destroyed?' The wand was destroyed on its last charge.':'')}],
 };
}

export function rechargeMagicWand(campaign:Campaign,itemId:WandId,d6:number,copyIndex?:number):Campaign {
 const item=magicWandStatus(campaign,itemId,copyIndex);
 if(!item?.canRecharge)throw Error('No dawn recharge is available for this wand.');
 if(!Number.isInteger(d6)||d6<1||d6>6)throw Error('Enter a verified recharge d6 roll.');
 const copies=[...item.copies];
 copies[item.copyIndex]={charges:Math.min(7,item.charges+d6+1),lastRechargeDay:item.day};
 return {...campaign,magicEquipment:{...campaign.magicEquipment,[itemId]:{...campaign.magicEquipment?.[itemId],copies}}};
}
