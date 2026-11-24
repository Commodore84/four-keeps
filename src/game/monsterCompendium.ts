/**
 * GM-only 2024 SRD monster source of truth. Never expose this complete registry
 * to a player journal until that campaign has earned the relevant knowledge.
 *
 * Material from System Reference Document 5.2.1 by Wizards of the Coast LLC,
 * licensed under CC BY 4.0: https://www.dndbeyond.com/srd
 * License: https://creativecommons.org/licenses/by/4.0/
 */
export type MonsterAbility='str'|'dex'|'con'|'int'|'wis'|'cha';
export interface MonsterAction{
 id:string;name:string;economy:'action'|'bonus'|'reaction';
 attack?:{kind:'melee'|'ranged'|'both';bonus:number;reachFeet?:number;normalFeet?:number;longFeet?:number;
  damageDice:string;damageModifier:number;damageType:'Piercing'|'Slashing'|'Bludgeoning';};
 effect?:'pack-tactics'|'nimble-escape';
 description:string;
}
export interface MonsterDefinition{
 id:string;name:string;size:string;type:string;alignment:string;cr:string;xp:number;proficiency:number;
 ac:number;hp:number;hitDice:string;speedFeet:number;climbFeet?:number;initiative:number;
 abilities:Record<MonsterAbility,number>;saves:Partial<Record<MonsterAbility,number>>;
 skills:Record<string,number>;senses:{passivePerception:number;darkvisionFeet?:number};languages:string[];
 vulnerabilities:string[];resistances:string[];immunities:string[];conditionImmunities:string[];
 traits:MonsterAction[];actions:MonsterAction[];bonusActions:MonsterAction[];reactions:MonsterAction[];
 source:'SRD 5.2.1';
}
const monster=(data:Omit<MonsterDefinition,'proficiency'|'source'|'vulnerabilities'|'resistances'|'immunities'|'conditionImmunities'>):MonsterDefinition=>({
 ...data,proficiency:2,source:'SRD 5.2.1',vulnerabilities:[],resistances:[],immunities:[],conditionImmunities:[]
});
export const MONSTER_COMPENDIUM={
 'giant-rat':monster({
  id:'giant-rat',name:'Giant Rat',size:'Small',type:'Beast',alignment:'Unaligned',cr:'1/8',xp:25,
  ac:13,hp:7,hitDice:'2d6',speedFeet:30,climbFeet:30,initiative:3,
  abilities:{str:7,dex:16,con:11,int:2,wis:10,cha:4},saves:{dex:5},skills:{Perception:2},
  senses:{passivePerception:12,darkvisionFeet:60},languages:[],
  traits:[{id:'pack-tactics',name:'Pack Tactics',economy:'action',effect:'pack-tactics',
   description:'Advantage on attacks when a non-incapacitated ally is within 5 feet of the target.'}],
  actions:[{id:'bite',name:'Bite',economy:'action',description:'Melee attack.',
   attack:{kind:'melee',bonus:5,reachFeet:5,damageDice:'1d4',damageModifier:3,damageType:'Piercing'}}],
  bonusActions:[],reactions:[]
 }),
 bandit:monster({
  id:'bandit',name:'Bandit',size:'Medium or Small',type:'Humanoid',alignment:'Neutral',cr:'1/8',xp:25,
  ac:12,hp:11,hitDice:'2d8+2',speedFeet:30,initiative:1,
  abilities:{str:11,dex:12,con:12,int:10,wis:10,cha:10},saves:{},skills:{},
  senses:{passivePerception:10},languages:['Common',"Thieves' Cant"],traits:[],
  actions:[
   {id:'scimitar',name:'Scimitar',economy:'action',description:'Melee attack.',
    attack:{kind:'melee',bonus:3,reachFeet:5,damageDice:'1d6',damageModifier:1,damageType:'Slashing'}},
   {id:'light-crossbow',name:'Light Crossbow',economy:'action',description:'Ranged attack.',
    attack:{kind:'ranged',bonus:3,normalFeet:80,longFeet:320,damageDice:'1d8',damageModifier:1,damageType:'Piercing'}}
  ],bonusActions:[],reactions:[]
 }),
 'goblin-warrior':monster({
  id:'goblin-warrior',name:'Goblin Warrior',size:'Small',type:'Fey (Goblinoid)',alignment:'Chaotic Neutral',
  cr:'1/4',xp:50,ac:15,hp:10,hitDice:'3d6',speedFeet:30,initiative:2,
  abilities:{str:8,dex:15,con:10,int:10,wis:8,cha:8},saves:{},skills:{Stealth:6},
  senses:{passivePerception:9,darkvisionFeet:60},languages:['Common','Goblin'],traits:[],
  actions:[
   {id:'scimitar',name:'Scimitar',economy:'action',description:'Melee attack; an attack with Advantage deals an additional 1d4 Slashing damage.',
    attack:{kind:'melee',bonus:4,reachFeet:5,damageDice:'1d6',damageModifier:2,damageType:'Slashing'}},
   {id:'shortbow',name:'Shortbow',economy:'action',description:'Ranged attack; an attack with Advantage deals an additional 1d4 Piercing damage.',
    attack:{kind:'ranged',bonus:4,normalFeet:80,longFeet:320,damageDice:'1d6',damageModifier:2,damageType:'Piercing'}}
  ],
  bonusActions:[{id:'nimble-escape',name:'Nimble Escape',economy:'bonus',effect:'nimble-escape',
   description:'Take the Disengage or Hide action as a Bonus Action.'}],reactions:[]
 }),
 'goblin-minion':monster({
  id:'goblin-minion',name:'Goblin Minion',size:'Small',type:'Fey (Goblinoid)',alignment:'Chaotic Neutral',
  cr:'1/8',xp:25,ac:12,hp:7,hitDice:'2d6',speedFeet:30,initiative:2,
  abilities:{str:8,dex:15,con:10,int:10,wis:8,cha:8},saves:{},skills:{Stealth:6},
  senses:{passivePerception:9,darkvisionFeet:60},languages:['Common','Goblin'],traits:[],
  actions:[{id:'dagger',name:'Dagger',economy:'action',description:'Melee or ranged attack.',
   attack:{kind:'both',bonus:4,reachFeet:5,normalFeet:20,longFeet:60,damageDice:'1d4',damageModifier:2,damageType:'Piercing'}}],
  bonusActions:[{id:'nimble-escape',name:'Nimble Escape',economy:'bonus',effect:'nimble-escape',
   description:'Take the Disengage or Hide action as a Bonus Action.'}],reactions:[]
 })
} as const satisfies Record<string,MonsterDefinition>;
export type MonsterId=keyof typeof MONSTER_COMPENDIUM;
export const monsterIds=Object.keys(MONSTER_COMPENDIUM) as MonsterId[];
export function getMonster(id:string):MonsterDefinition|undefined{
 return Object.prototype.hasOwnProperty.call(MONSTER_COMPENDIUM,id)?MONSTER_COMPENDIUM[id as MonsterId]:undefined;
}
