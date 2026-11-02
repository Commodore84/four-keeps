import { describe, expect, it } from 'vitest';
import { addNote, isCampaign, newCampaign } from './campaign';
describe('campaign state', () => {
  it('creates a versioned campaign with an introduction', () => {
    const campaign = newCampaign(' The Forgotten Keep ', 'test-id', '2026-11-01T00:00:00.000Z');
    expect(campaign.title).toBe('The Forgotten Keep');
    expect(campaign.journal).toHaveLength(1);
    expect(isCampaign(campaign)).toBe(true);
  });
  it('records notes without mutating the previous state', () => {
    const first = newCampaign('Test', 'one');
    const next = addNote(first, ' I inspect the gate. ', 'note', '2026-11-01T01:00:00.000Z');
    expect(first.journal).toHaveLength(1);
    expect(next.journal[1].text).toBe('I inspect the gate.');
    expect(next.updatedAt).toBe('2026-11-01T01:00:00.000Z');
  });
  it('rejects malformed saves', () => {
    expect(isCampaign({ schemaVersion: 1, id: 'x', journal: [] })).toBe(false);
    expect(() => newCampaign('   ', 'x')).toThrow();
  });
});
