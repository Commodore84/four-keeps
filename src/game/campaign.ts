import { prototypeNighthawk, abilityModifier, type CharacterStats } from './checks';
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
  elapsedMinutes?: number;
  hitDiceRemaining?: number;
  lastLongRestCompletedAt?: number;
  concentration?: { spell: string; target?: string; startedAt: string };
  spellEffects?: { id: string; spell: string; target?: string; status: 'awaiting-adjudication' | 'active'; createdAt: string }[];
  familiar?: { form: 'Owl'; summonedAt: string };
  equipment?: {daggers:number;arrows:number;caltrops:number;ballBearings:number};
  xp?: number;
  xpAwards?: { id: string; amount: number; reason: string }[];
  levelOneSnapshot?: { character: CharacterStats; xp: number; xpAwards: { id: string; amount: number; reason: string }[] };
  combat?: { status:'awaiting-initiative'|'initiative-set'|'completed'; enemyName:string; enemyInitiative:number; playerInitiative?:number; round:number; order?:string[]; turnIndex?:number; movementUsed?:number; actionUsed?:boolean; bonusActionUsed?:boolean; lastAction?:string; arrowsRemaining?:number; daggersAvailable?:number; daggersThrown?:number; reactionUsed?:boolean; opportunity?:{from:{x:number;y:number};to:{x:number;y:number}}; attack?:{weapon?:'dagger'|'shortbow'; thrown?:boolean; disadvantage?:boolean; phase:'roll-to-hit'|'roll-damage'|'resolved'; d20?:number; firstD20?:number; total?:number; hit?:boolean; critical?:boolean; damage?:number; sneakAttackDamage?:number; advantage?:boolean; secondD20?:number}; steadyAim?:boolean; movementAllowance?:number; disengaged?:boolean; enemyHp?:number; enemyMaxHp?:number; outcome?:'nonlethal-victory'|'player-defeated'; enemyLastTurn?:string; trainingStartingHp?:number; playerPosition?:{x:number;y:number}; enemyPosition?:{x:number;y:number} };
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

