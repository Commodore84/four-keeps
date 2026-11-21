import {ITEMS} from './creationEquipment';
export const SPECIES_TRAITS:Record<string,string>={
'Celestial Resistance':'You resist Radiant and Necrotic damage. Resistance halves damage of that type after other applicable modifiers.',
'Darkvision':'You can see in dim light within your Darkvision range as though it were bright, and darkness as dim light; you cannot discern colors in darkness. The usual range is 60 feet unless a lineage specifies otherwise.',
'Healing Hands':'Once per Long Rest, use a Magic action to touch a creature and restore Hit Points equal to a number of d4s equal to your Proficiency Bonus.',
'Light Bearer':'You know the Light cantrip. Charisma is your spellcasting ability for it.',
'Celestial Revelation (level 3)':'At level 3, choose a celestial transformation. It lasts one minute and grants an additional benefit such as flight, radiant damage, or a frightening presence; the choice affects your combat role.',
'Draconic Ancestry':'Choose a dragon ancestry, which determines your breath weapon damage type and your corresponding damage resistance.',
'Breath Weapon':'When you take the Attack action, you can replace one attack with a breath attack. Creatures in its area make a Dexterity save against a DC based on your Constitution; damage and uses scale with level.',
'Damage Resistance':'You take half damage from the damage type granted by your ancestry or legacy. It does not protect against other damage types.',
'Draconic Flight (level 5)':'At level 5, you can manifest spectral wings for a limited duration and gain a flying speed; uses are limited by rest rules.',
'Dwarven Resilience':'You have Resistance to Poison damage and Advantage on saving throws to avoid or end the Poisoned condition.',
'Dwarven Toughness':'Your Hit Point maximum increases by 1 at level 1 and by 1 each time you gain a level.',
'Stonecunning':'Gain Tremorsense while standing on or touching stone for a limited time, allowing you to sense creatures through vibrations under the feature’s restrictions.',
'Elven Lineage':'Choose Drow, High Elf, or Wood Elf. The lineage grants a cantrip at level 1 and additional spells as you advance.',
'Fey Ancestry':'You have Advantage on saving throws to avoid or end the Charmed condition.',
'Keen Senses':'You gain proficiency in Insight, Perception, or Survival (choose one).',
'Trance':'You do not need to sleep; a four-hour meditative Trance can give you the benefit of a Long Rest under the species rules.',
'Gnomish Cunning':'You have Advantage on Intelligence, Wisdom, and Charisma saving throws against magic.',
'Gnomish Lineage':'Choose Forest Gnome for illusion and animal communication, or Rock Gnome for minor magical invention.',
'Giant Ancestry':'Choose a giant heritage, granting a distinctive power such as extra damage, teleportation, forced movement, or defense. The heritage changes how you approach combat.',
'Large Form (level 5)':'At level 5, temporarily become Large, increasing your reach and mobility options under the feature’s rules.',
'Powerful Build':'You have Advantage on saving throws to end the Grappled condition and count as one size larger for carrying capacity.',
'Brave':'You have Advantage on saving throws to avoid or end the Frightened condition.',
'Halfling Nimbleness':'You can move through the space of a creature larger than you, though you cannot normally end your movement there.',
'Luck':'When you roll a 1 on a d20 Test, you can reroll that die and must use the new result.',
'Naturally Stealthy':'You can attempt to Hide even when obscured only by a creature that is at least one size larger than you.',
'Resourceful':'You gain Heroic Inspiration whenever you finish a Long Rest.',
'Skillful':'You gain proficiency in one skill of your choice.',
'Versatile':'You gain an Origin feat of your choice, subject to its prerequisites.',
'Adrenaline Rush':'You can Dash as a Bonus Action a limited number of times per Long Rest; doing so also grants Temporary Hit Points.',
'Relentless Endurance':'When reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead, once per Long Rest.',
'Fiendish Legacy':'Choose Abyssal, Chthonic, or Infernal heritage. Each grants a resistance, a cantrip, and additional spells at later levels.',
'Otherworldly Presence':'You know the Thaumaturgy cantrip.'
};
export const LINEAGE_DETAILS:Record<string,string>={
'drow':'Superior Darkvision reaches 120 feet. Dancing Lights is available immediately; Faerie Fire arrives at level 3 and Darkness at level 5. Strong for scouting and magical battlefield concealment.',
'high-elf':'You know Prestidigitation and can replace it with another Wizard cantrip after a Long Rest. Detect Magic arrives at level 3 and Misty Step at level 5. Useful for flexible magical utility.',
'wood-elf':'Your walking Speed increases to 35 feet. You know Druidcraft, gain Longstrider at level 3, and Pass without Trace at level 5. Useful for mobility, scouting, and stealth.',
'forest-gnome':'You know Minor Illusion and Speak with Animals. This lineage emphasizes deception, exploration, and gathering information from Beasts.',
'rock-gnome':'You know Mending and Prestidigitation, and can create small magical devices using Tinker under the species rules.',
'abyssal':'Gain Poison resistance and Poison Spray. Ray of Sickness becomes available at level 3 and Hold Person at level 5. Emphasizes toxic magic and control.',
'chthonic':'Gain Necrotic resistance and Chill Touch. False Life becomes available at level 3 and Ray of Enfeeblement at level 5. Emphasizes survival and debilitating magic.',
'infernal':'Gain Fire resistance and Fire Bolt. Hellish Rebuke becomes available at level 3 and Darkness at level 5. Emphasizes ranged fire damage and magical concealment.'
};
export const ORIGIN_FEATS:Record<string,string>={
'Alert':'Add your Proficiency Bonus to Initiative rolls. Immediately after Initiative is rolled, you can swap your Initiative with one willing ally in the same combat. Useful when acting early matters.',
'Crafter':'Gain proficiency with three different Artisan’s Tools. You receive a discount when buying nonmagical items and can create useful gear with the feat’s crafting benefits.',
'Healer':'Use a Healer’s Kit to let a creature expend a Hit Point Die to recover Hit Points, adding your Proficiency Bonus. When you roll healing dice from a spell or Battle Medic, you can reroll a 1 once per die.',
'Lucky':'You have Luck Points equal to your Proficiency Bonus, regained on a Long Rest. Spend a point to gain Advantage on one of your d20 Tests or impose Disadvantage on an attack roll made against you.',
'Magic Initiate (Cleric)':'Choose two Cleric cantrips and one level-one Cleric spell. You can cast the chosen level-one spell once per Long Rest without a slot, and also with your available slots. Choose Intelligence, Wisdom, or Charisma as your spellcasting ability.',
'Magic Initiate (Druid)':'Choose two Druid cantrips and one level-one Druid spell. You can cast the chosen level-one spell once per Long Rest without a slot, and also with your available slots. Choose Intelligence, Wisdom, or Charisma as your spellcasting ability.',
'Magic Initiate (Wizard)':'Choose two Wizard cantrips and one level-one Wizard spell. You can cast the chosen level-one spell once per Long Rest without a slot, and also with your available slots. Choose Intelligence, Wisdom, or Charisma as your spellcasting ability.',
'Musician':'Gain proficiency with three Musical Instruments. After a Short or Long Rest, you can play an instrument to give Heroic Inspiration to allies, up to a number based on your Proficiency Bonus.',
'Savage Attacker':'Once per turn when you hit with a weapon, you can roll its damage dice twice and use either roll. This does not double unrelated bonus damage dice.',
'Skilled':'Gain proficiency in any combination of three skills or tools. You can select this feat more than once.',
'Tavern Brawler':'Improve your Unarmed Strike damage, reroll 1s on its damage dice, and gain benefits when shoving enemies and using improvised weapons.',
'Tough':'Increase your Hit Point maximum by twice your character level. Whenever you gain another level, increase your Hit Point maximum by 2 more.'
};
export const CLASS_OVERVIEW:Record<string,string>={
barbarian:'A durable front-line combatant who spends Rage uses for physical offense and resilience. Strength and Constitution are priorities; armor and concentration-based spellcasting have important Rage restrictions. Weapon Mastery changes how different weapons control enemies.',
bard:'A Charisma spellcaster and versatile support specialist. Bardic Inspiration boosts allies’ rolls, while a broad skill list and magical support enable social, exploration, and battlefield roles. Spell selection and resource timing matter.',
cleric:'A Wisdom-based divine caster who can heal, protect, control, and deal damage. Divine Order at level 1 shifts you toward martial defense or extra magical knowledge. Your prepared spells can be adapted after rests.',
druid:'A Wisdom-based primal caster who controls terrain, heals, and supports exploration. Primal Order distinguishes a more spell-focused approach from a sturdier front-line approach. Wild Shape arrives at level 2.',
fighter:'A flexible weapon specialist with strong armor options. Fighting Style shapes your preferred attacks, Second Wind provides recovery, and Weapon Mastery adds tactical effects. Action Surge at level 2 creates powerful burst turns.',
monk:'A mobile martial artist using Dexterity and Wisdom, unarmored defense, and specialized unarmed attacks. Focus Points arrive at level 2, enabling mobility and additional combat options. Your equipment choices affect your martial-arts benefits.',
paladin:'A heavily armored divine warrior combining weapon attacks, healing, and protective magic. Lay on Hands provides reliable healing; Divine Smite arrives later. Strength and Charisma influence different parts of your role.',
ranger:'A martial wilderness specialist combining Dexterity-based weapon attacks, tracking, and primal magic. Hunter’s Mark is central to level-one offense; exploration and stealth skills support scouting.',
rogue:'A precision striker and expert in skills. Sneak Attack rewards attacking with advantage or with an ally engaging your target, subject to its restrictions. Expertise makes chosen proficiencies unusually strong, and Cunning Action arrives at level 2.',
sorcerer:'A Charisma caster whose magic is innate. Innate Sorcery temporarily improves offensive spellcasting; later, Sorcery Points and Metamagic modify how spells are used. Your limited spell choices make each selection important.',
warlock:'A Charisma caster whose Pact Magic slots refresh on Short Rests. Invocations provide lasting powers and customizable magical tools, including pact weapon, familiar, or tome options. Your spell slots are fewer than other casters but return more frequently.',
wizard:'An Intelligence caster with the broadest spellbook approach. You choose spells to record, prepare a subset for use, and can cast eligible ritual spells from your spellbook. Arcane Recovery helps restore spell slots after a Short Rest.'
};
export const CLASS_FEATURE_DETAILS:Record<string,string>={
'Rage':'Enter Rage as a Bonus Action for improved Strength-based offense and resistance to Bludgeoning, Piercing, and Slashing damage. Rage has duration and usage limits and prevents casting spells or maintaining Concentration.',
'Unarmored Defense':'Calculate Armor Class without armor using the class’s ability modifiers. Compare it with other AC calculations and use only one formula; wearing a shield may be allowed depending on the class.',
'Weapon Mastery':'Choose weapons whose mastery properties you can use. Each mastery adds a tactical effect, such as slowing, pushing, or improving follow-up attacks, when its conditions are met.',
'Bardic Inspiration':'Give an ally a Bardic Inspiration die as a Bonus Action. The ally can use the die to improve a qualifying d20 Test; uses are limited by your Charisma modifier and recovery rules.',
'Spellcasting':'You learn or prepare spells as specified by your class. Spell slots power leveled spells, cantrips do not spend slots, and concentration limits which ongoing effects you can maintain.',
'Pact Magic':'Warlock spell slots return on a Short or Long Rest, and all slots are the same level based on Warlock progression. Your Charisma sets spell attack modifiers and saving throw DCs.',
'Eldritch Invocations':'Choose permanent or replaceable magical enhancements as your Warlock levels increase. Each invocation has prerequisites and can grant spells, a pact boon, or new tactical effects.',
'Divine Order':'Protector favors martial weapons and heavy armor; Thaumaturge grants additional magical utility and a boost to Arcana or Religion checks.',
'Primal Order':'Magician improves your spellcasting versatility and Arcana or Nature checks; Warden grants martial weapon training and medium armor training.',
'Fighting Style':'Choose a combat specialization such as Archery for ranged attacks, Defense for armor, or Dueling for one-handed melee weapons. Each has specific equipment and attack requirements.',
'Second Wind':'Use a Bonus Action to recover Hit Points. Uses are limited but recharge according to the class’s rest rules.',
'Expertise':'Double your Proficiency Bonus for ability checks using chosen proficient skills or tools. Choosing frequently used skills provides the greatest benefit.',
'Sneak Attack':'Once per turn, add Sneak Attack dice to a qualifying Finesse or Ranged weapon hit when you have Advantage or another qualifying circumstance, provided you do not have Disadvantage.',
'Thieves Cant':'You know a coded language of signs, slang, and symbols used to convey hidden messages among rogues.',
'Martial Arts':'Use Dexterity for eligible Unarmed Strikes and Monk weapons, use a special Martial Arts damage die, and make an additional Unarmed Strike as a Bonus Action when eligible.',
'Innate Sorcery':'Activate a temporary magical state that improves your Sorcerer spell saving throw DCs and grants Advantage on spell attack rolls for a limited duration.',
'Ritual Adept':'Cast eligible ritual spells from your Wizard spellbook as rituals even if you have not prepared them, without expending a spell slot; ritual casting takes extra time.',
'Arcane Recovery':'After a Short Rest, recover some expended spell slots, with a limit based on Wizard level and restrictions on slot levels.',
'Lay on Hands':'Use a pool of healing power to restore Hit Points by touch as a Bonus Action. The pool scales with Paladin level and can also remove Poisoned under the feature’s rules.',
'Favored Enemy':'You always have Hunter’s Mark prepared and can cast it a limited number of times without spending a spell slot. Its damage applies to qualifying weapon hits against your marked target.',
'Gnomish Cunning':'Advantage on mental saving throws against magical effects.'
};
export const CHOICE_DETAILS:Record<string,string>={
'Protector':'Gain proficiency with Martial weapons and training with Heavy armor. Best for a Cleric planning to fight closer to enemies or use heavier equipment.',
'Thaumaturge':'Gain an extra Cleric cantrip and add your Wisdom modifier to qualifying Arcana or Religion checks. Best for emphasizing spellcasting and knowledge.',
'Magician':'Gain an extra Druid cantrip and add your Wisdom modifier to qualifying Arcana or Nature checks. Best for spellcasting versatility.',
'Warden':'Gain proficiency with Martial weapons and training with Medium armor. Best for a sturdier Druid who expects more direct combat.',
'Archery':'Gain +2 to attack rolls with Ranged weapons, improving accuracy but not damage rolls.',
'Blind Fighting':'Gain Blindsight out to 10 feet, allowing you to perceive nearby creatures without relying on normal sight, subject to obstructions.',
'Defense':'While wearing armor, gain +1 Armor Class.',
'Dueling':'When holding a melee weapon in one hand and no other weapons, gain +2 to damage rolls with that weapon.',
'Great Weapon Fighting':'Treat damage dice rolls of 1 or 2 as 3 for attacks with eligible two-handed or versatile weapons used in two hands.',
'Interception':'Use your Reaction to reduce damage dealt to an ally near you when you are wielding a Shield or a Simple or Martial weapon.',
'Protection':'Use your Reaction and a Shield to impose Disadvantage on an attack roll against an ally within 5 feet.',
'Thrown Weapon Fighting':'Draw a Thrown weapon as part of its attack and add +2 to damage when you hit with a thrown weapon.',
'Two-Weapon Fighting':'Add your ability modifier to the damage of the extra attack made using the Light weapon property.',
'Unarmed Fighting':'Improve Unarmed Strike damage, with a larger die when both hands are free; you can also damage a creature you have Grappled.',
'Slow':'When you hit and deal damage, reduce the target’s Speed by 10 feet until your next turn, subject to the property’s limits.',
'Nick':'Make the extra attack from the Light property as part of the Attack action rather than a Bonus Action, once per turn.',
'Vex':'A hit gives you Advantage on your next attack roll against the same creature before the end of your next turn.',
'Push':'On a qualifying hit, push a Large or smaller creature up to 10 feet away from you.',
'Topple':'On a qualifying hit, force a Constitution save or knock the target Prone.',
'Graze':'When your attack misses, deal damage equal to the ability modifier used for the attack; the damage type matches the weapon.',
'Cleave':'After hitting a creature, you can make a follow-up attack against a different creature within reach and near the original target.',
'Sap':'On a hit, impose Disadvantage on the target’s next attack roll before the start of your next turn.'
};
export const SKILL_DETAILS:Record<string,string>={
'Acrobatics':'Dexterity: balance, tumbling, and staying on your feet in difficult situations.',
'Animal Handling':'Wisdom: calm, train, and interpret the behavior of animals.',
'Arcana':'Intelligence: recall lore about spells, magic items, magical traditions, and planar phenomena.',
'Athletics':'Strength: climbing, jumping, swimming, grappling-related physical contests, and other feats of force.',
'Deception':'Charisma: mislead others through words, disguises, and false impressions.',
'History':'Intelligence: recall past events, societies, conflicts, and historical lore.',
'Insight':'Wisdom: assess intentions, emotions, and whether someone may be concealing something.',
'Intimidation':'Charisma: influence someone through threats or imposing behavior.',
'Investigation':'Intelligence: reason from clues, search methodically, and deduce how things work.',
'Medicine':'Wisdom: assess injuries, stabilize people, and recall medical knowledge.',
'Nature':'Intelligence: recall lore about plants, animals, terrain, and natural cycles.',
'Perception':'Wisdom: notice creatures, sounds, movement, and other sensory details.',
'Performance':'Charisma: entertain or influence through music, acting, or other performance.',
'Persuasion':'Charisma: convince others through honest arguments and social influence.',
'Religion':'Intelligence: recall lore about deities, rites, faiths, and sacred symbols.',
'Sleight of Hand':'Dexterity: manipulate small objects subtly, palm items, and perform fine-handed tricks.',
'Stealth':'Dexterity: move or remain unnoticed when concealment and other conditions allow it.',
'Survival':'Wisdom: track creatures, navigate wilderness, forage, and identify environmental hazards.',
'Thieves Tools':'Tool proficiency: work with locks and traps using the appropriate equipment and checks.'
};
export function choiceExplanation(option:string,kind:string):string{
 if(kind==='skill'||kind==='expertise')return SKILL_DETAILS[option]??'A proficiency used for relevant ability checks.';
 if(kind==='fighting-style'||kind==='divine-order'||kind==='primal-order')return CHOICE_DETAILS[option]??'See the class feature for its full conditions.';
 if(kind==='weapon-mastery'){
  const weapon=ITEMS.find(item=>item.category==='weapon'&&item.name===option);
  if(!weapon)return 'Weapon mastery details unavailable for '+option+'.';
  const property=weapon.mastery;
  return property?property+' — '+(CHOICE_DETAILS[property]??'See the weapon mastery rules.'):'No mastery property listed.';
 }
 return CHOICE_DETAILS[option]??'Review this choice’s requirements and benefits.';
}
