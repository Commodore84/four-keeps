// Curated mechanics metadata for compendium display, not executable game rules.
// Non-SRD descriptions are independently written summaries, not book excerpts.
export interface MagicItemMechanics {
  summary: string;
  verification?: 'verified-srd' | 'needs-official-review';
  bonuses?: { target: string; amount: number; condition?: string }[];
  activation?: string;
  charges?: { maximum: number; maximumPerUse?: number; cost?: string };
  recharge?: string;
  limitations?: string[];
  attunementRequirement?: string;
}
export const MAGIC_ITEM_DEFINITIONS: Record<string, MagicItemMechanics> = {
  'bag-of-holding': {
    verification: 'verified-srd',
    summary: 'A five-pound extradimensional bag stores up to 500 pounds or 64 cubic feet of contents. Taking something out requires a Utilize action.',
    activation: 'Utilize action to retrieve an item',
    limitations: ['Overloading or damaging the bag destroys it and sends its contents to the Astral Plane.', 'Living creatures have only a limited shared air supply.', 'Nesting extradimensional storage can open a dangerous Astral Plane gate.'],
  },
  'cloak-of-protection': {
    summary: 'While worn and attuned, this cloak improves both your Armor Class and every saving throw by 1.',
    bonuses: [{target:'armor-class',amount:1},{target:'saving-throws',amount:1}],
  },
  'ring-of-protection': {
    summary: 'While worn and attuned, this ring adds 1 to Armor Class and all saving throws.',
    bonuses: [{target:'armor-class',amount:1},{target:'saving-throws',amount:1}],
  },
  'boots-of-elvenkind': {
    summary: 'Your footsteps are silent while wearing these boots, and you gain Advantage on Dexterity (Stealth) checks.',
    bonuses: [{target:'dexterity-stealth',amount:0,condition:'Advantage on checks'}],
    limitations: ['Silent footsteps do not make the wearer invisible.'],
  },
  'wand-of-magic-missiles': {
    summary: 'Spend 1–3 charges to cast Magic Missile at spell level 1–3, respectively, without expending your own spell slots.',
    activation: 'Cast Magic Missile while holding the wand',
    charges: {maximum:7,maximumPerUse:3,cost:'1 charge per spell level'},
    recharge: 'Regains 1d6 + 1 charges at dawn.',
    limitations: ['Using the final charge risks destroying the wand on a d20 roll of 1.'],
  },
  'pearl-of-power': {
    summary: 'Once per dawn, restore one expended spell slot of level 3 or lower while carrying this pearl.',
    activation: 'Magic action',
    recharge: 'Once per dawn.',
    limitations: ['Only restores an expended spell slot of level 3 or lower.'],
  },
  'immovable-rod': {
    summary: 'Press the button to anchor this rod in space, even in midair. It supports up to 8,000 pounds until switched off or overloaded.',
    activation: 'Utilize action to toggle the rod',
    limitations: ['A DC 30 Strength (Athletics) check can shift it up to 10 feet.', 'Exceeding its load limit deactivates it.'],
  },
  'gauntlets-of-ogre-power': {
    summary: 'While wearing and attuned to these gauntlets, your Strength becomes 19 unless it is already 19 or higher.',
    bonuses: [{target:'strength-score',amount:19,condition:'Set to 19 if lower'}],
    limitations: ['Does not increase Strength already at 19 or above.'],
  },
  'dmg24-1-wand-of-the-war-mage': {
    verification: 'needs-official-review',
    summary: 'While holding and attuned to this wand, gain a +1 bonus to spell attack rolls. It also helps spell attacks bypass half cover.',
    bonuses: [{target:'spell-attack-rolls',amount:1}],
    limitations: ['Applies to spell attack rolls, not spell save DCs.'],
    attunementRequirement: 'Spellcaster',
  },
  'dmg24-2-wand-of-the-war-mage': {
    verification: 'needs-official-review',
    summary: 'While holding and attuned to this wand, gain a +2 bonus to spell attack rolls. It also helps spell attacks bypass half cover.',
    bonuses: [{target:'spell-attack-rolls',amount:2}],
    limitations: ['Applies to spell attack rolls, not spell save DCs.'],
    attunementRequirement: 'Spellcaster',
  },
  'dmg24-3-wand-of-the-war-mage': {
    verification: 'needs-official-review',
    summary: 'While holding and attuned to this wand, gain a +3 bonus to spell attack rolls. It also helps spell attacks bypass half cover.',
    bonuses: [{target:'spell-attack-rolls',amount:3}],
    limitations: ['Applies to spell attack rolls, not spell save DCs.'],
    attunementRequirement: 'Spellcaster',
  },
  'dmg24-1-rod-of-the-pact-keeper': {
    verification: 'needs-official-review',
    summary: 'An attuned warlock gains +1 to spell attack rolls and spell save DCs for warlock spells while holding the rod, and can recover a Pact Magic slot once per long rest.',
    bonuses: [{target:'warlock-spell-attacks',amount:1},{target:'warlock-spell-save-dc',amount:1}],
    activation: 'Magic action to recover one expended Pact Magic slot',
    recharge: 'Once per long rest for Pact Magic recovery.',
    attunementRequirement: 'Warlock',
  },
  'dmg24-2-rod-of-the-pact-keeper': {
    verification: 'needs-official-review',
    summary: 'An attuned warlock gains +2 to spell attack rolls and spell save DCs for warlock spells while holding the rod, and can recover a Pact Magic slot once per long rest.',
    bonuses: [{target:'warlock-spell-attacks',amount:2},{target:'warlock-spell-save-dc',amount:2}],
    activation: 'Magic action to recover one expended Pact Magic slot',
    recharge: 'Once per long rest for Pact Magic recovery.',
    attunementRequirement: 'Warlock',
  },
  'dmg24-3-rod-of-the-pact-keeper': {
    verification: 'needs-official-review',
    summary: 'An attuned warlock gains +3 to spell attack rolls and spell save DCs for warlock spells while holding the rod, and can recover a Pact Magic slot once per long rest.',
    bonuses: [{target:'warlock-spell-attacks',amount:3},{target:'warlock-spell-save-dc',amount:3}],
    activation: 'Magic action to recover one expended Pact Magic slot',
    recharge: 'Once per long rest for Pact Magic recovery.',
    attunementRequirement: 'Warlock',
  },
  'dmg24-gloves-of-thievery': {
    verification: 'verified-srd',
    summary: 'These invisible gloves improve Sleight of Hand checks and Dexterity checks made to open locks by 5 while worn.',
    bonuses: [{target:'dexterity-sleight-of-hand',amount:5},{target:'dexterity-lock-picking',amount:5}],
    limitations: ['The bonus applies to the specified checks, not all Dexterity checks.'],
  },
};
