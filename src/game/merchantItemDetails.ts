import type {Item} from './creationEquipment';

// Adapted from the System Reference Document 5.2.1 by Wizards of the Coast LLC.
// Source: https://www.dndbeyond.com/srd · License: https://creativecommons.org/licenses/by/4.0/
const dexSave='Dexterity save DC = 8 + your Dexterity modifier + proficiency bonus.';
const scrollUse='If the spell is on your class’s spell list, cast it using its normal casting time without Material components. Spell save DC 13, spell attack bonus +5. The scroll disintegrates after casting.';
const gear:Record<string,string>={
 acid:`Replace one attack with a throw at a visible creature or object within 20 feet. A failed save deals 2d6 Acid damage. ${dexSave}`,
 'alchemist-s-fire':`Replace one attack with a throw at a visible creature or object within 20 feet. A failed save deals 1d4 Fire damage and starts Burning, which deals 1d4 Fire damage at the start of each turn until extinguished. A burning creature can use an action to drop Prone and roll. Dousing, submerging, or smothering also works. ${dexSave}`,
 antitoxin:'Drink as a Bonus Action. For one hour, you have Advantage on saves to avoid or end the Poisoned condition.',
 backpack:'Carries up to 30 pounds in 1 cubic foot and can serve as a saddlebag.',
 'ball-bearings':'Utilize to cover a level 10-foot square within 10 feet. First entry each turn calls for a DC 10 Dexterity save or the creature falls Prone. Recovery takes 10 minutes.',
 barrel:'Stores up to 40 gallons of liquid or 4 cubic feet of dry goods.',
 basket:'Carries up to 40 pounds within 2 cubic feet.',
 bedroll:'Sleeps one Small or Medium creature. While inside, you automatically succeed on saves against extreme cold.',
 bell:'Ring it with Utilize to make a sound audible up to 60 feet away.',
 blanket:'Wrap yourself in it for Advantage on saves against extreme cold.',
 'block-and-tackle':'A pulley assembly that lets you lift up to four times your normal lifting capacity.',
 book:'Consult accurate nonfiction for +5 to Intelligence checks about its topic using Arcana, History, Nature, or Religion.',
 'bottle-glass':'Holds up to 1½ pints.',
 bucket:'Holds up to half a cubic foot of contents.',
 'burglar-s-pack':'Backpack, Ball Bearings, Bell, 10 Candles, Crowbar, Hooded Lantern, 7 flasks of Oil, 5 days of Rations, Rope, Tinderbox, and Waterskin.',
 caltrops:'Utilize to cover a 5-foot square within 5 feet. First entry each turn calls for a DC 15 Dexterity save or the creature takes 1 Piercing damage and has Speed 0 until its next turn starts. Recovery takes 10 minutes.',
 candle:'Burns 1 hour, providing Bright Light within 5 feet and Dim Light for 5 feet beyond that.',
 'case-crossbow-bolt':'Stores up to 20 crossbow Bolts.',
 'case-map-or-scroll':'Stores up to 10 paper sheets or 5 parchment sheets.',
 chain:'Utilize within 5 feet to bind a Grappled, Incapacitated, or Restrained target with DC 13 Athletics. Bound legs restrain it. Escape requires DC 18 Acrobatics as an action, or break it with DC 20 Athletics as an action.',
 chest:'Stores up to 12 cubic feet of contents.',
 'climber-s-kit':'Utilize to anchor yourself. You cannot fall or move more than 25 feet from the anchor while attached. Release it as a Bonus Action.',
 'clothes-fine':'Formal attire that can be required for admission to certain events or locations.',
 'clothes-traveler-s':'Durable clothing made for travel in varied environments.',
 'component-pouch':'A watertight organizer holding your spells’ Material components that have no listed cost.',
 costume:'Wear it for Advantage on checks to impersonate the person or kind of person depicted.',
 crowbar:'Grants Advantage on Strength checks where you can apply its leverage.',
 'diplomat-s-pack':'Chest, Fine Clothes, Ink, 5 Ink Pens, Lamp, 2 Map or Scroll Cases, 4 flasks of Oil, 5 sheets each of Paper and Parchment, Perfume, and Tinderbox.',
 'dungeoneer-s-pack':'Backpack, Caltrops, Crowbar, 2 flasks of Oil, 10 days of Rations, Rope, Tinderbox, 10 Torches, and Waterskin.',
 'entertainer-s-pack':'Backpack, Bedroll, Bell, Bullseye Lantern, 3 Costumes, Mirror, 8 flasks of Oil, 9 days of Rations, Tinderbox, and Waterskin.',
 'explorer-s-pack':'Backpack, Bedroll, 2 flasks of Oil, 10 days of Rations, Rope, Tinderbox, 10 Torches, and Waterskin.',
 flask:'Holds up to 1 pint.',
 'grappling-hook':'Utilize to throw at a catch within 50 feet. A DC 13 Dexterity (Acrobatics) check secures it. Attach a Rope to climb.',
 'healer-s-kit':'Ten uses. Utilize one use to stabilize an Unconscious creature at 0 HP without making a Medicine check.',
 'holy-water':`Replace one attack with a throw at a visible creature within 20 feet. Only Fiends or Undead take damage: 2d8 Radiant on a failed save. ${dexSave}`,
 'hunting-trap':'Utilize to set and anchor it. First contact requires a DC 13 Dexterity save or deals 1d4 Piercing and reduces Speed to 0 until the next turn starts. Movement then stays within the chain’s reach. Escape or free a creature in reach with an action and DC 13 Athletics; failure deals 1 Piercing to the trapped creature.',
 ink:'One ounce of ink, enough for about 500 pages.',
 'ink-pen':'Use with Ink to write or draw.',
 jug:'Holds up to 1 gallon.',
 ladder:'A 10-foot ladder. Moving up or down it uses climbing.',
 lamp:'Burns Oil for Bright Light in a 15-foot radius and Dim Light for 30 feet beyond it.',
 'lantern-bullseye':'Burns Oil to project a 60-foot cone of Bright Light, with Dim Light extending 60 feet farther.',
 'lantern-hooded':'Burns Oil for 30 feet of Bright Light plus 30 feet of Dim Light. Raise or lower the hood as a Bonus Action. Lowered, it produces only a 5-foot radius of Dim Light.',
 lock:'Includes a key. Without it, pick the lock using Thieves’ Tools and a DC 15 Dexterity (Sleight of Hand) check.',
 'magnifying-glass':'Grants Advantage when appraising or examining fine detail. Focus sunlight or equivalent light on tinder for about 5 minutes to start a fire.',
 manacles:'Utilize to bind an unwilling Small or Medium target within 5 feet that is Grappled, Incapacitated, or Restrained with DC 13 Dexterity (Sleight of Hand). A bound target has Disadvantage on attacks and is Restrained if the manacles are anchored. Escape with DC 20 Sleight of Hand or break them with DC 25 Athletics as an action. Includes a key; picking requires Thieves’ Tools and DC 15 Sleight of Hand.',
 map:'Consult an accurate map for +5 to Wisdom (Survival) checks to navigate its area.',
 mirror:'A steel mirror for grooming, seeing around corners, or reflecting light as a signal.',
 net:`Replace one attack with a throw at a visible creature within 15 feet. Huge or larger creatures automatically succeed. Failure restrains the target. The target or a creature within 5 feet can free it with an action and DC 10 Strength (Athletics), or destroy the net (AC 10, 5 HP; immune to Bludgeoning, Poison, Psychic). ${dexSave}`,
 oil:`Throw one flask in place of an attack at a creature or object within 20 feet. A failed save coats it for 1 minute; Fire damage ignites the coating for 5 extra Fire damage. Utilize to pour on a level 5-foot square within 5 feet. Once lit, the square burns for 2 rounds and deals 5 Fire damage on entry or turn end, once per turn per creature. One flask fuels a lamp or lantern for 6 cumulative hours. Extinguish the fuel with Utilize. ${dexSave}`,
 paper:'One sheet holds about 250 handwritten words.',
 parchment:'One sheet holds about 250 handwritten words.',
 perfume:'A 4-ounce vial. For one hour after applying it, gain Advantage on Persuasion checks to influence an Indifferent Humanoid within 5 feet.',
 'poison-basic':'Bonus Action to coat a weapon or up to three pieces of ammunition. A qualifying hit that deals Piercing or Slashing damage adds 1d4 Poison damage. Potency lasts up to 1 minute or until the coating deals its damage.',
 pole:'A 10-foot pole for reaching objects. Vault with it for Advantage on Athletics checks associated with a High or Long Jump.',
 'pot-iron':'Holds up to 1 gallon.',
 'potion-of-healing':'Restores 2d4 + 2 HP. The SRD uses a Bonus Action to drink or administer it within 5 feet. Four Keeps currently uses an Action for ally administration.',
 pouch:'Carries up to 6 pounds in one-fifth of a cubic foot.',
 'priest-s-pack':'Backpack, Blanket, Holy Water, Lamp, 7 days of Rations, Robe, and Tinderbox.',
 quiver:'Stores up to 20 Arrows.',
 'ram-portable':'Grants +4 to the Strength check to break down a door. One helper also grants Advantage.',
 rations:'Travel-ready food such as hardtack and dried fruit. Record consumption toward the day’s food requirement.',
 robe:'Ceremonial or vocational clothing. Certain venues require particular robes, colors, or symbols.',
 rope:'Utilize to tie a knot with DC 10 Sleight of Hand. Bind an unwilling target only while it is Grappled, Incapacitated, or Restrained. Bound legs restrain the target until it escapes using an action and DC 15 Acrobatics. Breaking the rope requires DC 20 Athletics.',
 sack:'Carries up to 30 pounds in 1 cubic foot.',
 'scholar-s-pack':'Backpack, Book, Ink, Ink Pen, Lamp, 10 flasks of Oil, 10 sheets of Parchment, and Tinderbox.',
 shovel:'Spend 1 hour digging a 5-foot cube of soil or similar material.',
 'signal-whistle':'Utilize to send a signal audible up to 600 feet away.',
 'spikes-iron':'Ten iron spikes. Use a blunt tool and Utilize to drive one into a suitable surface to jam a door or anchor a Rope or Chain.',
 'spell-scroll-cantrip':'Contains a cantrip selected by its creator. '+scrollUse,
 'spell-scroll-level-1':'Contains a level 1 spell selected by its creator. '+scrollUse,
 spyglass:'Doubles the apparent size of objects viewed through it.',
 string:'A 10-foot length. Use Utilize to tie a knot.',
 tent:'Shelters up to two Small or Medium creatures.',
 tinderbox:'Light exposed fuel, a Candle, Lamp, Lantern, or Torch as a Bonus Action. Other fires take 1 minute to start.',
 torch:'Burns for 1 hour, with Bright Light out to 20 feet and Dim Light for 20 feet beyond it. The SRD permits a Simple Melee attack that deals 1 Fire damage on a hit.',
 vial:'Holds up to 4 ounces.',
 waterskin:'Holds up to 4 pints of water. Drink or refill from a confirmed source. Daily water needs depend on creature size.',
 arrows:'Sold in bundles of 20 arrows (1 GP per bundle). Each arrow is tracked and consumed individually in combat. Ammunition for Shortbows and Longbows. Store in a Quiver.',
 bolts:'Ammunition for crossbows. Store in a Crossbow Bolt Case.',
 'bullets-firearm':'Ammunition for firearms. Store in a Pouch.',
 'bullets-sling':'Ammunition for a Sling. Store in a Pouch.',
 needles:'Ammunition for a Blowgun. Store in a Pouch.',
 'holy-symbol-amulet':'A Cleric or Paladin spellcasting focus that can be worn or held.',
 'holy-symbol-emblem':'A Cleric or Paladin spellcasting focus displayed on fabric or a Shield.',
 'holy-symbol-reliquary':'A Cleric or Paladin spellcasting focus that must be held.',
};

