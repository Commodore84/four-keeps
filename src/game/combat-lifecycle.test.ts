import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginDuel, concludeDuel, newCampaign, quitTrainingEncounter, rollDuelAttack,
  selectTrainingTarget, takeDuelTurnAction, utilizeCombatItem, takeCombatSkillAction, readyCombatAction, resolveReadiedCombatReaction, resolveDuelEnemyTurn, type Campaign,
} from './campaign';
import { createBackup, parseBackup } from './backup';
import { availableCombatMovement, combatAttackRollPreview } from './combat-ui';

type Combat = NonNullable<Campaign['combat']>;
function arena(overrides:Partial<Combat>={}):Campaign {
  const c=newCampaign('Lifecycle test','lifecycle');
  return {...c,combat:{
    status:'initiative-set',enemyName:'Training Dummy',enemyInitiative:10,
    playerInitiative:20,round:1,order:['Nighthawk','Training Dummy'],
    turnIndex:0,playerPosition:{x:2,y:10},enemyPosition:{x:10,y:2},
    enemyHp:12,enemyMaxHp:12,movementUsed:0,movementAllowance:35,
    arrowsRemaining:20,daggersAvailable:2,selectedEnemy:'first',...overrides,
  }};
}
function dice(...rolls:number[]) {
  let index=0;
  vi.spyOn(crypto,'getRandomValues').mockImplementation(((array:Uint32Array)=>{
    if(index>=rolls.length)throw Error('Unexpected random roll');
    array[0]=rolls[index++]-1;return array;
  }) as typeof crypto.getRandomValues);
  return ()=>expect(index).toBe(rolls.length);
}
afterEach(()=>vi.restoreAllMocks());

describe('encounter victory and targeting',()=>{
  it('finishing the only enemy completes victory and permits conclusion',()=>{
    const consumed=dice(18,6);
    let c=arena({enemyHp:1});
    c=takeDuelTurnAction(c,'shortbow');
    c=rollDuelAttack(c,'hit');
    c=rollDuelAttack(c,'damage',false);
    expect(c.combat?.enemyHp).toBe(0);
    expect(c.combat?.status).toBe('completed');
    expect(c.combat?.outcome).toBe('nonlethal-victory');
    const done=concludeDuel(c);
    expect(done.combat).toBeUndefined();
    expect(done.character?.currentHitPoints).toBe(done.character?.maxHitPoints);
    expect(done.equipment?.arrows).toBe(20);
    consumed();
  });
  it('defeating one of two enemies automatically targets the survivor',()=>{
    const consumed=dice(18,5);
    const second={name:'Training Dummy 2',initiative:8,position:{x:8,y:2},hp:12,maxHp:12,detected:false};
    let c=arena({enemyHp:1,secondEnemy:second,order:['Nighthawk','Training Dummy','Training Dummy 2']});
    c=takeDuelTurnAction(c,'shortbow');
    c=rollDuelAttack(c,'hit');
    c=rollDuelAttack(c,'damage',false);
    expect(c.combat?.enemyHp).toBe(0);
    expect(c.combat?.status).toBe('initiative-set');
    expect(c.combat?.selectedEnemy).toBe('second');
    expect(()=>selectTrainingTarget(c,'first')).toThrow(/defeated/);
    consumed();
  });
  it('conclusion is blocked while any opponent survives',()=>{
    const second={name:'Training Dummy 2',initiative:8,position:{x:8,y:2},hp:12,maxHp:12,detected:false};
    expect(()=>concludeDuel(arena({enemyHp:0,secondEnemy:second}))).toThrow(/not ended/);
  });
  it('defeating the second opponent also completes the encounter',()=>{
    const consumed=dice(18,6);
    const second={name:'Training Dummy 2',initiative:8,position:{x:8,y:2},hp:1,maxHp:12,detected:false};
    let c=arena({enemyHp:0,secondEnemy:second,selectedEnemy:'second',
      order:['Nighthawk','Training Dummy','Training Dummy 2']});
    c=takeDuelTurnAction(c,'shortbow');
    c=rollDuelAttack(c,'hit');
    c=rollDuelAttack(c,'damage',false);
    expect(c.combat?.status).toBe('completed');
    expect(c.combat?.secondEnemy?.hp).toBe(0);
    expect(concludeDuel(c).combat).toBeUndefined();
    consumed();
  });
});

