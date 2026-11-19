import catalog from './magicItemCatalog.json';
import dmg1 from './dmg2024MagicItems1.json';
import dmg2 from './dmg2024MagicItems2.json';
import dmg3 from './dmg2024MagicItems3.json';
import dmg4 from './dmg2024MagicItems4.json';
import dmg5 from './dmg2024MagicItems5.json';
import dmg6 from './dmg2024MagicItems6.json';
import dmg7 from './dmg2024MagicItems7.json';
import dmg8 from './dmg2024MagicItems8.json';
export type MagicItem = (typeof catalog)[number];
export const MAGIC_ITEMS: MagicItem[] = [...catalog,...dmg1,...dmg2,...dmg3,...dmg4,...dmg5,...dmg6,...dmg7,...dmg8];
const prefix = 'four-keeps-magic-wishlist:';
export function readMagicWishlist(campaignId:string):string[] {
  if (!campaignId) return [];
  try {
    const value:unknown=JSON.parse(localStorage.getItem(prefix+campaignId)??'[]');
    return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&MAGIC_ITEMS.some(item=>item.id===id)))]:[];
  } catch {return [];}
}
export function writeMagicWishlist(campaignId:string,ids:string[]):void {
  if(!campaignId)return;
  localStorage.setItem(prefix+campaignId,JSON.stringify([...new Set(ids)].filter(id=>MAGIC_ITEMS.some(item=>item.id===id))));
}
export function magicWishlistNames(campaignId:string):string[] {
  const wanted=new Set(readMagicWishlist(campaignId));
  return MAGIC_ITEMS.filter(item=>wanted.has(item.id)).map(item=>item.name);
}
