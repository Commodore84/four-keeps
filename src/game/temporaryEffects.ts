import type {CharacterStats} from './checks';
import type {Campaign} from './campaign';
import type {DamageType} from './subclassCombatRules';

export const RESISTANCE_TYPES=['Acid','Cold','Fire','Force','Lightning','Necrotic','Poison','Psychic','Radiant','Thunder'] as const;
export type ResistanceType=typeof RESISTANCE_TYPES[number];
export const STRENGTH_POTIONS={
 'Potion of Hill Giant Strength':21,'Potion of Frost Giant Strength':23,'Potion of Stone Giant Strength':23,
 'Potion of Fire Giant Strength':25,'Potion of Cloud Giant Strength':27,'Potion of Storm Giant Strength':29,
} as const;
export type StrengthPotionName=keyof typeof STRENGTH_POTIONS;
export function isStrengthPotion(name:string):name is StrengthPotionName{return Object.hasOwn(STRENGTH_POTIONS,name);}
type TimedEffect={targetId:string;expiresAt:number;encounterId?:string};
export type TemporaryEffect=TimedEffect&({kind:'potion-resistance';damageType:ResistanceType}|{kind:'potion-strength';strength:number});

export function gameSeconds(campaign:Campaign):number {
 return (campaign.elapsedMinutes??0)*60+(campaign.equipmentCombatSeconds??0);
}

export function activeTemporaryEffects(campaign:Campaign):TemporaryEffect[]{
 return (campaign.temporaryEffects??[]).filter(effect=>effect.expiresAt>gameSeconds(campaign)&&
  (!effect.encounterId||campaign.companionEncounter?.status==='active'&&effect.encounterId===campaign.companionEncounter.id));
}

export function resistsTemporaryDamage(campaign:Campaign,targetId:string,type:DamageType):boolean {
 return activeTemporaryEffects(campaign).some(effect=>effect.targetId===targetId&&effect.kind==='potion-resistance'&&effect.damageType===type);
}

function addEffect(campaign:Campaign,targetId:string,effect:Pick<TemporaryEffect,'kind'>&({kind:'potion-strength';strength:number}|{kind:'potion-resistance';damageType:ResistanceType})):Campaign{
 const timed:TemporaryEffect={...effect,targetId,expiresAt:gameSeconds(campaign)+3600,
  ...(targetId!=='nighthawk'&&!campaign.subclassActors?.[targetId]?{encounterId:campaign.companionEncounter?.id}:{})};
 const effects=activeTemporaryEffects(campaign).filter(existing=>existing.targetId!==targetId||existing.kind!==timed.kind);
 return {...campaign,temporaryEffects:[...effects,timed]};
}
export function addPotionResistance(campaign:Campaign,targetId:string,type:ResistanceType):Campaign{
 return addEffect(campaign,targetId,{kind:'potion-resistance',damageType:type});
}
export function addPotionStrength(campaign:Campaign,targetId:string,name:StrengthPotionName):Campaign{
 return addEffect(campaign,targetId,{kind:'potion-strength',strength:STRENGTH_POTIONS[name]});
}
export function effectDescription(effect:TemporaryEffect):string{
 return effect.kind==='potion-resistance'?effect.damageType+' resistance':'Strength '+effect.strength+' (if higher)';
}
export function effectiveStrength(campaign:Campaign):number|undefined{
 const base=campaign.character?.scores?.str;
 if(base===undefined)return undefined;
 return activeTemporaryEffects(campaign).reduce((strength,effect)=>effect.targetId==='nighthawk'&&effect.kind==='potion-strength'?Math.max(strength,effect.strength):strength,base);
}
export function statsWithTemporaryEffects(campaign:Campaign):CharacterStats|undefined{
 const character=campaign.character;
 const strength=effectiveStrength(campaign);
 return character&&strength!==undefined?{...character,scores:{...character.scores,str:strength}}:character;
}
