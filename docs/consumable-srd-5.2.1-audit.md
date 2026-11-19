# SRD 5.2.1 adventuring-equipment consumables audit

Source: [SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), Equipment / Adventuring Gear; names, weights, prices and IDs cross-checked against src/game/officialEquipment2024-part*.ts. Mechanics are independently paraphrased; no non-SRD content.

Catalog includes 182 named equipment records across all categories, including armor, weapons, tools, and gear. Not every item is consumable. This audit prioritizes 17 relevant gear items and records why other nonconsumable equipment is outside the consumable workflow.

| Item | SRD rule category | Required authoritative support | Status |
|---|---|---|---|
| Acid | Attack replacement; Dexterity save; 2d6 Acid on failed save | Throw range, enemy save, damage and attack replacement | Deferred: no unified thrown-consumable attack transaction |
| Alchemist’s Fire | Attack replacement; Dexterity save; Fire damage and Burning | Burning lifecycle, damage timing and extinguish | Deferred: missing Burning lifecycle |
| Antitoxin | Bonus Action; self; 1 hour; advantage on saves to avoid/end Poisoned | Owned vial, turn Bonus Action, save context, elapsed time | Partially integrated: save resolver supports explicit poison purpose; game clock progression not wired |
| Ball Bearings | Utilize; area hazard; Dexterity save and Prone | Persistent terrain hazard and movement entry | Deferred: no authoritative persistent ground-hazard state |
| Caltrops | Utilize; area hazard; movement and Dexterity save | Persistent terrain hazard and movement entry | Deferred: no authoritative persistent ground-hazard state |
| Candle | Light source with finite duration | Light radius, world clock, visibility | Deferred: lighting and time lifecycle unavailable |
| Healer’s Kit | Utilize; stabilize 0 HP creature; 10 uses | Adjacent target, Action, stable death saves | Implemented for eligible adjacent allies in unified encounter |
| Holy Water | Attack replacement; Dexterity save; Radiant damage to qualifying creature types | Creature type and thrown attack | Deferred: target creature type not authoritative |
| Lamp | Oil-fueled light source | Lighting, fuel and time | Deferred: light/fuel system unavailable |
| Oil | Attack replacement or ground spill; fire interaction | Surface fire, timed oil effect and target state | Deferred: surface/ignition system unavailable |
| Poison, Basic | Apply to weapon or ammunition; poison damage saving throw | Coating duration, weapon hit, save | Deferred: no unified coating lifecycle |
| Potion of Healing | Bonus Action drink, Action administer; four tiers | HP, inventory, action economy | Implemented in earlier phase |
| Rations | Food supply consumed during travel/rest | Hunger and travel consumption | Deferred: no hunger engine |
| Rope | Utilize for binding/climbing, not consumed by ordinary use | Interaction and object state | Deferred: no object interaction engine |
| Tinderbox | Ignition utility; reusable | Environmental fire and lighting | Deferred: no ignition engine |
| Torch | Lit light source, finite duration, potential improvised attack | Light and fire/attack integration | Deferred: no lighting engine |
| Waterskin | Water container, refillable | Hydration and refill source | Deferred: no hydration engine |

**Safeguards:** Do not consume items merely to show a descriptive effect. No Attack-replacement throwable, area hazard, light source, hunger effect, or coating is enabled until its underlying deterministic engine and transaction semantics exist. No unsupported 2014 rules are substituted for 2024 SRD mechanics.

**Time limitation:** Campaign elapsedMinutes is currently not advanced by all travel/rest/encounter pathways; an antitoxin expiry timestamp is not equivalent to full timed-effect integration. A verified clock event can call advanceConsumableTime, but wiring world time is deferred.

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

