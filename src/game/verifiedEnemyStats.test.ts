import {describe,it,expect} from 'vitest';
import {parseVerifiedEnemyStats,inspectVerifiedEnemyStats} from './verifiedEnemyStats';
describe('explicit enemy statline import',()=>{
 it('extracts only all five confirmed statistics, leaving initiative to the player',()=>{
  expect(parseVerifiedEnemyStats('HP 11, AC 12, attack bonus +3, damage bonus +1, damage dice 1d6')).toEqual({hitPoints:'11',armorClass:'12',attackModifier:'3',damageModifier:'1',damageDice:'1d6'});
  expect(parseVerifiedEnemyStats('Hit Points: 24; Armor Class: 15; To Hit: -2; Damage Modifier: 0; Damage Dice: 2d8')).toEqual({hitPoints:'24',armorClass:'15',attackModifier:'-2',damageModifier:'0',damageDice:'2d8'});
 });
 it('refuses incomplete or out-of-range data instead of inventing statistics',()=>{
  for(const input of ['HP 11 AC 12 attack bonus +3 damage dice 1d6','HP 0 AC 12 attack bonus +3 damage bonus +1 damage dice 1d6','HP 11 AC 60 attack bonus +3 damage bonus +1 damage dice 1d6','The enemy has 11 HP and 12 AC'])expect(parseVerifiedEnemyStats(input)).toBeNull();
 });
 it('imports only explicitly provided partial values and names missing fields',()=>{
  expect(inspectVerifiedEnemyStats('HP 11, AC 13')).toEqual({values:{hitPoints:'11',armorClass:'13'},missing:['attack bonus','damage bonus','damage dice'],invalid:[]});
 });
 it('rejects out-of-range values while retaining independently verified values',()=>{
  expect(inspectVerifiedEnemyStats('HP 0, AC 12, attack bonus +3, damage bonus -1, damage dice 0d6')).toEqual({values:{armorClass:'12',attackModifier:'3',damageModifier:'-1'},missing:[],invalid:['HP','damage dice']});
 });
});
