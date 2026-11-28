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

