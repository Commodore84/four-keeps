import {requireArmorSpellcasting} from './armorEffects';
import type {Campaign} from './campaign';
import {abilityModifier,type Ability} from './checks';
import {spellcastingAtLevel} from './creationClasses';
import {SPELLS,WIZARD_LEVEL2_SPELLS} from './creationMagic';
import {castItemMagicMissile,castItemWeb,useItemMagicAction,type WebPlacement} from './companionEncounter';

export type ScrollCastRequest={itemName:string;spell:string;requestId:string;dmConfirmed:boolean;checkRoll?:number;
 target?:string;missile?:{targets:string[];dice:number[];shieldedTargets?:string[]};web?:WebPlacement};
const scrollName=/^Spell Scroll \((Cantrip|Level ([1-9]))\)(?:: (.+))?$/;
export const scrollTier=(name:string):number|null=>{
 const match=scrollName.exec(name);
 return !match?null:match[1]==='Cantrip'?0:Number(match[2]);
};
const scrollDC=[13,13,13,15,15,17,17,18,18,19];
const combatSpells=new Set(['Magic Missile','Web']);
const levelTwoLists:Record<string,string[]>={
 Web:['sorcerer','wizard'], 'Hold Person':['bard','cleric','druid','sorcerer','warlock','wizard'],
 'Misty Step':['sorcerer','warlock','wizard'], Invisibility:['bard','sorcerer','warlock','wizard'], Darkness:['sorcerer','warlock','wizard'],
};

export function spellScrollCheckDC(campaign:Campaign,rank:number):number|null{
 const ch=campaign.character, identity=campaign.characterIdentity;
 if(!identity||!ch)return null;
 const level=ch.level??1;
 const progression=spellcastingAtLevel(identity.classId,level);
 const maxRank=identity.classId==='rogue'?Math.ceil(level/6):identity.classId==='warlock'?Math.min(5,Math.ceil(level/2)):
  progression?.slots.filter(count=>count>0).length??0;
 return rank>maxRank?10+rank:null;
}

export function castOwnedSpellScroll(campaign:Campaign,request:ScrollCastRequest):Campaign{
 requireArmorSpellcasting(campaign);
 const {itemName,requestId,dmConfirmed}=request,spell=request.spell.trim();
 const tier=scrollTier(itemName);
 if(tier===null)throw Error('Choose a supported spell scroll.');
 if(!requestId.trim()||!spell||spell.length>100)throw Error('A spell and unique action are required.');
 if(!dmConfirmed)throw Error('DM confirmation is required before consuming the scroll.');
 const ch=campaign.character,identity=campaign.characterIdentity,level=ch?.level??1;
 const rogue=identity?.classId==='rogue'&&(ch?.subclass==='Arcane Trickster'||campaign.importedSubclassId==='rogue-arcane-trickster')&&level>=3;
 const progression=identity?spellcastingAtLevel(identity.classId,level):null;
 if(!identity||!ch||!progression&&!rogue)throw Error('A spellcasting class is required.');
 if((campaign.spellEffects??[]).some(e=>e.id===requestId)||campaign.consumableUseIds?.includes(requestId))throw Error('Scroll action already completed.');
 const ledger=campaign.inventoryLedger;
 const owned=ledger?.gear.find(g=>g.name===itemName);
 if(!ledger||!owned||owned.quantity<1)throw Error('Scroll is not owned.');
 const encoded=scrollName.exec(itemName)?.[3];
 if(encoded&&encoded.toLowerCase()!==spell.toLowerCase())throw Error('This scroll contains '+encoded+'.');
 const candidate=SPELLS.find(s=>s.name.toLowerCase()===spell.toLowerCase());
 const rankedName=WIZARD_LEVEL2_SPELLS.find(s=>s.toLowerCase()===spell.toLowerCase());
 const name=candidate?.name??rankedName??spell;
 const casterList=rogue?'wizard':identity.classId;
 const known=tier===0?ch.cantrips:ch.preparedSpells;
 const classAllowed=candidate?candidate.classes.some(cls=>cls.toLowerCase()===casterList):
  rankedName&&(casterList==='wizard'||levelTwoLists[name]?.includes(casterList));
 const rank=candidate?.level??(rankedName?2:null);
 if(rank===null||!classAllowed&&!known?.some(s=>s.toLowerCase()===spell.toLowerCase()))throw Error('This spell is not verified on your class spell list. Ask the DM to adjudicate it.');
 if(rank!==tier)throw Error('Spell level does not match the scroll.');
 const combat=campaign.companionEncounter?.status==='active';
 if(campaign.combat&&campaign.combat.status!=='completed'||combat&&!combatSpells.has(name))throw Error('Combat casting of this scroll requires DM adjudication.');
 const dc=spellScrollCheckDC(campaign,tier);
 let failed=false;
 if(dc!==null){
  const roll=request.checkRoll;
  if(!Number.isInteger(roll)||roll!<1||roll!>20)throw Error('Enter the spellcasting ability d20 for DC '+dc+'.');
  const ability=(rogue?'int':progression!.ability.toLowerCase()) as Ability;
  failed=roll!+abilityModifier(ch.scores[ability])<dc;
 }
 let resolved=campaign;
 if(combat){
  if(failed)resolved=useItemMagicAction(campaign,'The scroll casting check failed.');
  else if(name==='Magic Missile'&&request.missile)resolved=castItemMagicMissile(campaign,tier,request.missile.targets,request.missile.dice,request.missile.shieldedTargets);
  else if(name==='Web'&&request.web)resolved=castItemWeb(campaign,request.web,scrollDC[tier]);
  else throw Error('Combat casting requires verified targets, dice or a Web origin.');
 }
 const now=new Date().toISOString();
 return {...resolved,inventoryLedger:{...ledger,gear:ledger.gear.map(g=>g===owned?{...g,quantity:g.quantity-1}:g).filter(g=>g.quantity>0)},
  consumableUseIds:[...(resolved.consumableUseIds??[]),requestId],
  ...(!combat&&!failed?{spellEffects:[...(resolved.spellEffects??[]),{id:requestId,spell:name,target:request.target,status:'awaiting-adjudication' as const,createdAt:now}]}:{}),
  updatedAt:now,journal:[...resolved.journal,{id:requestId,kind:'system',createdAt:now,
   text:'DM-confirmed scroll: '+name+(failed?' faded after a failed DC '+dc+' casting check.':combat?' resolved.':' consumed. Spell outcome requires DM adjudication.')}]};
}
