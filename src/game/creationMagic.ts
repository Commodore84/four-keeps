import {modifier,type Scores} from './creationAbilities';
import {spellcastingAtLevel} from './creationClasses';
export interface Spell {id:string;name:string;level:0|1;classes:string[];school:string}
const spell=(name:string,level:0|1,school:string,classes:string):Spell=>({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,level,school,classes:classes.split(',')});
export const SPELLS:Spell[]=[
 spell('Acid Splash',0,'Evocation','sorcerer,wizard'),spell('Blade Ward',0,'Abjuration','bard,sorcerer,warlock,wizard'),spell('Chill Touch',0,'Necromancy','sorcerer,warlock,wizard'),spell('Dancing Lights',0,'Illusion','bard,sorcerer,wizard'),spell('Druidcraft',0,'Transmutation','druid'),spell('Eldritch Blast',0,'Evocation','warlock'),spell('Elementalism',0,'Transmutation','druid,sorcerer,wizard'),spell('Fire Bolt',0,'Evocation','sorcerer,wizard'),spell('Friends',0,'Enchantment','bard,sorcerer,warlock,wizard'),spell('Guidance',0,'Divination','cleric,druid'),spell('Light',0,'Evocation','bard,cleric,sorcerer,wizard'),spell('Mage Hand',0,'Conjuration','bard,sorcerer,warlock,wizard'),spell('Mending',0,'Transmutation','bard,cleric,druid,sorcerer,wizard'),spell('Message',0,'Transmutation','bard,druid,sorcerer,wizard'),spell('Minor Illusion',0,'Illusion','bard,sorcerer,warlock,wizard'),spell('Poison Spray',0,'Necromancy','druid,sorcerer,warlock,wizard'),spell('Prestidigitation',0,'Transmutation','bard,sorcerer,warlock,wizard'),spell('Produce Flame',0,'Conjuration','druid'),spell('Ray of Frost',0,'Evocation','sorcerer,wizard'),spell('Resistance',0,'Abjuration','cleric,druid'),spell('Sacred Flame',0,'Evocation','cleric'),spell('Shillelagh',0,'Transmutation','druid'),spell('Shocking Grasp',0,'Evocation','sorcerer,wizard'),spell('Sorcerous Burst',0,'Evocation','sorcerer'),spell('Spare the Dying',0,'Necromancy','cleric,druid'),spell('Starry Wisp',0,'Evocation','bard,druid'),spell('Thaumaturgy',0,'Transmutation','cleric'),spell('Thorn Whip',0,'Transmutation','druid'),spell('Thunderclap',0,'Evocation','bard,druid,sorcerer,warlock,wizard'),spell('Toll the Dead',0,'Necromancy','cleric,warlock,wizard'),spell('True Strike',0,'Divination','bard,sorcerer,warlock,wizard'),spell('Vicious Mockery',0,'Enchantment','bard'),spell('Word of Radiance',0,'Evocation','cleric'),
 spell('Alarm',1,'Abjuration','ranger,wizard'),spell('Animal Friendship',1,'Enchantment','bard,druid,ranger'),spell('Armor of Agathys',1,'Abjuration','warlock'),spell('Arms of Hadar',1,'Conjuration','warlock'),spell('Bane',1,'Enchantment','bard,cleric'),spell('Bless',1,'Enchantment','cleric,paladin'),spell('Burning Hands',1,'Evocation','sorcerer,wizard'),spell('Charm Person',1,'Enchantment','bard,druid,sorcerer,warlock,wizard'),spell('Chromatic Orb',1,'Evocation','sorcerer,wizard'),spell('Color Spray',1,'Illusion','bard,sorcerer,wizard'),spell('Command',1,'Enchantment','bard,cleric,paladin'),spell('Comprehend Languages',1,'Divination','bard,sorcerer,warlock,wizard'),spell('Create or Destroy Water',1,'Transmutation','cleric,druid'),spell('Cure Wounds',1,'Abjuration','bard,cleric,druid,paladin,ranger'),spell('Detect Evil and Good',1,'Divination','cleric,paladin'),spell('Detect Magic',1,'Divination','bard,cleric,druid,paladin,ranger,sorcerer,warlock,wizard'),spell('Detect Poison and Disease',1,'Divination','cleric,druid,paladin,ranger'),spell('Disguise Self',1,'Illusion','bard,sorcerer,wizard'),spell('Dissonant Whispers',1,'Enchantment','bard'),spell('Divine Favor',1,'Transmutation','paladin'),spell('Ensnaring Strike',1,'Conjuration','ranger'),spell('Entangle',1,'Conjuration','druid,ranger'),spell('Expeditious Retreat',1,'Transmutation','sorcerer,warlock,wizard'),spell('Faerie Fire',1,'Evocation','bard,druid'),spell('False Life',1,'Necromancy','sorcerer,wizard'),spell('Feather Fall',1,'Transmutation','bard,sorcerer,wizard'),spell('Find Familiar',1,'Conjuration','wizard'),spell('Fog Cloud',1,'Conjuration','druid,ranger,sorcerer,wizard'),spell('Goodberry',1,'Conjuration','druid,ranger'),spell('Grease',1,'Conjuration','sorcerer,wizard'),spell('Guiding Bolt',1,'Evocation','cleric'),spell('Healing Word',1,'Abjuration','bard,cleric,druid'),spell('Hellish Rebuke',1,'Evocation','warlock'),spell('Heroism',1,'Enchantment','bard,paladin'),spell('Hex',1,'Enchantment','warlock'),spell('Hunter’s Mark',1,'Divination','ranger'),spell('Ice Knife',1,'Conjuration','druid,sorcerer,wizard'),spell('Identify',1,'Divination','bard,wizard'),spell('Illusory Script',1,'Illusion','bard,warlock,wizard'),spell('Inflict Wounds',1,'Necromancy','cleric'),spell('Jump',1,'Transmutation','druid,ranger,sorcerer,wizard'),spell('Longstrider',1,'Transmutation','bard,druid,ranger,wizard'),spell('Mage Armor',1,'Abjuration','sorcerer,wizard'),spell('Magic Missile',1,'Evocation','sorcerer,wizard'),spell('Protection from Evil and Good',1,'Abjuration','cleric,paladin,warlock,wizard'),spell('Purify Food and Drink',1,'Transmutation','cleric,druid,paladin'),spell('Ray of Sickness',1,'Necromancy','sorcerer,wizard'),spell('Sanctuary',1,'Abjuration','cleric'),spell('Searing Smite',1,'Evocation','paladin'),spell('Shield',1,'Abjuration','sorcerer,wizard'),spell('Shield of Faith',1,'Abjuration','cleric,paladin'),spell('Silent Image',1,'Illusion','bard,sorcerer,wizard'),spell('Sleep',1,'Enchantment','bard,sorcerer,wizard'),spell('Speak with Animals',1,'Divination','bard,druid,ranger'),spell('Tasha’s Hideous Laughter',1,'Enchantment','bard,wizard'),spell('Tenser’s Floating Disk',1,'Conjuration','wizard'),spell('Thunderwave',1,'Evocation','bard,druid,sorcerer,wizard'),spell('Unseen Servant',1,'Conjuration','bard,warlock,wizard'),spell('Witch Bolt',1,'Evocation','sorcerer,warlock,wizard'),spell('Wrathful Smite',1,'Necromancy','paladin')
];
export const SPELL_BY_ID=Object.fromEntries(SPELLS.map(s=>[s.id,s])) as Record<string,Spell>;
export const SPELL_COUNTS:Record<string,{cantrips:number;prepared:number;book?:number}>={bard:{cantrips:2,prepared:4},cleric:{cantrips:3,prepared:4},druid:{cantrips:2,prepared:4},paladin:{cantrips:0,prepared:2},ranger:{cantrips:0,prepared:2},sorcerer:{cantrips:4,prepared:2},warlock:{cantrips:2,prepared:2},wizard:{cantrips:3,prepared:4,book:6}};
export const INVOCATIONS=['Armor of Shadows','Eldritch Mind','Fiendish Vigor','Lessons of the First Ones','Mask of Many Faces','Misty Visions','Otherworldly Leap','Pact of the Blade','Pact of the Chain','Pact of the Tome','Repelling Blast'] as const;
export interface MagicDraft {cantrips:string[];prepared:string[];spellbook:string[];invocations:string[]}
export const emptyMagic=():MagicDraft=>({cantrips:[],prepared:[],spellbook:[],invocations:[]});
export function spellOptions(classId:string,level:0|1):Spell[]{return SPELLS.filter(s=>s.level===level&&s.classes.includes(classId));}
export function toggleSpell(values:string[],id:string,max:number):string[]{return values.includes(id)?values.filter(x=>x!==id):values.length<max?[...values,id]:values;}
export function validateMagic(classId:string,draft:MagicDraft):string[]{
 const count=SPELL_COUNTS[classId];if(!count)return draft.cantrips.length||draft.prepared.length||draft.spellbook.length||draft.invocations.length?['This class has no level-one spell selections.']:[];
 const errors:string[]=[];
 const valid=(ids:string[],level:0|1)=>ids.every(id=>spellOptions(classId,level).some(s=>s.id===id))&&new Set(ids).size===ids.length;
 if(draft.cantrips.length!==count.cantrips||!valid(draft.cantrips,0))errors.push('Select '+count.cantrips+' legal cantrips.');
 if(count.book){
  if(draft.spellbook.length!==count.book||!valid(draft.spellbook,1))errors.push('Select '+count.book+' level-one wizard spellbook spells.');
  if(draft.prepared.length!==count.prepared||new Set(draft.prepared).size!==draft.prepared.length||!draft.prepared.every(id=>draft.spellbook.includes(id)))errors.push('Prepare '+count.prepared+' different spells from the spellbook.');
 }else if(draft.prepared.length!==count.prepared||!valid(draft.prepared,1))errors.push('Select '+count.prepared+' legal prepared spells.');
 if(classId==='warlock'){
  if(draft.invocations.length!==1||new Set(draft.invocations).size!==1||!draft.invocations.every(i=>INVOCATIONS.includes(i as typeof INVOCATIONS[number])))errors.push('Select one eligible level-one Eldritch Invocation.');
 }else if(draft.invocations.length)errors.push('Only Warlocks choose Eldritch Invocations at level one.');
 if(draft.spellbook.length&&!count.book)errors.push('Only Wizards select a spellbook.');
 return errors;
}
export function spellStats(classId:string,scores:Scores):{dc:number;attack:number;slots:readonly number[]}|null{
 const progression=spellcastingAtLevel(classId,1);if(!progression)return null;
 const ability=modifier(scores[progression.ability]);
 return {dc:8+2+ability,attack:2+ability,slots:progression.slots};
}

