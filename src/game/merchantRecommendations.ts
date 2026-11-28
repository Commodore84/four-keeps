import type {Campaign} from './campaign';
import {classSummary} from './creationClasses';
import {merchantPurchaseStep} from './frontierShop';

export type EquipmentRecommendation={stars:1|2|3;reason:string};
type ShopItem={id:string;name:string;category:string;costCp:number;armorGroup?:string;weaponGroup?:string;properties?:string[];stealthDisadvantage?:boolean};
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
   const group=known(item.armorGroup??'');
   const trained=(classSummary(identity.classId)?.armor??[]).map(known);
   const choices=campaign.characterBuild?.selections?.classChoices??{};
   const additionalTraining=(cls==='cleric'&&choices['divine-order']?.includes('Protector')&&group==='heavy')
     ||(cls==='druid'&&choices['primal-order']?.includes('Warden')&&group==='medium');
   if(!trained.some(t=>t===group||t==='all armor'||(group==='shield'&&t==='shields'))&&!additionalTraining)return null;
   if(equipped||owned>0)return null;
   if(group==='shield'){
     if(has('shield'))return null;
     return rating(2,'Shield training makes this a defensive option, provided your fighting style keeps a hand free.');
   }
   const dex=Math.floor(((campaign.character?.scores.dex??10)-10)/2);
   const effective=(armorName:string):number=>{
     const n=known(armorName);
     const magical=/(?:\+|\b)([123])\b/.exec(armorName)?.[1];
     const bonus=magical?Number(magical):0;
     if(n.includes('studded leather'))return 12+dex+bonus;
     if(n.includes('leather')||n.includes('padded'))return 11+dex+bonus;
     if(n.includes('half plate'))return 15+Math.min(2,dex);
     if(n.includes('breastplate')||n.includes('scale mail'))return 14+Math.min(2,dex);
     if(n.includes('chain shirt'))return 13+Math.min(2,dex);
     if(n.includes('hide armor'))return 12+Math.min(2,dex);
     if(n.includes('plate armor'))return 18;
     if(n.includes('splint armor'))return 17;
     if(n.includes('chain mail'))return 16;
     if(n.includes('ring mail'))return 14;
     return 0;
   };
   const armorNames=[...current.filter(g=>g.quantity>0&&/armor|leather|chain mail|breastplate|half plate|splint|plate armor|ring mail/.test(known(g.name))).map(g=>g.name),...(campaign.encounterLoadout?.armorId?[campaign.encounterLoadout.armorId.replace(/-/g,' ')]:[])];
   const currentBest=armorNames.reduce((best,n)=>Math.max(best,effective(n)),0);
   const nextAc=effective(item.name);
   if(!nextAc||nextAc<=currentBest)return null;
   if(rogue){
     // For an ordinary Rogue, studded leather is the top standard light armor choice.
     if(name==='studded leather armor')return rating(3,'Best standard light armor for a Dexterity Rogue: AC 12 + Dex, without Stealth disadvantage. An upgrade over leather.');
     if(name==='leather armor'&&currentBest===0)return rating(1,'Starter light armor only. Studded leather is better and preserves Stealth; save for that upgrade if possible.');
     return null; // Padded has Stealth disadvantage; no inferior armor earns stars.
   }
   if(item.stealthDisadvantage&&campaign.character.proficientSkills.includes('Stealth'))return null;
   if(group==='light'&&name==='studded leather armor')return rating(2,'Improves Dexterity-based light armor without a Stealth penalty. Compare your other trained options.');
   if(group==='medium'&&name==='breastplate')return rating(2,'Strong medium armor without Stealth disadvantage, when it improves your current AC.');
   if(group==='heavy'&&name==='plate armor'&&(campaign.character.scores.str??0)>=15)return rating(3,'Top standard heavy armor for a Strength-based, heavy-armor-trained build.');
   return rating(1,'Possible AC improvement, but weigh cost, Dexterity limits and Stealth disadvantage against better armor.');
 }
 if(weapon){
   if(owned>0||equipped)return null;
   if(rogue&&['shortbow','rapier','dagger','shortsword'].includes(name)){
     const ranged=Boolean(campaign.encounterLoadout?.weaponId?.includes('bow'))||has('shortbow')||has('longbow');
     const mastered=campaign.characterBuild?.selections?.classChoices?.['weapon-mastery']??[];
     if(name==='shortbow'&&(ranged||mastered.some(v=>known(v)==='shortbow')))return rating(3,'Fits your existing ranged Rogue style and supports ranged Sneak Attack.');
     if(name==='shortbow'&&campaign.character.proficientSkills.includes('Stealth'))return rating(2,'Ranged attacks fit a stealth-oriented Rogue; check your chosen weapon mastery.');
     if(name==='rapier'&&!ranged)return rating(2,'A strong Finesse melee option that can deliver Sneak Attack.');
     if(name==='dagger')return rating(1,'Useful concealed or thrown backup weapon; avoid duplicating an adequate loadout.');
     return null;
   }
   if(martial&&['longbow','longsword','shield','handaxe'].includes(name))return rating(2,'A useful martial loadout option if it fits your chosen fighting style and proficiency.');
   return null;
 }
 if(name.includes('arrows')&&(has('shortbow')||has('longbow')||Boolean(campaign.encounterLoadout?.weaponId?.includes('bow')))){
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
