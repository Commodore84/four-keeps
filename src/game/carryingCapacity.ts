import type {Campaign} from './campaign';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';
import {equipmentPackContents} from './equipmentPacks';

const byName=new Map(OFFICIAL_EQUIPMENT_2024.map(item=>[item.name.toLowerCase(),item]));
const byId=new Map(OFFICIAL_EQUIPMENT_2024.map(item=>[item.id,item]));
/** Official coin weight: fifty coins weigh one pound, regardless of denomination. */
export function coinWeight(campaign:Campaign):number {
 return Object.values(campaign.inventoryLedger?.currency??{}).reduce((total,count)=>total+count,0)/50;
}
export function carriedWeight(campaign:Campaign):{weight:number;unknown:string[]} {
 let weight=coinWeight(campaign);
 const unknown:string[]=[];
 for(const gear of campaign.inventoryLedger?.gear??[]){
  const item=byName.get(gear.name.toLowerCase());
  if(!item){unknown.push(gear.name);continue;}
  weight+=item.weight*gear.quantity;
 }
 return {weight,unknown};
}
/** 2024 carrying capacity: Strength × 15 lb.; Powerful Build doubles it. */
export function carryingCapacity(campaign:Campaign):number|null {
 const strength=campaign.character?.scores.str;
 if(!strength||!Number.isFinite(strength))return null;
 const species=campaign.characterIdentity?.speciesId;
 // Goliath's Powerful Build: count as one size larger for carrying capacity.
 const multiplier=species==='goliath'?2:1;
 return strength*15*multiplier;
}
export function purchaseWeight(itemId:string,quantity:number):number|null {
 const item=byId.get(itemId);
 if(!item)return null;
 const pack=equipmentPackContents(itemId);
 return quantity*(pack?pack.reduce((sum,entry)=>sum+entry.item.weight*entry.quantity,0):item.weight*(item.packQuantity??1));
}
export function purchaseWeightAfter(campaign:Campaign,items:{itemId:string;quantity:number}[],costCp:number):{weight:number;capacity:number|null;unknown:string[]}|null {
 const current=carriedWeight(campaign);
 let added=0;
 for(const item of items){const weight=purchaseWeight(item.itemId,item.quantity);if(weight===null)return null;added+=weight;}
 // Merchant checkout normalizes currency into the fewest denominations; account for changed coin weight.
 const ledger=campaign.inventoryLedger;
 const copper=ledger?ledger.currency.PP*1000+ledger.currency.GP*100+ledger.currency.EP*50+ledger.currency.SP*10+ledger.currency.CP:0;
 let remaining=Math.max(0,copper-costCp),coinCount=0;
 for(const denomination of [1000,100,50,10,1]){coinCount+=Math.floor(remaining/denomination);remaining%=denomination;}
 return {weight:current.weight+added-coinWeight(campaign)+coinCount/50,capacity:carryingCapacity(campaign),unknown:current.unknown};
}
