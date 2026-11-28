import {afterEach,describe,expect,it,vi} from 'vitest';
import {newCampaign,prepareOrdinaryWeaponAttack,rollDuelAttack,stowCombatWeapon,type Campaign} from './campaign';
import {makeCombatLabEncounter} from './combatLab';
import {combatWeaponChoices} from './combat-ui';
import {combatHeldWeapons,planOrdinaryWeaponAttack,ordinaryAttackProfile} from './ordinaryWeaponCombat';

const currency={CP:0,SP:0,EP:0,GP:0,PP:0};
function arena(level=1,daggers=2):Campaign{
 const base=newCampaign('Shortbow & dagger rules lab');
 const identity={name:'Test Rogue',classId:level>=5?'fighter':'rogue',speciesId:'human',
  backgroundId:'soldier',draftId:'test',pronouns:'',appearance:'',personality:'',backstory:''};
 const character={...base.character!,level,proficiencyBonus:level>=5?3:2,classId:identity.classId,
  scores:{...base.character!.scores,str:10,dex:16},weaponProficiencies:['Simple','Martial']};
 const source={...base,character,characterIdentity:identity,
  inventoryLedger:{currency,gear:[{name:'Shortbow',quantity:1},{name:'Arrows',quantity:10},
   ...(daggers?[{name:'Dagger',quantity:daggers}]:[])]},
  encounterLoadout:{weaponId:'shortbow'}};
 const lab=makeCombatLabEncounter('roadside-bandit','lab-weapon-switch',source);
 return {...lab,character,characterIdentity:identity,inventoryLedger:source.inventoryLedger,
  encounterLoadout:source.encounterLoadout,
  combat:{...lab.combat!,status:'initiative-set',order:['Nighthawk','Bandit'],turnIndex:0,
   enemyName:'Bandit',enemyHp:100,enemyMaxHp:100,playerPosition:{x:2,y:2},
   enemyPosition:{x:3,y:2},selectedEnemy:'first',battlefield:undefined,actionUsed:false}};
}
function dice(...rolls:number[]){
 let n=0;
 vi.spyOn(crypto,'getRandomValues').mockImplementation(((a:Uint32Array)=>{
  if(n>=rolls.length)throw Error('Unexpected die');
  a[0]=rolls[n++]-1;
  return a;
 }) as typeof crypto.getRandomValues);
 return ()=>expect(n).toBe(rolls.length);
}
afterEach(()=>vi.restoreAllMocks());