describe('defeat and encounter reset',()=>{
  it('enemy defeat can be concluded and restores training HP',()=>{
    const consumed=dice(20,2,2);
    const c=arena({turnIndex:1,enemyPosition:{x:3,y:10},owl:undefined});
    const low={...c,character:{...c.character!,currentHitPoints:1}};
    const defeated=resolveDuelEnemyTurn(low);
    expect(defeated.combat?.status).toBe('completed');
    expect(defeated.combat?.outcome).toBe('player-defeated');
    expect(defeated.character?.currentHitPoints).toBe(0);
    const done=concludeDuel(defeated);
    expect(done.combat).toBeUndefined();
    expect(done.character?.currentHitPoints).toBe(done.character?.maxHitPoints);
    consumed();
  });
  it('quit resets an unfinished encounter, equipment and HP',()=>{
    const c=arena({arrowsRemaining:4,daggersAvailable:0,daggersThrown:2});
    const damaged={...c,character:{...c.character!,currentHitPoints:2},
      equipment:{daggers:0,arrows:4,caltrops:5,ballBearings:7}};
    const done=quitTrainingEncounter(damaged);
    expect(done.combat).toBeUndefined();
    expect(done.character?.currentHitPoints).toBe(done.character?.maxHitPoints);
    expect(done.equipment).toEqual({daggers:2,arrows:20,caltrops:5,ballBearings:7});
  });
  it('a new training encounter starts cleanly after resetting the previous one',()=>{
    const c=quitTrainingEncounter(arena({arrowsRemaining:0,enemyHp:1}));
    const consumed=dice(12);
    const restarted=beginDuel(c,'Training Dummy');
    expect(restarted.combat?.status).toBe('awaiting-initiative');
    expect(restarted.combat?.round).toBe(1);
    expect(restarted.combat?.enemyHp).toBeUndefined();
    consumed();
  });
});

describe('combat persistence and recovery',()=>{
  it('backup round-trip preserves a pending attack and permits finishing it',()=>{
    const consumed=dice(16,5);
    let c=takeDuelTurnAction(arena(),'shortbow');
    c=rollDuelAttack(c,'hit');
    expect(c.combat?.attack?.phase).toBe('roll-damage');
    const backup=createBackup(c,'2026-11-09T00:00:00Z');
    const restored=parseBackup(JSON.stringify(backup));
    expect(restored.combat).toEqual(c.combat);
    expect(restored.journal).toEqual(c.journal);
    const finished=rollDuelAttack(restored,'damage',false);
    expect(finished.combat?.attack?.phase).toBe('resolved');
    consumed();
  });
  it('JSON reload preserves spent resources, target, and attack preview',()=>{
    const second={name:'Training Dummy 2',initiative:8,position:{x:8,y:2},hp:12,maxHp:12,detected:false};
    let c=arena({secondEnemy:second,order:['Nighthawk','Training Dummy','Training Dummy 2']});
    c=selectTrainingTarget(c,'second');
    c=takeDuelTurnAction(c,'steady-aim');
    const restored=JSON.parse(JSON.stringify(c)) as Campaign;
    expect(restored.combat).toEqual(c.combat);
    expect(restored.combat?.selectedEnemy).toBe('second');
    expect(availableCombatMovement(restored.combat!)).toBe(0);
    expect(combatAttackRollPreview(restored.combat!,'shortbow')).toBe('Advantage');
    expect(restored.combat?.bonusActionUsed).toBe(true);
  });
  it('a resumed encounter keeps initiative order and progresses into the next round',()=>{
    let c=takeDuelTurnAction(arena(),'steady-aim');
    c=parseBackup(JSON.stringify(createBackup(c)));
    c=takeDuelTurnAction(c,'end');
    c=resolveDuelEnemyTurn(c);
    expect(c.combat?.round).toBe(2);
    expect(c.combat?.turnIndex).toBe(0);
    expect(availableCombatMovement(c.combat!)).toBe(35);
  });
});

