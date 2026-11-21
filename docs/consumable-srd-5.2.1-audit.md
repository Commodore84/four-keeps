# SRD 5.2.1 adventuring-equipment consumables audit

Source: [SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), Equipment / Adventuring Gear; names, weights, prices and IDs cross-checked against src/game/officialEquipment2024-part*.ts. Mechanics are independently paraphrased; no non-SRD content.

Catalog includes 182 named equipment records across all categories, including armor, weapons, tools, and gear. Not every item is consumable. The inventory below lists the 89 gear records and their variants. This audit groups reusable entries separately from effects that draw down, deploy, coat or burn a supply.

| Item | SRD rule category | Required authoritative support | Status |
|---|---|---|---|
| Acid | Attack replacement; Dexterity save; 2d6 Acid on failed save | Throw range, enemy save, damage and attack replacement | Supported against tracked creatures in unified combat for imported level 1–4 characters, with DM-verified save and damage rolls. DM-registered objects without ability scores are also supported. Higher levels are deferred. |
| Alchemist’s Fire | Attack replacement; Dexterity save; Fire damage and Burning | Burning lifecycle, damage timing and extinguish | Supported for tracked creatures in imported level 1–4 unified encounters, including turn-start damage and extinguishing. Object targets remain deferred. |
| Antitoxin | Bonus Action; self; 1 hour; advantage on saves to avoid/end Poisoned | Owned vial, turn Bonus Action, save context, elapsed time | Encounter adjudication supports avoiding and ending Poisoned, and recorded elapsed time governs expiry |
| Ball Bearings | Utilize; area hazard; Dexterity save and Prone | Persistent terrain hazard and movement entry | Supports confirmed deployment and verified Dexterity saves on normal grid movement. Recovery after combat takes ten minutes with DM-confirmed access. DM-verified forced steps use the same entry checks and per-creature tracking. Legacy combat and automatic special-attack movement remain separate. |
| Caltrops | Utilize; area hazard; movement and Dexterity save | Persistent terrain hazard and movement entry | Supports confirmed deployment and verified Dexterity saves on normal grid movement. Recovery after combat takes ten minutes with DM-confirmed access. DM-verified forced steps use the same entry checks and per-creature tracking. Legacy combat and automatic special-attack movement remain separate. |
| Candle | Light source with finite duration | Light radius, world clock, visibility | Tracks a one-hour candle and displays bright and dim radii. Automatic map visibility remains open. |
| Healer’s Kit | Utilize; stabilize 0 HP creature; 10 uses | Adjacent target, Action, stable death saves | Implemented for eligible adjacent allies in unified encounter |
| Holy Water | Attack replacement; Dexterity save; Radiant damage to qualifying creature types | Creature type and thrown attack | Supported in unified combat for imported level 1–4 characters. The DM verifies the target type during confirmation. |
| Lamp | Oil-fueled light source | Lighting, fuel and time | Tracks six hours of cumulative Oil fuel, with extinguishing and relighting. Automatic map visibility remains open. |
| Oil | Attack replacement or ground spill; fire interaction | Surface fire, timed oil effect and target state | Creature coating supported in imported level 1–4 unified encounters. DM-registered objects can also be coated, and verified object fire damage ignites the coating once. Ground ignition and fuel remain deferred. |
| Poison, Basic | Bonus Action coating; extra Poison damage on a qualifying hit; no saving throw | Coating duration, weapon hit, save | Supported for one uniquely owned, equipped piercing or slashing weapon in unified combat, through verified weapon attacks. Ammunition coating and manually adjudicated reactions remain deferred. |
| Potion of Healing | SRD: Bonus Action to drink or administer within 5 feet; 2d4 + 2 HP for standard potion | HP, inventory, action economy | Existing four-tier implementation retained. Ally administration uses a Bonus Action in unified combat, matching SRD 5.2.1 |
| Rations | Food supply consumed during travel/rest | Hunger and travel consumption | Tracks confirmed ration consumption by game day. Opt-in daily tracking adds Exhaustion for five consecutive days without recorded food. Partial meals remain DM-adjudicated. |
| Rope | Utilize for binding/climbing, not consumed by ordinary use | Interaction and object state | Supports a verified knot check, with Utilize in combat. Unified combat supports binding an eligible adjacent creature, Acrobatics escape, and Athletics breaking. |
| Tinderbox | Ignition utility; reusable | Environmental fire and lighting | Reusable for lighting owned candles, torches and lamps. Other exposed fuel and environmental fires remain open. |
| Torch | Lit light source, finite duration, potential improvised attack | Light and fire/attack integration | Tracks a one-hour torch and displays bright and dim radii. Weapon attacks and automatic visibility remain open. |
| Waterskin | Water container, refillable | Hydration and refill source | Tracks drinking and DM-confirmed refills of a single four-pint container. Opt-in daily tracking adds Exhaustion below four recorded pints for Small or Medium characters. Multiple containers remain open. |

