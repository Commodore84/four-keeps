import {SUBCLASSES} from './creationSubclasses';
import {subclassFeatureAt} from './creationSubclassFeatures';
export interface AdvancementFeature {level:number;name:string;description:string;source:'class'|'subclass'}
const WARLOCK:AdvancementFeature[]=[
[2,'Magical Cunning','Once per Long Rest, perform a one-minute ritual to regain expended Pact Magic spell slots, up to half your maximum (round up).'],
[3,'Warlock Subclass','Choose a patron at level 3. The patron grants subclass spells and features; its benefits depend on your choice.'],
[4,'Ability Score Improvement','Choose a qualifying feat, or the Ability Score Improvement feat to raise ability scores within the normal limits.'],
[5,'Eldritch Invocations','You can know additional invocations as your Warlock level rises. Check the invocation prerequisite for your current level and pact.'],
[6,'Subclass Feature','Your patron grants its next subclass feature at level 6. The precise effect depends on your selected patron.'],
[7,'Eldritch Invocations','You can replace eligible invocations when leveling and gain additional selections according to the Warlock progression table.'],
[8,'Ability Score Improvement','Choose a qualifying feat or improve ability scores.'],
[9,'Contact Patron','You can contact your patron directly through Contact Other Plane without expending a spell slot, with a special benefit to its saving throw.'],
[10,'Subclass Feature','Your patron grants another subclass feature at level 10.'],
[11,'Mystic Arcanum (level 6)','Choose one level-six Warlock spell as a Mystic Arcanum. Cast it once without a spell slot per Long Rest. It is separate from Pact Magic slots.'],
[12,'Ability Score Improvement','Choose a qualifying feat or improve ability scores.'],
[13,'Mystic Arcanum (level 7)','Choose one level-seven Warlock spell to cast once per Long Rest without a slot.'],
[14,'Subclass Feature','Your patron grants its final subclass feature at level 14.'],
[15,'Mystic Arcanum (level 8)','Choose one level-eight Warlock spell to cast once per Long Rest without a slot.'],
[16,'Ability Score Improvement','Choose a qualifying feat or improve ability scores.'],
[17,'Mystic Arcanum (level 9)','Choose one level-nine Warlock spell to cast once per Long Rest without a slot.'],
[18,'Eldritch Invocations','You gain the final invocation capacity shown by the Warlock class progression table.'],
[19,'Epic Boon','Choose an eligible Epic Boon feat; the benefits depend on which boon you choose.'],
[20,'Eldritch Master','Regain your expended Pact Magic spell slots with Magical Cunning, rather than only half.']
].map(([level,name,description])=>({level:level as number,name:name as string,description:description as string,source:'class' as const}));
const CLASS_MILESTONES:Record<string,Record<number,string>>={
barbarian:{4:'Ability Score Improvement',5:'Extra Attack and Fast Movement',7:'Feral Instinct',9:'Brutal Strike',11:'Relentless Rage',15:'Persistent Rage',18:'Indomitable Might',20:'Primal Champion'},
bard:{4:'Ability Score Improvement',5:'Font of Inspiration',7:'Countercharm',9:'Expertise',10:'Magical Secrets',18:'Superior Inspiration',20:'Words of Creation'},
cleric:{4:'Ability Score Improvement',5:'Sear Undead',7:'Blessed Strikes',10:'Divine Intervention',14:'Improved Blessed Strikes',20:'Greater Divine Intervention'},
druid:{4:'Ability Score Improvement',5:'Wild Resurgence',7:'Elemental Fury',10:'Elemental Fury Improvement',18:'Beast Spells',20:'Archdruid'},
fighter:{4:'Ability Score Improvement',5:'Extra Attack',6:'Ability Score Improvement',9:'Tactical Master',11:'Two Extra Attacks',13:'Studied Attacks',14:'Ability Score Improvement',17:'Action Surge Improvement',20:'Three Extra Attacks'},
monk:{4:'Ability Score Improvement',5:'Extra Attack and Stunning Strike',6:'Empowered Strikes',7:'Evasion',10:'Heightened Focus',13:'Deflect Energy',14:'Disciplined Survivor',18:'Superior Defense',20:'Body and Mind'},
paladin:{4:'Ability Score Improvement',5:'Extra Attack and Faithful Steed',6:'Aura of Protection',9:'Abjure Foes',10:'Aura of Courage',14:'Restoring Touch',18:'Aura Expansion'},
ranger:{4:'Ability Score Improvement',5:'Extra Attack',6:'Roving',9:'Expertise',10:'Tireless',13:'Relentless Hunter',14:'Nature’s Veil',17:'Precise Hunter',18:'Feral Senses',20:'Foe Slayer'},
rogue:{4:'Ability Score Improvement',5:'Cunning Strike and Uncanny Dodge',7:'Evasion and Reliable Talent',9:'Subclass Feature',10:'Ability Score Improvement',11:'Improved Cunning Strike',14:'Devious Strikes',15:'Slippery Mind',18:'Elusive',20:'Stroke of Luck'},
sorcerer:{4:'Ability Score Improvement',5:'Sorcerous Restoration',7:'Sorcery Incarnate',10:'Metamagic',17:'Metamagic',20:'Arcane Apotheosis'},
wizard:{4:'Ability Score Improvement',5:'Memorize Spell',7:'Spellcasting Progression',10:'Subclass Feature',14:'Subclass Feature',18:'Spell Mastery',20:'Signature Spells'}
};
const WARLOCK_PATRON_FEATURES:Record<string,Record<number,[string,string]>>={
 Archfey:{3:['Steps of the Fey','Your patron grants Misty Step and Fey-themed effects that alter how you escape, reposition, or affect enemies. The exact number of free casts and riders depend on the feature rules.'],6:['Misty Escape','Use a reaction-based magical escape when threatened, with a teleportation benefit that helps avoid follow-up danger.'],10:['Beguiling Defenses','Gain defensive magic against charm and a way to turn hostile enchantment back on its source.'],14:['Bewitching Magic','Your patron strengthens the interaction between enchantment or illusion magic and your Fey Step mobility.']},
 Celestial:{3:['Healing Light','Gain a separate pool of healing dice you can spend as a Bonus Action to heal creatures within range; the pool grows with Warlock level.'],6:['Radiant Soul','Gain additional resilience and improve eligible radiant or fire spell damage using your Charisma modifier.'],10:['Celestial Resilience','Gain Temporary Hit Points after a rest and share protective vitality with allies.'],14:['Searing Vengeance','When near defeat, unleash radiant power to recover and disrupt enemies, subject to its rest limit.']},
 Fiend:{3:['Dark One’s Blessing','When a nearby hostile creature drops to zero Hit Points, gain Temporary Hit Points based on Charisma and Warlock level.'],6:['Dark One’s Own Luck','Improve a failed ability check or saving throw with an additional die, subject to limited uses.'],10:['Fiendish Resilience','Choose a damage resistance that can be changed under the feature’s rules.'],14:['Hurl Through Hell','After hitting a creature, temporarily banish it through a terrifying extraplanar experience and potentially deal psychic damage.']},
 'Great Old One':{3:['Awakened Mind and Psychic Spells','Gain telepathic communication and alter certain Warlock spells to express psychic influence; your patron spell list broadens mental and alien magic.'],6:['Clairvoyant Combatant','Turn telepathic connection into an offensive or defensive advantage against a linked creature.'],10:['Eldritch Hex','Improve the pressure your Hex places on a target and deepen your psychic influence.'],14:['Create Thrall','Use powerful mental magic to dominate or bind another creature under the feature’s restrictions.']}
};
const CLASS_FEATURE_EXPLANATIONS:Record<string,string>={
'Extra Attack':'When you take the Attack action, make additional weapon attacks according to your class progression. This increases your reliable martial output without spending a spell slot.',
'Ability Score Improvement':'At this level you can choose a feat for which you qualify, including Ability Score Improvement. The forecast models provisional ability increases but does not yet apply other feat mechanics.',
'Epic Boon':'Choose a qualifying Epic Boon feat. This high-level benefit is a real character choice; its exact effects are not included in the projected statistics.',
'Feral Instinct':'Your battle-hardened senses help you act quickly when combat begins, making it harder for enemies to catch you unprepared.',
'Brutal Strike':'Trade away part of Reckless Attack’s accuracy benefit to add damage and a tactical effect to a Strength-based attack while raging.',
'Relentless Rage':'Your Rage can keep you standing after damage would otherwise reduce you to zero Hit Points, subject to a Constitution saving throw.',
'Persistent Rage':'Your Rage becomes easier to maintain through difficult encounters and supports sustained frontline pressure.',
'Indomitable Might':'Your extraordinary physical strength improves the reliability of Strength ability checks.',
'Primal Champion':'Your physical potential increases beyond ordinary mortal limits, dramatically improving Strength and Constitution.',
'Font of Inspiration':'Bardic Inspiration becomes easier to recover, allowing you to support allies more consistently between rests.',
'Countercharm':'Use your performance and magic to help creatures resist or recover from certain mental effects.',
'Expertise':'Double your Proficiency Bonus for selected skill proficiencies, improving the reliability of those skills.',
'Magical Secrets':'Broaden your Bard spell options by choosing spells from other class lists according to the feature’s restrictions.',
'Sear Undead':'Your Channel Divinity gains an offensive effect against undead creatures you turn.',
'Blessed Strikes':'Enhance either weapon attacks or cantrip damage with divine power, depending on the option selected.',
'Divine Intervention':'Call upon your deity for extraordinary magical aid, within the feature’s stated limitations.',
'Improved Blessed Strikes':'Your selected Blessed Strikes benefit grows stronger at higher Cleric levels.',
'Greater Divine Intervention':'Your divine connection enables a more powerful form of intervention with significant limitations on reuse.',
'Wild Resurgence':'Exchange spellcasting resources and Wild Shape uses to regain flexibility when one resource runs low.',
'Elemental Fury':'Choose a nature-themed offensive benefit that improves weapon or cantrip damage.',
'Elemental Fury Improvement':'Your selected Elemental Fury option becomes more effective at higher levels.',
'Beast Spells':'Cast spells while using Wild Shape, expanding what you can do while transformed.',
'Archdruid':'Your mastery of Wild Shape and nature magic greatly improves resource availability.',
'Tactical Master':'Apply tactical Weapon Mastery properties to eligible attacks for greater battlefield control.',
'Studied Attacks':'Learn from missed attacks, improving the accuracy of your next attempt against the same target.',
'Action Surge Improvement':'Your signature extra-action resource becomes available more often.',
'Stunning Strike':'Spend Focus to attempt to stun a target hit by your Unarmed Strike, subject to its saving throw.',
'Empowered Strikes':'Your Unarmed Strikes overcome certain defenses and improve their damage potential.',
'Evasion':'Avoid or reduce damage from effects that allow Dexterity saving throws, depending on the outcome.',
'Heightened Focus':'Your Focus-powered combat techniques improve and offer additional tactical options.',
'Deflect Energy':'Your defensive reaction becomes useful against more kinds of incoming damage.',
'Disciplined Survivor':'Your discipline improves saving throws and your ability to withstand dangerous effects.',
'Superior Defense':'Spend Focus for a potent short-lived defensive state.',
'Body and Mind':'Your mastery of body and spirit increases key ability scores beyond ordinary limits.',
'Faithful Steed':'Gain access to a magical mount through your Paladin spellcasting.',
'Aura of Protection':'You and nearby allies gain a bonus to saving throws based on your Charisma modifier while within your aura.',
'Abjure Foes':'Channel divine power to disrupt and frighten enemies, limiting their options in combat.',
'Aura of Courage':'Your presence helps protect nearby allies from fear.',
'Restoring Touch':'Use Lay on Hands to remove additional harmful conditions.',
'Aura Expansion':'Your Paladin auras protect a wider area.',
'Roving':'Your movement improves, helping you traverse varied terrain.',
'Tireless':'Gain restorative resilience and reduce the effects of exhaustion.',
'Relentless Hunter':'Maintain your signature hunting magic more reliably under pressure.',
'Nature’s Veil':'Use primal magic to become harder for enemies to perceive.',
'Precise Hunter':'Improve the accuracy of attacks against your chosen quarry.',
'Feral Senses':'Your senses help you fight enemies you cannot see.',
'Foe Slayer':'Your expertise at pursuing marked enemies reaches its highest level.',
'Cunning Strike':'Trade some Sneak Attack damage dice for a tactical effect on a qualifying hit.',
'Uncanny Dodge':'Use your reaction to reduce damage from an attack you can perceive.',
'Reliable Talent':'Treat low d20 results as more reliable when making checks with skills or tools in which you are proficient.',
'Improved Cunning Strike':'Use additional Cunning Strike options as your precision improves.',
'Devious Strikes':'Unlock more powerful Sneak Attack tradeoffs that hinder enemies.',
'Slippery Mind':'Gain stronger mental resilience and saving throw proficiency.',
'Elusive':'Make it harder for enemies to gain advantage on attacks against you.',
'Stroke of Luck':'Turn a crucial failed attempt into a success within the feature’s limits.',
'Sorcerous Restoration':'Regain a portion of your magical resource pool when you rest.',
'Sorcery Incarnate':'Improve the flexibility of Metamagic while your innate magic is active.',
'Metamagic':'Learn additional ways to alter spells using Sorcery Points, such as changing their range, timing, or targets.',
'Arcane Apotheosis':'Your innate magical power reaches its peak, making your signature spell-altering techniques more efficient.',
'Memorize Spell':'Adjust one prepared Wizard spell after a Short Rest, giving your spellbook greater day-to-day flexibility.',
'Spellcasting Progression':'Your spellcasting advances, unlocking stronger spells and additional spell slots according to the Wizard progression table.',
'Spell Mastery':'Choose eligible low-level spells that you can cast repeatedly without expending slots under the feature’s rules.',
'Signature Spells':'Choose favored higher-level spells that are always prepared and can be cast without a slot a limited number of times.',
'Fast Movement':'Your movement speed increases while you meet the feature’s armor restrictions.',
'Two Extra Attacks':'You can make three attacks when you take the Attack action.',
'Three Extra Attacks':'You can make four attacks when you take the Attack action.',
'Superior Inspiration':'Recover Bardic Inspiration when you would otherwise begin a fight without it.',
'Words of Creation':'Your mastery of Bard magic enables extraordinary high-level spellcasting.'
};
/** Display metadata only; none of these entries grants a gameplay effect. */
export const VERIFIED_MILESTONE_DETAILS:Record<string,{description:string;activation:string}>={
 'Countercharm':{description:'When you or a creature within 30 feet fails a saving throw against Charmed or Frightened, use a Reaction to cause the save to be rerolled with Advantage.',activation:'Reaction'},
 'Sear Undead':{description:'When Turn Undead succeeds, eligible Undead also take Radiant damage determined by your Wisdom modifier and Cleric level.',activation:'Channel Divinity'},
 'Blessed Strikes':{description:'Choose Divine Strike or Potent Spellcasting to enhance your weapon or cantrip damage as your Cleric advances.',activation:'On hit / spellcasting'},
 'Improved Blessed Strikes':{description:'Improve the Blessed Strikes option you selected at the earlier Cleric level.',activation:'Passive'},
 'Elemental Fury':{description:'Choose Potent Spellcasting or Primal Strike to improve your Druid spellcasting or weapon and Wild Shape attacks.',activation:'On attack / spellcasting'},
 'Elemental Fury Improvement':{description:'Improve the Elemental Fury option selected at level 7, increasing its effectiveness without granting the unselected option.',activation:'Passive'},
 'Tactical Master':{description:'When attacking with a mastered weapon, you can replace its Push, Sap, or Slow mastery property with another of those three.',activation:'On attack'},
 'Studied Attacks':{description:'After missing a creature with an attack roll, gain Advantage on your next attack roll against that creature before the end of your next turn.',activation:'On miss'},
 'Action Surge Improvement':{description:'Gain an additional use of Action Surge; the uses return when you finish a Short or Long Rest.',activation:'Short or Long Rest'},
 'Two Extra Attacks':{description:'Make three attacks instead of one when taking the Attack action.',activation:'Attack action'},
 'Three Extra Attacks':{description:'Make four attacks instead of one when taking the Attack action.',activation:'Attack action'},
 'Deflect Energy':{description:'Your Deflect Attacks feature can also reduce eligible damage types beyond physical attacks.',activation:'Reaction'},
 'Disciplined Survivor':{description:'Gain proficiency in all saving throws, with a limited ability to reroll failed saving throws.',activation:'On failed save'},
 'Superior Defense':{description:'Spend Focus Points to gain Resistance to most damage types for a limited duration.',activation:'Bonus Action'},
 'Nature’s Veil':{description:'Expend a use of Nature’s Veil to become Invisible briefly without casting a spell.',activation:'Bonus Action'},
 'Tireless':{description:'Gain temporary Hit Points using a limited-use Magic action and recover Exhaustion more effectively after a Short Rest.',activation:'Magic Action / Short Rest'},
 'Relentless Hunter':{description:'Taking damage no longer breaks Concentration on Hunter’s Mark.',activation:'Passive'},
 'Precise Hunter':{description:'Gain Advantage on attack rolls against the creature currently marked by your Hunter’s Mark.',activation:'On attack'},
 'Feral Senses':{description:'Gain Blindsight out to 30 feet.',activation:'Passive'},
 'Improved Cunning Strike':{description:'Apply up to two Cunning Strike effects to one eligible Sneak Attack, paying the dice cost of both.',activation:'On Sneak Attack'},
 'Devious Strikes':{description:'Unlock additional Cunning Strike options with higher Sneak Attack dice costs.',activation:'On Sneak Attack'},
 'Elusive':{description:'Attack rolls cannot have Advantage against you while you are not Incapacitated.',activation:'Passive'},
 'Sorcery Incarnate':{description:'While Innate Sorcery is active, you can apply up to two Metamagic options to a spell, within their individual restrictions.',activation:'When casting'},
 'Memorize Spell':{description:'After a Short Rest, replace one prepared Wizard spell with another eligible spell in your spellbook.',activation:'Short Rest'},
 'Spell Mastery':{description:'Choose one eligible level-one and one level-two Wizard spell to cast at their lowest level without expending slots, subject to the feature’s limits.',activation:'Spellcasting'},
 'Signature Spells':{description:'Choose two level-three Wizard spells; they are always prepared and each can be cast once without a slot per Short or Long Rest.',activation:'Spellcasting / rest'},
 'Font of Inspiration':{description:'Recover Bardic Inspiration uses on a Short or Long Rest, and expend spell slots to regain additional uses.',activation:'Rest / resource'},
 'Magical Secrets':{description:'When preparing Bard spells, select qualifying spells from the Cleric, Druid, or Wizard spell lists as permitted by the feature.',activation:'Spell preparation'},
 'Divine Intervention':{description:'Invoke a qualifying Cleric spell of level 5 or lower without expending a slot or material components, within the feature’s use limits.',activation:'Magic Action'},
 'Wild Resurgence':{description:'Exchange spell slots and Wild Shape uses under the feature’s stated restrictions.',activation:'Resource'},
 'Beast Spells':{description:'Cast spells while in Wild Shape, subject to the feature’s material-component restrictions.',activation:'Spellcasting'},
 'Primal Champion':{description:'Increase Strength and Constitution by 4, to a maximum of 25 each.',activation:'Passive'},
 'Indomitable Might':{description:'When a Strength check or saving throw total is lower than your Strength score, use the score instead.',activation:'On check / save'},
 'Stroke of Luck':{description:'Turn an eligible failed d20 Test into a success, subject to the Rogue feature’s recovery limit.',activation:'On failed d20 Test'},
};
function classMilestoneDescription(name:string):string{
 const parts=name.split(' and ');
 const details=parts.map(part=>VERIFIED_MILESTONE_DETAILS[part]?.description??CLASS_FEATURE_EXPLANATIONS[part]??'This milestone is recorded in the advancement catalog; detailed rules and gameplay support have not been verified.');
 return details.join(' ');
}
const SUBCLASS_TIER_GUIDE:Record<string,string[]>={
barbarian:['Your chosen primal path changes how Rage affects combat, protection, or movement.','Your path strengthens its distinctive combat and exploration benefits.','A further primal-path feature expands your tactical or defensive options.','Your path reaches its defining high-level expression.'],
bard:['Your college grants a distinctive use for Bardic Inspiration and a new performance identity.','Your college deepens its signature support, combat, or enchantment abilities.','Your college grants a major high-level ability built around its specialty.'],
cleric:['Your domain grants divine spells and a Channel Divinity-related specialty.','Your domain expands its divine protection, healing, or offensive powers.','Your domain unlocks its highest-level defining benefit.'],
druid:['Your circle transforms how you use Wild Shape, nature magic, or terrain.','Your circle strengthens its core nature-magic specialty.','Your circle grants a further combat or exploration improvement.','Your circle unlocks a major high-level nature feature.'],
fighter:['Your archetype grants a distinct combat system or technique.','Your archetype develops new tactical or magical capabilities.','Your archetype improves its signature combat style.','Your archetype grants another advanced combat option.','Your archetype reaches its final defining feature.'],
monk:['Your tradition grants a specialized way to spend Focus and fight.','Your tradition expands its distinctive techniques.','Your tradition grants a powerful advanced technique.','Your tradition reaches its signature high-level mastery.'],
paladin:['Your oath grants oath spells and a Channel Divinity option.','Your oath grants an aura or other protective presence.','Your oath expands its supernatural combat and support benefits.','Your oath grants a powerful temporary transformation or capstone.'],
ranger:['Your archetype grants specialized hunting, companion, or supernatural abilities.','Your archetype improves its survival and combat techniques.','Your archetype grants a more advanced signature ability.','Your archetype reaches its highest-level hunting specialty.'],
rogue:['Your archetype changes how you use skills, Sneak Attack, or special resources.','Your archetype deepens its infiltration or combat techniques.','Your archetype grants an advanced specialty feature.','Your archetype reaches its defining high-level trick.'],
sorcerer:['Your origin grants bonus spells and a distinctive magical benefit.','Your origin develops its supernatural resilience or manipulation.','Your origin grants a powerful new magical expression.','Your origin reaches its highest-level signature ability.'],
wizard:['Your school grants a distinctive approach to preparing and using spells.','Your school improves its specialized magic.','Your school grants a powerful spellcasting feature.','Your school reaches its advanced mastery.']
};
const SUBCLASS_LEVELS:Record<string,number[]>={bard:[3,6,14],cleric:[3,6,17],druid:[3,6,10,14],fighter:[3,7,10,15,18],monk:[3,6,11,17],paladin:[3,7,15,20],ranger:[3,7,11,15],rogue:[3,9,13,17],sorcerer:[3,6,14,18],warlock:[3,6,10,14],wizard:[3,6,10,14],barbarian:[3,6,10,14]};
export function progressionFeatures(classId:string,level:number,subclassName?:string):AdvancementFeature[]{
 const features:AdvancementFeature[]=[];
 if(classId==='warlock')features.push(...WARLOCK.filter(x=>x.level===level));
 else{
  const name=CLASS_MILESTONES[classId]?.[level];
  if(name)features.push({level,name,description:classMilestoneDescription(name),source:'class'});
  if([4,8,12,16].includes(level)&&!features.some(x=>x.name==='Ability Score Improvement'))features.push({level,name:'Ability Score Improvement',description:'Choose a qualifying feat or an ability score increase; this forecast can model a provisional ability increase.',source:'class'});
  if(level===19)features.push({level,name:'Epic Boon',description:'Choose an eligible Epic Boon feat at level 19. Its effects are not included in the current projection.',source:'class'});
 }
 if(subclassName&&SUBCLASS_LEVELS[classId]?.includes(level)){const subclass=SUBCLASSES.find(s=>s.classId===classId&&s.name===subclassName);const entry=subclass?subclassFeatureAt(subclass.id,level):undefined;const specific=classId==='warlock'?WARLOCK_PATRON_FEATURES[subclassName]?.[level]:undefined;features.push({level,name:entry?.name??specific?.[0]??subclassName+' feature',description:(specific?.[1]??entry?.description??SUBCLASS_TIER_GUIDE[classId]?.[SUBCLASS_LEVELS[classId].indexOf(level)]??'This subclass grants an additional specialty feature.')+' Feature name and mechanics are provisional until verified against the 2024 rules. No mechanical effect is applied to the projected statistics.',source:'subclass'});}
 return features;
}
export function mysticArcanumLevel(warlockLevel:number):number[]{return [11,13,15,17].filter(l=>warlockLevel>=l).map(l=>6+(l-11)/2)}

/** Display-only earned class milestones. Never changes a character's rules state. */
export function earnedClassMilestones(classId:string,level:number,existing:{level:number;names:string[]}[]):AdvancementFeature[]{
 const capped=Number.isFinite(level)?Math.max(1,Math.min(20,Math.floor(level))):1;
 return Array.from({length:capped-1},(_,index)=>index+2).flatMap(atLevel=>progressionFeatures(classId,atLevel).filter(feature=>feature.source==='class')).filter(feature=>!existing.some(group=>group.level<=feature.level&&group.names.includes(feature.name)));
}
