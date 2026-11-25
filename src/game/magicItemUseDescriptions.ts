// Player-facing paraphrases. Family variants retain their catalog IDs for saved Wish Lists.
// Rules references: 2024 Basic Rules, Magic Items A–Z, and the 2024 DMG item entries.
const jug='Take a Magic action to name one liquid. Then take a Utilize action to uncork the jug and pour up to 2 gallons per minute. You can only produce the chosen liquid until dawn, and reaching its limit ends production for the day. The jug weighs 12 lb. whether full or empty.';
export const ALCHEMY_JUG_LIQUIDS = [
 ['Acid','8 ounces'],['Basic Poison','4 ounces'],['Beer','4 gallons'],['Honey','1 gallon'],
 ['Mayonnaise','2 gallons'],['Oil','1 quart'],['Vinegar','2 gallons'],['Fresh water','8 gallons'],
 ['Salt water','12 gallons'],['Wine','1 gallon'],
] as const;

const carpet = (capacity:number,speed:number) => `Use a Magic action and speak the command word to make the carpet fly. Direct it while within 30 feet. It carries ${capacity} lb. at ${speed} feet of Fly Speed, or up to ${capacity*2} lb. at half speed.`;
const colors:Record<string,string> = {
 Black:'Acid',Blue:'Lightning',Brass:'Fire',Bronze:'Lightning',Copper:'Acid',
 Gold:'Fire',Green:'Poison',Red:'Fire',Silver:'Cold',White:'Cold',
};
const bags:Record<string,string[]> = {
 Gray:['Weasel','Giant Rat','Badger','Boar','Panther','Giant Badger','Dire Wolf','Giant Elk'],
 Rust:['Rat','Owl','Mastiff','Goat','Giant Goat','Giant Boar','Lion','Brown Bear'],
 Tan:['Jackal','Ape','Baboon','Axe Beak','Black Bear','Giant Weasel','Giant Hyena','Tiger'],
};
const gemElement:Record<string,string> = {'Blue Sapphire':'Air',Emerald:'Water','Red Corundum':'Fire','Yellow Diamond':'Earth'};
const giantStrength:Record<string,number> = {Hill:21,Frost:23,Stone:23,Fire:25,Cloud:27,Storm:29};
const healing:Record<string,string> = {'Potion of Healing':'2d4 + 2','Potion of Greater Healing':'4d4 + 4','Potion of Superior Healing':'8d4 + 8','Potion of Supreme Healing':'10d4 + 20'};
const golems:Record<string,[number,string]> = {Clay:[30,'65,000'],Flesh:[60,'50,000'],Iron:[120,'100,000'],Stone:[90,'80,000']};
const horns:Record<string,[number,string]> = {Silver:[2,'No training required.'],Brass:[3,'Requires proficiency with all Simple weapons.'],Bronze:[4,'Requires training with all Medium armor.'],Iron:[5,'Requires proficiency with all Martial weapons.']};
const ioun:Record<string,string> = {
 Absorption:'As a Reaction, cancel a spell of level 4 or lower cast by a creature you can see. After canceling 20 total spell levels, the stone loses its magic.',
 'Greater Absorption':'As a Reaction, cancel a spell of level 8 or lower cast by a creature you can see. After canceling 20 total spell levels, the stone loses its magic.',
 Agility:'Gain +2 Dexterity, to a maximum of 20.',
 Awareness:'Gain Advantage on Initiative and Wisdom (Perception) checks.',
 Fortitude:'Gain +2 Constitution, to a maximum of 20.',
 Insight:'Gain +2 Wisdom, to a maximum of 20.',
 Intellect:'Gain +2 Intelligence, to a maximum of 20.',
 Leadership:'Gain +2 Charisma, to a maximum of 20.',
 Mastery:'Gain +1 to your Proficiency Bonus.',
 Protection:'Gain +1 Armor Class.',
 Regeneration:'Regain 15 HP at the end of each hour while you have at least 1 HP.',
 Reserve:'Store up to 4 total spell levels in the stone. A spellcaster can touch it when casting a level 1–4 spell to store that spell instead of producing its effect. You can cast a stored spell using its original caster’s spell statistics, which frees the space it used.',
 Strength:'Gain +2 Strength, to a maximum of 20.',
 Sustenance:'You can go without food and drink.',
};
const scrollStats = [[13,5],[13,5],[13,5],[15,7],[15,7],[17,9],[17,9],[18,10],[18,10],[19,11]];
const staffStats = [[13,5],[13,5],[13,5],[15,7],[15,7],[17,9],[17,9],[18,10],[18,10]];
const written:Record<string,string> = {
 'dmg24-alchemy-jug':jug,
 'dmg24-carpet-of-flying-3-ft-5-ft':carpet(200,80),
 'dmg24-carpet-of-flying-4-ft-6-ft':carpet(400,60),
 'dmg24-carpet-of-flying-5-ft-7-ft':carpet(600,40),
 'dmg24-carpet-of-flying-6-ft-9-ft':carpet(800,30),
 'dmg24-boots-of-false-tracks':'A Humanoid wearing the boots can choose to leave tracks like those of another kind of Humanoid of the same size.',
 'dmg24-cloak-of-billowing':'While you wear this cloak, use a Bonus Action to make it billow dramatically.',
 'dmg24-bead-of-nourishment':'Let the bead dissolve on your tongue for the nourishment of one day’s Rations. The bead is consumed.',
 'dmg24-cloak-of-invisibility':'Attune and wear the cloak. Raise its hood using a Magic action and spend 1 of its 3 charges to become Invisible for up to 1 hour. Lowering the hood takes no action and ends the effect, as does removing the cloak. It regains 1d3 charges at dawn.',
 'dmg24-elixir-of-health':'Drink this one-use potion to cure magical contagions and end the Blinded, Deafened, Paralyzed, and Poisoned conditions on yourself.',
 'dmg24-gloves-of-thievery':'Wear the gloves for +5 to Dexterity (Sleight of Hand) checks. They cannot be perceived while worn.',
 'dmg24-hat-of-many-spells':'Attune as a Wizard. While held, this hat works as a Wizard spellcasting focus. Casting through it requires a free hand to reach into the hat. To try an unknown Wizard spell, choose a spell you could cast with Material components costing no more than 1,000 GP. Spend a slot of that level and make a DC 10 + spell level Intelligence (Arcana) check. Success casts it with your stats and normal casting time, then locks this property until a Short or Long Rest. Failure triggers a roll on the item’s mishap table.',
 'dmg24-iron-bands-of-bilarro':'Use a Magic action to throw the sphere at a visible Huge or smaller creature within 60 feet. Make a ranged attack using Dexterity and proficiency. A hit Restrains the target until you release it with a command as a Bonus Action. A creature touching the bands can use an action and a DC 20 Strength (Athletics) check to destroy them and free the target. After a failure, the same creature cannot succeed for 24 hours. Recharge at dawn.',
 'dmg24-potion-of-invulnerability':'Drink as a Bonus Action for Resistance to all damage for 1 minute. One use.',
 'dmg24-potion-of-longevity':'Drink as a Bonus Action to reduce your physical age by 1d6 + 6 years, to a minimum age of 13. Each later dose adds a cumulative 10 percent chance that you instead age by the same amount.',
 'dmg24-potion-of-vitality':'Drink as a Bonus Action to remove all your Exhaustion and end Poisoned. For 24 hours, spending a Hit Point Die restores its maximum possible HP. One use.',
 'dmg24-quarterstaff-of-the-acrobat':'Attune for +2 to the staff’s attack and damage rolls. After rolling Initiative or as a Bonus Action, make it emit Dim Light for 10 feet. A Bonus Action also extinguishes the light or changes the staff into a 6-inch rod, a 10-foot pole, or back to a Quarterstaff, space permitting. The pole and Quarterstaff grant Advantage on Dexterity (Acrobatics) checks while held. The Quarterstaff can be thrown (30/120 feet) and returns immediately. Once per Short or Long Rest, use a Reaction while holding it in Quarterstaff form to add +5 AC against an attack that just hit you.',
 'dmg24-quiver-of-ehlonna':'Store up to 60 arrows or bolts, 18 javelin-sized objects, and 6 long objects like bows or spears in separate compartments. The quiver weighs no more than 2 lb. and items can be drawn as from a normal quiver or scabbard.',
 'dmg24-rod-of-resurrection':'Attune and hold the rod to cast Heal for 1 charge or Resurrection for 5. It has 5 charges and regains one at dawn. After spending the last, roll a d20. On a 1 the rod vanishes.',
 'dmg24-sending-stones':'Touch one stone to cast Sending to whoever carries its mate. If nobody carries it, you learn that and cast no spell. The pair shares one casting per dawn. Destroying one stone removes the magic from the other.',
 'dmg24-sentinel-shield':'Hold this Shield to gain Advantage on Initiative rolls and Wisdom (Perception) checks.',
 'dmg24-shield-of-the-cavalier':'Attune and hold the Shield for an extra +2 AC on top of its normal bonus. Once during your Attack action, you can bash a target within 5 feet with Strength and proficiency. A hit deals 2d6 + 2 + Strength modifier Force damage and can push a creature up to 10 feet away. A creature your size or smaller can also be knocked Prone. Once per dawn, when you or a visible ally within 5 feet is attacked or makes a save against an area effect, use a Reaction to create a fixed 5-foot protective field. It pushes partly enclosed creatures and objects outside and blocks the triggering effect inside. Nothing crosses it or damages across it while you concentrate, up to 1 minute.',
 'dmg24-thunderous-greatclub':'Attune to raise Strength to 20 if lower. The Greatclub adds 1d8 Thunder damage to hits on creatures or 3d8 to hits on objects that are neither worn nor carried. A Magic action striking a hard surface makes a clap audible 300 feet away and a 30-foot Cone. Creatures must pass a DC 15 Strength save or fall Prone, and exposed nonmagical objects take 3d8 Thunder. Once per dawn, you can instead strike the ground as a Magic action to cause an earthquake within 50 feet. Grounded creatures must pass a DC 20 Dexterity save or fall Prone, and those concentrating need a DC 20 Constitution save to maintain it. Grounded structures take 50 Bludgeoning damage. You can open a 30-foot-deep, 10-foot-wide fissure in the area, collapsing structures on it. Its occupants fall in unless they pass a DC 20 Dexterity save to move to the edge.',
 'dmg24-bead-of-refreshment':'Dissolve the bead in up to a pint of liquid to turn that amount into cold drinking water. It does nothing to magical liquids or harmful substances.',
 'dmg24-candle-of-the-deep':'Light it like an ordinary candle. It provides the usual light and heat, and submerging it leaves the flame burning.',
 'dmg24-cap-of-water-breathing':'Wear the cap underwater and use a Magic action to surround your head with breathable air. The bubble lasts until you remove the cap or leave the water.',
 'dmg24-charlatan-s-die':'When you roll this six-sided die, you can choose the result.',
 'dmg24-cloak-of-many-fashions':'Use a Bonus Action while wearing the cloak to alter its style, color, and apparent quality. Its weight stays the same, and copying another cloak’s look grants none of its powers.',
 'dmg24-clockwork-amulet':'Wear the amulet. Once per dawn, when you make an attack, you can use a natural 10 in place of rolling the d20 and then apply your normal modifiers.',
 'dmg24-clothes-of-mending':'Wear the outfit normally. It repairs ordinary wear and tear on its own, but destroyed pieces stay destroyed.',
 'dmg24-dark-shard-amulet':'Attune as a Warlock and wear the amulet as a focus for your Warlock spells. Once per Long Rest, use a Magic action and pass a DC 10 Intelligence (Arcana) check to cast an unknown Warlock cantrip with an action casting time. A failure still spends the action and use.',
 'dmg24-dread-helm':'Wear the helm to cast your face into shadow and make your eyes glow red. This is a visual effect.',
 'dmg24-driftglobe':'Command the globe from within 60 feet to shine like Light or Daylight. Daylight can be used once per dawn. While it shines, a Magic action can make it hover up to 5 feet high. It follows to stay within 60 feet until grasped. If it cannot follow, it sinks and goes dark.',
 'dmg24-ear-horn-of-hearing':'Hold the horn to your ear to suppress the effects of Deafened on yourself while you hold it there.',
 'dmg24-enduring-spellbook':'Record spells as in an ordinary spellbook. The book and its writing withstand fire, water, and aging.',
 'dmg24-ersatz-eye':'Use a Magic action to insert or remove the prosthetic eye. Once seated in the socket, it restores ordinary sight through that eye. It cannot be removed against your will while you are alive.',
 'dmg24-hag-eye':'Wear or hold the eye and spend 1 of its 3 charges to cast Darkvision on yourself or See Invisibility. It refills at dawn. The coven that created it can also see through it from the same plane using a Magic action and Concentration.',
 'dmg24-hat-of-vermin':'Hold the hat and use a Magic action and 1 of its 3 charges to produce a Bat, Frog, or Rat. It is uncontrolled, tries to flee, and disappears after 1 hour or at 0 HP. All charges return at dawn.',
 'dmg24-hat-of-wizardry':'Attune as a Wizard and wear the hat as a focus for Wizard spells. Once per Long Rest, use a Magic action and pass a DC 10 Intelligence (Arcana) check to cast an unknown Wizard cantrip with an action casting time. Failure still spends the action and use.',
 'dmg24-heward-s-handy-spice-pouch':'Hold the pouch and spend 1 of its 10 charges as a Magic action to produce a pinch of a nonmagical seasoning you name. One pinch seasons one meal. It regains 1d6 + 4 charges at dawn.',
 'dmg24-horn-of-silent-alarm':'Blow the horn with a Magic action and spend 1 charge so only one creature you choose within 600 feet hears it. It holds 4 charges and regains 1d4 at dawn.',
 'dmg24-instrument-of-illusions':'While playing, use a Magic action to create harmless, openly illusory visuals within 5 feet of the instrument, or 15 feet if you are a Bard. They have no sound or substance and stop when you stop playing.',
 'dmg24-instrument-of-scribing':'While playing, spend 1 charge as a Magic action to write up to six words in a language you know on a visible nonmagical surface within 30 feet. A Bard can add seven more words and make the message glow in darkness. The message lasts 24 hours or until dispelled. All 3 charges return at dawn.',
 'dmg24-lock-of-trickery':'Use it like a normal lock with its key. Dexterity checks to pick it have Disadvantage.',
 'dmg24-mystery-key':'Insert the key into a lock. It has a 5 percent chance of opening it, and disappears the first time it succeeds.',
 'dmg24-nature-s-mantle':'Attune as a Druid or Ranger and wear the cloak as a focus for your spells from those classes. In a Lightly Obscured area, you can Hide as a Bonus Action even while being watched.',
 'dmg24-orb-of-direction':'Use it as an Arcane Focus. While holding it, a Magic action tells you which way is magnetic north, if the location has one.',
 'dmg24-orb-of-time':'Use it as an Arcane Focus. While holding it on the Material Plane, a Magic action tells you whether it is morning, afternoon, evening, or night.',
 'dmg24-perfume-of-bewitching':'Apply the single dose to yourself with a Magic action. For 1 hour, you have Advantage on Charisma (Deception or Persuasion) checks to influence creatures within 5 feet.',
 'dmg24-pipe-of-smoke-monsters':'While smoking this pipe, use a Magic action to exhale smoke shaped like a creature small enough to fit in a 1-foot Cube. The shape lasts only a few seconds.',
 'dmg24-pole-of-angling':'Hold the pole and use a Magic action to turn it into a fishing pole with a hook, line, and reel, or change it back.',
 'dmg24-pole-of-collapsing':'While held, use a Magic action to collapse the pole into a 1-foot rod at the same weight or to extend it again. It extends only as far as the available space permits.',
 'dmg24-potion-of-comprehension':'Drink to gain the Comprehend Languages spell effect for 1 hour. The potion is spent.',
 'dmg24-potion-of-fire-breath':'Within 1 hour after drinking, use a Bonus Action to breathe fire at a target within 30 feet. A DC 13 Dexterity save halves the 4d6 Fire damage. The effect ends after three breaths or after 1 hour.',
 'dmg24-potion-of-greater-invisibility':'Drink to gain the Invisible condition for 1 hour. The potion is spent.',
 'dmg24-potion-of-pugilism':'Drink for 10 minutes of extra damage. Each hit with an Unarmed Strike adds 1d6 Force damage.',
 'dmg24-prosthetic-limb':'Attach it to replace a lost limb and use it as the original. A Magic action detaches or reattaches it. It cannot be taken off against your will while you are alive.',
 'dmg24-rival-coin':'Once per dawn, use a Magic action to toss the coin and roll any die. On an even result, choose a visible creature within 60 feet. A DC 13 Wisdom save halves the 2d4 Psychic damage and prevents Disadvantage on its next attack before its next turn ends. On an odd result you take 1d4 Psychic damage.',
 'dmg24-rope-of-mending':'Use a Magic action to reconnect cut pieces of this 50-foot rope that touch and are out of use. Lost or destroyed sections stay missing.',
 'dmg24-ruby-of-the-war-mage':'Attune as a spellcaster. Press the ruby to a Simple or Martial weapon for at least 10 minutes to make the weapon your spellcasting focus. The ruby detaches as a Magic action, when the weapon is destroyed, or when attunement ends.',
 'dmg24-saddle-of-the-cavalier':'While seated in the saddle, attacks against your mount have Disadvantage. While conscious, you cannot be dismounted against your will.',
 'dmg24-shield-of-expression':'While bearing this Shield, use a Bonus Action to change the expression of the face on its front.',
 'dmg24-staff-of-adornment':'Hold the staff and place up to three Tiny objects above its tip, each at most 1 lb. They hover an inch above it and can be made to rotate. Each stops hovering when removed or when you give up possession of the staff.',
 'dmg24-staff-of-birdcalls':'Use a Magic action while holding the staff and spend 1 of its 10 charges to mimic a finch, raven, duck, chicken, goose, loon, turkey, gull, owl, or eagle, audible for 120 feet. It regains 1d6 + 4 charges at dawn. After spending the last charge, a 1 on a d20 destroys it.',
 'dmg24-staff-of-flowers':'Hold the staff and use a Magic action and 1 of its 10 charges to grow an ordinary harmless flower from soil within 5 feet or from the staff. Choose a flower or get a daisy. It regains 1d6 + 4 charges at dawn. After spending the last charge, a 1 on a d20 destroys it.',
 'dmg24-stone-of-good-luck':'Attune and carry the stone for +1 on ability checks and saving throws.',
 'dmg24-heward-s-handy-haversack':'The pack weighs 5 lb. Its central compartment holds up to 500 lb. or 64 cubic feet, and each side compartment up to 200 lb. or 25 cubic feet. Retrieve an item with a Bonus Action or Utilize action. The wanted object moves to the top. Overloading or damaging a pouch ruins the pack and loses its contents. Each pouch holds 10 minutes of air divided among breathing creatures inside. Keep it out of other extradimensional storage to avoid an Astral Plane gate.',
 'dmg24-keoghtom-s-ointment':'Use a Utilize action to swallow a dose or apply it to a creature within 5 feet. The recipient regains 2d8 + 2 HP and stops being Poisoned. A jar contains 1d4 + 1 doses.',
 'dmg24-cube-of-summoning':'Wind the crank as a Magic action to summon into the closest unoccupied space. Roll 1d6 for the spell: 1 Summon Aberration, 2 Summon Beast, 3 Summon Construct, 4 Summon Dragon, 5 Summon Elemental, 6 Summon Fey. It casts at level 5 with DC 17 and +9 spell attack, without Concentration. It recharges at dawn.',
 'dmg24-cauldron-of-rebirth':'Use the cauldron as a spellcasting focus or Scrying component. After a Long Rest you can brew a Greater Healing Potion in 1 minute, which expires after 24 hours. With a Magic action, grow the pot enough to fit a crouching Medium creature or shrink it again. Leave a Humanoid corpse covered by 200 lb. of salt for at least 8 hours to raise it as with Raise Dead at the next dawn. The salt is consumed and this property recharges after 7 days.',
 'dmg24-apparatus-of-kwalish':'Find the barrel’s concealed hatch with a DC 20 Intelligence (Investigation) check. Up to two Medium or smaller creatures fit inside, and one pilots using the ten levers. The vehicle has AC 20 and 200 HP. It walks or swims 30 feet with its legs extended, and can dive to 900 feet. The closed cabin supplies 10 hours of air divided among its occupants. See the lever table for movement, claws, lights, and the hatch.',
 'dmg24-axe-of-the-dwarvish-lords':'Attune to this +3 Battleaxe. A natural 20 on a creature adds 20 Slashing damage. Throw it 20/60 feet for an extra 1d8 Force on a hit, or 2d8 against a Giant. It returns after the roll. Attunement grants 60 feet of Darkvision or adds 60 feet to existing Darkvision, +2 Constitution to a maximum of 20, Poison Immunity, Fire Resistance, and proficiency with Brewer’s Supplies, Mason’s Tools, and Smith’s Tools. Hits on objects deal maximum damage. A Magic action can summon a friendly Earth Elemental within 30 feet. See the full entry for the summoning limits and artifact properties.',
 'dmg24-baba-yaga-s-dancing-broom':'Hold the broom and use a Magic action to animate it in the nearest empty space. It acts immediately after you. While you are conscious enough to act and within 30 feet, give it mental orders on your turn without spending an action. A Bonus Action and command word turn it back and restore its HP. At 0 HP it is destroyed.',
 'dmg24-blackrazor':'Attune to a +3 Greatsword. Holding it grants 30-foot Blindsight and immunity to Charmed and Frightened. Hitting Undead harms you for 1d10 Necrotic and heals them for 1d10. Reducing most other creatures to 0 HP consumes their soul and gives you temporary HP equal to their HP maximum. Only Wish can restore a victim. Consult the full entry for its Haste, sentience, and hunger.',
 'dmg24-book-of-exalted-deeds':'Attune to open the clasp, then study it for 80 hours to unlock its benefits. The book can raise Wisdom, improve some divine spellcasting, and grant a protective halo. It has random artifact properties and can take away its benefits if you abandon its ideals. Use the full entry to resolve eligibility, each benefit, and when the book vanishes.',
 'dmg24-book-of-vile-darkness':'When a creature other than a Fiend or Undead attunes, a failed DC 17 Charisma save turns it into a Larva under the DM’s control. Only Wish can reverse that. Study the book for 80 hours to unlock its powers. It raises one ability by 2 (maximum 24), lowers another by 2 (minimum 3), and grants immunity to Exhaustion while carried. See the full entry for its spells, other powers, and the consequences of losing attunement or dying while attuned.',
 'dmg24-daern-s-instant-fortress':'Place the statuette on the ground and speak its command word as a Magic action. It becomes a two-story adamantine tower 20 feet wide and 30 feet tall. Creatures and loose objects in its footprint are pushed immediately outside. Open its door by command as a Bonus Action. Speak the command word again to shrink the tower once empty. See the full rules for damage and repairs.',
 'dmg24-deck-of-many-things':'Declare how many cards you will draw, then draw randomly no more than an hour apart. Each card takes effect immediately. If you stop before reaching your declared total, the remaining cards take effect together. Extra draws have no effect. Cards normally return after being drawn, except the Fool and Jester. Use the full 13-card or 22-card table to resolve each draw.',
 'dmg24-demonomicon-of-iggwilv':'Attune to the book. Consult it for Advantage on Intelligence checks about demons and Wisdom (Survival) checks about the Abyss. It also has artifact properties, spellcasting, and ten pages that can imprison Fiends. Consult the full entry before capturing or releasing a creature or using its spells.',
 'dmg24-eye-of-vecna':'Attune by placing the eye in an empty socket. It fuses in place, and removing it kills you. It grants Truesight and charge-based spellcasting with a risk to your soul. If paired with the Hand of Vecna, it unlocks additional powers. Consult the full entry before casting or combining the artifacts.',
 'dmg24-hand-of-vecna':'Attune by joining the artifact to the stump of your left hand. It fuses in place, and removing it kills you. It grants a minimum Strength score and extra Cold damage on certain melee hits, plus charge-based spells with a risk of magical compulsion. Paired with the Eye of Vecna, it unlocks further powers.',
 'dmg24-lute-of-thunderous-thumping':'Use the lute as a magic Club. Each hit adds 2d8 Thunder damage. A Bard who sings or hums while making a melee attack can use Charisma in place of Strength for that attack roll.',
 'dmg24-nolzur-s-marvelous-pigments':'Spend one of the 1d4 pots and paint for 10 minutes while staying and concentrating inside a 20-foot Cube. The painted objects and terrain become real when finished. A pot creates up to 500 GP in total value and at most 25 GP per object. Breaking Concentration or leaving wastes the pot. Painted energy cannot harm anyone.',
 'dmg24-orb-of-dragonkind':'Attune to the orb to use its charge-based spells and call nearby dragons. Controlling the orb carries a risk that the dragon spirit inside controls you instead. Use the full artifact rules for the control check, spells, charges, and the reach and consequences of the call.',
 'dmg24-pot-of-awakening':'Plant a normal shrub in the pot and let it grow for 30 days. It becomes a Friendly Awakened Shrub that follows your orders and waits when given none. Its roots break the pot.',
 'dmg24-spirit-board':'Rest the planchette on the lettered side and touch it for 1 minute to cast Augury for 1 charge or Commune for 3. The board holds 3 charges and restores one at dawn.',
 'dmg24-staff-of-the-adder':'Use a Bonus Action to animate the snake head for 1 minute or to revert it. During the Attack action you can make one attack with the head at 5-foot reach using Wisdom plus proficiency. A hit deals 1d6 Piercing and 3d6 Poison damage. The head has AC 15, 20 HP, and Poison and Psychic Immunity. At 0 HP the staff is destroyed. Otherwise, reverting restores its HP.',
 'dmg24-sword-of-answering':'Attune to this +3 weapon. If a creature within your reach damages you while you hold the sword, use a Reaction to make a melee attack against it with Advantage. Damage from that counterattack bypasses Resistance and Immunity.',
 'dmg24-sword-of-kas':'Attune to a +3 sword that scores Critical Hits on 19 or 20 and adds 2d10 Slashing damage against Undead. If drawn for a minute without tasting blood, make a DC 15 Charisma save. Success deals 3d6 Psychic damage to you, and failure lets the sword control you until it tastes blood. Check the full artifact entry for its spells and additional properties.',
 'dmg24-talking-doll':'Attune to the doll. Spend a Short Rest with it within 5 feet to assign up to six phrases of at most six words each, plus a trigger for each phrase. Triggers must occur within 5 feet of the doll. You can replace phrases, and all are lost when attunement ends.',
 'dmg24-tankard-of-sobriety':'Drink ordinary alcoholic beverages from the tankard without becoming inebriated. It does nothing to magical drinks or harmful substances.',
 'dmg24-tentacle-rod':'Hold it and use a Magic action for three separate +9 melee attacks on visible targets within 15 feet, dealing 1d6 Psychic per hit. If all three hit one creature, a failed DC 15 Dexterity save Restrains it and deals 3d6 Psychic at the start of its turns. It saves again at each turn’s end. The effect also ends if it leaves range, you become Incapacitated, or you release it as a Bonus Action.',
 'dmg24-tome-of-the-stilled-tongue':'Attune as a Wizard and use the tome as a spellbook and Arcane Focus. Once per dawn, hold it and use a Bonus Action to cast a spell written in it without a slot or Verbal or Somatic components. Removing the tongue erases its spells. Vecna can watch the user and leave messages.',
 'dmg24-veteran-s-cane':'Hold the item and use a Bonus Action to switch between a cane and an ordinary Longsword.',
 'dmg24-wand-of-conducting':'Hold the wand and use a Magic action to spend 1 of its 3 charges. Waving it creates orchestral music audible for 120 feet. The music stops when you stop waving. All charges return at dawn. Spending the final charge destroys the wand on a d20 roll of 1.',
 'dmg24-wand-of-orcus':'Attunement is dangerous. A creature other than Orcus takes 10d6 Necrotic damage on a successful DC 17 Constitution save, or dies and rises as a Zombie if Humanoid on a failure. Wield it as a +3 Mace that adds 2d12 Necrotic damage. It destroys Holy Water within 10 feet. See the full artifact rules for its spells, charges, and Undead summoning.',
 'dmg24-wand-of-pyrotechnics':'Use a Magic action and 1 of 7 charges to make a harmless, torch-bright flash at a visible point within 120 feet. It lasts a second and can be heard for 300 feet. It regains 1d6 + 1 charges at dawn. Spending the final charge destroys the wand on a d20 roll of 1.',
 'dmg24-wave':'Attune to this +3 trident. A natural 20 adds 21 Necrotic damage. Holding it grants Advantage on Initiative and underwater breathing. Carrying it lets you spend 1 of 3 charges to cast Dominate Beast (DC 20) on a Beast with a Swim Speed. It regains 1d3 charges at dawn. While holding it, cast Globe of Invulnerability at level 9 once per dawn. Consult its full entry for attunement and sentience.',
 'dmg24-whelm':'Attune to a +3 Warhammer that can be thrown 60/180 feet and returns after the roll. A thrown hit adds 1d8 Force, or 4d8 against a Construct, Elemental, or Giant. Once per dawn, strike the ground as a Magic action and choose grounded creatures within 60 feet. A failed DC 20 Constitution save Stuns for up to 1 minute, with repeat saves at each turn’s end. See the full entry for its sensing powers and sentience.',
 'bag-of-holding':'The five-pound bag stores up to 500 pounds or 64 cubic feet. Retrieve an item with a Utilize action. Turning the bag inside out spills the contents safely. Air inside lasts 10 minutes divided among breathing creatures. Overloading, piercing, or tearing the bag destroys it and sends the contents to the Astral Plane. Putting it inside another extradimensional container destroys both and opens a one-way Astral Plane gate that pulls in creatures within 10 feet before closing.',
 'adamantine-armor':'Wear this as medium or heavy armor, excluding Hide. A Critical Hit against you becomes a normal hit while you wear it.',
};

