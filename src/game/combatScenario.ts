import {validateBattlefield,battlefieldBlocked,battlefieldDifficult, type Battlefield} from './battlefield';
import type {DamageType} from './subclassCombatRules';
import {MONSTER_COMPENDIUM} from './monsterCompendium';

export type Square={x:number;y:number};
export type EncounterOutcome='victory'|'defeat'|'retreat'|'escape'|'surrender'|'negotiation'|'objective'|'abandoned';
export type TacticalWeapon={name:string;bonus:number;dice:string;modifier:number;type:DamageType;reach:number;normal?:number;ammunition?:number};
const spear:TacticalWeapon={name:'Spear',bonus:3,dice:'1d6',modifier:1,type:'Piercing',reach:5};
const srdProfiles=Object.fromEntries(Object.entries(MONSTER_COMPENDIUM).map(([id,m])=>[id,{
 hp:m.hp,ac:m.ac,speed:m.speedFeet,initiative:m.initiative,perception:m.senses.passivePerception,
 str:Math.floor((m.abilities.str-10)/2),dex:Math.floor((m.abilities.dex-10)/2),con:Math.floor((m.abilities.con-10)/2),
 weapons:m.actions.filter(a=>a.attack).flatMap(a=>{
  const attack=a.attack!;
  const base={name:a.name,bonus:attack.bonus,dice:attack.damageDice,modifier:attack.damageModifier,type:attack.damageType};
  return attack.kind==='both'?[{...base,reach:attack.reachFeet??5},
    {...base,reach:attack.longFeet??attack.normalFeet??5,normal:attack.normalFeet}]:
   attack.kind==='ranged'?[{...base,reach:attack.longFeet??attack.normalFeet??5,normal:attack.normalFeet,ammunition:20}]:
   [{...base,reach:attack.reachFeet??5}];
 })
}])) as Record<keyof typeof MONSTER_COMPENDIUM,{hp:number;ac:number;speed:number;initiative:number;perception:number;str:number;dex:number;con:number;weapons:TacticalWeapon[]}>;
export const TACTICAL_PROFILES={
 ...srdProfiles,
 guard:{hp:11,ac:16,speed:30,initiative:1,perception:12,str:1,dex:1,con:1,weapons:[spear,{...spear,reach:60,normal:20,ammunition:1}]},
 mage:{hp:81,ac:15,speed:30,initiative:2,perception:14,str:-1,dex:2,con:0,weapons:[
  {name:'Arcane Burst',bonus:6,dice:'3d8',modifier:3,type:'Force',reach:5},
  {name:'Arcane Burst',bonus:6,dice:'3d8',modifier:3,type:'Force',reach:120,normal:120},
 ] as TacticalWeapon[]},
} as const;
export type TacticalProfile=keyof typeof TACTICAL_PROFILES;
export type ScenarioActor={id:string;label:string;profile:TacticalProfile;side:'enemies'|'allies';square:Square;surprised?:boolean};
export type CombatScenario={
 locationKey:string;size:number; battlefield?:Battlefield; objective:string;actors:ScenarioActor[];starts:Square[];obstacles:Square[];
 cover:Square[];difficult:Square[];exits:Square[];surprised:boolean;
 darkness?:Square[];elevation?:Record<string,number>;artwork?:'forest-ruins-test.svg';
};
export type TacticalRoll={actor:string;target:string;dice:number[];modifier:number;hit:boolean;critical:boolean;damage:number;mode?:'advantage'|'disadvantage'};
export type IncomingHit={attacker:string;amount:number;type:DamageType;critical:boolean;attackTotal?:number;targetAC?:number;uncanny?:boolean;shield?:boolean};
export type TacticalState={
 scenario:CombatScenario;initiative:{actor:string;dice:number[];modifier:number;total:number}[];
 lastRoll?:TacticalRoll;
 shield?:true;concentrationCheck?:number;
 grapples?:Record<string,{by:string;dc:number}>;
 help?:{by:string;target:string};
 readied?:string;pendingReady?:{target:string};
 pendingHit?:IncomingHit;outcome?:EncounterOutcome;note?:string;
 actors:Record<string,{ammunition:number;hidden?:number;spellUses?:Record<string,number>}>;
};
export const squareKey=(s:Square)=>s.x+','+s.y;
export const distanceFeet=(a:Square,b:Square)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*5;
export const fitsBattlefield=(square:Square,size:number|CombatScenario)=>Number.isInteger(square.x)&&Number.isInteger(square.y)&&square.x>=0&&square.y>=0&&square.x<(typeof size==='number'?size:size.battlefield?.width??size.size)&&square.y<(typeof size==='number'?size:size.battlefield?.height??size.size);

