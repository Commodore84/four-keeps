import type {Campaign} from './campaign';
import {getMonster,type MonsterId} from './monsterCompendium';

/** Character knowledge is deliberately not the authoritative GM stat block. */
export type MonsterKnowledgeEntry={
 monsterId:MonsterId;firstSeenAt:string;firstSeenLocation:string;
 encounters:number;observedAbilities:string[];
};
export function recordMonsterSighting(campaign:Campaign,ids:readonly string[],now=new Date().toISOString()):Campaign{
 const entries={...campaign.monsterKnowledge};
 for(const id of new Set(ids)){
  if(!getMonster(id))continue;
  const key=id as MonsterId;
  const entry=entries[key];
  entries[key]=entry?{...entry,encounters:entry.encounters+1}:{
   monsterId:key,firstSeenAt:now,firstSeenLocation:campaign.location??'Unknown location',
   encounters:1,observedAbilities:[]};
 }
 return {...campaign,monsterKnowledge:entries};
}
export function recordMonsterAbility(campaign:Campaign,id:string,abilityId:string):Campaign{
 const monster=getMonster(id),entry=campaign.monsterKnowledge?.[id as MonsterId];
 if(!monster||!entry)return campaign;
 const observed=[...monster.traits,...monster.actions,...monster.bonusActions,...monster.reactions].some(action=>action.id===abilityId);
 if(!observed||entry.observedAbilities.includes(abilityId))return campaign;
 return {...campaign,monsterKnowledge:{...campaign.monsterKnowledge,[id]:{
  ...entry,observedAbilities:[...entry.observedAbilities,abilityId]}}};
}
export function knownMonsterFacts(entry:MonsterKnowledgeEntry){
 const monster=getMonster(entry.monsterId);
 if(!monster)return null;
 const known=[...monster.traits,...monster.actions,...monster.bonusActions,...monster.reactions]
  .filter(ability=>entry.observedAbilities.includes(ability.id))
  .map(ability=>({name:ability.name,description:ability.description}));
 return {name:monster.name,type:monster.type,known};
}
