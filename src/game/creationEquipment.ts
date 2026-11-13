import {modifier,type Scores} from './creationAbilities';
import {classSummary} from './creationClasses';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';
export type Category='weapon'|'armor'|'shield'|'gear'|'tool'|'ammunition';
export interface Item {id:string;name:string;category:Category;costCp:number;weight:number;weaponGroup?:'simple'|'martial';damage?:string;properties?:string[];mastery?:string;armorGroup?:'Light'|'Medium'|'Heavy';baseAC?:number;dexCap?:number;strength?:number;stealthDisadvantage?:boolean;official2024?:boolean;packQuantity?:number}
const item=(name:string,category:Category,gp:number,weight:number,extra:Partial<Item>={}):Item=>({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),name,category,costCp:Math.round(gp*100),weight,...extra});
const weapon=(name:string,gp:number,weight:number,damage:string,group:'simple'|'martial',properties:string,mastery:string)=>item(name,'weapon',gp,weight,{damage,weaponGroup:group,properties:properties?properties.split(','):[],mastery});
const armor=(name:string,gp:number,weight:number,group:'Light'|'Medium'|'Heavy',ac:number,dexCap:number,strength=0,stealthDisadvantage=false)=>item(name,'armor',gp,weight,{armorGroup:group,baseAC:ac,dexCap,strength,stealthDisadvantage});
const LEGACY_ITEMS:Item[]=[
 weapon('Club',.1,2,'1d4 bludgeoning','simple','Light','Slow'),weapon('Dagger',2,1,'1d4 piercing','simple','Finesse,Light,Thrown 20/60','Nick'),weapon('Greatclub',.2,10,'1d8 bludgeoning','simple','Two-Handed','Push'),weapon('Handaxe',5,2,'1d6 slashing','simple','Light,Thrown 20/60','Vex'),weapon('Javelin',.5,2,'1d6 piercing','simple','Thrown 30/120','Slow'),weapon('Light Hammer',2,2,'1d4 bludgeoning','simple','Light,Thrown 20/60','Nick'),weapon('Mace',5,4,'1d6 bludgeoning','simple','','Sap'),weapon('Quarterstaff',.2,4,'1d6 bludgeoning','simple','Versatile 1d8','Topple'),weapon('Sickle',1,2,'1d4 slashing','simple','Light','Nick'),weapon('Spear',1,3,'1d6 piercing','simple','Thrown 20/60,Versatile 1d8','Sap'),
 weapon('Dart',.05,.25,'1d4 piercing','simple','Finesse,Thrown 20/60','Vex'),weapon('Light Crossbow',25,5,'1d8 piercing','simple','Ammunition 80/320,Loading,Two-Handed','Slow'),weapon('Shortbow',25,2,'1d6 piercing','simple','Ammunition 80/320,Two-Handed','Vex'),weapon('Sling',.1,0,'1d4 bludgeoning','simple','Ammunition 30/120','Slow'),
 weapon('Battleaxe',10,4,'1d8 slashing','martial','Versatile 1d10','Topple'),weapon('Flail',10,2,'1d8 bludgeoning','martial','','Sap'),weapon('Glaive',20,6,'1d10 slashing','martial','Heavy,Reach,Two-Handed','Graze'),weapon('Greataxe',30,7,'1d12 slashing','martial','Heavy,Two-Handed','Cleave'),weapon('Greatsword',50,6,'2d6 slashing','martial','Heavy,Two-Handed','Graze'),weapon('Halberd',20,6,'1d10 slashing','martial','Heavy,Reach,Two-Handed','Cleave'),weapon('Lance',10,6,'1d10 piercing','martial','Heavy,Reach,Two-Handed unless mounted','Topple'),weapon('Longsword',15,3,'1d8 slashing','martial','Versatile 1d10','Sap'),weapon('Maul',10,10,'2d6 bludgeoning','martial','Heavy,Two-Handed','Topple'),weapon('Morningstar',15,4,'1d8 piercing','martial','','Sap'),weapon('Pike',5,18,'1d10 piercing','martial','Heavy,Reach,Two-Handed','Push'),weapon('Rapier',25,2,'1d8 piercing','martial','Finesse','Vex'),weapon('Scimitar',25,3,'1d6 slashing','martial','Finesse,Light','Nick'),weapon('Shortsword',10,2,'1d6 piercing','martial','Finesse,Light','Vex'),weapon('Trident',5,4,'1d8 piercing','martial','Thrown 20/60,Versatile 1d10','Topple'),weapon('Warhammer',15,5,'1d8 bludgeoning','martial','Versatile 1d10','Push'),weapon('War Pick',5,2,'1d8 piercing','martial','Versatile 1d10','Sap'),weapon('Whip',2,3,'1d4 slashing','martial','Finesse,Reach','Slow'),weapon('Blowgun',10,1,'1 piercing','martial','Ammunition 25/100,Loading','Vex'),weapon('Hand Crossbow',75,3,'1d6 piercing','martial','Ammunition 30/120,Light,Loading','Vex'),weapon('Heavy Crossbow',50,18,'1d10 piercing','martial','Ammunition 100/400,Heavy,Loading,Two-Handed','Push'),weapon('Longbow',50,2,'1d8 piercing','martial','Ammunition 150/600,Heavy,Two-Handed','Slow'),weapon('Musket',500,10,'1d12 piercing','martial','Ammunition 40/120,Loading,Two-Handed','Slow'),weapon('Pistol',250,3,'1d10 piercing','martial','Ammunition 30/90,Loading','Vex'),
 armor('Padded Armor',5,8,'Light',11,99,0,true),armor('Leather Armor',10,10,'Light',11,99),armor('Studded Leather Armor',45,13,'Light',12,99),armor('Hide Armor',10,12,'Medium',12,2),armor('Chain Shirt',50,20,'Medium',13,2),armor('Scale Mail',50,45,'Medium',14,2,0,true),armor('Breastplate',400,20,'Medium',14,2),armor('Half Plate Armor',750,40,'Medium',15,2,0,true),armor('Ring Mail',30,40,'Heavy',14,0,0,true),armor('Chain Mail',75,55,'Heavy',16,0,13,true),armor('Splint Armor',200,60,'Heavy',17,0,15,true),armor('Plate Armor',1500,65,'Heavy',18,0,15,true),item('Shield','shield',10,6),
 ...([['Backpack',2,5],['Bedroll',1,7],['Blanket',.5,3],['Book',25,5],['Crowbar',2,5],['Explorer’s Pack',10,55],['Dungeoneer’s Pack',12,55],['Entertainer’s Pack',40,58.5],['Priest’s Pack',33,29],['Scholar’s Pack',40,22],['Burglar’s Pack',16,42],['Healer’s Kit',5,3],['Holy Symbol',5,1],['Arcane Focus (Crystal)',10,1],['Arcane Focus (Orb)',20,3],['Druidic Focus (Mistletoe)',1,0],['Spellbook',50,3],['Robe',1,4],['Traveler’s Clothes',2,4],['Fine Clothes',15,6],['Costume',5,4],['Pouch',.5,1],['Quiver',1,1],['Rope',1,5],['Torch',.01,1],['Rations',.5,2],['Waterskin',.2,5],['Caltrops',1,2],['Mirror',5,.5],['Perfume',5,0],['Ink',10,0],['Parchment',.1,0],['Grappling Hook',2,4],['Potion of Healing',50,.5],['Tinderbox',.5,1],['Shovel',2,5],['Pot, Iron',2,10],['Manacles',2,6],['Lantern, Hooded',5,2],['Lamp',.5,1],['Oil',.1,1],['Tent',2,20],['Forgery Kit',15,5],['Thieves’ Tools',25,1],['Calligrapher’s Supplies',10,5],['Carpenter’s Tools',8,6],['Cartographer’s Tools',15,6],['Herbalism Kit',5,3],['Navigator’s Tools',25,2],['Gaming Set',1,0],['Musical Instrument',2,2],['Artisan’s Tools',5,5]] as const).map(([n,g,w])=>item(n,/Tools|Kit|Instrument|Gaming Set|Supplies/.test(n)?'tool':'gear',g,w)),
 item('Arrows','ammunition',.05,.05),item('Crossbow Bolts','ammunition',.05,.075),item('Sling Bullets','ammunition',.01,.075)
];
// Canonical 2024 facts take precedence, while legacy IDs remain resolvable for saved campaigns.
const canonicalById=new Map(OFFICIAL_EQUIPMENT_2024.map(i=>[i.id,i]));
/** Stable saved-game IDs whose 2024 catalog counterparts have different names. */
export const LEGACY_EQUIPMENT_ALIASES:Readonly<Record<string,string>>={
 'crossbow-bolts':'bolts',
 'sling-bullets':'bullets-sling',
};
export const canonicalEquipmentId=(id:string):string=>LEGACY_EQUIPMENT_ALIASES[id]??id;
const resolvedLegacy=LEGACY_ITEMS.map(old=>{
 const canonical=canonicalById.get(canonicalEquipmentId(old.id));
 // Keep historical display names/IDs and pack contents intact; adopt official mechanics and cost where exact.
 return canonical?(canonical.id===old.id?canonical:old.id==='sling-bullets'?old:{...canonical,id:old.id,name:old.name}):old;
});
export const ITEMS:Item[]=[...resolvedLegacy,...OFFICIAL_EQUIPMENT_2024.filter(i=>!LEGACY_ITEMS.some(old=>old.id===i.id))];
export const ITEM_BY_ID:Record<string,Item>=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
export interface Package {gold:number;items:Record<string,number>;label:string}
const pkg=(gold:number,entries:string, label='Package A'):Package=>({gold,items:Object.fromEntries(entries.split('|').filter(Boolean).map(entry=>{const [id,quantity]=entry.split('*');return [id,Number(quantity??1)]})),label});
export const CLASS_PACKAGES:Record<string,Package[]> = {
 barbarian:[pkg(15,'greataxe|handaxe*4|explorer-s-pack'),pkg(75,'','75 GP')],
 bard:[pkg(19,'leather-armor|dagger*2|musical-instrument|entertainer-s-pack'),pkg(90,'','90 GP')],
 cleric:[pkg(7,'chain-shirt|shield|mace|holy-symbol|priest-s-pack'),pkg(110,'','110 GP')],
 druid:[pkg(9,'leather-armor|shield|sickle|quarterstaff|explorer-s-pack|herbalism-kit'),pkg(50,'','50 GP')],
 fighter:[pkg(4,'chain-mail|greatsword|flail|javelin*8|dungeoneer-s-pack'),pkg(11,'studded-leather-armor|scimitar|shortsword|longbow|arrows*20|quiver|dungeoneer-s-pack','Package B'),pkg(155,'','155 GP')],
 monk:[pkg(11,'spear|dagger*5|artisan-s-tools|explorer-s-pack'),pkg(50,'','50 GP')],
 paladin:[pkg(9,'chain-mail|shield|longsword|javelin*6|holy-symbol|priest-s-pack'),pkg(150,'','150 GP')],
 ranger:[pkg(7,'studded-leather-armor|scimitar|shortsword|longbow|arrows*20|quiver|druidic-focus-mistletoe|explorer-s-pack'),pkg(150,'','150 GP')],
 rogue:[pkg(8,'leather-armor|dagger*2|shortsword|shortbow|arrows*20|quiver|thieves-tools|burglar-s-pack'),pkg(100,'','100 GP')],
 sorcerer:[pkg(28,'spear|dagger*2|arcane-focus-crystal|dungeoneer-s-pack'),pkg(50,'','50 GP')],
 warlock:[pkg(15,'leather-armor|sickle|dagger*2|arcane-focus-orb|book|scholar-s-pack'),pkg(100,'','100 GP')],
 wizard:[pkg(5,'dagger*2|quarterstaff|robe|spellbook|scholar-s-pack'),pkg(55,'','55 GP')]
};
export const BACKGROUND_PACKAGES:Record<string,Package[]> = {
 custom:[pkg(50,'','50 GP')],
 acolyte:[pkg(8,'calligrapher-s-supplies|book|holy-symbol|parchment*10|robe'),pkg(50,'','50 GP')],
 artisan:[pkg(32,'artisan-s-tools|pouch*2|traveler-s-clothes'),pkg(50,'','50 GP')],
 charlatan:[pkg(15,'forgery-kit|costume|fine-clothes'),pkg(50,'','50 GP')],
 criminal:[pkg(16,'dagger*2|thieves-tools|crowbar|pouch*2|traveler-s-clothes'),pkg(50,'','50 GP')],
 entertainer:[pkg(11,'musical-instrument|costume*2|mirror|perfume|traveler-s-clothes'),pkg(50,'','50 GP')],
 farmer:[pkg(30,'sickle|carpenter-s-tools|healer-s-kit|pot-iron|shovel|traveler-s-clothes'),pkg(50,'','50 GP')],
 guard:[pkg(12,'spear|light-crossbow|crossbow-bolts*20|gaming-set|lantern-hooded|manacles|quiver|traveler-s-clothes'),pkg(50,'','50 GP')],
 guide:[pkg(3,'shortbow|arrows*20|cartographer-s-tools|bedroll|quiver|tent|traveler-s-clothes'),pkg(50,'','50 GP')],
 hermit:[pkg(16,'quarterstaff|herbalism-kit|bedroll|book|lamp|oil*3|traveler-s-clothes'),pkg(50,'','50 GP')],
 merchant:[pkg(22,'navigator-s-tools|pouch*2|traveler-s-clothes'),pkg(50,'','50 GP')],
 noble:[pkg(29,'gaming-set|fine-clothes|perfume'),pkg(50,'','50 GP')],
 sage:[pkg(8,'quarterstaff|calligrapher-s-supplies|book|parchment*8|robe'),pkg(50,'','50 GP')],
 sailor:[pkg(20,'dagger|navigator-s-tools|rope|traveler-s-clothes'),pkg(50,'','50 GP')],
 scribe:[pkg(23,'calligrapher-s-supplies|fine-clothes|lamp|oil*3|parchment*12'),pkg(50,'','50 GP')],
 soldier:[pkg(14,'spear|shortbow|arrows*20|gaming-set|healer-s-kit|quiver|traveler-s-clothes'),pkg(50,'','50 GP')],
 wayfarer:[pkg(16,'dagger*2|thieves-tools|gaming-set|bedroll|pouch*2|traveler-s-clothes'),pkg(50,'','50 GP')]
};
/** Explicit 2024 choices for legacy generic starting-package entries. Old drafts without choices keep their original inventory. */
export const EQUIPMENT_VARIANTS:Readonly<Record<string,readonly string[]>>={
 'musical-instrument':['musical-instrument-bagpipes','musical-instrument-drum','musical-instrument-dulcimer','musical-instrument-flute','musical-instrument-horn','musical-instrument-lute','musical-instrument-lyre','musical-instrument-pan-flute','musical-instrument-shawm','musical-instrument-viol'],
 'gaming-set':['gaming-set-dice','gaming-set-dragonchess','gaming-set-playing-cards','gaming-set-three-dragon-ante'],
 'holy-symbol':['holy-symbol-amulet','holy-symbol-emblem','holy-symbol-reliquary'],
 'artisan-s-tools':['carpenter-s-tools','smith-s-tools','weaver-s-tools','woodcarver-s-tools','potter-s-tools','leatherworker-s-tools','mason-s-tools','jeweler-s-tools','glassblower-s-tools','brewer-s-supplies','calligrapher-s-supplies','cartographer-s-tools','cobbler-s-tools','cook-s-utensils','painter-s-supplies','tinker-s-tools'].filter(id=>Boolean(canonicalById.get(id))),
};
export function packageVariantIds(draft:EquipmentDraft,classId:string,backgroundId:string):string[]{
 const classItems=CLASS_PACKAGES[classId]?.[draft.classPackage??-1]?.items??{};
 const backgroundItems=BACKGROUND_PACKAGES[backgroundId]?.[draft.backgroundPackage??-1]?.items??{};
 return Object.keys(EQUIPMENT_VARIANTS).filter(id=>(classItems[id]??0)+(backgroundItems[id]??0)>0);
}
export function defaultPackageVariants(draft:EquipmentDraft,classId:string,backgroundId:string):Record<string,string>{
 return Object.fromEntries(packageVariantIds(draft,classId,backgroundId).map(id=>[id,EQUIPMENT_VARIANTS[id].find(choice=>canonicalById.has(choice))!]));
}
export function selectEquipmentVariant(draft:EquipmentDraft,classId:string,backgroundId:string,placeholder:string,choice:string):EquipmentDraft {
 if(!packageVariantIds(draft,classId,backgroundId).includes(placeholder)||!EQUIPMENT_VARIANTS[placeholder]?.includes(choice)||!canonicalById.has(choice))throw Error('Invalid official equipment choice.');
 return {...draft,packageVariants:{...draft.packageVariants,[placeholder]:choice}};
}
export interface EquipmentDraft {packageVariants?:Record<string,string>;classPackage:number|null;backgroundPackage:number|null;purchases:Record<string,number>;equipped:{armor?:string;shield?:string;weapons:string[]}}
export const emptyEquipment=():EquipmentDraft=>({classPackage:null,backgroundPackage:null,purchases:{},equipped:{weapons:[]}});
export function inventory(draft:EquipmentDraft,classId:string,backgroundId:string):Record<string,number>{
 const result:Record<string,number>={};
 const add=(items:Record<string,number>)=>{for(const [id,n] of Object.entries(items))result[id]=(result[id]??0)+n;};
 const c=CLASS_PACKAGES[classId]?.[draft.classPackage??-1];const b=BACKGROUND_PACKAGES[backgroundId]?.[draft.backgroundPackage??-1];
 if(c)add(c.items);if(b)add(b.items);
 for(const placeholder of packageVariantIds(draft,classId,backgroundId)){const choice=draft.packageVariants?.[placeholder];if(choice&&EQUIPMENT_VARIANTS[placeholder].includes(choice)&&canonicalById.has(choice)){const count=result[placeholder]??0;if(count){delete result[placeholder];result[choice]=(result[choice]??0)+count;}}}
 add(draft.purchases);
 return result;
}
export function remainingCp(draft:EquipmentDraft,classId:string,backgroundId:string):number{
 const c=CLASS_PACKAGES[classId]?.[draft.classPackage??-1];const b=BACKGROUND_PACKAGES[backgroundId]?.[draft.backgroundPackage??-1];
 const spent=Object.entries(draft.purchases).reduce((sum,[id,n])=>sum+(ITEM_BY_ID[id]?.costCp??0)*n,0);
 return ((c?.gold??0)+(b?.gold??0))*100-spent;
}
export function buy(draft:EquipmentDraft,classId:string,backgroundId:string,id:string):EquipmentDraft{
 const item=ITEM_BY_ID[id];if(!item||draft.classPackage===null||draft.backgroundPackage===null||remainingCp(draft,classId,backgroundId)<item.costCp)return draft;
 return {...draft,purchases:{...draft.purchases,[id]:(draft.purchases[id]??0)+1}};
}
export function weaponTrained(classId:string,item:Item):boolean{
 if(item.category!=='weapon')return false;
 const cls=classSummary(classId);if(!cls)return false;
 if(item.weaponGroup==='simple')return true;
 if(cls.weapons.includes('Martial'))return true;
 if(classId==='rogue')return !!item.properties?.some(p=>p==='Finesse'||p==='Light');
 if(classId==='monk')return !!item.properties?.includes('Light');
 return false;
}
export function armorTrained(classId:string,item:Item):boolean{
 const cls=classSummary(classId);if(!cls)return false;
 return item.category==='shield'?cls.armor.includes('Shields'):item.category==='armor'&&!!item.armorGroup&&cls.armor.includes(item.armorGroup);
}
export function armorClass(draft:EquipmentDraft,classId:string,backgroundId:string,scores:Scores):number{
 const a=ITEM_BY_ID[draft.equipped.armor??''];const shield=ITEM_BY_ID[draft.equipped.shield??''];const dex=modifier(scores.Dex);
 const owned=inventory(draft,classId,backgroundId);
 let ac=a?.category==='armor'&&(owned[a.id]??0)>0?(a.baseAC??10)+Math.min(dex,a.dexCap??99):10+dex;
 if((!a||(owned[a.id]??0)<1)&&classId==='barbarian')ac=10+dex+modifier(scores.Con);
 if((!a||(owned[a.id]??0)<1)&&classId==='monk')ac=10+dex+modifier(scores.Wis);
 if(shield?.category==='shield'&&(owned[shield.id]??0)>0&&armorTrained(classId,shield))ac+=2;
 return ac;
}
export function attackBonus(classId:string,item:Item,scores:Scores):number{
 const ranged=item.properties?.some(p=>p.startsWith('Ammunition'));
 const finesse=item.properties?.includes('Finesse');
 const ability=ranged?modifier(scores.Dex):finesse?Math.max(modifier(scores.Str),modifier(scores.Dex)):modifier(scores.Str);
 return ability+(weaponTrained(classId,item)?2:0);
}
export function equipmentErrors(draft:EquipmentDraft,classId:string,backgroundId:string,_scores:Scores):string[]{
 const errors:string[]=[];
 if(!CLASS_PACKAGES[classId]?.[draft.classPackage??-1])errors.push('Choose class equipment.');
 if(!BACKGROUND_PACKAGES[backgroundId]?.[draft.backgroundPackage??-1])errors.push('Choose background equipment.');
 if(remainingCp(draft,classId,backgroundId)<0)errors.push('Insufficient funds.');
 for(const [placeholder,choice] of Object.entries(draft.packageVariants??{}))if(!packageVariantIds(draft,classId,backgroundId).includes(placeholder)||!EQUIPMENT_VARIANTS[placeholder]?.includes(choice)||!canonicalById.has(choice))errors.push('Invalid equipment variant '+placeholder+'.');
 const owned=inventory(draft,classId,backgroundId);
 for(const [id,n] of Object.entries(owned))if(!ITEM_BY_ID[id]||!Number.isInteger(n)||n<0)errors.push('Invalid inventory item '+id+'.');
 for(const [id,n] of Object.entries(draft.purchases))if(!ITEM_BY_ID[id]||!Number.isInteger(n)||n<0)errors.push('Invalid purchase '+id+'.');
 for(const [id,category] of [[draft.equipped.armor,'armor'],[draft.equipped.shield,'shield']] as const){
  if(!id)continue;const it=ITEM_BY_ID[id];if(!it||(owned[id]??0)<1||it.category!==category)errors.push('Cannot equip unowned '+category+'.');
  else if(!armorTrained(classId,it))errors.push('No training for '+it.name+'.');
 }
 if(draft.equipped.weapons.length>2)errors.push('Equip no more than two weapons.');
 for(const id of draft.equipped.weapons){const it=ITEM_BY_ID[id];if(!it||(owned[id]??0)<draft.equipped.weapons.filter(x=>x===id).length||it.category!=='weapon')errors.push('Cannot equip unowned weapon '+id+'.');else if(!weaponTrained(classId,it))errors.push('No proficiency with '+it.name+'.');}
 return errors;
}
export function carryingWeight(draft:EquipmentDraft,classId:string,backgroundId:string):number{return Object.entries(inventory(draft,classId,backgroundId)).reduce((sum,[id,n])=>sum+(ITEM_BY_ID[id]?.weight??0)*n,0);}
export function carryingCapacity(scores:Scores):number{return 15*scores.Str;}
