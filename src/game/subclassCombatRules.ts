/** Deterministic 2024 subclass combat/rest rules.
 * Pure state transitions; callers must provide combat position, aura status,
 * current terrain, and player-selected rest choices.
 * Not connected to the Nighthawk-only encounter UI yet.
 */
export type DamageType='Acid'|'Bludgeoning'|'Cold'|'Fire'|'Force'|'Lightning'|'Necrotic'|'Piercing'|'Poison'|'Psychic'|'Radiant'|'Slashing'|'Thunder';
export type Terrain='arid'|'polar'|'temperate'|'tropical';
export interface SubclassCombatState {
 classId:'paladin'|'druid'|'warlock';
 subclassId:string;
 level:number;
 charismaModifier:number;
 terrain?:Terrain;
 fiendResistance?:Exclude<DamageType,'Force'>;
 luckRemaining:number;
}
const TERRAIN_RESISTANCE:Record<Terrain,DamageType>={arid:'Fire',polar:'Cold',temperate:'Lightning',tropical:'Poison'};
export function initialSubclassCombatState(classId:SubclassCombatState['classId'],subclassId:string,level:number,charismaModifier:number,terrain?:Terrain):SubclassCombatState{
 return {classId,subclassId,level,charismaModifier,terrain,luckRemaining:subclassId==='warlock-fiend'&&level>=6?Math.max(1,charismaModifier):0};
}
export function subclassResistances(state:SubclassCombatState):DamageType[]{
 const values:DamageType[]=[];
 if(state.subclassId==='druid-land'&&state.level>=10&&state.terrain)values.push(TERRAIN_RESISTANCE[state.terrain]);
 if(state.subclassId==='warlock-fiend'&&state.level>=10&&state.fiendResistance)values.push(state.fiendResistance);
 return values;
}
export function canApplyCondition(state:SubclassCombatState,condition:'Charmed'|'Poisoned'|'Other',context:{withinDevotionAura?:boolean;auraActive?:boolean}={}):boolean{
 if(condition==='Poisoned'&&state.subclassId==='druid-land'&&state.level>=10)return false;
 if(condition==='Charmed'&&state.subclassId==='paladin-devotion'&&state.level>=7&&context.withinDevotionAura&&context.auraActive)return false;
 return true;
}
export function resolveSubclassDamage(state:SubclassCombatState,amount:number,type:DamageType):number{
 const safe=Math.max(0,Math.trunc(amount));
 return subclassResistances(state).includes(type)?Math.floor(safe/2):safe;
}
export function selectFiendResistance(state:SubclassCombatState,type:DamageType):SubclassCombatState{
 if(state.subclassId!=='warlock-fiend'||state.level<10)throw Error('Fiendish Resilience unavailable');
 if(type==='Force')throw Error('Fiendish Resilience cannot select Force');
 return {...state,fiendResistance:type};
}
export function finishSubclassRest(state:SubclassCombatState,kind:'short'|'long',options:{fiendResistance?:DamageType;terrain?:Terrain}={}):SubclassCombatState{
 let next={...state};
 if(kind==='long'&&state.subclassId==='warlock-fiend'&&state.level>=6)next.luckRemaining=Math.max(1,state.charismaModifier);
 if(options.terrain!==undefined){
  if(state.subclassId!=='druid-land'||state.level<3||kind!=='long')throw Error('Land terrain may change only after a Long Rest');
  next.terrain=options.terrain;
 }
 if(options.fiendResistance!==undefined){
  next=selectFiendResistance(next,options.fiendResistance);
 }
 return next;
}
export function spendDarkOnesOwnLuck(state:SubclassCombatState,bonusD10:number):{state:SubclassCombatState;bonus:number}{
 if(state.subclassId!=='warlock-fiend'||state.level<6||state.luckRemaining<1)throw Error('Dark One’s Own Luck unavailable');
 if(!Number.isInteger(bonusD10)||bonusD10<1||bonusD10>10)throw Error('Requires a d10 roll from 1 to 10');
 return {state:{...state,luckRemaining:state.luckRemaining-1},bonus:bonusD10};
}
