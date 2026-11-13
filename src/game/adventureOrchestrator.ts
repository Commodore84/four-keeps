import type {Campaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {mergeWorld} from './world';

export const OPENING_INTENT = 'Open the campaign at the character’s authoritative saved starting location (Frontier Village for the current starter campaign). Establish the setting in one or two substantial paragraphs of about 150–250 words. Describe the time of day, atmosphere, nearby landmarks, ordinary activity, and concrete sensory impressions such as sounds, smells, and weather. Naturally introduce a few nearby people and places, including the accessible general-goods shop, without inventing purchases or prices. Weave in the saved character’s class, background, or personality only when supported by their actual sheet; do not invent personal history. Include one subtle mystery or interesting detail as an invitation to investigate, not a compulsory quest. Preserve full player agency: do not make the player move, speak, accept a quest, enter combat, or take any other action. Do not demand a choice, list action options, or end with a mandatory question. Leave the scene open for free-form exploration.';

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

/** Keep a bounded, canonical context for the DM. A rumor is never upgraded to confirmed by repetition. */
export function adventureMemory(campaign:Campaign) {
  const world=campaign.world;
  return {
    location:campaign.location,
    npcs:(world?.npcs??[]).slice(-24),
    places:(world?.places??[]).slice(-24),
    clues:(world?.clues??[]).slice(-30),
    quests:(world?.quests??[]).slice(-15),
    establishedFacts:(campaign.worldFacts??[]).slice(-40),
    recentConversation:campaign.journal.filter(e=>e.kind==='player'||e.kind==='dm').slice(-12).map(e=>({role:e.kind==='player'?'user':'assistant',content:e.text}))
  };
}

/** Each action is persisted before the network request, allowing safe retry after reload. */
export function prepareAdventureAction(campaign:Campaign,message:string,actionId:string,now=new Date().toISOString()):Campaign {
  if(!message.trim()||!actionId.trim())throw Error('A player action needs an ID and text.');
  if(campaign.pendingAdventureAction){
    if(campaign.pendingAdventureAction.id===actionId)return campaign;
    throw Error('Resolve the pending adventure action before sending another.');
  }
  if(campaign.journal.some(e=>e.id===actionId+'-player'))return campaign;
  return {...campaign,updatedAt:now,pendingAdventureAction:{id:actionId,message:message.trim(),createdAt:now}};
}

export function commitAdventureAction(campaign:Campaign,actionId:string,narration:string,now=new Date().toISOString(),newFacts:string[]=[],worldUpdates?:unknown):Campaign {
  if(campaign.journal.some(e=>e.id===actionId+'-player'))return campaign;
  const pending=campaign.pendingAdventureAction;
  if(!pending||pending.id!==actionId)throw Error('The response is stale or belongs to another action.');
  if(!narration.trim())throw Error('The DM response is empty.');
  const {pendingAdventureAction:_pending,...rest}=campaign;
  const facts=[...(campaign.worldFacts??[])];
  for(const item of newFacts.slice(0,8)){
    if(typeof item!=='string')continue;
    const fact=item.trim().slice(0,220);
    if(fact&&!facts.some(x=>x.toLowerCase()===fact.toLowerCase()))facts.push(fact);
  }
  return {...rest,worldFacts:facts.slice(-60),world:mergeWorld(campaign.world,worldUpdates),updatedAt:now,journal:[...campaign.journal,
    {id:actionId+'-player',kind:'player' as const,text:pending.message,createdAt:pending.createdAt},
    {id:actionId+'-dm',kind:'dm' as const,text:narration.trim(),createdAt:now}
  ]};
}


/** Clarification is not an action: preserve the original action ID and all world state. */
export function pauseAdventureForClarification(campaign:Campaign,actionId:string,question:string):Campaign {
 if(!campaign.pendingAdventureAction||campaign.pendingAdventureAction.id!==actionId)throw Error('Clarification does not match the pending action.');
 if(!question.trim())throw Error('Clarification question is required.');
 if(campaign.pendingClarification?.answer)throw Error('The DM cannot repeat a clarification already answered.');
 return {...campaign,pendingClarification:{actionId,question:question.trim()}};
}
export function answerAdventureClarification(campaign:Campaign,answer:string):Campaign {
 if(!campaign.pendingClarification||!campaign.pendingAdventureAction||campaign.pendingClarification.actionId!==campaign.pendingAdventureAction.id)throw Error('No pending clarification.');
 if(!answer.trim())throw Error('Clarification answer is required.');
 if(campaign.pendingClarification.answer)return campaign;
 return {...campaign,pendingClarification:{...campaign.pendingClarification,answer:answer.trim()}};
}
