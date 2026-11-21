import { describe, expect, it } from 'vitest';
import { isView, previewCampaign, views } from './state';

describe('application shell state', () => {
  it('provides exactly four navigable views', () => {
    expect(views).toEqual(['adventure', 'party', 'journal', 'map']);
  });
  it('rejects invalid views', () => {
    expect(isView('party')).toBe(true);
    expect(isView('settings')).toBe(false);
  });
  it('marks placeholder campaign state as a preview', () => {
    expect(previewCampaign.status).toBe('prototype');
  });
});
