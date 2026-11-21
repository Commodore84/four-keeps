/** Accept only a finished, non-refused provider message. */
export function readProviderNarration(response) {
 if(response?.status !== 'completed') {
  throw new Error('The Dungeon Master response was incomplete. Retry your action.');
 }
 const messages = Array.isArray(response.output) ? response.output.filter(item => item?.type === 'message') : [];
 const parts = messages.flatMap(message => Array.isArray(message.content) ? message.content : []);
 if(parts.some(part => part?.type === 'refusal')) {
  throw new Error('The Dungeon Master could not answer this action. Retry your action.');
 }
 return parts.filter(part => part?.type === 'output_text' && typeof part.text === 'string')
  .map(part => part.text).join('\n');
}

/** Fail closed on malformed structured DM output; never turn JSON or metadata into narration. */
export function parseDungeonMasterResponse(text) {
 if(typeof text!=='string'||!text.trim())throw new Error('AI returned no narration.');
 let parsed;
 try { parsed=JSON.parse(text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'')); }
 catch { throw new Error('The Dungeon Master returned an invalid response. Retry your action; no world changes were saved.'); }
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||typeof parsed.narration!=='string'||!parsed.narration.trim())throw new Error('The Dungeon Master returned no valid narration. Retry your action.');
 if(parsed.clarificationRequest!=null && (!parsed.clarificationRequest||typeof parsed.clarificationRequest!=='object'||Array.isArray(parsed.clarificationRequest)||typeof parsed.clarificationRequest.question!=='string'||!parsed.clarificationRequest.question.trim()||parsed.clarificationRequest.question.length>300))throw new Error('The Dungeon Master returned an invalid clarification question. Retry without advancing the action.');
 if(parsed.combatStart!=null && (!parsed.combatStart||typeof parsed.combatStart!=='object'||Array.isArray(parsed.combatStart)||typeof parsed.combatStart.enemyName!=='string'||!parsed.combatStart.enemyName.trim()||parsed.combatStart.enemyName.trim().length>60))throw new Error('The Dungeon Master proposed an incomplete encounter. Retry the action; no enemy statistics or dice were invented.');
 return {...parsed,narration:parsed.narration.trim()};
}
