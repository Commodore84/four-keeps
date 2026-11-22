import type {Campaign} from './campaign';
import {ITEM_BY_ID} from './creationEquipment';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';

export function formatFrontierPrice(copper:number):string {
 if(!Number.isSafeInteger(copper)||copper<0)throw Error('Invalid copper amount.');
 const gp=Math.floor(copper/100),sp=Math.floor(copper%100/10),cp=copper%10;
 return [gp?gp+' GP':'',sp?sp+' SP':'',cp?cp+' CP':''].filter(Boolean).join(' ')||'0 CP';
}
export function walletCopper(currency:Partial<Record<'CP'|'SP'|'EP'|'GP'|'PP',number>> = {}):number {
 return (currency.CP??0)+10*(currency.SP??0)+50*(currency.EP??0)+100*(currency.GP??0)+1000*(currency.PP??0);
}
/** Authoritative SRD 5.2.1 item definitions; local availability is a world-design choice.
 * Established village stock is deliberately narrower than Dasahi's larger marketplace.
 * Never synthesize a price or create an item outside the official 2024 catalog.
 */
export const FRONTIER_SHOP_IDS=[
 'dagger','rope','torch','rations','waterskin','arrows','bolts','bullets-sling','potion-of-healing',
 'backpack','bedroll','blanket','basket','bucket','candle','chain','crowbar','flask',
 'grappling-hook','healer-s-kit','hunting-trap','jug','ladder','lamp','lantern-hooded',
 'lock','manacles','map','mirror','oil','paper','parchment','pole','pot-iron',
 'pouch','quiver','sack','shovel','signal-whistle','spikes-iron','string',
 'tent','tinderbox','vial','ball-bearings','caltrops','chest','bell',
 'clothes-travelers','explorer-s-pack','dungeoneer-s-pack','case-crossbow-bolt'
] as const;
export type MerchantType='general'|'weaponsmith'|'armorer'|'apothecary'|'arcanist'|'outfitter'|'stable'|'trader';
export const MERCHANT_LABELS:Record<MerchantType,string>={
 general:'General store',weaponsmith:'Weaponsmith',armorer:'Armorer',apothecary:'Apothecary',
 arcanist:'Arcane supplier',outfitter:'Outfitter',stable:'Stables',trader:'Traveling trader'
};
export type SettlementTier='city'|'town'|'village'|'traveling';
const merchantTypes:MerchantType[]=['general','weaponsmith','armorer','apothecary','arcanist','outfitter','stable','trader'];
export function settlementTier(campaign:Campaign):SettlementTier {
 if(campaign.merchantSettlementTier)return campaign.merchantSettlementTier;
 if(/\b(?:Dasahi|Chasha.r|Miwillia|Ancolo)\b/i.test(campaign.location))return 'city';
 if(/\b(?:Frontier Village|village)\b/i.test(campaign.location))return 'village';
 return campaign.characterBuild?'city':'village';
}
const isMagic=(item:(typeof OFFICIAL_EQUIPMENT_2024)[number])=>/magic item|spell scroll/i.test(item.category);
export function merchantTypeForItem(item:(typeof OFFICIAL_EQUIPMENT_2024)[number]):MerchantType {
 const n=item.name.toLowerCase(),c=item.category.toLowerCase();
 if(c==='weapon'||c==='ammunition'||/sling bullets|crossbow bolt/.test(n))return 'weaponsmith';
 if(c==='armor'||c==='shield')return 'armorer';
 if(/potion|antitoxin|healer|herbal|acid|alchemist|holy water/.test(n))return 'apothecary';
 if(/arcane|component|focus|spellbook|holy symbol|druidic/.test(n))return 'arcanist';
 if(/mount|horse|pony|mule|donkey|saddle|bit and bridle|feed|wagon|cart|vehicle/.test(n))return 'stable';
 if(c==='tool'||/clothes|tent|bedroll|climber|hunting trap/.test(n))return 'outfitter';
 return 'general';
}
export function availableMerchants(tier:SettlementTier):MerchantType[] {
 return tier==='city'?merchantTypes.filter(x=>x!=='trader'):
 tier==='town'?['general','weaponsmith','armorer','apothecary','outfitter']:
 tier==='village'?['general','trader']:['trader'];
}
export function merchantCatalogFor(tier:SettlementTier,type:MerchantType) {
 if(!availableMerchants(tier).includes(type))return [];
 const all=OFFICIAL_EQUIPMENT_2024.filter(item=>!isMagic(item));
 if(tier==='city')return type==='general'?all:all.filter(item=>merchantTypeForItem(item)===type);
 if(type==='trader')return all.filter(item=>['torch','rations','waterskin','candle','oil','tinderbox','bandages','potion-of-healing'].includes(item.id));
 if(tier==='village')return all.filter(item=>FRONTIER_SHOP_IDS.includes(item.id as (typeof FRONTIER_SHOP_IDS)[number])&&merchantTypeForItem(item)===type);
 return all.filter(item=>item.costCp<=5000&&merchantTypeForItem(item)===type);
}
export const frontierShopStock=FRONTIER_SHOP_IDS.map(id=>ITEM_BY_ID[id]).filter((item):item is NonNullable<typeof item>=>Boolean(item)&&OFFICIAL_EQUIPMENT_2024.includes(item));
export const cityShopStock=OFFICIAL_EQUIPMENT_2024.filter(item=>!isMagic(item));
export function merchantStock(campaign:Campaign,type?:MerchantType){
 const tier=settlementTier(campaign);
 return type?merchantCatalogFor(tier,type):campaign.merchantShopType?merchantCatalogFor(tier,campaign.merchantShopType):tier==='city'?cityShopStock:availableMerchants(tier).flatMap(merchant=>merchantCatalogFor(tier,merchant));
}
export function merchantStockKey(tier:SettlementTier,type:MerchantType,itemId:string){return tier+':'+type+':'+itemId;}
/** The settlement identity is separate from its tier; old saves retain legacy keys. */
export function merchantStockKeyForCampaign(campaign:Campaign,type:MerchantType,itemId:string):string {
 const location=(campaign.location||'unknown').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
 return settlementTier(campaign)==='traveling'?'traveler:'+campaign.id+':'+merchantStockKey('traveling',type,itemId):'location:'+location+':'+merchantStockKey(settlementTier(campaign),type,itemId);
}

