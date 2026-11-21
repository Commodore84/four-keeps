export const ABILITIES=['Str','Dex','Con','Int','Wis','Cha'] as const;
export type Ability=typeof ABILITIES[number];
export type Scores=Record<Ability,number>;
export type AbilityMethod='standard'|'point-buy'|'rolled';
export type BonusMode='two-one'|'one-one-one';
export interface AbilityDraft {method:AbilityMethod;base:Partial<Scores>;bonusMode:BonusMode;bonuses:Partial<Record<Ability,number>>;rolls:number[];rollDice:number[][]}
export const STANDARD_ARRAY=[15,14,13,12,10,8] as const;
export const POINT_COSTS:Record<number,number>={8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
export const POINT_BUY_START:Scores={Str:8,Dex:8,Con:8,Int:8,Wis:8,Cha:8};
export function changePointBuy(draft:AbilityDraft,ability:Ability,delta:-1|1):AbilityDraft{
 if(draft.method!=='point-buy')return draft;
 const current=draft.base[ability]??8,next=current+delta;
 if(!Object.hasOwn(POINT_COSTS,next))return draft;
 const base={...POINT_BUY_START,...draft.base,[ability]:next};
 if(pointCost(base)>27)return draft;
 return {...draft,base};
}
export function emptyAbilityDraft():AbilityDraft{return {method:'standard',base:{},bonusMode:'two-one',bonuses:{},rolls:[],rollDice:[]};}
export function modifier(score:number):number{return Math.floor((score-10)/2);}
export function pointCost(scores:Partial<Scores>):number{return ABILITIES.reduce((sum,key)=>sum+(POINT_COSTS[scores[key]??8]??100),0);}
export function rollAbility(random:()=>number=Math.random):{dice:number[];score:number}{
 const dice=Array.from({length:4},()=>Math.floor(random()*6)+1);
 return {dice,score:[...dice].sort((a,b)=>a-b).slice(1).reduce((a,b)=>a+b,0)};
}
export function rollSet(random:()=>number=Math.random):{rolls:number[];rollDice:number[][]}{
 const results=Array.from({length:6},()=>rollAbility(random));return {rolls:results.map(r=>r.score),rollDice:results.map(r=>r.dice)};
}
export function baseScoreOptions(draft:AbilityDraft):number[]{return draft.method==='standard'?[...STANDARD_ARRAY]:draft.method==='rolled'?[...draft.rolls]:[];}
export function totalScores(draft:AbilityDraft):Scores{return Object.fromEntries(ABILITIES.map(key=>[key,(draft.base[key]??0)+(draft.bonuses[key]??0)])) as Scores;}
export function validateBaseAbilityDraft(draft:AbilityDraft):string[]{
 const withoutBonuses={...draft,bonuses:{},bonusMode:'two-one' as const};
 return validateAbilityDraft(withoutBonuses,[]).filter(error=>!error.startsWith('Assign background bonuses'));
}
export function validateAbilityDraft(draft:AbilityDraft,backgroundAbilities:readonly string[]):string[]{
 const errors:string[]=[];
 const base=ABILITIES.map(key=>draft.base[key]);
 if(base.some(score=>!Number.isInteger(score)))errors.push('Assign all six ability scores.');
 if(draft.method==='standard'||draft.method==='rolled'){
  const available=baseScoreOptions(draft);
  if(available.length!==6||base.some(score=>!available.includes(score!))||[...base].sort((a,b)=>(a??0)-(b??0)).join(',')!==[...available].sort((a,b)=>a-b).join(','))errors.push('Assign each available score exactly once.');
 }else if(draft.method==='point-buy'){
  if(base.some(score=>score===undefined||!Object.hasOwn(POINT_COSTS,score)))errors.push('Point Buy scores must be between 8 and 15.');
  if(pointCost(draft.base)>27)errors.push('Point Buy exceeds 27 points.');
 }
 const bonuses=ABILITIES.map(key=>draft.bonuses[key]??0);
 const valid=bonuses.every((v,i)=>Number.isInteger(v)&&v>=0&&v<=2&&(!v||backgroundAbilities.includes(ABILITIES[i])));
 if(!valid)errors.push('Background bonuses must use eligible abilities.');
 const chosen=bonuses.filter(x=>x>0).sort((a,b)=>b-a);
 const expected=draft.bonusMode==='two-one'?'2,1':'1,1,1';
 if(chosen.join(',')!==expected)errors.push('Assign background bonuses as '+(draft.bonusMode==='two-one'?'+2 and +1':'+1, +1, +1')+' to distinct eligible abilities.');
 if(ABILITIES.some(key=>(draft.base[key]??0)+(draft.bonuses[key]??0)>20))errors.push('Ability scores cannot exceed 20.');
 return [...new Set(errors)];
}
export function assignBonus(draft:AbilityDraft,ability:Ability,value:number):AbilityDraft{
 const bonuses={...draft.bonuses,[ability]:value};
 return {...draft,bonuses};
}