**Safeguards:** Do not consume items merely to show a descriptive effect. Acid, Holy Water, Alchemist’s Fire and Oil coating use the confirmed inventory transaction and the current single-attack encounter flow. Other throwables, hazards, light sources, hunger and coatings require additional engine support. No unsupported 2014 rules are substituted for 2024 SRD mechanics.

**Time limitation:** Recorded elapsed time advances on approved rests and some timed activities. Completed rounds in unified combat separately count six seconds against antitoxin. Travel and legacy encounters do not uniformly advance either clock, so antitoxin can last too long across untracked activities.

## Rule details and implementation dependencies

- **Acid, Alchemist’s Fire and Holy Water** each replace one attack and expend one container. Choose a visible target within 20 feet. All use a Dexterity saving throw against 8 + thrower Dexterity modifier + proficiency bonus. Acid deals 2d6 acid on failure. Alchemist’s Fire deals 1d4 fire on failure then applies Burning, which deals 1d4 fire at the start of each turn until extinguished. Both can target an object or creature. Holy Water targets a creature and deals 2d8 radiant on failure only to a Fiend or Undead. All three need attack-by-attack accounting, verified saves and accurate cover/visibility. Acid and Alchemist’s Fire also need destructible object targets. Holy Water needs verified creature type. Burning needs turn-start processing and extinguishing via action, dousing, submersion or suffocation.
- **Oil** has three separate paths. Throwing replaces one attack against a creature or object within 20 feet using the same save DC formula. Failure coats the target for up to one minute and adds 5 Fire damage if it takes Fire damage while coated. The ground path uses Utilize to pour one flask on a level 5-foot square within 5 feet. If ignited, the area burns for two rounds and deals 5 Fire damage on entry or turn end, at most once per turn per creature. Fuel supplies six cumulative hours in a lamp or lantern. The dependencies are attack replacement, timed target effects and typed damage hooks, persistent ground state, and tracked light and fuel respectively.
- **Basic Poison** consumes one vial as a Bonus Action to coat one weapon or up to three ammunition pieces. A creature taking piercing or slashing damage from the coated item takes an extra 1d4 Poison. The coating ends when it deals that damage or after one minute. This needs per-weapon or per-projectile coating state, timed expiration, and damage resolution across relevant attacks.
- **Perfume** is applied to oneself. For one hour it grants advantage on Persuasion checks to influence an Indifferent Humanoid within 5 feet. The SRD gear entry gives no explicit named action or dose count. This needs authoritative attitude, creature type and distance at check time, plus a supported inventory unit for application.
- **Spell Scrolls** require a specific spell on the user’s class list, use its usual casting time, omit Material components, and disintegrate on completed casting. The listed scrolls use DC 13 or +5 when a save or attack applies. Current generic scroll inventory does not establish a spell identity or a transactional link to the relevant casting engine.
- **Ammunition** is already tracked for supported equipped weapons. Firearm ammunition and needles need verified weapon mappings in that flow. **Ink, paper and parchment** are supplies with capacity rules but no discrete combat activation. **Equipment packs** are bundles, so use or depletion belongs to the contents. **Ball bearings and caltrops** are deployments rather than instant attacks. **Hunting traps, nets, chains and manacles** need persistent object, binding or restraint state without ordinary per-use depletion.
- **Ball Bearings** use Utilize to spread across a level 10-foot square within 10 feet. A creature entering for the first time on a turn makes a DC 10 Dexterity save or falls Prone. **Caltrops** use Utilize to cover a 5-foot square within 5 feet. The first entry each turn requires a DC 15 Dexterity save or causes 1 Piercing damage and Speed 0 until the creature’s next turn starts. Recovering either supply takes 10 minutes. The implementation tracks normal grid entry and recovers deployments from the completed encounter while it remains available.
- **Candle and Torch** each burn for one hour. Candle light extends 5 feet bright and another 5 feet dim. Torch light extends 20 feet bright and another 20 feet dim. A Torch can also be used as a Simple Melee weapon with the Attack action for 1 Fire damage on a hit. **Lamp** light reaches 15 feet bright plus 30 feet dim. **Bullseye Lantern** projects a 60-foot bright cone plus 60 feet dim. **Hooded Lantern** reaches 30 feet bright plus 30 feet dim, and a Bonus Action can lower or raise the hood. Lowered, it sheds only 5 feet of dim light. **Tinderbox** uses a Bonus Action to light exposed fuel and takes a minute for other fires. These uses need tracked illumination, time, fuel state and ignition.
- **Rations and Waterskin** work against malnutrition and dehydration during exploration. The waterskin is reusable and holds four pints. Daily food and water requirements, source and refill state, and hazard saves need authoritative time and consumption rules. Containers and clothing, spellcasting foci, carrying and climbing tools, and other reusable equipment are outside the expendable-item flow.

