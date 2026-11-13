import type {CharacterDraft} from '../app/CharacterCreator';
import {validPlayerState,validCampaignBuild} from './playerState';
import type {CompanionEncounter} from './companionEncounter';
import type {AdventureSession} from './adventureSession';
import {finishSubclassRest,resolveSubclassDamage,canApplyCondition,selectFiendResistance,spendDarkOnesOwnLuck,type SubclassCombatState,type DamageType,type Terrain} from './subclassCombatRules';
import { prototypeNighthawk, abilityModifier, type CharacterStats, type Skill, skillAbility } from './checks';
import { emptyWorld, mergeWorld, normalizeWorld, type WorldState } from './world';
export interface JournalEntry { id: string; text: string; createdAt: string; kind: 'note' | 'system' | 'player' | 'dm' }
export interface Campaign {
  schemaVersion: 1;
  /** Original reviewed build; independent of later draft edits and advancement plans. */
  characterBuild?:CharacterDraft;
  importedSubclassId?:string;
  /** Confirmed feats from actual imported-character level-ups; forecasts never grant combat effects. */
  importedEarnedFeats?:{level:number;name:string;ability?:string;legacyApproved:boolean}[];
  /** Reserved for future non-Nighthawk actors; never implicitly applied to the Rogue prototype. */
  subclassActors?:Record<string,SubclassCombatState>;
  companionEncounter?:CompanionEncounter;
  adventureSession?:AdventureSession;
  pendingMerchantPurchase?:{id:string;itemId:string;quantity:number;unitCostCp:number};
  merchantStockRemaining?:Record<string,number>;
  merchantDiscount?:{itemId:string;percent:number;approvalId:string};
  pendingMerchantNegotiation?:{itemId:string;checkToken:string};
  completedMerchantPurchaseIds?:string[];
  characterIdentity?:{name:string;speciesId:string;lineageId?:string;backgroundId:string;classId:string;draftId:string;pronouns:string;appearance:string;personality:string;backstory:string};
  /** Explicitly verified equipped items from the shared equipment catalog; distinct from carried inventory. */
  importedWarlockInvocations?:string[];
  importedWarlockPactSlotLevel?:number;
  importedWizardSpellbook?:string[];
  importedWizardPortents?:number[];
  encounterLoadout?:{weaponId?:string;armorId?:string;shieldId?:string};
  id: string;
  title: string;
  location: string;
  mapLocation?: 'frontier'|'crossroads'|'watchtower';
  mapDiscovered?: string[];
  createdAt: string;
  updatedAt: string;
  journal: JournalEntry[];
  combatAdjudication?: {id:string;kind:'skill'|'ready';detail:string;createdAt:string};
  worldFacts?: string[];
  pendingAdventureAction?:{id:string;message:string;createdAt:string};
  pendingClarification?:{actionId:string;question:string;answer?:string};
  world?: WorldState;
  character?: CharacterStats;
  preReconciliationScores?: CharacterStats['scores'];
  elapsedMinutes?: number;
  hitDiceRemaining?: number;
  lastLongRestCompletedAt?: number;
  concentration?: { spell: string; target?: string; startedAt: string };
  spellEffects?: { id: string; spell: string; target?: string; status: 'awaiting-adjudication' | 'active'; createdAt: string }[];
  familiar?: { form: 'Owl'; summonedAt: string; status?: 'active'|'dismissed'|'destroyed'; hp?: number };
  equipment?: {daggers:number;arrows:number;caltrops:number;ballBearings:number};
  inventoryLedger?: {currency:{CP:number;SP:number;EP:number;GP:number;PP:number};gear:{name:string;quantity:number}[]};
  xp?: number;
  xpAwards?: { id: string; amount: number; reason: string }[];
  levelOneSnapshot?: { character: CharacterStats; xp: number; xpAwards: { id: string; amount: number; reason: string }[] };
  encounterRecaps?: {id:string;date:string;outcome:string;rounds:number;damage:number;movement:number;attacks:number;hits:number;criticalHits:number;sneakDamage:number;finishingBlows:number}[];
  combat?: { owl?:{position:{x:number;y:number};hp:number;movementUsed:number;actionUsed:boolean;helpTarget?:'first'|'second';helpRound?:number}; stats?:{damage:number;movement:number;attacks:number;hits:number;criticalHits:number;sneakDamage:number;finishingBlows:number}; journalStartIndex?:number; status:'awaiting-initiative'|'initiative-set'|'completed'; enemyName:string; enemyInitiative:number; selectedEnemy?:'first'|'second'; secondEnemy?:{name:string;initiative:number;position:{x:number;y:number};hp:number;maxHp:number;detected:boolean;prone?:boolean;grappled?:boolean}; playerInitiative?:number; round:number; order?:string[]; turnIndex?:number; movementUsed?:number; actionUsed?:boolean; bonusActionUsed?:boolean; spellSlotExpendedThisTurn?:boolean; pendingSpellSave?:{spell:'Mind Sliver'|'Tasha’s Hideous Laughter';target:'first'|'second'}; mindSliverPenalty?:{target:'first'|'second';expiresRound:number}; laughterTarget?:'first'|'second'; lastSpellSave?:{spell:string;target:string;roll:number;total:number;dc:number;success:boolean;damage?:number}; lastAction?:string; arrowsRemaining?:number; daggersAvailable?:number; daggersThrown?:number; reactionUsed?:boolean; enemyReactionUsed?:boolean; secondEnemyReactionUsed?:boolean; playerOpportunity?:{route?:{x:number;y:number}[];routeIndex?:number;remainingEnemyIds?:('first'|'second')[];enemyId?:'first'|'second';from:{x:number;y:number};to:{x:number;y:number};cost:number;phase:'roll-to-hit'|'roll-damage'|'resolved';d20?:number;total?:number;hit?:boolean;damage?:number;critical?:boolean}; reactionAttack?:{phase:'roll-to-hit'|'roll-damage'|'resolved';d20?:number;total?:number;hit?:boolean;critical?:boolean;damage?:number}; opportunity?:{from:{x:number;y:number};to:{x:number;y:number}}; attack?:{target?:'first'|'second';trueStrike?:boolean;weapon?:'dagger'|'shortbow'; thrown?:boolean; disadvantage?:boolean; phase:'roll-to-hit'|'roll-damage'|'resolved'; d20?:number; firstD20?:number; total?:number; hit?:boolean; critical?:boolean; damage?:number; weaponDamageRolls?:number[]; sneakAttackRolls?:number[]; sneakAttackDamage?:number; advantage?:boolean; secondD20?:number}; steadyAim?:boolean; movementAllowance?:number; disengaged?:boolean; enemyHp?:number; enemyMaxHp?:number; outcome?:'nonlethal-victory'|'player-defeated'; enemyLastTurn?:string; trainingStartingHp?:number; playerPosition?:{x:number;y:number}; enemyPosition?:{x:number;y:number}; trainingAllyAdjacent?:boolean; enemyProne?:boolean; enemyGrappled?:boolean; lastGrappleResult?:string; playerProne?:boolean; playerGrappled?:boolean; playerHidden?:boolean; hideRoll?:number; hideTotal?:number; hideResult?:string; enemySearchResult?:string; lastSkillAction?:{action:'Search'|'Study'|'Influence';skill:string;roll:number;total:number;description:string}; readiedAction?:{trigger:string;response:string;declaredRound:number;weapon?:'dagger'|'throw-dagger'|'shortbow';spell?:'Mind Sliver'}; pendingEnemyGrapple?:boolean; pendingPlayerEscape?:boolean; lastPlayerGrappleResult?:string; pendingEnemyShove?:boolean; lastPlayerShoveSave?:string; lastShoveSave?:{passed:boolean;dc:number;outcome:'prone'|'push';effectApplied:boolean}; sneakAttackUsedThisTurn?:boolean; sneakAttackEligible?:boolean };
  pendingAftermath?: { opponent: string; playerDefeated: boolean };
  pendingCheck?: { skill: string; mode: 'normal' | 'advantage' | 'disadvantage'; reason: string; token: string; dice?: number[] };
}
export function newCampaign(title: string, id: string = crypto.randomUUID(), now: string = new Date().toISOString()): Campaign {
  const clean = title.trim();
  if (!clean) throw new Error('Campaign name is required');
  return { schemaVersion: 1, id, title: clean, location: 'Frontier Village', createdAt: now, updatedAt: now, worldFacts: [], world: emptyWorld(), character: structuredClone(prototypeNighthawk), xp: 0, xpAwards: [], journal: [
    { id: id + '-intro', kind: 'system', text: 'Your adventure begins on the road to the frontier village.', createdAt: now },
  ] };
}
export function addNote(campaign: Campaign, text: string, id: string = crypto.randomUUID(), now: string = new Date().toISOString()): Campaign {
  const clean = text.trim();
  if (!clean) return campaign;
  return { ...campaign, updatedAt: now, journal: [...campaign.journal, { id, kind: 'note', text: clean, createdAt: now }] };
}
export function isCampaign(value: unknown): value is Campaign {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<Campaign>;
  return validCampaignBuild(c) && c.schemaVersion === 1 && typeof c.id === 'string' && typeof c.title === 'string'
    && typeof c.location === 'string' && typeof c.createdAt === 'string'
    && typeof c.updatedAt === 'string' && (c.character === undefined || (typeof c.character === 'object' && c.character !== null && validPlayerState(c.character) && ['str','dex','con','int','wis','cha'].every(a => Number.isInteger(c.character?.scores?.[a as keyof CharacterStats['scores']]) && c.character!.scores[a as keyof CharacterStats['scores']] >= 1 && c.character!.scores[a as keyof CharacterStats['scores']] <= 30) && Number.isInteger(c.character.proficiencyBonus) && c.character.proficiencyBonus >= 2 && c.character.proficiencyBonus <= 9 && Array.isArray(c.character.proficientSkills) && c.character.proficientSkills.every(s => typeof s === 'string'))) && (c.characterIdentity === undefined || (typeof c.characterIdentity.name === 'string' && c.characterIdentity.name.trim().length > 0 && typeof c.characterIdentity.classId === 'string' && typeof c.characterIdentity.speciesId === 'string' && typeof c.characterIdentity.backgroundId === 'string' && typeof c.characterIdentity.draftId === 'string'))
    && (c.adventureSession === undefined || (['exploring','encounter'].includes(c.adventureSession.status) && ['frontier','crossroads','watchtower'].includes(c.adventureSession.site) && c.adventureSession.characterSource === 'campaign-character' && Array.isArray(c.adventureSession.visited) && c.adventureSession.visited.every(site => ['frontier','crossroads','watchtower'].includes(site)) && Array.isArray(c.adventureSession.interactions) && c.adventureSession.interactions.every(entry => ['frontier','crossroads','watchtower'].includes(entry.site) && typeof entry.choice === 'string' && typeof entry.response === 'string')))
    && (c.xp === undefined || (Number.isInteger(c.xp) && c.xp >= 0)) && (c.xpAwards === undefined || (Array.isArray(c.xpAwards) && c.xpAwards.every(a => typeof a.id === 'string' && Number.isInteger(a.amount) && a.amount > 0 && typeof a.reason === 'string'))) && (c.pendingCheck === undefined || (typeof c.pendingCheck.skill === 'string' && typeof c.pendingCheck.token === 'string' && typeof c.pendingCheck.reason === 'string' && ['normal','advantage','disadvantage'].includes(c.pendingCheck.mode) && (c.pendingCheck.dice === undefined || (Array.isArray(c.pendingCheck.dice) && c.pendingCheck.dice.every(n => Number.isInteger(n) && n >= 1 && n <= 20))))) && (c.world === undefined || JSON.stringify(normalizeWorld(c.world)) === JSON.stringify(c.world)) && (c.pendingClarification === undefined || (typeof c.pendingClarification.actionId === 'string' && typeof c.pendingClarification.question === 'string' && (c.pendingClarification.answer === undefined || typeof c.pendingClarification.answer === 'string'))) && (c.pendingAdventureAction === undefined || (typeof c.pendingAdventureAction.id === 'string' && typeof c.pendingAdventureAction.message === 'string' && typeof c.pendingAdventureAction.createdAt === 'string')) && (c.worldFacts === undefined || (Array.isArray(c.worldFacts) && c.worldFacts.every((fact) => typeof fact === 'string'))) && Array.isArray(c.journal)
    && c.journal.every((entry) => entry && typeof entry.id === 'string' && typeof entry.text === 'string'
      && typeof entry.createdAt === 'string' && (entry.kind === 'note' || entry.kind === 'system' || entry.kind === 'player' || entry.kind === 'dm'));
}

export function addExchange(campaign: Campaign, player: string, dm: string, now: string = new Date().toISOString(), newFacts: string[] = [], worldUpdates?: unknown, pendingCheck?: Campaign['pendingCheck']): Campaign {
  const prior = campaign.worldFacts ?? [];
  const merged = [...prior];
  for (const fact of newFacts) {
    const clean = fact.trim().slice(0, 220);
    if (clean && !merged.some((existing) => existing.toLowerCase() === clean.toLowerCase())) merged.push(clean);
  }
  return { ...campaign, worldFacts: merged.slice(-60), world: mergeWorld(campaign.world, worldUpdates), pendingCheck, updatedAt: now, journal: [...campaign.journal,
    { id: crypto.randomUUID(), kind: 'player', text: player, createdAt: now },
    { id: crypto.randomUUID(), kind: 'dm', text: dm, createdAt: now },
  ] };
}

export function addRoll(campaign: Campaign, description: string, now: string = new Date().toISOString()): Campaign {
  return { ...campaign, updatedAt: now, journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: description, createdAt: now }] };
}

export function enemyHealthDescription(hp:number,maxHp:number):string{
 return hp<=0?'Defeated':hp<=maxHp/2?'Bloodied':'Standing';
}
/** Redact historical enemy HP disclosures from player-facing journal entries. */
export function publicCombatText(message:string):string{
 return message
  .replace(/(?:Dummy|Opponent|Enemy|Training Dummy(?: 2)?) HP:\s*\d+\s*\/\s*\d+/gi,'Enemy health: concealed')
  .replace(/\bHP\s+\d+\s*\/\s*12\b/g,'Enemy health concealed')
  .replace(/\b(?:Dummy|Opponent|Enemy)\s+(?:has|at)\s+\d+\s*(?:\/\s*\d+)?\s*HP\b/gi,'Enemy health concealed');
}
export const xpThresholds = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
export function awardExperience(campaign: Campaign, amount: number, reason: string, awardId: string): Campaign {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000 || !reason.trim() || !awardId.trim()) throw new Error('Invalid XP award');
  if (campaign.xpAwards?.some(a => a.id === awardId)) return campaign;
  const awards = [...(campaign.xpAwards ?? []), { id: awardId, amount, reason: reason.trim().slice(0,180) }];
  const xp = (campaign.xp ?? 0) + amount;
  if (!Number.isSafeInteger(xp)) throw new Error('XP exceeds safe range');
  return { ...campaign, xp, xpAwards: awards, updatedAt: new Date().toISOString(), journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: '+' + amount + ' XP — ' + reason.trim().slice(0,180), createdAt: new Date().toISOString() }] };
}
export function levelUpRogue(campaign: Campaign, hpGain: number): Campaign {
  requireRogue(campaign);
  const character = campaign.character ?? structuredClone(prototypeNighthawk);
  const level = character.level ?? 1;
  if (level !== 1 || (campaign.xp ?? 0) < xpThresholds[1]) throw new Error('Level 2 is not unlocked');
  if (hpGain !== 7 && (!Number.isInteger(hpGain) || hpGain < 3 || hpGain > 10)) throw new Error('Invalid Rogue hit point increase');
  const next = { ...character, level: 2, maxHitPoints: (character.maxHitPoints ?? 10) + hpGain, currentHitPoints: Math.min((character.currentHitPoints ?? 10) + hpGain, (character.maxHitPoints ?? 10) + hpGain) };
  return { ...campaign, character: next, updatedAt: new Date().toISOString(), journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: 'Nighthawk reached Rogue Level 2. Gained Cunning Action and ' + hpGain + ' maximum hit points.', createdAt: new Date().toISOString() }] };
}

