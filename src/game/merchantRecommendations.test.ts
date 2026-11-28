import {describe,expect,it} from 'vitest';
import {newCampaign} from './campaign';
import {prototypeNighthawk} from './checks';
import {equipmentRecommendation} from './merchantRecommendations';

function rogue(gear:{name:string;quantity:number}[]=[]){
 const campaign=newCampaign('DM Picks test');
 campaign.character={...structuredClone(prototypeNighthawk),classId:'rogue'};
 campaign.characterIdentity={name:'Test Rogue',speciesId:'human',backgroundId:'criminal',classId:'rogue',draftId:'test',pronouns:'they',appearance:'',personality:'',backstory:''};
 campaign.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:50,PP:0},gear};
 return campaign;
}
const armor={id:'studded-leather-armor',name:'Studded Leather Armor',category:'armor',armorGroup:'Light',costCp:4500};
const arrows={id:'arrows',name:'Arrows',category:'ammunition',costCp:100};
const leather={id:'leather-armor',name:'Leather Armor',category:'armor',armorGroup:'Light',costCp:1000};
const padded={id:'padded-armor',name:'Padded Armor',category:'armor',armorGroup:'Light',costCp:500,stealthDisadvantage:true};

const bearings={id:'ball-bearings',name:'Ball Bearings',category:'adventuring gear',costCp:100};
describe('DM equipment recommendation tiers',()=>{
 it('prioritizes missing studded leather for a Rogue, not an owned upgrade',()=>{
  expect(equipmentRecommendation(rogue([{name:'Leather Armor',quantity:1}]),armor,4)?.stars).toBe(3);
  expect(equipmentRecommendation(rogue([{name:'Studded Leather Armor',quantity:1}]),armor,4)).toBeNull();
 });
 it('never ranks inferior light armor as top tier for a Rogue',()=>{
  expect(equipmentRecommendation(rogue(),armor,4)?.stars).toBe(3);
  expect(equipmentRecommendation(rogue(),leather,4)?.stars).toBe(1);
  expect(equipmentRecommendation(rogue(),padded,4)).toBeNull();
  expect(equipmentRecommendation(rogue([{name:'Leather Armor',quantity:1}]),leather,4)).toBeNull();
  expect(equipmentRecommendation(rogue([{name:'Studded Leather Armor',quantity:1}]),leather,4)).toBeNull();
  expect(equipmentRecommendation(rogue([{name:'Studded Leather Armor',quantity:1}]),padded,4)).toBeNull();
  expect(equipmentRecommendation(rogue([{name:'Leather Armor +2',quantity:1}]),armor,4)).toBeNull();
 });
 it('checks actual armor training before recommending upgrades',()=>{
  const wizard=rogue();
  wizard.characterIdentity!.classId='wizard';
  wizard.character!.classId='wizard';
  expect(equipmentRecommendation(wizard,armor,4)).toBeNull();
  expect(equipmentRecommendation(wizard,padded,4)).toBeNull();
 });
 it('recommends bow ammunition based on availability and owned quantity',()=>{
  expect(equipmentRecommendation(rogue([{name:'Shortbow',quantity:1}]),arrows,60)?.stars).toBe(3);
  expect(equipmentRecommendation(rogue([{name:'Shortbow',quantity:1},{name:'Arrows',quantity:20}]),arrows,60)?.stars).toBe(2);
  expect(equipmentRecommendation(rogue([{name:'Shortbow',quantity:1},{name:'Arrows',quantity:40}]),arrows,60)).toBeNull();
 });
 it('marks situational gear with one star and never recommends unavailable merchandise',()=>{
  expect(equipmentRecommendation(rogue(),bearings,10)?.stars).toBe(1);
  expect(equipmentRecommendation(rogue(),bearings,0)).toBeNull();
 });
 it('does not recommend without a real character',()=>{
  expect(equipmentRecommendation(newCampaign('Empty'),bearings,100)).toBeNull();
 });
});
