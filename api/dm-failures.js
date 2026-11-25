/** Stable public diagnostics. Never expose provider messages, prompts or credentials. */
export function providerFailure(status, providerCode) {
 const code = status===429?'provider_rate_limit':status===401||status===403?'provider_auth':status===400?'provider_bad_request':status>=500?'provider_unavailable':'provider_rejected';
 const message = code==='provider_rate_limit'?'The AI service is busy. Wait a moment and retry.':code==='provider_auth'?'The AI service credentials were rejected. Contact the game administrator.':code==='provider_bad_request'?'The AI service rejected the opening request. Contact the game administrator.':'The AI service could not complete the request. Please retry.';
 return {status:code==='provider_rate_limit'?429:502,code,message};
}
export function classifyDmFailure(error,stage) {
 const name=error?.name;
 if(name==='TimeoutError'||name==='AbortError')return {status:504,code:'provider_timeout',message:'The Dungeon Master took too long to respond. Retry your saved opening.'};
 if(error?.dmCode==='provider_invalid_json')return {status:502,code:'provider_invalid_json',message:'The AI service returned an unreadable response. Please retry.'};
 if(stage==='provider_validation')return {status:502,code:'provider_invalid_narration',message:'The AI response could not be used as an opening scene. Please retry.'};
 return {status:502,code:stage==='provider_request'?'provider_network':'dm_processing',message:stage==='provider_request'?'The AI service could not be reached. Please retry.':'The Dungeon Master could not finish this request. Please retry.'};
}
