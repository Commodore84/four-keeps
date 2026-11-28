import type {Campaign} from './campaign';
import {ITEMS,type Item} from './creationEquipment';
import {classSummary} from './creationClasses';
import {weaponAttackProfile,ammunitionNamesForWeapon} from './weaponAttackProfile';
import {abilityModifier} from './checks';

/** Extra Attack increases attacks within one Attack action. It does not
 * grant extra actions, and Loading still restricts ammunition. */
export function ordinaryAttackLimit(campaign:Campaign):number {
 const character=campaign.character;
 const level=character?.level??1;
 const classId=campaign.characterIdentity?.classId??character?.classId;
 if(classId==='fighter')return level>=20?4:level>=11?3:level>=5?2:1;
 return ['barbarian','monk','paladin','ranger'].includes(classId??'')&&level>=5?2:1;
}
export function canOrdinaryActionAttack(campaign:Campaign):boolean{
 const c=campaign.combat;
 if(!c||c.attack&&c.attack.phase!=='resolved')return false;
 return !c.actionUsed||!!c.attackCountThisTurn&&c.attackCountThisTurn<ordinaryAttackLimit(campaign);
}

export type OrdinaryAttackMode='melee'|'versatile'|'ranged'|'thrown'|'unarmed'|'offhand'|'monk-bonus';
export type OrdinaryWeaponAttack={
 id:string;itemId?:string;mode:OrdinaryAttackMode;name:string;damageDice:string;
 attackBonus:number;damageModifier:number;proficient:boolean;
 ranged:boolean;normalRange:number;maximumRange:number;reach:number;
 ammoName?:string;count:number;finesse:boolean;heavyPenalty:boolean;
 action:'action'|'bonus';
};
const weapons=ITEMS.filter(item=>item.category==='weapon');
const ownedQuantity=(campaign:Campaign,name:string)=>{
 const count=(campaign.inventoryLedger?.gear??[]).filter(row=>row.name.toLowerCase()===name.toLowerCase()).reduce((n,row)=>n+row.quantity,0);
 if(count>0)return count;
 if(!campaign.characterIdentity&&name==='Dagger')return campaign.equipment?.daggers??0;
 return 0;
};
export function ownedOrdinaryWeapons(campaign:Campaign):Item[]{
 return weapons.filter(item=>ownedQuantity(campaign,item.name)>0);
}
export function ordinaryWeaponTraining(campaign:Campaign,item:Item):boolean{
 const character=campaign.character;
 const classId=campaign.characterIdentity?.classId??character?.classId;
 const trained=character?.weaponProficiencies??(classId?classSummary(classId)?.weapons??[]:[]);
 const broad=trained.includes(item.weaponGroup==='simple'?'Simple':'Martial');
 const special=monkWeapon(campaign,item)||item.weaponGroup==='martial'&&(
  (trained.includes('Martial Light')&&!!item.properties?.includes('Light'))||
  (trained.includes('Martial (Finesse or Light)')&&!!item.properties?.some(p=>p==='Finesse'||p==='Light')));
 return trained.includes(item.name)||broad||special;
}
function monkWeapon(campaign:Campaign,item:Item):boolean {
 if((campaign.characterIdentity?.classId??campaign.character?.classId)!=='monk')return false;
 return !weaponAttackProfile(item).rangedWeapon &&
  (item.weaponGroup==='simple'||
   item.weaponGroup==='martial'&&!!item.properties?.includes('Light'));
}
function monkDie(level:number):string{
 return '1d'+(level>=17?'12':level>=11?'10':level>=5?'8':'6');
}
function chooseDice(item:Item,mode:OrdinaryAttackMode,monk:boolean,level:number):string{
 const damage=mode==='versatile'?weaponAttackProfile(item).versatileDamage??item.damage:item.damage;
 const match=damage?.match(/^(\d+d\d+|\d+)/);
 const dice=match?.[1]??'1';
 if(monk&&/^1d\d+$/.test(dice)&&Number(dice.split('d')[1])<Number(monkDie(level).slice(2)))return monkDie(level);
 return dice;
}
function availableAmmo(campaign:Campaign,item:Item):{name?:string;count:number}{
 const kinds=ammunitionNamesForWeapon(item);
 if(!kinds.length)return {count:ownedQuantity(campaign,item.name)};
 for(const name of kinds){
  const count=ownedQuantity(campaign,name);
  if(count>0)return {name,count};
 }
 return {name:kinds[0],count:0};
}
export function ordinaryAttackProfile(campaign:Campaign,id:string,mode:OrdinaryAttackMode):OrdinaryWeaponAttack|null{
 const character=campaign.character;
 if(!character)return null;
 const bonus=character.proficiencyBonus;
 const str=abilityModifier(character.scores.str),dex=abilityModifier(character.scores.dex);
 const monk=(campaign.characterIdentity?.classId??character.classId)==='monk';
 if(id==='unarmed'&&(mode==='unarmed'||mode==='monk-bonus')){
  const value=monk?Math.max(str,dex):str;
  if(mode==='monk-bonus'&&!monk)return null;
  return {id:mode==='monk-bonus'?'unarmed:monk-bonus':'unarmed',mode,name:mode==='monk-bonus'?'Unarmed Strike (Bonus)':'Unarmed Strike',damageDice:monk?monkDie(character.level??1):'1',
   attackBonus:value+bonus,damageModifier:value,proficient:true,ranged:false,normalRange:5,maximumRange:5,
   reach:5,count:1,finesse:false,heavyPenalty:false,action:mode==='monk-bonus'?'bonus':'action'};
 }
 const item=weapons.find(item=>item.id===id);
 if(!item||ownedQuantity(campaign,item.name)<=0)return null;
 const properties=item.properties??[],info=weaponAttackProfile(item,mode==='thrown');
 const isRanged=info.rangedWeapon;
 const validModes=mode==='ranged'?isRanged:mode==='thrown'?!!properties.find(p=>p.startsWith('Thrown ')):
  mode==='versatile'?!!info.versatileDamage:mode==='offhand'?!!properties.includes('Light'):mode==='melee'&&!isRanged;
 if(!validModes)return null;
 const trained=ordinaryWeaponTraining(campaign,item);
 const canMonk=monkWeapon(campaign,item);
 const useDex=isRanged||properties.includes('Finesse')||canMonk;
 const modifier=useDex?Math.max(isRanged?dex:str,dex):str;
 const available=availableAmmo(campaign,item);
 const usingAmmunition=isRanged&&ammunitionNamesForWeapon(item).length>0;
 const usingThrown=mode==='thrown';
 const ranged=isRanged||usingThrown;
 const heavyPenalty=properties.includes('Heavy')&&(isRanged?character.scores.dex:character.scores.str)<13;
 const itemName=item.name;
 return {id:mode==='melee'?id:id+':'+mode,itemId:id,mode,
  name:itemName+(mode==='thrown'?' (Thrown)':mode==='versatile'?' (Two Hands)':mode==='offhand'?' (Off Hand)':''),
  damageDice:chooseDice(item,mode,canMonk,character.level??1),
  attackBonus:modifier+(trained?bonus:0),damageModifier:mode==='offhand'?Math.min(0,modifier):modifier,proficient:trained,
  ranged,normalRange:ranged?info.normalRange:info.reach,maximumRange:ranged?info.maximumRange:info.reach,
  reach:info.reach,ammoName:usingAmmunition?available.name:undefined,
  count:usingAmmunition?available.count:ownedQuantity(campaign,itemName),
  finesse:properties.includes('Finesse')||isRanged,
  heavyPenalty,action:mode==='offhand'?'bonus':'action'};
}
export function equippedOrdinaryAttacks(campaign:Campaign):OrdinaryWeaponAttack[]{
 const loadout=campaign.encounterLoadout??{};
 const options:OrdinaryWeaponAttack[]=[];
 for(const id of [loadout.weaponId,loadout.offhandWeaponId]){
  if(!id)continue;
  const item=weapons.find(entry=>entry.id===id);
  if(!item)continue;
  const baseMode:OrdinaryAttackMode=item.properties?.some(p=>p.startsWith('Ammunition '))?'ranged':
   weaponAttackProfile(item).rangedWeapon?'thrown':'melee';
  const modes:OrdinaryAttackMode[]=[id===loadout.offhandWeaponId&&!!loadout.weaponId?'offhand':baseMode];
  // Work with the main-hand melee or ranged attack, plus optional off-hand bonus attack.
  if(id===loadout.weaponId){
   modes.splice(0,modes.length,baseMode);
   if(baseMode!=='thrown'&&item.properties?.some(p=>p.startsWith('Thrown ')))modes.push('thrown');
   if(item.properties?.some(p=>p.startsWith('Versatile '))&&!loadout.shieldId&&!loadout.offhandWeaponId)modes.push('versatile');
  }
  for(const mode of modes){
   const profile=ordinaryAttackProfile(campaign,id,mode);
   if(profile&&!options.some(p=>p.id===profile.id))options.push(profile);
  }
 }
 const unarmed=ordinaryAttackProfile(campaign,'unarmed','unarmed');
 if(unarmed)options.push(unarmed);
 if((campaign.characterIdentity?.classId??campaign.character?.classId)==='monk'){
  const bonus=ordinaryAttackProfile(campaign,'unarmed','monk-bonus');
  if(bonus)options.push(bonus);
 }
 return options;
}
export function spendOrdinaryWeaponAmmo(campaign:Campaign,profile:OrdinaryWeaponAttack):Campaign{
 const name=profile.ammoName??(profile.mode==='thrown'&&profile.itemId?weapons.find(item=>item.id===profile.itemId)?.name:undefined);
 if(!name)return campaign;
 const gear=campaign.inventoryLedger?.gear;
 if(!gear)throw Error('No campaign inventory is available.');
 const index=gear.findIndex(row=>row.name.toLowerCase()===name.toLowerCase()&&row.quantity>0);
 if(index<0)throw Error('No '+name+' remaining.');
 const nextGear=gear.map((row,i)=>i===index?{...row,quantity:row.quantity-1}:row);
 return {...campaign,inventoryLedger:{...campaign.inventoryLedger!,gear:nextGear}};
}


