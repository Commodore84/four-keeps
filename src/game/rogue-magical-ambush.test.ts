import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {resolveRogueMagicalAmbushSave,rogueMagicalAmbushApplies} from './rogueMagicalAmbush';
describe('Arcane Trickster Magical Ambush',()=>{
 const campaign=()=>{const c=newCampaign('Ambush');return {...c,characterIdentity:{...c.characterIdentity!,classId:'rogue'},importedSubclassId:'rogue-arcane-trickster',character:{...c.character!,level:9}}};
 it('applies only when level nine, subclass, hidden and a saving throw',()=>{
  const c=campaign();
  expect(rogueMagicalAmbushApplies(c,true,true)).toBe(true);
  expect(rogueMagicalAmbushApplies(c,false,true)).toBe(false);
  expect(rogueMagicalAmbushApplies(c,true,false)).toBe(false);
  expect(rogueMagicalAmbushApplies({...c,character:{...c.character!,level:8}},true,true)).toBe(false);
 });
 it('uses lower verified roll and never mutates campaign',()=>{
  const c=campaign();
  expect(resolveRogueMagicalAmbushSave(c,true,[17,4],3,14)).toEqual({total:7,success:false,disadvantage:true});
  expect(resolveRogueMagicalAmbushSave(c,false,[17,4],3,14)).toEqual({total:20,success:true,disadvantage:false});
  expect(()=>resolveRogueMagicalAmbushSave(c,true,[21,4],3,14)).toThrow('verified');
 });
});
