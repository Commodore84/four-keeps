import {ADDITIONAL_MAGIC_ITEM_DEFINITIONS} from './magicItemDefinitionsAdditional';
import {MAGIC_ITEM_DEFINITIONS,type MagicItemMechanics} from './magicItemDefinitions';
import catalog from './magicItemCatalog.json';
import dmg1 from './dmg2024MagicItems1.json';
import dmg2 from './dmg2024MagicItems2.json';
import dmg3 from './dmg2024MagicItems3.json';
import dmg4 from './dmg2024MagicItems4.json';
import dmg5 from './dmg2024MagicItems5.json';
import dmg6 from './dmg2024MagicItems6.json';
import dmg7 from './dmg2024MagicItems7.json';
import dmg8 from './dmg2024MagicItems8.json';
// Rights metadata is descriptive, not a runtime access control or a legal clearance.
export type ContentRights = 'srd-5.2.1' | 'non-srd' | 'original';
export type ContentProvenance = {
  source: string;
  rights: ContentRights;
  license: string | null;
};
export type MagicItem = (typeof catalog)[number] & ContentProvenance & { mechanics?: MagicItemMechanics };
const srdProvenance: ContentProvenance = {
  source: 'SRD 5.2.1',
  rights: 'srd-5.2.1',
  license: 'CC BY 4.0',
};
const dmgProvenance: ContentProvenance = {
  source: '2024 Dungeon Master’s Guide',
  rights: 'non-srd',
  license: null,
};
// Some items in the DMG import are also explicitly present in SRD 5.2.1.
const srdOverlap = new Set(['Gloves of Thievery','Hat of Many Spells']);
/** Concrete DMG variants override abbreviated import summaries with rules-based effects. */
const VARIANT_DESCRIPTIONS:Record<string,string>={
 ...Object.fromEntries([['hill',21],['frost',23],['stone',23],['fire',25],['cloud',27],['storm',29]].map(([giant,score])=>['dmg24-belt-of-'+giant+'-giant-strength','While wearing this belt, your Strength score becomes '+score+'. The belt has no effect if your unmodified Strength is already equal to or greater than '+score+'.'])),
 ...Object.fromEntries([['hill',21],['frost',23],['stone',23],['fire',25],['cloud',27],['storm',29]].map(([giant,score])=>['dmg24-potion-of-'+giant+'-giant-strength','Drink this potion to set your Strength score to '+score+' for 1 hour. It has no effect if your Strength is already equal to or greater than '+score+'. Single-use consumable.'])),
 'dmg24-potion-of-healing':'Drink this potion to regain 2d4 + 2 Hit Points. Single-use consumable.',
 'dmg24-potion-of-greater-healing':'Drink this potion to regain 4d4 + 4 Hit Points. Single-use consumable.',
 'dmg24-potion-of-superior-healing':'Drink this potion to regain 8d4 + 8 Hit Points. Single-use consumable.',
 'dmg24-potion-of-supreme-healing':'Drink this potion to regain 10d4 + 20 Hit Points. Single-use consumable.',
};
const withDefinition = <T extends {id:string;description:string}>(item:T) => {
  const mechanics=ADDITIONAL_MAGIC_ITEM_DEFINITIONS[item.id] ?? MAGIC_ITEM_DEFINITIONS[item.id];
  return {...item,description:VARIANT_DESCRIPTIONS[item.id]??mechanics?.summary??item.description,...(mechanics?{mechanics}:{})};
};
export const MAGIC_ITEMS: MagicItem[] = [
  ...catalog.map(item => ({...withDefinition(item),...srdProvenance})),
  ...[...dmg1,...dmg2,...dmg3,...dmg4,...dmg5,...dmg6,...dmg7,...dmg8].map(item => ({...withDefinition(item),...(srdOverlap.has(item.name)?srdProvenance:dmgProvenance)})),
];
/** Catalog references with more than one rarity are never concrete inventory products. */
export const isConcreteMagicItem=(item:MagicItem):boolean=>!item.rarity.includes(',')&&!item.rarity.includes('Varies');
export const MAGIC_ITEM_PRODUCTS=MAGIC_ITEMS.filter(isConcreteMagicItem);
const selectableIds=new Set(MAGIC_ITEM_PRODUCTS.map(item=>item.id));
const prefix = 'four-keeps-magic-wishlist:';
export function readMagicWishlist(campaignId:string):string[] {
  if (!campaignId) return [];
  try {
    const value:unknown=JSON.parse(localStorage.getItem(prefix+campaignId)??'[]');
    return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&selectableIds.has(id)))]:[];
  } catch {return [];}
}
export function writeMagicWishlist(campaignId:string,ids:string[]):void {
  if(!campaignId)return;
  localStorage.setItem(prefix+campaignId,JSON.stringify([...new Set(ids)].filter(id=>selectableIds.has(id))));
}
export function magicWishlistNames(campaignId:string):string[] {
  const wanted=new Set(readMagicWishlist(campaignId));
  return MAGIC_ITEMS.filter(item=>wanted.has(item.id)).map(item=>item.name);
}
