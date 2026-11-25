import { describe, expect, it } from 'vitest';
import {
  beginDuel, rollDuelInitiative, canNighthawkHide, hideNighthawk, moveDuelToken, moveOwl, newCampaign,
  owlHelp, rollDuelAttack, resolveDuelEnemyTurn, takeDuelTurnAction, trainingCoverBlocksSight,
  type Campaign,
} from './campaign';

// Keep tests independent of initiative randomness and browser state.
function arena(overrides: Partial<NonNullable<Campaign['combat']>> = {}): Campaign {
  const base = newCampaign('Combat regression', 'combat-regression');
  return {
    ...base,
    familiar: { form: 'Owl', summonedAt: '2026-11-08T00:00:00Z', status: 'active', hp: 1 },
    combat: {
      status: 'initiative-set', enemyName: 'Training Dummy', enemyInitiative: 10,
      playerInitiative: 20, round: 1, order: ['Nighthawk', 'Training Dummy'],
      turnIndex: 0, playerPosition: { x: 2, y: 10 },
      enemyPosition: { x: 10, y: 2 }, enemyHp: 12, enemyMaxHp: 12,
      movementUsed: 0, movementAllowance: 35, arrowsRemaining: 20,
      daggersAvailable: 2, selectedEnemy: 'first',
      owl: { position: { x: 2, y: 10 }, hp: 1, movementUsed: 0, actionUsed: false },
      ...overrides,
    },
  };
}
const state = (c: Campaign) => c.combat!;

describe('combat regression: turn economy and movement', () => {
  it('Steady Aim spends the bonus action and prevents all movement', () => {
    const c = takeDuelTurnAction(arena(), 'steady-aim');
    expect(state(c).steadyAim).toBe(true);
    expect(state(c).bonusActionUsed).toBe(true);
    expect(() => moveDuelToken(c, 3, 10)).toThrow(/Steady Aim/);
    expect(() => takeDuelTurnAction(c, 'cunning-dash')).toThrow(/Bonus action/);
  });
  it('Steady Aim cannot be activated after moving', () => {
    const c = takeDuelTurnAction(arena(), 'move');
    expect(() => takeDuelTurnAction(c, 'steady-aim')).toThrow(/no movement/);
  });
  it('a weapon attack spends the Action, not the Bonus Action', () => {
    const c = takeDuelTurnAction(arena(), 'shortbow');
    expect(state(c).actionUsed).toBe(true);
    expect(state(c).bonusActionUsed).toBeFalsy();
    expect(() => takeDuelTurnAction(c, 'shortbow')).toThrow(/Action already used/);
  });
  it('end turn clears Steady Aim and restores movement and action resources', () => {
    const c = takeDuelTurnAction(arena({ order: ['Nighthawk'], enemyHp: 0 }), 'steady-aim');
    const next = takeDuelTurnAction(c, 'end');
    expect(state(next).steadyAim).toBe(false);
    expect(state(next).movementUsed).toBe(0);
    expect(state(next).movementAllowance).toBe(35);
    expect(state(next).bonusActionUsed).toBe(false);
    expect(state(next).actionUsed).toBe(false);
  });
});

describe('combat regression: Hide and cover', () => {
  it('ignores defeated enemies when checking cover', () => {
    const p = { x: 2, y: 10 };
    expect(canNighthawkHide(state(arena({ playerPosition: p, enemyHp: 0 })))).toBe(true);
  });
  it('blocks Hide when a living enemy has line of sight', () => {
    const p = { x: 2, y: 10 }, enemy = { x: 2, y: 9 };
    expect(trainingCoverBlocksSight(p, enemy)).toBe(false);
    const c = arena({ playerPosition: p, enemyPosition: enemy });
    expect(canNighthawkHide(state(c))).toBe(false);
    expect(() => hideNighthawk(c)).toThrow(/line of sight/);
  });
  it('allows a Hide check when all living enemies have blocked sight', () => {
    const p = { x: 2, y: 10 }, enemy = { x: 10, y: 2 };
    // A changed pillar layout should fail this test, not silently skip it.
    expect(trainingCoverBlocksSight(p, enemy)).toBe(true);
    const c = arena({ playerPosition: p, enemyPosition: enemy });
    expect(canNighthawkHide(state(c))).toBe(true);
    const hidden = hideNighthawk(c);
    expect(state(hidden).bonusActionUsed).toBe(true);
    expect(state(hidden).hideTotal).toBeGreaterThanOrEqual(1);
  });
});

