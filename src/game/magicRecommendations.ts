import type {Campaign} from './campaign';
import type {MagicItem} from './magicWishlist';
import type {EquipmentRecommendation} from './merchantRecommendations';

const normalize=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const casterClasses=new Set(['bard','cleric','druid','sorcerer','warlock','wizard','paladin','ranger']);

/** Build-fit recommendations, not a ranking by rarity, price, or item availability.
 * Unknown rules interactions do not get a speculative recommendation.
 * No changes to loot odds, wish lists, character state or inventory.
 */
export function magicItemRecommendation(campaign:Campaign|null,item:MagicItem):EquipmentRecommendation|null {
 if(!campaign?.character||!campaign.characterIdentity||item.rarity.includes(',')||item.rarity.includes('Varies'))return null;
 const cls=normalize(campaign.characterIdentity.classId),stats=campaign.character;
 const name=normalize(item.name);
 const owns=(name:string)=>Boolean(campaign.inventoryLedger?.gear.some(g=>g.quantity>0&&normalize(g.name)===normalize(name)));
 if(owns(item.name))return null;
 const loadout=(campaign.encounterLoadout?.weaponId??'').toLowerCase();
 const gear=campaign.inventoryLedger?.gear??[];
 const carries=(needle:string)=>gear.some(g=>g.quantity>0&&normalize(g.name).includes(needle));
 const ranged=loadout?/(shortbow|longbow|crossbow)/.test(loadout):carries('shortbow')||carries('longbow')||carries('crossbow');
 const bow=loadout?/(shortbow|longbow)/.test(loadout):carries('shortbow')||carries('longbow');
 const stealth=stats.proficientSkills.includes('Stealth')||stats.expertiseSkills?.includes('Stealth')||false;
 const dexBased=stats.scores.dex>=stats.scores.str+2||['rogue','ranger','monk'].includes(cls);
 const toolUser=cls==='rogue'||(campaign.characterBuild?.selections?.classChoices?.['expertise']??[]).some(n=>normalize(n)==='thieves tools');
 const caster=casterClasses.has(cls)||Boolean(stats.preparedSpells?.length);
 const requirement=(item.mechanics?.attunementRequirement??'').toLowerCase();
 const classRestrictions=['artificer','barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard'];
 if(classRestrictions.some(c=>requirement.includes(c))&&!requirement.includes(cls))return null;
 if(requirement.includes('spellcaster')&&!caster)return null;
 const pick=(stars:1|2|3,reason:string):EquipmentRecommendation=>({stars,reason});
 // Generic weapon and armor references are not guaranteed to be the character's favored subtype.
 if(name==='bracers of archery'&&bow)return pick(3,'Adds +2 damage to shortbow and longbow attacks; an excellent match for your bow-centered combat style.');
 if(name==='oathbow'&&bow)return pick(3,'Choose a longbow or shortbow variant: its special attacks reward a dedicated archer.');
 if(name==='bracers of archery'&&ranged)return pick(1,'Only benefits longbows and shortbows, not your current crossbow.');
 if(['weapon 1','weapon 2','weapon 3'].includes(name))
   return ranged?pick(2,'A magical bonus can improve ranged attacks, but choose a proficient ranged weapon variant.'):pick(1,'Potentially useful if you choose a weapon matching your trained loadout.');
 if(['ammunition 1','ammunition 2','ammunition 3'].includes(name))
   return ranged?pick(2,'Magical ammunition enhances ranged attacks but is expended after use.'):null;
 if(name==='efficient quiver'||name==='quiver of ehlonna')
   return bow?pick(2,'Keeps many arrows accessible to support your bow without adding an attack bonus.'):null;
 if(name==='boots of elvenkind')
   return stealth?pick(3,'Silent footsteps reinforce your Stealth-trained scouting and infiltration.'):['rogue','ranger'].includes(cls)?pick(2,'Silent footsteps help scouting, even without recorded Stealth proficiency.'):null;
 if(name==='cloak of elvenkind')
   return stealth?pick(3,'Improves your ability to hide and avoid detection, directly supporting your Stealth training.'):['rogue','ranger'].includes(cls)?pick(2,'Concealment helps scouting, although you lack recorded Stealth training.'):null;
 if(name==='gloves of thievery')
   return toolUser?pick(3,'Enhances a Rogue or specialist with Thieves’ Tools and Sleight of Hand tasks.'):stats.proficientSkills.includes('Sleight of Hand')?pick(2,'Enhances the Sleight of Hand skill your character knows.'):null;
 if(name==='cloak of invisibility'||name==='ring of invisibility')
   return stealth?pick(3,'Invisibility directly helps infiltration and a stealth-focused playstyle.'):pick(2,'Invisibility helps with escape and infiltration even without Stealth training.');
 if(name==='slippers of spider climbing')
   return stealth||ranged?pick(2,'Vertical routes and positioning help infiltration or ranged firing angles.'):null;
 if(name==='ring of evasion')
   return dexBased?pick(2,'Limited protection after a failed Dexterity save, even with the Rogue Evasion feature.'):null;
 if(name==='manual of quickness of action')
   return stats.scores.dex<30&&dexBased?pick(3,'Raises Dexterity for your attacks, Stealth checks and other Dexterity-focused abilities.'):null;
 if(name==='stone of good luck luckstone')
   return toolUser||stealth?pick(2,'Improves ability checks for a skill-heavy build.'):null;
 if(name==='boots of speed')
   return ranged?pick(2,'Extra movement helps maintain distance and reposition for bow attacks.'):cls==='rogue'?pick(2,'Mobility helps a skirmishing Rogue.'):null;
 if(name==='cloak of protection'||name==='ring of protection')
   return pick(2,'A consistent defensive bonus to Armor Class and saving throws.');
 if(name==='potion of invisibility'||name==='potion of greater invisibility')
   return stealth?pick(2,'A consumable aid for difficult stealth missions, not a permanent upgrade.'):null;
 if(['armor 1','armor 2','armor 3'].includes(name))
   return cls==='rogue'?pick(1,'Only a suitable trained variant, ideally studded leather, benefits this Rogue; a generic armor listing is not a guaranteed upgrade.'):null;
 if(name.includes('studded leather')&&item.category.toLowerCase().includes('armor')&&cls==='rogue')
   return pick(3,'A magical studded leather variant improves AC while preserving Dexterity and Stealth.');
 if(name==='amulet of health'&&stats.scores.con<19)return pick(2,'Raises Constitution, improving durability for a character with a lower Constitution score.');
 if(name==='headband of intellect'&&stats.scores.int<19&&(cls==='wizard'||cls==='rogue'&&Boolean(campaign.importedSubclassId?.includes('arcane'))))
   return pick(2,'Raises Intelligence for your Intelligence-focused class or subclass abilities.');
 if(name==='gauntlets of ogre power'&&stats.scores.str<19&&stats.scores.str>stats.scores.dex&&cls!=='monk')
   return pick(2,'Boosts Strength for a Strength-oriented character.');
 if(['wand of the war mage 1','wand of the war mage 2','wand of the war mage 3'].includes(name))
   return caster&&['sorcerer','wizard','warlock'].includes(cls)?pick(3,'Improves spell attacks for your arcane spellcasting focus.'):null;
 if(name.startsWith('1 rod of the pact keeper')||name.startsWith('2 rod of the pact keeper')||name.startsWith('3 rod of the pact keeper'))
   return cls==='warlock'?pick(3,'Strengthens Warlock spell attacks and spell save DC while supporting Pact Magic.'):null;
 if(name==='holy avenger')
   return cls==='paladin'?pick(3,'A powerful holy weapon suited to a Paladin who can wield its sword form.'):null;
 if(name==='staff of healing')
   return ['bard','cleric','druid'].includes(cls)?pick(3,'Restorative magic suited to your class and party support role.'):null;
 if(name==='staff of the woodlands')
   return cls==='druid'?pick(3,'Druid-specific magic that extends your nature-based spellcasting and utility.'):null;
 if(name==='ring of spell storing')
   return caster?pick(2,'Extra spell flexibility, depending on the spells stored and the attunement slot it occupies.'):null;
 if(name==='wand of fireballs')
   return caster?pick(2,'Expands magical area damage; useful if your build needs that option.'):null;
 if(name==='wand of magic missiles')
   return caster?pick(2,'Reliable ranged force damage as a backup to your usual spells.'):null;
 if(name==='shield 1'||name==='shield 2'||name==='shield 3')
   return ['barbarian','cleric','druid','fighter','paladin','ranger'].includes(cls)?pick(2,'Defensive upgrade when your shield training and fighting style permit carrying a shield.'):null;
 if(name==='1 wraps of unarmed power'||name==='2 wraps of unarmed power'||name==='3 wraps of unarmed power')
   return cls==='monk'?pick(3,'Improves the Unarmed Strikes central to your Monk combat style.'):null;
 if(name.includes('belt of')&&name.includes('giant strength')&&['barbarian','fighter','paladin'].includes(cls)&&stats.scores.str>stats.scores.dex)
   return pick(2,'Enhances the Strength attacks central to your melee build; check the belt’s actual Strength value.');
 if(name==='pearl of power')
   return caster?pick(2,'Restores a spell slot for your spellcasting build.'):null;
 if(name==='staff of power'||name==='staff of the magi')
   return caster&&['wizard','sorcerer','warlock'].includes(cls)?pick(3,'A powerful spellcasting tool suited to your arcane class.'):null;
 if(name.startsWith('instrument of the bards'))
   return cls==='bard'?pick(3,'Class-specific magic for your bardic spellcasting and performance.'):null;
 // High rarity alone is not evidence of relevance.
 return null;
}
