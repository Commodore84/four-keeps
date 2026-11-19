import type {Campaign} from './campaign';
export type EncounterKind = 'Conversation'|'Combat'|'Exploration'|'Decision'|'Event';
export interface EncounterRecord {
 id:string; createdAt:string; level:number; kind:EncounterKind;
 summary:string; recount:string; tags:string[]; sourceActionId:string;
 playerAction?:string; originalNarration?:string; refinedAt?:string;
}
export function encounterKind(message:string,narration:string):EncounterKind {
 const text=message+' '+narration;
 if(/\b(initiative|attacks?|combat|battle|fought|strikes?|damage|ambush)\b/i.test(text))return 'Combat';
 if(/\b(travel|explor|discover|search|investigat|arriv|enter|ruins?)\b/i.test(text))return 'Exploration';
 if(/\b(agree|decline|refuse|promise|choose|decide|accept)\b/i.test(message))return 'Decision';
 if(/\b(ask|speak|talk|tell|conversation|negotiat|question)\b/i.test(message))return 'Conversation';
 return 'Event';
}
export function legacyEncounters(campaign:Campaign):EncounterRecord[] {
 const recorded=campaign.encounterJournal??[];
 const ids=new Set(recorded.map(e=>e.sourceActionId));
 const earlier=campaign.journal.flatMap((e,index)=>{
  if(e.kind!=='dm'||ids.has(e.id.replace(/-dm$/,'')))return [];
  const player=campaign.journal[index-1];
  const action=player?.kind==='player'?player.text:'';
  return [{id:'legacy-'+e.id,sourceActionId:e.id,createdAt:e.createdAt,level:0,kind:encounterKind(action,e.text),summary:e.text.replace(/\s+/g,' ').slice(0,180),recount:action?groundedRecount(action,e.text):e.text,playerAction:action||undefined,originalNarration:e.text,tags:[]}];
 });
 return [...earlier,...recorded].sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
const RECALL_STOPWORDS=new Set(['what','where','when','who','was','were','the','did','have','about','tell','remember','know','from','that','this','with','then','more','happened','next','and','there','here','does','could','would','please','me','you','our','their','they','him','her','them','which','how','any','for','are']);
export interface RecallTurn { question:string; answer:string; terms:string[] }
export function answerRecall(campaign:Campaign,question:string,previous?:RecallTurn):RecallTurn {
 const words=question.toLowerCase().match(/[a-z]{3,}/g)??[];
 const terms=[...new Set(words.filter(w=>!RECALL_STOPWORDS.has(w)))];
 const followup=/^(?:and\b|what about\b|tell me more\b|what happened next\b|where was\b|who was\b)/i.test(question.trim());
 const queryTerms=terms.length?terms:(followup?previous?.terms??[]:[]);
 const fallback='I cannot find that in the recorded campaign history. That does not establish it never happened.';
 if(!queryTerms.length)return {question,terms:[],answer:'Ask about a person, place, or event to search recorded campaign history.'};
 const matches=(text:string)=>queryTerms.some(t=>text.toLowerCase().includes(t));
 const people=(campaign.world?.npcs??[]).filter(n=>matches([n.name,n.role,n.location,...n.notes].join(' '))).map(n=>[n.name,n.role,n.location,n.relationship,...n.notes].filter(Boolean).join(' · '));
 const places=(campaign.world?.places??[]).filter(p=>matches([p.name,p.description,...p.notes].join(' '))).map(p=>[p.name,p.description,...p.notes].filter(Boolean).join(' · '));
 const events=legacyEncounters(campaign).filter(e=>matches(e.summary+' '+e.recount)).slice(-5).map(e=>e.recount);
 const found=[...people.slice(0,5),...places.slice(0,5),...events];
 return {question,terms:queryTerms,answer:found.length?found.join('\n\n'):fallback};
}
export function recallJournal(campaign:Campaign,question:string):string {
 return answerRecall(campaign,question).answer;
}
export function groundedRecount(action:string,narration:string):string {
 const player=action.trim().replace(/\s+/g,' ').replace(/^I\s+/i,'');
 // Preserve the player's exact action and the DM's exact response rather than inventing motives or outcomes.
 const actionSentence=/^I\s/i.test(action.trim())?action.trim():('I '+player);
 return actionSentence.replace(/[.!?]+$/,'')+'.\n\n'+narration.trim();
}
export function refineEncounterAtDowntime(campaign:Campaign,now:string):Campaign {
 const existing=campaign.encounterJournal??[];
 if(!existing.some(e=>e.playerAction&&e.originalNarration&&!e.refinedAt))return campaign;
 return {...campaign,encounterJournal:existing.map(e=>e.playerAction&&e.originalNarration&&!e.refinedAt?{...e,recount:groundedRecount(e.playerAction,e.originalNarration),refinedAt:now}:e)};
}
export function recordEncounter(campaign:Campaign,sourceActionId:string,message:string,narration:string,now:string):Campaign {
 if(!sourceActionId||!narration.trim()||campaign.encounterJournal?.some(e=>e.sourceActionId===sourceActionId))return campaign;
 const level=campaign.character?.level??1;
 const kind=encounterKind(message,narration);
 // Retain exact source text: an invented first-person paraphrase is less trustworthy than the DM's record.
 const cleaned=narration.trim().replace(/\s+/g,' ');
 const sentence=cleaned.match(/^.{1,180}?[.!?](?=\s|$)/)?.[0];
 const summary=sentence??(cleaned.length>180?cleaned.slice(0,177).trimEnd()+'…':cleaned);
 const entry:EncounterRecord={id:'encounter-'+sourceActionId,sourceActionId,createdAt:now,level,kind,summary,recount:groundedRecount(message,narration),playerAction:message.trim(),originalNarration:narration.trim(),tags:[]};
 return {...campaign,encounterJournal:[...(campaign.encounterJournal??[]),entry]};
}