export const tricksterCantrips = ['Acid Splash','Blade Ward','Chill Touch','Dancing Lights','Elementalism','Fire Bolt','Friends','Light','Mage Hand','Mending','Message','Mind Sliver','Minor Illusion','Poison Spray','Prestidigitation','Ray of Frost','Shocking Grasp','True Strike'] as const;
export const tricksterSpells = ['Alarm','Burning Hands','Charm Person','Chromatic Orb','Color Spray','Comprehend Languages','Detect Magic','Disguise Self','Expeditious Retreat','False Life','Feather Fall','Find Familiar','Fog Cloud','Grease','Identify','Illusory Script','Jump','Longstrider','Mage Armor','Magic Missile','Protection from Evil and Good','Shield','Silent Image','Sleep','Tasha’s Hideous Laughter','Tenser’s Floating Disk','Thunderwave','Unseen Servant','Witch Bolt'] as const;
export const ritualSpells = ['Alarm','Comprehend Languages','Detect Magic','Find Familiar','Identify','Illusory Script','Tenser’s Floating Disk','Unseen Servant'] as const;
export const isRitualSpell = (spell: string): boolean => (ritualSpells as readonly string[]).includes(spell);
export function levelUpArcaneTrickster(campaign: Campaign, hpGain: number, cantrips: string[], spells: string[]): Campaign {
  requireRogue(campaign);
  const character = campaign.character ?? structuredClone(prototypeNighthawk);
  if ((character.level ?? 1) !== 2 || (campaign.xp ?? 0) < xpThresholds[2]) throw new Error('Level 3 is not unlocked');
  if (!Number.isInteger(hpGain) || hpGain < 3 || hpGain > 10) throw new Error('Invalid HP gain');
  if (cantrips.length !== 2 || new Set(cantrips).size !== 2 || cantrips.some(s => s === 'Mage Hand' || !tricksterCantrips.includes(s as typeof tricksterCantrips[number]))) throw new Error('Choose two different Wizard cantrips besides Mage Hand');
  if (spells.length !== 3 || new Set(spells).size !== 3 || spells.some(s => !tricksterSpells.includes(s as typeof tricksterSpells[number]))) throw new Error('Choose three different level 1 Wizard spells');
  const next = { ...character, level: 3, subclass: 'Arcane Trickster' as const, cantrips: ['Mage Hand',...cantrips], preparedSpells: [...spells], spellSlots: { level1: 2, usedLevel1: 0 }, maxHitPoints: (character.maxHitPoints ?? 10) + hpGain, currentHitPoints: Math.min((character.currentHitPoints ?? 10) + hpGain, (character.maxHitPoints ?? 10) + hpGain) };
  return { ...campaign, character: next, updatedAt: new Date().toISOString(), journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: 'Nighthawk reached Rogue Level 3: Arcane Trickster. Gained Steady Aim, Mage Hand Legerdemain, Sneak Attack 2d6, '+hpGain+' HP, cantrips '+next.cantrips.join(', ')+' and prepared spells '+spells.join(', ')+'.', createdAt: new Date().toISOString() }] };
}

/** Explicit, reversible correction of provisional playtest scores. Never automatic. */
export function reconcileNighthawkScores(campaign: Campaign): Campaign {
  requireLegacyNighthawk(campaign);
  if (!campaign.character || campaign.preReconciliationScores) throw new Error('Scores already reconciled or character missing');
  const scores = { str: 8, dex: 17, con: 14, int: 16, wis: 10, cha: 8 };
  return { ...campaign, preReconciliationScores: structuredClone(campaign.character.scores), character: { ...campaign.character, scores }, updatedAt: new Date().toISOString(), journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: 'Player confirmed reconciliation of provisional ability scores: STR 8, DEX 17, CON 14, INT 16, WIS 10, CHA 8.', createdAt: new Date().toISOString() }] };
}
export function undoNighthawkScoreReconciliation(campaign: Campaign): Campaign {
  requireLegacyNighthawk(campaign);
  if (!campaign.character || !campaign.preReconciliationScores) throw new Error('No previous scores to restore');
  return { ...campaign, character: { ...campaign.character, scores: structuredClone(campaign.preReconciliationScores) }, preReconciliationScores: undefined, updatedAt: new Date().toISOString(), journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: 'Restored prior playtest ability scores.', createdAt: new Date().toISOString() }] };
}

/** Validate casting and atomically persist resource expenditure. Spell effects remain DM-adjudicated. */
export const concentrationSpells = ['Friends','Dancing Lights','Blade Ward','Tasha’s Hideous Laughter','Silent Image','Fog Cloud','Witch Bolt','Protection from Evil and Good','Expeditious Retreat','Detect Magic'] as const;
export const spellRequiresConcentration = (spell: string): boolean => (concentrationSpells as readonly string[]).includes(spell);
export function endNighthawkConcentration(campaign: Campaign): Campaign {
  requireLegacyNighthawk(campaign);
  if (!campaign.concentration) throw new Error('Not concentrating');
  const now = new Date().toISOString();
  return {...campaign, combat:campaign.combat&&campaign.concentration.spell==='Tasha’s Hideous Laughter'?{...campaign.combat,laughterTarget:undefined}:campaign.combat, concentration:undefined, spellEffects:(campaign.spellEffects??[]).filter(e=>e.spell!==campaign.concentration?.spell || e.status!=='active'), updatedAt:now, journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk ends concentration on '+campaign.concentration.spell+'.',createdAt:now}]};
}
/** The first combat Magic Action pass handles one-action spells; effects still await DM adjudication. */
export const combatActionSpells = [
 'Mage Hand','Minor Illusion','Mind Sliver','True Strike','Acid Splash','Blade Ward','Chill Touch',
 'Dancing Lights','Elementalism','Fire Bolt','Friends','Light','Message','Poison Spray',
 'Prestidigitation','Ray of Frost','Shocking Grasp','Disguise Self','Silent Image',
 'Tasha’s Hideous Laughter','Charm Person','Chromatic Orb','Color Spray',
 'Fog Cloud','Grease','Magic Missile','Sleep','Thunderwave','Witch Bolt',
] as const;
export function availableCombatSpells(campaign:Campaign):string[] {
 const ch=campaign.character;
 if(!ch||ch.subclass!=='Arcane Trickster'||(ch.level??1)<3)return [];
 return [...(ch.cantrips??[]),...(ch.preparedSpells??[])].filter(spell=>(combatActionSpells as readonly string[]).includes(spell));
}
export function castCombatMagicAction(campaign:Campaign,spell:string,target='',trueStrikeWeapon:'shortbow'|'dagger'='shortbow'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Magic Action requires Nighthawk’s turn.');
 if(c.actionUsed||c.attack)throw Error('Action already used this turn.');
 if(c.pendingSpellSave||c.pendingPlayerEscape||c.playerOpportunity||c.opportunity||c.pendingEnemyShove||c.pendingEnemyGrapple)throw Error('Resolve the pending combat event first.');
 if(!availableCombatSpells(campaign).includes(spell))throw Error('Spell is not available as a combat Magic Action.');
 const isCantrip=campaign.character?.cantrips?.includes(spell)??false;
 if(!isCantrip&&c.spellSlotExpendedThisTurn)throw Error('Only one spell slot may be expended per turn.');
 const cast=castNighthawkSpell(campaign,spell,false,false,target);
 const saveSpell=spell==='Mind Sliver'||spell==='Tasha’s Hideous Laughter';
 const targetId=c.selectedEnemy==='second'?'second':'first';
 if(saveSpell&&(targetId==='second'?(c.secondEnemy?.hp??0)<=0:(c.enemyHp??12)<=0))throw Error('Spell requires a living enemy target.');
 const now=new Date().toISOString();
 if(spell==='True Strike'){
  const enemy=targetId==='second'?c.secondEnemy?.position:c.enemyPosition;
  const player=c.playerPosition??{x:2,y:4};
  if(!enemy||(targetId==='second'?(c.secondEnemy?.hp??0)<=0:(c.enemyHp??12)<=0))throw Error('True Strike requires a living target.');
  const distance=5*Math.max(Math.abs(player.x-enemy.x),Math.abs(player.y-enemy.y));
  if(trueStrikeWeapon==='dagger'&&distance>5)throw Error('True Strike dagger requires an adjacent enemy.');
  if(trueStrikeWeapon==='shortbow'&&distance>320)throw Error('True Strike shortbow target is out of range.');
  if(trueStrikeWeapon==='shortbow'&&(c.arrowsRemaining??campaign.equipment?.arrows??20)<=0)throw Error('No arrows remaining.');
  return {...cast,combat:{...c,actionUsed:true,lastAction:'Magic: True Strike',attack:{phase:'roll-to-hit',weapon:trueStrikeWeapon,trueStrike:true,disadvantage:trueStrikeWeapon==='shortbow'&&distance<=5},spellSlotExpendedThisTurn:!!c.spellSlotExpendedThisTurn},updatedAt:now};
 }
 return {...cast,combat:{...c,actionUsed:true,spellSlotExpendedThisTurn:!!c.spellSlotExpendedThisTurn||!isCantrip,lastAction:'Magic: '+spell,pendingSpellSave:saveSpell?{spell:spell as 'Mind Sliver'|'Tasha’s Hideous Laughter',target:targetId}:undefined},updatedAt:now};
}
/** Resolve a spell saving throw with the training dummy's +0 Intelligence/Wisdom save. */
export function resolveCombatSpellSave(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,pending=c?.pendingSpellSave;
 if(!c||!pending||c.status!=='initiative-set')throw Error('No spell saving throw pending.');
 const ch=campaign.character??prototypeNighthawk;
 const dc=8+ch.proficiencyBonus+abilityModifier(ch.scores.int);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const penalty=c.mindSliverPenalty?.target===pending.target&&c.round<=c.mindSliverPenalty.expiresRound?crypto.getRandomValues(new Uint32Array(1))[0]%4+1:0;
 const total=roll-penalty; // Training dummy: INT +0, WIS +0.
 const success=total>=dc;
 const damage=pending.spell==='Mind Sliver'&&!success?crypto.getRandomValues(new Uint32Array(1))[0]%6+1:0;
 const target=pending.target==='second'?c.secondEnemy?.name??'Training Dummy 2':c.enemyName;
 const second=pending.target==='second';
 const enemyHp=second?c.enemyHp:Math.max(0,(c.enemyHp??12)-damage);
 const secondEnemy=second&&c.secondEnemy?{...c.secondEnemy,hp:Math.max(0,c.secondEnemy.hp-damage),prone:!success&&pending.spell==='Tasha’s Hideous Laughter'?true:c.secondEnemy.prone}:c.secondEnemy;
 const firstProne=!second&&!success&&pending.spell==='Tasha’s Hideous Laughter'?true:c.enemyProne;
 const bothDown=(enemyHp??12)===0&&(!secondEnemy||secondEnemy.hp===0);
 const next={...c,enemyHp,secondEnemy,enemyProne:firstProne,pendingSpellSave:undefined,
  mindSliverPenalty:pending.spell==='Mind Sliver'&&!success?{target:pending.target,expiresRound:c.round+1}:penalty||c.mindSliverPenalty&&c.round>c.mindSliverPenalty.expiresRound?undefined:c.mindSliverPenalty,
  laughterTarget:pending.spell==='Tasha’s Hideous Laughter'&&!success?pending.target:c.laughterTarget,
  lastSpellSave:{spell:pending.spell,target,roll,total,dc,success,damage},
  status:bothDown?'completed' as const:c.status,outcome:bothDown?'nonlethal-victory' as const:c.outcome};
 if(damage>0){const stats=c.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0};
  next.stats={...stats,damage:stats.damage+damage,finishingBlows:stats.finishingBlows+((second?secondEnemy?.hp===0:enemyHp===0)?1:0)};}
 const now=new Date().toISOString();
 const message=target+' rolls '+roll+(penalty?' - '+penalty:' + 0')+' = '+total+' vs spell save DC '+dc+' for '+pending.spell+': '+(success?'SUCCESS.':'FAILURE.')+(damage?' '+damage+' psychic damage.':'')+(!success&&pending.spell==='Tasha’s Hideous Laughter'?' Target falls Prone; incapacitation and repeat saves await full condition engine.':'')+(bothDown?' Encounter complete.':'');
 return damage>0?resolveLaughterDamageSave({...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:message,createdAt:now}]},pending.target,damage):{...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:message,createdAt:now}]};
}
/** A creature affected by Hideous Laughter repeats its Wisdom save with Advantage whenever it takes damage. */
export function resolveLaughterDamageSave(campaign:Campaign,target:'first'|'second',damage:number):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.laughterTarget!==target||damage<=0)return campaign;
 const hp=target==='second'?c.secondEnemy?.hp:c.enemyHp;
 if(hp===0){
  return {...campaign,combat:{...c,laughterTarget:undefined},concentration:campaign.concentration?.spell==='Tasha’s Hideous Laughter'?undefined:campaign.concentration};
 }
 const ch=campaign.character??prototypeNighthawk;
 const dc=8+ch.proficiencyBonus+abilityModifier(ch.scores.int);
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const first=die(20),second=die(20),roll=Math.max(first,second);
 const penalty=c.mindSliverPenalty?.target===target&&c.round<=c.mindSliverPenalty.expiresRound?die(4):0;
 const total=roll-penalty,success=total>=dc;
 const next={...c,laughterTarget:success?undefined:target,mindSliverPenalty:penalty||c.mindSliverPenalty&&c.round>c.mindSliverPenalty.expiresRound?undefined:c.mindSliverPenalty};
 const now=new Date().toISOString();
 const name=target==='second'?c.secondEnemy?.name??'Training Dummy 2':c.enemyName;
 return {...campaign,combat:next,concentration:success&&campaign.concentration?.spell==='Tasha’s Hideous Laughter'?undefined:campaign.concentration,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:name+' Hideous Laughter damage-triggered Wisdom save with Advantage ('+first+', '+second+')'+(penalty?' - '+penalty:'')+' = '+total+' vs DC '+dc+': '+(success?'success; condition ends.':'failure; remains incapacitated.'),createdAt:now}]};
}
/** End-of-turn Wisdom save to end Tasha's Hideous Laughter on a training dummy. */
export function resolveLaughterRepeatSave(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,target=c?.laughterTarget;
 if(!c||!target||c.status!=='initiative-set')throw Error('No active Hideous Laughter condition.');
 const ch=campaign.character??prototypeNighthawk;
 const dc=8+ch.proficiencyBonus+abilityModifier(ch.scores.int);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const penalty=c.mindSliverPenalty?.target===target&&c.round<=c.mindSliverPenalty.expiresRound?crypto.getRandomValues(new Uint32Array(1))[0]%4+1:0;
 const success=roll-penalty>=dc;
 const next={...c,laughterTarget:success?undefined:target,mindSliverPenalty:penalty||c.mindSliverPenalty&&c.round>c.mindSliverPenalty.expiresRound?undefined:c.mindSliverPenalty};
 const now=new Date().toISOString();
 return {...campaign,combat:next,concentration:success&&campaign.concentration?.spell==='Tasha’s Hideous Laughter'?undefined:campaign.concentration,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Hideous Laughter repeat save: '+roll+(penalty?' - '+penalty:'')+' vs DC '+dc+'. '+(success?'Condition ends.':'Target remains incapacitated.'),createdAt:now}]};
}
export function castNighthawkSpell(campaign: Campaign, spell: string, ritual: boolean, familiarComponentsConfirmed = false, target = ''): Campaign {
  requireLegacyNighthawk(campaign);
  const character = campaign.character;
  if (!character || (character.level ?? 1) < 3 || character.subclass !== 'Arcane Trickster') throw new Error('Arcane Trickster spellcasting is not unlocked');
  const cantrip = character.cantrips?.includes(spell) ?? false;
  const prepared = character.preparedSpells?.includes(spell) ?? false;
  if (!cantrip && !prepared) throw new Error('Spell is not known or prepared');
  if (ritual && (!prepared || !isRitualSpell(spell))) throw new Error('Only prepared ritual spells can be ritual-cast');
  if (spell === 'Find Familiar' && !familiarComponentsConfirmed) throw new Error('Confirm the required 10 gp of incense, charcoal and herbs consumed in a brass brazier');
  const slots = character.spellSlots;
  if (!cantrip && !ritual && (!slots || slots.usedLevel1 >= slots.level1)) throw new Error('No Level 1 spell slots remaining');
  const nextSlots = slots ? { ...slots, usedLevel1: slots.usedLevel1 + (!cantrip && !ritual ? 1 : 0) } : undefined;
  // Find Familiar takes one hour normally, or one hour and ten minutes as a ritual.
  const minutes = spell === 'Find Familiar' ? (ritual ? 70 : 60) : ritual ? 10 : 0;
  const now = new Date().toISOString();
  const cleanTarget = target.trim().slice(0,120);
  const concentrating = spellRequiresConcentration(spell);
  const prior = campaign.concentration;
  const effect = { id:crypto.randomUUID(), spell, target:cleanTarget || undefined, status:'awaiting-adjudication' as const, createdAt:now };
  const message = 'Nighthawk casts '+spell+(ritual?' as a ritual':'')+'. '+(ritual||cantrip?'No spell slot spent.':'One Level 1 spell slot spent.')+(minutes?' '+minutes+' minutes pass.':'')+(spell==='Find Familiar'?' Owl familiar summoned; 10 gp material components consumed (player confirmed).':' Spell effect awaits DM adjudication.')+(cleanTarget?' Target/intent: '+cleanTarget+'.':'')+(concentrating?' Concentrating on '+spell+(prior?' (replaces '+prior.spell+').':'.'):'');
  return { ...campaign, character: { ...character, spellSlots: nextSlots }, elapsedMinutes: (campaign.elapsedMinutes ?? 0) + minutes, familiar: spell==='Find Familiar' ? { form:'Owl', summonedAt:now } : campaign.familiar, concentration:concentrating?{spell,target:cleanTarget||undefined,startedAt:now}:campaign.concentration, spellEffects:spell==='Find Familiar'?(campaign.spellEffects??[]):[...(campaign.spellEffects??[]).filter(e=>!prior || !concentrating || e.spell!==prior.spell),effect].slice(-30), updatedAt:now, journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:message,createdAt:now}] };
}

