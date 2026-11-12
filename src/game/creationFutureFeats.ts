import type {Ability,Scores} from './creationAbilities';
export interface FutureFeat {name:string;abilities:readonly Ability[];minimum?:Partial<Record<Ability,number>>;requirement?:'spellcasting'|'heavy-armor'|'martial-weapons'|'fighting-style'|'medium-armor'|'shield';description:string}
const ALL=['Str','Dex','Con','Int','Wis','Cha'] as const;
const MENTAL=['Int','Wis','Cha'] as const;
const PHYSICAL=['Str','Dex'] as const;
const feat=(name:string,abilities:readonly Ability[],description:string,requirement?:FutureFeat['requirement'],minimum?:FutureFeat['minimum']):FutureFeat=>({name,abilities,description,requirement,minimum});
/** 2024 PHB general feats; each offers a +1 to an allowed ability except ASI (handled separately). */
export const FUTURE_FEATS:readonly FutureFeat[]=[
 feat('Actor',['Cha'],'Impersonation and performance.'),
 feat('Athlete',PHYSICAL,'Improve athletic mobility and climbing.'),
 feat('Charger',PHYSICAL,'Improve attacks after moving into a charge.'),
 feat('Chef',['Con','Wis'],'Prepare restorative food.'),
 feat('Crossbow Expert',['Dex'],'Improve crossbow attacks.'),
 feat('Crusher',['Str','Con'],'Improve bludgeoning attacks.'),
 feat('Defensive Duelist',['Dex'],'Defend using a finesse weapon.',undefined,{Dex:13}),
 feat('Dual Wielder',PHYSICAL,'Improve two-weapon fighting.'),
 feat('Durable',['Con'],'Improve endurance and recovery.'),
 feat('Elemental Adept',MENTAL,'Specialize in an elemental damage type.','spellcasting'),
 feat('Fey-Touched',MENTAL,'Gain fey magic and improve a mental ability.'),
 feat('Grappler',PHYSICAL,'Improve grappling and unarmed combat.',undefined,{Str:13}),
 feat('Great Weapon Master',['Str'],'Improve heavy-weapon attacks.',undefined,{Str:13}),
 feat('Heavily Armored',['Str','Con'],'Gain heavy armor training.','medium-armor'),
 feat('Heavy Armor Master',['Str','Con'],'Reduce damage while wearing heavy armor.','heavy-armor'),
 feat('Inspiring Leader',['Wis','Cha'],'Encourage allies with temporary hit points.'),
 feat('Keen Mind',['Int'],'Improve memory and intellectual skills.'),
 feat('Lightly Armored',PHYSICAL,'Gain light armor and shield training.'),
 feat('Mage Slayer',PHYSICAL,'Challenge spellcasters.'),
 feat('Martial Weapon Training',PHYSICAL,'Gain martial weapon training.'),
 feat('Medium Armor Master',PHYSICAL,'Improve medium armor use.','medium-armor'),
 feat('Mounted Combatant',PHYSICAL,'Improve mounted combat.'),
 feat('Observant',['Int','Wis'],'Improve perception and investigative awareness.'),
 feat('Piercer',PHYSICAL,'Improve piercing attacks.'),
 feat('Poisoner',['Dex','Int'],'Improve poison use.'),
 feat('Polearm Master',PHYSICAL,'Improve polearm combat.'),
 feat('Resilient',ALL,'Gain proficiency in the chosen ability saving throw.'),
 feat('Ritual Caster',MENTAL,'Gain ritual spellcasting.'),
 feat('Sentinel',PHYSICAL,'Protect allies and control enemy movement.'),
 feat('Shadow-Touched',MENTAL,'Gain shadow magic.'),
 feat('Sharpshooter',['Dex'],'Improve ranged weapon attacks.',undefined,{Dex:13}),
 feat('Shield Master',['Str'],'Improve combat with a shield.','shield'),
 feat('Skill Expert',ALL,'Gain skill proficiency and expertise.'),
 feat('Skilled',ALL,'Gain additional skill or tool proficiencies.'),
 feat('Skulker',['Dex'],'Improve stealth and hiding.'),
 feat('Slasher',PHYSICAL,'Improve slashing attacks.'),
 feat('Speedy',['Dex','Con'],'Improve speed and mobility.'),
 feat('Spell Sniper',MENTAL,'Improve spell attacks.','spellcasting'),
 feat('Telekinetic',MENTAL,'Gain telekinetic abilities.'),
 feat('Telepathic',MENTAL,'Gain telepathic abilities.'),
 feat('War Caster',MENTAL,'Improve concentration and casting in combat.','spellcasting'),
 feat('Weapon Master',PHYSICAL,'Gain weapon mastery properties.'),
];
export const EPIC_BOONS:readonly FutureFeat[]=[
 feat('Boon of Combat Prowess',ALL,'Improve a missed attack.'),
 feat('Boon of Dimensional Travel',ALL,'Teleport after taking the Attack or Magic action.'),
 feat('Boon of Energy Resistance',ALL,'Gain resistance to energy damage.'),
 feat('Boon of Fate',ALL,'Influence a nearby creature’s d20 test.'),
 feat('Boon of Fortitude',ALL,'Increase maximum hit points and improve recovery.'),
 feat('Boon of Irresistible Offense',ALL,'Overcome resistance and improve critical damage.'),
 feat('Boon of Recovery',ALL,'Recover hit points and resist death.'),
 feat('Boon of Skill',ALL,'Improve skills.'),
 feat('Boon of Speed',ALL,'Increase speed and mobility.'),
 feat('Boon of Spell Recall',ALL,'Cast a spell without expending a spell slot.'),
 feat('Boon of the Night Spirit',ALL,'Gain stealth and invisibility in darkness.'),
 feat('Boon of Truesight',ALL,'Gain truesight.'),
];
export function futureFeat(name:string){return [...FUTURE_FEATS,...EPIC_BOONS].find(f=>f.name===name)}
export interface FeatContext {classId?:string;spellcasting?:boolean;heavyArmor?:boolean;mediumArmor?:boolean;shield?:boolean;saveProficiencies?:readonly Ability[]}
export function featEligibility(f:FutureFeat,scores:Scores,context:FeatContext={}):string[]{
 const issues=Object.entries(f.minimum??{}).filter(([a,n])=>scores[a as Ability]<(n??0)).map(([a,n])=>`${a} ${n} required`);
 if(f.requirement==='spellcasting'&&context.spellcasting===false)issues.push('Spellcasting or Pact Magic feature required');
 if(f.requirement==='heavy-armor'&&context.heavyArmor===false)issues.push('Heavy armor training required');
 if(f.requirement==='medium-armor'&&context.mediumArmor===false)issues.push('Medium armor training required');
 if(f.requirement==='shield'&&context.shield===false)issues.push('Shield training required');
 return issues;
}
export function eligibleFeatAbility(f:FutureFeat,ability:Ability,scores:Scores){return f.abilities.includes(ability)&&scores[ability]<20}