const toolUses:Record<string,string>={
 'alchemist-s-supplies':'Intelligence. Utilize to identify a substance or start a fire (DC 15).',
 'brewer-s-supplies':'Intelligence. Utilize to identify alcohol (DC 10) or detect a poisoned drink (DC 15).',
 'calligrapher-s-supplies':'Dexterity. Utilize to write text with flourishes that resist forgery (DC 15).',
 'carpenter-s-tools':'Strength. Utilize to seal or pry open a door or container (DC 20).',
 'cartographer-s-tools':'Wisdom. Utilize to draft a map of a small area (DC 15).',
 'cobbler-s-tools':'Dexterity. Utilize to modify footwear so the wearer has Advantage on their next Dexterity (Acrobatics) check (DC 10).',
 'cook-s-utensils':'Wisdom. Utilize to improve flavor (DC 10) or detect spoiled or poisoned food (DC 15).',
 'glassblower-s-tools':'Intelligence. Utilize to determine what a glass object held in the past 24 hours (DC 15).',
 'jeweler-s-tools':'Intelligence. Utilize to determine a gem’s value (DC 15).',
 'leatherworker-s-tools':'Dexterity. Utilize to decorate leather (DC 10).',
 'mason-s-tools':'Strength. Utilize to chisel a hole or symbol in stone (DC 10).',
 'painter-s-supplies':'Wisdom. Utilize to paint a recognizable image of something you’ve seen (DC 10).',
 'potter-s-tools':'Intelligence. Utilize to tell what a ceramic item held within the past 24 hours (DC 15).',
 'smith-s-tools':'Strength. Utilize to pry open a door or container (DC 20).',
 'tinker-s-tools':'Dexterity. Utilize to build a Tiny scrap object that falls apart in 1 minute (DC 20).',
 'weaver-s-tools':'Dexterity. Utilize to mend torn clothing or sew a Tiny design (DC 10).',
 'woodcarver-s-tools':'Dexterity. Utilize to carve a pattern in wood (DC 10).',
 'disguise-kit':'Charisma. Utilize to apply makeup for a disguise (DC 10).',
 'forgery-kit':'Dexterity. Utilize to imitate up to ten words of handwriting (DC 15) or duplicate a wax seal (DC 20).',
 'herbalism-kit':'Intelligence. Utilize to identify a plant (DC 10). Used to craft Antitoxin, Candles, Healer’s Kits, and Potions of Healing.',
 'navigator-s-tools':'Wisdom. Utilize to plot a course (DC 10) or determine your position from the stars (DC 15).',
 'poisoner-s-kit':'Intelligence. Utilize to detect poison on an object (DC 10). Used to craft Basic Poison.',
 'thieves-tools':'Dexterity. Utilize to pick a lock or disarm a trap (DC 15).',
};

