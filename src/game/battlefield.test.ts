import {describe,it,expect,vi,afterEach} from 'vitest';
import {battlefieldBlocked,battlefieldContains,battlefieldCover,battlefieldDifficult,validateBattlefield,toggleBattlefieldDoor,toggleBattlefieldOpening,battlefieldDoorWithinReach,type Battlefield} from './battlefield';
import {generateBattlefield,validateBattlefieldAccess,validateGeneratedBattlefield,battlefieldApproachCount,battlefieldTacticalProfile,battlefieldAlternativeApproaches} from './battlefieldGenerator';
import {buildSoloEncounter} from './encounterDirector';
import {fitsBattlefield,validateCombatScenario} from './combatScenario';
import {newCampaign,moveDuelToken,interactDuelBattlefieldDoor,interactDuelBattlefieldOpening,tacticalRoute,takeDuelTurnAction,rollDuelAttack,trainingRouteCost,type Campaign} from './campaign';
import {restorePracticeEncounter} from './practiceEncounterBridge';
import {chooseDuelEntry,rollDuelInitiative} from './campaign';

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
describe('spread encounter starts and optional player deployment',()=>{
 for(const id of ['warehouse-vermin','roadside-bandit','ruins-goblin-scouts'] as const){
  it(id+' varies enemy distance with both close ambushes and typical distant encounters',()=>{
   const seen=new Set<string>(),distances:number[]=[];
   for(let i=0;i<100;i++){
    const g=generateBattlefield(id,'spread-seed-'+i),[a,b]=g.enemyStarts;
    const range=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
    expect(range).toBeGreaterThan(0);
    distances.push(Math.min(...g.enemyStarts.map(e=>Math.max(Math.abs(g.starts[0].x-e.x),Math.abs(g.starts[0].y-e.y)))));
    expect(validateGeneratedBattlefield(g)).toBe(true);
    expect(g.battlefield.objects.some(o=>o.kind==='door'||o.kind==='tree'||o.kind==='wall')).toBe(true);
    seen.add(a.x+','+a.y+':'+b.x+','+b.y);
   }
   expect(seen.size).toBeGreaterThan(55);
   expect(distances.filter(n=>n<=7).length).toBeGreaterThan(0);
   expect(distances.filter(n=>n>=12).length).toBeGreaterThan(60);
  });
 }
 it('allows selecting an authored open entry before initiative, retaining it after the roll and save',()=>{
  const scenario=buildSoloEncounter('warehouse-vermin','combat-lab','spread-choice').scenario;
  expect(scenario.entryOptions?.map(o=>o.label)).toEqual(['West doorway','North loading aisle','South storage aisle']);
  const pending={...newCampaign('Test','entry-saved'),adventureSession:{status:'exploring',site:'frontier',characterSource:'campaign-character',visited:['frontier'],interactions:[],pendingEncounter:{enemyName:'Giant Rats',actionId:'choice',scenario}}} as Campaign;
  const combat=restorePracticeEncounter(pending);
  expect(combat.combat?.status).toBe('awaiting-initiative');
  expect(combat.combat?.entryOptions).toEqual(scenario.entryOptions);
  const moved=chooseDuelEntry(combat,2);
  expect(moved.combat?.playerPosition).toEqual(scenario.starts[2]);
  expect(moved.combat?.movementUsed??0).toBe(0);
  expect(JSON.parse(JSON.stringify(moved.combat?.playerPosition))).toEqual(scenario.starts[2]);
  const rolled=rollDuelInitiative(moved);
  expect(rolled.combat?.playerPosition).toEqual(scenario.starts[2]);
  expect(()=>chooseDuelEntry(rolled,0)).toThrow('before initiative');
  expect(()=>chooseDuelEntry(combat,99)).toThrow('before initiative');
  expect(()=>chooseDuelEntry(combat,-1)).toThrow('before initiative');
 });
 it('keeps the roadside encounter fixed and rejects unverified or blocked deployment options',()=>{
  const fixed=buildSoloEncounter('roadside-bandit','combat-lab','roadside-fixed').scenario;
  expect(fixed.entryOptions).toBeUndefined();
  const sample=buildSoloEncounter('ruins-goblin-scouts','combat-lab','ruins-deployment').scenario;
  expect(sample.entryOptions).toHaveLength(3);
  expect(()=>validateCombatScenario({...sample,entryOptions:[{label:'Forbidden',square:sample.actors[0].square},{label:'West',square:sample.starts[0]}]},'test')).toThrow('Entries must name unique');
  expect(()=>validateCombatScenario({...sample,entryOptions:[{label:'Duplicate',square:sample.starts[0]},{label:'Again',square:sample.starts[0]}]},'test')).toThrow('Entries must name unique');
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
    expect(new Set([...g.starts,...g.enemyStarts].map(p=>p.x+','+p.y)).size).toBe(g.starts.length+g.enemyStarts.length);
   }
   expect(generateBattlefield(id,'a').battlefield).not.toEqual(generateBattlefield(id,'b').battlefield);
   const {scenario,assessment}=buildSoloEncounter(id,'dasahi','playthrough-a');
   expect(assessment.xp).toBe(xp);
   expect(fitsBattlefield({x:width-1,y:height-1},scenario)).toBe(true);
   expect(fitsBattlefield({x:width-1,y:height},scenario)).toBe(false);
   expect(validateCombatScenario(JSON.parse(JSON.stringify(scenario)),'dasahi')).toEqual(scenario);
  });
 }
 it('opens and closes doors with persistent physical effects and occupied-door protection',()=>{
  const g=generateBattlefield('warehouse-vermin','door-test');
  const door=g.battlefield.objects.find(o=>o.kind==='door')!;
  const c=arena({x:3,y:16},{x:9,y:14});
  const campaign={...c,combat:{...c.combat!,battlefield:g.battlefield}};
  expect(battlefieldDoorWithinReach(door,{x:3,y:16})).toBe(true);
  expect(battlefieldBlocked(g.battlefield,{x:door.x,y:door.y})).toBe(true);
  const opened=interactDuelBattlefieldDoor(campaign,door.id);
  expect(opened.combat!.objectInteractionUsed).toBe(true);
  expect(opened.combat!.actionUsed).toBeFalsy();
  expect(opened.combat!.battlefield!.objects.find(o=>o.id===door.id)!.open).toBe(true);
  expect(battlefieldBlocked(opened.combat!.battlefield!,{x:door.x,y:door.y})).toBe(false);
  expect(JSON.parse(JSON.stringify(opened.combat!.battlefield))).toEqual(opened.combat!.battlefield);
  expect(()=>interactDuelBattlefieldDoor(opened,door.id)).toThrow('free object interaction');
  expect(()=>toggleBattlefieldDoor(opened.combat!.battlefield!,door.id,[{x:door.x,y:door.y}])).toThrow('standing in the doorway');
  const closed=toggleBattlefieldDoor(opened.combat!.battlefield!,door.id);
  expect(battlefieldBlocked(closed,{x:door.x,y:door.y})).toBe(true);
  expect(()=>validateBattlefield({...g.battlefield,objects:g.battlefield.objects.map(o=>o.id===door.id?{...o,open:'yes'}:o)})).toThrow('Invalid battlefield object');
  expect(()=>validateBattlefield({...g.battlefield,objects:g.battlefield.objects.map(o=>o.id===door.id?{...o,kind:'crate',open:true}:o)})).toThrow();
  const moved=moveDuelToken(opened,door.x,door.y);
  expect(moved.combat!.playerPosition).toEqual({x:door.x,y:door.y});
 });
 it('opening a window changes movement, terrain costs, cover, and persisted state',()=>{
  const m:Battlefield={width:12,height:10,objects:[{id:'casement',kind:'window',x:4,y:4,width:1,height:1}],theme:'ruins'};
  const c=arena({x:3,y:4},{x:8,y:4});
  const campaign={...c,combat:{...c.combat!,battlefield:m}};
  expect(battlefieldBlocked(m,{x:4,y:4})).toBe(true);
  expect(battlefieldCover(m,{x:2,y:4},{x:7,y:4})).toBe(5);
  const opened=interactDuelBattlefieldOpening(campaign,'casement');
  expect(opened.combat!.objectInteractionUsed).toBe(true);
  expect(opened.combat!.actionUsed).toBeFalsy();
  expect(battlefieldBlocked(opened.combat!.battlefield!,{x:4,y:4})).toBe(false);
  expect(battlefieldDifficult(opened.combat!.battlefield!,{x:4,y:4})).toBe(true);
  expect(battlefieldCover(opened.combat!.battlefield!,{x:2,y:4},{x:7,y:4})).toBe(0);
  expect(JSON.parse(JSON.stringify(opened.combat!.battlefield))).toEqual(opened.combat!.battlefield);
  expect(()=>toggleBattlefieldOpening(opened.combat!.battlefield!,'casement',[{x:4,y:4}])).toThrow('window opening');
  expect(()=>interactDuelBattlefieldOpening(opened,'casement')).toThrow('free object interaction');
  const closed=toggleBattlefieldOpening(opened.combat!.battlefield!,'casement');
  expect(battlefieldBlocked(closed,{x:4,y:4})).toBe(true);
  expect(battlefieldDifficult(closed,{x:4,y:4})).toBe(false);
  expect(battlefieldCover(closed,{x:2,y:4},{x:7,y:4})).toBe(5);
  expect(()=>interactDuelBattlefieldDoor(campaign,'casement')).toThrow('interactive door');
  expect(validateBattlefield(opened.combat!.battlefield!)).toEqual(opened.combat!.battlefield);
 });
 it('windows obstruct movement but permit attacks with three-quarter cover',()=>{
  const m:Battlefield={width:9,height:7,objects:[{id:'pane',kind:'window',x:4,y:3,width:1,height:1}]};
  expect(battlefieldBlocked(m,{x:4,y:3})).toBe(true);
  expect(battlefieldCover(m,{x:2,y:3},{x:7,y:3})).toBe(5);
  expect(battlefieldCover(m,{x:2,y:1},{x:7,y:1})).toBe(0);
 });
 it('open doors permit clear line of sight, while closed doors provide total cover',()=>{
  const m:Battlefield={width:10,height:8,objects:[{id:'entry',kind:'door',x:4,y:3,width:1,height:1}]};
  expect(battlefieldCover(m,{x:2,y:3},{x:7,y:3})).toBe('total');
  const opened=toggleBattlefieldDoor(m,'entry');
  expect(battlefieldCover(opened,{x:2,y:3},{x:7,y:3})).toBe(0);
  expect(battlefieldBlocked(opened,{x:4,y:3})).toBe(false);
  expect(m.objects[0].open).toBeUndefined();
 });
 it('does not mistake a dead-end side spur for a second tactical route',()=>{
  const map:Battlefield={width:8,height:6,objects:[
   {id:'north-wall',kind:'wall',x:0,y:1,width:8,height:1},
   {id:'south-wall',kind:'wall',x:0,y:4,width:8,height:1},
   {id:'spur-wall',kind:'wall',x:2,y:3,width:1,height:1}
  ]};
  expect(battlefieldAlternativeApproaches(map,{x:2,y:2},{x:7,y:2})).toBe(1);
 });
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
    expect(battlefieldTacticalProfile(generated)).toMatchObject({alternativeApproaches:expect.any(Number),coverKinds:expect.any(Number),roughTiles:expect.any(Number)});
    expect(battlefieldTacticalProfile(generated).alternativeApproaches).toBeGreaterThanOrEqual(2);
    expect(battlefieldApproachCount(generated.battlefield,generated.starts[0])).toBeGreaterThanOrEqual(2);
    expect(generateBattlefield(id,'campaign-'+i)).toEqual(JSON.parse(JSON.stringify(generated)));
    layouts.add(JSON.stringify(generated.battlefield.objects));
   }
   expect(layouts.size).toBeGreaterThan(100);
  }
 },60000);
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
