import type {Campaign} from './campaign';
import {ITEM_BY_ID} from './creationEquipment';

export function formatFrontierPrice(copper:number):string {
 const gp=Math.floor(copper/100),sp=Math.floor(copper%100/10),cp=copper%10;
 return [gp&&`${gp} GP`,sp&&`${sp} SP`,cp&&`${cp} CP`].filter(Boolean).join(' ')||'0 CP';
}
/** Fixed-price opening settlement inventory; never trust prices supplied by the DM. */
export const FRONTIER_SHOP_IDS=['dagger','rope','torch','rations','waterskin','arrows','potion-of-healing'] as const;
export const frontierShopStock=FRONTIER_SHOP_IDS.map(id=>ITEM_BY_ID[id]).filter((item):item is NonNullable<typeof item>=>Boolean(item));
export function frontierMerchantContext(campaign:Campaign){
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring'||!campaign.characterIdentity)return null;
 return {location:'Frontier Village',shop:'General store',items:frontierShopStock.map(item=>({id:item.id,name:item.name,costCp:item.costCp})),walletCp:Object.entries(campaign.inventoryLedger?.currency??{}).reduce((sum,[coin,amount])=>sum+amount*({CP:1,SP:10,EP:50,GP:100,PP:1000}[coin as 'CP'|'SP'|'EP'|'GP'|'PP']??0),0),purchaseRule:'Only the Buy item control commits purchases; conversation alone cannot spend money or grant items.'};
}
export function buyFrontierItem(campaign:Campaign,itemId:string,quantity=1,now=new Date().toISOString()):Campaign{
 if(!campaign.characterIdentity||campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('The Frontier Village shop is not available here.');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20)throw Error('Purchase quantity must be 1–20.');
 const item=frontierShopStock.find(i=>i.id===itemId);if(!item)throw Error('Item is not sold at this shop.');
 const ledger=campaign.inventoryLedger;if(!ledger)throw Error('Campaign inventory is missing.');
 const denominations=[['PP',1000],['GP',100],['EP',50],['SP',10],['CP',1]] as const;
 const funds=denominations.reduce((sum,[coin,cp])=>sum+ledger.currency[coin]*cp,0);
 const cost=item.costCp*quantity;if(!Number.isSafeInteger(cost)||cost>funds)throw Error('Not enough money for this purchase.');
 let remaining=funds-cost;
 const currency={...ledger.currency};for(const [coin,cp] of denominations){currency[coin]=Math.floor(remaining/cp);remaining%=cp;}
 const gear=ledger.gear.map(i=>({...i}));const owned=gear.find(i=>i.name===item.name);
 if(owned)owned.quantity+=quantity;else gear.push({name:item.name,quantity});
 return {...campaign,inventoryLedger:{currency,gear},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:`Purchased ${quantity} × ${item.name} at the Frontier Village shop for ${cost} cp.`,createdAt:now}]};
}