export function minutesUntilLongRestEligible(campaign: Campaign): number {
  const elapsed=campaign.elapsedMinutes??0;
  if(campaign.lastLongRestCompletedAt!==undefined) return Math.max(0,1440-(elapsed-campaign.lastLongRestCompletedAt));
  const last=[...campaign.journal].reverse().find(e=>e.kind==='system' && /completes a long rest/i.test(e.text));
  if(!last)return 0;
  const later=campaign.journal.slice(campaign.journal.indexOf(last)+1);
  const knownMinutes=later.reduce((sum,e)=>{
    if(e.kind!=='system')return sum;
    const rest=e.text.match(/completes a (?:short|long) rest \\((\\d+) minutes\\)/i);
    const wait=e.text.match(/waits (\\d+) minutes for Long Rest eligibility/i);
    return sum+(rest?Number(rest[1]):wait?Number(wait[1]):0);
  },0);
  return Math.max(0,1440-knownMinutes);
}
export function longRestRestriction(campaign: Campaign): string | null {
  const minutes=minutesUntilLongRestEligible(campaign);
  return minutes>0?'Long Rest recovery is available in '+Math.ceil(minutes/60)+' in-game hours. The DM can adjudicate waiting until then.':null;
}
export function advanceToLongRestEligibility(campaign: Campaign, minutes: number): Campaign {
  requireLegacyNighthawk(campaign);
  const required=minutesUntilLongRestEligible(campaign);
  if(!Number.isInteger(minutes)||minutes!==required||minutes<0)throw new Error('Invalid Long Rest waiting period');
  if(minutes===0)return campaign;
  const now=new Date().toISOString();
  return {...campaign,elapsedMinutes:(campaign.elapsedMinutes??0)+minutes,
    lastLongRestCompletedAt:campaign.lastLongRestCompletedAt??(campaign.elapsedMinutes??0)+minutes-1440,
    updatedAt:now,
    journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk waits '+minutes+' minutes for Long Rest eligibility (DM approved uninterrupted waiting).',createdAt:now}]};
}
export function takeNighthawkRest(campaign: Campaign, kind: 'short'|'long', hitDiceToSpend = 0, hitDieRolls: number[] = []): Campaign {
  requireLegacyNighthawk(campaign);
  if(kind==='long') {const restriction=longRestRestriction(campaign);if(restriction)throw new Error(restriction);}
  const character=campaign.character ?? prototypeNighthawk;
  const level=character.level??1;
  const maxHp=character.maxHitPoints??10;
  const currentHp=character.currentHitPoints??maxHp;
  const available=campaign.hitDiceRemaining??level;
  if(!Number.isInteger(hitDiceToSpend)||hitDiceToSpend<0||hitDiceToSpend>available || (kind==='long'&&hitDiceToSpend!==0)) throw new Error('Invalid Hit Dice expenditure');
  if(kind==='short' && (hitDieRolls.length!==hitDiceToSpend || hitDieRolls.some(d=>!Number.isInteger(d)||d<1||d>8)))throw new Error('Roll each selected Hit Die before completing the rest');
  const now=new Date().toISOString();
  const conBonus=Math.floor(((character.scores.con??10)-10)/2);
  const rolls=kind==='short'?hitDieRolls:[];
  const healing=rolls.reduce((sum,die)=>sum+Math.max(0,die+conBonus),0);
  const nextHp=kind==='long'?maxHp:Math.min(maxHp,currentHp+healing);
  const remaining=kind==='long'?Math.min(level,available+Math.max(1,Math.ceil(level/2))):available-hitDiceToSpend;
  const slots=character.spellSlots;
  const nextCharacter={...character,currentHitPoints:nextHp,spellSlots:slots?{...slots,usedLevel1:kind==='long'?0:slots.usedLevel1}:slots};
  const minutes=kind==='long'?480:60;
  const details=kind==='long'?'HP restored to maximum; spell slots restored; Hit Dice recovered.':'Spent '+hitDiceToSpend+' Hit Dice'+(rolls.length?' ('+rolls.join(', ')+')':'')+'; healed '+(nextHp-currentHp)+' HP. Spell slots unchanged.';
  return {...campaign,character:nextCharacter,hitDiceRemaining:remaining,elapsedMinutes:(campaign.elapsedMinutes??0)+minutes,lastLongRestCompletedAt:kind==='long'?(campaign.elapsedMinutes??0)+minutes:campaign.lastLongRestCompletedAt,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk completes a '+kind+' rest ('+minutes+' minutes). '+details,createdAt:now}]};
}

export function applyNighthawkDamage(campaign: Campaign, amount: number, source: string): Campaign {
  requireLegacyNighthawk(campaign);
  if(!Number.isInteger(amount)||amount<1||amount>1000)throw new Error('Damage must be a positive whole number');
  const character=campaign.character??prototypeNighthawk;
  const before=character.currentHitPoints??character.maxHitPoints??10;
  const after=Math.max(0,before-amount);
  const now=new Date().toISOString();
  return {...campaign,character:{...character,currentHitPoints:after},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk takes '+amount+' damage ('+source+'). HP: '+before+' → '+after+'/'+(character.maxHitPoints??10)+'.',createdAt:now}]};
}

export function adjustEquipment(campaign:Campaign,item:'daggers'|'arrows'|'caltrops'|'ballBearings',delta:number):Campaign {
  requireLegacyNighthawk(campaign);
 if(campaign.combat)throw Error('Change equipment outside combat.');
 if(!Number.isInteger(delta)||Math.abs(delta)!==1)throw Error('Invalid quantity adjustment.');
 const equipment=campaign.equipment??{daggers:2,arrows:20,caltrops:0,ballBearings:0};
 const next=Math.max(0,equipment[item]+delta);
 const now=new Date().toISOString();
 return {...campaign,equipment:{...equipment,[item]:next},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Equipment adjusted: '+item+' '+equipment[item]+' → '+next+'.',createdAt:now}]};
}
export function replenishTrainingEquipment(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.enemyName!=='Training Dummy')throw Error('Training resupply is only available during training encounters.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...combat,arrowsRemaining:20,daggersAvailable:2,daggersThrown:0},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Training resupply: 20 practice arrows and 2 practice daggers ready.',createdAt:now}]};
}
export function beginDuel(campaign:Campaign, enemyName:string):Campaign {
  requireLegacyNighthawk(campaign);
  if(campaign.combat)return campaign;
  const clean=enemyName.trim().slice(0,60);
  if(!clean)throw Error('Encounter requires an opponent');
  const enemyRoll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
  const now=new Date().toISOString();
  return {...campaign,...(clean==='Training Dummy'?{character:{...(campaign.character??prototypeNighthawk),currentHitPoints:(campaign.character??prototypeNighthawk).maxHitPoints??10}}:{}),combat:{journalStartIndex:campaign.journal.length+1,status:'awaiting-initiative',enemyName:clean,enemyInitiative:enemyRoll+1,round:1,...(clean==='Training Dummy'?{trainingStartingHp:(campaign.character??prototypeNighthawk).maxHitPoints??10}:{})},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Combat begins: Nighthawk vs '+clean+'. Enemy initiative rolled privately. Nighthawk must roll initiative.',createdAt:now}]};
}
export function rollDuelInitiative(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
  const combat=campaign.combat;
  if(!combat||combat.status!=='awaiting-initiative')throw Error('No initiative roll pending');
  const dex=(campaign.character??prototypeNighthawk).scores.dex;
  const modifier=Math.floor((dex-10)/2);
  const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
  const total=roll+modifier;
  const secondRoll=combat.enemyName==='Training Dummy'?crypto.getRandomValues(new Uint32Array(1))[0]%20+2:undefined;
  const second=secondRoll===undefined?undefined:{name:'Training Dummy 2',initiative:secondRoll,position:{x:10,y:2},hp:12,maxHp:12,detected:false};
  const order=[{name:'Nighthawk',initiative:total},{name:combat.enemyName,initiative:combat.enemyInitiative},...(second?[{name:second.name,initiative:second.initiative}]:[])].sort((a,b)=>b.initiative-a.initiative).map(x=>x.name);
  const now=new Date().toISOString();
  return {...campaign,combat:{...combat,status:'initiative-set',playerInitiative:total,secondEnemy:second,selectedEnemy:undefined,order,turnIndex:0,owl:(campaign.character?.level??1)>=3&&campaign.familiar&&campaign.familiar.status!=='destroyed'&&campaign.familiar.status!=='dismissed'?{position:{x:2,y:10},hp:campaign.familiar.hp??1,movementUsed:0,actionUsed:false}:undefined,reactionUsed:false,movementUsed:0,actionUsed:false,bonusActionUsed:false,enemyHp:12,enemyMaxHp:12,arrowsRemaining:combat.enemyName==='Training Dummy'?20:campaign.equipment?.arrows??20,daggersAvailable:combat.enemyName==='Training Dummy'?2:campaign.equipment?.daggers??2,daggersThrown:0,playerPosition:{x:2,y:10},enemyPosition:{x:10,y:10}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk initiative: d20 '+roll+' + DEX '+modifier+' = '+total+'. '+combat.enemyName+': '+combat.enemyInitiative+'. Turn order: '+order.join(' → ')+'.',createdAt:now}]};
}

// A fixed stone pillar for the first cover/Hide encounter. Line of sight is blocked
// when the segment between the token centers intersects this occupied square.
export const trainingCover={x:6,y:6};
export const trainingMapSize=13;
export const trainingPillars=[trainingCover,{x:4,y:4},{x:8,y:4},{x:4,y:8},{x:8,y:8}];
export type TrainingTerrain='open'|'brush'|'stream'|'wall';
export function trainingTerrain(x:number,y:number):TrainingTerrain{
 if(isTrainingPillar(x,y))return 'wall';
 if((y===9||y===10)&&x>=6&&x<=11 || y===8&&x>=8&&x<=10)return 'stream';
 if((x>=1&&x<=3&&y>=3&&y<=5)||(x>=5&&x<=7&&y>=7&&y<=8)||(x>=9&&x<=11&&y>=1&&y<=2))return 'brush';
 return 'open';
}
export const trainingStepCost=(x:number,y:number)=>trainingTerrain(x,y)==='brush'||trainingTerrain(x,y)==='stream'?10:5;
export const trainingRouteCost=(route:{x:number;y:number}[])=>route.slice(1).reduce((sum,p)=>sum+trainingStepCost(p.x,p.y),0);
export const isTrainingPillar=(x:number,y:number)=>trainingPillars.some(p=>p.x===x&&p.y===y);
export function trainingCoverBlocksSight(p:{x:number;y:number},e:{x:number;y:number}):boolean {
 const dx=e.x-p.x,dy=e.y-p.y;
 for(let t=0;t<=1;t+=0.02)if(trainingPillars.some(pillar=>Math.abs(p.x+dx*t-pillar.x)<0.48&&Math.abs(p.y+dy*t-pillar.y)<0.48))return true;
 return false;
}
function nextActiveTurn(c:NonNullable<Campaign['combat']>):{index:number;round:number} {
 const order=c.order??['Nighthawk',c.enemyName];
 let index=c.turnIndex??0,round=c.round;
 for(let n=0;n<order.length;n++){
  index=(index+1)%order.length;
  if(index===0)round++;
  const name=order[index];
  if(name==='Nighthawk'||name===c.enemyName&&(c.enemyHp??12)>0||name===c.secondEnemy?.name&&(c.secondEnemy?.hp??0)>0)return {index,round};
 }
 return {index,round};
}
function refreshOwlForNighthawkTurn(c:NonNullable<Campaign['combat']>):NonNullable<Campaign['combat']>['owl'] {
 if(!c.owl)return undefined;
 return {...c.owl,movementUsed:0,actionUsed:false,helpTarget:c.owl.helpRound!==undefined&&c.owl.helpRound<c.round?undefined:c.owl.helpTarget,helpRound:c.owl.helpRound!==undefined&&c.owl.helpRound<c.round?undefined:c.owl.helpRound};
}
export function moveOwl(campaign:Campaign,x:number,y:number):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,owl=c?.owl;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk'||!owl)throw Error('Owl can move only during Nighthawk’s turn.');
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=trainingMapSize||y>=trainingMapSize)throw Error('Outside the training grid.');
 const occupied=(x===(c.enemyPosition?.x??10)&&y===(c.enemyPosition?.y??10)&&(c.enemyHp??12)>0)||(!!c.secondEnemy&&c.secondEnemy.hp>0&&x===c.secondEnemy.position.x&&y===c.secondEnemy.position.y);
 if(occupied)throw Error('That square is occupied.');
 // Simplified flying: horizontal Chebyshev distance, passing over pillars and enemies.
 const cost=5*Math.max(Math.abs(x-owl.position.x),Math.abs(y-owl.position.y));
 if(owl.movementUsed+cost>60)throw Error('Owl has insufficient flying movement.');
 const now=new Date().toISOString(),next={...c,owl:{...owl,position:{x,y},movementUsed:owl.movementUsed+cost}};
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Owl flies '+cost+' ft to ('+(x+1)+', '+(y+1)+'). Flyby prevents opportunity attacks.',createdAt:now}]};
}
export function owlTurnAction(campaign:Campaign,action:'dash'|'disengage'|'dodge'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,owl=c?.owl;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk'||!owl)throw Error('Owl can act only during Nighthawk’s turn.');
 if(owl.actionUsed)throw Error('Owl already used its action.');
 const now=new Date().toISOString();
 const next={...c,owl:{...owl,actionUsed:true}};
 // Dash grants an additional 60 feet of flying movement this turn.
 if(action==='dash')next.owl={...next.owl,movementUsed:owl.movementUsed-60};
 const description=action==='dash'?'Owl Dashes, gaining 60 additional feet of flight.':action==='disengage'?'Owl Disengages (Flyby already prevents opportunity attacks).':'Owl Dodges until the start of its next turn.';
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}
export function owlHelp(campaign:Campaign,target:'first'|'second'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,owl=c?.owl;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk'||!owl)throw Error('Owl can Help only during Nighthawk’s turn.');
 if(owl.actionUsed)throw Error('Owl already used its action.');
 const enemy=target==='second'?c.secondEnemy?.position:c.enemyPosition;
 if(!enemy||(target==='second'?(c.secondEnemy?.hp??0)<=0:(c.enemyHp??12)<=0))throw Error('Target is unavailable.');
 if(Math.max(Math.abs(enemy.x-owl.position.x),Math.abs(enemy.y-owl.position.y))>1)throw Error('Owl must fly within 5 feet of the enemy to Help.');
 const now=new Date().toISOString(),next={...c,owl:{...owl,actionUsed:true,helpTarget:target,helpRound:c.round}};
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Owl uses Help against '+(target==='second'?c.secondEnemy!.name:c.enemyName)+'. The next qualifying allied attack gains Advantage.',createdAt:now}]};
}
export function selectTrainingTarget(campaign:Campaign,target:'first'|'second'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Select a target on Nighthawk’s turn.');
 if(c.attack&&c.attack.phase!=='resolved')throw Error('Finish the current attack before changing targets.');
 if(target==='second'&&(!c.secondEnemy||c.secondEnemy.hp<=0))throw Error('Second enemy is not available.');
 if(target==='first'&&(c.enemyHp??12)<=0)throw Error('First enemy is defeated.');
 const name=target==='second'?c.secondEnemy!.name:c.enemyName;
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,selectedEnemy:target},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk targets '+name+'.',createdAt:now}]};
}
export function addSecondTrainingEnemy(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.secondEnemy)throw Error('Start a training encounter before adding a second opponent.');
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+2;
 const second={name:'Training Dummy 2',initiative:roll,position:{x:10,y:2},hp:12,maxHp:12,detected:false};
 const order=[{name:'Nighthawk',initiative:c.playerInitiative??0},{name:c.enemyName,initiative:c.enemyInitiative},{name:second.name,initiative:roll}].sort((a,b)=>b.initiative-a.initiative).map(a=>a.name);
 const current=c.order?.[c.turnIndex??0]??'Nighthawk';
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,secondEnemy:second,selectedEnemy:undefined,order,turnIndex:order.indexOf(current),playerHidden:c.playerHidden&&trainingCoverBlocksSight(c.playerPosition??{x:2,y:4},second.position)},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Second training dummy joins at (11, 3). Initiative '+roll+'. Each enemy now has a separate turn; Hide requires blocked sight from both.',createdAt:now}]};
}
export function canNighthawkHide(c:NonNullable<Campaign['combat']>):boolean {
 const p=c.playerPosition??{x:2,y:4};
 const concealed=(enemy:{x:number;y:number})=>trainingCoverBlocksSight(p,enemy)||(trainingTerrain(p.x,p.y)==='brush'&&Math.max(Math.abs(p.x-enemy.x),Math.abs(p.y-enemy.y))>1);
 return ((c.enemyHp??12)<=0||concealed(c.enemyPosition??{x:6,y:4}))&&(!c.secondEnemy||c.secondEnemy.hp<=0||concealed(c.secondEnemy.position));
}
export function hideNighthawk(campaign:Campaign,actionType:'action'|'bonus'='bonus'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Hide requires your turn.');
 const useBonus=actionType==='bonus';
 if(useBonus&&c.bonusActionUsed)throw Error('Bonus Action already spent. Use the regular Hide Action if available.');
 if(!useBonus&&(c.actionUsed||c.attack))throw Error('Action already spent. Cannot Hide as an Action.');

 if(!canNighthawkHide(c))throw Error('Hide requires cover and being outside every enemy’s line of sight.');
 const character=campaign.character??prototypeNighthawk;
 const mod=abilityModifier(character.scores.dex)+character.proficiencyBonus*(character.expertiseSkills?.includes('Stealth')?2:character.proficientSkills?.includes('Stealth')?1:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1,total=roll+mod,success=total>=15;
 const detail=(useBonus?'Cunning Action: Hide (bonus action).':'Hide (action).')+' Stealth d20 '+roll+' + '+mod+' = '+total+' vs DC 15. '+(success?'Success: Hidden behind cover.':'Failure: enemy knows your position.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,bonusActionUsed:c.bonusActionUsed||useBonus,actionUsed:c.actionUsed||!useBonus,lastAction:'Hide',playerHidden:success,hideRoll:roll,hideTotal:total,hideResult:detail},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function searchForNighthawk(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk'||!c.playerHidden)throw Error('Search requires a hidden player on the enemy turn.');
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const total=roll; // Training dummy has no Investigation or Perception proficiency.
 const found=total>=(c.hideTotal??15);
 const detail=(c.order?.[c.turnIndex??0]??'Dummy')+' Search action: Wisdom (Perception) d20 '+roll+' + 0 = '+total+' vs Stealth '+(c.hideTotal??15)+'. '+(found?'Nighthawk found.':'Nighthawk remains hidden.');
 const now=new Date().toISOString();
 const turn=nextActiveTurn(c);
 const followingIndex=turn.index;
 const nextRound=turn.round;
 return {...campaign,combat:{...c,playerHidden:!found,enemySearchResult:detail,turnIndex:followingIndex,round:nextRound,owl:c.order?.[followingIndex]==='Nighthawk'?refreshOwlForNighthawkTurn({...c,round:nextRound}):c.owl,movementUsed:0,movementAllowance:35,actionUsed:false,bonusActionUsed:false,steadyAim:false,disengaged:false,sneakAttackUsedThisTurn:false,sneakAttackEligible:false,spellSlotExpendedThisTurn:false,lastAction:undefined,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export type TacticalPoint={x:number;y:number};
export function tacticalRoute(combat:NonNullable<Campaign['combat']>,destination:TacticalPoint):TacticalPoint[]|null{
 const start=combat.playerPosition??{x:2,y:10};
 const blocked=(x:number,y:number)=>x<0||y<0||x>=trainingMapSize||y>=trainingMapSize||isTrainingPillar(x,y)||
 ((combat.enemyHp??12)>0&&combat.enemyPosition?.x===x&&combat.enemyPosition?.y===y)||
 (!!combat.secondEnemy&&combat.secondEnemy.hp>0&&combat.secondEnemy.position.x===x&&combat.secondEnemy.position.y===y);
 if(blocked(destination.x,destination.y))return null;
 const key=(p:TacticalPoint)=>p.x+','+p.y;
 const queue:{point:TacticalPoint;cost:number}[]=[{point:start,cost:0}],best=new Map([[key(start),0]]),parents:Record<string,TacticalPoint>={};
 const dirs=[[-1,0],[0,-1],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
 while(queue.length){
  queue.sort((a,b)=>a.cost-b.cost);
  const current=queue.shift()!,p=current.point;
  if(current.cost!==best.get(key(p)))continue;
  if(p.x===destination.x&&p.y===destination.y){const path=[p];while(key(path[0])!==key(start))path.unshift(parents[key(path[0])]);return path;}
  for(const [dx,dy] of dirs){
   const x=p.x+dx,y=p.y+dy;if(blocked(x,y))continue;
   if(dx&&dy&&(blocked(p.x+dx,p.y)||blocked(p.x,p.y+dy)))continue;
   const next={x,y},k=key(next),cost=current.cost+trainingStepCost(x,y);
   if(cost>=(best.get(k)??Infinity))continue;
   best.set(k,cost);parents[k]=p;queue.push({point:next,cost});
  }
 }
 return null;
}
export function tacticalOpportunityEnemies(combat:NonNullable<Campaign['combat']>,route:TacticalPoint[]):('first'|'second')[]{
 if(combat.disengaged)return [];
 const adjacent=(a:TacticalPoint,b:TacticalPoint)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))<=1;
 const found:('first'|'second')[]=[];
 for(let i=1;i<route.length;i++){const before=route[i-1],after=route[i];
  if((combat.enemyHp??12)>0&&!combat.enemyReactionUsed&&combat.enemyPosition&&adjacent(before,combat.enemyPosition)&&!adjacent(after,combat.enemyPosition)&&!found.includes('first'))found.push('first');
  if(combat.secondEnemy&&combat.secondEnemy.hp>0&&!combat.secondEnemyReactionUsed&&adjacent(before,combat.secondEnemy.position)&&!adjacent(after,combat.secondEnemy.position)&&!found.includes('second'))found.push('second');
 }
 return found;
}
export function moveDuelToken(campaign:Campaign,x:number,y:number):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||combat.order?.[combat.turnIndex??0]!=='Nighthawk')throw Error('You can move only on your turn.');
 if(combat.playerOpportunity)throw Error('Resolve the enemy opportunity attack first.');
 if(combat.steadyAim||combat.attack&&combat.attack.phase!=='resolved')throw Error('Movement is unavailable after Steady Aim or while an attack roll is unresolved.');
 if(combat.playerGrappled)throw Error('Grappled: Speed 0. Escape before moving.');
 if(combat.playerProne)throw Error('Stand up first to use normal movement.');
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=trainingMapSize||y<0||y>=trainingMapSize)throw Error('Destination is outside the map.');
 const enemy=combat.enemyPosition??{x:5,y:3};
 if(x===enemy.x&&y===enemy.y||combat.secondEnemy?.hp&&x===combat.secondEnemy.position.x&&y===combat.secondEnemy.position.y)throw Error('That square is occupied by an opponent.');
 if(isTrainingPillar(x,y))throw Error('Stone pillar blocks that square.');
 const route=tacticalRoute(combat,{x,y});if(!route)throw Error('No unobstructed route to that square.');
 const cost=trainingRouteCost(route);
 if(cost===0)throw Error('Choose another square.');
 const used=combat.movementUsed??0,allowance=combat.movementAllowance??35;
 if(used+cost>allowance)throw Error('Not enough movement remaining for the route.');
 const now=new Date().toISOString();
 return advanceTacticalMovement(campaign,route,0,now);
}

