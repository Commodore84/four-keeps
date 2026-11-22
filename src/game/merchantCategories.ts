import {equipmentPackContents} from './equipmentPacks';
import type {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';
type Item=(typeof OFFICIAL_EQUIPMENT_2024)[number];

/** One-level navigation, shared across merchants; only stocked categories render. */
export function merchantCategory(item:Item):string {
 const n=item.name.toLowerCase(),c=item.category.toLowerCase();
 if(equipmentPackContents(item.id))return 'Equipment packs';
 if(c==='ammunition')return 'Ammunition';
 if(c==='weapon'){
  if(/musket|pistol/.test(n))return 'Firearms';
  if(/crossbow|bow|sling|blowgun|dart|net|javelin/.test(n))return 'Ranged weapons';
  if(/great|glaive|halberd|pike|lance|maul|warhammer|battleaxe|greataxe|flail|morningstar|trident/.test(n))return 'Martial melee weapons';
  return 'Simple melee weapons';
 }
 if(c==='shield')return 'Shields';
 if(c==='armor')return /padded|leather|studded/.test(n)?'Light armor':/hide|chain shirt|scale mail|breastplate|half plate/.test(n)?'Medium armor':'Heavy armor';
 if(/spell scroll/.test(n))return 'Spell scrolls';
 if(/arcane focus|druidic focus|holy symbol|component pouch/.test(n))return 'Spellcasting equipment';
 if(/potion|antitoxin|acid|alchemist.s fire|holy water|poison, basic/.test(n))return 'Potions and alchemy';
 if(/rations|waterskin|\bwine\b|^ale$/.test(n))return 'Food and provisions';
 if(/torch|candle|lantern|lamp|tinderbox|^oil$/.test(n))return 'Lighting and fire';
 if(/rope|grappling hook|climber|piton|ladder|block and tackle/.test(n))return 'Climbing and rope';
 if(/tent|bedroll|blanket/.test(n))return 'Camping and travel';
 if(/backpack|pouch|sack|chest|barrel|basket|bottle|case|flask|vial|bucket|jug|quiver/.test(n))return 'Containers';
 if(/musical instrument/.test(n))return 'Musical instruments';
 if(/gaming set/.test(n))return 'Gaming sets';
 if(/supplies|tools|kit|utensils/.test(n)||c==='tool')return /herbal|healer|poison|disguise|forgery|thieves|navigator/.test(n)?'Specialist kits':'Artisan tools';
 if(/ball bearing|caltrop|trap|manacles|chain|lock/.test(n))return 'Traps and restraints';
 if(/ink|paper|parchment|book|pen|chalk|map|scroll/.test(n))return 'Writing and navigation';
 if(/magnifying|spyglass|mirror|signal whistle|bell/.test(n))return 'Observation and signals';
 if(/clothes|costume|robe|perfume/.test(n))return 'Clothing and personal';
 return 'General supplies';
}
