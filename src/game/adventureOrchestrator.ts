import {recordEncounter} from './encounterJournal';
import type {Campaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {mergeWorld} from './world';

export const OPENING_INTENT = 'Open at the character’s authoritative saved starting location. Keep the opening concise (roughly 110–170 words), in three to five short paragraphs of one to three sentences each, suitable for a phone. Establish a vivid place with a few specific sensory details, then immediately give the player a nearby, approachable general-goods shop and a merchant who can offer supplies. A brief, clearly attributed line of merchant dialogue may invite browsing, but do not speak or act for the player. Identify the shop as a general store, with an accessible entrance and a merchant present, so a player can naturally ask to browse its goods in their next message without needing directions or an extra scene. Format spoken dialogue as its own paragraph using Speaker: “words” so it is visually distinct. Preserve the saved character’s actual identity and the established world; avoid inventing personal history, purchases, prices, or quests. Leave room for a subtle optional curiosity, but no mandatory question or menu of actions. The character can browse, leave, explore, or do anything else; never automatically enter a shop, initiate a transaction, or advance the scene without player intent.';

/** Use the campaign's saved location, not a legacy starter-village assumption. */
export function openingIntentForCampaign(campaign:Campaign):string {
 const location=campaign.location?.trim()||'the campaign starting location';
 const geographicRule=campaign.characterBuild
  ? 'This campaign takes place in Anchamida. Dasahi is the established starting city for new imported characters. Respect the approved Anchamida geography and discovered map sites; do not relocate named cities, rivers, mountains or landmarks. A new map discovery requires an explicit structured mapAction, never narration alone.'
  : 'Preserve the established geography and locations of this legacy campaign.';
 return OPENING_INTENT+' The authoritative current location is '+JSON.stringify(location)+'. '+(campaign.characterBuild&&location.toLowerCase()==='dasahi'?'Dasahi is a coastal city: begin with the character just disembarking from a boat onto the waterfront, where a general store is clearly visible near the docks. ':'')+geographicRule;
}

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
    scene:campaign.explorationScene?{
      id:campaign.explorationScene.id,title:campaign.explorationScene.title,
      location:campaign.explorationScene.location,visible:campaign.explorationScene.visible,
      templateId:campaign.explorationScene.templateId,
      playerPosition:campaign.explorationScene.playerPosition,
      features:(campaign.explorationScene.features??[]).map(f=>({
        id:f.id,kind:f.kind,label:f.label,position:f.position,dc:f.dc,
        skill:f.skill,discovered:f.discovered,disarmed:f.disarmed,triggered:f.triggered,trapEffect:f.trapEffect,targetObjectId:f.targetObjectId,linkedObjectId:f.linkedObjectId,requiresFeatureId:f.requiresFeatureId,activated:f.activated,requiresMechanismIds:f.requiresMechanismIds,requiresKeyId:f.requiresKeyId,rotation:f.rotation,collected:f.collected
      })).slice(0,12),
      objects:campaign.explorationScene.battlefield.objects.map(o=>({
        id:o.id,kind:o.kind,open:o.open,locked:o.locked,lockDC:o.lockDC,destroyed:o.destroyed
      })).slice(0,80)
    }:null,
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
  if(campaign.journal.some(e=>e.id===actionId+'-dm'))return campaign;
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
  const originalAlreadyVisible=campaign.journal.some(entry=>entry.id===actionId+'-clarify-original');
  return recordEncounter({...rest,worldFacts:facts.slice(-60),world:mergeWorld(campaign.world,worldUpdates),updatedAt:now,journal:[...campaign.journal,
    ...(!originalAlreadyVisible?[{id:actionId+'-player',kind:'player' as const,text:pending.message,createdAt:pending.createdAt}]:[]),
    {id:actionId+'-dm',kind:'dm' as const,text:narration.trim(),createdAt:now}
  ]},actionId,pending.message,narration,now);
}


/** Clarification is not an action: preserve the original action ID and all world state. */
export function pauseAdventureForClarification(campaign:Campaign,actionId:string,question:string):Campaign {
 if(!campaign.pendingAdventureAction||campaign.pendingAdventureAction.id!==actionId)throw Error('Clarification does not match the pending action.');
 if(!question.trim())throw Error('Clarification question is required.');
 if(campaign.pendingClarification?.answer)throw Error('The DM cannot repeat a clarification already answered.');
 const originalId=actionId+'-clarify-original';
 const originalVisible=campaign.journal.some(entry=>entry.id===originalId);
 const count=campaign.journal.filter(entry=>entry.id.startsWith(actionId+'-clarify-question-')).length+1;
 const now=new Date().toISOString();
 return {...campaign,updatedAt:now,journal:[...campaign.journal,
  ...(!originalVisible?[{id:originalId,kind:'player' as const,text:campaign.pendingAdventureAction.message,createdAt:campaign.pendingAdventureAction.createdAt}]:[]),
  {id:actionId+'-clarify-question-'+count,kind:'dm' as const,text:question.trim(),createdAt:now}
 ],pendingClarification:{actionId,question:question.trim()}};
}
export function answerAdventureClarification(campaign:Campaign,answer:string):Campaign {
 if(!campaign.pendingClarification||!campaign.pendingAdventureAction||campaign.pendingClarification.actionId!==campaign.pendingAdventureAction.id)throw Error('No pending clarification.');
 if(!answer.trim())throw Error('Clarification answer is required.');
 if(campaign.pendingClarification.answer)return campaign;
 const count=campaign.journal.filter(entry=>entry.id.startsWith(campaign.pendingClarification!.actionId+'-clarify-question-')).length;
 const now=new Date().toISOString();
 return {...campaign,updatedAt:now,journal:[...campaign.journal,{
  id:campaign.pendingClarification.actionId+'-clarify-answer-'+count,
  kind:'player' as const,text:answer.trim(),createdAt:now
 }],pendingClarification:{...campaign.pendingClarification,answer:answer.trim()}};
}
