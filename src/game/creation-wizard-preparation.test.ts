import {describe,it,expect} from 'vitest';
import {emptyForecast,updateLevelPlan,setWizardPreparedSpells,plannedLevel} from './creationForecast';
import {wizardSpellbookAtLevel,wizardPreparationWarnings,changeWizardPreparation} from './creationWizardPreparation';
describe('Wizard spellbook and preparation are separate',()=>{
 it('stores preparation snapshots independently at each level',()=>{
  const first=setWizardPreparedSpells(emptyForecast(),3,['shield','magic-missile','shield']);
  expect(plannedLevel(first,3).wizardPreparedSpellIds).toEqual(['shield','magic-missile']);
  const second=setWizardPreparedSpells(first,4,['shield']);
  expect(plannedLevel(second,3).wizardPreparedSpellIds).toEqual(['shield','magic-missile']);
  expect(plannedLevel(second,4).wizardPreparedSpellIds).toEqual(['shield']);
  expect(plannedLevel(emptyForecast(),3).wizardPreparedSpellIds).toBeUndefined();
 });

 it('accumulates spellbook additions only after their planned level',()=>{
  const forecast=updateLevelPlan(emptyForecast(),3,{plannedSpellIds:['magic-missile','shield']});
  expect(wizardSpellbookAtLevel(['find-familiar'],forecast,2)).toEqual(['find-familiar']);
  expect(wizardSpellbookAtLevel(['find-familiar'],forecast,3)).toEqual(['find-familiar','magic-missile','shield']);
 });
 it('only prepares owned Wizard spells, without duplicates or cantrips',()=>{
  expect(wizardPreparationWarnings(['shield'],['shield'],3)).toEqual([]);
  expect(wizardPreparationWarnings(['shield'],['magic-missile'],3)[0]).toContain('spellbook');
  expect(wizardPreparationWarnings(['shield'],['shield','shield'],3)[0]).toContain('unique');
  expect(wizardPreparationWarnings(['shield'],['fire-bolt'],3)[0]).toContain('spellbook');
 });
 it('changes preparation without removing a spell from the spellbook',()=>{
  const book=['shield','magic-missile'];
  const next=changeWizardPreparation(book,['shield'],'shield','magic-missile',3);
  expect(next).toEqual(['magic-missile']);
  expect(book).toEqual(['shield','magic-missile']);
  expect(changeWizardPreparation(book,next,'magic-missile','not-a-spell',3)).toEqual(next);
 });
});