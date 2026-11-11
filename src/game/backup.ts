import {hydratePlayerState} from './playerState';
import { isCampaign, type Campaign } from './campaign';

export interface CampaignBackup {
  format: 'four-keeps-campaign';
  version: 1;
  exportedAt: string;
  campaign: Campaign;
}
export function createBackup(campaign: Campaign, now: string = new Date().toISOString()): CampaignBackup {
  if (!isCampaign(campaign)) throw new Error('Invalid campaign');
  return { format: 'four-keeps-campaign', version: 1, exportedAt: now, campaign };
}
export function parseBackup(text: string): Campaign {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This is not a valid JSON backup.'); }
  if (!data || typeof data !== 'object') throw new Error('Invalid Four Keeps backup.');
  const backup = data as Partial<CampaignBackup>;
  if (backup.format !== 'four-keeps-campaign' || backup.version !== 1 || !isCampaign(backup.campaign)) {
    throw new Error('Unsupported or invalid Four Keeps backup.');
  }
  if (text.length > 5_000_000) throw new Error('Backup is too large.');
  return hydratePlayerState(backup.campaign);
}
