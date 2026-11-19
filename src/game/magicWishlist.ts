import catalog from './magicItemCatalog.json';
export type MagicItem = (typeof catalog)[number];
export const MAGIC_ITEMS: MagicItem[] = catalog;
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