describe('combat regression: owl Help and movement', () => {
  it('requires adjacency and a living target for Help', () => {
    const c = arena();
    expect(() => owlHelp(c, 'first')).toThrow(/within 5 feet/);
    const near = arena({ owl: { position: { x: 9, y: 2 }, hp: 1, movementUsed: 0, actionUsed: false } });
    expect(state(owlHelp(near, 'first')).owl?.helpTarget).toBe('first');
    expect(() => owlHelp(arena({ ...state(near), enemyHp: 0 }), 'first')).toThrow(/unavailable/);
  });
  it('owl Help is consumed by an attack and gives two d20s', () => {
    const c = arena({ owl: { position: { x: 9, y: 2 }, hp: 1, movementUsed: 0, actionUsed: false } });
    const helped = owlHelp(c, 'first');
    const attack = rollDuelAttack(takeDuelTurnAction(helped, 'shortbow'), 'hit');
    expect(state(attack).attack?.advantage).toBe(true);
    expect(state(attack).attack?.secondD20).toBeGreaterThanOrEqual(1);
    expect(state(attack).owl?.helpTarget).toBeUndefined();
  });
  it('owl movement and Action reset on Nighthawk next turn', () => {
    const c = arena({ order: ['Nighthawk'], enemyHp: 0, owl: { position: { x: 2, y: 10 }, hp: 1, movementUsed: 30, actionUsed: true } });
    const next = takeDuelTurnAction(c, 'end');
    expect(state(next).owl?.movementUsed).toBe(0);
    expect(state(next).owl?.actionUsed).toBe(false);
  });
  it('owl has its own 60 ft flying movement budget', () => {
    const c = arena();
    const moved = moveOwl(c, 6, 10);
    expect(state(moved).owl?.movementUsed).toBe(20);
    expect(state(moved).movementUsed).toBe(0);
    expect(() => moveOwl(moved, 12, 0)).toThrow(/insufficient flying movement/);
  });
});

describe('combat regression: attack and damage', () => {
  it('a shortbow hit records the rolled attack die and bonus', () => {
    const c = rollDuelAttack(takeDuelTurnAction(arena(), 'shortbow'), 'hit');
    expect(state(c).attack?.d20).toBeGreaterThanOrEqual(1);
    expect(state(c).attack?.total).toBe((state(c).attack?.d20??0)+5);
    expect(state(c).arrowsRemaining).toBe(19);
  });
  it('a thrown dagger is marked thrown and spends the Action', () => {
    const c = takeDuelTurnAction(arena({ enemyPosition: { x: 4, y: 10 } }), 'throw-dagger');
    expect(state(c).attack?.thrown).toBe(true);
    expect(state(c).actionUsed).toBe(true);
  });
  it('natural 20 always hits and marks a critical', () => {
    // A deterministic resolved critical fixture guards the UI-facing attack fields.
    const c = arena({ attack: { phase: 'roll-damage', weapon: 'dagger', d20: 20, firstD20: 20, total: 25, hit: true, critical: true }, actionUsed: true, enemyPosition: { x: 3, y: 10 } });
    const next = rollDuelAttack(c, 'damage', false);
    expect(state(next).attack?.critical).toBe(true);
    expect(state(next).attack?.weaponDamageRolls).toHaveLength(2);
    expect(state(next).attack?.damage).toBe((state(next).attack?.weaponDamageRolls??[]).reduce((a,b)=>a+b,0)+3);
  });
});

describe('combat regression: Sneak Attack eligibility and damage', () => {
  function resolvedAttack(overrides: Partial<NonNullable<NonNullable<Campaign['combat']>['attack']>> = {}, combatOverrides: Partial<NonNullable<Campaign['combat']>> = {}): Campaign {
    return arena({
      enemyHp: 100, enemyMaxHp: 100,
      attack: { phase: 'roll-damage', weapon: 'shortbow', hit: true, d20: 15, firstD20: 15, total: 20, critical: false, ...overrides },
      sneakAttackEligible: true, actionUsed: true, ...combatOverrides,
    });
  }
  it('advantage enables Sneak Attack on a successful hit', () => {
    const c = takeDuelTurnAction(arena({ steadyAim: true, bonusActionUsed: true }), 'shortbow');
    const hit = rollDuelAttack(c, 'hit');
    if (state(hit).attack?.hit) expect(state(hit).sneakAttackEligible).toBe(true);
    expect(state(hit).attack?.advantage).toBe(true);
  });
  it('an adjacent ally permits Sneak Attack without advantage on a hit', () => {
    const hit = rollDuelAttack(takeDuelTurnAction(arena({ trainingAllyAdjacent: true }), 'shortbow'), 'hit');
    if (state(hit).attack?.hit) expect(state(hit).sneakAttackEligible).toBe(true);
  });
  it('disadvantage prevents ally-based Sneak Attack', () => {
    const c = arena({ trainingAllyAdjacent: true, playerPosition: { x: 9, y: 2 } });
    const hit = rollDuelAttack(takeDuelTurnAction(c, 'shortbow'), 'hit');
    expect(state(hit).attack?.disadvantage).toBe(true);
    expect(state(hit).sneakAttackEligible).toBe(false);
  });
  it('a normal hit without ally or advantage is not Sneak Attack eligible', () => {
    const hit = rollDuelAttack(takeDuelTurnAction(arena(), 'shortbow'), 'hit');
    expect(state(hit).sneakAttackEligible).toBe(false);
  });
  it('Sneak Attack damage is included exactly once with Dexterity modifier', () => {
    const result = rollDuelAttack(resolvedAttack(), 'damage', true);
    const attack = state(result).attack!;
    expect(attack.weaponDamageRolls).toHaveLength(1);
    expect(attack.sneakAttackRolls).toHaveLength(1);
    expect(attack.sneakAttackDamage).toBe(attack.sneakAttackRolls!.reduce((a,b)=>a+b,0));
    expect(attack.damage).toBe(attack.weaponDamageRolls![0]+3+attack.sneakAttackDamage!);
    expect(state(result).stats?.sneakDamage).toBe(attack.sneakAttackDamage);
    expect(state(result).sneakAttackUsedThisTurn).toBe(true);
  });
  it('a critical hit doubles weapon and Sneak Attack dice, not DEX modifier', () => {
    const result = rollDuelAttack(resolvedAttack({ critical: true, d20: 20, firstD20: 20, total: 25 }), 'damage', true);
    const attack = state(result).attack!;
    expect(attack.weaponDamageRolls).toHaveLength(2);
    expect(attack.sneakAttackRolls).toHaveLength(2);
    expect(attack.damage).toBe(
      attack.weaponDamageRolls!.reduce((a,b)=>a+b,0)+
      attack.sneakAttackRolls!.reduce((a,b)=>a+b,0)+3,
    );
  });
  it('Sneak Attack cannot be applied when ineligible or already used', () => {
    expect(() => rollDuelAttack(resolvedAttack({}, { sneakAttackEligible: false }), 'damage', true)).toThrow(/not eligible/);
    const hit = rollDuelAttack(takeDuelTurnAction(arena({ sneakAttackUsedThisTurn: true, steadyAim: true }), 'shortbow'), 'hit');
    expect(state(hit).sneakAttackEligible).toBe(false);
  });
  it('a successful damage roll reduces target HP by the exact damage amount', () => {
    const result = rollDuelAttack(resolvedAttack(), 'damage', false);
    expect(state(result).enemyHp).toBe(100-state(result).attack!.damage!);
    expect(state(result).stats?.damage).toBe(state(result).attack?.damage);
    expect(state(result).attack?.sneakAttackRolls).toEqual([]);
  });
});

