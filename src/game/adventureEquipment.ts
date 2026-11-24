import {isHealingPotion,type HealingPotionRequest} from './healingPotions';
import {isStrengthPotion,RESISTANCE_TYPES} from './temporaryEffects';
import type {Campaign} from './campaign';
import {provisionsToday,useOwnedConsumable,type ConsumableRequest} from './consumables';

/** Narrow, explicit gear requests use the same confirmation and inventory
 * transaction as the Player panel. Other uses remain open-ended DM actions. */
export function adventureEquipmentRequest(campaign:Campaign,message:string,requestId:string):ConsumableRequest|null {
 const intent=message.trim();
 const light=/^(?:i\s+)?light\s+(?:(?:a|the|my)\s+)?(torch|candle|lamp)[.!]?$/i.exec(intent)?.[1]?.toLowerCase();
 const damage=RESISTANCE_TYPES.find(type=>new RegExp('^(?:i )?drink (?:(?:a|the|my) )?potion of '+type+' resistance[.!]?$','i').test(intent));
 const strength=campaign.inventoryLedger?.gear.find(row=>isStrengthPotion(row.name)&&new RegExp('^(?:i )?drink (?:(?:a|the|my) )?'+row.name+'[.!]?$','i').test(intent))?.name;
 const name=strength&&isStrengthPotion(strength)?strength:damage?'Potion of Resistance':light==='torch'?'Torch':light==='candle'?'Candle':light==='lamp'?'Lamp':
  /^(?:i\s+)?(?:drink|take|use)\s+(?:(?:an?|the|my)\s+)?antitoxin[.!]?$/i.test(intent)?'Antitoxin':
  /^(?:i\s+)?eat\s+(?:(?:a|the|my|one)\s+)?rations?[.!]?$/i.test(intent)?'Rations':null;
 if(!name)return null;
 const quantity=(item:string)=>campaign.inventoryLedger?.gear.find(row=>row.name===item)?.quantity??0;
 if(!quantity(name))throw Error('You do not have '+name+' in your inventory.');
 const request:ConsumableRequest={
  name,requestId,confirmed:false,...(damage?{resistanceType:damage}:{}),expectedQuantity:quantity(name),expectedElapsedMinutes:campaign.elapsedMinutes??0,
  ...(name==='Rations'?{expectedSupplyState:JSON.stringify(provisionsToday(campaign))}:{}),
  ...(name==='Torch'||name==='Candle'||name==='Lamp'?{lightOperation:'light',expectedLight:JSON.stringify(campaign.equipmentLights?.[name]??null),expectedFuelQuantity:quantity('Oil')}:{}),
 };
 // Check constraints against the current immutable snapshot before offering confirmation.
 useOwnedConsumable(campaign,{...request,confirmed:true});
 return request;
}

export function adventureHealingPotionRequest(campaign:Campaign,message:string,requestId:string):Omit<HealingPotionRequest,'rollDie'>|null{
 const match=/^(?:i )?(?:drink|take) (?:(?:a|the|my) )?(?:(greater|superior|supreme) )?(?:healing potion|potion of (?:(greater|superior|supreme) )?healing)[.!]?$/i.exec(message.trim());
 if(!match)return null;
 const potency=(match[1]??match[2])?.toLowerCase();
 const potion=campaign.inventoryLedger?.gear.find(row=>row.quantity>0&&isHealingPotion(row.name)&&
  (potency?row.name.toLowerCase().includes(potency):row.name==='Potion of Healing'));
 if(!potion||!isHealingPotion(potion.name))throw Error('You do not own that healing potion.');
 const hp=campaign.character?.currentHitPoints;
 if(hp===undefined||hp<=0||hp>=(campaign.character?.maxHitPoints??0))throw Error('This character cannot regain hit points from a potion right now.');
 return {name:potion.name,expectedQuantity:potion.quantity,expectedHP:hp,requestId,confirmed:false};
}
