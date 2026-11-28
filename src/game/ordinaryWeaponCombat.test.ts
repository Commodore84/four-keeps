import {afterEach,describe,expect,it,vi} from 'vitest';
import {newCampaign,prepareOrdinaryWeaponAttack,rollDuelAttack,type Campaign} from './campaign';
import {ITEMS,ITEM_BY_ID} from './creationEquipment';
import {setPlayerLoadout} from './companionEncounter';
import {combatWeaponChoices} from './combat-ui';
import {equippedOrdinaryAttacks,ordinaryAttackProfile,ownedOrdinaryWeapons} from './ordinaryWeaponCombat';
import {ammunitionNamesForWeapon} from './weaponAttackProfile';
import {makeCombatLabEncounter,withCombatLabTrainingWeapon} from './combatLab';

const weapons=ITEMS.filter(item=>item.category==='weapon');
const currency={CP:0,SP:0,EP:0,GP:0,PP:0};
function arena(itemId?:string,classId='fighter',quantity=1,level=1):Campaign{
 const item=itemId?ITEM_BY_ID[itemId]:undefined;
 const original=newCampaign('Weapon lab');
 const identity={name:'Test Adventurer',speciesId:'human',backgroundId:'soldier',classId,draftId:'test',
  pronouns:'',appearance:'',personality:'',backstory:''};
 const character={...original.character!,classId,level,proficiencyBonus:Math.floor((level-1)/4)+2,
  scores:{str:10,dex:16,con:12,int:10,wis:16,cha:10},
  weaponProficiencies:classId==='fighter'?['Simple','Martial']:['Simple']};
 const ammo=item?ammunitionNamesForWeapon(item).slice(0,1).map(name=>({name,quantity:10})):[];
 const source={...original,character,characterIdentity:identity,
  inventoryLedger:{currency,gear:[...(item?[{name:item.name,quantity}]:[]),...ammo]}};
 const lab=makeCombatLabEncounter('roadside-bandit','lab-ordinary-weapons',source);
 return {...lab,character,characterIdentity:identity,inventoryLedger:source.inventoryLedger,
  encounterLoadout:item?{weaponId:itemId}:{},
  combat:{...lab.combat!,status:'initiative-set',order:['Nighthawk','Bandit'],turnIndex:0,
   enemyName:'Bandit',enemyHp:100,enemyMaxHp:100,playerPosition:{x:2,y:2},
   enemyPosition:{x:3,y:2},selectedEnemy:'first',battlefield:undefined,actionUsed:false}};
}
function dice(...rolls:number[]){
 let n=0;
 vi.spyOn(crypto,'getRandomValues').mockImplementation(((a:Uint32Array)=>{
  if(n>=rolls.length)throw Error('Unexpected die requested');
  a[0]=rolls[n++]-1;
  return a;
 }) as typeof crypto.getRandomValues);
 return ()=>expect(n).toBe(rolls.length);
}
afterEach(()=>vi.restoreAllMocks());