/** Validate casting and atomically persist resource expenditure. Spell effects remain DM-adjudicated. */
export const concentrationSpells = ['Friends','Dancing Lights','Blade Ward','Tasha’s Hideous Laughter','Silent Image','Fog Cloud','Witch Bolt','Protection from Evil and Good','Expeditious Retreat','Detect Magic'] as const;
export const spellRequiresConcentration = (spell: string): boolean => (concentrationSpells as readonly string[]).includes(spell);
export function endNighthawkConcentration(campaign: Campaign): Campaign {
  if (!campaign.concentration) throw new Error('Not concentrating');
  const now = new Date().toISOString();
  return {...campaign, concentration:undefined, spellEffects:(campaign.spellEffects??[]).filter(e=>e.spell!==campaign.concentration?.spell || e.status!=='active'), updatedAt:now, journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk ends concentration on '+campaign.concentration.spell+'.',createdAt:now}]};
}
export function castNighthawkSpell(campaign: Campaign, spell: string, ritual: boolean, familiarComponentsConfirmed = false, target = ''): Campaign {
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
  if(!Number.isInteger(amount)||amount<1||amount>1000)throw new Error('Damage must be a positive whole number');
  const character=campaign.character??prototypeNighthawk;
  const before=character.currentHitPoints??character.maxHitPoints??10;
  const after=Math.max(0,before-amount);
  const now=new Date().toISOString();
  return {...campaign,character:{...character,currentHitPoints:after},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk takes '+amount+' damage ('+source+'). HP: '+before+' → '+after+'/'+(character.maxHitPoints??10)+'.',createdAt:now}]};
}

export function adjustEquipment(campaign:Campaign,item:'daggers'|'arrows'|'caltrops'|'ballBearings',delta:number):Campaign {
 if(campaign.combat)throw Error('Change equipment outside combat.');
 if(!Number.isInteger(delta)||Math.abs(delta)!==1)throw Error('Invalid quantity adjustment.');
 const equipment=campaign.equipment??{daggers:2,arrows:20,caltrops:0,ballBearings:0};
 const next=Math.max(0,equipment[item]+delta);
 const now=new Date().toISOString();
 return {...campaign,equipment:{...equipment,[item]:next},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Equipment adjusted: '+item+' '+equipment[item]+' → '+next+'.',createdAt:now}]};
}
export function beginDuel(campaign:Campaign, enemyName:string):Campaign {
  if(campaign.combat)return campaign;
  const clean=enemyName.trim().slice(0,60);
  if(!clean)throw Error('Encounter requires an opponent');
  const enemyRoll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
  const now=new Date().toISOString();
  return {...campaign,...(clean==='Training Dummy'?{character:{...(campaign.character??prototypeNighthawk),currentHitPoints:(campaign.character??prototypeNighthawk).maxHitPoints??10}}:{}),combat:{status:'awaiting-initiative',enemyName:clean,enemyInitiative:enemyRoll+1,round:1,...(clean==='Training Dummy'?{trainingStartingHp:(campaign.character??prototypeNighthawk).maxHitPoints??10}:{})},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Combat begins: Nighthawk vs '+clean+'. Enemy initiative rolled privately. Nighthawk must roll initiative.',createdAt:now}]};
}
export function rollDuelInitiative(campaign:Campaign):Campaign {
  const combat=campaign.combat;
  if(!combat||combat.status!=='awaiting-initiative')throw Error('No initiative roll pending');
  const dex=(campaign.character??prototypeNighthawk).scores.dex;
  const modifier=Math.floor((dex-10)/2);
  const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
  const total=roll+modifier;
  const order=total>=combat.enemyInitiative?['Nighthawk',combat.enemyName]:[combat.enemyName,'Nighthawk'];
  const now=new Date().toISOString();
  return {...campaign,combat:{...combat,status:'initiative-set',playerInitiative:total,order,turnIndex:0,reactionUsed:false,movementUsed:0,actionUsed:false,bonusActionUsed:false,enemyHp:12,enemyMaxHp:12,arrowsRemaining:campaign.equipment?.arrows??20,daggersAvailable:campaign.equipment?.daggers??2,daggersThrown:0,playerPosition:{x:1,y:3},enemyPosition:{x:5,y:3}},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk initiative: d20 '+roll+' + DEX '+modifier+' = '+total+'. '+combat.enemyName+': '+combat.enemyInitiative+'. Turn order: '+order.join(' → ')+'.',createdAt:now}]};
}

export function moveDuelToken(campaign:Campaign,x:number,y:number):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||combat.order?.[combat.turnIndex??0]!=='Nighthawk')throw Error('You can move only on your turn.');
 if(combat.steadyAim||combat.attack)throw Error('Movement is unavailable after Steady Aim or while resolving an attack.');
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>6||y<0||y>6)throw Error('Destination is outside the map.');
 const from=combat.playerPosition??{x:1,y:3};
 const enemy=combat.enemyPosition??{x:5,y:3};
 if(x===enemy.x&&y===enemy.y)throw Error('That square is occupied by the opponent.');
 const cost=5*Math.max(Math.abs(x-from.x),Math.abs(y-from.y));
 if(cost===0)throw Error('Choose another square.');
 const used=combat.movementUsed??0;
 const allowance=combat.movementAllowance??35;
 if(used+cost>allowance)throw Error('Not enough movement remaining.');
 const now=new Date().toISOString();
 return {...campaign,combat:{...combat,playerPosition:{x,y},movementUsed:used+cost},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Nighthawk moves '+cost+' feet on the tactical grid ('+(used+cost)+'/'+allowance+' feet used).',createdAt:now}]};
}

export function takeDuelTurnAction(campaign:Campaign, action:'move'|'attack'|'throw-dagger'|'shortbow'|'dash'|'disengage'|'dodge'|'steady-aim'|'cunning-dash'|'cunning-disengage'|'end'):Campaign {
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
   if(next.attack && next.attack.phase!=='resolved')throw Error('Resolve the attack before ending the turn.');
   next.turnIndex=1;next.movementUsed=0;next.actionUsed=false;next.bonusActionUsed=false;next.attack=undefined;next.steadyAim=false;next.movementAllowance=speed;next.disengaged=false;
   description='Nighthawk ends their turn. '+combat.enemyName+' is next.';
 }else {
   if(next.actionUsed)throw Error('Action already used this turn.');
   next.actionUsed=true;
   if(action==='dash'){next.lastAction='Dash';next.movementAllowance=(next.movementAllowance??speed)+speed;description='Nighthawk Dashes, gaining another '+speed+' feet of movement this turn.';}
   if(action==='disengage'){next.lastAction='Disengage';next.disengaged=true;description='Nighthawk takes the Disengage action.';}
   if(action==='dodge'){next.lastAction='Dodge';description='Nighthawk takes the Dodge action.';}
   if(action==='attack'||action==='throw-dagger'||action==='shortbow'){
    const p=next.playerPosition??{x:1,y:3},e=next.enemyPosition??{x:5,y:3};
    const distance=5*Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y));
    const thrown=action==='throw-dagger',bow=action==='shortbow';
    if(action==='attack'&&distance>5)throw Error('Dagger melee requires an adjacent enemy.');
    if(thrown&&distance>60)throw Error('Thrown dagger is out of range (60 ft maximum).');
    if((thrown||action==='attack')&&(next.daggersAvailable??2)<1)throw Error('No dagger available. Recover a thrown dagger after the encounter.');
    if(bow&&distance>320)throw Error('Shortbow is out of range (320 ft maximum).');
    if(bow&&(next.arrowsRemaining??20)<1)throw Error('No arrows remaining.');
    next.lastAction=bow?'Shortbow':thrown?'Thrown Dagger':'Dagger';
    next.attack={phase:'roll-to-hit',weapon:bow?'shortbow':'dagger',thrown,disadvantage:(bow||thrown)&&(distance<=5||distance>(bow?80:20))};
    description='Nighthawk prepares '+(bow?'a shortbow shot':thrown?'a thrown dagger':'a melee dagger strike')+' at '+distance+' feet. Roll to hit next.';
  }
 }
 const now=new Date().toISOString();
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}

