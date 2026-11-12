import type {Ability,Scores} from './creationAbilities';
export interface FutureFeat {name:string;abilities:readonly Ability[];minimum?:Partial<Record<Ability,number>>;requirement?:'spellcasting'|'heavy-armor'|'martial-weapons'|'fighting-style'|'medium-armor'|'shield';description:string;source?:'2017'|'2024';species?:readonly string[];abilityBonus?:0|1;legacyNote?:string;lineages?:readonly string[]}
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
 feat('Skulker',['Dex'],'Improve stealth and hiding.'),
 feat('Slasher',PHYSICAL,'Improve slashing attacks.'),
 feat('Speedy',['Dex','Con'],'Improve speed and mobility.'),
 feat('Spell Sniper',MENTAL,'Improve spell attacks.','spellcasting'),
 feat('Telekinetic',MENTAL,'Gain telekinetic abilities.'),
 feat('Telepathic',MENTAL,'Gain telepathic abilities.'),
 feat('War Caster',MENTAL,'Improve concentration and casting in combat.','spellcasting'),
 feat('Weapon Master',PHYSICAL,'Gain weapon mastery properties.'),
];
/** Xanathar's Guide to Everything (2017) legacy racial feats. Requires DM permission. */
const legacy=(name:string,abilities:readonly Ability[],species:readonly string[],description:string,abilityBonus:0|1=1):FutureFeat=>({name,abilities,species,description,source:'2017',abilityBonus,legacyNote:'2017 legacy feat; requires DM approval and compatible species'});
export const LEGACY_FEATS:readonly FutureFeat[]=[
 legacy('Elven Accuracy',['Dex','Int','Wis','Cha'],['elf','half-elf'],'Reroll one die of an attack roll made with Advantage using Dexterity, Intelligence, Wisdom, or Charisma.'),
 legacy('Bountiful Luck',[],['halfling'],'Allow a nearby ally to reroll a natural 1 on a d20 test.',0),
 legacy('Second Chance',['Dex','Con','Cha'],['halfling'],'Force an attacker that hits you to reroll its attack.'),
 legacy('Dwarven Fortitude',['Con'],['dwarf'],'Spend a Hit Die to heal when taking the Dodge action.'),
 legacy('Fade Away',['Dex','Int'],['gnome'],'Become invisible briefly after taking damage.'),
 {...legacy('Fey Teleportation',['Int','Cha'],['elf'],'Learn Sylvan and gain a short-range teleportation spell.'),lineages:['high-elf']},
 {...legacy('Wood Elf Magic',[],['elf'],'Learn druidic magic including a nature-themed cantrip and spells.',0),lineages:['wood-elf']},
 {...legacy('Drow High Magic',[],['elf'],'Gain additional innate magic associated with drow heritage.',0),lineages:['drow']},
 legacy('Dragon Fear',['Str','Con','Cha'],['dragonborn'],'Use your breath weapon to frighten nearby creatures.'),
 legacy('Dragon Hide',['Str','Con','Cha'],['dragonborn'],'Gain natural armor and claws.'),
 legacy('Flames of Phlegethos',['Int','Cha'],['tiefling'],'Empower fire spells and surround yourself with protective flames.'),
 legacy('Infernal Constitution',['Con'],['tiefling'],'Gain resistance to cold and poison and improved poison resilience.'),
 legacy('Orcish Fury',['Str','Con'],['half-orc'],'Add extra weapon damage and retaliate when reduced to zero hit points.'),
 legacy('Prodigy',[],['human','half-elf','half-orc'],'Gain a skill, tool, language, and expertise.',0),
 legacy('Squat Nimbleness',['Str','Dex'],['dwarf','gnome','halfling'],'Improve speed, escape from grapples, and gain Athletics or Acrobatics proficiency.'),
];
/** Origin feats are not General feats; taking them at later levels does not grant an ASI. */
export const ORIGIN_PLANNING_FEATS:readonly FutureFeat[]=[{name:'Skilled',abilities:[],description:'Gain three skill or tool proficiencies.',source:'2024',abilityBonus:0}];
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
export function futureFeat(name:string){return [...FUTURE_FEATS,...ORIGIN_PLANNING_FEATS,...LEGACY_FEATS,...EPIC_BOONS].find(f=>f.name===name)}
export interface FeatContext {classId?:string;spellcasting?:boolean;heavyArmor?:boolean;mediumArmor?:boolean;shield?:boolean;saveProficiencies?:readonly Ability[];speciesId?:string;lineageId?:string;allowCompatibleLegacy?:boolean}
export function featEligibility(f:FutureFeat,scores:Scores,context:FeatContext={}):string[]{
 const issues:string[]=[];
 if(f.source==='2017'&&context.allowCompatibleLegacy===false)issues.push('Compatible legacy feats are disabled');
 if(f.species&&(!context.speciesId||!f.species.includes(context.speciesId)))issues.push(`Requires compatible species: ${f.species.join(', ')}`);
 if(f.lineages&&(!context.lineageId||!f.lineages.includes(context.lineageId)))issues.push(`Requires legacy lineage: ${f.lineages.join(', ')}; 2024 lineage compatibility requires DM approval`);
 issues.push(...Object.entries(f.minimum??{}).filter(([a,n])=>scores[a as Ability]<(n??0)).map(([a,n])=>`${a} ${n} required`));
 if(f.requirement==='spellcasting'&&context.spellcasting===false)issues.push('Spellcasting or Pact Magic feature required');
 if(f.requirement==='heavy-armor'&&context.heavyArmor===false)issues.push('Heavy armor training required');
 if(f.requirement==='medium-armor'&&context.mediumArmor===false)issues.push('Medium armor training required');
 if(f.requirement==='shield'&&context.shield===false)issues.push('Shield training required');
 return issues;
}
export function eligibleFeatAbility(f:FutureFeat,ability:Ability,scores:Scores){return f.abilityBonus!==0&&f.abilities.includes(ability)&&scores[ability]<20}

export function featCompatibilityWarnings(f:FutureFeat,context:FeatContext={}):string[]{return f.source==='2017'?[`2017 legacy feat (Xanathar’s Guide to Everything): DM approval required; 2024 compatibility is provisional${f.lineages?' for '+f.lineages.join(' / ')+' lineage':''}.`,...(f.lineages&&!context.lineageId?['Choose a 2024 elven lineage before planning this feat.']:[])]:[];}
