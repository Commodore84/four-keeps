import { describe, expect, it } from 'vitest';
import { newCampaign } from './campaign';
import { createBackup, parseBackup } from './backup';

describe('campaign backups', () => {
  it('round trips a campaign without changing its ID', () => {
    const campaign = newCampaign('Test', 'fixed-id', '2026-11-02T00:00:00.000Z');
    expect(parseBackup(JSON.stringify(createBackup(campaign)))).toEqual(campaign);
  });
  it('rejects malformed or unsupported files', () => {
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup(JSON.stringify({ format: 'four-keeps-campaign', version: 2 }))).toThrow();
  });
});