export function resolveDuelEnemyTurn(campaign:Campaign):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order||combat.order[combat.turnIndex??0]==='Nighthawk')throw Error('It is not the opponent\'s turn.');
 if(combat.opportunity)throw Error('Resolve the opportunity attack before continuing.');
 const character=campaign.character??prototypeNighthawk;
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 const first=die(20);
 const dodging=combat.lastAction==='Dodge';
 const second=dodging?die(20):undefined;
 const attackRoll=second===undefined?first:Math.min(first,second);
 const total=attackRoll+4;
 const ac=14; // Temporary training AC; replace with equipment-derived AC later.
 const hit=attackRoll===20||(attackRoll!==1&&total>=ac);
 const critical=attackRoll===20;
 const damage=hit?die(6)+(critical?die(6):0)+2:0;
 const before=character.currentHitPoints??character.maxHitPoints??10;
 const after=Math.max(0,before-damage);
 const defeated=hit&&after===0;
 const detail=combat.enemyName+' training attack: '+(dodging?'disadvantage ('+first+', '+second+') → ':'d20 ')+attackRoll+' + 4 = '+total+' vs temporary AC '+ac+': '+(hit?'HIT':'MISS')+'.'+(hit?' Nonlethal damage: '+damage+'. Nighthawk HP: '+before+' → '+after+'/'+(character.maxHitPoints??10)+'.':'')+(defeated?' Nighthawk is knocked unconscious; sparring ends.':'');
 const nextRound=combat.order[0]==='Nighthawk'?combat.round+1:combat.round;
 const nextCombat={...combat,turnIndex:combat.order.indexOf('Nighthawk'),round:nextRound,reactionUsed:false,movementUsed:0,actionUsed:false,bonusActionUsed:false,lastAction:undefined,attack:undefined,enemyLastTurn:detail,status:defeated?'completed' as const:combat.status,outcome:defeated?'player-defeated' as const:combat.outcome};
 const now=new Date().toISOString();
 return {...campaign,character:{...character,currentHitPoints:after},combat:nextCombat,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}

export function moveTrainingDummy(campaign:Campaign):Campaign {
 const c=campaign.combat;
 if(!c||c.enemyName!=='Training Dummy'||c.status!=='initiative-set'||c.order?.[c.turnIndex??0]==='Nighthawk'||c.opportunity)throw Error('Dummy movement is unavailable.');
 const p=c.playerPosition??{x:1,y:3},e=c.enemyPosition??{x:5,y:3};
 const adjacent=Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))<=1;
 const step=(v:number)=>Math.sign(v);
 const target=adjacent?{x:e.x+step(e.x-p.x||1),y:e.y+step(e.y-p.y||0)}:{x:e.x+step(p.x-e.x),y:e.y+step(p.y-e.y)};
 const to={x:Math.max(0,Math.min(6,target.x)),y:Math.max(0,Math.min(6,target.y))};
 if(to.x===e.x&&to.y===e.y)throw Error('Dummy cannot move farther on this grid.');
 const opportunity=adjacent&&!c.reactionUsed?{from:e,to}:undefined;
 const now=new Date().toISOString();
 return {...campaign,combat:{...c,enemyPosition:opportunity?e:to,opportunity},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:opportunity?'Training dummy starts leaving Nighthawk’s reach. Opportunity attack available before it moves.':'Training dummy moves one square toward Nighthawk.',createdAt:now}]};
}