function advanceTacticalMovement(campaign:Campaign,route:TacticalPoint[],startIndex:number,now:string):Campaign{
 const combat=campaign.combat!,enemy=combat.enemyPosition??{x:10,y:10};
 let position=route[startIndex],travelled=0;
 const adjacent=(a:TacticalPoint,b:TacticalPoint)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))<=1;
 const reactions:{id:'first'|'second';pos:TacticalPoint;available:boolean}[]=[
  {id:'first',pos:enemy,available:(combat.enemyHp??12)>0&&!combat.enemyReactionUsed},
  ...(combat.secondEnemy?[{id:'second' as const,pos:combat.secondEnemy.position,available:combat.secondEnemy.hp>0&&!combat.secondEnemyReactionUsed}]:[])
 ];
 for(let i=startIndex+1;i<route.length;i++){
  const to=route[i],provoker=combat.disengaged?undefined:reactions.find(e=>e.available&&adjacent(position,e.pos)&&!adjacent(to,e.pos));
  if(provoker){
   const updated:NonNullable<Campaign['combat']>={...combat,playerPosition:position,movementUsed:(combat.movementUsed??0)+travelled,stats:{...(combat.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0}),movement:(combat.stats?.movement??0)+travelled},playerOpportunity:{enemyId:provoker.id,route,routeIndex:i-1,from:position,to:route[route.length-1],cost:trainingRouteCost(route.slice(i-1)),phase:'roll-to-hit'}};
   return {...campaign,combat:updated,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk moves '+travelled+' feet and stops at square ('+(position.x+1)+','+(position.y+1)+'). Enemy '+(provoker.id==='second'?'2':'1')+' makes an Opportunity Attack before Nighthawk leaves its reach.',createdAt:now}]};
  }
  position=to;travelled+=trainingStepCost(to.x,to.y);
 }
 const updated:NonNullable<Campaign['combat']>={...combat,playerPosition:position,playerHidden:combat.playerHidden&&trainingCoverBlocksSight(position,enemy)&&(!combat.secondEnemy||trainingCoverBlocksSight(position,combat.secondEnemy.position)),movementUsed:(combat.movementUsed??0)+travelled,stats:{...(combat.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0}),movement:(combat.stats?.movement??0)+travelled},playerOpportunity:undefined};
 return {...campaign,combat:updated,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk moves '+travelled+' feet to ('+(position.x+1)+','+(position.y+1)+'). '+updated.movementUsed+'/'+(combat.movementAllowance??35)+' feet used.',createdAt:now}]};
}
export function resolveEnemyOpportunity(campaign:Campaign,kind:'hit'|'damage'|'finish'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,pending=c?.playerOpportunity;
 if(!c||!pending)throw Error('No enemy opportunity attack pending.');
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const now=new Date().toISOString();
 let next:NonNullable<Campaign['combat']>={...c},character=campaign.character??prototypeNighthawk,detail='';
 if(kind==='hit'){
  if(pending.phase!=='roll-to-hit')throw Error('Attack roll already made.');
  const d20=die(20),total=d20+4,ac=14,hit=d20===20||(d20!==1&&total>=ac);
  next.playerOpportunity={...pending,phase:hit?'roll-damage':'resolved',d20,total,hit,critical:d20===20};
  detail='Enemy '+(pending.enemyId==='second'?'2':'1')+' opportunity attack: d20 '+d20+' + 4 = '+total+' vs AC '+ac+'. '+(hit?'Hit — roll damage.':'Miss.');
 }else if(kind==='damage'){
  if(pending.phase!=='roll-damage')throw Error('Roll to hit first.');
  const damage=die(6)+2+(pending.critical?die(6):0);
  next.playerOpportunity={...pending,phase:'resolved',damage};
  detail='Enemy opportunity attack damage: '+damage+'.';
 }else{
  if(pending.phase!=='resolved')throw Error('Resolve attack and damage first.');
  const hp=Math.max(0,(character.currentHitPoints??character.maxHitPoints??24)-(pending.damage??0));
  character={...character,currentHitPoints:hp};
  const knockedOut=hp===0;
  next={...next,enemyReactionUsed:pending.enemyId==='second'?c.enemyReactionUsed:true,secondEnemyReactionUsed:pending.enemyId==='second'?true:c.secondEnemyReactionUsed,playerOpportunity:undefined};
  if(knockedOut){next.status='completed';next.outcome='player-defeated';}
  detail='Enemy '+(pending.enemyId==='second'?'2':'1')+' spends its Reaction. Nighthawk has '+hp+' HP.'+(knockedOut?' Nighthawk falls unconscious before leaving this square.':' Nighthawk resumes movement.');
  if(!knockedOut&&pending.route&&pending.routeIndex!==undefined){
   const resumed=advanceTacticalMovement({...campaign,character,combat:next},pending.route,pending.routeIndex,now);
   return {...resumed,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now},...resumed.journal.slice(campaign.journal.length)]};
  }
  if(!knockedOut){next.playerPosition=pending.to;next.movementUsed=(c.movementUsed??0)+pending.cost;}
 }
 return {...campaign,character,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}