const bardSpells:Record<string,string> = {
 'Anstruth Harp':'Cure Wounds (level 5), Ice Storm, Wall of Thorns',
 'Canaith Mandolin':'Cure Wounds (level 3), Dispel Magic, Protection from Energy (Lightning only)',
 'Cli Lyre':'Stone Shape, Wall of Fire, Wind Wall',
 'Doss Lute':'Animal Friendship, Protection from Energy (Fire only), Protection from Poison',
 'Fochlucan Bandore':'Entangle, Faerie Fire, Shillelagh, Speak with Animals',
 'Mac-Fuirmidh Cittern':'Barkskin, Cure Wounds, Fog Cloud',
 'Ollamh Harp':'Confusion, Control Weather, Fire Storm',
};
const elementalRings:Record<string,string> = {
 Air:'Speak Auran, resist Lightning, and fly at your Speed with hover. Spells: Feather Fall (0), Wind Wall (1), Gust of Wind (2), Chain Lightning (3).',
 Earth:'Speak Terran and resist Acid. Rubble, rock, and dirt do not slow you. You can pass through solid earth or rock as Difficult Terrain without disturbing it. If you stop inside, you return to the nearest unoccupied space you last occupied. Spells: Stone Shape (2), Stoneskin (3), Wall of Stone (3), Earthquake (5).',
 Fire:'Speak Ignan and gain Fire Immunity. Spells: Burning Hands (1), Fireball (2), Wall of Fire (3), Fire Storm (4).',
 Water:'Speak Aquan, swim at 60 feet, and breathe underwater. Spells: Create or Destroy Water (1), Ice Storm (2), Water Walk (2), Wall of Ice (3), Tsunami (5).',
};
const figurines:Record<string,string> = {
 'Bronze Griffon':'Summons a Griffon for up to 6 hours. Recharges after 5 days.',
 'Ebony Fly':'Summons a ridable Giant Fly for up to 12 hours. It has 30 feet of Speed and 60 feet of Fly Speed. Recharges after 2 days.',
 'Golden Lions':'Use one or both figurines together. Each turns into a Lion for up to 1 hour and recharges separately after 7 days.',
 'Ivory Goats':'Traveling uses 1 of 24 charges per hour or part of an hour as a Large goat with Riding Horse statistics. At 0 charges it reverts and fully recharges in 7 days. Travail becomes a Giant Goat for 3 hours and recharges in 30 days. Terror becomes a Giant Goat for 3 hours, cannot attack, and recharges in 15 days. A Magic action removes one Terror horn, yielding a +1 Lance or +2 Longsword until the goat reverts. While you ride Terror, hostile creatures starting their turns within 30 feet must pass a DC 15 Wisdom save or become Frightened for up to 1 minute. They repeat the save each turn’s end. Success gives 24-hour immunity. The fear also ends when you dismount or the goat reverts.',
 'Marble Elephant':'Summons an Elephant for up to 24 hours. Recharges after 7 days.',
 'Obsidian Steed':'Summons a Nightmare for up to 24 hours. It fights only in self-defense and has a 10 percent chance to ignore commands each use. If you mount a disobedient Nightmare, both of you go to Hades, where it reverts. Recharges after 5 days.',
 'Onyx Dog':'Summons a Mastiff for up to 6 hours. It has Intelligence 8, speaks Common, and has Blindsight out to 60 feet. Recharges after 7 days.',
 'Serpentine Owl':'Summons a Giant Owl for up to 8 hours. It can communicate telepathically with you anywhere on the same plane. Recharges after 2 days.',
 'Silver Raven':'Summons a Raven for up to 12 hours, on which you can cast Animal Messenger. Recharges after 2 days.',
};
const feathers:Record<string,string> = {
 Anchor:'Use a Magic action to touch a vessel with the token. The vessel is immobile for 24 hours or until you touch it with the token again. The token then disappears.',
 Bird:'Use a Magic action to toss the token 5 feet upward and summon a Roc that cannot attack. It follows simple commands and flies at 16 mph carrying up to 500 pounds, or half speed with up to 1,000 pounds. It needs an hour of rest per 3 hours of flight and can fly up to 144 miles per day. It disappears after its daily flight limit, at 0 HP, or when dismissed with a Magic action.',
 Fan:'While aboard a vessel, use a Magic action to toss the token up to 10 feet upward. The resulting floating fan adds 5 mph to one ship’s sailing speed for 8 hours. Dismiss it early with a Magic action.',
 'Swan Boat':'Use a Magic action to touch water at least 60 feet across. A 50-by-20-foot boat appears and can travel at 6 mph. While aboard, use a Magic action to direct it or turn it up to 90 degrees. It vanishes after 24 hours or when dismissed with a Magic action.',
 Tree:'Outdoors, use a Magic action to touch a vacant spot on the ground. The token becomes a permanent, nonmagical oak 60 feet tall, with a 5-foot-wide trunk and a crown extending 20 feet in every direction.',
 Whip:'Use a Magic action to throw the token to a point within 10 feet. Use a Bonus Action to make a +9 melee spell attack against a creature within 10 feet of the floating whip for 1d6 + 5 Force damage. A subsequent Bonus Action can move it up to 20 feet and repeat the attack. It lasts up to 1 hour, ends if you die or become Incapacitated, and can be dismissed with a Magic action.',
};

