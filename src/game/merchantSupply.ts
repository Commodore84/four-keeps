import type {Campaign} from './campaign';
import {merchantCatalogFor,merchantTypeForItem,settlementTier,walletCopper,merchantStockKeyForCampaign,merchantInitialStock} from './frontierShop';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';

const nowMinutes=(c:Campaign)=>Math.max(0,c.elapsedMinutes??0);
const locationKey=(c:Campaign)=>(c.location||'unknown').trim().toLowerCase();
const denomination=[['PP',1000],['GP',100],['EP',50],['SP',10],['CP',1]] as const;
function debit(c:Campaign,cost:number):Campaign{
 const ledger=c.inventoryLedger;
 if(!ledger||!Number.isSafeInteger(cost)||cost<0||walletCopper(ledger.currency)<cost)throw Error('Insufficient funds for supplier order.');
 let remaining=walletCopper(ledger.currency)-cost;
 const currency={...ledger.currency};
 for(const [coin,value] of denomination){currency[coin]=Math.floor(remaining/value);remaining%=value;}
 return {...c,inventoryLedger:{...ledger,currency}};
}
/** A city supplier can procure standard nonmagical merchandise, even when the shop shelf is empty. */
export function prepareCitySupplyOrder(c:Campaign,itemId:string,quantity:number,id:string):Campaign{
 if(settlementTier(c)!=='city'||!c.characterIdentity||c.adventureSession?.status!=='exploring')throw Error('City supplier unavailable.');
 if(c.pendingMerchantSupplyOrder||c.pendingMerchantPurchase)throw Error('Finish the existing merchant transaction.');
 if(!id||!Number.isSafeInteger(quantity)||quantity<1||quantity>20)throw Error('Invalid supplier order.');
 if((c.merchantSupplyOrders??[]).some(o=>o.id===id))throw Error('Supplier order already exists.');
 const item=OFFICIAL_EQUIPMENT_2024.find(i=>i.id===itemId);
 if(!item||/magic item|spell scroll/i.test(item.category))throw Error('Item cannot be ordered from this supplier.');
 const merchant=merchantTypeForItem(item);
 if(!merchantCatalogFor('city',merchant).some(i=>i.id===itemId))throw Error('No city supplier carries this item.');
 const cost=item.costCp*quantity;
 if(!Number.isSafeInteger(cost)||walletCopper(c.inventoryLedger?.currency)<cost)throw Error('Insufficient funds for supplier order.');
 const lead=item.costCp>=5000?7*1440:item.costCp>=1000?3*1440:1440;
 return {...c,pendingMerchantSupplyOrder:{id,settlement:locationKey(c),merchant,itemId,quantity,unitCostCp:item.costCp,readyAtMinutes:nowMinutes(c)+lead}};
}
/** Explicit confirmation charges once. Cancellation is free. */
export function confirmCitySupplyOrder(c:Campaign,id:string,confirmed:boolean):Campaign{
 const pending=c.pendingMerchantSupplyOrder;
 if(!pending||pending.id!==id)throw Error('No matching supplier order.');
 if(!confirmed)return {...c,pendingMerchantSupplyOrder:undefined};
 if(pending.settlement!==locationKey(c)||settlementTier(c)!=='city')throw Error('Return to the ordering city.');
 if((c.merchantSupplyOrders??[]).some(o=>o.id===id))throw Error('Supplier order already exists.');
 const item=OFFICIAL_EQUIPMENT_2024.find(i=>i.id===pending.itemId);
 if(!item||item.costCp!==pending.unitCostCp||!Number.isSafeInteger(pending.quantity)||pending.quantity<1||pending.quantity>20||!Number.isSafeInteger(pending.readyAtMinutes)||pending.readyAtMinutes<nowMinutes(c))throw Error('Supplier quote invalid or expired.');
 const charged=debit(c,pending.quantity*pending.unitCostCp);
 return {...charged,pendingMerchantSupplyOrder:undefined,merchantSupplyOrders:[...(c.merchantSupplyOrders??[]),{...pending,placedAtMinutes:nowMinutes(c),status:'ordered'}]};
}
/** Collection, not delivery time, grants goods; repeat collection is rejected. */
export function collectCitySupplyOrder(c:Campaign,id:string):Campaign{
 const order=c.merchantSupplyOrders?.find(o=>o.id===id);
 if(!order||order.status!=='ordered')throw Error('Order already collected or unavailable.');
 if(locationKey(c)!==order.settlement||settlementTier(c)!=='city')throw Error('Collect at the ordering city.');
 if(nowMinutes(c)<order.readyAtMinutes)throw Error('Supplier delivery has not arrived.');
 const item=OFFICIAL_EQUIPMENT_2024.find(i=>i.id===order.itemId);
 if(!item||!c.inventoryLedger)throw Error('Invalid order inventory.');
 const gear=c.inventoryLedger.gear.map(x=>({...x}));
 const owned=gear.find(x=>x.name===item.name);
 const amount=order.quantity*(item.packQuantity??1);
 if(owned)owned.quantity+=amount;else gear.push({name:item.name,quantity:amount});
 return {...c,inventoryLedger:{...c.inventoryLedger,gear},merchantSupplyOrders:c.merchantSupplyOrders!.map(o=>o.id===id?{...o,status:'collected' as const}:o)};
}
/** Trader stock changes only when an authoritative route-arrival action invokes this. */
export function resupplyTravelingMerchant(c:Campaign,routeId:string,arrivalId:string):Campaign{
 if(settlementTier(c)!=='traveling'||!routeId.trim()||!arrivalId.trim()||c.merchantTraderRoute?.id!==routeId||c.merchantTraderRoute.completedArrivalIds.at(-1)!==arrivalId||arrivalId!=='leg-'+(c.merchantTraderRoute.nextStopIndex-1)+'-'+c.adventureSession?.site||c.merchantTraderRoute.stops[c.merchantTraderRoute.nextStopIndex-1]!==c.adventureSession?.site)throw Error('Valid traveling merchant route arrival required.');
 const marker=routeId+':'+arrivalId;
 if(c.merchantTraderResupply?.[marker]!==undefined)return c;
 const stock={...c.merchantStockRemaining};
 const checkpoints={...c.merchantStockRestockedAt};
 for(const item of merchantCatalogFor('traveling','trader')){
  const key=merchantStockKeyForCampaign(c,'trader',item.id);
  stock[key]=merchantInitialStock('traveling',item.id,'trader');
  checkpoints[key]=nowMinutes(c);
 }
 return {...c,merchantStockRemaining:stock,merchantStockRestockedAt:checkpoints,merchantTraderResupply:{...c.merchantTraderResupply,[marker]:nowMinutes(c)}};
}

/** Only explicit requests to obtain unavailable merchandise open supplier controls. */
export function isSupplierBrowseRequest(message:string):boolean {
 const text=message.trim().toLowerCase();
 return /\b(order|special[- ]order|back[- ]order|source|procure|restock|out of stock|sold out|unavailable)\b/.test(text)
  && /\b(item|equipment|gear|weapon|armor|shield|tool|merchandise|stock|shop|merchant|blacksmith|supplier|buy|purchase|dagger|sword|bow|arrows|potion|rope|torch|plate|mail)\b/.test(text)
  && !/\b(where|why|how long ago|history|rumor)\b/.test(text);
}
