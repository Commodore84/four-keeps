import {describe,it,expect} from 'vitest';
import {createCharacterDraft} from '../app/CharacterCreator';
import {reviewCharacter,reviewErrors} from './creationReview';
describe('character review',()=>{
 it('rejects an empty draft without throwing',()=>{const d=createCharacterDraft();expect(reviewErrors(d).length).toBeGreaterThan(3);expect(reviewCharacter(d).errors.length).toBeGreaterThan(3)});
 it('includes identity, class, scores and origin features in a partial review',()=>{const d=createCharacterDraft();d.identity.name='Nighthawk';d.selections.speciesId='elf';d.selections.lineageId='wood-elf';d.selections.backgroundId='sage';d.selections.classId='rogue';const result=reviewCharacter(d);expect(result.name).toBe('Nighthawk');expect(result.origins.speed).toBe(35);expect(result.className).toBe('Rogue');expect(result.level).toBe(1);expect(result.scores).toHaveLength(6);expect(result.errors.length).toBeGreaterThan(0)});
});