describe('ordinary weapons use owned, explicitly equipped gear in classic combat',()=>{
 it('makes each of the 38 catalog weapons available from its real equipment entry',()=>{
  expect(weapons).toHaveLength(38);
  for(const item of weapons){
   const c=arena(item.id);
   const profiles=equippedOrdinaryAttacks(c);
   const primary=profiles.find(p=>p.itemId===item.id&&p.mode!=='versatile'&&(p.mode!=='thrown'||item.id==='dart'));
   expect(primary,item.name).toBeDefined();
   const option=combatWeaponChoices(c.combat!,c).choices.find(o=>o.id===primary!.id);
   expect(option,item.name).toBeDefined();
   expect(option?.eligible,item.name).toBe(true);
   const next=prepareOrdinaryWeaponAttack(c,item.id,primary!.mode);
   expect(next.combat?.attack?.weaponSnapshot?.itemId).toBe(item.id);
   expect(next.combat?.attack?.weaponSnapshot?.damageDice).toBe(primary!.damageDice);
   expect(next.combat?.actionUsed).toBe(true);
  }
 });
 it('does not offer the sample dagger or shortbow to a Monk without those weapons equipped',()=>{
  const c=arena(undefined,'monk');
  const choices=combatWeaponChoices(c.combat!,c).choices;
  expect(choices.map(c=>c.id)).toEqual(['unarmed','unarmed:monk-bonus']);
  expect(choices.every(c=>c.eligible)).toBe(true);
  expect(()=>prepareOrdinaryWeaponAttack(c,'dagger','melee')).toThrow('Equip and own');
  expect(()=>prepareOrdinaryWeaponAttack(c,'shortbow','ranged')).toThrow('Equip and own');
 });
 it('uses Monk Dexterity, Martial Arts dice, and independent Bonus Action unarmed strikes',()=>{
  const c=arena('quarterstaff','monk',1,5);
  expect(ordinaryAttackProfile(c,'quarterstaff','melee')).toMatchObject({damageDice:'1d8',attackBonus:6,damageModifier:3});
  expect(ordinaryAttackProfile(c,'unarmed','unarmed')).toMatchObject({damageDice:'1d8',attackBonus:6,damageModifier:3});
  const bonus=prepareOrdinaryWeaponAttack(c,'unarmed','monk-bonus');
  expect(bonus.combat?.bonusActionUsed).toBe(true);
  expect(bonus.combat?.actionUsed).toBe(false);
 });
 it('handles versatile and two-handed alternatives without inventing equipment',()=>{
  const c=arena('quarterstaff');
  const profiles=equippedOrdinaryAttacks(c);
  expect(profiles.map(p=>p.mode)).toEqual(['melee','versatile','unarmed']);
  expect(profiles.find(p=>p.mode==='versatile')?.damageDice).toBe('1d8');
  expect(ownedOrdinaryWeapons(c).map(i=>i.id)).toEqual(['quarterstaff']);
  expect(equippedOrdinaryAttacks({...c,encounterLoadout:{weaponId:'quarterstaff',shieldId:'shield'}}).some(i=>i.mode==='versatile')).toBe(false);
 });
 it('spends ammunition on the attack roll, including a miss, and persists the remaining count',()=>{
  const c=arena('longbow');
  const shot=prepareOrdinaryWeaponAttack({...c,combat:{...c.combat!,enemyPosition:{x:6,y:2}}},'longbow','ranged');
  const expected=dice(1);
  const rolled=rollDuelAttack(shot,'hit');
  expected();
  expect(rolled.combat?.attack?.hit).toBe(false);
  expect(rolled.inventoryLedger?.gear.find(g=>g.name==='Arrows')?.quantity).toBe(9);
  expect(c.inventoryLedger?.gear.find(g=>g.name==='Arrows')?.quantity).toBe(10);
  expect(JSON.parse(JSON.stringify(rolled)).inventoryLedger.gear.find((g:{name:string})=>g.name==='Arrows').quantity).toBe(9);
 });
 it('retains the selected weapon snapshot when the last thrown weapon leaves inventory',()=>{
  const c=arena('handaxe');
  const thrower=prepareOrdinaryWeaponAttack({...c,combat:{...c.combat!,enemyPosition:{x:6,y:2}}},'handaxe','thrown');
  const expected=dice(20,4,3);
  const hit=rollDuelAttack(thrower,'hit');
  expect(hit.inventoryLedger?.gear.find(g=>g.name==='Handaxe')?.quantity).toBe(0);
  expect(hit.combat?.attack?.weaponSnapshot?.name).toContain('Handaxe');
  const damage=rollDuelAttack(hit,'damage');
  expected();
  expect(damage.combat?.attack?.phase).toBe('resolved');
  expect(damage.combat?.attack?.weaponDamageRolls).toEqual([4,3]);
 });
 it('uses Heavy disadvantage threshold and rejects ranged weapons at melee reach outside normal rules',()=>{
  const c=arena('greataxe');
  expect(ordinaryAttackProfile(c,'greataxe','melee')?.heavyPenalty).toBe(true);
  const attack=prepareOrdinaryWeaponAttack(c,'greataxe','melee');
  expect(attack.combat?.attack?.disadvantage).toBe(true);
  const c2=arena('longbow');
  expect(prepareOrdinaryWeaponAttack(c2,'longbow','ranged').combat?.attack?.disadvantage).toBe(true);
 });
 it('grants every ordinary weapon only to the disposable Combat Lab copy',()=>{
  const source={...arena('rapier'),combatLab:undefined,combat:undefined};
  const original=structuredClone(source);
  const lab=makeCombatLabEncounter('roadside-bandit','lab-weapon-123',source);
  const trained=withCombatLabTrainingWeapon(lab,'heavy-crossbow');
  expect(trained.encounterLoadout?.weaponId).toBe('heavy-crossbow');
  expect(trained.inventoryLedger?.gear.find(row=>row.name==='Heavy Crossbow')?.quantity).toBe(1);
  expect(trained.inventoryLedger?.gear.find(row=>row.name==='Bolts')?.quantity).toBeGreaterThanOrEqual(20);
  expect(source).toEqual(original);
  expect(lab.inventoryLedger?.gear.some(row=>row.name==='Heavy Crossbow')).toBe(false);
  expect(()=>withCombatLabTrainingWeapon(source,'heavy-crossbow')).toThrow('Combat Lab');
 });
 it('supports Light offhand attacks as a distinct Bonus Action with no positive damage modifier',()=>{
  const base=arena('shortsword');
  const c={...base,inventoryLedger:{...base.inventoryLedger!,gear:[...base.inventoryLedger!.gear,{name:'Dagger',quantity:1}]},
   encounterLoadout:{weaponId:'shortsword',offhandWeaponId:'dagger'}};
  expect(combatWeaponChoices(c.combat!,c).choices.find(o=>o.id==='dagger:offhand')?.eligible).toBe(false);
  expect(()=>prepareOrdinaryWeaponAttack(c,'dagger','offhand')).toThrow('Light weapon');
  const prepared=prepareOrdinaryWeaponAttack(c,'shortsword','melee');
  const roll=dice(1,18);
  const first=rollDuelAttack(prepared,'hit');
  expect(first.combat?.attack?.phase).toBe('resolved');
  expect(combatWeaponChoices(first.combat!,first).choices.find(o=>o.id==='dagger:offhand')?.eligible).toBe(true);
  const bonus=prepareOrdinaryWeaponAttack(first,'dagger','offhand');
  expect(bonus.combat?.actionUsed).toBe(true);
  expect(bonus.combat?.bonusActionUsed).toBe(true);
  expect(bonus.combat?.attack?.weaponSnapshot?.damageModifier).toBe(0);
  rollDuelAttack(bonus,'hit');
  roll();
 });
 it('permits the 2024 Monk Bonus Action strike before the Attack action',()=>{
  const c=arena(undefined,'monk');
  const bonus=prepareOrdinaryWeaponAttack(c,'unarmed','monk-bonus');
  const used=dice(1);
  const rolled=rollDuelAttack(bonus,'hit');
  used();
  const choices=combatWeaponChoices(rolled.combat!,rolled).choices;
  expect(choices.find(choice=>choice.id==='unarmed')?.eligible).toBe(true);
  expect(choices.find(choice=>choice.id==='unarmed:monk-bonus')?.eligible).toBe(false);
 });
 it('supports 2024 Extra Attack within a Fighter Attack action and stops at the class limit',()=>{
  const c=arena('greatsword','fighter',1,5);
  const used=dice(1,1,1,1);
  const first=rollDuelAttack(prepareOrdinaryWeaponAttack(c,'greatsword','melee'),'hit');
  expect(first.combat?.attackCountThisTurn).toBe(1);
  expect(combatWeaponChoices(first.combat!,first).choices.find(choice=>choice.id==='greatsword')?.eligible).toBe(true);
  const second=rollDuelAttack(prepareOrdinaryWeaponAttack(first,'greatsword','melee'),'hit');
  expect(second.combat?.attackCountThisTurn).toBe(2);
  expect(combatWeaponChoices(second.combat!,second).choices.find(choice=>choice.id==='greatsword')?.eligible).toBe(false);
  expect(()=>prepareOrdinaryWeaponAttack(second,'greatsword','melee')).toThrow('exhausted');
  used();
 });
 it('respects Loading for a Fighter who normally has Extra Attack',()=>{
  const initial=arena('heavy-crossbow','fighter',1,5);
  const c={...initial,combat:{...initial.combat!,enemyPosition:{x:6,y:2}}};
  const used=dice(1);
  const first=rollDuelAttack(prepareOrdinaryWeaponAttack(c,'heavy-crossbow','ranged'),'hit');
  expect(first.combat?.attackCountThisTurn).toBe(1);
  expect(combatWeaponChoices(first.combat!,first).choices.find(choice=>choice.id==='heavy-crossbow:ranged')?.eligible).toBe(false);
  expect(()=>prepareOrdinaryWeaponAttack(first,'heavy-crossbow','ranged')).toThrow('Loading');
  used();
 });
 it('equips and unequips carried weapons through the saved character loadout',()=>{
  const c=arena('rapier');
  const clean={...c,combat:undefined,encounterLoadout:{}};
  const equipped=setPlayerLoadout(clean,'weaponId','rapier');
  expect(equipped.encounterLoadout?.weaponId).toBe('rapier');
  expect(combatWeaponChoices(c.combat!,{...c,encounterLoadout:equipped.encounterLoadout}).choices.map(x=>x.id)).toContain('rapier');
  const unequipped=setPlayerLoadout(equipped,'weaponId','');
  expect(unequipped.encounterLoadout?.weaponId).toBe('');
  expect(()=>setPlayerLoadout(clean,'weaponId','shortbow')).toThrow('owned');
 });
});