/** Official 2024 exploration/social actions. The check is rolled; its narrative outcome is for the DM to adjudicate. */
export function takeCombatSkillAction(campaign:Campaign,action:'Search'|'Study'|'Influence',skill:Skill):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error(action+' requires Nighthawk\'s turn.');
 if(c.actionUsed||c.attack)throw Error('Action already used this turn.');
 const skills:Record<string,{ability:keyof CharacterStats['scores'];options:string[]}>={
  Search:{ability:'wis',options:['Perception','Investigation','Survival']},
  Study:{ability:'int',options:['Arcana','History','Investigation','Nature','Religion']},
  Influence:{ability:'cha',options:['Deception','Intimidation','Performance','Persuasion']}
 };
 const rule=skills[action];
 if(!rule.options.includes(skill))throw Error(skill+' is not a valid '+action+' skill.');
 const ch=campaign.character??prototypeNighthawk;
 const bonus=abilityModifier(ch.scores[skillAbility[skill]])+ch.proficiencyBonus*(ch.expertiseSkills?.includes(skill)?2:ch.proficientSkills?.includes(skill)?1:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1,total=roll+bonus;
 const description=action+' · '+skill+' d20 '+roll+(bonus<0?' - '+Math.abs(bonus):' + '+bonus)+' = '+total+'. DM determines difficulty and outcome; no automatic information or NPC response is assumed.';
 const now=new Date().toISOString();
 return {...campaign,combatAdjudication:{id:crypto.randomUUID(),kind:'skill',detail:description,createdAt:now},combat:{...c,actionUsed:true,lastAction:action,lastSkillAction:{action,skill,roll,total,description}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}

/** Ready spends an Action now; a reaction can later be spent when the declared trigger occurs. */
export function readyCombatAction(campaign:Campaign,trigger:string,response:string,weapon?:'dagger'|'throw-dagger'|'shortbow'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Ready requires Nighthawk\'s turn.');
 if(c.actionUsed||c.attack)throw Error('Action already used this turn.');
 if(!trigger.trim()||!response.trim()||trigger.length>240||response.length>240)throw Error('Ready requires a trigger and a response (240 characters maximum each).');
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,actionUsed:true,lastAction:'Ready',readiedAction:{trigger:trigger.trim(),response:response.trim(),declaredRound:c.round,weapon}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Ready: if '+trigger.trim()+', then '+response.trim()+'. Uses a Reaction when triggered; DM adjudicates the response.',createdAt:now}]};
}
export function resolveReadiedCombatReaction(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||!c.readiedAction)throw Error('No readied action to resolve.');
 if(c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Ready reaction requires another creature\'s turn.');
 if(c.reactionUsed)throw Error('Reaction already used.');
 if(c.pendingSpellSave||c.playerOpportunity||c.opportunity||c.pendingEnemyShove||c.pendingEnemyGrapple)throw Error('Resolve the pending combat event before triggering Ready.');
 if(c.readiedAction.weapon||c.readiedAction.spell)throw Error('Use the deterministic weapon or spell reaction.');
 const now=new Date().toISOString(),readied=c.readiedAction;
 return {...campaign,combatAdjudication:{id:crypto.randomUUID(),kind:'ready',detail:'Declared trigger: '+readied.trigger+'. Declared response: '+readied.response+'. The Reaction was spent; adjudicate the response without changing attack rolls, damage, HP, or conditions automatically.',createdAt:now},combat:{...c,reactionUsed:true,readiedAction:undefined,lastAction:'Ready reaction'},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Ready reaction triggered: '+readied.response+'. Reaction spent; DM adjudicates the declared response.',createdAt:now}]};
}
/** Cast and hold Mind Sliver when Ready is declared. Concentration holds the spell until its trigger. */
export function readyCombatMindSliver(campaign:Campaign,trigger:string):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Ready requires Nighthawk\'s turn.');
 if(c.actionUsed||c.attack)throw Error('Action already used this turn.');
 if(!trigger.trim()||trigger.length>240)throw Error('Ready requires a trigger of at most 240 characters.');
 if(!availableCombatSpells(campaign).includes('Mind Sliver'))throw Error('Mind Sliver is not available.');
 if(campaign.concentration)throw Error('End existing concentration before readying a spell.');
 const second=c.selectedEnemy==='second',enemy=second?c.secondEnemy?.position:c.enemyPosition,p=c.playerPosition??{x:2,y:4};
 if(!enemy||(second?(c.secondEnemy?.hp??0)<=0:(c.enemyHp??12)<=0))throw Error('Ready spell requires a living target.');
 if(5*Math.max(Math.abs(p.x-enemy.x),Math.abs(p.y-enemy.y))>60)throw Error('Mind Sliver target is out of range.');
 const now=new Date().toISOString();
 return {...campaign,concentration:{spell:'Readied Mind Sliver',target:second?'second':'first',startedAt:now},combat:{...c,actionUsed:true,lastAction:'Ready: Mind Sliver',readiedAction:{trigger:trigger.trim(),response:'Release Mind Sliver',declaredRound:c.round,spell:'Mind Sliver'}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk casts Mind Sliver and holds it with concentration until '+trigger.trim()+'. Action spent. Release uses a Reaction; spell expires at the start of Nighthawk\'s next turn.',createdAt:now}]};
}
export function resolveReadiedSpellReaction(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,ready=c?.readiedAction;
 if(!c||c.status!=='initiative-set'||ready?.spell!=='Mind Sliver')throw Error('No readied Mind Sliver.');
 if(c.order?.[c.turnIndex??0]==='Nighthawk'||c.reactionUsed)throw Error('Ready spell requires an available Reaction on another turn.');
 if(c.pendingSpellSave||c.opportunity||c.playerOpportunity||c.pendingEnemyShove||c.pendingEnemyGrapple)throw Error('Resolve the pending combat event first.');
 if(campaign.concentration?.spell!=='Readied Mind Sliver')throw Error('Concentration on the readied spell has ended.');
 const target=campaign.concentration.target==='second'?'second':'first';
 if(target==='second'?(c.secondEnemy?.hp??0)<=0:(c.enemyHp??12)<=0)throw Error('The readied spell target has been defeated.');
 const now=new Date().toISOString();
 return {...campaign,concentration:undefined,combat:{...c,reactionUsed:true,readiedAction:undefined,lastAction:'Ready: Mind Sliver released',pendingSpellSave:{spell:'Mind Sliver',target}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk releases readied Mind Sliver. Reaction spent. Resolve the target Intelligence save.',createdAt:now}]};
}
/** Resolve a readied weapon strike as a reaction on another creature's turn.
 * The trigger is explicitly confirmed by the player; the engine never guesses whether it happened.
 */
export function resolveReadiedWeaponAttack(campaign:Campaign,weapon:'dagger'|'throw-dagger'|'shortbow'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||!c.readiedAction)throw Error('No readied action to resolve.');
 if(c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Ready reaction requires another creature\'s turn.');
 if(c.reactionUsed)throw Error('Reaction already used.');
 if(c.pendingSpellSave||c.playerOpportunity||c.opportunity||c.pendingEnemyShove||c.pendingEnemyGrapple)throw Error('Resolve the pending combat event before triggering Ready.');
 if(c.readiedAction.weapon!==weapon)throw Error('Weapon does not match the declared Ready response.');
 const p=c.playerPosition??{x:2,y:4},target=c.selectedEnemy==='second'&&c.secondEnemy?c.secondEnemy.position:c.enemyPosition??{x:6,y:4};
 const distance=5*Math.max(Math.abs(p.x-target.x),Math.abs(p.y-target.y));
 const second=c.selectedEnemy==='second'&&!!c.secondEnemy;
 const hp=second?c.secondEnemy!.hp:c.enemyHp??12;
 if(hp<=0)throw Error('The target has been defeated.');
 if(weapon==='dagger'&&distance>5)throw Error('Melee dagger requires an adjacent target.');
 if(weapon==='throw-dagger'&&distance>60)throw Error('Thrown dagger is out of range.');
 if(weapon==='shortbow'&&distance>320)throw Error('Shortbow is out of range.');
 if(weapon==='shortbow'&&(c.arrowsRemaining??20)<=0)throw Error('No arrows remaining.');
 if(weapon!=='shortbow'&&(c.daggersAvailable??2)<=0)throw Error('No daggers remaining.');
 const ch=campaign.character??prototypeNighthawk;
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const ranged=weapon!=='dagger',prone=second?!!c.secondEnemy?.prone:!!c.enemyProne;
 const disadvantage=ranged&&(distance<=5||distance>(weapon==='shortbow'?80:20)||prone&&distance>5);
 const advantage=!!c.playerHidden||!!c.owl&&c.owl.helpTarget===(second?'second':'first')||prone&&distance<=5;
 const useAdvantage=advantage&&!disadvantage,useDisadvantage=disadvantage&&!advantage;
 const first=die(20),other=useAdvantage||useDisadvantage?die(20):undefined;
 const rolled=other===undefined?first:useAdvantage?Math.max(first,other):Math.min(first,other);
 const bonus=abilityModifier(ch.scores.dex)+ch.proficiencyBonus,total=rolled+bonus;
 const critical=rolled===20,hit=critical||(rolled!==1&&total>=12);
 const sneak=hit&&!c.sneakAttackUsedThisTurn&&(useAdvantage||!!c.trainingAllyAdjacent&&!useDisadvantage)&&!useDisadvantage;
 const weaponDice=hit?Array.from({length:critical?2:1},()=>die(weapon==='shortbow'?6:4)):[];
 const sneakDice=hit&&sneak?Array.from({length:Math.ceil((ch.level??1)/2)*(critical?2:1)},()=>die(6)):[];
 const damage=hit?Math.max(0,[...weaponDice,...sneakDice].reduce((a,b)=>a+b,0)+abilityModifier(ch.scores.dex)):0;
 const stats=c.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0};
 const now=new Date().toISOString();
 const detail='Ready reaction ('+weapon+') against '+(second?c.secondEnemy!.name:c.enemyName)+': d20 '+rolled+' + '+bonus+' = '+total+' vs AC 12, '+(hit?'HIT':'MISS')+(critical?' (critical)':'')+'. '+(hit?'Damage '+weaponDice.join('+')+(sneakDice.length?' + Sneak Attack '+sneakDice.join('+'):'')+' + DEX = '+damage+'.':'No damage.')+' Reaction spent.';
 const bothDown=(second?c.enemyHp??12:Math.max(0,hp-damage))===0&&(!c.secondEnemy||(second?Math.max(0,hp-damage):c.secondEnemy.hp)===0);
 const next={...c,reactionUsed:true,readiedAction:undefined,lastAction:'Ready: '+weapon,playerHidden:false,sneakAttackUsedThisTurn:c.sneakAttackUsedThisTurn||sneak,status:bothDown?'completed' as const:c.status,outcome:bothDown?'nonlethal-victory' as const:c.outcome,
  arrowsRemaining:weapon==='shortbow'?(c.arrowsRemaining??20)-1:c.arrowsRemaining,
  daggersAvailable:weapon==='throw-dagger'?(c.daggersAvailable??2)-1:c.daggersAvailable,
  daggersThrown:weapon==='throw-dagger'?(c.daggersThrown??0)+1:c.daggersThrown,
  enemyHp:second?c.enemyHp:Math.max(0,hp-damage),
  secondEnemy:second&&c.secondEnemy?{...c.secondEnemy,hp:Math.max(0,hp-damage)}:c.secondEnemy,
  owl:c.owl&&c.owl.helpTarget===(second?'second':'first')?{...c.owl,helpTarget:undefined,helpRound:undefined}:c.owl,
  stats:{...stats,attacks:stats.attacks+1,hits:stats.hits+(hit?1:0),criticalHits:stats.criticalHits+(critical?1:0),damage:stats.damage+damage,sneakDamage:stats.sneakDamage+sneakDice.reduce((a,b)=>a+b,0),finishingBlows:stats.finishingBlows+(hit&&damage>=hp?1:0)}
 };
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
/** Utilize an available consumable during combat; placement effects await DM adjudication. */
export function utilizeCombatItem(campaign:Campaign,item:'caltrops'|'ballBearings'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Utilize requires Nighthawk\'s active combat turn.');
 if(c.actionUsed||c.attack)throw Error('Action already used this turn.');
 const equipment=campaign.equipment??{daggers:2,arrows:20,caltrops:0,ballBearings:0};
 if(equipment[item]<=0)throw Error('No '+(item==='caltrops'?'caltrops':'ball bearings')+' available.');
 const now=new Date().toISOString(),name=item==='caltrops'?'Caltrops':'Ball Bearings';
 const message='Nighthawk uses Utilize to deploy '+name+'. One unit consumed. Placement and terrain effects await DM adjudication.';
 return {...campaign,equipment:{...equipment,[item]:equipment[item]-1},combat:{...c,actionUsed:true,lastAction:'Utilize: '+name},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:message,createdAt:now}]};
}

