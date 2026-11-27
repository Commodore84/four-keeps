import {describe,it,expect} from 'vitest';
import {battlefieldBlocked,battlefieldCover,battlefieldOpaqueSightBlocked,type Battlefield} from './battlefield';
import {generateBattlefield} from './battlefieldGenerator';
import {enemyRole,enemyHasAttackLine,isConcealedFrom,selectEnemyTactic,tacticalSight,obscuredAt} from './tacticalEnemyAI';
import {newCampaign,rollDuelInitiative,resolveDuelEnemyTurn,type Campaign} from './campaign';
import {makeCombatLabEncounter} from './combatLab';

const open:Battlefield={width:24,height:18,theme:'warehouse',objects:[]};
const fixture=(name:string,map:Battlefield=open,enemy={x:13,y:9},player={x:3,y:9},hidden=false):Campaign=>{
 const campaign=newCampaign('Enemy tactics');
 campaign.combat={status:'initiative-set',enemyName:name,enemyInitiative:16,
  enemyHp:11,enemyMaxHp:11,enemyPosition:enemy,playerPosition:player,
  round:1,turnIndex:0,order:[name,'Nighthawk'],movementAllowance:35,
  playerHidden:hidden,hideTotal:hidden?99:undefined,lastKnownPlayerPosition:hidden?{x:4,y:9}:undefined,
  battlefield:map,classicAdventure:{origin:'dm',scenarioLocation:'Combat Lab',
   first:{id:name.toLowerCase().replaceAll(' ','-'),name,hp:11,maxHp:11,speed:30,
    attackBonus:3,damageDice:'1d6',damageModifier:1,ac:13,
    ...(name==='Bandit'?{rangedWeapon:{name:'Light Crossbow',bonus:3,damageDice:'1d8',damageModifier:1,normalFeet:80,longFeet:320}}:
      name.startsWith('Goblin')?{rangedWeapon:{name:'Shortbow',bonus:4,damageDice:'1d6',damageModifier:2,normalFeet:80,longFeet:320}}:{})}}};
 return campaign;
};
describe('Phase 3 tactical awareness',()=>{
 it('is directional and distinguishes concealment from difficult ground',()=>{
  const map:Battlefield={width:12,height:12,objects:[
   {id:'wall',kind:'wall',x:5,y:4,width:1,height:1},
   {id:'thicket',kind:'undergrowth',x:2,y:6,width:1,height:1},
   {id:'rubble',kind:'rubble',x:2,y:8,width:1,height:1}]};
  expect(tacticalSight(map,{x:2,y:4},{x:9,y:4}).visible).toBe(false);
  expect(tacticalSight(map,{x:2,y:2},{x:9,y:2}).visible).toBe(true);
  expect(isConcealedFrom(map,{x:2,y:6},{x:9,y:6})).toBe(true);
  expect(obscuredAt(map,{x:2,y:8})).toBe(false);
  expect(isConcealedFrom(map,{x:2,y:8},{x:9,y:8})).toBe(false);
 });
 it.each([
  ['warehouse-vermin','rat'],['roadside-bandit','bandit'],['ruins-goblin-scouts','goblin']
 ] as const)('chooses deterministic, navigable %s tactics with correct directional cover', (environment,role)=>{
  const g=generateBattlefield(environment,'tactical-awareness-v1');
  const input={map:g.battlefield,start:g.enemyStarts[0],target:g.starts[0],
   ally:g.enemyStarts[1],speedFeet:30,role};
  const plan=selectEnemyTactic(input);
  expect(selectEnemyTactic(input)).toEqual(plan);
  expect(plan.movementFeet).toBeLessThanOrEqual(30);
  expect(plan.movementFeet).toBeGreaterThanOrEqual(0);
  expect(battlefieldBlocked(g.battlefield,plan.position)).toBe(false);
  expect(plan.position).not.toEqual(g.starts[0]);
  expect(plan.targetCover).toBe(battlefieldCover(g.battlefield,plan.position,g.starts[0]));
  expect(plan.defensiveCover).toBe(battlefieldCover(g.battlefield,g.starts[0],plan.position));
 });
 it('ranged goblins and bandits fire without needing melee reach',()=>{
  for(const name of ['Goblin Warrior','Bandit']){
   const result=resolveDuelEnemyTurn(fixture(name));
   expect(result.combat?.enemyLastTurn).toContain(name==='Bandit'?'Light Crossbow':'Shortbow');
   expect(result.combat?.enemyLastTurn).toContain('fires');
   expect(result.combat?.turnIndex).toBe(1);
   expect(result.combat?.enemyPosition).toBeDefined();
  }
 });
 it('giant rats close to melee and do not manufacture ranged attacks',()=>{
  const result=resolveDuelEnemyTurn(fixture('Giant Rat',open,{x:8,y:9},{x:3,y:9}));
  expect(result.combat?.enemyLastTurn).not.toMatch(/Shortbow|Crossbow|fires/);
  expect(result.combat?.enemyLastTurn).toContain('biting range');
 });
 it('Search uses the last known area, never the hidden actual position',()=>{
  const map:Battlefield={width:22,height:20,objects:[{id:'wall',kind:'wall',x:10,y:0,width:1,height:20}]};
  const c=fixture('Bandit',map,{x:4,y:9},{x:17,y:9},true);
  const before=selectEnemyTactic({map,start:c.combat!.enemyPosition!,target:c.combat!.playerPosition!,
   lastKnown:c.combat!.lastKnownPlayerPosition,speedFeet:30,role:'bandit',hidden:true});
  const other=selectEnemyTactic({map,start:c.combat!.enemyPosition!,target:{x:18,y:14},
   lastKnown:c.combat!.lastKnownPlayerPosition,speedFeet:30,role:'bandit',hidden:true});
  expect(before).toEqual(other);
  expect(before.mode).toBe('search');
  const result=resolveDuelEnemyTurn(c);
  expect(result.combat?.playerHidden).toBe(true);
  expect(result.combat?.enemyLastTurn).toContain('Search');
  expect(result.combat?.enemyLastTurn).not.toContain(' fires ');
 });
 it('reveals hidden characters in unobstructed sight before enemies attack',()=>{
  const result=resolveDuelEnemyTurn(fixture('Goblin Warrior',open,{x:13,y:9},{x:3,y:9},true));
  expect(result.combat?.playerHidden).toBe(false);
  expect(result.combat?.enemyLastTurn).toContain('spotted in the open');
 });
 it.each([
  ['warehouse-vermin','Giant Rat','rat'],
  ['roadside-bandit','Bandit','bandit'],
  ['ruins-goblin-scouts','Goblin Warrior','goblin']
 ] as const)('executes seeded %s turns through the saved classic combat engine', (environment,name,role)=>{
  const lab=makeCombatLabEncounter(environment,'lab-ai-role-2024',null,'2026-11-25T19:00:00.000Z');
  const initialized=rollDuelInitiative(lab);
  const first=initialized.combat!.enemyName;
  expect(first).toContain(name);
  expect(enemyRole(first)).toBe(role);
  const index=initialized.combat!.order!.indexOf(first);
  const state={...initialized,combat:{...initialized.combat!,turnIndex:index}};
  const position=state.combat.enemyPosition!;
  const opponent=state.combat.classicAdventure!.first;
  if(role==='goblin'||role==='bandit')expect(opponent.rangedWeapon?.longFeet).toBeGreaterThan(80);
  const result=resolveDuelEnemyTurn(state);
  expect(result.combat?.turnIndex).not.toBe(index);
  expect(result.combat?.battlefield).toEqual(state.combat.battlefield);
  expect(result.combat?.enemyLastTurn).toBeTruthy();
  const moved=result.combat!.enemyPosition!;
  expect(battlefieldBlocked(result.combat!.battlefield!,moved)).toBe(false);
  expect(moved).not.toEqual(result.combat!.playerPosition);
  expect(Math.max(Math.abs(moved.x-position.x),Math.abs(moved.y-position.y))*5).toBeLessThanOrEqual(opponent.speed);
  expect(result.combat!.enemyLastTurn).not.toContain('Training Dummy');
 });
 it('applies long-range Disadvantage to crossbow attacks beyond 80 feet',()=>{
  const huge:Battlefield={width:72,height:20,objects:[]};
  const result=resolveDuelEnemyTurn(fixture('Bandit',huge,{x:4,y:10},{x:50,y:10}));
  expect(result.combat?.enemyLastTurn).toContain('fires Light Crossbow');
  expect(result.combat?.enemyLastTurn).toContain('disadvantage');
 });
 it('uses giant rat Pack Tactics Advantage with another living ally in melee reach',()=>{
  const c=fixture('Giant Rat',open,{x:5,y:9},{x:4,y:9});
  c.combat!.secondEnemy={name:'Giant Rat 2',initiative:4,
   position:{x:4,y:8},hp:7,maxHp:7,detected:true};
  const resolved=resolveDuelEnemyTurn(c);
  expect(resolved.combat?.enemyLastTurn).toContain('advantage (Pack Tactics');
 });
 it('distinguishes half and three-quarter cover from total blocking for firing',()=>{
  const map:Battlefield={width:16,height:12,objects:[
   {id:'chair',kind:'chair',x:6,y:6,width:1,height:1},
   {id:'cargo',kind:'cargo',x:7,y:8,width:1,height:1},
   {id:'wall',kind:'wall',x:8,y:2,width:1,height:1}
  ]};
  const from={x:2,y:6};
  expect(tacticalSight(map,from,{x:10,y:6}).visible).toBe(true);
  expect([0,2,5]).toContain(tacticalSight(map,from,{x:10,y:6}).cover);
  expect(tacticalSight(map,{x:2,y:2},{x:12,y:2}).cover).toBe('total');
  expect(tacticalSight(map,{x:2,y:4},{x:10,y:4}).cover).not.toBe('total');
 });
 it('recognizes three distinct monster roles',()=>{
  expect(enemyRole('Goblin Warrior')).toBe('goblin');
  expect(enemyRole('Bandit')).toBe('bandit');
  expect(enemyRole('Giant Rat')).toBe('rat');
 });
 it('never treats a center-blocked, partially covered ray as a legal ranged shot',()=>{
  const map:Battlefield={width:24,height:20,objects:[{id:'pillar',kind:'pillar',x:10,y:9,width:1,height:1}]};
  const candidates=Array.from({length:20},(_,y)=>({x:3,y})).flatMap(from=>
   Array.from({length:20},(_,y)=>({from,to:{x:20,y}})));
  const blocked=candidates.find(({from,to})=>battlefieldOpaqueSightBlocked(map,from,to)&&
   battlefieldCover(map,from,to)!=='total');
  expect(blocked).toBeDefined();
  expect(enemyHasAttackLine(map,blocked!.from,blocked!.to)).toBe(false);
  const plan=selectEnemyTactic({map,start:blocked!.from,target:blocked!.to,speedFeet:0,role:'bandit'});
  expect(plan.mode).toBe('wait');
 });
 it('routes melee foes toward an actual opening, not a nearer dead end',()=>{
  const map:Battlefield={width:18,height:14,objects:[
   {id:'barrier',kind:'wall',x:7,y:0,width:1,height:12}]};
  const target={x:12,y:4},start={x:4,y:4};
  const first=selectEnemyTactic({map,start,target,speedFeet:30,role:'rat'});
  expect(first.position.y).toBeGreaterThan(4);
  let position=start;
  for(let i=0;i<7;i++){
   const plan=selectEnemyTactic({map,start:position,target,speedFeet:30,role:'rat'});
   expect(battlefieldBlocked(map,plan.position)).toBe(false);
   position=plan.position;
  }
  expect(Math.max(Math.abs(position.x-target.x),Math.abs(position.y-target.y))).toBeLessThanOrEqual(1);
 });
 it('opens an unlocked obstructing door but never crosses a closed or locked one',()=>{
  const walls=[
   {id:'north',kind:'wall' as const,x:7,y:0,width:1,height:6},
   {id:'south',kind:'wall' as const,x:7,y:7,width:1,height:7}
  ];
  const door={id:'gate',kind:'door' as const,x:7,y:6,width:1,height:1};
  const map:Battlefield={width:18,height:14,objects:[...walls,door]};
  const opts={start:{x:3,y:6},target:{x:12,y:6},speedFeet:30,role:'rat' as const};
  const plan=selectEnemyTactic({map,...opts});
  expect(plan.position.x).toBeLessThan(7);
  expect(plan.openingId).toBe('gate');
  const opened=resolveDuelEnemyTurn(fixture('Giant Rat',map,opts.start,opts.target));
  expect(opened.combat?.battlefield?.objects.find(o=>o.id==='gate')?.open).toBe(true);
  expect(opened.combat?.enemyPosition?.x).toBeLessThan(7);
  const locked:Battlefield={...map,objects:[...walls,{...door,locked:true}]};
  expect(selectEnemyTactic({map:locked,...opts}).openingId).toBeUndefined();
  const held=resolveDuelEnemyTurn(fixture('Giant Rat',locked,opts.start,opts.target));
  expect(held.combat?.battlefield?.objects.find(o=>o.id==='gate')?.open).not.toBe(true);
 });
 it('keeps generated warehouse rats spread while avoiding very distant idle starts',()=>{
  for(let i=0;i<20;i++){
   const g=generateBattlefield('warehouse-vermin','pacing-'+i);
   const player=g.starts[0];
   const ranges=g.enemyStarts.map(enemy=>Math.max(Math.abs(enemy.x-player.x),Math.abs(enemy.y-player.y)));
   expect(Math.max(...ranges)).toBeLessThanOrEqual(24);
   expect(Math.max(Math.abs(g.enemyStarts[0].x-g.enemyStarts[1].x),
    Math.abs(g.enemyStarts[0].y-g.enemyStarts[1].y))).toBeGreaterThanOrEqual(8);
  }
 });

 it('does not execute a ranged attack or deal damage through solid geometry',()=>{
  const wall:Battlefield={width:24,height:18,objects:[
   {id:'solid-wall',kind:'wall',x:10,y:0,width:1,height:18}]};
  const battle=fixture('Bandit',wall,{x:5,y:9},{x:18,y:9});
  const hp=battle.character?.currentHitPoints;
  const resolved=resolveDuelEnemyTurn(battle);
  expect(resolved.combat?.enemyLastTurn).not.toContain('fires');
  expect(resolved.combat?.enemyLastTurn).toContain('waits out of range');
  expect(resolved.character?.currentHitPoints).toBe(hp);
 });
 it('goblins preserve greater standoff distance than bandits when both have clear shots',()=>{
  const target={x:3,y:8},start={x:15,y:8};
  const goblin=selectEnemyTactic({map:open,start,target,role:'goblin',speedFeet:30});
  const bandit=selectEnemyTactic({map:open,start,target,role:'bandit',speedFeet:30});
  expect(goblin.mode).toBe('ranged');
  expect(bandit.mode).toBe('ranged');
  expect(goblin.distanceFeet).toBeGreaterThan(bandit.distanceFeet);
 });

 it('never invents an unlisted ranged weapon for a named enemy',()=>{
  const goblin=fixture('Goblin Warrior');
  delete goblin.combat!.classicAdventure!.first.rangedWeapon;
  const resolved=resolveDuelEnemyTurn(goblin);
  expect(resolved.combat?.enemyLastTurn).not.toContain('fires');
  expect(resolved.combat?.enemyLastTurn).not.toContain('Shortbow');
 });

});
