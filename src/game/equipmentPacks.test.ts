import {describe,it,expect} from 'vitest';
import {equipmentPackContents,equipmentPackIndividualValue} from './equipmentPacks';
import {OFFICIAL_EQUIPMENT_2024} from './officialEquipment2024';
describe('official equipment bundles',()=>{
 it('resolves every component to the authoritative catalog',()=>{
  for(const pack of OFFICIAL_EQUIPMENT_2024.filter(item=>/’s Pack$/.test(item.name))){
   const contents=equipmentPackContents(pack.id);
   expect(contents,pack.name).not.toBeNull();
   expect(contents!.every(({quantity})=>Number.isInteger(quantity)&&quantity>0)).toBe(true);
   expect(equipmentPackIndividualValue(pack.id)).toBeGreaterThan(0);
  }
 });
 it('does not unpack a normal backpack or other equipment',()=>expect(equipmentPackContents('backpack')).toBeNull());
});