export function merchantForItem(campaign:Campaign,itemId:string):MerchantType|null{
 const tier=settlementTier(campaign);
 return availableMerchants(tier).find(type=>type!=='general'&&merchantCatalogFor(tier,type).some(item=>item.id===itemId))??(merchantCatalogFor(tier,'general').some(item=>item.id===itemId)?'general':null);
}
export const FRONTIER_INITIAL_STOCK:Record<string,number>=Object.fromEntries(OFFICIAL_EQUIPMENT_2024.map(item=>[item.id,
 item.id==='potion-of-healing'?3:item.category==='ammunition'?60:item.category==='weapon'?5:item.category==='armor'?3:item.category==='tool'?4:item.costCp>=5000?1:item.costCp>=1000?3:12]));
Object.assign(FRONTIER_INITIAL_STOCK,{dagger:8,rope:12,torch:30,rations:25,waterskin:10,arrows:100,bolts:60,'bullets-sling':5});
/** Stock is tied to elapsed campaign minutes, never wall-clock time. */
export function merchantRestockIntervalMinutes(tier:SettlementTier,itemId:string):number {
 if(tier==='traveling')return 7*1440;
 if(tier==='village')return 7*1440;
 if(tier==='town')return 3*1440;
 const item=OFFICIAL_EQUIPMENT_2024.find(x=>x.id===itemId);
 return (item?.costCp??0)>=5000?7*1440:
  ['weapon','armor','shield','tool'].includes(item?.category.toLowerCase()??'')?3*1440:1440;
}
export function merchantInitialStock(tier:SettlementTier,itemId:string,type:MerchantType):number {
 const item=merchantCatalogFor(tier,type).find(x=>x.id===itemId);
 if(!item)return 0;
 const cost=item.costCp;
 if(tier==='city')return cost>=5000?2:cost>=1000?8:
  item.category==='ammunition'?60:
  ['weapon','armor','shield','tool'].includes(item.category.toLowerCase())?12:40;
 if(tier==='traveling'||type==='trader')return itemId==='potion-of-healing'?1:Math.min(5,FRONTIER_INITIAL_STOCK[itemId]??0);
 if(tier==='village')return Math.min(8,FRONTIER_INITIAL_STOCK[itemId]??0);
 return Math.min(20,FRONTIER_INITIAL_STOCK[itemId]??0);
}
export function remainingMerchantStock(campaign:Campaign,itemId:string,type?:MerchantType):number {
 const tier=settlementTier(campaign),merchant=type??campaign.merchantShopType??merchantForItem(campaign,itemId);
 if(!merchant)return 0;
 const key=merchantStockKeyForCampaign(campaign,merchant,itemId);
 const legacyKey=merchantStockKey(tier,merchant,itemId);
 const initial=merchantInitialStock(tier,itemId,merchant);
 if(!initial)return 0;
 const oldLocation=(campaign.location||'unknown').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
 const legacyLocationKey='location:'+oldLocation+':'+legacyKey;
 const stored=campaign.merchantStockRemaining?.[key]??campaign.merchantStockRemaining?.[legacyLocationKey]??campaign.merchantStockRemaining?.[legacyKey]??campaign.merchantStockRemaining?.[itemId];
 if(stored===undefined)return initial;
 const last=campaign.merchantStockRestockedAt?.[key]??campaign.merchantStockRestockedAt?.[legacyLocationKey]??campaign.merchantStockRestockedAt?.[legacyKey]??0;
 const now=Math.max(0,campaign.elapsedMinutes??0);
 const interval=merchantRestockIntervalMinutes(tier,itemId);
 if(tier!=='traveling'&&now>=last+interval)return initial;
 return Math.max(0,Math.min(initial,stored));
}
export function refreshMerchantStock(campaign:Campaign):Campaign {
 if(settlementTier(campaign)==='traveling')return campaign;
 const now=Math.max(0,campaign.elapsedMinutes??0);
 const remaining={...campaign.merchantStockRemaining};
 const restocked={...campaign.merchantStockRestockedAt};
 let changed=false;
 for(const type of availableMerchants(settlementTier(campaign))){
  for(const item of merchantCatalogFor(settlementTier(campaign),type)){
   const key=merchantStockKeyForCampaign(campaign,type,item.id);
   const interval=merchantRestockIntervalMinutes(settlementTier(campaign),item.id);
   const legacyKey=merchantStockKey(settlementTier(campaign),type,item.id);
   const last=restocked[key]??restocked[legacyKey]??0;
   if(now<last+interval)continue;
   const cycles=Math.floor((now-last)/interval);
   restocked[key]=last+cycles*interval;
   remaining[key]=merchantInitialStock(settlementTier(campaign),item.id,type);
   changed=true;
  }
 }
 return changed?{...campaign,merchantStockRemaining:remaining,merchantStockRestockedAt:restocked}:campaign;
}
export function merchantCatalog(campaign:Campaign):string {return merchantStock(campaign).map(item=>item.name+": "+formatFrontierPrice(item.costCp)+(item.packQuantity?" per pack of "+item.packQuantity:" each")+" ("+remainingMerchantStock(campaign,item.id)+" available)").join("; ");}
/** Detect a merchant conversation without treating every city scene as a storefront. */
export function isEstablishedMerchantConversation(campaign:Campaign):boolean {
 if(!campaign.characterIdentity || campaign.adventureSession?.site!=='frontier' || campaign.adventureSession.status!=='exploring')return false;
 const recent=campaign.journal.filter(entry=>entry.kind==='dm'||entry.kind==='player').slice(-5);
 const merchantWords=/\b(?:merchant|shopkeeper|general store|weaponsmith|blacksmith|armorer|armourer|apothecary|outfitter|shop|store|wares|stocked weapons|inventory|shelves)\b/i;
 return recent.some(entry=>merchantWords.test(entry.text));
}
export function acceptsMerchantBrowseInvitation(message:string,lastDmTurn:string):boolean {
 const reply=message.trim().toLowerCase().replace(/[.!?]+$/,'').trim();
 const affirmative=/^(?:yes|yeah|yep|yup|sure|okay|ok|please|absolutely|certainly|definitely|of course|sounds good|sounds great|i'd love to|i would love to|let's do it|let's browse|let's look|go ahead|why not|show me|yes please|sure thing)(?:[,! ]+.*)?$/i.test(reply);
 const shoppingAcceptance=/^(?:sure|yes|yeah|yep|okay|ok|absolutely|certainly|sounds good|of course)[,! ]+(?:i (?:could|can|would|might|do) (?:use|need|want|like)|i'm (?:looking|shopping)|let me (?:look|see)|i'll (?:take|have) a look)\b/i.test(reply);
 const offered=/\b(?:browse|look (?:at|through)|show (?:you|me)|see|view|interested in|want to|like to)\b[\s\S]{0,130}\b(?:wares|stock|goods|inventory|merchandise|store|shop|weapons|armor|supplies|items|catalog)\b/i.test(lastDmTurn)
 || /\b(?:shop|store|merchant|shopkeeper)\b[\s\S]{0,100}\b(?:browse|buy|purchase|see what|look at)\b/i.test(lastDmTurn)
 || /\b(?:do|would) you (?:want|like) to (?:shop|browse|buy|see what(?: i| we)? (?:have|sell))\b/i.test(lastDmTurn)
 || /\b(?:come|step|stop|feel free to)\s+(?:on\s+)?(?:in\s+and\s+)?(?:have|take|for)\s+a\s+look\b/i.test(lastDmTurn)
 || /\b(?:merchant|shopkeeper)\b[\s\S]{0,260}\b(?:come have a look|take a look|dry goods|trail bits|supplies|wares)\b/i.test(lastDmTurn);
 return (affirmative || shoppingAcceptance) && offered;
}
export function isMerchantBrowseRequest(message:string):boolean {return /\b(what (?:do you|have you|are you) (?:sell|stock|carry|have)|show (?:me )?(?:your )?(?:wares|inventory|stock)|(?:list|catalog|inventory|price list|prices|wares|for sale)|brows(?:e|ing)|(?:take|have) a look at (?:your |the )?(?:goods|wares|stock|merchandise)|look (?:at|through) (?:your |the )?(?:goods|wares|stock|merchandise))\b/i.test(message);}
export function merchantNegotiationTarget(message:string):string|null {
 if(!isMerchantNegotiationRequest(message))return null;
 const matches=frontierShopStock.filter(item=>{
  const names=[item.name.replace(/\s*\(20\)$/,''),item.id==='bullets-sling'?'sling bullets':'',item.id==='bolts'?'crossbow bolts':''].filter(Boolean);
  return names.some(name=>new RegExp('\\b'+name.replace(/[.*+?^\$()|[\]{}]/g,'\\$&')+'s?\\b','i').test(message));
 });
 return matches.length===1?matches[0].id:null;
}
/** Classify requests before any deterministic purchase workflow. */
export type MerchantIntent = 'information'|'find-service'|'commission'|'browse'|'purchase'|'clarify'|'conversation';
export function classifyMerchantIntent(message:string):MerchantIntent {
 const text=message.trim();
 if(!text)return 'conversation';
 const seeking=/\b(?:where|who|which|how|can i find|could i find|look(?:ing)? (?:around |for )|find|search|ask around|directions|recommend|know (?:of|where)|anywhere|someone|somewhere|place|shop|store|merchant|craftsperson|artisan|leatherworker|armorer|blacksmith)\b/i;
 const service=/\b(?:made|make (?:me |a |an |some |custom )|custom|commission|crafted|craft|repair|alter|fit(?:ted)?|tailor|workshop|leatherwork)\b/i;
 const informational=/^(?:can|could|would|should|where|who|what|how|do|does|is|are|tell|explain)\b/i;
 const explicitBuy=/\b(?:i\s+(?:want|wish|need|intend|plan)\s+to\s+(?:buy|purchase)|i(?:'d| would)\s+like\s+to\s+(?:buy|purchase)|i(?:'ll| will| am going to)\s+(?:buy|purchase|take|have)|(?:buy|purchase)\s+(?:me\s+)?(?:a\s+|an\s+|the\s+|some\s+|\d+\s+)?\S+|i(?:'ll| will)\s+have\b)/i;
 if(isMerchantBrowseRequest(text)||/^(?:can|could|may) i (?:see|view|look at) (?:your |the )?(?:merchandise|goods|wares|stock|inventory|items|catalog)\??$/i.test(text))return 'browse';
 if(seeking.test(text)&&(!explicitBuy.test(text)||/\b(?:where|who|which|how|find|look(?:ing)?|search|ask around|directions|recommend|know (?:of|where)|anywhere|someone|somewhere|go to|head to|visit)\b/i.test(text)))return 'find-service';
 if(service.test(text))return 'commission';
 if(isMerchantBrowseRequest(text))return 'browse';
 if(explicitBuy.test(text))return 'purchase';
 if(/\b(?:want|need|looking for|interested in)\b/i.test(text)&&!informational.test(text))return 'clarify';
 if(informational.test(text))return 'information';
 return 'conversation';
}
export function isMerchantPurchaseRequest(message:string):boolean {
 return classifyMerchantIntent(message)==='purchase';
}
export function isMerchantNegotiationRequest(message:string):boolean {return /\b(haggle|negotiate|discount|lower (?:the )?price|better price|persuade|bargain)\b/i.test(message);}
export function frontierMerchantContext(campaign:Campaign){
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring'||!campaign.characterIdentity)return null;
 return {location:campaign.location,shop:campaign.merchantShopType?MERCHANT_LABELS[campaign.merchantShopType]:settlementTier(campaign)==='city'?'City marketplace':'General store',merchants:availableMerchants(settlementTier(campaign)).map(type=>({type,name:MERCHANT_LABELS[type]})),keeper:{name:settlementTier(campaign)==='city'?'City merchant':'Mara Vell',temperament:'Practical and friendly but firm on stock and fair prices; threats damage trust.'},items:merchantStock(campaign).map(item=>({id:item.id,name:item.name,costCp:item.costCp,packQuantity:item.packQuantity??1,remaining:remainingMerchantStock(campaign,item.id)})),walletCp:walletCopper(campaign.inventoryLedger?.currency),supplierOrders:(campaign.merchantSupplyOrders??[]).filter(order=>order.settlement===(campaign.location||'unknown').trim().toLowerCase()).map(order=>({id:order.id,itemId:order.itemId,quantity:order.quantity,status:order.status,readyAtMinutes:order.readyAtMinutes,ready:(campaign.elapsedMinutes??0)>=order.readyAtMinutes})),pendingSupplierQuote:campaign.pendingMerchantSupplyOrder?{itemId:campaign.pendingMerchantSupplyOrder.itemId,quantity:campaign.pendingMerchantSupplyOrder.quantity,unitCostCp:campaign.pendingMerchantSupplyOrder.unitCostCp,readyAtMinutes:campaign.pendingMerchantSupplyOrder.readyAtMinutes}:null,supplierRule:'In a city, if a standard item is sold out, direct the player to the shop supplier-order controls. The player must confirm payment and later collect the order. Describe delivery in game time; never claim items were ordered, paid for, delivered or collected from narration alone.',purchaseRule:'Refer players to the correct specialist for each item; a general store does not sell weapons or armor. Offer an itemized list with exact prices on request. Player purchase requests require explicit confirmation; narration never grants items or spends money. Discounts require a resolved, successful social skill check for one stocked item; the rules engine caps the discount at 20 percent.'};
}
export function buyFrontierItem(campaign:Campaign,itemId:string,quantity=1,now=new Date().toISOString()):Campaign{
 if(!campaign.characterIdentity||campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('The merchant is not available here.');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20)throw Error('Purchase quantity must be 1–20.');
 const item=merchantStock(campaign).find(i=>i.id===itemId);if(!item)throw Error('Item is not sold at this shop.');
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
 return {...campaign,merchantStockRemaining:{...campaign.merchantStockRemaining,[merchantStockKeyForCampaign(campaign,campaign.merchantShopType??merchantForItem(campaign,itemId)??'general',itemId)]:remainingMerchantStock(campaign,itemId)-quantity},merchantStockRestockedAt:{...campaign.merchantStockRestockedAt,[merchantStockKeyForCampaign(campaign,campaign.merchantShopType??merchantForItem(campaign,itemId)??'general',itemId)]:(()=>{const key=merchantStockKeyForCampaign(campaign,campaign.merchantShopType??merchantForItem(campaign,itemId)??'general',itemId);const legacy=merchantStockKey(settlementTier(campaign),campaign.merchantShopType??merchantForItem(campaign,itemId)??'general',itemId);const interval=merchantRestockIntervalMinutes(settlementTier(campaign),itemId);const last=campaign.merchantStockRestockedAt?.[key]??campaign.merchantStockRestockedAt?.[legacy]??0;const elapsed=Math.max(0,campaign.elapsedMinutes??0);return settlementTier(campaign)==='traveling'||elapsed<last+interval?last:last+Math.floor((elapsed-last)/interval)*interval;})()},merchantDiscount:undefined,inventoryLedger:{currency,gear},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:`Purchased ${quantity} × ${item.name} at the Frontier Village shop for ${formatFrontierPrice(cost)}.`,createdAt:now}]};
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
 const item=merchantStock(campaign).find(i=>i.id===itemId);
 if(!item)throw Error('The merchant does not stock that item.');
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('You are not at the general store.');
 if(quantity>remainingMerchantStock(campaign,itemId))throw Error('The merchant does not have enough stock.');
 const discount=campaign.merchantDiscount?.itemId===itemId?campaign.merchantDiscount.percent:0;
 if(!Number.isInteger(discount)||discount<0||discount>20)throw Error('Invalid merchant discount.');
 const unitCost=item.costCp-Math.floor(item.costCp*discount/100);
 if(walletCopper(campaign.inventoryLedger?.currency)<unitCost*quantity)throw Error('Insufficient gold.');
 return {...campaign,pendingMerchantPurchase:{id,itemId,quantity,unitCostCp:unitCost}};
}
export type MerchantCartLine={itemId:string;quantity:number;unitCostCp:number};
export function prepareMerchantCart(campaign:Campaign,items:{itemId:string;quantity:number}[],id:string):Campaign {
 if(campaign.pendingMerchantPurchase)throw Error('Finish the existing purchase first.');
 if(!items.length||items.length>merchantStock(campaign).length||new Set(items.map(x=>x.itemId)).size!==items.length)throw Error('Invalid cart.');
 const lines:MerchantCartLine[]=[];
 for(const {itemId,quantity} of items){
  const prepared=prepareMerchantPurchase(campaign,itemId,quantity,id);
  const pending=prepared.pendingMerchantPurchase!;
  lines.push({itemId,quantity,unitCostCp:pending.unitCostCp});
 }
 if(lines.reduce((sum,line)=>sum+line.unitCostCp*line.quantity,0)>walletCopper(campaign.inventoryLedger?.currency))throw Error('Insufficient money.');
 return {...campaign,pendingMerchantPurchase:{id,itemId:lines[0].itemId,quantity:lines[0].quantity,unitCostCp:lines[0].unitCostCp,lines}};
}
/** Four Keeps house-rule negotiation: DCs are authoritative and never narrated. */
export function merchantDiscountDC(percent:number,adjustment=0):number {
 if(!Number.isFinite(percent)||percent<=0||percent>20||!Number.isInteger(adjustment)||Math.abs(adjustment)>5)throw Error('Discount outside negotiable limits.');
 return (percent<=5?10:percent<=10?15:percent<=15?20:25)+adjustment;
}
export function beginCartNegotiation(campaign:Campaign,percent:number,token:string,adjustment=0):Campaign {
 const pending=campaign.pendingMerchantPurchase;
 if(!pending||!token||campaign.merchantCartNegotiation?.attempted)throw Error('This order cannot be renegotiated.');
 const dc=merchantDiscountDC(percent,adjustment);
 return {...campaign,merchantCartNegotiation:{purchaseId:pending.id,percent,dc,attempted:true,checkToken:token}};
}
export function resolveCartNegotiation(campaign:Campaign,token:string,total:number):Campaign {
 const offer=campaign.merchantCartNegotiation,pending=campaign.pendingMerchantPurchase;
 if(!offer||!pending||offer.purchaseId!==pending.id||offer.checkToken!==token||offer.resolved||!Number.isFinite(total))throw Error('No matching unresolved merchant negotiation.');
 const success=total>=offer.dc;
 if(!success)return {...campaign,merchantCartNegotiation:{...offer,resolved:true,success:false}};
 const original=pending.lines??[{itemId:pending.itemId,quantity:pending.quantity,unitCostCp:pending.unitCostCp}];
 const lines=original.map(line=>{
  const item=merchantStock(campaign).find(x=>x.id===line.itemId);
  if(!item)throw Error('Merchant item unavailable.');
  return {...line,unitCostCp:item.costCp-Math.floor(item.costCp*offer.percent/100)};
 });
 return {...campaign,pendingMerchantPurchase:{...pending,itemId:lines[0].itemId,quantity:lines[0].quantity,unitCostCp:lines[0].unitCostCp,lines},merchantCartNegotiation:{...offer,resolved:true,success:true}};
}
export function settleMerchantPurchase(campaign:Campaign,id:string,confirmed:boolean):Campaign {
 const pending=campaign.pendingMerchantPurchase;
 if(!pending||pending.id!==id)throw Error('No matching pending purchase.');
 if((campaign.completedMerchantPurchaseIds??[]).includes(id))throw Error('Purchase already completed.');
 if(campaign.merchantCartNegotiation?.purchaseId===id&&!campaign.merchantCartNegotiation.resolved)throw Error('Complete the negotiation roll before checkout.');
 if(!confirmed)return {...campaign,pendingMerchantPurchase:undefined,merchantCartNegotiation:undefined};
 const item=merchantStock(campaign).find(i=>i.id===pending.itemId);
 const discount=campaign.merchantCartNegotiation?.purchaseId===pending.id&&campaign.merchantCartNegotiation.success?campaign.merchantCartNegotiation.percent:campaign.merchantDiscount?.itemId===pending.itemId?campaign.merchantDiscount.percent:0;
 if(!item||item.costCp-Math.floor(item.costCp*discount/100)!==pending.unitCostCp)throw Error('Merchant price changed; request a new quote.');
 const lines=pending.lines??[{itemId:pending.itemId,quantity:pending.quantity,unitCostCp:pending.unitCostCp}];
 // Validate the complete cart against the same authoritative snapshot before any mutation.
 // A failed line must not partially debit funds, stock, or inventory.
 if(!lines.length||new Set(lines.map(line=>line.itemId)).size!==lines.length)throw Error('Invalid pending cart.');
 let total=0;
 for(const line of lines){
  if(!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>20)throw Error('Invalid purchase quantity.');
  const listed=merchantStock(campaign).find(item=>item.id===line.itemId);
  const discount=campaign.merchantCartNegotiation?.purchaseId===pending.id&&campaign.merchantCartNegotiation.success?campaign.merchantCartNegotiation.percent:campaign.merchantDiscount?.itemId===line.itemId?campaign.merchantDiscount.percent:0;
  if(!listed||listed.costCp-Math.floor(listed.costCp*discount/100)!==line.unitCostCp)throw Error('Merchant price changed; request a new quote.');
  if(line.quantity>remainingMerchantStock(campaign,line.itemId))throw Error('The merchant does not have enough stock.');
  total+=line.quantity*line.unitCostCp;
  if(!Number.isSafeInteger(total))throw Error('Invalid purchase total.');
 }
 if(total>walletCopper(campaign.inventoryLedger?.currency))throw Error('Insufficient money.');
 let bought=campaign;
 for(const line of lines){
  const item=merchantStock(campaign).find(i=>i.id===line.itemId);
  const discount=campaign.merchantCartNegotiation?.purchaseId===pending.id&&campaign.merchantCartNegotiation.success?campaign.merchantCartNegotiation.percent:bought.merchantDiscount?.itemId===line.itemId?bought.merchantDiscount.percent:0;
  if(!item||item.costCp-Math.floor(item.costCp*discount/100)!==line.unitCostCp)throw Error('Merchant price changed; request a new quote.');
  bought=buyFrontierItem({...bought,merchantDiscount:discount?{itemId:line.itemId,percent:discount,approvalId:pending.id}:undefined},line.itemId,line.quantity);
 }
 return {...bought,pendingMerchantPurchase:undefined,merchantCartNegotiation:undefined,completedMerchantPurchaseIds:[...(campaign.completedMerchantPurchaseIds??[]),id]};
}

