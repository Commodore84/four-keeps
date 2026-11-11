import type {Campaign} from './campaign';
import {beginAdventureSession} from './adventureSession';

export const OPENING_INTENT = 'Introduce my character to the world with a short, atmospheric scene and an intriguing mystery. Do not decide what I do.';

export function prepareAdventureOpening(campaign:Campaign, now=new Date().toISOString()):Campaign {
  if (campaign.adventureSession) return campaign;
  return beginAdventureSession(campaign,now);
}

/** An opening is a DM narration, not a fabricated player action. */
export function commitAdventureOpening(campaign:Campaign,narration:string,now=new Date().toISOString()):Campaign {
  if (!campaign.adventureSession) throw Error('Start an adventure before its opening.');
  if (campaign.journal.some(entry=>entry.id===campaign.id+'-dm-opening')) return campaign;
  if (!narration.trim()) throw Error('The opening must contain narration.');
  return {...campaign,updatedAt:now,journal:[...campaign.journal,{id:campaign.id+'-dm-opening',kind:'dm',text:narration.trim(),createdAt:now}]};
}

export function needsAdventureOpening(campaign:Campaign):boolean {
  return Boolean(campaign.characterIdentity && campaign.adventureSession && !campaign.journal.some(e=>e.id===campaign.id+'-dm-opening') && !campaign.journal.some(e=>e.kind==='dm'));
}
