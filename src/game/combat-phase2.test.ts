import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  newCampaign, takeDuelTurnAction, rollDuelAttack, resolveDuelEnemyTurn,
  owlHelp, moveOwl, moveDuelToken, canNighthawkHide, type Campaign,
} from './campaign';
import { availableCombatMovement, combatHideStatus, combatAttackRollPreview } from './combat-ui';

type Combat = NonNullable<Campaign['combat']>;
const combat=(c:Campaign)=>c.combat!;
function arena(overrides:Partial<Combat>={}):Campaign {
  const c=newCampaign('Phase 2 test','phase-2');
  return {...c,character:{...c.character!,level:3},familiar:{form:'Owl',summonedAt:'2026-11-08',status:'active',hp:1},
    combat:{status:'initiative-set',enemyName:'Training Dummy',enemyInitiative:10,playerInitiative:20,
      round:1,order:['Nighthawk','Training Dummy'],turnIndex:0,playerPosition:{x:2,y:10},
      enemyPosition:{x:10,y:2},enemyHp:100,enemyMaxHp:100,
      movementUsed:0,movementAllowance:35,arrowsRemaining:20,daggersAvailable:2,
      selectedEnemy:'first',owl:{position:{x:2,y:10},hp:1,movementUsed:0,actionUsed:false},...overrides}};
}
// Supply actual d20/damage die results in order, rather than hoping random hits occur.
// The game uses (random uint32 % dieSides) + 1.
function dice(...rolls:number[]) {
  let index=0;
  vi.spyOn(crypto,'getRandomValues').mockImplementation(((array:Uint32Array)=>{
    if(index>=rolls.length)throw Error('Unexpected extra die roll');
    array[0]=rolls[index++]-1;
    return array;
  }) as typeof crypto.getRandomValues);
  return ()=>expect(index).toBe(rolls.length);
}
afterEach(()=>vi.restoreAllMocks());

describe('deterministic attack and Sneak Attack outcomes',()=>{
  it('natural 20 hits, rolls 2d6 weapon + 4d6 Sneak Attack at level 3, and never doubles DEX',()=>{
    const consumed=dice(20,2,5,1,3,4,6,2);
    let c=takeDuelTurnAction(arena({steadyAim:true,bonusActionUsed:true}),'shortbow');
    c=rollDuelAttack(c,'hit');
    expect(combat(c).attack).toMatchObject({d20:20,critical:true,hit:true,advantage:true});
    c=rollDuelAttack(c,'damage');
    expect(combat(c).attack?.weaponDamageRolls).toEqual([5,1]);
    expect(combat(c).attack?.sneakAttackRolls).toEqual([3,4,6,2]);
    expect(combat(c).attack?.damage).toBe(5+1+3+4+6+2+3);
    consumed();
  });
  it('natural 1 misses even when total would otherwise hit',()=>{
    const consumed=dice(1);
    const c=rollDuelAttack(takeDuelTurnAction(arena(),'shortbow'),'hit');
    expect(combat(c).attack).toMatchObject({d20:1,hit:false,critical:false,phase:'resolved'});
    expect(combat(c).sneakAttackEligible).toBe(false);
    consumed();
  });
  it('advantage takes higher d20 and consumes owl Help',()=>{
    const consumed=dice(4,17);
    const c=arena({owl:{position:{x:9,y:2},hp:1,movementUsed:0,actionUsed:false}});
    const helped=owlHelp(c,'first');
    const hit=rollDuelAttack(takeDuelTurnAction(helped,'shortbow'),'hit');
    expect(combat(hit).attack).toMatchObject({d20:17,advantage:true,hit:true});
    expect(combat(hit).owl?.helpTarget).toBeUndefined();
    consumed();
  });
  it('advantage and disadvantage cancel to one roll, disabling Sneak Attack without an ally',()=>{
    const consumed=dice(14);
    const c=arena({playerPosition:{x:9,y:2},steadyAim:true,bonusActionUsed:true});
    const hit=rollDuelAttack(takeDuelTurnAction(c,'shortbow'),'hit');
    expect(combat(hit).attack).toMatchObject({d20:14,advantage:false,disadvantage:false,secondD20:undefined});
    expect(combat(hit).sneakAttackEligible).toBe(false);
    consumed();
  });
  it('Sneak Attack remains unavailable after already being used this turn',()=>{
    const consumed=dice(18,12);
    const c=arena({steadyAim:true,sneakAttackUsedThisTurn:true});
    const hit=rollDuelAttack(takeDuelTurnAction(c,'shortbow'),'hit');
    expect(combat(hit).sneakAttackEligible).toBe(false);
    consumed();
  });
});