export function beginMerchantNegotiation(campaign:Campaign,itemId:string,checkToken:string,skill:string):Campaign {
 if(!['Persuasion','Deception','Intimidation'].includes(skill)||!checkToken||!campaign.pendingCheck||campaign.pendingCheck.token!==checkToken)throw Error('A valid social skill check is required.');
 if(!frontierShopStock.some(item=>item.id===itemId&&remainingMerchantStock(campaign,itemId)>0))throw Error('The merchant has none to negotiate.');
 if(campaign.pendingMerchantPurchase||campaign.pendingMerchantNegotiation)throw Error('Finish the existing merchant action.');
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('Merchant not available.');
 return {...campaign,pendingMerchantNegotiation:{itemId,checkToken}};
}
export function resolveMerchantNegotiation(campaign:Campaign,token:string,success:boolean,total:number):Campaign {
 const pending=campaign.pendingMerchantNegotiation;
 if(!pending||pending.checkToken!==token||!Number.isFinite(total))throw Error('No matching negotiation check.');
 const cleared={...campaign,pendingMerchantNegotiation:undefined};
 if(!success||remainingMerchantStock(campaign,pending.itemId)<1)return cleared;
 // Fixed, deterministic terms: successful check earns 10%, exceptional total >=20 earns 20%.
 return approveMerchantDiscount(cleared,pending.itemId,total>=20?20:10,token);
}
export function approveMerchantDiscount(campaign:Campaign,itemId:string,percent:number,approvalId:string):Campaign {
 if(!frontierShopStock.some(item=>item.id===itemId)||!Number.isInteger(percent)||percent<0||percent>20||!approvalId)throw Error('Invalid merchant negotiation approval.');
 if(campaign.pendingMerchantPurchase)throw Error('Finish the pending purchase before negotiating.');
 if(campaign.adventureSession?.site!=='frontier'||campaign.adventureSession.status!=='exploring')throw Error('Merchant not available.');
 return {...campaign,merchantDiscount:{itemId,percent,approvalId}};
}
