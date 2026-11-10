export interface AdvancementFeature {level:number;name:string;description:string;source:'class'|'subclass'}
const WARLOCK:AdvancementFeature[]=[
[2,'Magical Cunning','Once per Long Rest, perform a one-minute ritual to regain expended Pact Magic spell slots, up to half your maximum (round up).'],
[3,'Warlock Subclass','Choose a patron at level 3. The patron grants subclass spells and features; its benefits depend on your choice.'],
[4,'Ability Score Improvement','Choose a qualifying feat, or the Ability Score Improvement feat to raise ability scores within the normal limits.'],
[5,'Eldritch Invocations','You can know additional invocations as your Warlock level rises. Check the invocation prerequisite for your current level and pact.'],
[6,'Subclass Feature','Your patron grants its next subclass feature at level 6. The precise effect depends on your selected patron.'],
[7,'Eldritch Invocations','You can replace eligible invocations when leveling and gain additional selections according to the Warlock progression table.'],
[8,'Ability Score Improvement','Choose a qualifying feat or improve ability scores.'],
[9,'Contact Patron','You can contact your patron directly through Contact Other Plane without expending a spell slot, with a special benefit to its saving throw.'],
[10,'Subclass Feature','Your patron grants another subclass feature at level 10.'],
[11,'Mystic Arcanum (level 6)','Choose one level-six Warlock spell as a Mystic Arcanum. Cast it once without a spell slot per Long Rest. It is separate from Pact Magic slots.'],
[12,'Ability Score Improvement','Choose a qualifying feat or improve ability scores.'],
[13,'Mystic Arcanum (level 7)','Choose one level-seven Warlock spell to cast once per Long Rest without a slot.'],
[14,'Subclass Feature','Your patron grants its final subclass feature at level 14.'],
[15,'Mystic Arcanum (level 8)','Choose one level-eight Warlock spell to cast once per Long Rest without a slot.'],
[16,'Ability Score Improvement','Choose a qualifying feat or improve ability scores.'],
[17,'Mystic Arcanum (level 9)','Choose one level-nine Warlock spell to cast once per Long Rest without a slot.'],
[18,'Eldritch Invocations','You gain the final invocation capacity shown by the Warlock class progression table.'],
[19,'Epic Boon','Choose an eligible Epic Boon feat; the benefits depend on which boon you choose.'],
[20,'Eldritch Master','Regain your expended Pact Magic spell slots with Magical Cunning, rather than only half.']
].map(([level,name,description])=>({level:level as number,name:name as string,description:description as string,source:'class' as const}));
const CLASS_MILESTONES:Record<string,Record<number,string>>={
barbarian:{4:'Ability Score Improvement',5:'Extra Attack and Fast Movement',7:'Feral Instinct',9:'Brutal Strike',11:'Relentless Rage',15:'Persistent Rage',18:'Indomitable Might',20:'Primal Champion'},
bard:{4:'Ability Score Improvement',5:'Font of Inspiration',7:'Countercharm',9:'Expertise',10:'Magical Secrets',18:'Superior Inspiration',20:'Words of Creation'},
cleric:{4:'Ability Score Improvement',5:'Sear Undead',7:'Blessed Strikes',10:'Divine Intervention',14:'Improved Blessed Strikes',20:'Greater Divine Intervention'},
druid:{4:'Ability Score Improvement',5:'Wild Resurgence',7:'Elemental Fury',10:'Elemental Fury Improvement',18:'Beast Spells',20:'Archdruid'},
fighter:{4:'Ability Score Improvement',5:'Extra Attack',6:'Ability Score Improvement',9:'Tactical Master',11:'Two Extra Attacks',13:'Studied Attacks',14:'Ability Score Improvement',17:'Action Surge Improvement',20:'Three Extra Attacks'},
monk:{4:'Ability Score Improvement',5:'Extra Attack and Stunning Strike',6:'Empowered Strikes',7:'Evasion',10:'Heightened Focus',13:'Deflect Energy',14:'Disciplined Survivor',18:'Superior Defense',20:'Body and Mind'},
paladin:{4:'Ability Score Improvement',5:'Extra Attack and Faithful Steed',6:'Aura of Protection',9:'Abjure Foes',10:'Aura of Courage',14:'Restoring Touch',18:'Aura Expansion'},
ranger:{4:'Ability Score Improvement',5:'Extra Attack',6:'Roving',9:'Expertise',10:'Tireless',13:'Relentless Hunter',14:'Nature’s Veil',17:'Precise Hunter',18:'Feral Senses',20:'Foe Slayer'},
rogue:{4:'Ability Score Improvement',5:'Cunning Strike and Uncanny Dodge',7:'Evasion and Reliable Talent',9:'Subclass Feature',10:'Ability Score Improvement',11:'Improved Cunning Strike',14:'Devious Strikes',15:'Slippery Mind',18:'Elusive',20:'Stroke of Luck'},
sorcerer:{4:'Ability Score Improvement',5:'Sorcerous Restoration',7:'Sorcery Incarnate',10:'Metamagic',17:'Metamagic',20:'Arcane Apotheosis'},
wizard:{4:'Ability Score Improvement',5:'Memorize Spell',7:'Spellcasting Progression',10:'Subclass Feature',14:'Subclass Feature',18:'Spell Mastery',20:'Signature Spells'}
};
const SUBCLASS_LEVELS:Record<string,number[]>={bard:[3,6,14],cleric:[3,6,17],druid:[3,6,10,14],fighter:[3,7,10,15,18],monk:[3,6,11,17],paladin:[3,7,15,20],ranger:[3,7,11,15],rogue:[3,9,13,17],sorcerer:[3,6,14,18],warlock:[3,6,10,14],wizard:[3,6,10,14],barbarian:[3,6,10,14]};
export function progressionFeatures(classId:string,level:number,subclassName?:string):AdvancementFeature[]{
 const features:AdvancementFeature[]=[];
 if(classId==='warlock')features.push(...WARLOCK.filter(x=>x.level===level));
 else{
  const name=CLASS_MILESTONES[classId]?.[level];
  if(name)features.push({level,name,description:'Class milestone at this level. The exact mechanical benefits and any choices require the full class rules entry before being applied to the projected statistics.',source:'class'});
  if([4,8,12,16].includes(level)&&!features.some(x=>x.name==='Ability Score Improvement'))features.push({level,name:'Ability Score Improvement',description:'Choose a qualifying feat or an ability score increase; this forecast can model a provisional ability increase.',source:'class'});
  if(level===19)features.push({level,name:'Epic Boon',description:'Choose an eligible Epic Boon feat at level 19. Its effects are not included in the current projection.',source:'class'});
 }
 if(subclassName&&SUBCLASS_LEVELS[classId]?.includes(level))features.push({level,name:subclassName+' feature',description:'A subclass feature is unlocked at this level. Specific effects are not yet included in projected statistics and must be confirmed against the subclass rules.',source:'subclass'});
 return features;
}
export function mysticArcanumLevel(warlockLevel:number):number[]{return [11,13,15,17].filter(l=>warlockLevel>=l).map(l=>6+(l-11)/2)}