describe('multi-step encounters and resource resets',()=>{
  it('Steady Aim → attack → enemy turn → next round restores all resources',()=>{
    const consumed=dice(13,17,4);
    let c=arena({enemyPosition:{x:10,y:2}});
    expect(availableCombatMovement(combat(c))).toBe(35);
    c=takeDuelTurnAction(c,'steady-aim');
    expect(availableCombatMovement(combat(c))).toBe(0);
    c=takeDuelTurnAction(c,'shortbow');
    c=rollDuelAttack(c,'hit');
    expect(combat(c).attack?.advantage).toBe(true);
    c=rollDuelAttack(c,'damage',false);
    expect(availableCombatMovement(combat(c))).toBe(0);
    c=takeDuelTurnAction(c,'end');
    expect(combat(c).turnIndex).toBe(1);
    c=resolveDuelEnemyTurn(c);
    expect(combat(c).turnIndex).toBe(0);
    expect(combat(c).round).toBe(2);
    expect(combat(c).steadyAim).toBe(false);
    expect(combat(c).bonusActionUsed).toBe(false);
    expect(combat(c).actionUsed).toBe(false);
    expect(combat(c).movementAllowance).toBe(35);
    expect(availableCombatMovement(combat(c))).toBe(35);
    expect(combat(c).sneakAttackUsedThisTurn).toBe(false);
    consumed();
  });
  it('Cunning Dash → shortbow attack → movement remains available until end turn',()=>{
    const consumed=dice(12,3);
    let c=takeDuelTurnAction(arena({enemyPosition:{x:10,y:2}}),'cunning-dash');
    expect(availableCombatMovement(combat(c))).toBe(70);
    c=takeDuelTurnAction(c,'shortbow');
    c=rollDuelAttack(c,'hit');
    c=rollDuelAttack(c,'damage',false);
    expect(availableCombatMovement(combat(c))).toBe(70);
    c=moveDuelToken(c,3,10);
    expect(availableCombatMovement(combat(c))).toBe(65);
    expect(combat(c).actionUsed).toBe(true);
    expect(combat(c).bonusActionUsed).toBe(true);
    consumed();
  });
  it('two enemies each take a turn before the next player round',()=>{
    let c=arena({
      order:['Nighthawk','Training Dummy','Training Dummy 2'],turnIndex:0,
      enemyPosition:{x:10,y:2},
      secondEnemy:{name:'Training Dummy 2',initiative:8,position:{x:10,y:4},hp:12,maxHp:12,detected:false},
    });
    c=takeDuelTurnAction(c,'cunning-dash');
    c=takeDuelTurnAction(c,'end');
    expect(combat(c).turnIndex).toBe(1);
    c=resolveDuelEnemyTurn(c);
    expect(combat(c).turnIndex).toBe(2);
    expect(combat(c).round).toBe(1);
    c=resolveDuelEnemyTurn(c);
    expect(combat(c).turnIndex).toBe(0);
    expect(combat(c).round).toBe(2);
    expect(combat(c).movementAllowance).toBe(35);
    expect(availableCombatMovement(combat(c))).toBe(35);
    expect(combat(c).owl?.actionUsed).toBe(false);
  });
  it('owl movement and Help reset on the next Nighthawk turn',()=>{
    let c=arena({enemyPosition:{x:10,y:2}});
    c=moveOwl(c,9,2);
    c=owlHelp(c,'first');
    expect(combat(c).owl?.actionUsed).toBe(true);
    // Flyby lets the owl retreat before the enemy's turn.
    c=moveOwl(c,7,4);
    c=takeDuelTurnAction(c,'end');
    c=resolveDuelEnemyTurn(c);
    expect(combat(c).owl?.movementUsed).toBe(0);
    expect(combat(c).owl?.actionUsed).toBe(false);
  });
});

