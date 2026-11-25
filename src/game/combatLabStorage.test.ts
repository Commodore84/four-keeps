import {describe,expect,it} from 'vitest';
import {newCampaign,type Campaign} from './campaign';
import {makeCombatLabEncounter} from './combatLab';
import {createCombatLabSessionStorage} from './combatLabStorage';
import type {CampaignStorage} from './storage';

function fixture(initial:Campaign[]){
 const data=new Map(initial.map(c=>[c.id,structuredClone(c)]));
 const cache=new Map<string,string>();
 const base:CampaignStorage={
  list:async()=>[...data.values()].map(c=>structuredClone(c)),
  get:async id=>data.get(id),
  save:async campaign=>{data.set(campaign.id,structuredClone(campaign));},
  remove:async id=>{data.delete(id);}
 };
 const storage={getItem:(key:string)=>cache.get(key)??null,
  setItem:(key:string,value:string)=>{cache.set(key,value);},
  removeItem:(key:string)=>{cache.delete(key);}};
 return {facade:createCombatLabSessionStorage(base,storage),data,cache};
}
describe('Practice combat lives inside its parent adventure',()=>{
 it('never adds a second campaign, changes the parent or leaks test resources',async()=>{
  const parent=newCampaign('The Dasahi Adventure','adventure-1');
  const before=structuredClone(parent);
  const f=fixture([parent]);
  const lab=makeCombatLabEncounter('warehouse-vermin','lab-aabbcc11',parent);
  await f.facade.save(lab);
  expect(await f.facade.list()).toEqual([before]);
  expect(f.data.size).toBe(1);
  expect(f.facade.resumeLab(parent.id)).toEqual(lab);
  const spent={...lab,combat:{...lab.combat!,daggersAvailable:0}};
  await f.facade.save(spent);
  expect(f.facade.resumeLab(parent.id)?.combat?.daggersAvailable).toBe(0);
  expect(f.data.get(parent.id)).toEqual(before);
  const another=makeCombatLabEncounter('ruins-goblin-scouts','lab-aabbcc22',parent);
  await f.facade.save(another);
  expect(f.facade.resumeLab(parent.id)?.combatLab?.seed).toBe('lab-aabbcc22');
  expect(f.data.size).toBe(1);
 });
 it('isolates one practice session for each of two real campaigns',async()=>{
  const a=newCampaign('A','one'),b=newCampaign('B','two');
  const f=fixture([a,b]);
  await f.facade.save(makeCombatLabEncounter('warehouse-vermin','lab-aaaa1111',a));
  await f.facade.save(makeCombatLabEncounter('roadside-bandit','lab-bbbb2222',b));
  expect(f.facade.resumeLab(a.id)?.combatLab?.environment).toBe('warehouse-vermin');
  expect(f.facade.resumeLab(b.id)?.combatLab?.environment).toBe('roadside-bandit');
  await f.facade.remove(a.id);
  expect(f.facade.resumeLab(a.id)).toBeUndefined();
  expect(f.facade.resumeLab(b.id)?.combatLab?.environment).toBe('roadside-bandit');
  expect((await f.facade.list()).map(c=>c.id)).toEqual(['two']);
 });
 it('migrates legacy stand-alone test cards without overwriting the real adventure',async()=>{
  const parent=newCampaign('Real','adventure-parent');
  const oldLab=makeCombatLabEncounter('warehouse-vermin','lab-ccdd1122',parent);
  const f=fixture([oldLab,parent]);
  const visible=await f.facade.list();
  expect(visible.map(c=>c.id)).toEqual([parent.id]);
  expect(f.data.has(oldLab.id)).toBe(false);
  expect(f.facade.resumeLab(parent.id)).toEqual(oldLab);
  expect(f.data.get(parent.id)).toEqual(parent);
 });
 it('rejects corrupt or cross-adventure snapshots',async()=>{
  const f=fixture([newCampaign('Main','main')]);
  f.cache.set('four-keeps-combat-lab-session:main','{invalid');
  expect(f.facade.resumeLab('main')).toBeUndefined();
  const other=makeCombatLabEncounter('warehouse-vermin','lab-ccee1122',newCampaign('Other','other'));
  f.cache.set('four-keeps-combat-lab-session:main',JSON.stringify(other));
  expect(f.facade.resumeLab('main')).toBeUndefined();
  await expect(f.facade.save(makeCombatLabEncounter('warehouse-vermin','lab-ddaa1111'))).rejects.toThrow('belong');
 });
});