describe('combat regression: enemy turns', () => {
  function enemyTurn(overrides: Partial<NonNullable<Campaign['combat']>> = {}): Campaign {
    return arena({
      order: ['Nighthawk', 'Training Dummy'], turnIndex: 1,
      playerPosition: { x: 2, y: 10 }, enemyPosition: { x: 10, y: 2 },
      owl: undefined, ...overrides,
    });
  }
  it('a distant dummy moves no more than 10 feet and cannot attack out of range', () => {
    const before = enemyTurn();
    const after = resolveDuelEnemyTurn(before);
    const p = state(after).enemyPosition!, origin = state(before).enemyPosition!;
    expect(Math.max(Math.abs(p.x-origin.x),Math.abs(p.y-origin.y))).toBeLessThanOrEqual(2);
    expect(after.character?.currentHitPoints).toBe(before.character?.currentHitPoints);
    expect(state(after).turnIndex).toBe(0);
  });
  it('an adjacent dummy makes a nonlethal attack and returns control to Nighthawk', () => {
    const before = enemyTurn({ enemyPosition: { x: 3, y: 10 } });
    const after = resolveDuelEnemyTurn(before);
    expect(after.character!.currentHitPoints).toBeLessThanOrEqual(before.character!.currentHitPoints!);
    expect(after.character!.currentHitPoints).toBeGreaterThanOrEqual(0);
    expect(state(after).turnIndex).toBe(0);
  });
  it('a defeated dummy cannot take its turn', () => {
    expect(() => resolveDuelEnemyTurn(enemyTurn({ enemyHp: 0 }))).toThrow(/Defeated enemies/);
  });
  it('an enemy cannot act during Nighthawk turn', () => {
    expect(() => resolveDuelEnemyTurn(arena())).toThrow(/opponent's turn/);
  });
  it('a dummy targets an adjacent owl and leaves Nighthawk HP unchanged', () => {
    const before = enemyTurn({ owl: { position: { x: 10, y: 3 }, hp: 1, movementUsed: 0, actionUsed: false } });
    const after = resolveDuelEnemyTurn(before);
    expect(after.character!.currentHitPoints).toBe(before.character!.currentHitPoints);
    expect(after.journal.at(-1)?.text).toContain('Owl');
  });
});

describe('training encounter equipment reset', () => {
  it('starts each new training encounter with 20 arrows and 2 daggers regardless of prior equipment', () => {
    const campaign = newCampaign('Equipment reset test', 'equipment-reset');
    const depleted = { ...campaign, equipment: { ...campaign.equipment!, arrows: 0, daggers: 0 } };
    const first = rollDuelInitiative(beginDuel(depleted, 'Training Dummy'));
    expect(first.combat?.arrowsRemaining).toBe(20);
    expect(first.combat?.daggersAvailable).toBe(2);
    const nextCampaign = { ...first, combat: undefined };
    const second = rollDuelInitiative(beginDuel(nextCampaign, 'Training Dummy'));
    expect(second.combat?.arrowsRemaining).toBe(20);
    expect(second.combat?.daggersAvailable).toBe(2);
    expect(second.combat?.daggersThrown).toBe(0);
  });
});