## Local equipment catalog inventory (recognized category records)

### ammunition (5)

Arrows, Bolts, Bullets, Firearm, Bullets, Sling (20), Needles.

### armor (12)

Breastplate, Chain Mail, Chain Shirt, Half Plate Armor, Hide Armor, Leather Armor, Padded Armor, Plate Armor, Ring Mail, Scale Mail, Splint Armor, Studded Leather Armor.

### gear (89)

Acid, Alchemist’s Fire, Antitoxin, Arcane Focus (Crystal), Arcane Focus (Orb), Arcane Focus (Rod), Arcane Focus (Staff (also a Quarterstaff )), Arcane Focus (Wand), Backpack, Ball Bearings, Barrel, Basket, Bedroll, Bell, Blanket, Block and Tackle, Book, Bottle, Glass, Bucket, Burglar’s Pack, Caltrops, Candle, Case, Crossbow Bolt, Case, Map or Scroll, Chain, Chest, Climber’s Kit, Clothes, Fine, Clothes, Traveler’s, Component Pouch, Costume, Crowbar, Diplomat’s Pack, Druidic Focus (Sprig of mistletoe), Druidic Focus (Wooden staff (also a Quarterstaff )), Druidic Focus (Yew wand), Dungeoneer’s Pack, Entertainer’s Pack, Explorer’s Pack, Flask, Grappling Hook, Healer’s Kit, Holy Symbol (Amulet (worn or held)), Holy Symbol (Emblem (borne on fabric or a Shield)), Holy Symbol (Reliquary (held)), Holy Water, Hunting Trap, Ink, Ink Pen, Jug, Ladder, Lamp, Lantern, Bullseye, Lantern, Hooded, Lock, Magnifying Glass, Manacles, Map, Mirror, Net, Oil, Paper, Parchment, Perfume, Poison, Basic, Pole, Pot, Iron, Potion of Healing, Pouch, Priest’s Pack, Quiver, Ram, Portable, Rations, Robe, Rope, Sack, Scholar’s Pack, Shovel, Signal Whistle, Spell Scroll (Cantrip), Spell Scroll (Level 1), Spikes, Iron, Spyglass, String, Tent, Tinderbox, Torch, Vial, Waterskin.

### shield (1)

Shield.

### tool (23)

Alchemist’s Supplies, Brewer’s Supplies, Calligrapher’s Supplies, Carpenter’s Tools, Cartographer’s Tools, Cobbler’s Tools, Cook’s Utensils, Disguise Kit, Forgery Kit, Glassblower’s Tools, Herbalism Kit, Jeweler’s Tools, Leatherworker’s Tools, Mason’s Tools, Navigator’s Tools, Painter’s Supplies, Poisoner’s Kit, Potter’s Tools, Smith’s Tools, Thieves’ Tools, Tinker’s Tools, Weaver’s Tools, Woodcarver’s Tools.

### weapon (38)

Battleaxe, Blowgun, Club, Dagger, Dart, Flail, Glaive, Greataxe, Greatclub, Greatsword, Halberd, Hand Crossbow, Handaxe, Heavy Crossbow, Javelin, Lance, Light Crossbow, Light Hammer, Longbow, Longsword, Mace, Maul, Morningstar, Musket, Pike, Pistol, Quarterstaff, Rapier, Scimitar, Shortbow, Shortsword, Sickle, Sling, Spear, Trident, War Pick, Warhammer, Whip.

