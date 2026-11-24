import type {Campaign} from './campaign';
import {ITEM_BY_ID} from './creationEquipment';
import {forgetSoldMagicEquipment} from './magicEquipment';

export function discardInventoryItem(campaign:Campaign,name:string,quantity:number,expectedQuantity:number):Campaign {
 if(!campaign.characterIdentity||campaign.companionEncounter?.status==='active'||campaign.combat&&campaign.combat.status!=='completed')
  throw Error('Discard equipment outside combat.');
 const ledger=campaign.inventoryLedger;
 const row=ledger?.gear.find(item=>item.name===name);
 if(!ledger||!row||row.quantity!==expectedQuantity||!Number.isSafeInteger(quantity)||quantity<1||quantity>row.quantity)throw Error('Inventory changed or discard quantity is invalid.');
 const remaining=row.quantity-quantity;
 const gear=ledger.gear.flatMap(item=>item===row?(remaining?[{...row,quantity:remaining}]:[]):[item]);
 const encounterLoadout={...campaign.encounterLoadout};
 for(const key of ['weaponId','offhandWeaponId','armorId','shieldId'] as const){
  const id=encounterLoadout[key];
  if(id&&ITEM_BY_ID[id]?.name===name&&remaining===0)encounterLoadout[key]='';
 }
 if(!encounterLoadout.weaponId||remaining===1&&encounterLoadout.weaponId===encounterLoadout.offhandWeaponId&&ITEM_BY_ID[encounterLoadout.weaponId]?.name===name)
  encounterLoadout.offhandWeaponId='';
 const legacySupply={Dagger:'daggers',Arrows:'arrows',Caltrops:'caltrops','Ball Bearings':'ballBearings'} as const;
 const supply=Object.hasOwn(legacySupply,name)?legacySupply[name as keyof typeof legacySupply]:undefined;
 const equipment=campaign.equipment&&supply?{...campaign.equipment,[supply]:remaining}:campaign.equipment;
 const magicEquipment=remaining===0?forgetSoldMagicEquipment(campaign,name):campaign.magicEquipment;
 const now=new Date().toISOString();
 return {...campaign,inventoryLedger:{...ledger,gear},encounterLoadout,equipment,magicEquipment,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',createdAt:now,text:'Discarded '+quantity+' × '+name+'.'}]};
}
