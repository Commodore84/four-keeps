import {describe,it,expect} from 'vitest';
import {emptyForecast,updateLevelPlan,setWizardPreparedSpells,plannedLevel} from './creationForecast';
import {wizardSpellbookAtLevel,wizardPreparationWarnings,changeWizardPreparation,wizardPreparedAtLevel,wizardForecastPreparationWarnings} from './creationWizardPreparation';
describe('Wizard spellbook and preparation are separate',()=>{
 it('carries preparation forward without automatically preparing newly acquired spellbook entries',()=>{
  let forecast=setWizardPreparedSpells(emptyForecast(),3,['shield']);
  forecast=updateLevelPlan(forecast,4,{plannedSpellIds:['magic-missile']});
  expect(wizardPreparedAtLevel(['find-familiar'],forecast,4)).toEqual(['shield']);
  expect(wizardSpellbookAtLevel(['shield'],forecast,4)).toContain('magic-missile');
  forecast=setWizardPreparedSpells(forecast,5,['magic-missile']);
  expect(wizardPreparedAtLevel(['find-familiar'],forecast,5)).toEqual(['magic-missile']);
  expect(wizardPreparedAtLevel(['find-familiar'],forecast,4)).toEqual(['shield']);
  expect(wizardForecastPreparationWarnings(['shield'],['shield'],forecast)).toEqual([]);
 });

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