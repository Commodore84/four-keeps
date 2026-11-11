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
