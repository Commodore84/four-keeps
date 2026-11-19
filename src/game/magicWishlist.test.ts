import {beforeEach,describe,expect,it,vi} from 'vitest';
import {MAGIC_ITEMS,readMagicWishlist,writeMagicWishlist,magicWishlistNames} from './magicWishlist';
const storage=new Map<string,string>();
beforeEach(()=>{storage.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v)}});});
describe('magic item wish list',()=>{
 it('includes SRD and additional 2024 DMG magic items',()=>{expect(MAGIC_ITEMS.length).toBeGreaterThan(500);expect(MAGIC_ITEMS.some(x=>x.name==='Bag of Holding')).toBe(true);expect(MAGIC_ITEMS.some(x=>x.name==='Hat of Many Spells')).toBe(true);expect(MAGIC_ITEMS.some(x=>x.name==='Baba Yaga’s Dancing Broom'||x.name==="Baba Yaga's Dancing Broom")).toBe(true);});
 it('tracks rights provenance without restricting gameplay',()=>{
  const srd=MAGIC_ITEMS.find(x=>x.name==='Bag of Holding');
  const dmg=MAGIC_ITEMS.find(x=>x.name==='+1 Rod of the Pact Keeper');
  expect(srd).toMatchObject({source:'SRD 5.2.1',rights:'srd-5.2.1',license:'CC BY 4.0'});
  expect(dmg).toMatchObject({source:'2024 Dungeon Master’s Guide',rights:'non-srd',license:null});
  expect(MAGIC_ITEMS.every(x=>Boolean(x.source)&&Boolean(x.rights))).toBe(true);
  writeMagicWishlist('rights-test',[srd!.id,dmg!.id]);
  expect(readMagicWishlist('rights-test')).toEqual([srd!.id,dmg!.id]);
 });
 it('provides structured, rights-tagged mechanics for the curated batch',()=>{
  const detailed=MAGIC_ITEMS.filter(item=>item.mechanics);
  expect(detailed).toHaveLength(35);
  expect(detailed.every(item=>item.description===item.mechanics!.summary)).toBe(true);
  const wand=MAGIC_ITEMS.find(item=>item.id==='wand-of-magic-missiles')!;
  expect(wand.mechanics?.charges).toEqual({maximum:7,maximumPerUse:3,cost:'1 charge per spell level'});
  const warlock=MAGIC_ITEMS.find(item=>item.id==='dmg24-2-rod-of-the-pact-keeper')!;
  expect(warlock.rights).toBe('non-srd');
  expect(warlock.mechanics?.bonuses).toContainEqual({target:'warlock-spell-save-dc',amount:2});
  expect(warlock.mechanics?.attunementRequirement).toBe('Warlock');
  expect(MAGIC_ITEMS.find(x=>x.id==='dagger-of-venom')?.mechanics?.bonuses).toContainEqual({target:'weapon-attack-rolls',amount:1});
  expect(MAGIC_ITEMS.find(x=>x.id==='potion-of-invisibility')?.mechanics?.limitations).toContain('Single-use consumable; ends early on attack, damage, or spellcasting.');
  expect(MAGIC_ITEMS.find(x=>x.id==='armor-3')?.mechanics?.bonuses).toContainEqual({target:'armor-class',amount:3});
  expect(MAGIC_ITEMS.find(x=>x.id==='dmg24-boots-of-false-tracks')?.mechanics?.verification).toBe('needs-official-review');
  expect(MAGIC_ITEMS.find(x=>x.id==='bag-of-holding')?.mechanics?.verification).toBe('verified-srd');
  expect(MAGIC_ITEMS.find(x=>x.name==='Gloves of Thievery')?.rights).toBe('srd-5.2.1');
  expect(MAGIC_ITEMS.find(x=>x.name==='Hat of Many Spells')?.rights).toBe('srd-5.2.1');
  expect(MAGIC_ITEMS).toHaveLength(511);
 });
 it('saves only known item ids without duplicates',()=>{const id=MAGIC_ITEMS[0].id;writeMagicWishlist('campaign-a',[id,id,'not-an-item']);expect(readMagicWishlist('campaign-a')).toEqual([id]);expect(magicWishlistNames('campaign-a')).toEqual([MAGIC_ITEMS[0].name]);});
 it('isolates separate campaigns',()=>{writeMagicWishlist('one',[MAGIC_ITEMS[0].id]);expect(readMagicWishlist('two')).toEqual([]);});
 it('ignores corrupt storage',()=>{storage.set('four-keeps-magic-wishlist:broken','{');expect(readMagicWishlist('broken')).toEqual([]);});
});
