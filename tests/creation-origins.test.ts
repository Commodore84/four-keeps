import {describe,it,expect} from 'vitest';
import {SPECIES,BACKGROUNDS,availableSpecies,availableBackgrounds,validateOrigins,originBenefits} from '../src/game/creationOrigins';
describe('2024 origins catalog',()=>{
 it('includes ten distinct core species and sixteen distinct core backgrounds',()=>{
  expect(SPECIES).toHaveLength(10);expect(BACKGROUNDS).toHaveLength(16);
  expect(new Set(SPECIES.map(s=>s.id)).size).toBe(10);
  expect(new Set(BACKGROUNDS.map(b=>b.id)).size).toBe(16);
  expect([...SPECIES,...BACKGROUNDS].every(x=>x.source==='PHB2024')).toBe(true);
 });
 it('provides required mechanics for all entries',()=>{
  for(const s of SPECIES){expect(s.speed).toBeGreaterThan(0);expect(s.traits.length).toBeGreaterThan(0);}
  for(const b of BACKGROUNDS){expect(b.abilities).toHaveLength(3);expect(b.skills).toHaveLength(2);expect(b.feat).toBeTruthy();expect(b.tool).toBeTruthy();expect(b.equipment).toBeTruthy();}
 });
 it('requires a valid lineage for wood elves and supports other species',()=>{
  expect(validateOrigins({speciesId:'elf',backgroundId:'sage'},true)).toContain('Choose a lineage.');
  expect(validateOrigins({speciesId:'elf',lineageId:'wood-elf',backgroundId:'sage'},true)).toEqual([]);
  expect(validateOrigins({speciesId:'human',backgroundId:'wayfarer'},false)).toEqual([]);
  expect(validateOrigins({speciesId:'elf',lineageId:'invalid',backgroundId:'sage'},true)).toContain('Choose a lineage.');
 });
 it('does not silently accept unsupported legacy options',()=>{
  expect(validateOrigins({speciesId:'legacy-homebrew',backgroundId:'sage'},true)).toContain('Choose a supported species.');
  expect(availableSpecies(true)).toHaveLength(10);
  expect(availableBackgrounds(true)).toHaveLength(16);
 });
 it('derives wood elf and sage traits from selected data',()=>{
  const b=originBenefits({speciesId:'elf',lineageId:'wood-elf',backgroundId:'sage'},true);
  expect(b.speed).toBe(35);expect(b.originFeat).toBe('Magic Initiate (Wizard)');
  expect(b.skills).toEqual(['Arcana','History']);
  expect(b.traits).toContain('Druidcraft (level 1)');
 });
});
