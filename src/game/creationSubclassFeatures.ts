import {SUBCLASSES} from './creationSubclasses';
export type FeatureConfidence='verified-mechanics'|'verified-reference'|'preview-needs-verification';
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
'paladin-devotion':['Sacred Weapon','Aura of Devotion','Smite of Protection','Holy Nimbus'],
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
/** Independently reviewed reference summaries; display-only until the rules engine implements them. */
const VERIFIED_REFERENCE:Record<string,Record<number,string>>={
 'rogue-arcane-trickster':{
  3:'Spellcasting: prepare Wizard spells using the Arcane Trickster progression. Mage Hand Legerdemain extends Mage Hand with subtle manipulation and permits its control with a Bonus Action.',
  9:'Magical Ambush: when you are Invisible as you cast a spell on a creature, that creature has Disadvantage on saving throws against the spell during that turn.',
  13:'Versatile Trickster: when you use the Trip option of Cunning Strike, you can also use Mage Hand to target a second creature within its reach, subject to the feature’s restrictions.',
  17:'Spell Thief: use a Reaction after a creature casts a spell that targets you or includes you in its area; attempt to negate and temporarily learn the spell under the feature’s limits.'},
 'rogue-assassin':{
  3:'Assassinate improves initiative and attacks against creatures that have not acted in the first round. Assassin’s Tools grants the subclass tool and disguise benefits.',
  9:'Infiltration Expertise: create a convincing false identity and imitate another person’s speech and writing using the subclass’s infiltration abilities.',
  13:'Envenom Weapons: the Poison option of Cunning Strike deals additional Poison damage when the target fails its saving throw.',
  17:'Death Strike: after hitting a creature during the first round of combat, force a Constitution save to increase the damage under the feature’s restrictions.'},
 'rogue-thief':{
  3:'Fast Hands expands the Cunning Action Bonus Action options for eligible objects and checks. Second-Story Work improves climbing and jumping.',
  9:'Supreme Sneak: gain the subclass’s additional Stealth benefit when wearing appropriate armor.',
  13:'Use Magic Device: attune to additional magic items and gain expanded access to magic items, including eligible scrolls and charged items.',
  17:'Thief’s Reflexes: take two turns during the first round of combat, using your normal initiative and an additional later initiative count.'},
 'wizard-diviner':{
  3:'Divination Savant reduces the cost of adding Divination spells to your spellbook. Portent lets you replace eligible d20 Tests with rolls recorded after a Long Rest.',
  6:'Expert Divination: casting a Divination spell using a spell slot can restore an expended lower-level spell slot, subject to its limits.',
  10:'The Third Eye: use a Bonus Action to gain one of the subclass’s special senses until the specified ending condition.',
  14:'Greater Portent: roll three Portent dice after a Long Rest instead of two.'},
 'wizard-abjurer':{
  3:'Abjuration Savant improves access to Abjuration spells. Arcane Ward absorbs damage and can be restored by casting Abjuration spells under its rules.',
  6:'Projected Ward: use your Reaction to have Arcane Ward absorb damage dealt to another creature you can see within 30 feet.',
  10:'Spell Breaker: add your Proficiency Bonus to eligible ability checks for Dispel Magic and Counterspell.',
  14:'Spell Resistance: gain Advantage on saving throws against spells and Resistance to damage from spells.'},
 'fighter-champion':{
  3:'Improved Critical expands critical hits for weapon and Unarmed Strike attacks to natural 19 or 20. Remarkable Athlete enhances initiative and Athletics and permits movement after a critical hit.',
  7:'Additional Fighting Style: choose another eligible Fighting Style feat during advancement; the benefit depends on the saved selection.',
  10:'Heroic Warrior: gain Heroic Inspiration at the start of your turn in combat if you lack it.',
  15:'Superior Critical: weapon and Unarmed Strike attacks score a critical hit on a natural 18, 19, or 20.',
  18:'Survivor: gain Advantage on death saving throws and additional recovery while Bloodied but above zero Hit Points.'},
};
const VERIFIED:Record<string,Record<number,{description:string;applied:boolean;choiceRequired?:boolean}>>={
 // 2024 Basic Rules: https://www.dndbeyond.com/sources/dnd/br-2024/character-classes
 'paladin-devotion':{
  3:{description:'Sacred Weapon: as part of the Attack action, expend Channel Divinity to empower a held melee weapon for 10 minutes, adding your Charisma modifier (minimum +1) to attack rolls and optionally dealing Radiant damage. Your Oath spells are always prepared.',applied:false},
  7:{description:'Aura of Devotion: you and allies within your Aura of Protection are immune to Charmed while in the aura.',applied:false},
  15:{description:'Smite of Protection: casting Divine Smite grants you and allies in your Aura of Protection Half Cover until the start of your next turn.',applied:false},
  20:{description:'Holy Nimbus: as a Bonus Action, empower your aura for 10 minutes, gaining protection against Fiends and Undead, Radiant damage to nearby enemies, and sunlight. Regain the use after a Long Rest or by expending a level 5 spell slot.',applied:false}
 },
 'druid-land':{
  3:{description:'Circle Spells: choose arid, polar, temperate, or tropical after a Long Rest; the corresponding spells are prepared. Land’s Aid: expend Wild Shape as a Magic action to heal one creature and deal Necrotic damage in an area.',applied:false},
  6:{description:'Natural Recovery: once per Long Rest cast one prepared Circle Spell without a slot; once per Long Rest recover spell slots after a Short Rest totaling up to half your Druid level (rounded up), with no level 6+ slots.',applied:false},
  10:{description:'Nature’s Ward: immunity to Poisoned and resistance according to your current terrain (arid Fire, polar Cold, temperate Lightning, tropical Poison). Land’s Aid increases to 3d6.',applied:false},
  14:{description:'Nature’s Sanctuary: expend Wild Shape as a Magic action to create a protective 15-foot cube for 1 minute; allies gain Half Cover and your Nature’s Ward resistance. Land’s Aid increases to 4d6.',applied:false}
 },
 'warlock-fiend':{
  3:{description:'Dark One’s Blessing: when you or someone else within 10 feet of you reduces an enemy to 0 HP, gain Temporary Hit Points equal to your Charisma modifier plus Warlock level (minimum 1). Fiend spells are always prepared.',applied:false},
  6:{description:'Dark One’s Own Luck: add 1d10 to an ability check or saving throw after seeing the roll but before its effects, up to your Charisma modifier uses (minimum one) per Long Rest.',applied:false},
  10:{description:'Fiendish Resilience: after a Short or Long Rest choose one damage type other than Force; gain resistance to it until you choose another.',applied:false,choiceRequired:true},
  14:{description:'Hurl Through Hell: once per turn after hitting with an attack roll, force a Charisma save or send the target away until the end of your next turn, incapacitating it and dealing 8d10 Psychic damage if not a Fiend. Recharge on a Long Rest or with a Pact Magic slot.',applied:false}
 },

 'fighter-champion':{
  3:{description:'Weapon and Unarmed Strike attack rolls score a critical hit on a natural 19 or 20. You also have advantage on initiative and Athletics checks; after a critical hit you may move up to half your speed without provoking opportunity attacks.',applied:true},
  7:{description:'Gain an additional Fighting Style feat of your choice. The specific style and its benefits must be selected during actual advancement.',applied:false,choiceRequired:true},
  10:{description:'When combat begins a turn and you lack Heroic Inspiration, you can grant it to yourself. This benefit is contextual and is not a static sheet modifier.',applied:false},
  15:{description:'Your weapon and Unarmed Strike attacks now critically hit on natural 18, 19, or 20.',applied:true},
  18:{description:'You gain advantage on death saving throws, and a death save of 18–20 counts as a natural 20. While bloodied but above zero Hit Points, you regain 5 plus your Constitution modifier Hit Points at the start of your turn.',applied:false}
 },
 'sorcerer-draconic-sorcery':{
  3:{description:'Your maximum Hit Points increase by 3 at subclass selection, then by 1 for each additional Sorcerer level. While unarmored, you can use an Armor Class of 10 plus your Dexterity and Charisma modifiers. You also gain the subclass spell list at its specified levels.',applied:true},
  6:{description:'Choose Acid, Cold, Fire, Lightning, or Poison. Gain resistance to that damage type and add your Charisma modifier to one damage roll of a spell dealing that type.',applied:false,choiceRequired:true},
  14:{description:'As a Bonus Action, manifest wings for one hour, gaining a Fly Speed of 60 feet. After using the feature, regain it on a Long Rest or by spending 3 Sorcery Points.',applied:false},
  18:{description:'Your Draconic Sorcery reaches its capstone feature. This entry still needs a source-verified description and cannot be treated as mechanically implemented.',applied:false}
 }
};
export const SUBCLASS_FEATURES:SubclassFeatureEntry[]=SUBCLASSES.flatMap(subclass=>{
 const levels=TIERS[subclass.classId]??[];
 const names=NAMES[subclass.id]??[];
 return levels.map((level,index)=>({
  subclassId:subclass.id,level,
  name:names[index]??subclass.name+' advancement',
  description:VERIFIED[subclass.id]?.[level]?.description??VERIFIED_REFERENCE[subclass.id]?.[level]??(index===0?subclass.description:
   'This feature expands the '+subclass.name+' specialization in '+subclass.focus.toLowerCase()+'. The exact action economy, resource costs, range, duration, saving throws, and scaling must be verified against the 2024 rules before it can be used by the campaign engine.'),
  confidence:(VERIFIED[subclass.id]?.[level]&&!(subclass.id==='sorcerer-draconic-sorcery'&&level===18)?'verified-mechanics':VERIFIED_REFERENCE[subclass.id]?.[level]?'verified-reference':'preview-needs-verification') as FeatureConfidence,
  appliedToProjection:VERIFIED[subclass.id]?.[level]?.applied??false,
  choiceRequired:VERIFIED[subclass.id]?.[level]?.choiceRequired??index===0
 }));
});
/** Reference-only activation labels. These never unlock or execute mechanics. */
export const SUBCLASS_ACTIVATIONS:Record<string,Record<number,string>>={
 'rogue-arcane-trickster':{3:'Magic Action / Bonus Action',9:'When casting',13:'Bonus Action',17:'Reaction'},
 'rogue-assassin':{3:'On initiative / attack',9:'During disguise / infiltration',13:'On Sneak Attack',17:'On first-round attack'},
 'rogue-thief':{3:'Bonus Action / movement',9:'While hidden',13:'Magic item use',17:'On initiative'},
 'rogue-soulknife':{3:'On attack / resource',9:'On attack / movement',13:'Bonus Action',17:'On Sneak Attack'},
 'wizard-diviner':{3:'On d20 Test / Long Rest',6:'On divination spellcasting',10:'Magic Action',14:'Long Rest'},
 'wizard-abjurer':{3:'On spellcasting / ward',6:'Reaction',10:'On dispel / counterspell',14:'Passive'},
 'wizard-evoker':{3:'On cantrip damage',6:'On area spellcasting',10:'On spell damage',14:'On spellcasting / Long Rest'},
 'wizard-illusionist':{3:'On illusion spellcasting',6:'On illusion spellcasting',10:'Reaction',14:'Magic Action'},
 'fighter-champion':{3:'Passive / on critical hit',7:'Passive',10:'On initiative',15:'Passive',18:'On death save / turn start'},
 'fighter-battle-master':{3:'On attack / Superiority Die',7:'Passive',10:'On maneuver',15:'On initiative',18:'On maneuver'},
 'fighter-eldritch-knight':{3:'Spellcasting / bond',7:'On Attack action',10:'On weapon hit',15:'On Action Surge',18:'On Attack action'},
 'fighter-psi-warrior':{3:'On attack / Psionic Energy Die',7:'Bonus Action / movement',10:'Passive / resource',15:'Bonus Action',18:'Magic Action'},
};
export function earnedSubclassFeatures(subclassId:string,level:number):SubclassFeatureEntry[]{
 if(!Number.isFinite(level)||level<1)return [];
 return SUBCLASS_FEATURES.filter(feature=>feature.subclassId===subclassId&&feature.level<=Math.min(20,Math.floor(level)));
}
export function subclassActivation(feature:SubclassFeatureEntry):string{
 return SUBCLASS_ACTIVATIONS[feature.subclassId]?.[feature.level]??'Activation / recovery not yet verified';
}
export function subclassFeatureAt(subclassId:string,level:number):SubclassFeatureEntry|undefined{
 return SUBCLASS_FEATURES.find(f=>f.subclassId===subclassId&&f.level===level);
}
export function subclassFeatureCoverage(){return {subclasses:SUBCLASSES.length,entries:SUBCLASS_FEATURES.length,verified:SUBCLASS_FEATURES.filter(f=>f.confidence==='verified-mechanics').length}};