/**
 * Physical hands are separate from the preferred encounter loadout.
 * A two-handed weapon may be *held* with one hand; it needs both hands
 * available only when attacking with it. The shield occupies the other hand.
 */
export type CombatWeaponHands={main?:string;off?:string};
export type CombatWeaponHandPlan={
 eligible:boolean;reason?:string;hands:CombatWeaponHands;objectInteractionUsed:boolean;
 interactions:string[];summary:string;
};
export function combatHeldWeapons(campaign:Campaign):CombatWeaponHands{
 const saved=campaign.combat?.weaponHands;
 return saved?{...saved}:{
  main:campaign.encounterLoadout?.weaponId||undefined,
  off:campaign.encounterLoadout?.offhandWeaponId||undefined
 };
}
const isTwoHanded=(item:Item,mode:OrdinaryAttackMode)=>mode==='versatile'||
 !!item.properties?.some(p=>p==='Two-Handed'||p==='Two-Handed unless mounted');

/** Builds a legal weapon-interaction plan without changing campaign state.
 * The Attack action grants one draw OR stow per attack; Thrown grants its
 * own draw. The normal once-per-turn object interaction can be used as well.
 * Bonus Action attacks have no Attack-action weapon interaction. */
export function planOrdinaryWeaponAttack(
 campaign:Campaign,profile:OrdinaryWeaponAttack,
 context?:{hands?:CombatWeaponHands;objectInteractionUsed?:boolean}
):CombatWeaponHandPlan{
 const current=context?.hands?{...context.hands}:combatHeldWeapons(campaign);
 const interactionUsed=context?.objectInteractionUsed??!!campaign.combat?.objectInteractionUsed;
 const hands={...current};
 const c=campaign.combat;
 const fail=(reason:string):CombatWeaponHandPlan=>({eligible:false,reason,hands:current,
  objectInteractionUsed:interactionUsed,interactions:[],summary:reason});
 if(!profile.itemId||profile.itemId==='unarmed')
  return {eligible:true,hands,objectInteractionUsed:interactionUsed,interactions:[],summary:'Unarmed'};
 const item=weapons.find(w=>w.id===profile.itemId);
 if(!item)return fail('Weapon not in the ordinary catalog.');
 const twoHands=isTwoHanded(item,profile.mode);
 const shield=!!campaign.encounterLoadout?.shieldId;
 if(twoHands&&shield)return fail('Two hands required; the shield occupies one.');
 const hasAmmo=!!profile.ammoName;
 const freeLoadingHand=hasAmmo&&!twoHands;
 let attackSwap=profile.action==='action'?1:0;
 let objectSwap=interactionUsed?0:1;
 const interactions:string[]=[];
 const spend=(kind:'stow'|'draw',name:string,attackOnly=false)=>{
  // Preserve the Attack interaction for a required draw when stowing too.
  if(attackOnly){
   if(!attackSwap)return false;
   attackSwap--;interactions.push(kind+' '+name+' (Attack interaction)');return true;
  }
  if(attackSwap){attackSwap--;interactions.push(kind+' '+name+' (Attack interaction)');return true;}
  if(objectSwap){objectSwap--;interactions.push(kind+' '+name+' (object interaction)');return true;}
  return false;
 };
 const stow=(hand:'main'|'off',reserveDraw=false)=>{
  const weaponId=hands[hand];
  if(!weaponId)return true;
  const name=weapons.find(w=>w.id===weaponId)?.name??weaponId;
  if(reserveDraw&&attackSwap){
   if(!objectSwap)return false;
   objectSwap--;interactions.push('stow '+name+' (object interaction)');
  }else if(!spend('stow',name))return false;
  hands[hand]=undefined;
  return true;
 };
 const alreadyMain=hands.main===item.id;
 const alreadyOff=hands.off===item.id;
 const sameLightInstance=profile.mode==='offhand'&&
  c?.lightAttackWeaponId===item.id&&alreadyMain&&!alreadyOff;
 if(sameLightInstance&&ownedQuantity(campaign,item.name)<2)
  return fail('A different Light weapon is required for the Bonus Action attack.');
 const isHeld=!sameLightInstance&&(alreadyMain||alreadyOff);
 const drawnByThrown=profile.mode==='thrown';
 const needsDraw=!isHeld;
 const needsFreeSecond=twoHands||freeLoadingHand;
 if(needsDraw){
  const requiredEmpty=twoHands?2:1;
  const empty=()=>Number(!hands.main)+Number(!hands.off&&!shield);
  while(empty()<requiredEmpty){
   const hand=hands.off?'off':hands.main?'main':null;
   if(!hand)return fail('A shield prevents this weapon attack.');
   // A normal drawn weapon still needs its Attack interaction, while
   // Thrown draws without consuming that interaction.
   if(!stow(hand,!drawnByThrown&&!!attackSwap))
    return fail('Stow a held weapon first; no interaction remains to draw '+item.name+'.');
  }
  if(!drawnByThrown){
   if(!spend('draw',item.name))return fail('No interaction remains to draw '+item.name+'.');
   if(twoHands||!hands.main)hands.main=item.id;
   else hands.off=item.id;
  }else{
   interactions.push('draw '+item.name+' (Thrown property)');
  }
 }else if(needsFreeSecond){
  const other:('main'|'off')[]=alreadyMain?['off']:['main'];
  if(other.some(hand=>!!hands[hand])){
   if(!stow(other[0]))return fail('Stow the other held weapon before using '+item.name+'.');
  }
 }
 // An Ammunition weapon used one-handed needs an empty other hand to load.
 if(freeLoadingHand){
  if(shield)return fail('A free hand is required to load '+item.name+'.');
  if(hands.main&&hands.off){
   const other=hands.main===item.id?'off':'main';
   if(!stow(other))return fail('Stow the other held weapon before loading '+item.name+'.');
  }
 }
 if(drawnByThrown){
  // A held weapon is gone once thrown; the inventory decrement is handled
  // by the existing attack roll so hit/miss both consume it.
  if(alreadyOff)hands.off=undefined;
  else if(alreadyMain)hands.main=undefined;
 }
 const summary=interactions.length?
  interactions.map(step=>step.replace(/ \((?:Attack|object) interaction\)/g,'')).join(' · '):
  isHeld?'Held':'Ready';
 return {eligible:true,hands,objectInteractionUsed:objectSwap===0||interactionUsed,
  interactions,summary};
}