describe('2024 held / carried ordinary weapon interaction economy',()=>{
 it('draws a carried Dagger to stab while a Shortbow remains held in one hand',()=>{
  const c=arena();
  const original=structuredClone(c);
  const choices=combatWeaponChoices(c.combat!,c).choices;
  expect(choices[0].id).toBe('shortbow:ranged');
  expect(choices.find(o=>o.id==='shortbow:ranged')?.eligible).toBe(true);
  expect(choices.find(o=>o.id==='dagger')?.eligible).toBe(true);
  expect(choices.find(o=>o.id==='dagger:thrown')?.eligible).toBe(true);
  expect(choices.find(o=>o.id==='dagger')?.detail).toContain('draw Dagger');
  const prepared=prepareOrdinaryWeaponAttack(c,'dagger','melee');
  expect(combatHeldWeapons(prepared)).toEqual({main:'shortbow',off:'dagger'});
  expect(prepared.combat?.objectInteractionUsed).toBe(false);
  expect(prepared.journal.at(-1)?.text).toContain('draw Dagger');
  expect(c).toEqual(original);
 });
 it('throws a dagger from the belt, leaves the bow held and consumes the dagger on a miss',()=>{
  const c={...arena(5,1),combat:{...arena(5,1).combat!,enemyPosition:{x:6,y:2}}};
  const plan=planOrdinaryWeaponAttack(c,ordinaryAttackProfile(c,'dagger','thrown')!);
  expect(plan.eligible).toBe(true);
  expect(plan.interactions).toContain('draw Dagger (Thrown property)');
  const prepared=prepareOrdinaryWeaponAttack(c,'dagger','thrown');
  expect(combatHeldWeapons(prepared)).toEqual({main:'shortbow',off:undefined});
  expect(prepared.combat?.objectInteractionUsed).toBe(false);
  const used=dice(1);
  const missed=rollDuelAttack(prepared,'hit');
  used();
  expect(missed.inventoryLedger?.gear.find(g=>g.name==='Dagger')?.quantity).toBe(0);
  expect(combatWeaponChoices(missed.combat!,missed).choices.some(option=>option.id==='dagger:thrown')).toBe(false);
  expect(combatWeaponChoices(missed.combat!,missed).choices.find(option=>option.id==='shortbow:ranged')?.eligible).toBe(true);
  expect(missed.combat?.attack?.weaponSnapshot?.itemId).toBe('dagger');
  expect(combatHeldWeapons(JSON.parse(JSON.stringify(missed)))).toEqual({main:'shortbow'});
 });
 it('draws and stabs then stows the dagger to fire the bow on Extra Attack',()=>{
  const c=arena(5,2);
  const used=dice(1);
  const missed=rollDuelAttack(prepareOrdinaryWeaponAttack(c,'dagger','melee'),'hit');
  used();
  expect(missed.combat?.attack?.phase).toBe('resolved');
  const shotOption=combatWeaponChoices(missed.combat!,missed).choices.find(o=>o.id==='shortbow:ranged');
  expect(shotOption?.eligible).toBe(true);
  expect(shotOption?.detail).toContain('stow Dagger');
  const shot=prepareOrdinaryWeaponAttack(missed,'shortbow','ranged');
  expect(shot.combat?.attackCountThisTurn).toBe(2);
  expect(combatHeldWeapons(shot)).toEqual({main:'shortbow',off:undefined});
  expect(shot.combat?.objectInteractionUsed).toBe(false);
  expect(missed.inventoryLedger?.gear.find(g=>g.name==='Dagger')?.quantity).toBe(2);
 });
 it('offers a free stow without spending an Attack or Bonus Action, saved over reload',()=>{
  const base=arena();
  const c={...base,combat:{...base.combat!,weaponHands:{main:'shortbow',off:'dagger'}}};
  const next=stowCombatWeapon(c,'off');
  expect(next.combat?.objectInteractionUsed).toBe(true);
  expect(next.combat?.actionUsed).toBe(false);
  expect(combatHeldWeapons(JSON.parse(JSON.stringify(next)))).toEqual({main:'shortbow',off:undefined});
  expect(()=>stowCombatWeapon(next,'main')).toThrow('object interaction');
  expect(combatWeaponChoices(next.combat!,next).choices.find(o=>o.id==='dagger')?.eligible).toBe(true);
  expect(planOrdinaryWeaponAttack(next,ordinaryAttackProfile(next,'dagger','melee')!).interactions)
   .toContain('draw Dagger (Attack interaction)');
 });
 it('uses the free object interaction to stow then the Attack interaction to draw with full hands',()=>{
  const base=arena();
  const c={...base,combat:{...base.combat!,weaponHands:{main:'shortbow',off:'shortsword'}},
   inventoryLedger:{...base.inventoryLedger!,gear:[...base.inventoryLedger!.gear,{name:'Shortsword',quantity:1}]}};
  const plan=planOrdinaryWeaponAttack(c,ordinaryAttackProfile(c,'dagger','melee')!);
  expect(plan.eligible).toBe(true);
  expect(plan.interactions).toEqual(['stow Shortsword (object interaction)','draw Dagger (Attack interaction)']);
  const prepared=prepareOrdinaryWeaponAttack(c,'dagger','melee');
  expect(combatHeldWeapons(prepared)).toEqual({main:'shortbow',off:'dagger'});
  expect(prepared.combat?.objectInteractionUsed).toBe(true);
  const noFree={...c,combat:{...c.combat!,objectInteractionUsed:true}};
  expect(planOrdinaryWeaponAttack(noFree,ordinaryAttackProfile(noFree,'dagger','melee')!).eligible).toBe(false);
  expect(()=>prepareOrdinaryWeaponAttack(noFree,'dagger','melee')).toThrow('Stow a held weapon');
 });
 it('lets a held dagger be thrown, freeing the hand to shoot the bow',()=>{
  const base=arena(5,1);
  const c={...base,combat:{...base.combat!,weaponHands:{main:'shortbow',off:'dagger'},
   enemyPosition:{x:6,y:2}}};
  const plan=planOrdinaryWeaponAttack(c,ordinaryAttackProfile(c,'dagger','thrown')!);
  expect(plan.interactions).toEqual([]);
  expect(plan.hands).toEqual({main:'shortbow',off:undefined});
  const used=dice(1);
  const missed=rollDuelAttack(prepareOrdinaryWeaponAttack(c,'dagger','thrown'),'hit');
  used();
  const bow=combatWeaponChoices(missed.combat!,missed).choices.find(o=>o.id==='shortbow:ranged');
  expect(bow?.eligible).toBe(true);
  expect(bow?.detail).toContain('Held');
 });
 it('allows a Light offhand dagger to be drawn with the free object interaction',()=>{
  const base=arena();
  const c={...base,inventoryLedger:{...base.inventoryLedger!,
   gear:[{name:'Shortsword',quantity:1},{name:'Dagger',quantity:1}]},
   encounterLoadout:{weaponId:'shortsword'},combat:{...base.combat!,weaponHands:{main:'shortsword'}}};
  const used=dice(1);
  const first=rollDuelAttack(prepareOrdinaryWeaponAttack(c,'shortsword','melee'),'hit');
  used();
  expect(combatWeaponChoices(first.combat!,first).choices.find(o=>o.id==='dagger:offhand')?.eligible).toBe(true);
  const bonus=prepareOrdinaryWeaponAttack(first,'dagger','offhand');
  expect(combatHeldWeapons(bonus)).toEqual({main:'shortsword',off:'dagger'});
  expect(bonus.combat?.objectInteractionUsed).toBe(true);
  expect(bonus.combat?.bonusActionUsed).toBe(true);
 });
 it('blocks a bow shot while a shield occupies the second hand',()=>{
  const base=arena();
  const shielded={...base,encounterLoadout:{weaponId:'shortbow',shieldId:'shield'}};
  expect(planOrdinaryWeaponAttack(shielded,ordinaryAttackProfile(shielded,'shortbow','ranged')!).eligible).toBe(false);
  expect(combatWeaponChoices(shielded.combat!,shielded).choices.find(o=>o.id==='shortbow:ranged')?.reason).toContain('shield');
  const withDagger={...base,combat:{...base.combat!,
   weaponHands:{main:'shortbow',off:'dagger'},objectInteractionUsed:true}};
  expect(planOrdinaryWeaponAttack(withDagger,ordinaryAttackProfile(withDagger,'shortbow','ranged')!).eligible).toBe(true);
  expect(planOrdinaryWeaponAttack(withDagger,ordinaryAttackProfile(withDagger,'shortbow','ranged')!).objectInteractionUsed).toBe(true);
 });
});