export function resolveTrainingReaction(campaign:Campaign,choice:'attack'|'decline'):Campaign {
 const c=campaign.combat;
 if(!c||!c.opportunity||c.status!=='initiative-set'||c.reactionUsed)throw Error('No opportunity attack pending.');
 const {to}=c.opportunity;
 const next={...c,opportunity:undefined,enemyPosition:to,reactionUsed:choice==='attack'};
 let detail='Nighthawk declines the opportunity attack. The dummy moves away.';
 if(choice==='attack'){
  if((c.daggersAvailable??2)<1)throw Error('No melee dagger available for the reaction.');
  const character=campaign.character??prototypeNighthawk;
  const roll=crypto.getRandomValues(new Uint32Array(1))[0]%20+1;
  const bonus=abilityModifier(character.scores.dex)+character.proficiencyBonus;
  const total=roll+bonus,hit=roll===20||(roll!==1&&total>=12);
  const damage=hit?(crypto.getRandomValues(new Uint32Array(1))[0]%4+1)+(roll===20?(crypto.getRandomValues(new Uint32Array(1))[0]%4+1):0)+abilityModifier(character.scores.dex):0;
  next.enemyHp=Math.max(0,(c.enemyHp??12)-Math.max(0,damage));
  if(next.enemyHp===0){next.status='completed';next.outcome='nonlethal-victory';next.enemyPosition=c.opportunity.from;}
  detail='Opportunity attack (reaction): dagger d20 '+roll+' + '+bonus+' = '+total+' vs AC 12: '+(hit?'HIT for '+damage+' damage':'MISS')+'. '+(next.enemyHp===0?'Dummy is defeated before moving.':'Dummy completes its movement.')+' Reaction spent until Nighthawk’s next turn.';
 }
 const now=new Date().toISOString();
 return {...campaign,combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:detail,createdAt:now}]};
}

export function advanceDuelTestEnemyTurn(campaign:Campaign):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.order||combat.order[combat.turnIndex??0]==='Nighthawk')throw Error('No enemy turn to advance.');
 if(combat.opportunity)throw Error('Resolve the opportunity attack first.');
 const now=new Date().toISOString();
 const nextRound=combat.order[0]==='Nighthawk'?combat.round+1:combat.round;
 return {...campaign,combat:{...combat,turnIndex:combat.order.indexOf('Nighthawk'),round:nextRound,movementUsed:0,actionUsed:false,bonusActionUsed:false,lastAction:undefined,attack:undefined},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'TEST ONLY: '+combat.enemyName+' turn skipped without an attack, damage, or other effect. Nighthawk can act again.',createdAt:now}]};
}

