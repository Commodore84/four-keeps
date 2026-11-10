import {SUBCLASSES} from './creationSubclasses';
export type FeatureConfidence='verified-mechanics'|'preview-needs-verification';
export interface SubclassFeatureEntry {subclassId:string;level:number;name:string;description:string;confidence:FeatureConfidence;appliedToProjection:boolean;choiceRequired:boolean}
const TIERS:Record<string,number[]>={barbarian:[3,6,10,14],bard:[3,6,14],cleric:[3,6,17],druid:[3,6,10,14],fighter:[3,7,10,15,18],monk:[3,6,11,17],paladin:[3,7,15,20],ranger:[3,7,11,15],rogue:[3,9,13,17],sorcerer:[3,6,14,18],warlock:[3,6,10,14],wizard:[3,6,10,14]};
const NAMES:Record<string,string[]>={
'barbarian-berserker':['Frenzy','Mindless Rage','Retaliation','Intimidating Presence'],
'barbarian-wild-heart':['Rage of the Wilds','Aspect of the Wilds','Nature Speaker','Power of the Wilds'],
'barbarian-world-tree':['Vitality of the Tree','Branches of the Tree','Battering Roots','Travel Along the Tree'],
'barbarian-zealot':['Divine Fury','Fanatical Focus','Zealous Presence','Rage of the Gods'],
'bard-dance':['Dazzling Footwork','Inspiring Movement','Tandem Footwork'],
'bard-glamour':['Mantle of Inspiration','Mantle of Majesty','Unbreakable Majesty'],
'bard-lore':['Bonus Proficiencies and Cutting Words','Magical Discoveries','Peerless Skill'],
'bard-valor':['Combat Inspiration','Extra Attack','Battle Magic'],
'cleric-life':['Disciple of Life and Preserve Life','Blessed Healer','Supreme Healing'],
'cleric-light':['Warding Flare and Radiance of the Dawn','Improved Warding Flare','Corona of Light'],
'cleric-trickery':['Blessing of the Trickster and Invoke Duplicity','Trickster’s Transposition','Improved Duplicity'],
'cleric-war':['War Priest and Guided Strike','War God’s Blessing','Avatar of Battle'],
'druid-land':['Circle Spells and Land’s Aid','Natural Recovery','Nature’s Ward','Nature’s Sanctuary'],
'druid-moon':['Circle Forms and Combat Wild Shape','Improved Circle Forms','Moonlight Step','Lunar Form'],
'druid-sea':['Wrath of the Sea','Aquatic Affinity','Stormborn','Oceanic Gift'],
'druid-stars':['Star Map and Starry Form','Cosmic Omen','Twinkling Constellations','Full of Stars'],
'fighter-battle-master':['Combat Superiority','Know Your Enemy','Improved Combat Superiority','Relentless','Superior Combat Superiority'],
'fighter-champion':['Improved Critical and Remarkable Athlete','Additional Fighting Style','Heroic Warrior','Superior Critical','Survivor'],
'fighter-eldritch-knight':['Spellcasting and War Bond','War Magic','Eldritch Strike','Arcane Charge','Improved War Magic'],
'fighter-psi-warrior':['Psionic Power','Telekinetic Adept','Guarded Mind','Bulwark of Force','Telekinetic Master'],
'monk-elements':['Elemental Attunement','Elemental Burst','Stride of the Elements','Elemental Epitome'],
'monk-mercy':['Hand of Healing and Hand of Harm','Physician’s Touch','Flurry of Healing and Harm','Hand of Ultimate Mercy'],
'monk-open-hand':['Open Hand Technique','Wholeness of Body','Fleet Step','Quivering Palm'],
'monk-shadow':['Shadow Arts','Shadow Step','Improved Shadow Step','Cloak of Shadows'],
'paladin-ancients':['Nature’s Wrath','Aura of Warding','Undying Sentinel','Elder Champion'],
'paladin-devotion':['Sacred Weapon','Aura of Devotion','Purity of Spirit','Holy Nimbus'],
'paladin-glory':['Peerless Athlete and Inspiring Smite','Aura of Alacrity','Glorious Defense','Living Legend'],
'paladin-vengeance':['Vow of Enmity','Relentless Avenger','Soul of Vengeance','Avenging Angel'],
'ranger-beast-master':['Primal Companion','Exceptional Training','Bestial Fury','Share Spells'],
'ranger-fey-wanderer':['Dreadful Strikes and Otherworldly Glamour','Beguiling Twist','Fey Reinforcements','Misty Wanderer'],
'ranger-gloom-stalker':['Dread Ambusher and Umbral Sight','Iron Mind','Stalker’s Flurry','Shadowy Dodge'],
'ranger-hunter':['Hunter’s Prey','Defensive Tactics','Superior Hunter’s Prey','Superior Hunter’s Defense'],
'rogue-arcane-trickster':['Spellcasting and Mage Hand Legerdemain','Magical Ambush','Versatile Trickster','Spell Thief'],
'rogue-assassin':['Assassinate and Assassin’s Tools','Infiltration Expertise','Envenom Weapons','Death Strike'],
'rogue-soulknife':['Psionic Power and Psychic Blades','Soul Blades','Psychic Veil','Rend Mind'],
'rogue-thief':['Fast Hands and Second-Story Work','Supreme Sneak','Use Magic Device','Thief’s Reflexes'],
'sorcerer-aberrant-sorcery':['Psionic Spells and Telepathic Speech','Psionic Sorcery and Psychic Defenses','Revelation in Flesh','Warping Implosion'],
'sorcerer-clockwork-sorcery':['Clockwork Spells and Restore Balance','Bastion of Law','Trance of Order','Clockwork Cavalcade'],
'sorcerer-draconic-sorcery':['Draconic Resilience','Elemental Affinity','Dragon Wings','Draconic Presence'],
'sorcerer-wild-magic-sorcery':['Wild Magic Surge and Tides of Chaos','Bend Luck','Controlled Chaos','Spell Bombardment'],
'warlock-archfey':['Steps of the Fey','Misty Escape','Beguiling Defenses','Bewitching Magic'],
'warlock-celestial':['Healing Light','Radiant Soul','Celestial Resilience','Searing Vengeance'],
'warlock-fiend':['Dark One’s Blessing','Dark One’s Own Luck','Fiendish Resilience','Hurl Through Hell'],
'warlock-great-old-one':['Awakened Mind and Psychic Spells','Clairvoyant Combatant','Eldritch Hex','Create Thrall'],
'wizard-abjurer':['Abjuration Savant and Arcane Ward','Projected Ward','Spell Breaker','Spell Resistance'],
'wizard-diviner':['Divination Savant and Portent','Expert Divination','The Third Eye','Greater Portent'],
'wizard-evoker':['Evocation Savant and Potent Cantrip','Sculpt Spells','Empowered Evocation','Overchannel'],
'wizard-illusionist':['Illusion Savant and Improved Illusions','Phantasmal Creatures','Illusory Self','Illusory Reality']
};
export const SUBCLASS_FEATURES:SubclassFeatureEntry[]=SUBCLASSES.flatMap(subclass=>{
 const levels=TIERS[subclass.classId]??[];
 const names=NAMES[subclass.id]??[];
 return levels.map((level,index)=>({
  subclassId:subclass.id,level,
  name:names[index]??subclass.name+' advancement',
  description:index===0?subclass.description:
   'This feature expands the '+subclass.name+' specialization in '+subclass.focus.toLowerCase()+'. The exact action economy, resource costs, range, duration, saving throws, and scaling must be verified against the 2024 rules before it can be used by the campaign engine.',
  confidence:'preview-needs-verification' as const,
  appliedToProjection:false,
  choiceRequired:index===0
 }));
});
export function subclassFeatureAt(subclassId:string,level:number):SubclassFeatureEntry|undefined{
 return SUBCLASS_FEATURES.find(f=>f.subclassId===subclassId&&f.level===level);
}
export function subclassFeatureCoverage(){return {subclasses:SUBCLASSES.length,entries:SUBCLASS_FEATURES.length,verified:SUBCLASS_FEATURES.filter(f=>f.confidence==='verified-mechanics').length}};
