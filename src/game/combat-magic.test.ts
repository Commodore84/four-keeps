import {describe,expect,it} from 'vitest';
import {availableCombatSpells,castCombatMagicAction,newCampaign,takeDuelTurnAction,type Campaign} from './campaign';
import {createBackup,parseBackup} from './backup';
function encounter():Campaign {
 const base=newCampaign('Arcane Trickster combat','magic-test');
 return {...base,character:{...base.character!,level:3,subclass:'Arcane Trickster',cantrips:['Mage Hand','Minor Illusion','Mind Sliver'],preparedSpells:['Disguise Self','Silent Image','Find Familiar'],spellSlots:{level1:2,usedLevel1:0}},
 combat:{status:'initiative-set',enemyName:'Training Dummy',enemyInitiative:10,playerInitiative:20,round:1,order:['Nighthawk','Training Dummy'],turnIndex:0,enemyHp:12,enemyMaxHp:12,playerPosition:{x:2,y:10},enemyPosition:{x:10,y:2},movementAllowance:35}};
}
describe('Arcane Trickster Magic Action',()=>{
 it('only enables combat-action spells, excluding one-hour Find Familiar',()=>{
  expect(availableCombatSpells(encounter())).toEqual(['Mage Hand','Minor Illusion','Mind Sliver','Disguise Self','Silent Image']);
 });
 it('requires Arcane Trickster level 3',()=>{
  const c=encounter();
  expect(availableCombatSpells({...c,character:{...c.character!,level:2}})).toEqual([]);
 });
 it('casts a cantrip without consuming a slot but spends Action',()=>{
  const c=castCombatMagicAction(encounter(),'Mage Hand','open the latch');
  expect(c.combat?.actionUsed).toBe(true);
  expect(c.combat?.lastAction).toBe('Magic: Mage Hand');
  expect(c.character?.spellSlots?.usedLevel1).toBe(0);
  expect(c.spellEffects?.at(-1)).toMatchObject({spell:'Mage Hand',target:'open the latch',status:'awaiting-adjudication'});
 });
 it('casts a level-1 spell and consumes exactly one slot',()=>{
  const c=castCombatMagicAction(encounter(),'Disguise Self','Nighthawk');
  expect(c.character?.spellSlots?.usedLevel1).toBe(1);
  expect(c.combat?.spellSlotExpendedThisTurn).toBe(true);
 });
 it('concentration replaces an earlier concentration effect',()=>{
  const c=castCombatMagicAction({...encounter(),concentration:{spell:'Friends',startedAt:'earlier'}},'Silent Image','doorway');
  expect(c.concentration?.spell).toBe('Silent Image');
  expect(c.concentration?.target).toBe('doorway');
 });
 it('cannot use a second Magic Action after casting',()=>{
  const c=castCombatMagicAction(encounter(),'Minor Illusion');
  expect(()=>castCombatMagicAction(c,'Mage Hand')).toThrow(/Action already used/);
 });
 it('cannot cast after an Attack action',()=>{
  const c=takeDuelTurnAction(encounter(),'shortbow');
  expect(()=>castCombatMagicAction(c,'Mage Hand')).toThrow(/Action already used/);
 });
 it('cannot cast on the enemy turn',()=>{
  expect(()=>castCombatMagicAction({...encounter(),combat:{...encounter().combat!,turnIndex:1}},'Mage Hand')).toThrow(/Nighthawk/);
 });
 it('rejects reaction spells, rituals and unknown spells in the Magic Action menu',()=>{
  for(const spell of ['Find Familiar','Shield','Unseen Servant'])expect(()=>castCombatMagicAction(encounter(),spell)).toThrow(/not available/);
 });
 it('rejects level-1 casting when slots are exhausted',()=>{
  const c=encounter();const exhausted={...c,character:{...c.character!,spellSlots:{level1:2,usedLevel1:2}}};
  expect(()=>castCombatMagicAction(exhausted,'Disguise Self')).toThrow(/No Level 1 spell slots/);
  expect(castCombatMagicAction(exhausted,'Mage Hand').character?.spellSlots?.usedLevel1).toBe(2);
 });
 it('a mid-turn save retains spell slot use, action economy and adjudication',()=>{
  const c=castCombatMagicAction(encounter(),'Silent Image','cover');
  const restored=parseBackup(JSON.stringify(createBackup(c)));
  expect(restored.combat?.actionUsed).toBe(true);
  expect(restored.combat?.spellSlotExpendedThisTurn).toBe(true);
  expect(restored.character?.spellSlots?.usedLevel1).toBe(1);
  expect(restored.spellEffects?.at(-1)?.status).toBe('awaiting-adjudication');
 });
});