export function takeDuelTurnAction(campaign:Campaign, action:'move'|'attack'|'throw-dagger'|'shortbow'|'dash'|'disengage'|'dodge'|'steady-aim'|'cunning-dash'|'cunning-disengage'|'end'):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order)throw Error('Initiative must be completed first.');
 const current=combat.order[combat.turnIndex??0];
 if(current!=='Nighthawk')throw Error('It is not Nighthawk\'s turn.');
 const next={...combat};let description='';
 const speed=35;
 if(action==='cunning-dash'||action==='cunning-disengage'){
   if(next.bonusActionUsed)throw Error('Bonus action already used this turn.');
   next.bonusActionUsed=true;
   if(action==='cunning-dash'){next.movementAllowance=(next.movementAllowance??speed)+speed;description='Nighthawk uses Cunning Action: Dash as a bonus action. Movement allowance: '+next.movementAllowance+' feet.';}
   else{next.disengaged=true;description='Nighthawk uses Cunning Action: Disengage as a bonus action. Opportunity attacks are avoided for the rest of this turn.';}
 }else if(action==='steady-aim'){
   if(next.bonusActionUsed||next.movementUsed)throw Error('Steady Aim requires no movement this turn and an available bonus action.');
   next.bonusActionUsed=true;next.steadyAim=true;description='Nighthawk uses Steady Aim. The next attack this turn has advantage; movement is unavailable this turn.';
 }else if(action==='move'){
   if(next.steadyAim)throw Error('Steady Aim prevents movement this turn.');
   const allowance=next.movementAllowance??speed;
   if((next.movementUsed??0)>=allowance)throw Error('No movement remaining.');
   next.movementUsed=Math.min(allowance,(next.movementUsed??0)+5);
   description='Nighthawk moves 5 feet ('+next.movementUsed+'/'+allowance+' feet).';
 }else if(action==='end'){
   const turn=nextActiveTurn(combat);next.turnIndex=turn.index;next.round=turn.round;next.lastShoveSave=undefined;next.lastPlayerShoveSave=undefined;next.lastGrappleResult=undefined;next.lastPlayerGrappleResult=undefined;next.movementUsed=0;next.actionUsed=false;next.bonusActionUsed=false;next.attack=undefined;next.steadyAim=false;next.movementAllowance=speed;next.disengaged=false;next.sneakAttackUsedThisTurn=false;next.spellSlotExpendedThisTurn=false;if(next.order?.[turn.index]==='Nighthawk')next.owl=refreshOwlForNighthawkTurn(next);
   description='Nighthawk ends their turn. '+combat.order[next.turnIndex]+' is next.';
 }else {
   if(next.actionUsed)throw Error('Action already used this turn.');
   next.actionUsed=true;
   if(action==='dash'){next.lastAction='Dash';next.movementAllowance=(next.movementAllowance??speed)+speed;description='Nighthawk Dashes, gaining another '+speed+' feet of movement this turn.';}
   if(action==='disengage'){next.lastAction='Disengage';next.disengaged=true;description='Nighthawk takes the Disengage action.';}
   if(action==='dodge'){next.lastAction='Dodge';description='Nighthawk takes the Dodge action.';}
   if(action==='attack'||action==='throw-dagger'||action==='shortbow'){
    if(!next.selectedEnemy)throw Error('Select an enemy on the map before attacking.');
    const p=next.playerPosition??{x:1,y:3},e=next.selectedEnemy==='second'&&next.secondEnemy?next.secondEnemy.position:next.enemyPosition??{x:5,y:3};
    const distance=5*Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y));
    const thrown=action==='throw-dagger',bow=action==='shortbow';
    if(action==='attack'&&distance>5)throw Error('Dagger melee requires an adjacent enemy.');
    if(thrown&&distance>60)throw Error('Thrown dagger is out of range (60 ft maximum).');
    if((thrown||action==='attack')&&(next.daggersAvailable??2)<1)throw Error('No dagger available. Recover a thrown dagger after the encounter.');
    if(bow&&distance>320)throw Error('Shortbow is out of range (320 ft maximum).');
    if(bow&&(next.arrowsRemaining??20)<1)throw Error('No arrows remaining.');
    next.lastAction=bow?'Shortbow':thrown?'Thrown Dagger':'Dagger';
    next.attack={phase:'roll-to-hit',target:next.selectedEnemy,weapon:bow?'shortbow':'dagger',thrown,disadvantage:(bow||thrown)&&(distance<=5||distance>(bow?80:20))};
    description='Nighthawk prepares '+(bow?'a shortbow shot':thrown?'a thrown dagger':'a melee dagger strike')+' at '+distance+' feet. Roll to hit next.';
  }
 }
 const now=new Date().toISOString();
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}

export function beginEnemyGrapple(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Enemy Grapple requires the enemy turn.');
 if(c.pendingEnemyShove||c.pendingEnemyGrapple)throw Error('Resolve the pending save first.');
 const p=c.playerPosition??{x:2,y:4},e=c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Enemy must be within 5 feet to Grapple.');
 return {...campaign,combat:{...c,pendingEnemyGrapple:true,lastPlayerGrappleResult:undefined}};
}
export function rollPlayerGrappleSave(campaign:Campaign,ability:'str'|'dex'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c?.pendingEnemyGrapple||!c.order||c.order[c.turnIndex??0]==='Nighthawk')throw Error('No enemy Grapple save pending.');
 const character=campaign.character??prototypeNighthawk;
 const modifier=abilityModifier(character.scores[ability])+(ability==='dex'?character.proficiencyBonus:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const total=roll+modifier,passed=total>=12;
 const detail='Enemy Grapple: '+(ability==='str'?'Strength':'Dexterity')+' save d20 '+roll+' '+(modifier>=0?'+ ':'- ')+Math.abs(modifier)+' = '+total+' vs DC 12. '+(passed?'Success: not Grappled.':'Failure: Grappled (Speed 0).');
 const now=new Date().toISOString();
 const nextRound=c.order[0]==='Nighthawk'?c.round+1:c.round;
 return {...campaign,combat:{...c,pendingEnemyGrapple:false,playerGrappled:!passed,lastPlayerGrappleResult:detail,turnIndex:c.order.indexOf('Nighthawk'),round:nextRound,owl:refreshOwlForNighthawkTurn({...c,round:nextRound}),movementUsed:0,movementAllowance:35,actionUsed:false,bonusActionUsed:false,steadyAim:false,disengaged:false,sneakAttackUsedThisTurn:false,sneakAttackEligible:false,spellSlotExpendedThisTurn:false,lastAction:undefined,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function beginPlayerGrappleEscape(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.order?.[c.turnIndex??0]!=='Nighthawk'||!c.playerGrappled||c.actionUsed||c.attack)throw Error('Escaping requires your available action while Grappled.');
 return {...campaign,combat:{...c,pendingPlayerEscape:true}};
}
export function rollPlayerGrappleEscape(campaign:Campaign,ability:'str'|'dex'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c?.pendingPlayerEscape||!c.playerGrappled||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('No Grapple escape check pending.');
 const character=campaign.character??prototypeNighthawk;
 const proficient=character.proficientSkills.includes(ability==='str'?'Athletics':'Acrobatics');
 const modifier=abilityModifier(character.scores[ability])+(proficient?character.proficiencyBonus:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const total=roll+modifier,passed=total>=12;
 const detail='Grapple escape '+(ability==='str'?'Athletics':'Acrobatics')+' check: d20 '+roll+' '+(modifier>=0?'+ ':'- ')+Math.abs(modifier)+' = '+total+' vs DC 12. '+(passed?'Success: Grapple ends.':'Failure: still Grappled.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,pendingPlayerEscape:false,playerGrappled:!passed,actionUsed:true,lastAction:'Escape Grapple',lastPlayerGrappleResult:detail},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function beginEnemyShove(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Enemy Shove requires the enemy turn.');
 if(c.pendingEnemyShove)throw Error('Resolve the pending saving throw.');
 const p=c.playerPosition??{x:2,y:4},e=c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Enemy must be within 5 feet to Shove. Move Nighthawk adjacent first.');
 return {...campaign,combat:{...c,pendingEnemyShove:true,lastPlayerShoveSave:undefined}};
}
export function rollPlayerShoveSave(campaign:Campaign,ability:'str'|'dex'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c?.pendingEnemyShove||!c.order||c.order[c.turnIndex??0]==='Nighthawk')throw Error('No enemy Shove save pending.');
 const character=campaign.character??prototypeNighthawk;
 const modifier=abilityModifier(character.scores[ability])+(ability==='dex'?character.proficiencyBonus:0);
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const dc=12; // Temporary dummy STR +2 and proficiency +2.
 const total=roll+modifier;
 const passed=total>=dc;
 const detail='Enemy Shove: Nighthawk '+(ability==='str'?'Strength':'Dexterity')+' save d20 '+roll+' '+(modifier>=0?'+ ':'- ')+Math.abs(modifier)+' = '+total+' vs DC '+dc+'. '+(passed?'Success: remains standing.':'Failure: knocked Prone.');
 const now=new Date().toISOString();
 const nextRound=c.order[0]==='Nighthawk'?c.round+1:c.round;
 return {...campaign,combat:{...c,pendingEnemyShove:false,playerProne:passed?!!c.playerProne:true,lastPlayerShoveSave:detail,turnIndex:c.order.indexOf('Nighthawk'),round:nextRound,owl:refreshOwlForNighthawkTurn({...c,round:nextRound}),movementUsed:0,movementAllowance:35,actionUsed:false,bonusActionUsed:false,steadyAim:false,disengaged:false,sneakAttackUsedThisTurn:false,sneakAttackEligible:false,spellSlotExpendedThisTurn:false,lastAction:undefined,attack:undefined,enemyProne:false},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function standNighthawk(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.order?.[c.turnIndex??0]!=='Nighthawk'||!c.playerProne)throw Error('You must be Prone on your turn to stand.');
 if(c.playerGrappled)throw Error('Grappled: Speed 0. Escape before standing.');
 const cost=15; // Grid standing cost.
 if(c.steadyAim)throw Error('Steady Aim prevents movement, including standing up.');
 if((c.movementUsed??0)+cost>(c.movementAllowance??35))throw Error('Not enough movement to stand.');
 const now=new Date().toISOString();
 const detail='Nighthawk stands up, spending 15 feet of movement. '+((c.movementAllowance??35)-(c.movementUsed??0)-cost)+' feet remaining.';
 return {...campaign,combat:{...c,playerProne:false,movementUsed:(c.movementUsed??0)+cost},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function resolveDuelEnemyTurn(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order||combat.order[combat.turnIndex??0]==='Nighthawk')throw Error('It is not the opponent\'s turn.');
 if(combat.opportunity)throw Error('Resolve the opportunity attack before continuing.');
 if(combat.pendingSpellSave)throw Error('Resolve the pending spell saving throw first.');
 if(combat.laughterTarget===(combat.order[combat.turnIndex??0]===combat.secondEnemy?.name?'second':'first')){
  const saved=resolveLaughterRepeatSave(campaign);
  const now=new Date().toISOString();const turn=nextActiveTurn(saved.combat!);
  const nextCombat={...saved.combat!,readiedAction:saved.combat!.order?.[turn.index]==='Nighthawk'?undefined:saved.combat!.readiedAction,turnIndex:turn.index,round:turn.round,movementUsed:0,movementAllowance:35,actionUsed:false,bonusActionUsed:false,steadyAim:false,disengaged:false,spellSlotExpendedThisTurn:false,lastAction:undefined,attack:undefined,enemyLastTurn:'Incapacitated by Tasha’s Hideous Laughter; cannot act.'};
  return {...saved,concentration:nextCombat.readiedAction?saved.concentration:saved.concentration?.spell==='Readied Mind Sliver'?undefined:saved.concentration,combat:nextCombat,updatedAt:now,journal:[...saved.journal,{id:crypto.randomUUID(),kind:'system',text:nextCombat.enemyLastTurn,createdAt:now}]};
 }
 if(combat.pendingEnemyShove||combat.pendingEnemyGrapple)throw Error('Resolve the pending Shove or Grapple save first.');
 const currentName=combat.order[combat.turnIndex??0];
 if(currentName===combat.enemyName&&(combat.enemyHp??12)===0||currentName===combat.secondEnemy?.name&&combat.secondEnemy?.hp===0)throw Error('Defeated enemies cannot act.');
 const secondEnemyTurn=currentName===combat.secondEnemy?.name;
 const startingPosition=secondEnemyTurn?combat.secondEnemy!.position:combat.enemyPosition??{x:6,y:4};
 const playerPosition=combat.playerPosition??{x:2,y:4};
 const otherPosition=secondEnemyTurn?(combat.enemyHp??12)>0?combat.enemyPosition:undefined:combat.secondEnemy&&combat.secondEnemy.hp>0?combat.secondEnemy.position:undefined;
 const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const isBlocked=(p:{x:number;y:number})=>p.x<0||p.x>=trainingMapSize||p.y<0||p.y>=trainingMapSize||isTrainingPillar(p.x,p.y)||p.x===playerPosition.x&&p.y===playerPosition.y||!!otherPosition&&p.x===otherPosition.x&&p.y===otherPosition.y;
 const standing=!!(secondEnemyTurn?combat.secondEnemy?.prone:combat.enemyProne);
 const grappled=!!(secondEnemyTurn?combat.secondEnemy?.grappled:combat.enemyGrappled);
 const speed=grappled?0:standing?1:2; // Training-only: slow dummies allow ranged testing.
 let position={...startingPosition};
 // Move at most Speed/5 squares along a shortest walkable route.
 const queue=[{pos:startingPosition,steps:0}],seen=new Set([startingPosition.x+','+startingPosition.y]);
 let best={pos:startingPosition,steps:0};
 for(let head=0;head<queue.length;head++){
  const node=queue[head];
  if(distance(node.pos,playerPosition)<distance(best.pos,playerPosition))best=node;
  if(distance(node.pos,playerPosition)<=1){best=node;break;}
  if(node.steps>=speed)continue;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   if(!dx&&!dy)continue;
   const pos={x:node.pos.x+dx,y:node.pos.y+dy},key=pos.x+','+pos.y;
   if(!seen.has(key)&&!isBlocked(pos)){seen.add(key);queue.push({pos,steps:node.steps+1});}
  }
 }
 position=best.pos;
 const inReach=distance(position,playerPosition)<=1;
 // Target selection must use the final position: a dummy cannot strike an owl it moved away from.
 const owlInReach=!!combat.owl&&combat.owl.hp>0&&distance(position,combat.owl.position)<=1;
 const targetOwl=owlInReach;
 const standDescription=(standing?'Enemy stands from Prone, spending 15 feet of movement. ':'')+(best.steps?'Moves '+best.steps*5+' feet to ('+(position.x+1)+', '+(position.y+1)+'). ':'')+(!inReach&&!owlInReach?'Cannot reach Nighthawk'+(combat.owl&&combat.owl.hp>0?' or Owl':'')+'; no melee attack. ':'');

 const character=campaign.character??prototypeNighthawk;
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const canAttack=targetOwl||inReach;
 const first=canAttack?die(20):0;
 const dodging=targetOwl?false:combat.lastAction==='Dodge'||!!combat.playerHidden;
 const second=dodging?die(20):undefined;
 const attackRoll=second===undefined?first:Math.min(first,second);
 const total=attackRoll+4;
 const ac=targetOwl?11:14; // Owl AC 11; temporary Nighthawk training AC 14.
 const hit=canAttack&&(attackRoll===20||(attackRoll!==1&&total>=ac));
 const critical=attackRoll===20;
 const damage=hit?(targetOwl?die(2)+2+(critical?die(2):0):die(2)+(critical?die(2):0)):0; // Training-only strikes.
 const before=character.currentHitPoints??character.maxHitPoints??10;
 const owlAfter=targetOwl?Math.max(0,(combat.owl?.hp??1)-damage):undefined;
 const owlDestroyed=targetOwl&&hit&&owlAfter===0;
 const after=targetOwl?before:Math.max(0,before-damage);
 const defeated=!targetOwl&&hit&&after===0;
 const detail=(targetOwl?'Owl is within melee reach. ':standDescription)+(combat.order[combat.turnIndex??0]??combat.enemyName)+(canAttack?(targetOwl?' attacks Owl: ':' training attack: '):' waits out of range. ')+(canAttack?(dodging?'disadvantage ('+first+', '+second+') → ':'d20 ')+attackRoll+' + 4 = '+total+' vs temporary AC '+ac+': '+(hit?'HIT':'MISS')+'.'+(hit?(targetOwl?' Damage: '+damage+'. Owl HP: '+(combat.owl?.hp??1)+' → '+owlAfter+'.'+(owlDestroyed?' Familiar disappears at 0 HP; Find Familiar must be cast again.':''):' Nonlethal damage: '+damage+'. Nighthawk HP: '+before+' → '+after+'/'+(character.maxHitPoints??10)+'.'):'')+(defeated?' Nighthawk is knocked unconscious; sparring ends.':''):'');
 const turn=nextActiveTurn(combat);
 const followingIndex=turn.index;
 const nextRound=turn.round;
 const nextOwl=owlDestroyed?undefined:targetOwl&&combat.owl?{...combat.owl,hp:owlAfter??combat.owl.hp}:combat.owl;
 const nextCombat={...combat,readiedAction:combat.order[followingIndex]==='Nighthawk'?undefined:combat.readiedAction,owl:followingIndex!==undefined&&combat.order[followingIndex]==='Nighthawk'?refreshOwlForNighthawkTurn({...combat,owl:nextOwl,round:nextRound}):nextOwl,enemyPosition:secondEnemyTurn?combat.enemyPosition:position,secondEnemy:secondEnemyTurn&&combat.secondEnemy?{...combat.secondEnemy,position,prone:false}:combat.secondEnemy,enemyProne:secondEnemyTurn?combat.enemyProne:false,turnIndex:followingIndex,round:nextRound,reactionUsed:false,enemyReactionUsed:secondEnemyTurn?combat.enemyReactionUsed:false,secondEnemyReactionUsed:secondEnemyTurn?false:combat.secondEnemyReactionUsed,movementUsed:0,movementAllowance:35,actionUsed:false,bonusActionUsed:false,steadyAim:false,disengaged:false,sneakAttackUsedThisTurn:false,sneakAttackEligible:false,spellSlotExpendedThisTurn:false,lastAction:undefined,attack:undefined,enemyLastTurn:detail,status:defeated?'completed' as const:combat.status,outcome:defeated?'player-defeated' as const:combat.outcome};
 const concentrationCheck=!targetOwl&&damage>0&&!!campaign.concentration;
 const concentrationRoll=concentrationCheck?die(20):undefined;
 const concentrationBonus=abilityModifier(character.scores.con);
 const concentrationDC=Math.max(10,Math.floor(damage/2));
 const concentrationFailed=concentrationRoll!==undefined&&concentrationRoll+concentrationBonus<concentrationDC;
 const concentrationMessage=concentrationRoll===undefined?'':' Concentration: '+concentrationRoll+' + '+concentrationBonus+' vs DC '+concentrationDC+(concentrationFailed?'; concentration broken.':'; maintained.');
 const finalCombat=concentrationFailed&&campaign.concentration?.spell==='Tasha’s Hideous Laughter'?{...nextCombat,laughterTarget:undefined}:concentrationFailed&&campaign.concentration?.spell==='Readied Mind Sliver'?{...nextCombat,readiedAction:undefined}:nextCombat;
 const now=new Date().toISOString();
 return {...campaign,concentration:concentrationFailed||!finalCombat.readiedAction&&campaign.concentration?.spell==='Readied Mind Sliver'?undefined:campaign.concentration,spellEffects:concentrationFailed?(campaign.spellEffects??[]).filter(e=>e.spell!==campaign.concentration?.spell||e.status!=='active'):campaign.spellEffects,familiar:owlDestroyed&&campaign.familiar?{...campaign.familiar,status:'destroyed' as const,hp:0}:campaign.familiar,character:{...character,currentHitPoints:after},combat:finalCombat,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail+concentrationMessage,createdAt:now}]};
}

export function moveTrainingDummy(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.enemyName!=='Training Dummy'||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk'||c.opportunity)throw Error('Dummy movement is unavailable.');
 if(c.enemyGrappled)throw Error('Grappled: Speed 0. Escape before moving.');
 const p=c.playerPosition??{x:2,y:4},e=c.enemyPosition??{x:6,y:4};
 const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const adjacent=distance(p,e)<=1;
 // Patrol around Nighthawk, rather than marching east into the map boundary.
 // Once adjacent, choose a square outside melee reach to trigger a reaction.
 const candidates=[{x:e.x+1,y:e.y},{x:e.x,y:e.y+1},{x:e.x-1,y:e.y},{x:e.x,y:e.y-1},
 {x:e.x+1,y:e.y+1},{x:e.x-1,y:e.y+1},{x:e.x-1,y:e.y-1},{x:e.x+1,y:e.y-1}]
 .filter(q=>q.x>=0&&q.x<=8&&q.y>=0&&q.y<=8&&!(q.x===p.x&&q.y===p.y));
 const options=adjacent?candidates.filter(q=>distance(q,p)>1):candidates;
 if(!options.length)throw Error('No available square for dummy movement.');
 // Prefer an orthogonal square; rotate the direction by round/position to avoid a straight-line march.
 const index=(c.round+e.x*3+e.y*5)%options.length;
 const to=options[index];
 const opportunity=adjacent&&!c.reactionUsed?{from:e,to}:undefined;
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,enemyPosition:opportunity?e:to,opportunity},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:opportunity?'Training dummy starts leaving Nighthawk’s reach. Opportunity attack available before it moves.':'Training dummy moves one square toward Nighthawk.',createdAt:now}]};
}

