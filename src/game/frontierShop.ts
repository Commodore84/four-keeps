import type {Campaign} from './campaign';
import {ITEM_BY_ID} from './creationEquipment';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';

export function formatFrontierPrice(copper:number):string {
 if(!Number.isSafeInteger(copper)||copper<0)throw Error('Invalid copper amount.');
 return `${(copper/100).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')} GP`;
}
export function walletCopper(currency:Partial<Record<'CP'|'SP'|'EP'|'GP'|'PP',number>> = {}):number {
 return (currency.CP??0)+10*(currency.SP??0)+50*(currency.EP??0)+100*(currency.GP??0)+1000*(currency.PP??0);
}
/** Fixed-price opening settlement inventory; never trust prices supplied by the DM. */
export const FRONTIER_SHOP_IDS=['dagger','rope','torch','rations','waterskin','arrows','bolts','bullets-sling','potion-of-healing'] as const;
export const FRONTIER_INITIAL_STOCK:Record<string,number>={dagger:8,rope:12,torch:30,rations:25,waterskin:10,arrows:100,bolts:60,"bullets-sling":5,"potion-of-healing":3};
export const frontierShopStock=FRONTIER_SHOP_IDS.map(id=>ITEM_BY_ID[id]).filter((item):item is NonNullable<typeof item>=>Boolean(item)&&OFFICIAL_EQUIPMENT_2024.some(canonical=>canonical===item));
export function remainingMerchantStock(campaign:Campaign,itemId:string):number {return campaign.merchantStockRemaining?.[itemId]??FRONTIER_INITIAL_STOCK[itemId]??0;}
export function merchantCatalog(campaign:Campaign):string {return frontierShopStock.map(item=>item.name+": "+formatFrontierPrice(item.costCp)+(item.packQuantity?" per pack of "+item.packQuantity:" each")+" ("+remainingMerchantStock(campaign,item.id)+" available)").join("; ");}
export function isMerchantBrowseRequest(message:string):boolean {return /\b(what (?:do you|have you|are you) (?:sell|stock|carry|have)|show (?:me )?(?:your )?(?:wares|inventory|stock)|(?:list|catalog|inventory|price list|prices|wares|for sale))\b/i.test(message);}
export function isMerchantPurchaseRequest(message:string):boolean {return /\b(?:buy|purchase|i(?:'ll| will) have|i(?:'d| would) like to buy)\b/i.test(message);}
export function isMerchantNegotiationRequest(message:string):boolean {return /\b(haggle|negotiate|discount|lower (?:the )?price|better price|persuade|bargain)\b/i.test(message);}
export function frontierMerchantContext(campaign:Campaign){
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring'||!campaign.characterIdentity)return null;
 return {location:'Frontier Village',shop:'General store',items:frontierShopStock.map(item=>({id:item.id,name:item.name,costCp:item.costCp,packQuantity:item.packQuantity??1,remaining:remainingMerchantStock(campaign,item.id)})),walletCp:walletCopper(campaign.inventoryLedger?.currency),purchaseRule:'Offer an itemized list with exact prices on request. Player purchase requests require explicit confirmation; narration never grants items or spends money. Discounts require structured DM approval, capped at 20 percent, for one named item only.'};
}
export function buyFrontierItem(campaign:Campaign,itemId:string,quantity=1,now=new Date().toISOString()):Campaign{
 if(!campaign.characterIdentity||campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('The Frontier Village shop is not available here.');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20)throw Error('Purchase quantity must be 1–20.');
 const item=frontierShopStock.find(i=>i.id===itemId);if(!item)throw Error('Item is not sold at this shop.');
 if(quantity>remainingMerchantStock(campaign,itemId))throw Error('The merchant does not have enough stock.');
 const ledger=campaign.inventoryLedger;if(!ledger)throw Error('Campaign inventory is missing.');
 const denominations=[['PP',1000],['GP',100],['EP',50],['SP',10],['CP',1]] as const;
 const funds=denominations.reduce((sum,[coin,cp])=>sum+ledger.currency[coin]*cp,0);
 const approved=campaign.merchantDiscount?.itemId===itemId?campaign.merchantDiscount.percent:0;
 if(!Number.isInteger(approved)||approved<0||approved>20)throw Error('Invalid merchant discount.');
 const unitCost=item.costCp-Math.floor(item.costCp*approved/100);
 const cost=unitCost*quantity;if(!Number.isSafeInteger(cost)||cost>funds)throw Error('Not enough money for this purchase.');
 let remaining=funds-cost;
 const currency={...ledger.currency};for(const [coin,cp] of denominations){currency[coin]=Math.floor(remaining/cp);remaining%=cp;}
 const gear=ledger.gear.map(i=>({...i}));const owned=gear.find(i=>i.name===item.name);
 const granted=quantity*(item.packQuantity??1);
 if(owned)owned.quantity+=granted;else gear.push({name:item.name,quantity:granted});
 return {...campaign,merchantStockRemaining:{...campaign.merchantStockRemaining,[itemId]:remainingMerchantStock(campaign,itemId)-quantity},merchantDiscount:undefined,inventoryLedger:{currency,gear},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:`Purchased ${quantity} × ${item.name} at the Frontier Village shop for ${formatFrontierPrice(cost)}.`,createdAt:now}]};
}

