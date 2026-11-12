import { describe, expect, it } from 'vitest';
import { createCharacterDraft, validateIdentity, CREATION_STEPS } from '../src/app/CharacterCreator';
describe('independent character creation drafts',()=>{
  it('starts as an unattached 2024 draft with legacy compatibility enabled',()=>{
    const draft=createCharacterDraft();
    expect(draft.status).toBe('draft');
    expect(draft.rules).toEqual({edition:'2024',allowCompatibleLegacy:true});
    expect(draft.step).toBe('class');
    expect(draft.selections).toEqual({});
    expect(draft.id).toBeTruthy();
  });
  it('requires a nonblank character name',()=>{
    const draft=createCharacterDraft();
    expect(validateIdentity(draft)).toContain('Character name is required.');
    draft.identity.name=' Nighthawk ';
    expect(validateIdentity(draft)).toEqual([]);
  });
  it('has unique navigable creation sections',()=>{
    expect(CREATION_STEPS.map(step=>step.id)).toEqual(['class','origins','abilities','equipment','spells','identity','forecast','review']);
  });
});