export interface OriginMagicDraft {cantrips:string[];spell:string|null;ability:'Int'|'Wis'|'Cha'}
export const emptyOriginMagic=():OriginMagicDraft=>({cantrips:[],spell:null,ability:'Int'});
export function magicInitiateClass(backgroundId:string):string|null{
 return ({acolyte:'cleric',guide:'druid',sage:'wizard'} as Record<string,string>)[backgroundId]??null;
}
export function innateOriginSpells(speciesId:string,lineageId?:string):string[]{
 const fixed:Record<string,string[]>={'aasimar':['light'],'drow':['dancing-lights'],'high-elf':['prestidigitation'],'wood-elf':['druidcraft'],'forest-gnome':['minor-illusion','speak-with-animals'],'rock-gnome':['mending','prestidigitation'],'abyssal':['poison-spray'],'chthonic':['chill-touch'],'infernal':['fire-bolt']};
 return [...(fixed[speciesId]??[]),...(fixed[lineageId??'']??[])];
}
export function validateOriginMagic(backgroundId:string,origin:OriginMagicDraft):string[]{
 const cls=magicInitiateClass(backgroundId);
 if(!cls)return origin.cantrips.length||origin.spell?['Magic Initiate choices are only available with an eligible background.']:[];
 const cantrips=spellOptions(cls,0).map(s=>s.id),spells=spellOptions(cls,1).map(s=>s.id);
 const errors:string[]=[];
 if(origin.cantrips.length!==2||new Set(origin.cantrips).size!==2||!origin.cantrips.every(id=>cantrips.includes(id)))errors.push('Select two legal Magic Initiate cantrips.');
 if(!origin.spell||!spells.includes(origin.spell))errors.push('Select one legal Magic Initiate level-one spell.');
 if(!['Int','Wis','Cha'].includes(origin.ability))errors.push('Choose a valid Magic Initiate spellcasting ability.');
 return errors;
}