/** Conservative local purchase-intent extraction; never infer an item from free-form DM prose. */
export function parseFrontierPurchase(message:string):{itemId:string;quantity:number}|null {
 const request=isMerchantPurchaseRequest(message);
 if(!request)return null;
 const matches=frontierShopStock.filter(item=>{
  if(item.id==='bullets-sling'&&/\b(?:sling bullets?|bullets? for (?:my |a )?sling|bullets?,? sling)\b/i.test(message))return true;
  if(item.id==='bolts'&&/\bcrossbow bolts?\b/i.test(message))return true;
  const name=item.name.replace(/\s*\(20\)$/,'').replace(/[.*+?^\$()|[\]{}]/g,'\\$&');
  return new RegExp('\\b'+name+'s?\\b','i').test(message);
 });
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
 if(quantity>remainingMerchantStock(campaign,itemId))throw Error('The merchant does not have enough stock.');
 const discount=campaign.merchantDiscount?.itemId===itemId?campaign.merchantDiscount.percent:0;
 if(!Number.isInteger(discount)||discount<0||discount>20)throw Error('Invalid merchant discount.');
 const unitCost=item.costCp-Math.floor(item.costCp*discount/100);
 if(walletCopper(campaign.inventoryLedger?.currency)<unitCost*quantity)throw Error('Insufficient gold.');
 return {...campaign,pendingMerchantPurchase:{id,itemId,quantity,unitCostCp:unitCost}};
}
export function settleMerchantPurchase(campaign:Campaign,id:string,confirmed:boolean):Campaign {
 const pending=campaign.pendingMerchantPurchase;
 if(!pending||pending.id!==id)throw Error('No matching pending purchase.');
 if((campaign.completedMerchantPurchaseIds??[]).includes(id))throw Error('Purchase already completed.');
 if(!confirmed)return {...campaign,pendingMerchantPurchase:undefined};
 const item=frontierShopStock.find(i=>i.id===pending.itemId);
 const discount=campaign.merchantDiscount?.itemId===pending.itemId?campaign.merchantDiscount.percent:0;
 if(!item||item.costCp-Math.floor(item.costCp*discount/100)!==pending.unitCostCp)throw Error('Merchant price changed; request a new quote.');
 const bought=buyFrontierItem(campaign,pending.itemId,pending.quantity);
 return {...bought,pendingMerchantPurchase:undefined,completedMerchantPurchaseIds:[...(campaign.completedMerchantPurchaseIds??[]),id]};
}

export function approveMerchantDiscount(campaign:Campaign,itemId:string,percent:number,approvalId:string):Campaign {
 if(!frontierShopStock.some(item=>item.id===itemId)||!Number.isInteger(percent)||percent<0||percent>20||!approvalId)throw Error('Invalid merchant negotiation approval.');
 if(campaign.pendingMerchantPurchase)throw Error('Finish the pending purchase before negotiating.');
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('Merchant not available.');
 return {...campaign,merchantDiscount:{itemId,percent,approvalId}};
}
