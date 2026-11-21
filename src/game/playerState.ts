import {reviewErrors} from './creationReview';
import type {Campaign} from './campaign';
import {classSummary} from './creationClasses';
import type {Ability} from './checks';
/** Upgrade pre-bridge imported sheets on read without changing identity or rolled stats. */
export function hydratePlayerState(campaign:Campaign):Campaign{
 const id=campaign.characterIdentity?.classId,c=campaign.character,cls=id?classSummary(id):null;
 if(!c||!cls)return campaign;
 return {...campaign,character:{...c,classId:cls.id,savingThrowProficiencies:c.savingThrowProficiencies??cls.savingThrows.map(a=>a.toLowerCase() as Ability),weaponProficiencies:c.weaponProficiencies??[...cls.weapons]}};
}
/** Validate new persisted player fields while accepting legacy sheets without them. */
export function validPlayerState(value:unknown):boolean{
 if(!value||typeof value!=='object')return false;
 const c=value as NonNullable<Campaign['character']>;
 return (c.classId===undefined||!!classSummary(c.classId))
 &&(c.savingThrowProficiencies===undefined||Array.isArray(c.savingThrowProficiencies)&&c.savingThrowProficiencies.every(a=>['str','dex','con','int','wis','cha'].includes(a)))
 &&(c.weaponProficiencies===undefined||Array.isArray(c.weaponProficiencies)&&c.weaponProficiencies.every(a=>typeof a==='string'))
 &&(c.resources===undefined||!!c.resources&&typeof c.resources==='object'&&!Array.isArray(c.resources)&&Object.values(c.resources).every(p=>p&&Number.isSafeInteger(p.maximum)&&p.maximum>=0&&Number.isSafeInteger(p.used)&&p.used>=0&&p.used<=p.maximum&&['short','long'].includes(p.recovery)&&(p.shortRecovery===undefined||Number.isInteger(p.shortRecovery)&&p.shortRecovery>=0&&p.shortRecovery<=p.maximum)))
 &&(c.exhaustionLevel===undefined||Number.isInteger(c.exhaustionLevel)&&c.exhaustionLevel>=0&&c.exhaustionLevel<=6)
 &&(c.conditions===undefined||Array.isArray(c.conditions)&&c.conditions.every(a=>typeof a==='string'))
 &&(c.deathSaves===undefined||!!c.deathSaves&&[c.deathSaves.successes,c.deathSaves.failures].every(n=>Number.isInteger(n)&&n>=0&&n<=3)&&typeof c.deathSaves.stable==='boolean'&&typeof c.deathSaves.dead==='boolean');
}

/** New snapshots are validated; older campaigns without one remain readable. */
export function validCampaignBuild(c:Partial<Campaign>):boolean{
 if(c.character?.classId&&c.characterIdentity?.classId&&c.character.classId!==c.characterIdentity.classId)return false;
 if(c.characterBuild===undefined)return true;
 try{const b=c.characterBuild;return b!==null&&b.schemaVersion===1&&b.status==='draft'&&b.rules.edition==='2024'&&b.id===c.characterIdentity?.draftId&&b.selections.classId===c.characterIdentity?.classId&&b.selections.speciesId===c.characterIdentity?.speciesId&&reviewErrors(b).length===0;}catch{return false;}
}