export function resolveTrainingReaction(campaign:Campaign,choice:'attack'|'decline'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||!c.opportunity||c.status!=='initiative-set'||c.reactionUsed||c.reactionAttack)throw Error('No reaction choice pending.');
 const now=new Date().toISOString();
 if(choice==='attack'){
  if((c.daggersAvailable??2)<1)throw Error('No melee dagger available for the reaction.');
  return {...campaign,combat:{...c,reactionUsed:true,reactionAttack:{phase:'roll-to-hit'}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk spends a reaction on an opportunity attack. Roll to hit before the dummy moves.',createdAt:now}]};
 }
 return {...campaign,combat:{...c,opportunity:undefined,enemyPosition:c.opportunity.to},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk declines the opportunity attack. The dummy moves away.',createdAt:now}]};
}

export function rollTrainingReaction(campaign:Campaign,kind:'hit'|'damage'|'finish'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat,attack=c?.reactionAttack;
 if(!c||!c.opportunity||!attack)throw Error('No reaction attack in progress.');
 const character=campaign.character??prototypeNighthawk;
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const now=new Date().toISOString();
 let next:NonNullable<Campaign['combat']>={...c,reactionAttack:{...attack}};let detail='';
 if(kind==='hit'){
  if(attack.phase!=='roll-to-hit')throw Error('Attack roll already resolved.');
  const d20=die(20),bonus=abilityModifier(character.scores.dex)+character.proficiencyBonus,total=d20+bonus;
  const hit=d20===20||(d20!==1&&total>=12);
  next.reactionAttack={phase:hit?'roll-damage':'resolved',d20,total,hit,critical:d20===20};
  detail='Opportunity attack: d20 '+d20+' + '+bonus+' = '+total+' vs AC 12: '+(hit?'HIT. Roll dagger damage.':'MISS. The dummy can finish moving.');
 }else if(kind==='damage'){
  if(attack.phase!=='roll-damage')throw Error('Roll to hit first.');
  const first=die(4),extra=attack.critical?die(4):0,damage=Math.max(0,first+extra+abilityModifier(character.scores.dex));
  next.reactionAttack={...attack,phase:'resolved',damage};
  next.enemyHp=Math.max(0,(c.enemyHp??12)-damage);
  if(next.enemyHp===0){next.status='completed';next.outcome='nonlethal-victory';}
  detail='Opportunity attack dagger damage: '+first+(extra?' + '+extra+' critical die':'')+' + '+abilityModifier(character.scores.dex)+' DEX = '+damage+'. Training Dummy is '+enemyHealthDescription(next.enemyHp,c.enemyMaxHp??12)+'.';
 }else{
  if(attack.phase!=='resolved')throw Error('Finish rolling the reaction first.');
  next.opportunity=undefined;next.reactionAttack=undefined;
  if(c.status!=='completed')next.enemyPosition=c.opportunity.to;
  detail=c.status==='completed'?'The dummy is defeated before leaving reach.':'Reaction resolved; the dummy completes its movement.';
 }
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}

export function advanceDuelTestEnemyTurn(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order||combat.order[combat.turnIndex??0]==='Nighthawk')throw Error('No enemy turn to advance.');
 if(combat.opportunity)throw Error('Resolve the opportunity attack first.');
 const now=new Date().toISOString();
 const nextRound=combat.order[0]==='Nighthawk'?combat.round+1:combat.round;
 return {...campaign,concentration:campaign.concentration?.spell==='Readied Mind Sliver'?undefined:campaign.concentration,combat:{...combat,readiedAction:undefined,turnIndex:combat.order.indexOf('Nighthawk'),round:nextRound,movementUsed:0,actionUsed:false,bonusActionUsed:false,lastAction:undefined,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'TEST ONLY: '+combat.enemyName+' turn skipped without an attack, damage, or other effect. Nighthawk can act again.',createdAt:now}]};
}