describe('Utilize combat action',()=>{
 it('consumes one caltrops unit, spends Action and logs DM adjudication',()=>{
  const c=arena();const supplied={...c,equipment:{daggers:2,arrows:20,caltrops:2,ballBearings:1}};
  const result=utilizeCombatItem(supplied,'caltrops');
  expect(result.equipment?.caltrops).toBe(1);
  expect(result.equipment?.ballBearings).toBe(1);
  expect(result.combat?.actionUsed).toBe(true);
  expect(result.combat?.lastAction).toBe('Utilize: Caltrops');
  expect(result.journal.at(-1)?.text).toMatch(/DM adjudication/);
  expect(()=>takeDuelTurnAction(result,'dodge')).toThrow(/Action already used/);
 });
 it('uses ball bearings without changing unrelated equipment',()=>{
  const c=arena();const result=utilizeCombatItem({...c,equipment:{daggers:2,arrows:20,caltrops:1,ballBearings:2}},'ballBearings');
  expect(result.equipment).toMatchObject({daggers:2,arrows:20,caltrops:1,ballBearings:1});
 });
 it('rejects unavailable items without consuming an Action',()=>{
  const c=arena();expect(()=>utilizeCombatItem(c,'caltrops')).toThrow(/No caltrops/);
  expect(c.combat?.actionUsed).toBeFalsy();
 });
 it('rejects spent Actions and opponent turns',()=>{
  const c=arena();const supplied={...c,equipment:{daggers:2,arrows:20,caltrops:1,ballBearings:1}};
  expect(()=>utilizeCombatItem({...supplied,combat:{...c.combat!,actionUsed:true}},'caltrops')).toThrow(/Action already used/);
  expect(()=>utilizeCombatItem({...supplied,combat:{...c.combat!,turnIndex:1}},'caltrops')).toThrow(/Nighthawk/);
 });
 it('preserves deployed item expenditure through backup and restores Action next turn',()=>{
  const c=arena();const supplied={...c,equipment:{daggers:2,arrows:20,caltrops:1,ballBearings:1}};
  const used=utilizeCombatItem(supplied,'ballBearings');
  const restored=parseBackup(JSON.stringify(createBackup(used)));
  expect(restored.equipment?.ballBearings).toBe(0);
  expect(restored.combat?.actionUsed).toBe(true);
  const ended=takeDuelTurnAction(restored,'end');
  expect(ended.combat?.actionUsed).toBe(false);
 });
});

describe('2024 Search Study Influence and Ready actions',()=>{
 for(const [action,skill] of [['Search','Perception'],['Study','Arcana'],['Influence','Persuasion']] as const){
  it(action+' rolls a skill check and spends exactly one Action',()=>{
   const consumed=dice(13);
   const result=takeCombatSkillAction(arena(),action,skill);
   expect(result.combat?.actionUsed).toBe(true);
   expect(result.combat?.lastSkillAction).toMatchObject({action,skill,roll:13});
   expect(result.journal.at(-1)?.text).toMatch(/DM determines/);
   expect(()=>takeCombatSkillAction(result,action,skill)).toThrow(/Action already used/);
   consumed();
  });
 }
 it('Search Investigation uses Intelligence, not Wisdom',()=>{
  const consumed=dice(10);
  const c=arena();
  const result=takeCombatSkillAction(c,'Search','Investigation');
  expect(result.combat?.lastSkillAction?.total).toBe(10+Math.floor(((c.character?.scores.int??10)-10)/2));
  consumed();
 });
 it('rejects invalid skill selections and opponent turns without rolling',()=>{
  expect(()=>takeCombatSkillAction(arena(),'Study','Persuasion')).toThrow(/not a valid/);
  expect(()=>takeCombatSkillAction(arena({turnIndex:1}),'Search','Perception')).toThrow(/Nighthawk/);
 });
 it('Ready records a trigger, consumes Action, persists through backup, and spends Reaction when triggered',()=>{
  const c=readyCombatAction(arena(),'enemy enters reach','attack with dagger');
  expect(c.combat?.actionUsed).toBe(true);
  expect(c.combat?.readiedAction).toMatchObject({trigger:'enemy enters reach',response:'attack with dagger'});
  const restored=parseBackup(JSON.stringify(createBackup(c)));
  const enemyTurn=takeDuelTurnAction(restored,'end');
  expect(enemyTurn.combat?.readiedAction?.response).toBe('attack with dagger');
  const reacted=resolveReadiedCombatReaction(enemyTurn);
  expect(reacted.combat?.reactionUsed).toBe(true);
  expect(reacted.combat?.readiedAction).toBeUndefined();
  expect(()=>resolveReadiedCombatReaction(reacted)).toThrow(/No readied action/);
 });
 it('Ready requires a declaration and an available Action',()=>{
  expect(()=>readyCombatAction(arena(),'','attack')).toThrow(/requires a trigger/);
  expect(()=>readyCombatAction(arena({actionUsed:true}),'when approached','attack')).toThrow(/Action already used/);
  expect(()=>readyCombatAction(arena({turnIndex:1}),'when approached','attack')).toThrow(/Nighthawk/);
 });
 it('Ready expires when the next player turn begins',()=>{
  const c=readyCombatAction(arena(),'enemy moves','duck');
  const enemy=takeDuelTurnAction(c,'end');
  vi.spyOn(crypto,'getRandomValues').mockImplementation(((array:Uint32Array)=>{array[0]=0;return array;}) as typeof crypto.getRandomValues);
  const next=resolveDuelEnemyTurn(enemy);
  expect(next.combat?.readiedAction).toBeUndefined();
 });
});
