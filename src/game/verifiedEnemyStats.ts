/** Parses explicit, user-supplied enemy statistics only; never estimates missing values. */
export function parseVerifiedEnemyStats(input:string):{hitPoints:string;armorClass:string;attackModifier:string;damageModifier:string;damageDice:string}|null{
 const pick=(pattern:RegExp)=>input.match(pattern)?.[1];
 const hp=pick(/\b(?:HP|hit points?)\s*[:=]?\s*(\d{1,3})\b/i);
 const ac=pick(/\b(?:AC|armor class)\s*[:=]?\s*(\d{1,2})\b/i);
 const attack=pick(/\b(?:attack bonus|attack modifier|to hit)\s*[:=]?\s*([+-]?\d{1,2})\b/i);
 const damage=pick(/\b(?:damage bonus|damage modifier)\s*[:=]?\s*([+-]?\d{1,2})\b/i);
 const dice=pick(/\b(?:damage dice)\s*[:=]?\s*(\d{1,2}d\d{1,3})\b/i);
 if([hp,ac,attack,damage,dice].some(v=>v===undefined))return null;
 if(Number(hp)<1||Number(hp)>500||Number(ac)<1||Number(ac)>40||Number(attack)<-20||Number(attack)>30||Number(damage)<-20||Number(damage)>30)return null;
 return {hitPoints:hp!,armorClass:ac!,attackModifier:String(Number(attack)),damageModifier:String(Number(damage)),damageDice:dice!};
}

export type VerifiedEnemyStatField = 'hitPoints'|'armorClass'|'attackModifier'|'damageModifier'|'damageDice';
const statLabels:Record<VerifiedEnemyStatField,string>={hitPoints:'HP',armorClass:'AC',attackModifier:'attack bonus',damageModifier:'damage bonus',damageDice:'damage dice'};
/** Accepts only explicitly written values; omitted fields remain unset. */
export function inspectVerifiedEnemyStats(input:string):{values:Partial<Record<VerifiedEnemyStatField,string>>;missing:string[];invalid:string[]}{
 const patterns:Record<VerifiedEnemyStatField,RegExp>={
  hitPoints:/\b(?:HP|hit points?)\s*[:=]?\s*([+-]?\d+)\b/i,
  armorClass:/\b(?:AC|armor class)\s*[:=]?\s*([+-]?\d+)\b/i,
  attackModifier:/\b(?:attack bonus|attack modifier|to hit)\s*[:=]?\s*([+-]?\d+)\b/i,
  damageModifier:/\b(?:damage bonus|damage modifier)\s*[:=]?\s*([+-]?\d+)\b/i,
  damageDice:/\b(?:damage dice)\s*[:=]?\s*(\S+)/i
 };
 const values:Partial<Record<VerifiedEnemyStatField,string>>={},missing:string[]=[],invalid:string[]=[];
 for(const key of Object.keys(patterns) as VerifiedEnemyStatField[]){
  const match=input.match(patterns[key]);
  if(!match){missing.push(statLabels[key]);continue;}
  const raw=match[1],num=Number(raw);
  const valid=key==='damageDice'?/^\d{1,2}d\d{1,3}$/i.test(raw)&&Number(raw.split(/d/i)[0])>0&&Number(raw.split(/d/i)[1])>0:
   Number.isInteger(num)&&({hitPoints:num>=1&&num<=500,armorClass:num>=1&&num<=40,attackModifier:num>=-20&&num<=30,damageModifier:num>=-20&&num<=30} as Record<string,boolean>)[key];
  if(!valid){invalid.push(statLabels[key]);continue;}
  values[key]=key==='damageDice'?raw:String(num);
 }
 return {values,missing,invalid};
}
