import {describe,it,expect,vi,afterEach} from 'vitest';
import {battlefieldBlocked,battlefieldCover,battlefieldDifficult,validateBattlefield,toggleBattlefieldOpening,type Battlefield} from './battlefield';
import {attemptFixtureCheck,fixtureStats,strikeBattlefieldFixture} from './battlefieldFixtures';
import {newCampaign,interactDuelBattlefieldOpening,useDuelFixtureAction,type Campaign} from './campaign';

const makeMap=():Battlefield=>({width:10,height:8,theme:'ruins',objects:[
 {id:'lock',kind:'door',x:3,y:3,width:1,height:1,material:'wood',hp:18,locked:true,lockDC:15,forceDC:15},
 {id:'glass',kind:'window',x:6,y:3,width:1,height:1,material:'glass',hp:4}
]});
const arena=():Campaign=>{
 const c=newCampaign('Fixtures','fixture-tests');
 return {...c,combat:{status:'initiative-set',enemyName:'Rat',enemyInitiative:10,playerInitiative:20,
 round:1,order:['Nighthawk','Rat'],turnIndex:0,playerPosition:{x:2,y:3},enemyPosition:{x:8,y:5},enemyHp:4,
 enemyMaxHp:4,movementUsed:0,movementAllowance:35,arrowsRemaining:20,daggersAvailable:2,
 battlefield:makeMap()}};
};
afterEach(()=>vi.restoreAllMocks());
describe('2024 physical fixture rules',()=>{
 it('uses DMG door and glass object AC/HP, and validates persisted fixture values',()=>{
  expect(fixtureStats(makeMap().objects[0])).toMatchObject({ac:15,hp:18,forceDC:15,lockDC:15});
  expect(fixtureStats(makeMap().objects[1])).toMatchObject({ac:13,hp:4,forceDC:10});
  expect(validateBattlefield(makeMap())).toEqual(makeMap());
  for(const key of ['lockDC','forceDC','hp'] as const){
   const bad={...makeMap(),objects:makeMap().objects.map(o=>o.id==='lock'?{...o,[key]:9999}:o)};
   expect(()=>validateBattlefield(bad)).toThrow('Invalid battlefield object');
  }
  expect(()=>validateBattlefield({...makeMap(),objects:[{...makeMap().objects[0],locked:'true'}]})).toThrow();
  expect(()=>toggleBattlefieldOpening(makeMap(),'lock')).toThrow('locked');
 });
 it('picks good locks with Utilize DC15, but free opening remains separate',()=>{
  expect(attemptFixtureCheck(makeMap(),'lock','pick',14).success).toBe(false);
  const success=attemptFixtureCheck(makeMap(),'lock','pick',15);
  expect(success.success).toBe(true);
  expect(success.map.objects[0].locked).toBe(false);
  expect(battlefieldBlocked(success.map,{x:3,y:3})).toBe(true);
  const opened=toggleBattlefieldOpening(success.map,'lock');
  expect(battlefieldBlocked(opened,{x:3,y:3})).toBe(false);
  expect(battlefieldCover(opened,{x:1,y:3},{x:5,y:3})).toBe(0);
  expect(validateBattlefield(opened)).toEqual(opened);
 });
 it('requires ten Utilize actions for complex locks and rolls only at completion',()=>{
  let map=makeMap();map.objects[0].lockComplexity='complex';
  for(let i=1;i<=9;i++){
   const progress=attemptFixtureCheck(map,'lock','pick',0);
   expect(progress.map.objects[0].lockProgress).toBe(i);
   expect(progress.success).toBe(false);
   map=progress.map;
   expect(validateBattlefield(map)).toEqual(map);
  }
  const done=attemptFixtureCheck(map,'lock','pick',20);
  expect(done.success).toBe(true);
  expect(done.map.objects[0].lockProgress).toBeUndefined();
  expect(validateBattlefield(done.map)).toEqual(done.map);
 });
 it('applies natural 1/20 outcomes on both checks and attacks, including automatic critical hits',()=>{
  expect(attemptFixtureCheck(makeMap(),'lock','pick',99,1).success).toBe(false);
  expect(attemptFixtureCheck(makeMap(),'lock','pick',0,20).success).toBe(true);
  expect(attemptFixtureCheck(makeMap(),'lock','force',99,1).success).toBe(false);
  expect(attemptFixtureCheck(makeMap(),'lock','force',0,20).success).toBe(true);
  expect(strikeBattlefieldFixture(makeMap(),'glass',99,10,'piercing',1).success).toBe(false);
  expect(strikeBattlefieldFixture(makeMap(),'glass',0,4,'piercing',20).map.objects[1].destroyed).toBe(true);
 });
 it('forces a wooden door using DC 15 and opens on success, not on failure',()=>{
  const failed=attemptFixtureCheck(makeMap(),'lock','force',14);
  expect(failed.map).toEqual(makeMap());
  const success=attemptFixtureCheck(makeMap(),'lock','force',15);
  expect(success.map.objects[0]).toMatchObject({open:true,locked:false});
  expect(validateBattlefield(success.map)).toEqual(success.map);
 });
 it('strikes physical fixtures against material AC, tracks HP, and destroys cover',()=>{
  const miss=strikeBattlefieldFixture(makeMap(),'glass',12,99,'slashing');
  expect(miss.map).toEqual(makeMap());
  const poison=strikeBattlefieldFixture(makeMap(),'glass',13,99,'poison');
  expect(poison.map.objects[1].hp).toBe(4);
  const chip=strikeBattlefieldFixture(makeMap(),'glass',14,3,'bludgeoning');
  expect(chip.map.objects[1]).toMatchObject({hp:1,destroyed:false});
  expect(battlefieldBlocked(chip.map,{x:6,y:3})).toBe(true);
  expect(validateBattlefield(chip.map)).toEqual(chip.map);
  const crate:Battlefield={width:8,height:8,objects:[{id:'box',kind:'crate',x:3,y:3,width:1,height:1}]};
  const smashedCrate=strikeBattlefieldFixture(crate,'box',18,25,'bludgeoning');
  expect(smashedCrate.map.objects[0]).toMatchObject({hp:0,destroyed:true});
  expect(validateBattlefield(smashedCrate.map)).toEqual(smashedCrate.map);
  expect(battlefieldBlocked(smashedCrate.map,{x:3,y:3})).toBe(false);
  const shattered=strikeBattlefieldFixture(chip.map,'glass',18,2,'piercing');
  expect(shattered.map.objects[1]).toMatchObject({hp:0,destroyed:true});
  expect(battlefieldBlocked(shattered.map,{x:6,y:3})).toBe(false);
  expect(battlefieldDifficult(shattered.map,{x:6,y:3})).toBe(true);
  expect(battlefieldCover(shattered.map,{x:4,y:3},{x:8,y:3})).toBe(0);
  expect(validateBattlefield(shattered.map)).toEqual(shattered.map);
  expect(()=>strikeBattlefieldFixture(shattered.map,'glass',20,5,'piercing')).toThrow('already destroyed');
  const splinter=strikeBattlefieldFixture(makeMap(),'lock',18,18,'bludgeoning');
  expect(splinter.map.objects[0]).toMatchObject({destroyed:true,hp:0,locked:false});
  expect(validateBattlefield(splinter.map)).toEqual(splinter.map);
 });
 it('campaign pick requires owned thieves tools, consumes an Action, respects its free interaction',()=>{
  const initial=arena();
  expect(()=>useDuelFixtureAction(initial,'lock','pick')).toThrow('Thieves');
  const c={...initial,inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:"Thieves' Tools",quantity:1}]}};
  vi.spyOn(crypto,'getRandomValues').mockImplementation((a:any)=>{a[0]=19;return a;});
  const next=useDuelFixtureAction(c,'lock','pick');
  expect(next.combat?.battlefield?.objects[0].locked).toBe(false);
  expect(next.combat?.actionUsed).toBe(true);
  expect(next.combat?.objectInteractionUsed).toBeFalsy();
  expect(()=>useDuelFixtureAction(next,'lock','strike')).toThrow('Action');
  const opened=interactDuelBattlefieldOpening(next,'lock');
  expect(opened.combat?.battlefield?.objects[0].open).toBe(true);
  expect(opened.combat?.objectInteractionUsed).toBe(true);
  expect(validateBattlefield(opened.combat!.battlefield!)).toEqual(opened.combat!.battlefield);
 });
 it('force and dagger attacks resolve only in reach and spend the one Action',()=>{
  vi.spyOn(crypto,'getRandomValues').mockImplementation((a:any)=>{a[0]=19;return a;});
  const forced=useDuelFixtureAction(arena(),'lock','force');
  expect(forced.combat?.battlefield?.objects[0]).toMatchObject({open:true,locked:false});
  expect(forced.combat?.actionUsed).toBe(true);
  const nearby=arena();nearby.combat!.playerPosition={x:5,y:3};
  const destroyed=useDuelFixtureAction(nearby,'glass','strike');
  expect(destroyed.combat?.battlefield?.objects[1]).toMatchObject({destroyed:true,hp:0});
  expect(destroyed.combat?.actionUsed).toBe(true);
  const distant=arena();distant.combat!.playerPosition={x:0,y:0};
  expect(()=>useDuelFixtureAction(distant,'lock','force')).toThrow('within five feet');
 });
});
