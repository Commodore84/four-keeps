import { describe, expect, it } from 'vitest';
import { emptyWorld, mergeWorld, normalizeWorld } from './world';
describe('structured world memory', () => {
  it('keeps NPC identity while updating relationship', () => {
    const first = mergeWorld(emptyWorld(), { npcs: [{ name: 'Mira Thorn', role: 'Innkeeper', location: 'Black Kettle Inn', relationship: 'neutral', notes: ['Knows Seln'] }] });
    const next = mergeWorld(first, { npcs: [{ name: 'Mira Thorn', relationship: 'friendly', notes: ['Offered shelter'] }] });
    expect(next.npcs).toHaveLength(1);
    expect(next.npcs[0].role).toBe('Innkeeper');
    expect(next.npcs[0].relationship).toBe('friendly');
    expect(next.npcs[0].notes).toHaveLength(2);
  });
  it('keeps rumor separate from confirmed fact', () => {
    const state = mergeWorld(emptyWorld(), { clues: [{ text: 'The keep is haunted', evidence: 'rumor', source: 'Guard' }] });
    expect(state.clues[0].evidence).toBe('rumor');
  });
  it('rejects unknown statuses and sanitizes malformed records', () => {
    const state = normalizeWorld({ quests: [{ title: 'Find Seln', status: 'invented', objective: 'Ask at the inn' }], npcs: [null] });
    expect(state.quests[0].status).toBe('open');
    expect(state.npcs).toHaveLength(0);
  });
});
