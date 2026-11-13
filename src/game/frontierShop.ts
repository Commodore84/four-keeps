import type {Campaign} from './campaign';
import {ITEM_BY_ID} from './creationEquipment';

export function formatFrontierPrice(copper:number):string {
 if(!Number.isSafeInteger(copper)||copper<0)throw Error('Invalid copper amount.');
 return `${(copper/100).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')} GP`;
}
export function walletCopper(currency:Partial<Record<'CP'|'SP'|'EP'|'GP'|'PP',number>> = {}):number {
 return (currency.CP??0)+10*(currency.SP??0)+50*(currency.EP??0)+100*(currency.GP??0)+1000*(currency.PP??0);
}
/** Fixed-price opening settlement inventory; never trust prices supplied by the DM. */
export const FRONTIER_SHOP_IDS=['dagger','rope','torch','rations','waterskin','arrows','potion-of-healing'] as const;
export const frontierShopStock=FRONTIER_SHOP_IDS.map(id=>ITEM_BY_ID[id]).filter((item):item is NonNullable<typeof item>=>Boolean(item));
export function frontierMerchantContext(campaign:Campaign){
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring'||!campaign.characterIdentity)return null;
 return {location:'Frontier Village',shop:'General store',items:frontierShopStock.map(item=>({id:item.id,name:item.name,costCp:item.costCp})),walletCp:walletCopper(campaign.inventoryLedger?.currency),purchaseRule:'Offer an itemized list with exact prices on request. Player purchase requests require explicit confirmation; narration never grants items or spends money. Negotiations may be roleplayed, but discounts are not authorized until deterministic pricing supports them.'};
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

/** Conservative local purchase-intent extraction; never infer an item from free-form DM prose. */
export function parseFrontierPurchase(message:string):{itemId:string;quantity:number}|null {
 const request=/\b(?:buy|purchase|take|i(?:'ll| will) have|i(?:'d| would) like to buy)\b/i.test(message);
 if(!request)return null;
 const matches=frontierShopStock.filter(item=>new RegExp('\\b'+item.name.replace(/[.*+?^\$()|[\]{}]/g,'\\$&')+'s?\\b','i').test(message));
 if(matches.length!==1)return null;
 const match=/\b(\d{1,3})\s*(?:x|×|of)?\s*/i.exec(message);
 const quantity=match?Number(match[1]):1;
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20)return null;
 return {itemId:matches[0].id,quantity};
}

export function prepareMerchantPurchase(campaign:Campaign,itemId:string,quantity:number,id:string):Campaign {
 if(campaign.pendingMerchantPurchase)throw Error('Confirm or cancel the existing purchase first.');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20)throw Error('Quantity must be between 1 and 20.');
 const item=frontierShopStock.find(i=>i.id===itemId);
 if(!item)throw Error('The merchant does not stock that item.');
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('You are not at the general store.');
 if(walletCopper(campaign.inventoryLedger?.currency)<item.costCp*quantity)throw Error('Insufficient gold.');
 return {...campaign,pendingMerchantPurchase:{id,itemId,quantity,unitCostCp:item.costCp}};
}
export function settleMerchantPurchase(campaign:Campaign,id:string,confirmed:boolean):Campaign {
 const pending=campaign.pendingMerchantPurchase;
 if(!pending||pending.id!==id)throw Error('No matching pending purchase.');
 if((campaign.completedMerchantPurchaseIds??[]).includes(id))throw Error('Purchase already completed.');
 if(!confirmed)return {...campaign,pendingMerchantPurchase:undefined};
 const item=frontierShopStock.find(i=>i.id===pending.itemId);
 if(!item||item.costCp!==pending.unitCostCp)throw Error('Merchant price changed; request a new quote.');
 const bought=buyFrontierItem(campaign,pending.itemId,pending.quantity);
 return {...bought,pendingMerchantPurchase:undefined,completedMerchantPurchaseIds:[...(campaign.completedMerchantPurchaseIds??[]),id]};
}