export function rollDuelAttack(campaign:Campaign,kind:'hit'|'damage'):Campaign {
 const combat=campaign.combat;
 if(!combat||combat.status!=='initiative-set'||!combat.attack||combat.order?.[combat.turnIndex??0]!=='Nighthawk')throw Error('No attack awaiting a roll.');
 const next={...combat,attack:{...combat.attack}};
 const die=(sides:number)=>crypto.getRandomValues(new Uint32Array(1))[0]%sides+1;
 let description='';
 if(kind==='hit'){
  if(next.attack.phase!=='roll-to-hit')throw Error('Attack roll already made.');
  const character=campaign.character??prototypeNighthawk;
  const attackBonus=abilityModifier(character.scores.dex)+character.proficiencyBonus;
  const advantage=!!combat.steadyAim&&!next.attack.disadvantage;const disadvantage=!!next.attack.disadvantage&&!combat.steadyAim;const firstD20=die(20),secondD20=(advantage||disadvantage)?die(20):undefined,d20=secondD20===undefined?firstD20:advantage?Math.max(firstD20,secondD20):Math.min(firstD20,secondD20),total=d20+attackBonus,critical=d20===20,hit=critical||(d20!==1&&total>=12);
  next.attack={phase:hit?'roll-damage':'resolved',d20,firstD20,total,critical,hit,advantage,disadvantage,weapon:next.attack.weapon,thrown:next.attack.thrown,secondD20};
  if(next.attack.weapon==='shortbow')next.arrowsRemaining=(next.arrowsRemaining??20)-1;
  if(next.attack.thrown){next.daggersAvailable=(next.daggersAvailable??2)-1;next.daggersThrown=(next.daggersThrown??0)+1;}
  description=(next.attack.weapon==='shortbow'?'Shortbow (ranged)':next.attack.thrown?'Thrown dagger (ranged)':'Dagger (nonlethal melee)')+': '+(secondD20===undefined?'':(advantage?'advantage ':'disadvantage ')+firstD20+'/'+secondD20+' → ')+'d20 '+d20+' + '+attackBonus+' = '+total+' vs training AC 12: '+(hit?'HIT':'MISS')+'.'+(critical?' Critical hit.':'');
 }else{
  if(next.attack.phase!=='roll-damage')throw Error('Roll to hit first.');
  const modifier=abilityModifier((campaign.character??prototypeNighthawk).scores.dex);
  const sides=next.attack.weapon==='shortbow'?6:4;const first=die(sides),second=next.attack.critical?die(sides):0,sneakDice=next.attack.advantage?2:0,sneakRolls=Array.from({length:sneakDice*(next.attack.critical?2:1)},()=>die(6)),sneakDamage=sneakRolls.reduce((a,b)=>a+b,0),damage=Math.max(0,first+second+modifier+sneakDamage);
  next.attack={...next.attack,phase:'resolved',damage,sneakAttackDamage:sneakDamage};
  next.enemyHp=Math.max(0,(next.enemyHp??12)-damage);
  if(next.enemyHp===0){next.status='completed';next.outcome='nonlethal-victory';}
  description=(next.attack.weapon==='shortbow'?'Shortbow piercing damage: ':next.attack.thrown?'Thrown dagger piercing damage: ':'Nonlethal dagger damage: ')+first+(second?' + '+second+' (critical)':'')+' + '+modifier+' DEX'+(sneakDice?' + Sneak Attack '+sneakRolls.join('+')+' = '+sneakDamage:'')+' = '+damage+'. '+combat.enemyName+' HP: '+next.enemyHp+'/'+(next.enemyMaxHp??12)+(next.enemyHp===0?' '+combat.enemyName+' falls unconscious from the nonlethal strike. Combat is over.':'')+'.';
 }
 const now=new Date().toISOString();
 return {...campaign,equipment:{daggers:next.daggersAvailable??campaign.equipment?.daggers??2,arrows:next.arrowsRemaining??campaign.equipment?.arrows??20,caltrops:campaign.equipment?.caltrops??0,ballBearings:campaign.equipment?.ballBearings??0},combat:next,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:description,createdAt:now}]};
}

export function concludeDuel(campaign:Campaign):Campaign {
 const combat=campaign.combat;
 if(!combat||(combat.enemyHp!==0&&combat.outcome!=='player-defeated'))throw Error('The sparring match has not ended.');
 const now=new Date().toISOString();
 if(combat.enemyName==='Training Dummy'){
  const character=campaign.character??prototypeNighthawk;
  const restoredHp=character.maxHitPoints??combat.trainingStartingHp??10;
  return {...campaign,character:{...character,currentHitPoints:restoredHp},equipment:{daggers:(campaign.equipment?.daggers??combat.daggersAvailable??2)+(combat.daggersThrown??0),arrows:campaign.equipment?.arrows??combat.arrowsRemaining??20,caltrops:campaign.equipment?.caltrops??0,ballBearings:campaign.equipment?.ballBearings??0},combat:undefined,pendingAftermath:undefined,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Training simulation ended; Nighthawk HP restored to '+restoredHp+'. All simulated thrown daggers recovered.',createdAt:now}]};
 }
 return {...campaign,combat:undefined,pendingAftermath:{opponent:combat.enemyName,playerDefeated:combat.outcome==='player-defeated'},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:combat.outcome==='player-defeated'?'Nighthawk was reduced to 0 HP by a nonlethal training strike and is unconscious. The sparring encounter is finished. Resume normal adventure and narrate aid and recovery, without restarting combat.':combat.enemyName+' was reduced to 0 HP by Nighthawk\'s nonlethal training strike and is unconscious, not dead. The sparring encounter is finished. Resume normal adventure; the DM narrates the aftermath and NPC reactions. Do not restart this combat.',createdAt:now}]};
}
