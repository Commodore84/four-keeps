import type {Campaign} from './campaign';

export type PostCombatFollowUp = {
  id:string; outcome:'victory'|'defeat'; opponent:string; recap:string;
};
const completedMarker='The encounter is won. Exploration resumes; the DM may adjudicate recovered loot and rewards.';

/** Persist the handoff before asking the DM. No phantom player action is created. */
export function queuePostCombatFollowUp(campaign:Campaign,opponent:string,defeated:boolean,
  recap:string,now=new Date().toISOString()):Campaign{
 if(campaign.postCombatFollowUp)return campaign;
 const id=crypto.randomUUID();
 return {...campaign,postCombatFollowUp:{id,outcome:defeated?'defeat':'victory',
   opponent:opponent.slice(0,100),recap:recap.slice(0,1000)},updatedAt:now};
}

/** Recover a completed encounter from before the post-combat feature shipped.
 * Only the distinctive, previously saved handoff marker is accepted. A later
 * DM message proves the handoff has already been narrated. */
export function recoverPostCombatFollowUp(campaign:Campaign):Campaign{
 if(campaign.postCombatFollowUp||campaign.combat||campaign.adventureSession?.status!=='exploring')return campaign;
 const entries=campaign.journal;
 const index=entries.map(entry=>entry.kind==='system'&&entry.text===completedMarker).lastIndexOf(true);
 if(index<0||entries.slice(index+1).some(entry=>entry.kind==='dm'||entry.kind==='player'))return campaign;
 const marker=entries[index];
 const id='legacy-'+marker.id;
 const recap=entries.slice(Math.max(0,index-16),index).filter(entry=>entry.kind==='system')
   .map(entry=>entry.text).slice(-7).join(' ');
 return {...campaign,postCombatFollowUp:{id,outcome:'victory',opponent:'the defeated enemies',recap:recap.slice(0,1000)},updatedAt:new Date().toISOString()};
}

/** An idempotent DM journal entry, isolated from inventory, rewards and rolls. */
export function commitPostCombatFollowUp(campaign:Campaign,id:string,narration:string,now=new Date().toISOString()):Campaign{
 const entryId='dm-post-combat-'+id;
 if(campaign.journal.some(entry=>entry.id===entryId))return campaign;
 if(campaign.postCombatFollowUp?.id!==id)throw Error('The post-combat handoff is no longer pending.');
 const text=narration.trim();
 if(!text)throw Error('The Dungeon Master did not provide an aftermath.');
 return {...campaign,postCombatFollowUp:undefined,updatedAt:now,
  journal:[...campaign.journal,{id:entryId,kind:'dm',text,createdAt:now}]};
}
