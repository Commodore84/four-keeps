import {describe,it,expect} from 'vitest';
import {LAND_CIRCLE_SPELLS,landCirclePreparedSpells} from './creationSubclassSpells';
describe('2024 Circle of the Land terrain preparation',()=>{
 it('requires a terrain choice and unlocks at Druid levels 3,5,7,9',()=>{
  expect(landCirclePreparedSpells(undefined,20)).toEqual([]);
  expect(landCirclePreparedSpells('arid',2)).toEqual([]);
  for(const terrain of Object.keys(LAND_CIRCLE_SPELLS)){
   expect(landCirclePreparedSpells(terrain,3)).toHaveLength(3);
   expect(landCirclePreparedSpells(terrain,5)).toHaveLength(4);
   expect(landCirclePreparedSpells(terrain,7)).toHaveLength(5);
   expect(landCirclePreparedSpells(terrain,9)).toHaveLength(6);
  }
 });
 it('changing terrain replaces the entire circle spell list, including the cantrip',()=>{
  const arid=landCirclePreparedSpells('arid',9);
  const polar=landCirclePreparedSpells('polar',9);
  expect(arid).toContain('Fire Bolt');
  expect(polar).toContain('Ray of Frost');
  expect(polar).not.toContain('Fire Bolt');
 });
});
