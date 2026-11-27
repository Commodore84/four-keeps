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
describe('persistent NPC independent skill bonuses',()=>{
 it('bounds discovery modifiers, keeps the first established values and preserves older NPC saves',()=>{
  let world=mergeWorld(emptyWorld(),{npcs:[{name:'Mara Vell',role:'Guide',location:'Quarry',
   skillBonuses:{Perception:3,Investigation:5,Athletics:100}}]});
  expect(world.npcs[0].skillBonuses).toEqual({Perception:3,Investigation:5});
  expect(normalizeWorld(JSON.parse(JSON.stringify(world)))).toEqual(world);
  world=mergeWorld(world,{npcs:[{name:'Mara Vell',relationship:'Friendly',
   skillBonuses:{Perception:12,Investigation:12}}]});
  expect(world.npcs[0].relationship).toBe('Friendly');
  expect(world.npcs[0].skillBonuses).toEqual({Perception:3,Investigation:5});
  expect(normalizeWorld({npcs:[{name:'Old Scout',role:'Guide'}]}).npcs[0].skillBonuses).toBeUndefined();
  expect(normalizeWorld({npcs:[{name:'Untrained',skillBonuses:{Perception:30,Investigation:-8}}]}).npcs[0].skillBonuses).toBeUndefined();
 });
});