export function rollDuelAttack(campaign:Campaign,kind:'hit'|'damage',applySneakAttack?:boolean):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.attack||combat.order?.[combat.turnIndex??0]!=='Nighthawk')throw Error('No attack awaiting a roll.');
 const next={...combat,attack:{...combat.attack}};
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 let description='';
 if(kind==='hit'){
  if(next.attack.phase!=='roll-to-hit')throw Error('Attack roll already made.');
  const character=campaign.character??prototypeNighthawk;
  const attackBonus=abilityModifier(next.attack.trueStrike?character.scores.int:character.scores.dex)+character.proficiencyBonus;
  const player=combat.playerPosition??{x:2,y:4},enemy=combat.selectedEnemy==='second'&&combat.secondEnemy?combat.secondEnemy.position:combat.enemyPosition??{x:6,y:4},withinFive=Math.max(Math.abs(player.x-enemy.x),Math.abs(player.y-enemy.y))<=1;const owlHelp=!!combat.owl&&combat.owl.helpTarget===(combat.selectedEnemy==='second'?'second':'first');const hasAdvantage=!!combat.playerHidden||!!combat.steadyAim||owlHelp||(!!combat.enemyProne&&combat.selectedEnemy!=='second'&&withinFive);const hasDisadvantage=!!next.attack.disadvantage||(!!combat.enemyProne&&combat.selectedEnemy!=='second'&&!withinFive);const advantage=hasAdvantage&&!hasDisadvantage;const disadvantage=hasDisadvantage&&!hasAdvantage;const firstD20=die(20),secondD20=(advantage||disadvantage)?die(20):undefined,d20=secondD20===undefined?firstD20:advantage?Math.max(firstD20,secondD20):Math.min(firstD20,secondD20),total=d20+attackBonus,critical=d20===20,hit=critical||(d20!==1&&total>=12);
  next.stats={...(next.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0}),attacks:(next.stats?.attacks??0)+1,hits:(next.stats?.hits??0)+(hit?1:0),criticalHits:(next.stats?.criticalHits??0)+(critical?1:0)};
  next.playerHidden=false;if(owlHelp&&next.owl)next.owl={...next.owl,helpTarget:undefined,helpRound:undefined};
  next.attack={phase:hit?'roll-damage':'resolved',d20,firstD20,total,critical,hit,advantage,disadvantage,weapon:next.attack.weapon,thrown:next.attack.thrown,trueStrike:next.attack.trueStrike,secondD20};next.sneakAttackEligible=hit&&!next.sneakAttackUsedThisTurn&&(advantage|| (!!next.trainingAllyAdjacent&&!disadvantage));
  if(next.attack.weapon==='shortbow')next.arrowsRemaining=(next.arrowsRemaining??20)-1;
  if(next.attack.thrown){next.daggersAvailable=(next.daggersAvailable??2)-1;next.daggersThrown=(next.daggersThrown??0)+1;}
  description=(next.attack.weapon==='shortbow'?'Shortbow (ranged)':next.attack.thrown?'Thrown dagger (ranged)':'Dagger (melee)')+': '+(secondD20===undefined?'':(advantage?'advantage ':'disadvantage ')+firstD20+'/'+secondD20+' → ')+'d20 '+d20+' + '+attackBonus+' = '+total+' vs training AC 12: '+(hit?'HIT':'MISS')+'.'+(critical?' Critical hit.':'');
 }else{
  if(next.attack.phase!=='roll-damage')throw Error('Roll to hit first.');
  const modifier=abilityModifier((campaign.character??prototypeNighthawk).scores[next.attack.trueStrike?'int':'dex']);
  const includeSneakAttack=applySneakAttack??!!next.sneakAttackEligible;
  if(includeSneakAttack&&!next.sneakAttackEligible)throw Error('Sneak Attack not eligible.');const sides=next.attack.weapon==='shortbow'?6:4;const first=die(sides),second=next.attack.critical?die(sides):0,sneakDice=includeSneakAttack?Math.ceil(((campaign.character??prototypeNighthawk).level??1)/2):0,sneakRolls=Array.from({length:sneakDice*(next.attack.critical?2:1)},()=>die(6)),sneakDamage=sneakRolls.reduce((a,b)=>a+b,0),radiantDice=next.attack.trueStrike?Math.floor((((campaign.character??prototypeNighthawk).level??1)+1)/6):0,radiantRolls=Array.from({length:radiantDice*(next.attack.critical?2:1)},()=>die(6)),radiantDamage=radiantRolls.reduce((a,b)=>a+b,0),damage=Math.max(0,first+second+modifier+sneakDamage+radiantDamage);
  next.attack={...next.attack,phase:'resolved',damage,weaponDamageRolls:second?[first,second]:[first],sneakAttackRolls:sneakRolls,sneakAttackDamage:sneakDamage};if(includeSneakAttack)next.sneakAttackUsedThisTurn=true;
  if(next.selectedEnemy==='second'&&next.secondEnemy){next.secondEnemy={...next.secondEnemy,hp:Math.max(0,next.secondEnemy.hp-damage)};}else{next.enemyHp=Math.max(0,(next.enemyHp??12)-damage);}
  next.stats={...(next.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0}),damage:(next.stats?.damage??0)+damage,sneakDamage:(next.stats?.sneakDamage??0)+sneakDamage};
  const bothDown=(next.enemyHp??12)===0&&(!next.secondEnemy||next.secondEnemy.hp===0);
  if(bothDown){next.status='completed';next.outcome='nonlethal-victory';}
  const targetName=next.selectedEnemy==='second'&&next.secondEnemy?next.secondEnemy.name:combat.enemyName;
  const hp=next.selectedEnemy==='second'&&next.secondEnemy?next.secondEnemy.hp:next.enemyHp??12;
  if(hp===0)next.stats={...next.stats!,finishingBlows:(next.stats?.finishingBlows??0)+1};
  description='Nighthawk '+(next.attack.critical?'CRITICAL HITS ':'hits ')+targetName+' for '+damage+' damage ('+[first,...(second?[second]:[])].join(' + ')+' weapon dice + '+modifier+(next.attack.trueStrike?' INT (True Strike)':' DEX')+(radiantDamage?' + '+radiantDamage+' radiant':'')+(sneakDice?' + '+sneakDamage+' Sneak Attack ('+sneakRolls.join(' + ')+')':'')+'). '+(hp===0?targetName+' collapses, defeated.':hp<=(next.selectedEnemy==='second'&&next.secondEnemy?next.secondEnemy.maxHp:next.enemyMaxHp??12)/2?targetName+' staggers, Bloodied.':targetName+' remains standing.')+(bothDown?' Encounter complete.':'');
  if(hp===0&&!bothDown){next.selectedEnemy=undefined;}
 }
 const now=new Date().toISOString();
 const result:Campaign={...campaign,equipment:{daggers:next.daggersAvailable??campaign.equipment?.daggers??2,arrows:next.arrowsRemaining??campaign.equipment?.arrows??20,caltrops:campaign.equipment?.caltrops??0,ballBearings:campaign.equipment?.ballBearings??0},combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
 return kind==='damage'?resolveLaughterDamageSave(result,combat.selectedEnemy==='second'?'second':'first',next.attack.damage??0):result;
}

export function quitTrainingEncounter(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.enemyName!=='Training Dummy')throw Error('Only encounter training can be reset this way.');
 const character=campaign.character??prototypeNighthawk;
 const maxHp=character.maxHitPoints??24;
 const now=new Date().toISOString();
 const equipment=campaign.equipment??{daggers:2,arrows:20,caltrops:0,ballBearings:0};
 return {...campaign,character:{...character,currentHitPoints:maxHp},
  equipment:{...equipment,daggers:2,arrows:20},
  combat:undefined,pendingAftermath:undefined,updatedAt:now,
  journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Encounter training reset. Nighthawk restored to '+maxHp+'/'+maxHp+' HP; dummy reset. Thrown daggers recovered. Start a new encounter when ready.',createdAt:now}]};
}

export function concludeDuel(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||((combat.enemyHp!==0||!!combat.secondEnemy&&combat.secondEnemy.hp!==0)&&combat.outcome!=='player-defeated'))throw Error('The sparring match has not ended.');
 const now=new Date().toISOString();
 if(combat.enemyName==='Training Dummy'){
  const character=campaign.character??prototypeNighthawk;
  const restoredHp=character.maxHitPoints??combat.trainingStartingHp??10;
  return {...campaign,character:{...character,currentHitPoints:restoredHp},equipment:{daggers:2,arrows:20,caltrops:campaign.equipment?.caltrops??0,ballBearings:campaign.equipment?.ballBearings??0},combat:undefined,pendingAftermath:undefined,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Training simulation ended; Nighthawk HP restored to '+restoredHp+'. All simulated thrown daggers recovered.',createdAt:now}]};
 }
 return {...campaign,combat:undefined,pendingAftermath:{opponent:combat.enemyName,playerDefeated:combat.outcome==='player-defeated'},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:combat.outcome==='player-defeated'?'Nighthawk was reduced to 0 HP by a nonlethal training strike and is unconscious. The sparring encounter is finished. Resume normal adventure and narrate aid and recovery, without restarting combat.':combat.enemyName+' was reduced to 0 HP by Nighthawk\'s nonlethal training strike and is unconscious, not dead. The sparring encounter is finished. Resume normal adventure; the DM narrates the aftermath and NPC reactions. Do not restart this combat.',createdAt:now}]};
}

export function setTrainingAllyAdjacent(campaign:Campaign,enabled:boolean):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||combat.attack?.phase==='roll-damage')throw Error('Finish pending attack first.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...combat,trainingAllyAdjacent:enabled},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:enabled?'Training ally adjacent to dummy; no advantage granted.':'Training ally removed.',createdAt:now}]};
}

export function setTrainingEnemyProne(campaign:Campaign,enabled:boolean):Campaign {
  requireLegacyNighthawk(campaign);
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||combat.attack?.phase==='roll-damage')throw Error('Finish pending attack first.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...combat,enemyProne:enabled},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:enabled?'Training enemy is Prone.':'Training enemy stands up.',createdAt:now}]};
}

export function grappleTrainingEnemy(campaign:Campaign):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Grapple requires your turn.');
 if(c.actionUsed||c.attack)throw Error('Attack action already used.');
 const second=c.selectedEnemy==='second'&&!!c.secondEnemy;
 const p=c.playerPosition??{x:2,y:4},e=second?c.secondEnemy!.position:c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Target must be within 5 feet.');
 const character=campaign.character??prototypeNighthawk;
 const dc=8+abilityModifier(character.scores.str)+character.proficiencyBonus;
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const grabbed=roll<dc;
 const detail='Grapple save: d20 '+roll+' vs DC '+dc+'. '+(grabbed?'Failed: Grappled (Speed 0).':'Passed: not Grappled.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,actionUsed:true,lastAction:'Grapple',enemyGrappled:second?c.enemyGrappled:grabbed,secondEnemy:second?{...c.secondEnemy!,grappled:grabbed}:c.secondEnemy,lastGrappleResult:(second?c.secondEnemy!.name:c.enemyName)+': '+detail},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function escapeTrainingGrapple(campaign:Campaign,ability:'str'|'dex'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.order?.[c.turnIndex??0]==='Nighthawk')throw Error('Escape requires an enemy turn.');
 const second=c.order?.[c.turnIndex??0]===c.secondEnemy?.name;
 if(!(second?c.secondEnemy?.grappled:c.enemyGrappled))throw Error('The active enemy is not Grappled.');
 const character=campaign.character??prototypeNighthawk;
 const dc=8+abilityModifier(character.scores.str)+character.proficiencyBonus;
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const success=roll>=dc;
 const detail='Escape '+(ability==='str'?'Athletics':'Acrobatics')+' check: d20 '+roll+' vs DC '+dc+'. '+(success?'Success: Grapple ends.':'Failure: still Grappled.');
 const now=new Date().toISOString();
 const nextRound=c.order?.[0]==='Nighthawk'?c.round+1:c.round;
 return {...campaign,combat:{...c,enemyGrappled:second?c.enemyGrappled:!success,secondEnemy:second?{...c.secondEnemy!,grappled:!success}:c.secondEnemy,lastGrappleResult:(second?c.secondEnemy!.name:c.enemyName)+': '+detail,turnIndex:c.order?.indexOf('Nighthawk')??0,round:nextRound,movementUsed:0,actionUsed:false,bonusActionUsed:false,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}
export function shoveTrainingEnemy(campaign:Campaign,outcome:'prone'|'push'):Campaign {
  requireLegacyNighthawk(campaign);
 const c=campaign.combat;
 if(!c||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]!=='Nighthawk')throw Error('Shove requires your turn.');
 if(c.actionUsed||c.attack)throw Error('Attack action already used.');
 const second=c.selectedEnemy==='second'&&!!c.secondEnemy;
 const p=c.playerPosition??{x:2,y:4},e=second?c.secondEnemy!.position:c.enemyPosition??{x:6,y:4};
 if(Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))>1)throw Error('Shove requires an enemy within 5 feet.');
 const character=campaign.character??prototypeNighthawk;
 const dc=8+abilityModifier(character.scores.str)+character.proficiencyBonus;
 // The training dummy has STR and DEX save modifiers of +0, so either save is equivalent.
 const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
 const succeeds=roll>=dc;
 let target={...e},prone=!!(second?c.secondEnemy?.prone:c.enemyProne),detail='';
 if(!succeeds){
  if(outcome==='prone'){prone=true;detail='The enemy falls Prone.';}
  else{
   const dx=Math.sign(e.x-p.x),dy=Math.sign(e.y-p.y);
   const pushed={x:e.x+dx,y:e.y+dy};
   if(pushed.x>=0&&pushed.x<9&&pushed.y>=0&&pushed.y<9){target=pushed;detail='The enemy is pushed 5 feet away.';}
   else detail='The enemy cannot be pushed beyond the grid boundary.';
  }
 }else detail='The enemy resists the Shove.';
 const now=new Date().toISOString();
 const description='Nighthawk attempts Shove ('+(outcome==='prone'?'Prone':'Push 5 ft')+'). DC '+dc+' Strength/Dexterity save: '+(succeeds?'PASSED':'FAILED')+'. '+detail;
 return {...campaign,combat:{...c,actionUsed:true,lastAction:'Shove',enemyPosition:second?c.enemyPosition:target,enemyProne:second?c.enemyProne:prone,secondEnemy:second?{...c.secondEnemy!,position:target,prone}:c.secondEnemy,lastShoveSave:{passed:succeeds,dc,outcome,effectApplied:!succeeds&&(outcome==='prone'||target.x!==e.x||target.y!==e.y)}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}

/** Explicit actor-scoped integration boundary; existing Nighthawk encounters never call these implicitly. */
export function updateSubclassActor(campaign:Campaign,actorId:string,update:(state:SubclassCombatState)=>SubclassCombatState):Campaign{
 const state=campaign.subclassActors?.[actorId];
 if(!state)throw new Error('Subclass actor not registered: '+actorId);
 return {...campaign,subclassActors:{...campaign.subclassActors,[actorId]:update(state)},updatedAt:new Date().toISOString()};
}
export function registerSubclassActor(campaign:Campaign,actorId:string,state:SubclassCombatState):Campaign{
 if(!/^[a-z][a-z0-9_-]{0,39}$/i.test(actorId)||['nighthawk','player','__proto__','prototype','constructor'].includes(actorId.toLowerCase()))throw new Error('Invalid or reserved subclass actor ID');
 if(Object.keys(campaign.subclassActors??{}).some(id=>id.toLowerCase()===actorId.toLowerCase()))throw new Error('Subclass actor ID already registered');
 return {...campaign,subclassActors:{...campaign.subclassActors,[actorId]:state},updatedAt:new Date().toISOString()};
}
export function restSubclassActor(campaign:Campaign,actorId:string,kind:'short'|'long',options:{fiendResistance?:DamageType;terrain?:Terrain}={}):Campaign{
 return updateSubclassActor(campaign,actorId,state=>finishSubclassRest(state,kind,options));
}
export function chooseSubclassResistance(campaign:Campaign,actorId:string,type:DamageType):Campaign{
 return updateSubclassActor(campaign,actorId,state=>selectFiendResistance(state,type));
}
export function useSubclassLuck(campaign:Campaign,actorId:string,roll:number):{campaign:Campaign;bonus:number}{
 let bonus=0;
 const next=updateSubclassActor(campaign,actorId,state=>{const result=spendDarkOnesOwnLuck(state,roll);bonus=result.bonus;return result.state;});
 return {campaign:next,bonus};
}
export function adjudicateSubclassActorDamage(campaign:Campaign,actorId:string,damage:number,type:DamageType):number{
 const actor=campaign.subclassActors?.[actorId];if(!actor)throw new Error('Subclass actor not registered');
 return resolveSubclassDamage(actor,damage,type);
}
export function adjudicateSubclassActorCondition(campaign:Campaign,actorId:string,condition:'Charmed'|'Poisoned'|'Other',context:{withinDevotionAura?:boolean;auraActive?:boolean}={}):boolean{
 const actor=campaign.subclassActors?.[actorId];if(!actor)throw new Error('Subclass actor not registered');
 return canApplyCondition(actor,condition,context);
}

export function requireRogue(campaign:Campaign):void{
 if((campaign.characterIdentity?.classId??campaign.character?.classId??'rogue')!=='rogue')throw Error('Rogue feature unavailable to this class');
}
export function requireLegacyNighthawk(campaign:Campaign):void{
 if(campaign.characterIdentity||campaign.character?.classId)throw Error('Nighthawk prototype mechanics are unavailable to imported characters; use the shared encounter');
}
