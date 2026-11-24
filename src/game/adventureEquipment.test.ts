import {describe,expect,it} from 'vitest';
import {adventureEquipmentRequest} from './adventureEquipment';
import {newCampaign} from './campaign';
import {useOwnedConsumable} from './consumables';

describe('adventure equipment intent',()=>{
 const fixture=()=>({...newCampaign('Test'),inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Tinderbox',quantity:1},{name:'Torch',quantity:2}]}});
 it('asks for confirmation and uses an owned torch exactly once',()=>{
  const campaign=fixture();
  const pending=adventureEquipmentRequest(campaign,'I light my torch.','torch-1')!;
  expect(pending).toMatchObject({name:'Torch',confirmed:false,expectedQuantity:2});
  expect(()=>useOwnedConsumable(campaign,pending)).toThrow('confirmation');
  const confirmed={...pending,confirmed:true};
  const applied=useOwnedConsumable(campaign,confirmed);
  expect(applied.inventoryLedger?.gear).toContainEqual({name:'Torch',quantity:1});
  expect(applied.equipmentLights?.Torch).toBeDefined();
  expect(useOwnedConsumable(applied,confirmed)).toBe(applied);
  expect(campaign.inventoryLedger.gear).toContainEqual({name:'Torch',quantity:2});
 });
 it('leaves questions to the DM and rejects an unowned item',()=>{
  expect(adventureEquipmentRequest(fixture(),'Can I light a candle with my magic?','turn')).toBeNull();
  expect(()=>adventureEquipmentRequest(fixture(),'Light a candle','turn')).toThrow('do not have');
 });
});