describe('owl survival and enemy targeting',()=>{
  it('adjacent owl is struck, destroyed at 0 HP, and marked destroyed on familiar',()=>{
    const consumed=dice(17,2);
    const c=arena({turnIndex:1,enemyPosition:{x:3,y:10},
      owl:{position:{x:3,y:9},hp:1,movementUsed:0,actionUsed:false}});
    const next=resolveDuelEnemyTurn(c);
    expect(next.familiar?.status).toBe('destroyed');
    expect(combat(next).owl).toBeUndefined();
    expect(next.character?.currentHitPoints).toBe(c.character?.currentHitPoints);
    expect(next.journal.at(-1)?.text).toContain('Familiar disappears');
    consumed();
  });
  it('a missed attack leaves the owl alive and Nighthawk unharmed',()=>{
    const consumed=dice(1);
    const c=arena({turnIndex:1,enemyPosition:{x:3,y:10},
      owl:{position:{x:3,y:9},hp:1,movementUsed:0,actionUsed:false}});
    const next=resolveDuelEnemyTurn(c);
    expect(combat(next).owl?.hp).toBe(1);
    expect(next.familiar?.status).toBe('active');
    expect(next.character?.currentHitPoints).toBe(c.character?.currentHitPoints);
    consumed();
  });
  it('an owl adjacent at the start but left behind after enemy movement is not attacked at range',()=>{
    const c=arena({turnIndex:1,enemyPosition:{x:7,y:7},playerPosition:{x:2,y:10},
      owl:{position:{x:8,y:8},hp:1,movementUsed:0,actionUsed:false}});
    const next=resolveDuelEnemyTurn(c);
    expect(next.familiar?.status).toBe('active');
    expect(combat(next).owl?.hp).toBe(1);
    expect(next.character?.currentHitPoints).toBe(c.character?.currentHitPoints);
  });
  it('a destroyed owl cannot provide Help on subsequent turns',()=>{
    const consumed=dice(17,1);
    const c=arena({turnIndex:1,enemyPosition:{x:3,y:10},
      owl:{position:{x:3,y:9},hp:1,movementUsed:0,actionUsed:false}});
    const next=resolveDuelEnemyTurn(c);
    expect(()=>owlHelp(next,'first')).toThrow();
    consumed();
  });
});

describe('UI selectors agree with the combat rules',()=>{
  it('movement selector shows 0 after Steady Aim in both combat displays',()=>{
    const c=takeDuelTurnAction(arena(),'steady-aim');
    expect(availableCombatMovement(combat(c))).toBe(0);
    expect(()=>moveDuelToken(c,3,10)).toThrow(/Steady Aim/);
  });
  it('movement selector shows Dash movement and deducts used movement',()=>{
    expect(availableCombatMovement({ ...combat(arena()),movementAllowance:70,movementUsed:25 })).toBe(45);
  });
  it('grappled speed is zero in the overview',()=>{
    expect(availableCombatMovement({ ...combat(arena()),playerGrappled:true })).toBe(0);
  });
  it('Hide is unavailable when a living dummy can see Nighthawk',()=>{
    const c=combat(arena({playerPosition:{x:2,y:10},enemyPosition:{x:3,y:10}}));
    expect(canNighthawkHide(c)).toBe(false);
    expect(combatHideStatus(c)).toMatchObject({available:false,visibleTo:['Dummy 1']});
  });
  it('Hide ignores defeated dummies and reports available resources',()=>{
    const c=combat(arena({enemyHp:0}));
    expect(combatHideStatus(c)).toMatchObject({available:true,visibleTo:[]});
  });
  it('Hide correctly reports spent Action and Bonus Action',()=>{
    const c=combat(arena({enemyHp:0,actionUsed:true,bonusActionUsed:true}));
    expect(combatHideStatus(c).available).toBe(false);
    expect(combatHideStatus(c).reason).toMatch(/Action and Bonus Action spent/);
  });
  it('Steady Aim preview matches two-die advantage on a shortbow',()=>{
    const c=combat(arena({steadyAim:true}));
    expect(combatAttackRollPreview(c,'shortbow')).toBe('Advantage');
  });
  it('ranged attack within melee reach cancels Steady Aim advantage',()=>{
    const c=combat(arena({steadyAim:true,playerPosition:{x:9,y:2}}));
    expect(combatAttackRollPreview(c,'shortbow')).toBe('Normal roll');
  });
  it('owl Help preview tracks the selected target',()=>{
    const c=combat(arena({owl:{position:{x:9,y:2},hp:1,movementUsed:0,actionUsed:true,helpTarget:'first'}}));
    expect(combatAttackRollPreview(c,'shortbow')).toBe('Advantage');
    expect(combatAttackRollPreview({...c,selectedEnemy:'second'},'shortbow')).toBe('Normal roll');
  });
});