export function magicItemUseDescription(item:{id:string;name:string}):string|undefined {
 const {id,name}=item;
 const direct=written[id];
 if(direct)return direct;
 const bonus=/^\+([123]) (Wraps of Unarmed Power|Wand of the War Mage|Rod of the Pact Keeper)$/.exec(name);
 if(bonus){
  const [,n,family]=bonus;
  if(family==='Wraps of Unarmed Power')return `Wear the wraps for +${n} to Unarmed Strike attack and damage rolls. On a damaging strike, choose Force damage or the strike’s usual damage type.`;
  if(family==='Wand of the War Mage')return `Attune as a spellcaster. Hold the wand for +${n} to spell attack rolls and ignore Half Cover when making a spell attack.`;
  return `Attune as a Warlock and hold the rod for +${n} to your Warlock spell attack rolls and save DC. Use a Magic action to recover one Warlock spell slot. The recovery recharges after a Long Rest.`;
 }
 const color=name.replace(' Dragon Scale Mail','');
 if(color!==name&&Object.hasOwn(colors,color))return `While attuned and wearing this scale mail, gain +1 Armor Class, ${colors[color]} Resistance, and Advantage on saving throws against Dragons’ breath weapons. Once per dawn, a Magic action reveals the distance and direction to the nearest ${color.toLowerCase()} dragon within 30 miles.`;
 const bagColor=name.replace('Bag of Tricks, ','');
 if(Object.hasOwn(bags,bagColor))return `Use a Magic action to pull out a fuzzy object and throw it up to 20 feet. Roll 1d8 to summon a friendly creature: ${bags[bagColor].map((animal,index)=>`${index+1} ${animal}`).join(', ')}. It acts immediately after you, follows movement and action commands given as a Bonus Action, and vanishes at dawn or at 0 HP. Draw up to three objects per dawn.`;
 const gem=name.replace('Elemental Gem, ','');
 if(Object.hasOwn(gemElement,gem))return `Use a Utilize action to break the gem and summon a ${gemElement[gem]} Elemental in the nearest unoccupied space. It understands your languages, follows your orders, and acts immediately after you. It disappears after 1 hour, if killed, or if you dismiss it as a Bonus Action. The gem’s magic is spent.`;
 const strength=/^(Belt|Potion) of (\w+) Giant Strength$/.exec(name);
 if(strength&&Object.hasOwn(giantStrength,strength[2])){
  const score=giantStrength[strength[2]];
  return strength[1]==='Belt'? `While attuned and wearing the belt, your Strength becomes ${score} if it was lower.`:`Drink as a Bonus Action to set your Strength to ${score} for 1 hour. A Strength score of ${score} or more is unaffected. The potion is single-use.`;
 }
 if(Object.hasOwn(healing,name))return `Drink this potion or administer it to a creature within 5 feet as a Bonus Action. The drinker regains ${healing[name]} Hit Points, up to their maximum. One use.`;
 const resistance=/^(Potion|Ring) of (\w+) Resistance$/.exec(name);
 if(resistance)return resistance[1]==='Potion'? `Drink as a Bonus Action to gain Resistance to ${resistance[2]} damage for 1 hour. One use.`:`While attuned and wearing the ring, you have Resistance to ${resistance[2]} damage.`;
 const golem=/^Manual of (\w+) Golems$/.exec(name);
 if(golem&&Object.hasOwn(golems,golem[1])){
  const [days,cost]=golems[golem[1]];
  return `To use this manual, be a spellcaster with at least two level 5 spell slots. A reader who fails that requirement takes 6d6 Psychic damage. Build the ${golem[1].toLowerCase()} golem with ${cost} GP of supplies and ${days} consecutive days of work, resting at most 8 hours per day. The finished manual burns, and its ashes animate the golem under your control.`;
 }
 const horn=name.replace('Horn of Valhalla, ','');
 if(Object.hasOwn(horns,horn)){
  const [count,requirement]=horns[horn];
  return `A Magic action to blow the horn calls ${count} Berserker spirits into empty spaces within 60 feet. They last for 1 hour or until reduced to 0 HP, and are immune to Charmed and Frightened. ${requirement} They follow your commands if you qualify, or attack you otherwise. The horn recharges after 7 days.`;
 }
 const stone=name.replace('Ioun Stone, ','');
 if(Object.hasOwn(ioun,stone))return `After attuning, toss the stone with a Magic action to start its orbit and gain its effect. You can have up to three in orbit, and reclaim them with a Utilize action. ${ioun[stone]}`;
 const level=/^(Spell Scroll|Enspelled Staff) \((Cantrip|Level (\d))\)$/.exec(name);
 if(level){
  const n=Number(level[3]??0), spell=n===0?'cantrip':`level ${n} spell`;
  if(level[1]==='Enspelled Staff'&&staffStats[n]){
   const [dc,attack]=staffStats[n];
   return `Attune as a spellcaster. While holding the staff, spend 1 of its 6 charges to cast its bound ${spell} (save DC ${dc}, spell attack +${attack}). It regains 1d6 charges at dawn. After spending the final charge, a 1 on a d20 turns it into an ordinary Quarterstaff.`;
  }
  const [dc,attack]=scrollStats[n];
  return `Cast the written ${spell} if it is on your spell list. Use its normal casting time without Material components (save DC ${dc}, spell attack +${attack}). If it is above your usual casting level, pass a DC ${10+n} spellcasting ability check or lose the spell. Completed casting consumes the scroll, while interruption preserves it. A Wizard copying it into a spellbook needs a DC ${10+n} Intelligence (Arcana) check, which consumes the scroll either way.`;
 }
 const instrument=name.replace('Instrument of the Bards, ','');
 if(Object.hasOwn(bardSpells,instrument))return `Attune as a Bard. Play it to cast Fly, Invisibility, Levitate, Protection from Evil and Good, or one of its own spells: ${bardSpells[instrument]}. Each spell recharges separately at dawn and uses your spellcasting ability and save DC. A player without attunement must pass a DC 15 Wisdom save or take 2d4 Psychic damage when attempting to play it.`;
 const ring=/^Ring of Elemental Command \((\w+)\)$/.exec(name);
 if(ring&&Object.hasOwn(elementalRings,ring[1]))return `While attuned and wearing the ring, you have Advantage on attacks against Elementals, and they have Disadvantage on attacks against you. As a Magic action, force a visible Elemental within 60 feet to make a DC 18 Wisdom save. On failure it is Charmed until the start of your next turn, and you choose its move and action on its next turn. The ring has 5 spell charges, restores 1d4 + 1 at dawn, and uses save DC 18. ${elementalRings[ring[1]]}`;
 const figurine=name.replace('Figurine of Wondrous Power, ','');
 if(Object.hasOwn(figurines,figurine))return `Use a Magic action to throw the figurine onto unoccupied ground within 60 feet with room for the creature. It is Friendly, follows your orders, and acts directly after you. It reverts when time runs out, it reaches 0 HP, or you touch it and use a Magic action to end the effect. ${figurines[figurine]}`;
 const feather=name.replace(/^Quaal.s Feather Token, /,'');
 if(Object.hasOwn(feathers,feather))return `Single use. ${feathers[feather]}`;
 const protection=/^Scroll of Protection \((.+)\)$/.exec(name);
 if(protection)return `Read with a Magic action to create a 5-foot Emanation for 5 minutes. ${protection[1]} cannot enter it or affect anything inside. Moving the area onto one ends the effect. Affected creatures within 5 feet of the area can use a Magic action to attempt a DC 15 Charisma save. Success lets that creature ignore the ward.`;
 const titan=/^Scroll of Titan Summoning \((.+)\)$/.exec(name);
 if(titan)return `Read with a Magic action to summon a hostile ${titan[1]} into a visible empty space on land or in water within 1 mile. It treats everyone else as hostile and disappears at 0 HP. Too little room wastes the scroll.${titan[1]==='Kraken'?' The Kraken needs a body of water large enough to fit it.':''}`;
}


