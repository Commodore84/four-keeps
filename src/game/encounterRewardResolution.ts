import {awardExperience,type Campaign} from './campaign';
import type {ClassicAdventureOpponent} from './campaign';
import {MONSTER_COMPENDIUM} from './monsterCompendium';
import {SOLO_ROGUE_ENCOUNTERS,type SoloEncounterId} from './encounterDirector';

export type QuestPayout={id:string;templateId:SoloEncounterId;payer:string;amountGp:number;location:string;status:'available'|'collected'};
const oldVictoryMarker='The encounter is won. Exploration resumes; the DM may adjudicate recovered loot and rewards.';
const originalStart='Encounter opened in the original practice-combat interface. ';
type MonsterId=keyof typeof MONSTER_COMPENDIUM;

function monsterFromOpponent(opponent:ClassicAdventureOpponent):MonsterId|undefined{
 const matchingId=opponent.id.replace(/-\d+$/,'') as MonsterId;
 if(Object.hasOwn(MONSTER_COMPENDIUM,matchingId)&&MONSTER_COMPENDIUM[matchingId].name.toLowerCase()===opponent.name.replace(/ \d+$/,'').toLowerCase())return matchingId;
 return undefined;
}
function monsterFromName(name:string):MonsterId|undefined{
 const id=(Object.keys(MONSTER_COMPENDIUM) as MonsterId[]).find(key=>MONSTER_COMPENDIUM[key].name===name.trim());
 return id;
}
function contractFor(monsters:MonsterId[]){
 return Object.values(SOLO_ROGUE_ENCOUNTERS).find(template=>template.monsterIds.length===monsters.length&&template.monsterIds.every((id,i)=>id===monsters[i]));
}
function settle(campaign:Campaign,markerId:string,monsters:MonsterId[],now:string):Campaign{
 if(!monsters.length)return campaign;
 const xp=monsters.reduce((value,id)=>value+MONSTER_COMPENDIUM[id].xp,0);
 const awardId='classic-encounter-'+markerId;
 let result=campaign;
 if(xp>0)result=awardExperience(result,xp,'Defeated '+monsters.map(id=>MONSTER_COMPENDIUM[id].name).join(' and '),awardId);
 const template=contractFor(monsters);
 if(template){
  const id='contract-'+markerId;
  if(!result.questPayouts?.some(payout=>payout.id===id)){
   const offered=template.contract;
   const payout:QuestPayout={id,templateId:template.id,payer:offered.payer,amountGp:offered.amountGp,location:offered.location,status:'available'};
   result={...result,questPayouts:[...(result.questPayouts??[]),payout],journal:[...result.journal,{id:'quest-offer-'+id,kind:'system',text:'Contract completed: '+offered.amountGp+' GP payable by '+offered.payer+' in '+offered.location+'. Claim the payment in Adventure.',createdAt:now}]};
  }
 }
 return result;
}

/** Awards monster XP on victory, immediately and at most once per persisted completion.
 * Coin is only an available contract payment; no money is invented or added yet.
 */
export function settleClassicVictory(campaign:Campaign,combat:NonNullable<Campaign['combat']>,completionId:string,now=new Date().toISOString()):Campaign{
 if(!combat.classicAdventure||combat.outcome==='player-defeated'||combat.enemyHp!==0||(combat.secondEnemy&&combat.secondEnemy.hp!==0))return campaign;
 const opponents=[combat.classicAdventure.first,...(combat.classicAdventure.second?[combat.classicAdventure.second]:[])];
 const monsters=opponents.map(monsterFromOpponent);
 if(monsters.some(id=>!id))return campaign;
 return settle(campaign,completionId,monsters as MonsterId[],now);
}

/** Recover earned XP and any posted contract without replaying already completed combat.
 * Only the precise engine-written encounter-start and victory journal messages are trusted.
 */
export function recoverClassicVictoryRewards(campaign:Campaign):Campaign{
 if(campaign.combat)return campaign;
 let result=campaign;
 const entries=campaign.journal;
 for(let index=0;index<entries.length;index++){
  if(entries[index].kind!=='system'||entries[index].text!==oldVictoryMarker)continue;
  const marker=entries[index];
  const start=entries.slice(0,index).map(entry=>entry.kind==='system'&&entry.text.startsWith(originalStart)).lastIndexOf(true);
  if(start<0)continue;
  const previous=entries.slice(start+1,index).some(entry=>entry.kind==='system'&&entry.text===oldVictoryMarker);
  if(previous)continue;
  const text=entries[start].text;
  const actorText=text.slice(originalStart.length).replace(/ are present\.$/,'');
  if(!text.endsWith(' are present.'))continue;
  const ids=actorText.split(' and ').map(monsterFromName);
  if(ids.length<1||ids.length>2||ids.some(id=>!id))continue;
  result=settle(result,marker.id,ids as MonsterId[],marker.createdAt);
 }
 return result;
}

export function claimQuestPayment(campaign:Campaign,id:string,now=new Date().toISOString()):Campaign{
 const payable=campaign.questPayouts?.find(payout=>payout.id===id);
 if(!payable||payable.status!=='available')return campaign;
 const ledger=campaign.inventoryLedger??{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[]};
 const gold=ledger.currency.GP+payable.amountGp;
 if(!Number.isSafeInteger(gold))throw Error('Gold balance exceeds safe range.');
 return {...campaign,inventoryLedger:{...ledger,currency:{...ledger.currency,GP:gold}},
  questPayouts:campaign.questPayouts!.map(payout=>payout.id===id?{...payout,status:'collected' as const}:payout),
  journal:[...campaign.journal,{id:'quest-paid-'+id,kind:'system',text:payable.payer+' pays '+payable.amountGp+' GP for the completed '+SOLO_ROGUE_ENCOUNTERS[payable.templateId].name+' contract. Gold added to inventory.',createdAt:now}],updatedAt:now};
}
