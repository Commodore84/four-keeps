import type {Campaign} from './campaign';

/** A level-nine Arcane Trickster imposes disadvantage on saves against a spell
 * cast while hidden from the creature making the saving throw. */
export function rogueMagicalAmbushApplies(campaign:Campaign,hiddenFromTarget:boolean,spellRequiresSave:boolean):boolean{
 return campaign.characterIdentity?.classId==='rogue'
  &&campaign.importedSubclassId==='rogue-arcane-trickster'
  &&(campaign.character?.level??0)>=9
  &&hiddenFromTarget===true&&spellRequiresSave===true;
}

/** Deterministic save total from two verified d20 rolls. The caller must establish
 * hidden-from-target state at the moment the spell is cast, before revealing the caster. */
export function resolveRogueMagicalAmbushSave(campaign:Campaign,hiddenFromTarget:boolean,rolls:readonly number[],modifier:number,dc:number):{total:number;success:boolean;disadvantage:boolean}{
 if(rolls.length!==2||rolls.some(n=>!Number.isInteger(n)||n<1||n>20)||!Number.isInteger(modifier)||!Number.isInteger(dc)||dc<1)throw Error('Two verified d20 rolls, modifier, and DC are required.');
 const disadvantage=rogueMagicalAmbushApplies(campaign,hiddenFromTarget,true);
 const total=(disadvantage?Math.min(...rolls):rolls[0])+modifier;
 return {total,success:total>=dc,disadvantage};
}
