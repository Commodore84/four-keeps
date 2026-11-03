import { prototypeNighthawk, type CharacterStats } from './checks';
import { emptyWorld, mergeWorld, normalizeWorld, type WorldState } from './world';
export interface JournalEntry { id: string; text: string; createdAt: string; kind: 'note' | 'system' | 'player' | 'dm' }
export interface Campaign {
  schemaVersion: 1;
  id: string;
  title: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  journal: JournalEntry[];
  worldFacts?: string[];
  world?: WorldState;
  character?: CharacterStats;
  preReconciliationScores?: CharacterStats['scores'];
  xp?: number;
  xpAwards?: { id: string; amount: number; reason: string }[];
  levelOneSnapshot?: { character: CharacterStats; xp: number; xpAwards: { id: string; amount: number; reason: string }[] };
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
  return c.schemaVersion === 1 && typeof c.id === 'string' && typeof c.title === 'string'
    && typeof c.location === 'string' && typeof c.createdAt === 'string'
    && typeof c.updatedAt === 'string' && (c.character === undefined || (typeof c.character === 'object' && c.character !== null && ['str','dex','con','int','wis','cha'].every(a => Number.isInteger(c.character?.scores?.[a as keyof CharacterStats['scores']]) && c.character!.scores[a as keyof CharacterStats['scores']] >= 1 && c.character!.scores[a as keyof CharacterStats['scores']] <= 30) && Number.isInteger(c.character.proficiencyBonus) && c.character.proficiencyBonus >= 2 && c.character.proficiencyBonus <= 9 && Array.isArray(c.character.proficientSkills) && c.character.proficientSkills.every(s => typeof s === 'string'))) && (c.xp === undefined || (Number.isInteger(c.xp) && c.xp >= 0)) && (c.xpAwards === undefined || (Array.isArray(c.xpAwards) && c.xpAwards.every(a => typeof a.id === 'string' && Number.isInteger(a.amount) && a.amount > 0 && typeof a.reason === 'string'))) && (c.pendingCheck === undefined || (typeof c.pendingCheck.skill === 'string' && typeof c.pendingCheck.token === 'string' && typeof c.pendingCheck.reason === 'string' && ['normal','advantage','disadvantage'].includes(c.pendingCheck.mode) && (c.pendingCheck.dice === undefined || (Array.isArray(c.pendingCheck.dice) && c.pendingCheck.dice.every(n => Number.isInteger(n) && n >= 1 && n <= 20))))) && (c.world === undefined || JSON.stringify(normalizeWorld(c.world)) === JSON.stringify(c.world)) && (c.worldFacts === undefined || (Array.isArray(c.worldFacts) && c.worldFacts.every((fact) => typeof fact === 'string'))) && Array.isArray(c.journal)
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
  if (!campaign.character || campaign.preReconciliationScores) throw new Error('Scores already reconciled or character missing');
  const scores = { str: 8, dex: 17, con: 14, int: 16, wis: 10, cha: 8 };
  return { ...campaign, preReconciliationScores: structuredClone(campaign.character.scores), character: { ...campaign.character, scores }, updatedAt: new Date().toISOString(), journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: 'Player confirmed reconciliation of provisional ability scores: STR 8, DEX 17, CON 14, INT 16, WIS 10, CHA 8.', createdAt: new Date().toISOString() }] };
}
export function undoNighthawkScoreReconciliation(campaign: Campaign): Campaign {
  if (!campaign.character || !campaign.preReconciliationScores) throw new Error('No previous scores to restore');
  return { ...campaign, character: { ...campaign.character, scores: structuredClone(campaign.preReconciliationScores) }, preReconciliationScores: undefined, updatedAt: new Date().toISOString(), journal: [...campaign.journal, { id: crypto.randomUUID(), kind: 'system', text: 'Restored prior playtest ability scores.', createdAt: new Date().toISOString() }] };
}
