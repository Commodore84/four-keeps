import type {Ability,Scores} from './creationAbilities';
export interface FutureFeat {name:string;abilities:readonly Ability[];minimum?:Partial<Record<Ability,number>>;description:string}
export const FUTURE_FEATS:readonly FutureFeat[]=[
 {name:'Athlete',abilities:['Str','Dex'],description:'Improve athletic mobility and climbing.'},
 {name:'Charger',abilities:['Str','Dex'],description:'Improve attacks after moving into a charge.'},
 {name:'Crusher',abilities:['Str','Con'],description:'Improve attacks that deal bludgeoning damage.'},
 {name:'Defensive Duelist',abilities:['Dex'],minimum:{Dex:13},description:'Use a finesse weapon to improve defense.'},
 {name:'Durable',abilities:['Con'],description:'Improve your endurance and recovery.'},
 {name:'Fey-Touched',abilities:['Int','Wis','Cha'],description:'Gain fey magic and improve a mental ability.'},
 {name:'Grappler',abilities:['Str','Dex'],minimum:{Str:13},description:'Improve your grappling and unarmed combat.'},
 {name:'Heavy Armor Master',abilities:['Str','Con'],description:'Reduce damage while wearing heavy armor; armor training required.'},
 {name:'Keen Mind',abilities:['Int'],description:'Improve memory and intellectual skills.'},
 {name:'Mage Slayer',abilities:['Str','Dex'],description:'Improve your ability to challenge spellcasters.'},
 {name:'Observant',abilities:['Int','Wis'],description:'Improve perception and investigative awareness.'},
 {name:'Piercer',abilities:['Str','Dex'],description:'Improve piercing weapon damage.'},
 {name:'Resilient',abilities:['Str','Dex','Con','Int','Wis','Cha'],description:'Gain proficiency in the chosen ability saving throw.'},
 {name:'Shadow-Touched',abilities:['Int','Wis','Cha'],description:'Gain shadow magic and improve a mental ability.'},
 {name:'Skill Expert',abilities:['Str','Dex','Con','Int','Wis','Cha'],description:'Gain skill proficiency and expertise.'},
 {name:'Slasher',abilities:['Str','Dex'],description:'Improve slashing attacks.'},
 {name:'Speedy',abilities:['Dex','Con'],description:'Improve speed and mobility.'},
 {name:'Telekinetic',abilities:['Int','Wis','Cha'],description:'Gain telekinetic abilities.'},
 {name:'Telepathic',abilities:['Int','Wis','Cha'],description:'Gain telepathic abilities.'},
 {name:'War Caster',abilities:['Int','Wis','Cha'],description:'Improve concentration and casting in combat; spellcasting required.'},
];
export function futureFeat(name:string){return FUTURE_FEATS.find(f=>f.name===name)}
export function featEligibility(feat:FutureFeat,scores:Scores):string[]{return Object.entries(feat.minimum??{}).filter(([ability,value])=>scores[ability as Ability]<(value??0)).map(([ability,value])=>`${ability} ${value} required`)}