/** List attacks using real carried gear, not just preferred hand slots.
 * The physical hand and action-economy planner decides whether each is legal. */
export function accessibleOrdinaryAttacks(campaign:Campaign):OrdinaryWeaponAttack[]{
 const options:OrdinaryWeaponAttack[]=[];
 const add=(id:string,mode:OrdinaryAttackMode)=>{
  const p=ordinaryAttackProfile(campaign,id,mode);
  if(p&&!options.some(option=>option.id===p.id))options.push(p);
 };
 for(const item of ownedOrdinaryWeapons(campaign)){
  const ammo=item.properties?.some(p=>p.startsWith('Ammunition '));
  const ranged=weaponAttackProfile(item).rangedWeapon;
  if(ammo)add(item.id,'ranged');
  else if(!ranged)add(item.id,'melee');
  if(item.properties?.some(p=>p.startsWith('Thrown ')))add(item.id,'thrown');
  if(item.properties?.some(p=>p.startsWith('Versatile ')))add(item.id,'versatile');
  if(item.properties?.includes('Light')&&
   (campaign.combat?.lightAttackWeaponId||combatHeldWeapons(campaign).off===item.id))
   add(item.id,'offhand');
 }
 add('unarmed','unarmed');
 if((campaign.characterIdentity?.classId??campaign.character?.classId)==='monk')
  add('unarmed','monk-bonus');
 // Keep the currently held weapons within thumb reach on iPhone before
 // the rest of the belt/inventory, without hiding any legal attack.
 const held=combatHeldWeapons(campaign);
 const priority=(p:OrdinaryWeaponAttack)=>
  p.itemId&&p.itemId===held.main?0:p.itemId&&p.itemId===held.off?1:
  p.itemId&&p.itemId!=='unarmed'?2:3;
 return options.sort((a,b)=>priority(a)-priority(b));
}
