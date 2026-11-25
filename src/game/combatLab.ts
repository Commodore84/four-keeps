import {newCampaign,type Campaign} from './campaign';
import {buildSoloEncounter,SOLO_ROGUE_ENCOUNTERS,type SoloEncounterId} from './encounterDirector';
import {restorePracticeEncounter} from './practiceEncounterBridge';
import {validateGeneratedBattlefield,generateBattlefield} from './battlefieldGenerator';

/** A disposable campaign built through precisely the same encounter director,
 * generated geometry, and classic-combat handoff as normal DM play.
 * No production combat engine is forked or simulated by the lab.
 */
export const COMBAT_LAB_SCENARIOS=['warehouse-vermin','roadside-bandit','ruins-goblin-scouts'] as const;
export type CombatLabRecord={environment:SoloEncounterId;seed:string;originCampaignId?:string;createdAt:string};

export function isCombatLab(campaign:Campaign|null|undefined):boolean{
 return !!campaign?.combatLab;
}
export function makeCombatLabEncounter(environment:SoloEncounterId,seed:string,origin?:Campaign|null,now=new Date().toISOString()):Campaign{
 if(!COMBAT_LAB_SCENARIOS.includes(environment)||!/^[-a-zA-Z0-9_]{4,90}$/.test(seed))throw Error('Invalid reproducible encounter seed or environment.');
 const id='combat-lab-'+crypto.randomUUID();
 const originCampaignId=origin?.combatLab?.originCampaignId??(origin&&!origin.combatLab?origin.id:undefined);
 const scenario=buildSoloEncounter(environment,'combat-lab',seed).scenario;
 const title='Combat Lab · '+SOLO_ROGUE_ENCOUNTERS[environment].name;
 const starting=newCampaign(title,id,now);
 const lab:CombatLabRecord={environment,seed,createdAt:now,...(originCampaignId?{originCampaignId}:{})};
 // Use the same classic combat handoff as real DM-confirmed tactical encounters.
 // Clone a Rogue's sheet/gear into a distinct lab campaign only; do not persist
 // anything back to the source adventure.
 const source=origin&&!origin.combatLab?origin:null;
 const canUseSheet=source?.characterIdentity?.classId==='rogue'&&!!source?.character;
 const staged:Campaign={
   ...starting,combatLab:lab,location:'Combat Lab',
   ...(canUseSheet?{
     character:structuredClone(source.character),
     characterIdentity:structuredClone(source.characterIdentity),
     ...(source.characterBuild?{characterBuild:structuredClone(source.characterBuild)}:{}),
     ...(source.equipment?{equipment:structuredClone(source.equipment)}:{}),
     ...(source.inventoryLedger?{inventoryLedger:structuredClone(source.inventoryLedger)}:{})
   }:{}),
   adventureSession:{status:'exploring',site:'frontier',characterSource:'campaign-character',
     visited:['frontier'],interactions:[],
     pendingEncounter:{enemyName:SOLO_ROGUE_ENCOUNTERS[environment].name,actionId:id,scenario}
   }
 };
 const ready=restorePracticeEncounter(staged);
 if(!ready.combat?.battlefield||ready.combat.classicAdventure?.origin!=='dm'||ready.combat.status!=='awaiting-initiative')
   throw Error('The shared encounter engine could not start this generated scenario.');
 return ready;
}

export function sampleRandomCombatLab(nextUint32:()=>number):{environment:SoloEncounterId;seed:string}{
 const n=nextUint32();
 if(!Number.isSafeInteger(n)||n<0||n>0xffffffff)throw Error('Invalid random encounter sample.');
 const environment=COMBAT_LAB_SCENARIOS[n%COMBAT_LAB_SCENARIOS.length];
 // The full random value becomes the reproducible seed, not just the index.
 return {environment,seed:'lab-'+n.toString(16).padStart(8,'0')};
}
/** Replay scenario geometry in tests/debugging without consulting generated art. */
export function replayCombatLabGeometry(record:CombatLabRecord){
 const generated=generateBattlefield(record.environment,record.seed);
 if(!validateGeneratedBattlefield(generated))throw Error('Saved test seed no longer generates a valid battlefield.');
 return generated;
}
