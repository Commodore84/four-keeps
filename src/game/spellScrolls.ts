import {requireArmorSpellcasting} from './armorEffects';
import type {Campaign} from './campaign';

export type ScrollCastRequest={itemName:string;spell:string;requestId:string;dmConfirmed:boolean};
export const scrollTier=(name:string):number|null=>{
 const match=/^Spell Scroll \((Cantrip|Level ([1-9]))\)$/.exec(name);
 return !match?null:match[1]==='Cantrip'?0:Number(match[2]);
};
export function castOwnedSpellScroll(campaign:Campaign,request:ScrollCastRequest):Campaign{
 requireArmorSpellcasting(campaign);
 const {itemName,spell,requestId,dmConfirmed}=request;
 const tier=scrollTier(itemName);
 if(tier===null)throw Error('Choose a supported spell scroll.');
 if(!requestId.trim()||!spell.trim()||spell.length>100)throw Error('A spell and unique action are required.');
 if(!dmConfirmed)throw Error('DM confirmation is required before consuming the scroll.');
 if(campaign.companionEncounter?.status==='active')throw Error('Combat scroll casting requires turn and action adjudication.');
 if(!campaign.characterIdentity||!['wizard','warlock','sorcerer','cleric','druid','bard','paladin','ranger'].includes(campaign.characterIdentity.classId)&&!(campaign.characterIdentity.classId==='rogue'&&campaign.character?.subclass==='Arcane Trickster'))throw Error('A spellcasting class is required.');
 const known=tier===0?campaign.character?.cantrips:campaign.character?.preparedSpells;
 if(!known?.some(s=>s.toLowerCase()===spell.trim().toLowerCase()))throw Error('This spell is not verified on the character spell list. Ask the DM to adjudicate it.');
 if((campaign.spellEffects??[]).some(e=>e.id===requestId))throw Error('Scroll action already completed.');
 const ledger=campaign.inventoryLedger;
 const owned=ledger?.gear.find(g=>g.name===itemName);
 if(!ledger||!owned||owned.quantity<1)throw Error('Scroll is not owned.');
 const now=new Date().toISOString();
 return {...campaign,inventoryLedger:{...ledger,gear:ledger.gear.map(g=>g.name===itemName?{...g,quantity:g.quantity-1}:g).filter(g=>g.quantity>0)},
 spellEffects:[...(campaign.spellEffects??[]),{id:requestId,spell:spell.trim(),status:'awaiting-adjudication' as const,createdAt:now}],
 journal:[...campaign.journal,{id:requestId,kind:'system' as const,text:'DM-confirmed spell scroll consumed: '+itemName+' ('+spell.trim()+'). Spell outcome awaits adjudication.',createdAt:now}],
 updatedAt:now};
}
