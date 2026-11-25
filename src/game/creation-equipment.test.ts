import {describe,it,expect} from 'vitest';
import {ITEMS,ITEM_BY_ID,CLASS_PACKAGES,BACKGROUND_PACKAGES,emptyEquipment,inventory,remainingCp,buy,armorClass,attackBonus,weaponTrained,armorTrained,equipmentErrors,carryingWeight,carryingCapacity,EQUIPMENT_VARIANTS,packageVariantIds,selectEquipmentVariant,defaultPackageVariants} from './creationEquipment';
const scores={Str:15,Dex:16,Con:14,Int:12,Wis:13,Cha:8};
describe('official 2024 equipment variants and saved-game compatibility',()=>{
 it('replaces only selected generic package entries with official IDs and preserves their quantities',()=>{
  const original={...emptyEquipment(),classPackage:0,backgroundPackage:0};
  expect(inventory(original,'bard','entertainer')['musical-instrument']).toBe(2);
  expect(packageVariantIds(original,'bard','entertainer')).toContain('musical-instrument');
  const choice=selectEquipmentVariant(original,'bard','entertainer','musical-instrument','musical-instrument-lute');
  expect(inventory(choice,'bard','entertainer')['musical-instrument']).toBeUndefined();
  expect(inventory(choice,'bard','entertainer')['musical-instrument-lute']).toBe(2);
  expect(remainingCp(choice,'bard','entertainer')).toBe(remainingCp(original,'bard','entertainer'));
  expect(inventory(JSON.parse(JSON.stringify(choice)),'bard','entertainer')).toEqual(inventory(choice,'bard','entertainer'));
 });
 it('defaults new package selections to official variants while keeping historical saves untouched',()=>{
  const old={...emptyEquipment(),classPackage:0,backgroundPackage:0};
  expect(inventory(old,'cleric','acolyte')['holy-symbol']).toBe(2);
  const fresh={...old,packageVariants:defaultPackageVariants(old,'cleric','acolyte')};
  expect(inventory(fresh,'cleric','acolyte')['holy-symbol']).toBeUndefined();
  expect(Object.keys(inventory(fresh,'cleric','acolyte')).some(id=>id.startsWith('holy-symbol-'))).toBe(true);
  expect(EQUIPMENT_VARIANTS['gaming-set']).toContain('gaming-set-dice');
  expect(()=>selectEquipmentVariant(old,'cleric','acolyte','holy-symbol','greatsword')).toThrow();
 });
});
describe('2024 starting equipment',()=>{
 it('has all 12 classes and 16 backgrounds with a gold alternative',()=>{
  expect(Object.keys(CLASS_PACKAGES)).toHaveLength(12);expect(Object.keys(BACKGROUND_PACKAGES)).toHaveLength(17);
  for(const packages of Object.values(CLASS_PACKAGES))expect(packages.at(-1)?.items).toEqual({});
  for(const [id,packages] of Object.entries(BACKGROUND_PACKAGES))expect(packages[id==='custom'?0:1]?.gold).toBe(50);
 });
 it('resolves every item in starting packages',()=>{
  for(const packages of [...Object.values(CLASS_PACKAGES),...Object.values(BACKGROUND_PACKAGES)])for(const p of packages)for(const id of Object.keys(p.items))expect(ITEM_BY_ID[id],id).toBeDefined();
 });
 it('has unique catalog ids and all weapon and armor prices',()=>{
  expect(new Set(ITEMS.map(i=>i.id)).size).toBe(ITEMS.length);
  expect(ITEM_BY_ID['shortbow'].costCp).toBe(2500);
  expect(ITEM_BY_ID['dagger'].mastery).toBe('Nick');
  expect(ITEM_BY_ID['chain-mail'].baseAC).toBe(16);
 });
 it('keeps class and background packages independent and combines currency',()=>{
  const draft={...emptyEquipment(),classPackage:0,backgroundPackage:0};
  const items=inventory(draft,'rogue','criminal');
  expect(items['dagger']).toBe(4);expect(items['shortbow']).toBe(1);
  expect(remainingCp(draft,'rogue','criminal')).toBe(2400);
 });
 it('rejects overspending and preserves funds when buying fails',()=>{
  const draft={...emptyEquipment(),classPackage:1,backgroundPackage:1};
  const purchased=buy(draft,'rogue','sage','shortbow');
  expect(remainingCp(purchased,'rogue','sage')).toBe(12500);
  expect(inventory(purchased,'rogue','sage')['shortbow']).toBe(1);
  expect(buy(draft,'rogue','sage','plate-armor')).toBe(draft);
 });
 it('separates owned from equipped and calculates AC',()=>{
  const draft={...emptyEquipment(),classPackage:0,backgroundPackage:0};
  expect(armorClass(draft,'rogue','criminal',scores)).toBe(13);
  const wearing={...draft,equipped:{weapons:['shortbow'],armor:'leather-armor'}};
  expect(armorClass(wearing,'rogue','criminal',scores)).toBe(14);
  expect(equipmentErrors(wearing,'rogue','criminal',scores)).toEqual([]);
  expect(attackBonus('rogue',ITEM_BY_ID['shortbow'],scores)).toBe(5);
 });
 it('checks training and armor requirements',()=>{
  expect(weaponTrained('rogue',ITEM_BY_ID['greatsword'])).toBe(false);
  expect(weaponTrained('fighter',ITEM_BY_ID['greatsword'])).toBe(true);
  expect(armorTrained('wizard',ITEM_BY_ID['shield'])).toBe(false);
  const draft={...emptyEquipment(),classPackage:1,backgroundPackage:1,equipped:{weapons:[],armor:'chain-mail'}};
  expect(equipmentErrors(draft,'wizard','sage',scores).some(e=>e.includes('unowned'))).toBe(true);
 });
 it('tracks weight and carrying capacity',()=>{
  const draft={...emptyEquipment(),classPackage:0,backgroundPackage:0};
  expect(carryingWeight(draft,'rogue','criminal')).toBeGreaterThan(0);
  expect(carryingCapacity(scores)).toBe(225);
 });
});
