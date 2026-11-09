import {describe,expect,it,vi} from 'vitest';
import {availableCombatSpells,castCombatMagicAction,resolveCombatSpellSave,resolveLaughterRepeatSave,resolveDuelEnemyTurn,endNighthawkConcentration,newCampaign,takeDuelTurnAction,type Campaign} from './campaign';
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

describe('spell saving throw resolution',()=>{
 function rig(_spell:'Mind Sliver'|'Tasha’s Hideous Laughter',second=false){
  const c=encounter();
  return {...c,character:{...c.character!,preparedSpells:[...c.character!.preparedSpells!, 'Tasha’s Hideous Laughter']},
   combat:{...c.combat!,selectedEnemy:second?'second' as const:'first' as const,secondEnemy:second?{name:'Training Dummy 2',initiative:8,position:{x:8,y:2},hp:12,maxHp:12,detected:false}:undefined}};
 }
 function dice(...rolls:number[]){
  let index=0;
  const spy=vi.spyOn(crypto,'getRandomValues').mockImplementation(((array:Uint32Array)=>{array[0]=rolls[index++]-1;return array;}) as typeof crypto.getRandomValues);
  return ()=>{expect(index).toBe(rolls.length);spy.mockRestore();};
 }
 it('Mind Sliver failed INT save inflicts 1d6 psychic damage',()=>{
  const consumed=dice(2,5);
  const c=resolveCombatSpellSave(castCombatMagicAction(rig('Mind Sliver'),'Mind Sliver'));
  expect(c.combat?.lastSpellSave).toMatchObject({spell:'Mind Sliver',roll:2,success:false,damage:5});
  expect(c.combat?.enemyHp).toBe(7);
  expect(c.combat?.pendingSpellSave).toBeUndefined();
  consumed();
 });
 it('successful save prevents Mind Sliver damage',()=>{
  const consumed=dice(20);
  const c=resolveCombatSpellSave(castCombatMagicAction(rig('Mind Sliver'),'Mind Sliver'));
  expect(c.combat?.enemyHp).toBe(12);
  expect(c.combat?.lastSpellSave?.success).toBe(true);
  consumed();
 });
 it('Hideous Laughter failed WIS save makes the selected enemy Prone',()=>{
  const consumed=dice(1);
  const c=resolveCombatSpellSave(castCombatMagicAction(rig('Tasha’s Hideous Laughter',true),'Tasha’s Hideous Laughter'));
  expect(c.combat?.secondEnemy?.prone).toBe(true);
  expect(c.combat?.enemyProne).toBeFalsy();
  expect(c.combat?.lastSpellSave?.target).toBe('Training Dummy 2');
  consumed();
 });
 it('successful Hideous Laughter save does not knock target Prone',()=>{
  const consumed=dice(20);
  const c=resolveCombatSpellSave(castCombatMagicAction(rig('Tasha’s Hideous Laughter'),'Tasha’s Hideous Laughter'));
  expect(c.combat?.enemyProne).toBeFalsy();
  consumed();
 });
 it('spell save pending state survives backup and can resolve afterward',()=>{
  const consumed=dice(1,3);
  const c=castCombatMagicAction(rig('Mind Sliver'),'Mind Sliver');
  const restored=parseBackup(JSON.stringify(createBackup(c)));
  expect(restored.combat?.pendingSpellSave?.spell).toBe('Mind Sliver');
  const resolved=resolveCombatSpellSave(restored);
  expect(resolved.combat?.enemyHp).toBe(9);
  consumed();
 });
 it('rejects saving throw resolution without a pending spell',()=>{
  expect(()=>resolveCombatSpellSave(encounter())).toThrow(/No spell saving throw/);
 });
});

describe('ongoing spell effects',()=>{
 function d20(...rolls:number[]){
  let index=0;
  const spy=vi.spyOn(crypto,'getRandomValues').mockImplementation(((array:Uint32Array)=>{array[0]=rolls[index++]-1;return array;}) as typeof crypto.getRandomValues);
  return ()=>{expect(index).toBe(rolls.length);spy.mockRestore();};
 }
 it('failed Mind Sliver gives a d4 penalty to the next save then consumes it',()=>{
  const c=encounter();
  const spent=d20(1,2,13,4);
  const first=resolveCombatSpellSave(castCombatMagicAction(c,'Mind Sliver'));
  expect(first.combat?.mindSliverPenalty?.target).toBe('first');
  const next={...first,combat:{...first.combat!,pendingSpellSave:{spell:'Tasha’s Hideous Laughter' as const,target:'first' as const}}};
  const result=resolveCombatSpellSave(next);
  expect(result.combat?.lastSpellSave?.total).toBe(9);
  expect(result.combat?.mindSliverPenalty).toBeUndefined();
  spent();
 });
 it('Laughter prevents the affected enemy from taking a normal turn',()=>{
  const c=encounter();
  const spent=d20(1);
  const prepared={...c,character:{...c.character!,preparedSpells:['Tasha’s Hideous Laughter']}};
  const failed=resolveCombatSpellSave(castCombatMagicAction(prepared,'Tasha’s Hideous Laughter'));
  const enemyTurn={...failed,combat:{...failed.combat!,turnIndex:1}};
  const skipped=resolveDuelEnemyTurn(enemyTurn);
  expect(skipped.combat?.enemyLastTurn).toContain('Incapacitated');
  expect(skipped.combat?.turnIndex).toBe(0);
  spent();
 });
 it('successful repeat save ends Laughter',()=>{
  const c=encounter();
  const spent=d20(20);
  const result=resolveLaughterRepeatSave({...c,combat:{...c.combat!,laughterTarget:'first'},concentration:{spell:'Tasha’s Hideous Laughter',startedAt:'now'}});
  expect(result.combat?.laughterTarget).toBeUndefined();
  expect(result.concentration).toBeUndefined();
  spent();
 });
 it('failed repeat save keeps incapacitation',()=>{
  const c=encounter();const spent=d20(1);
  const result=resolveLaughterRepeatSave({...c,combat:{...c.combat!,laughterTarget:'first'}});
  expect(result.combat?.laughterTarget).toBe('first');
  spent();
 });
 it('ending concentration removes incapacitation',()=>{
  const c=encounter();
  const result=endNighthawkConcentration({...c,combat:{...c.combat!,laughterTarget:'first'},concentration:{spell:'Tasha’s Hideous Laughter',startedAt:'now'}});
  expect(result.combat?.laughterTarget).toBeUndefined();
 });
});
