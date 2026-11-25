import {describe,it,expect} from 'vitest';
import type {Campaign} from './campaign';
import {castOwnedSpellScroll,scrollTier} from './spellScrolls';
const base=()=>({
 id:'scroll-campaign',journal:[],characterIdentity:{name:'Sage',speciesId:'human',backgroundId:'sage',classId:'wizard',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},
 character:{cantrips:['Mage Hand'],preparedSpells:['Magic Missile']},
 inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Spell Scroll (Level 1)',quantity:2},{name:'Spell Scroll (Cantrip)',quantity:1}]}
} as unknown as Campaign);
const req={itemName:'Spell Scroll (Level 1)',spell:'Magic Missile',requestId:'scroll-1',dmConfirmed:true};
describe('DM-confirmed scroll consumption',()=>{
 it('identifies only canonical tiers',()=>{expect(scrollTier('Spell Scroll (Cantrip)')).toBe(0);expect(scrollTier('Spell Scroll (Level 9)')).toBe(9);expect(scrollTier('Spell Scroll (Level 0)')).toBeNull()});
 it('consumes one owned scroll, leaves spell slots unchanged and records pending effect',()=>{
  const c=base();const n=castOwnedSpellScroll(c,req);
  expect(n.inventoryLedger?.gear[0].quantity).toBe(1);
  expect(n.spellEffects?.[0]).toMatchObject({id:'scroll-1',spell:'Magic Missile',status:'awaiting-adjudication'});
  expect(n.journal.at(-1)?.text).toContain('DM-confirmed');
  expect(c.inventoryLedger?.gear[0].quantity).toBe(2);
  expect(()=>castOwnedSpellScroll(n,req)).toThrow('already completed');
 });
 it('rejects unconfirmed, unowned, wrong class, unknown spell and combat',()=>{
  expect(()=>castOwnedSpellScroll(base(),{...req,dmConfirmed:false})).toThrow('DM confirmation');
  expect(()=>castOwnedSpellScroll(base(),{...req,spell:'Wish'})).toThrow('not verified');
  expect(()=>castOwnedSpellScroll(base(),{...req,itemName:'Spell Scroll (Level 3)'})).toThrow('not owned');
  const noncaster=base();noncaster.characterIdentity!.classId='fighter';
  expect(()=>castOwnedSpellScroll(noncaster,req)).toThrow('spellcasting class');
  const combat=base();combat.companionEncounter={status:'active'} as Campaign['companionEncounter'];
  expect(()=>castOwnedSpellScroll(combat,req)).toThrow('Combat');
 });
});
