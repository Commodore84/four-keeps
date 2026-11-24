import type {Campaign} from './campaign';
import {provisionsToday,useOwnedConsumable,type ConsumableRequest} from './consumables';

/** Narrow, explicit gear requests use the same confirmation and inventory
 * transaction as the Player panel. Other uses remain open-ended DM actions. */
export function adventureEquipmentRequest(campaign:Campaign,message:string,requestId:string):ConsumableRequest|null {
 const intent=message.trim();
 const light=/^(?:i\s+)?light\s+(?:(?:a|the|my)\s+)?(torch|candle|lamp)[.!]?$/i.exec(intent)?.[1]?.toLowerCase();
 const name=light==='torch'?'Torch':light==='candle'?'Candle':light==='lamp'?'Lamp':
  /^(?:i\s+)?(?:drink|take|use)\s+(?:(?:an?|the|my)\s+)?antitoxin[.!]?$/i.test(intent)?'Antitoxin':
  /^(?:i\s+)?eat\s+(?:(?:a|the|my|one)\s+)?rations?[.!]?$/i.test(intent)?'Rations':null;
 if(!name)return null;
 const quantity=(item:string)=>campaign.inventoryLedger?.gear.find(row=>row.name===item)?.quantity??0;
 if(!quantity(name))throw Error('You do not have '+name+' in your inventory.');
 const request:ConsumableRequest={
  name,requestId,confirmed:false,expectedQuantity:quantity(name),expectedElapsedMinutes:campaign.elapsedMinutes??0,
  ...(name==='Rations'?{expectedSupplyState:JSON.stringify(provisionsToday(campaign))}:{}),
  ...(name==='Torch'||name==='Candle'||name==='Lamp'?{lightOperation:'light',expectedLight:JSON.stringify(campaign.equipmentLights?.[name]??null),expectedFuelQuantity:quantity('Oil')}:{}),
 };
 // Check constraints against the current immutable snapshot before offering confirmation.
 useOwnedConsumable(campaign,{...request,confirmed:true});
 return request;
}
