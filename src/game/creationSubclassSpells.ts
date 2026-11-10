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
 'cleric-trickery':{
  3:['Charm Person','Disguise Self','Invisibility','Pass without Trace'],
  5:['Hypnotic Pattern','Nondetection'],
  7:['Confusion','Dimension Door'],
  9:['Dominate Person','Modify Memory']
 },
 'cleric-war':{
  3:['Guiding Bolt','Magic Weapon','Shield of Faith','Spiritual Weapon'],
  5:['Crusader\'s Mantle','Spirit Guardians'],
  7:['Fire Shield','Freedom of Movement'],
  9:['Hold Monster','Steel Wind Strike']
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

/** 2024 Circle of the Land: choose a terrain at each Long Rest, not permanently at subclass selection.
 * Source: D&D Beyond Basic Rules (2024), Druid, Circle of the Land Spells.
 */
export const LAND_CIRCLE_SPELLS:Readonly<Record<string,Readonly<Record<number,readonly string[]>>>>={
 arid:{3:['Blur','Burning Hands','Fire Bolt'],5:['Fireball'],7:['Blight'],9:['Wall of Stone']},
 polar:{3:['Fog Cloud','Hold Person','Ray of Frost'],5:['Sleet Storm'],7:['Ice Storm'],9:['Cone of Cold']},
 temperate:{3:['Misty Step','Shocking Grasp','Sleep'],5:['Lightning Bolt'],7:['Freedom of Movement'],9:['Tree Stride']},
 tropical:{3:['Acid Splash','Ray of Sickness','Web'],5:['Stinking Cloud'],7:['Polymorph'],9:['Insect Plague']}
};
export type LandTerrain=keyof typeof LAND_CIRCLE_SPELLS;
export function landCirclePreparedSpells(terrain:string|undefined,level:number):string[]{
 if(!terrain||!Number.isInteger(level)||level<3||level>20)return [];
 const table=LAND_CIRCLE_SPELLS[terrain];
 if(!table)return [];
 return Object.entries(table).filter(([unlock])=>Number(unlock)<=level).flatMap(([,spells])=>spells);
}

/** Automatically prepared 2024 class-feature spells, separate from subclass tables.
 * Source: D&D Beyond 2024 Basic Rules, Paladin and Warlock class features.
 */
export function alwaysPreparedClassSpells(classId:string,level:number):string[]{
 if(!Number.isInteger(level)||level<1||level>20)return [];
 if(classId==='paladin')return [...(level>=2?['Divine Smite']:[]),...(level>=5?['Find Steed']:[])];
 if(classId==='warlock')return level>=9?['Contact Other Plane']:[];
 return [];
}
export function allAlwaysPreparedSpells(classId:string,subclassId:string|undefined,level:number,terrain?:string):string[]{
 return [...new Set([...alwaysPreparedClassSpells(classId,level),...alwaysPreparedSubclassSpells(subclassId,level),...(subclassId==='druid-land'?landCirclePreparedSpells(terrain,level):[])])];
}
