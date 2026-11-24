import type {Campaign} from './campaign';
import {classSummary} from './creationClasses';
import {merchantPurchaseStep} from './frontierShop';

export type EquipmentRecommendation={stars:1|2|3;reason:string};
type ShopItem={id:string;name:string;category:string;costCp:number;armorGroup?:string;weaponGroup?:string;properties?:string[]};
const known=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

/** Non-binding suggestions derived from the saved character and equipment, never from purchases in progress. */
export function equipmentRecommendation(campaign:Campaign,item:ShopItem,stock:number):EquipmentRecommendation|null {
 if(stock<merchantPurchaseStep(item.id)||!campaign.characterIdentity||!campaign.character)return null;
 const identity=campaign.characterIdentity, cls=identity.classId.toLowerCase();
 const owned=(campaign.inventoryLedger?.gear??[]).find(g=>known(g.name)===known(item.name))?.quantity??0;
 const equipped=Object.values(campaign.encounterLoadout??{}).includes(item.id);
 const name=known(item.name), category=known(item.category);
 const weapon=category.includes('weapon'), armor=Boolean(item.armorGroup);
 const current=campaign.inventoryLedger?.gear??[];
 const has=(needle:string)=>current.some(g=>g.quantity>0&&known(g.name).includes(needle));
 const rogue=cls==='rogue', martial=['fighter','ranger','paladin','barbarian','monk'].includes(cls);
 const spellcaster=['wizard','sorcerer','warlock','bard','cleric','druid'].includes(cls);
 const rating=(stars:1|2|3,reason:string):EquipmentRecommendation=>({stars,reason});
 if(armor){
   const trained=(classSummary(identity.classId)?.armor??[]).map(known);
   const group=known(item.armorGroup??'');
   const classAllows=group==='light'?(rogue||['bard','warlock','ranger','fighter','paladin','cleric','druid'].includes(cls)):
     group==='medium'?['ranger','fighter','paladin','cleric','druid','barbarian'].includes(cls):
     group==='heavy'?['fighter','paladin','cleric'].includes(cls):false;
   if(!classAllows&&!trained.some((t:string)=>t.includes(group)||t.includes('all armor')))return null;
   if(equipped||owned>0)return null;
   if(name==='studded leather armor'&&rogue&&!has('studded leather'))return rating(3,'A strong light-armor upgrade for a Dexterity-focused Rogue. Verify your current AC before buying.');
   if(!has('armor')&&!has('leather')&&!has('mail'))return rating(3,'You have no recorded armor; compare this protection with your class training and Dexterity.');
   return null;
 }
 if(weapon){
   if(owned>0||equipped)return null;
   if(rogue&&['shortbow','rapier','dagger','shortsword'].includes(name))return rating(2,'A versatile Rogue weapon option. Check your current loadout and Weapon Mastery choices.');
   if(martial&&['longbow','longsword','shield','handaxe'].includes(name))return rating(2,'A useful martial loadout option if it fits your chosen fighting style and proficiency.');
   return null;
 }
 if(name.includes('arrows')&&has('shortbow')||name.includes('arrows')&&has('longbow')){
   if(owned>=40)return null;
   return rating(owned<20?3:2,'You carry a bow; extra ammunition helps avoid running short during encounters.');
 }
 if(name.includes('bolts')&&has('crossbow')){
   if(owned>=40)return null;
   return rating(owned<20?3:2,'Your crossbow consumes bolts. Check your remaining ammunition before traveling.');
 }
 if(name.includes('component pouch')&&spellcaster&&!has('component pouch'))return rating(2,'Useful for casting spells with material components when you lack a suitable spellcasting focus.');
 if(name.includes('arcane focus')&&['wizard','warlock','sorcerer'].includes(cls)&&!has('focus'))return rating(2,'A spellcasting focus may cover many material components for your class.');
 if(name.includes('potion of healing'))return owned===0?rating(3,'Emergency healing is valuable when allies or rests are unavailable.'):owned<3?rating(2,'An additional healing potion offers a backup in dangerous encounters.'):null;
 if(name==='rope'||name.includes('rope hempen')||name.includes('rope silk'))return owned===0?rating(2,'Rope is useful for climbing, securing equipment, and creative exploration.'):null;
 if(name.includes('thieves tools')&&rogue&&owned===0)return rating(3,'Thieves’ Tools support common Rogue exploration and utility tasks.');
 if(name.includes('ball bearings'))return owned===0?rating(1,'Can help control a narrow passage or delay pursuers.'):null;
 if(name.includes('caltrops'))return owned===0?rating(1,'A situational way to restrict enemy movement or cover a retreat.'):null;
 if(name.includes('torch')||name.includes('lantern'))return owned===0?rating(1,'A practical light source for dark locations if you do not already have one.'):null;
 if(name.includes('rations'))return owned<3?rating(2,'Food is worth stocking for travel when dependable supplies are uncertain.'):null;
 if(name.includes('waterskin'))return owned===0?rating(2,'Carrying drinking water is useful for travel away from settlements.'):null;
 return null;
}
