import type {MagicItemMechanics} from './magicItemDefinitions';
export const ADDITIONAL_MAGIC_ITEM_DEFINITIONS: Record<string, MagicItemMechanics> = {
  "adamantine-armor": {
    summary: "Wearing this reinforced medium or heavy armor turns incoming critical hits into ordinary hits.",
    limitations: ["Does not work with hide armor."],
  },
  "armor-1": {
    summary: "This magic armor increases Armor Class by 1 while worn.",
    bonuses: [{target:"armor-class",amount:1}],
  },
  "armor-2": {
    summary: "This magic armor increases Armor Class by 2 while worn.",
    bonuses: [{target:"armor-class",amount:2}],
  },
  "armor-3": {
    summary: "This magic armor increases Armor Class by 3 while worn.",
    bonuses: [{target:"armor-class",amount:3}],
  },
  "ammunition-1": {
    summary: "This enchanted ammunition adds 1 to its attack and damage rolls; it loses its magic after hitting a target.",
    bonuses: [{target:"weapon-attack-rolls",amount:1},{target:"weapon-damage-rolls",amount:1}],
    limitations: ["Each piece loses its magic after a hit."],
  },
  "ammunition-2": {
    summary: "This enchanted ammunition adds 2 to its attack and damage rolls; it loses its magic after hitting a target.",
    bonuses: [{target:"weapon-attack-rolls",amount:2},{target:"weapon-damage-rolls",amount:2}],
    limitations: ["Each piece loses its magic after a hit."],
  },
  "ammunition-3": {
    summary: "This enchanted ammunition adds 3 to its attack and damage rolls; it loses its magic after hitting a target.",
    bonuses: [{target:"weapon-attack-rolls",amount:3},{target:"weapon-damage-rolls",amount:3}],
    limitations: ["Each piece loses its magic after a hit."],
  },
  "dagger-of-venom": {
    summary: "This dagger grants +1 to attack and damage rolls. A Bonus Action can coat it with poison; the next hit within 1 minute forces a DC 15 Constitution save or deals 2d10 Poison damage and inflicts Poisoned for 1 minute.",
    bonuses: [{target:"weapon-attack-rolls",amount:1},{target:"weapon-damage-rolls",amount:1}],
    activation: "Bonus Action to apply poison",
    recharge: "Poison coating once per dawn.",
    limitations: ["Poison wears off after 1 minute or a hit."],
  },
  "elven-chain": {
    summary: "This enchanted chain shirt or chain mail grants +1 AC and counts its wearer as trained with the armor.",
    bonuses: [{target:"armor-class",amount:1}],
  },
  "glamoured-studded-leather": {
    summary: "This studded leather adds +1 AC. A Bonus Action changes its visible appearance into ordinary clothes or another armor style without changing its weight or bulk.",
    bonuses: [{target:"armor-class",amount:1}],
    activation: "Bonus Action to change appearance",
    limitations: ["Illusory appearance persists until changed or armor removed."],
  },
  "mithral-armor": {
    summary: "This flexible medium or heavy armor can fit beneath ordinary clothing. It removes the armor's usual Strength requirement and Stealth Disadvantage.",
    limitations: ["Not available for hide armor."],
  },
  "potion-of-climbing": {
    summary: "Drinking this potion gives a climbing speed equal to walking Speed and Advantage on Strength (Athletics) checks to climb for 1 hour.",
    activation: "Bonus Action to drink or administer",
    limitations: ["Single-use consumable; lasts 1 hour."],
  },
  "potion-of-invisibility": {
    summary: "Drinking this potion makes you Invisible for up to 1 hour. Attacking, dealing damage, or casting a spell ends the effect early.",
    activation: "Bonus Action to drink or administer",
    limitations: ["Single-use consumable; ends early on attack, damage, or spellcasting."],
  },
  "potion-of-flying": {
    summary: "Drinking this potion grants a flying speed equal to your Speed and lets you hover for 1 hour.",
    activation: "Bonus Action to drink or administer",
    limitations: ["Single-use consumable; falling is possible when the effect ends."],
  },
  'dmg24-boots-of-false-tracks': {
    verification: 'needs-official-review',
    summary: 'Magical boots intended to mislead creatures following the wearer’s tracks. Exact activation and tracking effects require review against the official DMG.',
    limitations: ['Do not automate track alteration until the official 2024 mechanics are verified.'],
  },
  'dmg24-cloak-of-billowing': {
    verification: 'needs-official-review',
    summary: 'A cloak that can billow dramatically through magic. Confirm its precise activation wording in the official 2024 DMG before implementation.',
    limitations: ['Cosmetic effect only; no combat bonus is established here.'],
  },
};
