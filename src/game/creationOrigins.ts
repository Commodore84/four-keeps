export type RulesSource = 'PHB2024' | 'legacy';
export interface RulesEntry {id:string;name:string;source:RulesSource;sourceBook:string;summary:string}
export interface Species extends RulesEntry {speed:number;size:string;traits:string[];lineages?:{id:string;name:string;traits:string[]}[]}
export interface Background extends RulesEntry {abilities:string[];feat:string;skills:string[];tool:string;equipment:string}
const core=(id:string,name:string,summary:string)=>({id,name,summary,source:'PHB2024' as const,sourceBook:"Player's Handbook (2024)"});
export const SPECIES:Species[]=[
 {...core('aasimar','Aasimar','Celestial influence and supernatural transformation.'),speed:30,size:'Medium or Small',traits:['Celestial Resistance','Darkvision','Healing Hands','Light Bearer','Celestial Revelation (level 3)']},
 {...core('dragonborn','Dragonborn','Draconic ancestry and elemental breath.'),speed:30,size:'Medium',traits:['Draconic Ancestry','Breath Weapon','Damage Resistance','Darkvision','Draconic Flight (level 5)']},
 {...core('dwarf','Dwarf','Resilient folk with an affinity for stone.'),speed:30,size:'Medium',traits:['Darkvision','Dwarven Resilience','Dwarven Toughness','Stonecunning']},
 {...core('elf','Elf','Fey ancestry and magical lineages.'),speed:30,size:'Medium',traits:['Darkvision','Elven Lineage','Fey Ancestry','Keen Senses','Trance'],lineages:[
 {id:'drow',name:'Drow',traits:['Darkvision 120 ft.','Dancing Lights (level 1)','Faerie Fire (level 3)','Darkness (level 5)']},
 {id:'high-elf',name:'High Elf',traits:['Prestidigitation (level 1)','Detect Magic (level 3)','Misty Step (level 5)']},
 {id:'wood-elf',name:'Wood Elf',traits:['Speed 35 ft.','Druidcraft (level 1)','Longstrider (level 3)','Pass without Trace (level 5)']}
 ]},
 {...core('gnome','Gnome','Small folk with magical aptitude.'),speed:30,size:'Small',traits:['Darkvision','Gnomish Cunning','Gnomish Lineage'],lineages:[
 {id:'forest-gnome',name:'Forest Gnome',traits:['Minor Illusion','Speak with Animals']},
 {id:'rock-gnome',name:'Rock Gnome',traits:['Mending','Prestidigitation','Tinker']}
 ]},
 {...core('goliath','Goliath','Giant ancestry and extraordinary stature.'),speed:35,size:'Medium',traits:['Giant Ancestry','Large Form (level 5)','Powerful Build']},
 {...core('halfling','Halfling','Small, courageous, and fortunate.'),speed:30,size:'Small',traits:['Brave','Halfling Nimbleness','Luck','Naturally Stealthy']},
 {...core('human','Human','Versatile and resourceful.'),speed:30,size:'Medium or Small',traits:['Resourceful','Skillful','Versatile']},
 {...core('orc','Orc','Tenacious and powerful.'),speed:30,size:'Medium',traits:['Adrenaline Rush','Darkvision','Relentless Endurance']},
 {...core('tiefling','Tiefling','Fiendish legacy with innate magic.'),speed:30,size:'Medium or Small',traits:['Darkvision','Fiendish Legacy','Otherworldly Presence'],lineages:[
 {id:'abyssal',name:'Abyssal',traits:['Poison resistance','Poison Spray','Ray of Sickness (level 3)','Hold Person (level 5)']},
 {id:'chthonic',name:'Chthonic',traits:['Necrotic resistance','Chill Touch','False Life (level 3)','Ray of Enfeeblement (level 5)']},
 {id:'infernal',name:'Infernal',traits:['Fire resistance','Fire Bolt','Hellish Rebuke (level 3)','Darkness (level 5)']}
 ]}
];
const bg=(id:string,name:string,abilities:string,feat:string,skills:string,tool:string,equipment:string,summary:string):Background=>({...core(id,name,summary),abilities:abilities.split(','),feat,skills:skills.split(','),tool,equipment});
export const BACKGROUNDS:Background[]=[
 bg('acolyte','Acolyte','Int,Wis,Cha','Magic Initiate (Cleric)','Insight,Religion',"Calligrapher's Supplies",'Background equipment package or 50 GP','Raised in religious service.'),
 bg('artisan','Artisan','Str,Dex,Int','Crafter','Investigation,Persuasion',"Artisan's Tools (one kind)",'Background equipment package or 50 GP','Trained in a craft or trade.'),
 bg('charlatan','Charlatan','Dex,Con,Cha','Skilled','Deception,Sleight of Hand','Forgery Kit','Background equipment package or 50 GP','An expert in deception.'),
 bg('criminal','Criminal','Dex,Con,Int','Alert','Sleight of Hand,Stealth',"Thieves' Tools",'Background equipment package or 50 GP','Experienced in illicit work.'),
 bg('entertainer','Entertainer','Str,Dex,Cha','Musician','Acrobatics,Performance','Musical Instrument (one kind)','Background equipment package or 50 GP','Performer and artist.'),
 bg('farmer','Farmer','Str,Con,Wis','Tough','Animal Handling,Nature',"Carpenter's Tools",'Background equipment package or 50 GP','Worked the land.'),
 bg('guard','Guard','Str,Int,Wis','Alert','Athletics,Perception','Gaming Set (one kind)','Background equipment package or 50 GP','Protected people or places.'),
 bg('guide','Guide','Dex,Con,Wis','Magic Initiate (Druid)','Stealth,Survival',"Cartographer's Tools",'Background equipment package or 50 GP','Led travelers through the wilds.'),
 bg('hermit','Hermit','Con,Wis,Cha','Healer','Medicine,Religion','Herbalism Kit','Background equipment package or 50 GP','Lived apart from society.'),
 bg('merchant','Merchant','Con,Int,Cha','Lucky','Animal Handling,Persuasion',"Navigator's Tools",'Background equipment package or 50 GP','Traveled and traded.'),
 bg('noble','Noble','Str,Int,Cha','Skilled','History,Persuasion','Gaming Set (one kind)','Background equipment package or 50 GP','Born to privilege and obligation.'),
 bg('sage','Sage','Con,Int,Wis','Magic Initiate (Wizard)','Arcana,History',"Calligrapher's Supplies",'Background equipment package or 50 GP','Studied lore and mysteries.'),
 bg('sailor','Sailor','Str,Dex,Wis','Tavern Brawler','Acrobatics,Perception',"Navigator's Tools",'Background equipment package or 50 GP','Life aboard ships.'),
 bg('scribe','Scribe','Dex,Int,Wis','Skilled','Investigation,Perception',"Calligrapher's Supplies",'Background equipment package or 50 GP','Recorded and preserved knowledge.'),
 bg('soldier','Soldier','Str,Dex,Con','Savage Attacker','Athletics,Intimidation','Gaming Set (one kind)','Background equipment package or 50 GP','Served in an armed force.'),
 bg('wayfarer','Wayfarer','Dex,Wis,Cha','Lucky','Insight,Stealth',"Thieves' Tools",'Background equipment package or 50 GP','Survived by traveling and adapting.')
];
export interface CustomBackground {
 name:string; abilities:string[]; feat:string; skills:string[]; tool:string;
}
export const DEFAULT_CUSTOM_BACKGROUND:CustomBackground={name:'',abilities:[],feat:'',skills:[],tool:''};
export const ALL_SKILLS=['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];
export const CUSTOM_TOOLS=['Alchemist’s Supplies','Brewer’s Supplies','Calligrapher’s Supplies','Carpenter’s Tools','Cartographer’s Tools','Cobbler’s Tools','Cook’s Utensils','Disguise Kit','Forgery Kit','Gaming Set','Glassblower’s Tools','Herbalism Kit','Jeweler’s Tools','Leatherworker’s Tools','Mason’s Tools','Musical Instrument','Navigator’s Tools','Painter’s Supplies','Poisoner’s Kit','Potter’s Tools','Smith’s Tools','Thieves’ Tools','Tinker’s Tools','Weaver’s Tools','Woodcarver’s Tools'];
export const CUSTOM_FEATS=['Alert','Crafter','Healer','Lucky','Magic Initiate (Cleric)','Magic Initiate (Druid)','Magic Initiate (Wizard)','Musician','Savage Attacker','Skilled','Tavern Brawler','Tough'];
export function validateCustomBackground(bg:CustomBackground|undefined):string[]{
 if(!bg)return ['Configure your custom background.'];
 const errors:string[]=[];
 if(!bg.name.trim())errors.push('Name your custom background.');
 if(bg.abilities.length!==3||new Set(bg.abilities).size!==3||!bg.abilities.every(a=>['Str','Dex','Con','Int','Wis','Cha'].includes(a)))errors.push('Choose three distinct background abilities.');
 if(!CUSTOM_FEATS.includes(bg.feat))errors.push('Choose a valid Origin feat.');
 if(bg.skills.length!==2||new Set(bg.skills).size!==2||!bg.skills.every(skill=>ALL_SKILLS.includes(skill)))errors.push('Choose two distinct background skills.');
 if(!CUSTOM_TOOLS.includes(bg.tool))errors.push('Choose one tool proficiency.');
 return errors;
}
export function resolveBackground(selections:{backgroundId?:string;customBackground?:CustomBackground},allowLegacy:boolean):Background|undefined{
 if(selections.backgroundId==='custom'){
  const bg=selections.customBackground;
  if(!bg)return undefined;
  return {id:'custom',name:bg.name||'Custom background',source:'PHB2024',sourceBook:'2024 Dungeon Master’s Guide — Custom Background',summary:'Custom background created using the DMG framework.',abilities:bg.abilities,feat:bg.feat,skills:bg.skills,tool:bg.tool,equipment:'50 GP'};
 }
 return availableBackgrounds(allowLegacy).find(b=>b.id===selections.backgroundId);
}
export function requiredSkillReplacements(classSkills:readonly string[],backgroundSkills:readonly string[]):string[]{
 return [...new Set(backgroundSkills.filter(skill=>classSkills.includes(skill)))];
}
export function validateSkillReplacements(classSkills:readonly string[],backgroundSkills:readonly string[],replacements:Record<string,string>={}):string[]{
 const duplicate=requiredSkillReplacements(classSkills,backgroundSkills);
 const used=new Set([...classSkills,...backgroundSkills]);
 return duplicate.flatMap(skill=>{
  const chosen=replacements[skill];
  return chosen&&ALL_SKILLS.includes(chosen)&&!used.has(chosen)&&duplicate.every(other=>other===skill||replacements[other]!==chosen)?[]:['Choose a different skill proficiency to replace overlapping '+skill+'.'];
 });
}
export function isDuplicateTool(classTools:readonly string[],backgroundTool:string):boolean{
 const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/tools$/,'tool');
 return !!backgroundTool&&classTools.some(tool=>normalize(tool)===normalize(backgroundTool));
}
export function validateToolReplacement(classTools:readonly string[],backgroundTool:string,replacement?:string):string[]{
 if(!isDuplicateTool(classTools,backgroundTool))return [];
 return replacement&&CUSTOM_TOOLS.includes(replacement)&&!isDuplicateTool(classTools,replacement)&&replacement!==backgroundTool?[]:['Choose a different tool proficiency to replace overlapping '+backgroundTool+'.'];
}
export function effectiveBackgroundSkills(classSkills:readonly string[],backgroundSkills:readonly string[],replacements:Record<string,string>={}):string[]{
 return backgroundSkills.map(skill=>classSkills.includes(skill)&&replacements[skill]?replacements[skill]:skill);
}
export const LEGACY_SPECIES:Species[]=[];
export const LEGACY_BACKGROUNDS:Background[]=[];
export function availableSpecies(allowLegacy:boolean):Species[]{return [...SPECIES,...(allowLegacy?LEGACY_SPECIES:[])];}
export function availableBackgrounds(allowLegacy:boolean):Background[]{return [...BACKGROUNDS,...(allowLegacy?LEGACY_BACKGROUNDS:[])];}
export function validateOrigins(selections:{speciesId?:string;speciesSkill?:string;lineageId?:string;backgroundId?:string;customBackground?:CustomBackground},allowLegacy:boolean):string[]{
 const errors:string[]=[];
 const species=availableSpecies(allowLegacy).find(s=>s.id===selections.speciesId);
 const background=resolveBackground(selections,allowLegacy);
 if(!species)errors.push('Choose a supported species.');
 if(species?.lineages?.length&&!species.lineages.some(l=>l.id===selections.lineageId))errors.push('Choose a lineage.');
 if(species&&selections.speciesSkill&&!(species.id==='elf'?['Insight','Perception','Survival']:species.id==='human'?ALL_SKILLS:[]).includes(selections.speciesSkill))errors.push('Choose the skill proficiency granted by your species.');
 if(!background)errors.push('Choose a supported background.');
 if(selections.backgroundId==='custom')errors.push(...validateCustomBackground(selections.customBackground));
 return errors;
}
export function originBenefits(selections:{speciesId?:string;lineageId?:string;backgroundId?:string;customBackground?:CustomBackground},allowLegacy:boolean){
 const species=availableSpecies(allowLegacy).find(s=>s.id===selections.speciesId);
 const background=resolveBackground(selections,allowLegacy);
 const lineage=species?.lineages?.find(l=>l.id===selections.lineageId);
 return {species:species?.name??null,lineage:lineage?.name??null,traits:[...(species?.traits??[]),...(lineage?.traits??[])],speed:lineage?.id==='wood-elf'?35:species?.speed??null,background:background?.name??null,originFeat:background?.feat??null,skills:background?.skills??[],tool:background?.tool??null,abilityOptions:background?.abilities??[]};
}
// Legacy data must be explicitly curated and compatibility-reviewed before publication.
// 2014 species ability bonuses must not stack with 2024 background bonuses.
