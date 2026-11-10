export interface ChoiceDefinition {id:string;label:string;count:number;options:readonly string[];kind:'skill'|'expertise'|'weapon-mastery'|'primal-order'|'divine-order'|'fighting-style'|'invocation';}
export type ChoiceSelections=Record<string,string[]>;
export function setChoice(current:ChoiceSelections,definition:ChoiceDefinition,value:string):ChoiceSelections {
 if(!definition.options.includes(value))return current;
 const old=current[definition.id]??[];
 const next=old.includes(value)?old.filter(v=>v!==value):old.length<definition.count?[...old,value]:[...old.slice(1),value];
 return {...current,[definition.id]:next};
}
export function validateChoices(definitions:readonly ChoiceDefinition[],selections:ChoiceSelections):string[]{
 return definitions.flatMap(d=>{
  const selected=selections[d.id]??[];
  return selected.length===d.count&&new Set(selected).size===selected.length&&selected.every(x=>d.options.includes(x))?[]:[`Select ${d.count} valid option(s) for ${d.label}.`];
 });
}
export function reconcileChoices(definitions:readonly ChoiceDefinition[],selections:ChoiceSelections):ChoiceSelections {
 const next:ChoiceSelections={};
 for(const d of definitions){next[d.id]=[...new Set(selections[d.id]??[])].filter(x=>d.options.includes(x)).slice(0,d.count);}
 return next;
}
export interface ClassDefinition {
 id:string;name:string;summary:string;source:'PHB2024';hitDie:number;primaryAbilities:string[];
 savingThrows:string[];armor:string[];weapons:string[];tools:string[];
 skillCount:number;skillOptions:string[];startingEquipment:string;
 features:{level:number;names:string[]}[];
 choices:ChoiceDefinition[];
}
const skills=['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];
const martial=['Battleaxe','Club','Dagger','Dart','Flail','Glaive','Greataxe','Greatclub','Greatsword','Halberd','Handaxe','Javelin','Lance','Light Hammer','Longsword','Mace','Maul','Morningstar','Pike','Quarterstaff','Rapier','Scimitar','Shortsword','Sickle','Spear','Trident','War Pick','Warhammer','Whip','Light Crossbow','Dart','Shortbow','Sling','Blowgun','Hand Crossbow','Heavy Crossbow','Longbow','Musket','Pistol'].filter((x,i,a)=>a.indexOf(x)===i);
const choice=(id:string,label:string,count:number,options:readonly string[],kind:ChoiceDefinition['kind']):ChoiceDefinition=>({id,label,count,options,kind});
const c=(id:string,name:string,summary:string,hitDie:number,primary:string,saves:string,armor:string,weapons:string,tools:string,skillCount:number,skillOptions:string,startingEquipment:string,features:[number,string][],extra:ChoiceDefinition[]=[]):ClassDefinition=>({
 id,name,summary,source:'PHB2024',hitDie,primaryAbilities:primary.split(','),savingThrows:saves.split(','),armor:armor?armor.split(','):[],weapons:weapons?weapons.split(','):[],tools:tools?tools.split(','):[],skillCount,skillOptions:skillOptions.split(','),startingEquipment,
 features:features.map(([level,names])=>({level,names:names.split('|')})),
 choices:[choice('class-skills','Class skills',skillCount,skillOptions.split(','),'skill'),...extra]
});
export const CLASSES:ClassDefinition[]=[
 c('barbarian','Barbarian','Primal fury and resilience.',12,'Str','Str,Con','Light,Medium,Shields','Simple,Martial','',2,'Animal Handling,Athletics,Intimidation,Nature,Perception,Survival','Class starting package or 75 GP',[[1,'Rage|Unarmored Defense|Weapon Mastery'],[2,'Danger Sense|Reckless Attack'],[3,'Primal Knowledge|Barbarian Subclass'],[5,'Extra Attack|Fast Movement']], [choice('weapon-mastery','Weapon Masteries',2,martial,'weapon-mastery')]),
 c('bard','Bard','Inspiration, expertise, and spellcraft.',8,'Cha','Dex,Cha','Light','Simple','Musical Instruments (three kinds)',3,'Acrobatics,Animal Handling,Arcana,Athletics,Deception,History,Insight,Intimidation,Investigation,Medicine,Nature,Perception,Performance,Persuasion,Religion,Sleight of Hand,Stealth,Survival','Class starting package or 90 GP',[[1,'Bardic Inspiration|Spellcasting'],[2,'Expertise|Jack of All Trades'],[3,'Bard Subclass']],[]),
 c('cleric','Cleric','Divine magic and sacred service.',8,'Wis','Wis,Cha','Light,Medium,Shields','Simple','',2,'History,Insight,Medicine,Persuasion,Religion','Class starting package or 110 GP',[[1,'Spellcasting|Divine Order'],[2,'Channel Divinity'],[3,'Cleric Subclass']], [choice('divine-order','Divine Order',1,['Protector','Thaumaturge'],'divine-order')]),
 c('druid','Druid','Primal magic and shapeshifting.',8,'Wis','Int,Wis','Light,Shields','Simple','Herbalism Kit',2,'Arcana,Animal Handling,Insight,Medicine,Nature,Perception,Religion,Survival','Class starting package or 50 GP',[[1,'Spellcasting|Druidic|Primal Order'],[2,'Wild Shape|Wild Companion'],[3,'Druid Subclass']], [choice('primal-order','Primal Order',1,['Magician','Warden'],'primal-order')]),
 c('fighter','Fighter','Versatile martial specialist.',10,'Str,Dex','Str,Con','Light,Medium,Heavy,Shields','Simple,Martial','',2,'Acrobatics,Animal Handling,Athletics,History,Insight,Intimidation,Persuasion,Perception,Survival','Class starting package or 155 GP',[[1,'Fighting Style|Second Wind|Weapon Mastery'],[2,'Action Surge|Tactical Mind'],[3,'Fighter Subclass']], [choice('fighting-style','Fighting Style',1,['Archery','Blind Fighting','Defense','Dueling','Great Weapon Fighting','Interception','Protection','Thrown Weapon Fighting','Two-Weapon Fighting','Unarmed Fighting'],'fighting-style'),choice('weapon-mastery','Weapon Masteries',3,martial,'weapon-mastery')]),
 c('monk','Monk','Disciplined unarmed combatant.',8,'Dex,Wis','Str,Dex','','Simple,Martial Light','',2,'Acrobatics,Athletics,History,Insight,Religion,Stealth','Class starting package or 50 GP',[[1,'Martial Arts|Unarmored Defense'],[2,'Monk Focus|Unarmored Movement|Uncanny Metabolism'],[3,'Deflect Attacks|Monk Subclass']]),
 c('paladin','Paladin','Oath-bound divine warrior.',10,'Str,Cha','Wis,Cha','Light,Medium,Heavy,Shields','Simple,Martial','',2,'Athletics,Insight,Intimidation,Medicine,Persuasion,Religion','Class starting package or 150 GP',[[1,'Lay on Hands|Spellcasting|Weapon Mastery'],[2,'Fighting Style|Paladins Smite'],[3,'Channel Divinity|Paladin Subclass']], [choice('weapon-mastery','Weapon Masteries',2,martial,'weapon-mastery')]),
 c('ranger','Ranger','Hunter, tracker, and wilderness expert.',10,'Dex,Wis','Str,Dex','Light,Medium,Shields','Simple,Martial','',3,'Animal Handling,Athletics,Insight,Investigation,Nature,Perception,Stealth,Survival','Class starting package or 150 GP',[[1,'Favored Enemy|Spellcasting|Weapon Mastery'],[2,'Deft Explorer|Fighting Style'],[3,'Ranger Subclass']], [choice('weapon-mastery','Weapon Masteries',2,martial,'weapon-mastery')]),
 c('rogue','Rogue','Skillful expert in precision and stealth.',8,'Dex','Dex,Int','Light','Simple,Martial (Finesse or Light)','Thieves Tools',4,'Acrobatics,Athletics,Deception,Insight,Intimidation,Investigation,Perception,Performance,Persuasion,Sleight of Hand,Stealth','Class starting package or 100 GP',[[1,'Expertise|Sneak Attack|Thieves Cant|Weapon Mastery'],[2,'Cunning Action'],[3,'Rogue Subclass|Steady Aim'],[5,'Cunning Strike|Uncanny Dodge']], [choice('expertise','Expertise (from chosen class skills or Thieves Tools)',2,[...skills,'Thieves Tools'],'expertise'),choice('weapon-mastery','Weapon Masteries',2,martial,'weapon-mastery')]),
 c('sorcerer','Sorcerer','Innate arcane magic.',6,'Cha','Con,Cha','','Simple','',2,'Arcana,Deception,Insight,Intimidation,Persuasion,Religion','Class starting package or 50 GP',[[1,'Spellcasting|Innate Sorcery'],[2,'Font of Magic|Metamagic'],[3,'Sorcerer Subclass']]),
 c('warlock','Warlock','Pact magic and eldritch gifts.',8,'Cha','Wis,Cha','Light','Simple','',2,'Arcana,Deception,History,Intimidation,Investigation,Nature,Religion','Class starting package or 100 GP',[[1,'Eldritch Invocations|Pact Magic'],[2,'Magical Cunning'],[3,'Warlock Subclass']]),
 c('wizard','Wizard','Scholarly arcane spellcaster.',6,'Int','Int,Wis','','Simple','',2,'Arcana,History,Insight,Investigation,Medicine,Religion','Class starting package or 55 GP',[[1,'Spellcasting|Ritual Adept|Arcane Recovery'],[2,'Scholar'],[3,'Wizard Subclass']])
];
export function classChoices(classId:string,skillsChosen:string[]=[]):ChoiceDefinition[]{
 const cls=CLASSES.find(x=>x.id===classId);
 if(!cls)return [];
 return cls.choices.map(d=>d.id==='expertise'?{...d,options:[...skillsChosen,'Thieves Tools']}:d);
}
export function validateClass(classId:string|undefined,selections:ChoiceSelections):string[]{
 const cls=CLASSES.find(c=>c.id===classId);
 return cls?validateChoices(classChoices(cls.id,selections['class-skills']??[]),selections):['Choose a supported class.'];
}
export function classSummary(classId:string){return CLASSES.find(c=>c.id===classId);}