export function validateCombatScenario(value:unknown,locationKey:string):CombatScenario{
 if(!value||typeof value!=='object')throw Error('The DM has not established a battlefield.');
 const input=value as Record<string,unknown>;
 const battlefield=input.battlefield===undefined?undefined:validateBattlefield(input.battlefield);
 const size=battlefield?.width??input.size;
 if(typeof size!=='number'||!Number.isInteger(size)||size<6||(!battlefield&&size>12))throw Error('Battlefield must be 6–12 squares wide.');
 const square=(raw:unknown):Square=>{
  const cell=raw as Square;
  if(!cell||!fitsBattlefield(cell,{size,battlefield} as CombatScenario))throw Error('Battlefield square is outside the grid.');
  return {x:cell.x,y:cell.y};
 };
 const cells=(raw:unknown,max:number):Square[]=>{
  if(raw===undefined)return [];
  if(!Array.isArray(raw)||raw.length>max)throw Error('Invalid battlefield layer.');
  return [...new Map(raw.map(rawCell=>{const cell=square(rawCell);return [squareKey(cell),cell];})).values()];
 };
 const area=battlefield?battlefield.width*battlefield.height:144;
 const obstacles=cells(input.obstacles,battlefield?area:35),cover=cells(input.cover,battlefield?area:35),difficult=cells(input.difficult,battlefield?area:50),exits=cells(input.exits,24),starts=cells(input.starts,24);
 if(battlefield){
  obstacles.length=0;cover.length=0;difficult.length=0;
  for(let y=0;y<battlefield.height;y++)for(let x=0;x<battlefield.width;x++){
   const p={x,y};if(battlefieldBlocked(battlefield,p))obstacles.push(p);else if(battlefieldDifficult(battlefield,p))difficult.push(p);
  }
 }
 const darkness=cells(input.darkness,area);
 const elevation:Record<string,number>={};
 if(input.elevation!==undefined){
  if(!Array.isArray(input.elevation)||input.elevation.length>area)throw Error('Invalid elevation layer.');
  for(const raw of input.elevation){
   const cell=square(raw);
   const feet=(raw as Square&{feet?:number}).feet;
   if(typeof feet!=='number'||!Number.isInteger(feet)||feet<0||feet>40||feet%5!==0)throw Error('Elevation must be a multiple of 5 feet from 0 to 40.');
   elevation[squareKey(cell)]=feet;
  }
 }
 const walls=new Set(obstacles.map(squareKey));
 if(!Array.isArray(input.actors)||!input.actors.length||input.actors.length>8||!starts.length)throw Error('The battlefield needs opponents and valid starting squares.');
 const ids=new Set<string>(),occupied=new Set<string>();
 const actors:ScenarioActor[]=input.actors.map(raw=>{
  if(!raw||typeof raw!=='object')throw Error('Invalid battlefield actor.');
  const actor=raw as Record<string,unknown>,position=square(actor.square);
  const id=actor.id,label=actor.label,profile=actor.profile,side=actor.side;
  if(typeof id!=='string'||! /^[a-z][a-z0-9-]{0,25}$/.test(id)||id==='nighthawk'||ids.has(id)||
    typeof label!=='string'||!label.trim()||label.length>60||typeof profile!=='string'||!Object.hasOwn(TACTICAL_PROFILES,profile)||
    side!=='enemies'&&side!=='allies'||occupied.has(squareKey(position))||walls.has(squareKey(position)))throw Error('Use a verified actor profile and an unoccupied battlefield square.');
  ids.add(id);occupied.add(squareKey(position));
  return {id,label:label.trim(),profile:profile as TacticalProfile,side,square:position,surprised:actor.surprised===true};
 });
 if(!actors.some(actor=>actor.side==='enemies')||starts.some(start=>walls.has(squareKey(start))||occupied.has(squareKey(start))))throw Error('Starting squares must be open and at least one hostile actor is required.');
 if(exits.some(exit=>walls.has(squareKey(exit))||!([0,size-1].includes(exit.x)||[0,(battlefield?.height??size)-1].includes(exit.y))))throw Error('Exits must be open perimeter squares.');
 const objective=typeof input.objective==='string'?input.objective.trim().slice(0,180):'';
 return {locationKey,size,...(battlefield?{battlefield}:{}),objective,actors,starts,obstacles,cover,difficult,exits,surprised:input.surprised===true,
  ...(darkness.length?{darkness}:{}),...(Object.keys(elevation).length?{elevation}:{}),
  ...(input.artwork==='forest-ruins-test.svg'?{artwork:input.artwork}:{})};
}
