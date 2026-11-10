/** Verified 2024 free-rules always-prepared subclass spells. Additional PHB subclasses are pending licensed-source verification. */
export const SUBCLASS_PREPARED_SPELLS:Readonly<Record<string,Readonly<Record<number,readonly string[]>>>>={
 'cleric-life':{
  3:['Aid','Bless','Cure Wounds','Lesser Restoration'],
  5:['Mass Healing Word','Revivify'],
  7:['Aura of Life','Death Ward'],
  9:['Greater Restoration','Mass Cure Wounds']
 },
 'cleric-light':{
  3:['Burning Hands','Faerie Fire','Scorching Ray','See Invisibility'],
  5:['Daylight','Fireball'],
  7:['Arcane Eye','Wall of Fire'],
  9:['Flame Strike','Scrying']
 },
 'warlock-fiend':{
  3:['Burning Hands','Command','Scorching Ray','Suggestion'],
  5:['Fireball','Stinking Cloud'],
  7:['Fire Shield','Wall of Fire'],
  9:['Geas','Insect Plague']
 },
 'paladin-devotion':{
  3:['Protection from Evil and Good','Shield of Faith'],
  5:['Aid','Zone of Truth'],
  9:['Beacon of Hope','Dispel Magic'],
  13:['Freedom of Movement','Guardian of Faith'],
  17:['Commune','Flame Strike']
 }
};
export function alwaysPreparedSubclassSpells(subclassId:string|undefined,level:number):string[]{
 if(!subclassId||!Number.isInteger(level)||level<3||level>20)return [];
 return Object.entries(SUBCLASS_PREPARED_SPELLS[subclassId]??{}).filter(([unlock])=>Number(unlock)<=level).flatMap(([,spells])=>spells);
}
export function isAlwaysPreparedSubclassSpell(subclassId:string|undefined,level:number,spellName:string):boolean{
 return alwaysPreparedSubclassSpells(subclassId,level).includes(spellName);
}
