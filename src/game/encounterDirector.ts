import {getMonster,type MonsterId} from './monsterCompendium';
import {validateCombatScenario,type CombatScenario} from './combatScenario';

export type EncounterDifficulty='Low'|'Moderate'|'High'|'Over budget';
const LEVEL_ONE={Low:50,Moderate:75,High:100} as const;
export interface EncounterBudget{
 xp:number;budget:{low:number;moderate:number;high:number};difficulty:EncounterDifficulty;
 soloActionEconomyWarning:boolean;aboveLevelOneBudget:boolean;
}
export function levelOneEncounterBudget(ids:readonly MonsterId[],playerCount=1):EncounterBudget{
 if(!Number.isInteger(playerCount)||playerCount<1||playerCount>8)throw Error('Invalid party size.');
 if(!ids.length||ids.length>8)throw Error('An encounter needs one to eight monsters.');
 const xp=ids.reduce((sum,id)=>{const m=getMonster(id);if(!m)throw Error('Unknown verified monster.');return sum+m.xp;},0);
 const low=LEVEL_ONE.Low*playerCount,moderate=LEVEL_ONE.Moderate*playerCount,high=LEVEL_ONE.High*playerCount;
 return {xp,budget:{low,moderate,high},difficulty:xp<=low?'Low':xp<=moderate?'Moderate':xp<=high?'High':'Over budget',
  soloActionEconomyWarning:playerCount===1&&ids.length>1,aboveLevelOneBudget:xp>high};
}
export type SoloEncounterId='warehouse-vermin'|'roadside-bandit'|'ruins-goblin-scouts';
export type EncounterTemplate={
 id:SoloEncounterId;name:string;hook:string;objective:string;monsterIds:readonly MonsterId[];
 battlefield:Omit<CombatScenario,'locationKey'|'actors'>;
 alternatives:readonly ('fight'|'withdraw'|'negotiate'|'investigate'|'retrieve-objective')[];
};
const map=(objective:string,actors:number):EncounterTemplate['battlefield']=>({
 size:8,objective,starts:[{x:1,y:5},{x:1,y:6}],obstacles:[{x:4,y:4}],
 cover:[{x:2,y:4},{x:5,y:5}],difficult:[{x:3,y:3}],exits:[{x:0,y:5}],
 surprised:false,...(actors===2?{darkness:[{x:5,y:2}]}:{})
});
export const SOLO_ROGUE_ENCOUNTERS:Record<SoloEncounterId,EncounterTemplate>={
 'warehouse-vermin':{
  id:'warehouse-vermin',name:'Vermin in the Warehouse',hook:'Damaged cargo invites investigation.',
  objective:'Investigate the damaged cargo and return safely.',monsterIds:['giant-rat'],
  battlefield:map('Investigate damaged cargo.',1),alternatives:['fight','withdraw','investigate']
 },
 'roadside-bandit':{
  id:'roadside-bandit',name:'The Roadside Robber',hook:'A traveler describes a robbery beyond Dasahi.',
  objective:'Resolve or report the robbery.',monsterIds:['bandit'],
  battlefield:map('Resolve or report the robbery.',1),alternatives:['fight','withdraw','negotiate','investigate']
 },
 'ruins-goblin-scouts':{
  id:'ruins-goblin-scouts',name:'Trouble at the Ruins',hook:'A missing delivery may be hidden in roadside ruins.',
  objective:'Recover the missing parcel or discover its fate.',monsterIds:['goblin-minion','goblin-minion'],
  battlefield:map('Recover or locate the missing parcel.',2),alternatives:['fight','withdraw','negotiate','retrieve-objective','investigate']
 }
};
export function buildSoloEncounter(id:SoloEncounterId,locationKey:string):{scenario:CombatScenario;assessment:EncounterBudget}{
 const template=SOLO_ROGUE_ENCOUNTERS[id];
 if(!template)throw Error('Unknown encounter template.');
 const positions=template.monsterIds.map((monsterId,index)=>({
  id:monsterId+'-'+(index+1),label:getMonster(monsterId)!.name,profile:monsterId,
  side:'enemies' as const,square:{x:5+index,y:2}
 }));
 const scenario=validateCombatScenario({...template.battlefield,actors:positions},locationKey);
 return {scenario,assessment:levelOneEncounterBudget(template.monsterIds)};
}
