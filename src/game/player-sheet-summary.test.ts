import {describe,it,expect} from 'vitest';
import {createCharacterDraft} from '../app/CharacterCreator';
import {campaignFromCharacterDraft} from './characterImport';
import {playerSheetSummary} from './playerSheetSummary';
import {newCampaign} from './campaign';

function rogue(){
 const d=createCharacterDraft();d.identity.name='Raven';d.identity.backstory='A scholar from the borderlands';
 d.selections.speciesId='elf';d.selections.lineageId='wood-elf';d.selections.backgroundId='criminal';d.selections.classId='rogue';d.selections.toolReplacement='Herbalism Kit';
 d.selections.classChoices={'class-skills':['Perception','Acrobatics','Investigation','Deception'],'expertise':['Perception','Acrobatics'],'weapon-mastery':['Dagger','Shortbow']};
 d.selections.abilities={method:'standard',base:{Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Dex:2,Int:1},rolls:[],rollDice:[]};
 d.selections.equipment={classPackage:0,backgroundPackage:0,purchases:{},equipped:{weapons:[]}};
 return campaignFromCharacterDraft(d,'Raven adventure');
}
describe('authoritative Player sheet summary',()=>{
 it('uses imported origin tool replacement without granting duplicate tool proficiency',()=>{
  const c=rogue(),s=playerSheetSummary(c)!;
  expect(s.tools).toContain('Herbalism Kit');
  expect(s.tools.filter(x=>x==='Herbalism Kit')).toHaveLength(1);
  expect(s.initiative).toBe(3);
  expect(playerSheetSummary(JSON.parse(JSON.stringify(c)))).toEqual(s);
 });
 it('lists verified owned weapons only and derives attack bonuses without mutating campaign',()=>{
  const c=rogue(),snapshot=JSON.stringify(c);
  c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Dagger',quantity:2},{name:'Club',quantity:1},{name:'Unknown artifact',quantity:1}]};
  const s=playerSheetSummary(c)!;
  expect(s.attacks.map(a=>a.name)).toEqual(['Dagger','Club']);
  expect(s.attacks[0]).toMatchObject({quantity:2,attackModifier:5,damageModifier:3,masteryTrained:true,proficient:true});
  expect(s.attacks[1]).toMatchObject({quantity:1,attackModifier:1,damageModifier:-1,masteryTrained:false});
  expect(s.totalKnownWeight).toBe(4);
  expect(s.unverifiedWeight).toEqual(['Unknown artifact']);
  expect(JSON.stringify(c)).not.toBe(snapshot);
  expect(playerSheetSummary(c)).toEqual(s);
 });
 it('does not derive imported character data from legacy campaign',()=>{
  expect(playerSheetSummary(newCampaign('Legacy'))).toBeNull();
 });
});
