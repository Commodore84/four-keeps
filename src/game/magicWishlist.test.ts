import {beforeEach,describe,expect,it,vi} from 'vitest';
import {MAGIC_ITEMS,readMagicWishlist,writeMagicWishlist,magicWishlistNames} from './magicWishlist';
const storage=new Map<string,string>();
beforeEach(()=>{storage.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v)}});});
describe('magic item wish list',()=>{
 it('includes the full licensed 2024 SRD magic item list',()=>{expect(MAGIC_ITEMS.length).toBeGreaterThan(500);expect(MAGIC_ITEMS.some(x=>x.name==='Bag of Holding')).toBe(true);expect(MAGIC_ITEMS.some(x=>x.name==='Hat of Many Spells')).toBe(true);expect(MAGIC_ITEMS.some(x=>x.name==='Baba Yaga’s Dancing Broom'||x.name==="Baba Yaga's Dancing Broom")).toBe(true);});
 it('saves only known item ids without duplicates',()=>{const id=MAGIC_ITEMS[0].id;writeMagicWishlist('campaign-a',[id,id,'not-an-item']);expect(readMagicWishlist('campaign-a')).toEqual([id]);expect(magicWishlistNames('campaign-a')).toEqual([MAGIC_ITEMS[0].name]);});
 it('isolates separate campaigns',()=>{writeMagicWishlist('one',[MAGIC_ITEMS[0].id]);expect(readMagicWishlist('two')).toEqual([]);});
 it('ignores corrupt storage',()=>{storage.set('four-keeps-magic-wishlist:broken','{');expect(readMagicWishlist('broken')).toEqual([]);});
});
