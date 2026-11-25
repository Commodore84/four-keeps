import {describe,it,expect} from 'vitest';
import {SPELLS} from './creationMagic';
import {spellInfo} from './creationSpellInfo';
import {fullSpellInfo} from './creationFullSpellInfo';
describe('spell selection descriptions',()=>{
 it('has a readable, specific description for every spell',()=>{for(const spell of SPELLS){const info=fullSpellInfo(spell,spellInfo(spell));expect(info.description,spell.name).not.toContain('not yet available');expect(info.description.length,spell.name).toBeGreaterThan(55);expect(info.classes.length).toBeGreaterThan(2);expect(info.kind).toBe(spell.level===0?'Cantrip':'Level 1 spell')}});
 it('labels attacks, saves, damage, and concentration only where relevant',()=>{const get=(id:string)=>{const s=SPELLS.find(x=>x.id===id)!;return fullSpellInfo(s,spellInfo(s))};expect(get('fire-bolt').resolution).toBe('Spell attack');expect(get('fire-bolt').damage).toBe('Fire');expect(get('mage-hand').damage).toBe('');expect(get('hex').concentration).toBe(true);expect(get('magic-missile').concentration).toBe(false)});
});
