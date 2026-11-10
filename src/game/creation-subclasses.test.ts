import {describe,it,expect} from 'vitest';
import {CLASSES} from './creationClasses';
import {SUBCLASSES,subclassesForClass} from './creationSubclasses';
describe('2024 subclass planning reference',()=>{
 it('lists exactly four unique subclasses for every core class',()=>{expect(SUBCLASSES).toHaveLength(48);expect(new Set(SUBCLASSES.map(s=>s.id)).size).toBe(48);for(const cls of CLASSES){const options=subclassesForClass(cls.id);expect(options,cls.name).toHaveLength(4);for(const subclass of options){expect(subclass.unlockLevel).toBe(3);expect(subclass.description.length,subclass.name).toBeGreaterThan(110);expect(subclass.focus.length).toBeGreaterThan(10);expect(subclass.source).toBe('PHB2024')}}});
 it('includes iconic subclass options for previously built characters',()=>{expect(subclassesForClass('rogue').map(x=>x.name)).toContain('Arcane Trickster');expect(subclassesForClass('warlock').map(x=>x.name)).toContain('Great Old One');expect(subclassesForClass('wizard').map(x=>x.name)).toContain('Diviner')});
});
