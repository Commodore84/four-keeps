/** Parses a proposed price only; never authorizes a discount or purchase. */
export function parseMerchantDiscountRequest(message:string,totalCp:number):number|null {
 const explicit=message.match(/\b(\d{1,2})\s*%\s*(?:off|discount|less|reduction)\b|\b(?:discount|off|reduce|lower|take|knock)\D{0,35}?(\d{1,2})\s*%/i);
 if(explicit)return Number(explicit[1]??explicit[2]);
 const money=message.match(/\b(?:for|at|offer|take|accept|pay)\s+(\d+(?:\.\d{1,2})?)\s*(gp|gold|sp|silver|cp|copper)\b/i);
 if(!money||!Number.isSafeInteger(totalCp)||totalCp<=0)return null;
 const factor=/^(gp|gold)$/i.test(money[2])?100:/^(sp|silver)$/i.test(money[2])?10:1;
 const offered=Math.round(Number(money[1])*factor);
 if(!Number.isSafeInteger(offered)||offered<=0||offered>=totalCp)return null;
 return Math.ceil((totalCp-offered)*100/totalCp);
}
export function merchantPurchaseReply(message:string):'accept'|'cancel'|null {
 const normalized=message.trim().toLowerCase().replace(/[.!]+$/,'').trim();
 if(/^(?:yes|yes please|confirm|confirm purchase|buy|buy it|purchase|deal|sounds good|i(?:'ll| will) take (?:it|them|the lot)|i(?:'ll| will) buy (?:it|them)|you have a deal|that works for me)$/.test(normalized))return 'accept';
 if(/^(?:no|no thanks|cancel|cancel order|decline|never mind|nevermind|forget it|not today)$/.test(normalized))return 'cancel';
 return null;
}
