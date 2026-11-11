import type {Campaign} from './campaign';
/** Compact saved evidence for AI narration; the AI never performs state mutations. */
export function campaignPlayerContext(c:Campaign){
 const b=c.characterBuild?.selections,battle=c.companionEncounter;
 return {characterIdentity:c.characterIdentity??null,adventureSession:c.adventureSession??null,location:c.location,
 playerBuild:b?{classChoices:b.classChoices??{},spellbook:b.magic?.spellbook??[],invocations:b.magic?.invocations??[],originMagic:b.originMagic??null,equipped:b.equipment?.equipped??null}:null,
 recovery:{hitDiceRemaining:c.hitDiceRemaining??1,lastLongRestCompletedAt:c.lastLongRestCompletedAt??null},
 sharedEncounter:battle?{status:battle.status,round:battle.round,activeActor:battle.order[battle.turnIndex],participants:Object.entries(battle.participants).map(([id,p])=>({id,hp:p.hp,maxHp:p.maxHp,conditions:p.conditions,actorKind:p.actorKind,actionUsed:p.actionUsed}))}:null};
}