export function merchantItemDescription(item:Item):string{
 if(item.category==='weapon')return `Use with the Attack action. ${item.weaponGroup==='simple'?'Simple':'Martial'} weapon proficiency adds your proficiency bonus to its attack roll.${item.mastery?' Its mastery requires a feature that unlocks it.':''}`;
 if(item.category==='armor')return `${item.armorGroup??'Worn'} armor sets your base AC while equipped. You need training in its armor category to wear it without penalties.`;
 if(item.category==='shield')return 'Wield in one hand to gain +2 AC. You need Shield training to gain this bonus. The bonus applies while wielding the Shield.';
 if(item.id.startsWith('arcane-focus-'))return 'A spellcasting focus for Sorcerers, Warlocks, and Wizards. Can replace Material components that have no listed cost and are not consumed.'+(item.id.endsWith('-staff')?' Also serves as a Quarterstaff.':'');
 if(item.id.startsWith('druidic-focus-'))return 'A spellcasting focus for Druids and Rangers. Can replace Material components that have no listed cost and are not consumed.'+(item.id.endsWith('-staff')?' Also serves as a Quarterstaff.':'');
 if(item.id.startsWith('gaming-set-'))return 'Wisdom. Utilize to detect cheating (DC 10) or win the game (DC 20).';
 if(item.id.startsWith('musical-instrument-'))return 'Charisma. Utilize to play a known tune (DC 10) or improvise a song (DC 15). A Bard can use a Musical Instrument as a spellcasting focus.';
 return gear[item.id]??toolUses[item.id]??'';
}

export function merchantItemFacts(item:Item):string[]{
 const facts:string[]=[];
 if(item.damage)facts.push(item.damage+' damage');
 if(item.properties?.length)facts.push(item.properties.join(', '));
 if(item.mastery)facts.push(item.mastery+' mastery');
 if(item.category==='shield')facts.push('AC +2');
 if(item.baseAC!==undefined){
  const dex=item.armorGroup==='Light'?' + Dex modifier':item.armorGroup==='Medium'?` + Dex modifier (max ${item.dexCap??2})`:'';
  facts.push(`AC ${item.category==='shield'&&item.baseAC>0?'+':''}${item.baseAC}${dex}`);
 }
 if(item.strength)facts.push(`Strength ${item.strength} to avoid a speed penalty`);
 if(item.stealthDisadvantage)facts.push('Stealth Disadvantage');
 if(item.packQuantity)facts.push(`${item.packQuantity} per purchase`);
 facts.push(item.weight?`${item.weight} lb.${item.id==='waterskin'?' when full':''}`:'No weight listed');
 return facts;
}
