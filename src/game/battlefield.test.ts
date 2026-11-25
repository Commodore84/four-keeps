import {describe,it,expect,vi,afterEach} from 'vitest';
import {battlefieldBlocked,battlefieldContains,battlefieldCover,battlefieldDifficult,validateBattlefield,type Battlefield} from './battlefield';
import {generateBattlefield,validateBattlefieldAccess,validateGeneratedBattlefield,battlefieldApproachCount} from './battlefieldGenerator';
import {buildSoloEncounter} from './encounterDirector';
import {fitsBattlefield,validateCombatScenario} from './combatScenario';
import {newCampaign,moveDuelToken,tacticalRoute,takeDuelTurnAction,rollDuelAttack,trainingRouteCost,type Campaign} from './campaign';
import {restorePracticeEncounter} from './practiceEncounterBridge';

const map:Battlefield={width:60,height:80,objects:[
 {id:'wall',kind:'wall',x:30,y:45,width:1,height:4},
 {id:'cargo',kind:'cargo',x:34,y:45,width:2,height:2},
 {id:'table',kind:'table',x:38,y:45,width:2,height:1},
 {id:'water',kind:'water',x:31,y:50,width:3,height:2},
]};
function arena(playerPosition={x:31,y:49},enemyPosition={x:40,y:50}):Campaign{
 const c=newCampaign('Dynamic test','dynamic-test');
 return {...c,combat:{status:'initiative-set',enemyName:'Training Dummy',enemyInitiative:10,playerInitiative:20,
  round:1,order:['Nighthawk','Training Dummy'],turnIndex:0,playerPosition,enemyPosition,enemyHp:12,enemyMaxHp:12,
  movementUsed:0,movementAllowance:35,selectedEnemy:'first',arrowsRemaining:20,daggersAvailable:2,battlefield:map}};
}
afterEach(()=>vi.restoreAllMocks());
describe('authoritative rectangular battlefield',()=>{
 it('accepts large rectangular geometry without treating it as a square',()=>{
  expect(validateBattlefield(map)).toEqual(map);
  expect(battlefieldContains(map,{x:59,y:79})).toBe(true);
  expect(battlefieldContains(map,{x:60,y:79})).toBe(false);
  expect(battlefieldContains(map,{x:59,y:80})).toBe(false);
  expect(()=>validateBattlefield({...map,objects:[{...map.objects[0],width:31}]})).toThrow();
  expect(()=>validateBattlefield({...map,objects:[map.objects[0],map.objects[0]]})).toThrow();
 });
 it('shares movement and directional line-of-sight properties',()=>{
  expect(battlefieldBlocked(map,{x:30,y:47})).toBe(true);
  expect(battlefieldDifficult(map,{x:31,y:50})).toBe(true);
  expect(battlefieldBlocked(map,{x:31,y:50})).toBe(false);
  expect(battlefieldCover(map,{x:28,y:46},{x:32,y:46})).toBe('total');
  expect(battlefieldCover(map,{x:32,y:46},{x:36,y:46})).toBe(5);
  expect(battlefieldCover(map,{x:37,y:45},{x:40,y:45})).toBe(2);
  expect(battlefieldCover(map,{x:40,y:42},{x:40,y:45})).toBe(0);
 });
 it('classic movement accepts far coordinates, charges difficult terrain and rejects blocked destinations',()=>{
  const c=arena();
  const route=tacticalRoute(c.combat!,{x:31,y:50})!;
  expect(trainingRouteCost(route,map)).toBe(10);
  expect(moveDuelToken(c,31,50).combat).toMatchObject({playerPosition:{x:31,y:50},movementUsed:10});
  expect(()=>moveDuelToken(c,30,48)).toThrow(/blocks/);
  expect(()=>moveDuelToken(c,60,50)).toThrow(/outside/);
 });
 it('classic direct attacks cannot target total cover and apply partial cover to AC',()=>{
  expect(()=>takeDuelTurnAction(arena({x:28,y:46},{x:32,y:46}),'shortbow')).toThrow(/total cover/);
  // Base AC 12, 3/4 cover raises it to 17. A fixed total of 16 misses.
  const c=arena({x:32,y:46},{x:36,y:46});
  const prepared=takeDuelTurnAction(c,'shortbow');
  const bonus=5;
  vi.spyOn(crypto,'getRandomValues').mockImplementation(((a:Uint32Array)=>{a[0]=16-bonus-1;return a;}) as typeof crypto.getRandomValues);
  expect(rollDuelAttack(prepared,'hit').combat?.attack?.hit).toBe(false);
 });
 it('preserves the legacy training map when no battlefield is stored',()=>{
  const c=arena();delete c.combat!.battlefield;
  expect(tacticalRoute(c.combat!,{x:31,y:50})).toBeNull();
 });
});
describe('three permanent encounter generators',()=>{
 const environments=[['warehouse-vermin',40,32,50],['roadside-bandit',32,60,75],['ruins-goblin-scouts',48,40,100]] as const;
 for(const [id,width,height,xp] of environments){
  it(id+' generates repeatable connected maps, with variation on a new seed',()=>{
   for(let i=0;i<8;i++){
    const seed='playthrough-'+i,g=generateBattlefield(id,seed);
    expect(g.battlefield).toMatchObject({width,height});
    expect(generateBattlefield(id,seed)).toEqual(g);
    expect(validateBattlefieldAccess(g.battlefield,[...g.starts,...g.enemyStarts,...g.exits])).toBe(true);
    expect(new Set([...g.starts,...g.enemyStarts].map(p=>p.x+','+p.y)).size).toBe(4);
   }
   expect(generateBattlefield(id,'a').battlefield).not.toEqual(generateBattlefield(id,'b').battlefield);
   const {scenario,assessment}=buildSoloEncounter(id,'dasahi','playthrough-a');
   expect(assessment.xp).toBe(xp);
   expect(fitsBattlefield({x:width-1,y:height-1},scenario)).toBe(true);
   expect(fitsBattlefield({x:width-1,y:height},scenario)).toBe(false);
   expect(validateCombatScenario(JSON.parse(JSON.stringify(scenario)),'dasahi')).toEqual(scenario);
  });
 }
 it('rejects overlapping or obstructed starting positions',()=>{
  const g=generateBattlefield('warehouse-vermin','validation');
  expect(validateGeneratedBattlefield({...g,enemyStarts:[g.starts[0],g.enemyStarts[1]]})).toBe(false);
  const p=g.starts[0];
  expect(validateGeneratedBattlefield({...g,battlefield:{...g.battlefield,objects:[...g.battlefield.objects,{id:'sealed',kind:'wall',x:p.x-1,y:p.y-1,width:3,height:3}]}})).toBe(false);
 });
 it('checks 450 seeded battlefields for stable persistence and tactical access',()=>{
  for(const id of ['warehouse-vermin','roadside-bandit','ruins-goblin-scouts'] as const){
   const layouts=new Set<string>();
   for(let i=0;i<150;i++){
    const generated=generateBattlefield(id,'campaign-'+i);
    expect(validateGeneratedBattlefield(generated)).toBe(true);
    expect(battlefieldApproachCount(generated.battlefield,generated.starts[0])).toBeGreaterThanOrEqual(2);
    expect(generateBattlefield(id,'campaign-'+i)).toEqual(JSON.parse(JSON.stringify(generated)));
    layouts.add(JSON.stringify(generated.battlefield.objects));
   }
   expect(layouts.size).toBeGreaterThan(100);
  }
 });
 it('classic encounter handoff keeps world positions and full saved map without regeneration',()=>{
  const {scenario}=buildSoloEncounter('warehouse-vermin','dasahi','persistent');
  const c={...newCampaign('Dynamic handoff','handoff'),characterIdentity:{classId:'rogue'},
   adventureSession:{status:'exploring',site:'frontier',characterSource:'campaign-character',visited:[],interactions:[],
    pendingEncounter:{actionId:'test-action',enemyName:'Rats',scenario}}} as unknown as Campaign;
  const result=restorePracticeEncounter(c);
  expect(result.combat?.battlefield).toEqual(scenario.battlefield);
  expect(result.combat?.playerPosition).toEqual(scenario.starts[0]);
  expect(result.combat?.enemyPosition).toEqual(scenario.actors[0].square);
  expect(result.combat?.secondStart).toEqual(scenario.actors[1].square);
  const reloaded=JSON.parse(JSON.stringify(result)) as Campaign;
  expect(restorePracticeEncounter(reloaded)).toBe(reloaded);
  expect(reloaded.combat?.battlefield).toEqual(scenario.battlefield);
 });
});