// These items rely on tables, random properties, or multi-part rules that the overview does not reproduce.
const extendedRulesById:Record<string,string> = Object.fromEntries([
 'Apparatus of Kwalish','Axe of the Dwarvish Lords','Blackrazor','Book of Exalted Deeds','Book of Vile Darkness',
 'Daern’s Instant Fortress','Deck of Many Things','Demonomicon of Iggwilv','Eye of Vecna','Hag Eye','Hand of Vecna',
 'Hat of Many Spells','Orb of Dragonkind','Sword of Kas','Wand of Orcus','Wave','Whelm',
].map(name=>['dmg24-'+name.toLowerCase().replace(/[’ ]/g,'-'), 'https://roll20.net/compendium/dnd5e/Items%3A'+encodeURIComponent(name.replaceAll('’',"'")).replaceAll("'",'%27')+'?expansion=33359']));
const basicRulesAnchors:Record<string,string> = {
 'dmg24-deck-of-many-things':'DeckofManyThings',
 'dmg24-hat-of-many-spells':'HatofManySpells',
 'dmg24-apparatus-of-kwalish':'ApparatusofKwalish',
 'dmg24-orb-of-dragonkind':'OrbofDragonkind',
};
export function magicItemExtendedRules(id:string):string|undefined {
 const anchor=basicRulesAnchors[id];
 return anchor?'https://www.dndbeyond.com/sources/dnd/br-2024/magic-items-a-z#'+anchor:extendedRulesById[id];
}
