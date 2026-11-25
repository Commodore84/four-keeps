import {describe,expect,it} from 'vitest';
import type {Campaign} from './campaign';
import {claimQuestPayment,recoverClassicVictoryRewards,settleClassicVictory} from './encounterRewardResolution';
import {SOLO_ROGUE_ENCOUNTERS} from './encounterDirector';

const victory='The encounter is won. Exploration resumes; the DM may adjudicate recovered loot and rewards.';
const first={id:'giant-rat-1',name:'Giant Rat',hp:7,maxHp:7,speed:30,attackBonus:5,damageDice:'1d4',damageModifier:3,ac:13};
const second={...first,id:'giant-rat-2',name:'Giant Rat 2'};
const base=():Campaign=>({
 schemaVersion:1,id:'warehouse-original',title:'Nighthawk',location:'Dasahi',
 createdAt:'2026-11-25T00:00:00Z',updatedAt:'2026-11-25T00:00:00Z',xp:0,
 journal:[{id:'start-1',kind:'system',text:'Encounter opened in the original practice-combat interface. Giant Rat and Giant Rat are present.',createdAt:'2026-11-25T00:00:00Z'}],
 inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:10,PP:0},gear:[]},
} as Campaign);
const combat=(firstHp=0,secondHp=0):NonNullable<Campaign['combat']>=>({
 status:'completed',round:4,enemyName:'Giant Rat',enemyInitiative:6,enemyHp:firstHp,enemyMaxHp:7,
 secondEnemy:{name:'Giant Rat 2',initiative:8,position:{x:8,y:8},hp:secondHp,maxHp:7,detected:true},
 classicAdventure:{origin:'dm',scenarioLocation:'dasahi',first,second}
});

describe('deterministic encounter XP and posted quest pay',()=>{
 it('awards exactly 50 XP for a two-giant-rat victory and records 5 GP due, not spent',()=>{
  const saved=base();
  const awarded=settleClassicVictory(saved,combat(),'victory-1');
  expect(awarded.xp).toBe(50);
  expect(awarded.xpAwards).toEqual([{id:'classic-encounter-victory-1',amount:50,reason:'Defeated Giant Rat and Giant Rat'}]);
  expect(awarded.inventoryLedger?.currency.GP).toBe(10);
  expect(awarded.questPayouts).toMatchObject([{id:'contract-victory-1',payer:'Harl Mesk',amountGp:5,status:'available'}]);
  expect(settleClassicVictory(awarded,combat(),'victory-1')).toEqual(awarded);
  const claimed=claimQuestPayment(awarded,'contract-victory-1');
  expect(claimed.inventoryLedger?.currency.GP).toBe(15);
  expect(claimed.questPayouts?.[0].status).toBe('collected');
  expect(claimQuestPayment(claimed,'contract-victory-1')).toBe(claimed);
 });
 it('does not pay or grant XP for defeat or enemies still alive',()=>{
  expect(settleClassicVictory(base(),{...combat(),outcome:'player-defeated'},'defeat')).toEqual(base());
  expect(settleClassicVictory(base(),combat(1,0),'unfinished')).toEqual(base());
  expect(settleClassicVictory(base(),combat(0,1),'unfinished')).toEqual(base());
 });
 it('recovers XP and unpaid contract after older encounter already had several DM conversations',()=>{
  const old=base();
  const saved={...old,journal:[...old.journal,
   {id:'victory-1',kind:'system' as const,text:victory,createdAt:'2026-11-25T00:01:00Z'},
   {id:'dm-1',kind:'dm' as const,text:'Harl Mesk offers very little.',createdAt:'2026-11-25T00:02:00Z'},
   {id:'player-1',kind:'player' as const,text:'What about fifty gold?',createdAt:'2026-11-25T00:03:00Z'}]};
  const restored=recoverClassicVictoryRewards(saved);
  expect(restored.xp).toBe(50);
  expect(restored.questPayouts?.[0].amountGp).toBe(5);
  expect(restored.inventoryLedger?.currency.GP).toBe(10);
  expect(recoverClassicVictoryRewards(restored)).toEqual(restored);
 });
 it('ignores stories with no engine-verified completion and unverified monsters',()=>{
  const old=base();
  expect(recoverClassicVictoryRewards(old)).toBe(old);
  const invented={...old,journal:[{id:'a',kind:'system' as const,text:'Encounter opened in the original practice-combat interface. Dragon and Dragon are present.',createdAt:'2026-11-25T00:00:00Z'},
   {id:'v',kind:'system' as const,text:victory,createdAt:'2026-11-25T00:01:00Z'}]};
  expect(recoverClassicVictoryRewards(invented)).toBe(invented);
 });
 it('defines clear upfront payment rates across the three starter contracts',()=>{
  expect(SOLO_ROGUE_ENCOUNTERS['warehouse-vermin'].contract).toEqual({payer:'Harl Mesk',amountGp:5,location:'Dasahi'});
  expect(SOLO_ROGUE_ENCOUNTERS['roadside-bandit'].contract.amountGp).toBe(12);
  expect(SOLO_ROGUE_ENCOUNTERS['ruins-goblin-scouts'].contract.amountGp).toBe(20);
 });
});
