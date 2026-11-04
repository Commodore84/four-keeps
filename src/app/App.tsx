import { useEffect, useRef, useState } from 'react';
import { createBackup, parseBackup } from '../game/backup';
import { BookOpen, Compass, Map, RefreshCw, Send, Settings, Shield, Swords, Users } from 'lucide-react';
import { addExchange, addNote, addRoll, beginDuel, rollDuelInitiative, newCampaign, awardExperience, levelUpRogue, levelUpArcaneTrickster, tricksterCantrips, tricksterSpells, isRitualSpell, castNighthawkSpell, takeNighthawkRest, applyNighthawkDamage, minutesUntilLongRestEligible, advanceToLongRestEligibility, endNighthawkConcentration, spellRequiresConcentration, reconcileNighthawkScores, undoNighthawkScoreReconciliation, xpThresholds, type Campaign } from '../game/campaign';
import { localCampaignStorage } from '../game/storage';
import type { View } from '../game/types';
import { emptyWorld } from '../game/world';
import { prototypeNighthawk, abilities, abilityModifier, skillAbility, skillModifier, savingThrowModifier, passivePerception, rogueSneakAttackDice, rollCheck, describeCheck, type Skill, type RollMode } from '../game/checks';

const spellSummaries: Record<string,string> = {
  "Acid Splash": "Hurl acid at a creature; it makes a Dexterity saving throw or takes acid damage.",
  "Blade Ward": "Protect yourself against weapon attacks with a defensive ward.",
  "Chill Touch": "A spectral touch deals necrotic damage and interferes with healing.",
  "Dancing Lights": "Create movable magical lights to illuminate or distract.",
  "Elementalism": "Produce small elemental effects involving air, earth, fire, or water.",
  "Fire Bolt": "Hurl a bolt of fire at a target; can ignite unattended flammable objects.",
  "Friends": "Temporarily improve your ability to influence a creature with magic.",
  "Light": "Make an object shed bright and dim light.",
  "Mage Hand": "Create a spectral hand to manipulate objects at a distance; Arcane Trickster enhances it.",
  "Mending": "Repair a small break or tear in an object.",
  "Message": "Whisper a private magical message to a creature at a distance.",
  "Mind Sliver": "Assault a creature’s mind with psychic damage; its next saving throw is hindered.",
  "Minor Illusion": "Create a sound or image of an object to distract, misdirect, or conceal.",
  "Poison Spray": "Spray toxic magic at a nearby creature.",
  "Prestidigitation": "Perform minor magical tricks, cleaning, sensory effects, and small illusions.",
  "Ray of Frost": "Fire a cold ray that damages and slows a target.",
  "Shocking Grasp": "Deliver a jolt of lightning by touch.",
  "True Strike": "Guide a weapon attack with magic, using your spellcasting ability.",
  "Alarm": "Ward a door, window, or area and receive an alert when a creature enters.",
  "Burning Hands": "Release a short cone of flame that damages creatures in its path.",
  "Charm Person": "Magically charm a humanoid for a limited time.",
  "Chromatic Orb": "Launch a sphere of elemental energy with a chosen damage type.",
  "Color Spray": "Dazzle creatures with a burst of colored light.",
  "Comprehend Languages": "Understand the literal meaning of spoken and written languages.",
  "Detect Magic": "Sense nearby magic and examine magical auras.",
  "Disguise Self": "Change your visible appearance with an illusion, without changing your physical form.",
  "Expeditious Retreat": "Move more quickly by using Dash repeatedly.",
  "False Life": "Bolster yourself with temporary hit points.",
  "Feather Fall": "Slow falling creatures to protect them from fall damage.",
  "Find Familiar": "Summon a spirit in animal form, such as an owl, for scouting and assistance.",
  "Fog Cloud": "Create a cloud of fog that heavily obscures an area.",
  "Grease": "Coat ground with slippery grease that can knock creatures prone.",
  "Identify": "Learn the properties of a magic item or spell affecting an object.",
  "Illusory Script": "Hide a written message behind magical illusion.",
  "Jump": "Enhance a creature’s jumping ability.",
  "Longstrider": "Increase a creature’s movement speed.",
  "Mage Armor": "Protect an unarmored creature with magical armor.",
  "Magic Missile": "Fire magical darts that automatically strike targets.",
  "Protection from Evil and Good": "Protect a creature from certain supernatural creature types.",
  "Shield": "React to an attack with a temporary magical boost to AC.",
  "Silent Image": "Create a movable visual illusion.",
  "Sleep": "Put creatures into a magical sleep.",
  "Tasha’s Hideous Laughter": "Overcome a creature with magical laughter, potentially incapacitating it.",
  "Tenser’s Floating Disk": "Create a hovering disk that carries equipment and follows you.",
  "Thunderwave": "Release a thunderous blast that damages and pushes creatures.",
  "Unseen Servant": "Conjure an invisible force to perform simple tasks.",
  "Witch Bolt": "Connect to a target with crackling lightning energy."
};
const tabs = [
  { id: 'adventure', label: 'Adventure', Icon: Compass },
  { id: 'party', label: 'Player', Icon: Users },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'map', label: 'Map', Icon: Map },
  { id: 'settings', label: 'Settings', Icon: Settings },
] as const;

function Adventure({ campaign, fullHistory, onToggleHistory }: { campaign: Campaign | null; fullHistory: boolean; onToggleHistory: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastTurn = campaign?.journal.filter((entry) => entry.kind === 'player' || entry.kind === 'dm').at(-1)?.id;
  useEffect(() => { if (lastTurn) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [lastTurn]);
  const allTurns = campaign?.journal.filter((entry) => entry.kind === 'player' || entry.kind === 'dm') ?? [];
  const turns = fullHistory ? allTurns : allTurns.slice(-6);
  return <section className="space-y-5" aria-label="Adventure">
    {allTurns.length > 6 && <button type="button" onClick={onToggleHistory} className="w-full rounded-lg border border-gold/30 px-4 py-3 text-sm text-gold">{fullHistory ? "Show recent conversation" : "View full conversation history ("+allTurns.length+" messages)"}</button>}
    {turns.length === 0 && <div className="scene"><div className="scene-glow"/><div className="absolute bottom-5 left-5 right-5"><p className="eyebrow">Chapter One</p><h2 className="font-serif text-3xl">A Road to the Forgotten Keep</h2></div></div>}
    {turns.length === 0 && <div className="rounded-xl border border-white/10 bg-panel p-5 space-y-3">
      <p className="eyebrow">Dungeon Master</p>
      <p className="leading-7 text-parchment/85">The road bends toward a frontier village, its lanterns glowing beneath the evening mist. Beyond the tree line, an old keep waits in silence.</p>
    </div>}
    {turns.map((entry) => <article key={entry.id} className={entry.kind === 'player' ? 'ml-8 rounded-xl border border-gold/30 bg-gold/10 p-4' : 'mr-3 rounded-xl border border-white/10 bg-panel p-5'}>
      <p className="eyebrow">{entry.kind === 'player' ? 'Nighthawk' : 'Dungeon Master'}</p>
      <p className="mt-2 whitespace-pre-wrap leading-7 text-parchment/90">{entry.text}</p>
    </article>)}
    {campaign && <p className="text-xs text-gold/80">Campaign saved on this device · {turns.length ? 'AI Dungeon Master connected' : 'Ready for your first action'}</p>}
    <div ref={endRef}/>
  </section>;
}
function Party({ campaign, onRoll, onSaveRoll, onAwardXP, onLevelUp, onLevelThree, onReconcile, onUndoReconcile, onRestore, onCastSpell, onEndConcentration, saving }: { campaign: Campaign | null; onRoll: (skill: Skill, mode: RollMode) => void; onSaveRoll: (ability: typeof abilities[number], mode: RollMode) => void; onAwardXP: (amount: number, reason: string) => void; onLevelUp: (hpGain: number) => void; onLevelThree: (hpGain: number, cantrips: string[], spells: string[]) => void; onReconcile: () => void; onUndoReconcile: () => void; onRestore: () => void; onCastSpell: (spell: string, ritual: boolean, components: boolean, target: string) => void; onEndConcentration: () => void; saving: boolean }) {
  const [mode, setMode] = useState<RollMode>('normal');
  const [testXP, setTestXP] = useState('300');
  const [hpChoice, setHpChoice] = useState('7');
  const [cantripChoices, setCantripChoices] = useState<string[]>(['Minor Illusion','Mind Sliver']);
  const [spellChoices, setSpellChoices] = useState<string[]>(['Find Familiar','Tasha’s Hideous Laughter','Disguise Self']);
  const [selectedSpell, setSelectedSpell] = useState<string | null>(null);
  const [castRitual, setCastRitual] = useState(false);
  const [componentsConfirmed, setComponentsConfirmed] = useState(false);
  const [spellTarget, setSpellTarget] = useState('');
  const skills = Object.keys(skillAbility) as Skill[];
  const stats = campaign?.character ?? prototypeNighthawk;
  const lastRoll = campaign?.journal.filter(entry => entry.kind === 'system' && (entry.text.startsWith('Nighthawk rolled ') || entry.text.startsWith('Nighthawk · '))).at(-1);
  const signed = (value: number) => (value >= 0 ? '+' : '') + value;
  return <section className="space-y-4"><div className="flex items-center gap-3"><Shield className="text-gold"/><h2 className="font-serif text-2xl">Player Character</h2></div>
    <div className="rounded-xl border border-white/10 bg-panel p-5">
      <p className="font-semibold">Nighthawk</p><p className="mt-1 text-sm text-parchment/60">Wood Elf Rogue · Level {stats.level ?? 1} · Playtest character sheet</p>
      <div className="mt-4 rounded-lg border border-gold/30 p-3"><p className="text-sm">Level {stats.level ?? 1} · {campaign?.xp ?? 0} XP / {xpThresholds[Math.min(stats.level ?? 1,19)]} XP to next level</p><div className="mt-2 h-2 rounded-full bg-ink"><div className="h-full rounded-full bg-gold" style={{ width: Math.min(100, ((campaign?.xp ?? 0) / (xpThresholds[Math.min(stats.level ?? 1,19)] || 1)) * 100) + "%" }}/></div>{(stats.level ?? 1) === 1 && (campaign?.xp ?? 0) >= 300 && <div className="mt-3 space-y-2"><p className="text-sm text-gold">Level 2 unlocked: Cunning Action, +HP</p><label className="block text-xs">HP increase<select className="mt-1 w-full rounded-lg bg-ink p-2 text-base" value={hpChoice} onChange={e => setHpChoice(e.target.value)}><option value="7">Fixed 5 + CON 2 = 7 HP</option>{Array.from({length:8},(_,i)=><option key={i} value={i+3}>Rolled {i+1} + CON 2 = {i+3} HP</option>)}</select></label><button type="button" disabled={saving} onClick={() => onLevelUp(Number(hpChoice))} className="rounded-lg bg-gold px-4 py-2 font-semibold text-ink">Confirm Level 2</button></div>}</div>
      {(stats.level ?? 1) === 2 && (campaign?.xp ?? 0) >= 900 && <div className="mt-3 rounded-xl border-2 border-gold bg-gold/10 p-4 space-y-3"><p className="text-xs font-bold uppercase tracking-widest text-gold">Level up available</p><h3 className="font-serif text-xl">Level 3 · Arcane Trickster</h3><p className="text-sm">Unlock Steady Aim, Mage Hand Legerdemain, Spellcasting, Sneak Attack 2d6 and more HP. Choose your spells before confirming.</p>
        <label className="block text-sm">HP increase<select className="mt-1 w-full rounded-lg bg-ink p-2 text-base" value={hpChoice} onChange={e=>setHpChoice(e.target.value)}><option value="7">Fixed 5 + CON 2 = 7 HP</option>{Array.from({length:8},(_,i)=><option key={i} value={i+3}>Rolled {i+1} + CON 2 = {i+3} HP</option>)}</select></label>
        <div><p className="text-sm font-semibold">Cantrips · {cantripChoices.length}/2</p><p className="text-xs text-parchment/70">Mage Hand is granted automatically. Choose two additional Wizard cantrips.</p><div className="mt-2 grid grid-cols-2 gap-2">{tricksterCantrips.filter(s=>s!=='Mage Hand').map(s=><label key={s} className="flex items-center gap-2 rounded-lg border border-white/15 p-2 text-xs"><input type="checkbox" checked={cantripChoices.includes(s)} disabled={!cantripChoices.includes(s) && cantripChoices.length>=2} onChange={e=>setCantripChoices(v=>e.target.checked?[...v,s]:v.filter(x=>x!==s))}/><button type="button" className="text-left underline decoration-dotted underline-offset-2" onClick={()=>setSelectedSpell(s)}>{s}</button></label>)}</div></div>
        <div><p className="text-sm font-semibold">Level 1 Wizard spells · {spellChoices.length}/3</p><p className="text-xs text-parchment/70">Choose three spells to prepare. You have two Level 1 spell slots.</p><div className="mt-2 grid grid-cols-2 gap-2">{tricksterSpells.map(s=><label key={s} className="flex items-center gap-2 rounded-lg border border-white/15 p-2 text-xs"><input type="checkbox" checked={spellChoices.includes(s)} disabled={!spellChoices.includes(s) && spellChoices.length>=3} onChange={e=>setSpellChoices(v=>e.target.checked?[...v,s]:v.filter(x=>x!==s))}/><button type="button" className="text-left underline decoration-dotted underline-offset-2" onClick={()=>setSelectedSpell(s)}>{s}{isRitualSpell(s) ? ' (Ritual)' : ''}</button></label>)}</div></div>
        <button type="button" disabled={saving || cantripChoices.length!==2 || spellChoices.length!==3} onClick={()=>onLevelThree(Number(hpChoice),cantripChoices,spellChoices)} className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-40">Confirm Level 3</button>
      </div>}
      <details className="mt-3 rounded-lg border border-gold/30 p-3"><summary className="cursor-pointer text-sm font-semibold">Review provisional ability scores</summary><p className="mt-2 text-sm text-parchment/75">Earlier build notes suggest STR 8, DEX 17, CON 14, INT 16, WIS 10, CHA 8. Your current campaign may have different provisional scores. Nothing changes unless you confirm, and you can undo the correction.</p><p className="mt-2 text-xs">Current: STR {stats.scores.str}, DEX {stats.scores.dex}, CON {stats.scores.con}, INT {stats.scores.int}, WIS {stats.scores.wis}, CHA {stats.scores.cha}</p>{campaign?.preReconciliationScores ? <button type="button" disabled={saving} onClick={onUndoReconcile} className="mt-3 rounded-lg border border-gold px-3 py-2 text-sm">Undo score correction</button> : <button type="button" disabled={saving || !campaign} onClick={onReconcile} className="mt-3 rounded-lg border border-gold px-3 py-2 text-sm">Confirm and apply proposed scores</button>}</details>
      <div className="mt-4 grid grid-cols-3 gap-2">{abilities.map(ability => <div key={ability} className="rounded-lg border border-white/15 p-3 text-center"><p className="text-xs uppercase text-gold">{ability}</p><p className="text-xl font-semibold">{stats.scores[ability]}</p><p className="text-sm text-parchment/70">{signed(abilityModifier(stats.scores[ability]))}</p></div>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><p>HP: {stats.currentHitPoints ?? 10} / {stats.maxHitPoints ?? 10}</p><p>Armor Class: {stats.armorClass ?? 14}</p><p>Speed: {stats.speed ?? 35} ft.</p><p>Proficiency: +{stats.proficiencyBonus}</p><p>Passive Perception: {passivePerception(stats)}</p></div>
      <div className="mt-5 rounded-lg border border-gold/30 p-3"><p className="mb-2 text-sm font-semibold">Roll mode</p><div className="grid grid-cols-3 gap-1 text-center text-xs text-parchment/75"><span>Disadvantage</span><span>Normal</span><span>Advantage</span></div><input aria-label="Roll mode" type="range" min={-1} max={1} step={1} value={mode === 'disadvantage' ? -1 : mode === 'advantage' ? 1 : 0} onChange={e => setMode(Number(e.target.value) === -1 ? 'disadvantage' : Number(e.target.value) === 1 ? 'advantage' : 'normal')} className="mt-2 w-full accent-gold"/><p className="mt-1 text-center text-xs text-gold">{mode === 'normal' ? 'Normal roll' : mode === 'advantage' ? 'Advantage: keep higher d20' : 'Disadvantage: keep lower d20'}</p></div>
      <h3 className="mt-5 font-serif text-lg">Saving throws</h3><div className="mt-2 grid grid-cols-3 gap-2 text-sm">{abilities.map(a => <button type="button" key={a} disabled={!campaign || saving} onClick={() => onSaveRoll(a,mode)} className="rounded-lg border border-white/15 p-3 text-left uppercase active:border-gold disabled:opacity-40">{a}: {signed(savingThrowModifier(stats,a))}{a === 'dex' || a === 'int' ? ' *' : ''}</button>)}</div>
      <h3 className="mt-5 font-serif text-lg">Skills</h3><div className="mt-2 grid grid-cols-2 gap-2 text-xs">{skills.map(s => <button type="button" key={s} disabled={!campaign || saving} onClick={() => onRoll(s,mode)} className="rounded-lg border border-white/15 p-3 text-left active:border-gold disabled:opacity-40">{s} {signed(skillModifier(stats,s))} {stats.expertiseSkills?.includes(s) ? '**' : stats.proficientSkills.includes(s) ? '*' : ''}</button>)}</div>
      <p className="mt-3 text-xs text-parchment/60">Tap any skill or saving throw to roll using the selected mode. * Proficient · ** Expertise. Rolls are saved to the campaign; the DM determines outcomes.</p>
      {lastRoll && <p role="status" className="mt-3 rounded-lg border border-gold/30 p-3 text-sm">{lastRoll.text}</p>}
    </div>
      <section className="mt-5 rounded-xl border border-white/15 bg-panel p-4 space-y-3" aria-label="Hit Dice and health"><h3 className="font-serif text-xl">Health & Hit Dice</h3><div className="flex items-center justify-between text-sm"><span>Hit Points</span><strong>{stats.currentHitPoints??stats.maxHitPoints??10} / {stats.maxHitPoints??10}</strong></div><div className="h-2 rounded-full bg-ink"><div className="h-full rounded-full bg-gold" style={{width:Math.min(100,100*(stats.currentHitPoints??stats.maxHitPoints??10)/(stats.maxHitPoints??10))+'%'}}/></div><div className="flex items-center justify-between text-sm"><span>Rogue Hit Dice · d8</span><strong>{campaign?.hitDiceRemaining??stats.level??1} / {stats.level??1} available</strong></div><div className="flex gap-2">{Array.from({length:stats.level??1},(_,i)=><div key={i} className={i<(campaign?.hitDiceRemaining??stats.level??1)?'h-3 flex-1 rounded-full bg-gold':'h-3 flex-1 rounded-full border border-white/35'}/>)}</div><p className="text-xs text-parchment/60">Spend Hit Dice during a DM-approved Short Rest. Long Rests recover spent Hit Dice.</p></section>
      {(stats.level ?? 1) >= 3 && <section aria-label="Spells and spell slots" className="rounded-xl border border-gold/35 bg-panel p-5 space-y-4">
        <div><p className="eyebrow">Arcane Trickster</p><h3 className="mt-1 font-serif text-2xl">Spells</h3><p className="mt-1 text-xs text-parchment/65">INT spellcasting · Save DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)} · Spell attack {signed(stats.proficiencyBonus+abilityModifier(stats.scores.int))}</p></div>
        <div className="rounded-xl border border-gold/30 bg-ink/40 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Level 1 spell slots</h4><span className="font-semibold tabular-nums text-gold">{Math.max(0,(stats.spellSlots?.level1??2)-(stats.spellSlots?.usedLevel1??0))} / {stats.spellSlots?.level1??2} available</span></div>
        <div className="mt-3 flex gap-3" role="img" aria-label={Math.max(0,(stats.spellSlots?.level1??2)-(stats.spellSlots?.usedLevel1??0))+' of '+(stats.spellSlots?.level1??2)+' level 1 spell slots available'}>{Array.from({length:stats.spellSlots?.level1??2},(_,i)=><div key={i} className={i<(stats.spellSlots?.level1??2)-(stats.spellSlots?.usedLevel1??0)?'h-4 flex-1 rounded-full border border-gold bg-gold':'h-4 flex-1 rounded-full border border-white/35 bg-transparent'}/>)}</div><p className="mt-2 text-xs text-parchment/60">Filled = available · Outline = spent. Cantrips and ritual casting do not spend slots.</p></div>
        <div><h4 className="font-semibold">Cantrips <span className="text-xs font-normal text-parchment/60">Level 0 · unlimited</span></h4><div className="mt-2 space-y-2">{(stats.cantrips??[]).map(spell=><button type="button" key={spell} onClick={()=>setSelectedSpell(spell)} className="flex w-full items-center justify-between rounded-lg border border-white/15 p-3 text-left text-sm"><span>{spell}</span><span className="text-xs text-parchment/60">Details</span></button>)}</div></div>
        <div><h4 className="font-semibold">Level 1 spells</h4><div className="mt-2 space-y-2">{(stats.preparedSpells??[]).map(spell=><button type="button" key={spell} onClick={()=>setSelectedSpell(spell)} className="flex w-full items-center justify-between rounded-lg border border-white/15 p-3 text-left text-sm"><span>{spell}{isRitualSpell(spell)?' · Ritual':''}</span><span className="text-xs text-parchment/60">Details</span></button>)}</div></div>
        {campaign?.concentration && <p className="rounded-lg border border-gold/25 p-3 text-sm">Concentrating: {campaign.concentration.spell} <button type="button" disabled={saving} className="ml-2 underline text-gold" onClick={onEndConcentration}>End</button></p>}
        {(campaign?.spellEffects?.filter(e=>e.status==='awaiting-adjudication').length??0)>0 && <p className="text-xs text-parchment/60">Pending spell effects: {campaign?.spellEffects?.filter(e=>e.status==='awaiting-adjudication').length} awaiting DM adjudication.</p>}
        <p className="text-xs text-parchment/60">Cast spells in Adventure with your target and intended effect. Tap a spell here to view its description.</p>
      </section>}
      <div className="mt-5 space-y-3"><h3 className="font-serif text-xl">Class features</h3>
        {(stats.level ?? 1)>=3 && <><div className="rounded-xl border-2 border-gold bg-gold/10 p-4"><p className="text-xs font-bold uppercase text-gold">Unlocked at Level 3 · New</p><h4 className="mt-2 font-serif text-xl">Arcane Trickster</h4><p className="mt-2 text-sm">Spellcasting uses Intelligence. Spell save DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)} · Spell attack {signed(stats.proficiencyBonus+abilityModifier(stats.scores.int))}. Mage Hand Legerdemain enhances your Mage Hand for subtle manipulation. Steady Aim grants Advantage on your next attack this turn as a Bonus Action if you haven't moved, and your Speed becomes 0 until the turn ends.</p><p className="mt-2 text-xs text-parchment/70">Spell selection and spell-slot tracking are in the dedicated Spells section above. Spell effects are resolved during Adventure.</p></div></>}

        {(stats.level ?? 1) >= 2 && <div className={(stats.level ?? 1) === 2 ? "rounded-xl border-2 border-gold bg-gold/10 p-4" : "rounded-lg border border-white/15 p-4"}><p className={(stats.level ?? 1) === 2 ? "text-xs font-bold uppercase tracking-widest text-gold" : "text-xs uppercase text-parchment/60"}>Level 2 · Rogue{(stats.level ?? 1) === 2 ? " · New" : ""}</p><h4 className="mt-2 font-serif text-xl">Cunning Action</h4><p className="mt-2 text-sm leading-6">On each of your turns, you can take Dash, Disengage, or Hide as a Bonus Action.</p><div className="mt-3 space-y-2 text-sm"><p><strong>Dash:</strong> Gain extra movement equal to your Speed for this turn.</p><p><strong>Disengage:</strong> Your movement doesn't provoke Opportunity Attacks for the rest of the turn.</p><p><strong>Hide:</strong> Attempt to become hidden, subject to the normal Hide rules and conditions.</p></div><p className="mt-3 text-xs text-parchment/70">Cunning Action unlocked at Level 2.</p></div>}
        <div className="rounded-lg border border-white/15 p-4"><p className="text-xs uppercase text-parchment/60">Level 1 · Rogue</p><h4 className="mt-1 font-semibold">Sneak Attack · {rogueSneakAttackDice(stats.level ?? 1)}d6</h4><p className="mt-1 text-sm text-parchment/75">Once per turn, deal an extra {rogueSneakAttackDice(stats.level ?? 1)}d6 damage with a qualifying Finesse or Ranged weapon attack if you have Advantage, or if an eligible ally is next to the target and you don't have Disadvantage. Sneak Attack dice equal half your Rogue level rounded up: Level {stats.level ?? 1} gives {rogueSneakAttackDice(stats.level ?? 1)}d6. The damage increases at odd Rogue levels (3, 5, 7, and so on), reaching 10d6 at Level 19.</p></div>
        <div className="rounded-lg border border-white/15 p-4"><p className="text-xs uppercase text-parchment/60">Level 1 · Rogue</p><h4 className="mt-1 font-semibold">Expertise</h4><p className="mt-1 text-sm text-parchment/75">Double your proficiency bonus for {stats.expertiseSkills?.join(' and ') || 'two chosen proficient skills'}. Expertise is already reflected in your skill modifiers.</p></div>
        <div className="rounded-lg border border-white/15 p-4"><p className="text-xs uppercase text-parchment/60">Level 1 · Rogue</p><h4 className="mt-1 font-semibold">Thieves' Cant</h4><p className="mt-1 text-sm text-parchment/75">You know the secret language of rogues, and learn an additional language through this feature.</p></div>
        <div className="rounded-lg border border-white/15 p-4"><p className="text-xs uppercase text-parchment/60">Level 1 · Rogue</p><h4 className="mt-1 font-semibold">Weapon Mastery</h4><p className="mt-1 text-sm text-parchment/75">Use the mastery properties of two eligible weapons you are proficient with. Specific weapon choices still need to be finalized.</p></div>
        <h3 className="pt-2 font-serif text-xl">Species and background</h3>
        <div className="rounded-lg border border-white/15 p-4"><h4 className="font-semibold">Wood Elf</h4><p className="mt-1 text-sm text-parchment/75">Darkvision 60 ft. · Fey Ancestry (Advantage against Charmed) · Keen Senses · Trance · 35 ft. Speed · Druidcraft cantrip. Additional Wood Elf spells unlock at later character levels.</p></div>
        <div className="rounded-lg border border-white/15 p-4"><h4 className="font-semibold">Scholar-Adventurer · Custom background</h4><p className="mt-1 text-sm text-parchment/75">A curious explorer of ancient places. Lucky is Nighthawk's planned Origin feat; background mechanical choices are not yet finalized.</p></div>
        <h3 className="pt-2 font-serif text-xl">Combat and equipment</h3>
        <div className="rounded-lg border border-white/15 p-4 text-sm space-y-2"><p><strong>Initiative:</strong> {signed(abilityModifier(stats.scores.dex))}</p><p><strong>Hit Dice:</strong> {stats.level ?? 1}d8</p><p><strong>Primary weapon:</strong> Shortbow (planned; equipment inventory not yet tracked)</p><p><strong>Shortbow attack:</strong> {signed(abilityModifier(stats.scores.dex) + stats.proficiencyBonus)} to hit · 1d6 {signed(abilityModifier(stats.scores.dex))} piercing damage</p><p><strong>Armor:</strong> AC {stats.armorClass ?? 14} (equipment source not yet verified)</p><p className="text-parchment/60">Gold, ammunition, equipment, conditions, death saves, and rest resources will be tracked by the inventory and combat systems.</p></div>
      </div>
    <details className="rounded-xl border border-gold/30 bg-panel p-4"><summary className="cursor-pointer font-semibold">Development: XP and level-up testing</summary><p className="mt-2 text-xs text-parchment/70">Test XP only. Your level 1 character is snapshotted before the first grant; restore it to repeat tests. DM XP awards will be integrated separately.</p><div className="mt-3 flex gap-2"><input type="number" min="1" max="100000" value={testXP} onChange={e=>setTestXP(e.target.value)} aria-label="Test XP amount" className="w-28 rounded-lg bg-ink p-2"/><button type="button" disabled={saving || !campaign} onClick={()=>onAwardXP(Number(testXP), "Development test reward")} className="rounded-lg bg-gold px-3 py-2 text-ink">Grant test XP</button></div><button type="button" disabled={saving || !campaign?.levelOneSnapshot} onClick={onRestore} className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-sm">Restore level 1 snapshot</button></details>
    <div className="rounded-xl border border-dashed border-gold/30 p-5"><p className="font-semibold">Three companions await</p><p className="mt-2 text-sm text-parchment/60">Companion recruitment will arrive in a later milestone.</p></div>
      {selectedSpell && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={()=>setSelectedSpell(null)}><section role="dialog" aria-modal="true" aria-label={selectedSpell+' spell details'} className="w-full max-w-md rounded-2xl border border-gold/50 bg-panel p-5 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-gold">{tricksterCantrips.includes(selectedSpell as typeof tricksterCantrips[number]) ? 'Wizard cantrip' : 'Level 1 Wizard spell'}</p><h3 className="mt-1 font-serif text-2xl">{selectedSpell}</h3></div><button type="button" onClick={()=>setSelectedSpell(null)} aria-label="Close spell details" className="rounded-lg border border-white/30 px-3 py-2">Close</button></div>{isRitualSpell(selectedSpell) && <p className="mt-3 text-sm font-semibold text-gold">Ritual · +10 minutes casting time · no spell slot spent</p>}<p className="mt-4 text-sm leading-6">{spellSummaries[selectedSpell] ?? 'Spell details unavailable.'}</p>{(stats.level ?? 1)>=3 && (stats.cantrips?.includes(selectedSpell) || stats.preparedSpells?.includes(selectedSpell)) && <div className="mt-4 space-y-3 border-t border-white/15 pt-4"><p className="text-sm font-semibold">Cast this spell</p><label className="block text-xs">Target or intended effect (optional)<input className="mt-1 w-full rounded-lg border border-white/20 bg-ink p-2 text-sm" value={spellTarget} onChange={e=>setSpellTarget(e.target.value)} placeholder="e.g. guard at the gate"/></label>{spellRequiresConcentration(selectedSpell) && <p className="text-xs text-gold">Concentration spell. Casting replaces any existing concentration.</p>}{selectedSpell==='Mind Sliver' && <p className="text-xs">Target makes an Intelligence saving throw against spell DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)}; damage and the save penalty await adjudication.</p>}{selectedSpell==='Tasha’s Hideous Laughter' && <p className="text-xs">Target makes a Wisdom saving throw against spell DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)}. Condition and repeated saves await adjudication.</p>}{isRitualSpell(selectedSpell) && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={castRitual} onChange={e=>setCastRitual(e.target.checked)}/> Cast as ritual (no slot; +10 minutes)</label>}{selectedSpell==='Find Familiar' && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={componentsConfirmed} onChange={e=>setComponentsConfirmed(e.target.checked)}/><span>I have and consume 10 gp worth of charcoal, incense and herbs in a brass brazier. This prototype does not yet deduct inventory or gold.</span></label>}<p className="text-xs text-parchment/65">Slots remaining: {(stats.spellSlots?.level1??0)-(stats.spellSlots?.usedLevel1??0)} / {stats.spellSlots?.level1??0}. Effects other than Find Familiar still require DM adjudication.</p><button type="button" disabled={saving || (selectedSpell==='Find Familiar'&&!componentsConfirmed) || (!castRitual && !stats.cantrips?.includes(selectedSpell) && (stats.spellSlots?.usedLevel1??0)>=(stats.spellSlots?.level1??0))} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>{onCastSpell(selectedSpell,castRitual,componentsConfirmed,spellTarget);setSpellTarget('');setSelectedSpell(null);setCastRitual(false);setComponentsConfirmed(false)}}>Confirm cast {castRitual?'as ritual':''}</button></div>}<p className="mt-4 text-xs text-parchment/60">Quick reference only; full casting time, range, components, duration, and exact 2024 rules text will be added in a later update.</p></section></div>}
</section>;
}
function Journal({ campaign }: { campaign: Campaign | null }) {
  return <section className="space-y-4"><div className="flex items-center gap-3"><BookOpen className="text-gold"/><h2 className="font-serif text-2xl">Campaign Journal</h2></div>
    {campaign ? campaign.journal.filter(entry => entry.kind === 'note' || entry.kind === 'system').map((entry) => <div key={entry.id} className="rounded-xl border border-white/10 bg-panel p-4">
      <p className="text-xs text-gold">{entry.kind === 'note' ? 'Your note' : entry.kind === 'player' ? 'Nighthawk' : entry.kind === 'dm' ? 'Dungeon Master' : 'Campaign event'} · {new Date(entry.createdAt).toLocaleString()}</p>
      <p className="mt-2 text-sm leading-6">{entry.text}</p>
    </div>) : <p className="text-parchment/60">Create a campaign to start your journal.</p>}
  </section>;
}
function WorldMap() {
  return <section className="space-y-4"><div className="flex items-center gap-3"><Map className="text-gold"/><h2 className="font-serif text-2xl">World Map</h2></div>
    <div className="map-preview rounded-xl border border-white/10 flex min-h-72 items-center justify-center p-8 text-center"><div><Swords className="mx-auto mb-3 text-gold" size={34}/><p className="font-serif text-xl">The frontier is unexplored</p><p className="mt-2 text-sm text-parchment/60">Persistent maps and tactical encounters are coming later.</p></div></div>
  </section>;
}
export function App() {
  const [activeView, setActiveView] = useState<View>('adventure');
  const [fullHistory, setFullHistory] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingAdventureSpell, setPendingAdventureSpell] = useState<{spell:string;ritual:boolean;intent:string}|null>(null);
  const [adventureComponentsConfirmed,setAdventureComponentsConfirmed] = useState(false);
  const [pendingRest,setPendingRest] = useState<'short'|'long'|null>(null);
  const [restRolls,setRestRolls] = useState<number[]>([]);
  const [restApproved,setRestApproved] = useState(false);
  const [restNarration,setRestNarration] = useState('');
  const [restWaitMinutes,setRestWaitMinutes] = useState(0);
  const [pendingTestDamage,setPendingTestDamage] = useState<number|null>(null);
  const [notice, setNotice] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [newTitle, setNewTitle] = useState('The Forgotten Keep');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessCode, setAccessCode] = useState(() => { try { return localStorage.getItem('four-keeps-access-code') ?? sessionStorage.getItem('four-keeps-access-code') ?? ''; } catch { return ''; } });
  const [dmMode, setDmMode] = useState(() => { try { return localStorage.getItem('four-keeps-dm-mode') === 'on'; } catch { return false; } });
  const importInput = useRef<HTMLInputElement>(null);
  const resolvingCheckRef = useRef(false);

  useEffect(() => {
    let active = true;
    localCampaignStorage.list().then((items) => {
      if (!active) return;
      setCampaigns(items);
      setCampaign(items[0] ?? null);
    }).catch((error: unknown) => {
      if (active) setNotice('Local storage unavailable: ' + String(error));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { try { localStorage.setItem('four-keeps-dm-mode', dmMode ? 'on' : 'off'); } catch { /* browser storage unavailable */ } }, [dmMode]);
  useEffect(() => { try { if (accessCode) localStorage.setItem('four-keeps-access-code', accessCode); else localStorage.removeItem('four-keeps-access-code'); sessionStorage.removeItem('four-keeps-access-code'); } catch { /* browser storage unavailable */ } }, [accessCode]);

  async function createCampaign() {
    if (saving || !newTitle.trim()) return;
    setSaving(true);
    try {
      const next = newCampaign(newTitle);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns((items) => [next, ...items]);
      setNotice('Campaign saved on this device.');
    } catch (error) { setNotice('Could not save campaign: ' + String(error)); }
    finally { setSaving(false); }
  }

  async function saveSkillRoll(skill: Skill, mode: RollMode) {
    if (!campaign || saving) return;
    setSaving(true);
    try {
      const result = rollCheck(campaign.character ?? prototypeNighthawk, skill, mode);
      const next = addRoll(campaign, describeCheck(result));
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items => items.map(item => item.id === next.id ? next : item));
      setNotice('Dice rolled and result saved. No success or failure has been assigned.');
    } catch (error) { setNotice('Roll failed: ' + String(error)); }
    finally { setSaving(false); }
  }

  async function saveSavingThrow(ability: typeof abilities[number], mode: RollMode) {
    if (!campaign || saving) return;
    setSaving(true);
    try {
      const count = mode === 'normal' ? 1 : 2;
      const dice = Array.from({ length: count }, () => Math.floor(Math.random() * 20) + 1);
      const selected = mode === 'advantage' ? Math.max(...dice) : mode === 'disadvantage' ? Math.min(...dice) : dice[0];
      const modifier = savingThrowModifier(campaign.character ?? prototypeNighthawk, ability);
      const result = 'Nighthawk · ' + ability.toUpperCase() + ' saving throw: ' + (dice.length === 1 ? String(selected) : dice.join(' / ') + ' (' + mode + ': ' + selected + ')') + ' ' + (modifier >= 0 ? '+' : '') + modifier + ' = ' + (selected + modifier) + '. Outcome awaits DM adjudication.';
      const next = addRoll(campaign, result);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items => items.map(item => item.id === next.id ? next : item));
      setNotice('Saving throw rolled and saved.');
    } catch (error) { setNotice('Saving throw failed: ' + String(error)); }
    finally { setSaving(false); }
  }

  async function castSpell(spell: string, ritual: boolean, components: boolean, target: string) {
    if (!campaign || saving) return;
    setSaving(true);
    try {
      const next = castNighthawkSpell(campaign,spell,ritual,components,target);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice(spell+' cast and saved to campaign journal.');
    } catch(error) { setNotice('Spellcasting error: '+String(error)); }
    finally { setSaving(false); }
  }

  async function endConcentration() {
    if(!campaign || saving)return;
    setSaving(true);
    try {const next=endNighthawkConcentration(campaign);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice('Concentration ended.');}catch(error){setNotice('Concentration error: '+String(error));}finally{setSaving(false);}
  }
  async function updateProgress(action: 'award' | 'level' | 'level3' | 'reconcile' | 'undoReconcile' | 'restore', amount = 0, reason = '', cantrips: string[] = [], spells: string[] = []) {
    if (!campaign || saving) return;
    setSaving(true);
    try {
      const snapshot = campaign.levelOneSnapshot ?? { character: structuredClone(campaign.character ?? prototypeNighthawk), xp: campaign.xp ?? 0, xpAwards: structuredClone(campaign.xpAwards ?? []) };
      const next = action === 'restore'
        ? { ...campaign, character: structuredClone(snapshot.character), xp: snapshot.xp, xpAwards: structuredClone(snapshot.xpAwards), levelOneSnapshot: undefined }
        : action === 'level'
          ? levelUpRogue(campaign, amount)
          : action === 'level3'
            ? levelUpArcaneTrickster(campaign, amount, cantrips, spells)
          : action === 'reconcile' ? reconcileNighthawkScores(campaign)
          : action === 'undoReconcile' ? undoNighthawkScoreReconciliation(campaign)
          : awardExperience({ ...campaign, levelOneSnapshot: snapshot }, amount, reason, crypto.randomUUID());
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items => items.map(item => item.id === next.id ? next : item));
      setNotice(action === 'restore' ? 'Level 1 snapshot restored.' : action === 'reconcile' ? 'Ability scores updated.' : action === 'undoReconcile' ? 'Previous scores restored.' : action === 'level3' ? 'Level 3 Arcane Trickster saved.' : action === 'level' ? 'Level 2 saved.' : 'XP awarded and saved.');
    } catch (error) { setNotice('Progression error: ' + String(error)); }
    finally { setSaving(false); }
  }

  async function saveNote() {
    if (saving || !campaign || !draft.trim()) return;
    setSaving(true);
    try {
      const next = addNote(campaign, draft);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns((items) => items.map((item) => item.id === next.id ? next : item));
      setDraft('');
      setNotice('Saved to your local journal.');
    } catch (error) { setNotice('Could not save note: ' + String(error)); }
    finally { setSaving(false); }
  }

  async function resolvePendingCheck() {
    if (resolvingCheckRef.current || saving || !campaign?.pendingCheck || !accessCode) { if (!accessCode) setNotice('Enter your game access code to resolve the check.'); return; }
    resolvingCheckRef.current = true;
    setSaving(true);
    try {
      const pending = campaign.pendingCheck;
      const rollD20 = () => {
        const bytes = new Uint8Array(1);
        do { crypto.getRandomValues(bytes); } while (bytes[0] >= 240);
        return (bytes[0] % 20) + 1;
      };
      const dice = pending.dice ?? Array.from({ length: pending.mode === 'normal' ? 1 : 2 }, rollD20);
      const locked = { ...campaign, pendingCheck: { ...pending, dice } };
      // Render the immutable dice result immediately; do not wait for disk or AI.
      setCampaign(locked);
      setCampaigns(items => items.map(item => item.id === locked.id ? locked : item));
      setNotice('Dice rolled. DM is resolving the check…');
      await localCampaignStorage.save(locked);
      const history = locked.journal.filter(entry => entry.kind === 'player' || entry.kind === 'dm').slice(-12)
        .map(entry => ({ role: entry.kind === 'player' ? 'user' : 'assistant', content: entry.text }));
      const response = await fetch('/api/dm', { method:'POST', headers:{ 'Content-Type':'application/json','x-four-keeps-access':accessCode },
        body:JSON.stringify({ checkToken:pending.token, dice, character:locked.character ?? prototypeNighthawk, gameState:{ familiar:locked.familiar ?? null, elapsedMinutes:locked.elapsedMinutes ?? 0, concentration:locked.concentration??null, spellEffects:(locked.spellEffects??[]).slice(-12), recentEvents:locked.journal.filter(e=>e.kind==='system').slice(-8).map(e=>e.text) }, history, worldFacts:locked.worldFacts ?? [], world:locked.world ?? emptyWorld() }) });
      const result: { narration?:string; newFacts?:string[]; worldUpdates?:unknown; checkResult?:{skill:string;dice:number[];kept:number;modifier:number;total:number;success:boolean}; error?:string } = await response.json();
      if (!response.ok || !result.narration || !result.checkResult) throw new Error(result.error || 'Check resolution failed');
      const r = result.checkResult;
      const rollText = 'Nighthawk · '+r.skill+': '+(r.dice.length === 1 ? String(r.dice[0]) : r.dice.join(' / ')+' ('+pending.mode+': '+r.kept+')')+' '+(r.modifier >= 0 ? '+' : '−')+Math.abs(r.modifier)+' = '+r.total+'.';
      const next = addExchange(locked, rollText, result.narration, new Date().toISOString(), result.newFacts ?? [], result.worldUpdates);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items => items.map(item => item.id === next.id ? next : item));
      setActiveView('adventure');
      setNotice('Check resolved and saved.');
    } catch(error) { setNotice('Check error: '+String(error)+' Your dice are saved; retry to use the same roll.'); }
    finally { resolvingCheckRef.current = false; setSaving(false); }
  }

  function detectAdventureSpell(message:string): {spell:string;ritual:boolean;intent:string}|null {
    const character=campaign?.character;
    if (!character || (character.level??1)<3) return null;
    const names=[...(character.cantrips??[]),...(character.preparedSpells??[])].sort((a,b)=>b.length-a.length);
    const normalized=message.toLowerCase().replace(/[’']/g,"'");
    const name=names.find(s=>{const key=s.toLowerCase().replace(/[’']/g,"'");return normalized.includes(key) && /\b(cast|casting|conjure|use|ritual)\b/.test(normalized);});
    if(!name)return null;
    return {spell:name,ritual:isRitualSpell(name)&&/\britual\b/.test(normalized),intent:message};
  }
  async function submitAdventure() {
    if(pendingAdventureSpell || pendingRest || pendingTestDamage!==null || saving)return;
    if(campaign?.combat){setNotice('Combat is active. Complete initiative before continuing with combat actions.');return;}
    const testDamage=/^\s*(?:test damage|damage test)\s+(\d+)\s*$/i.exec(draft);
    if(testDamage){const amount=Number(testDamage[1]);if(amount>=1&&amount<=100){setPendingTestDamage(amount);return;}}
    const lower=draft.toLowerCase();
    const explicit=/\b(short rest|long rest)\b/.exec(lower);
    const natural=/\b(rest|resting|rests|sleep|sleeping|nap|napping|bed down|turn in for the night|take a break|lie down|lay down)\b/.test(lower) && /\b(want|would like|i'd like|try|take|start|begin|settle|spend|sleep|rest|resting|nap|bed|turn|lie|lay)\b/.test(lower);
    const shortTime=/\b(an? hour|one hour|60 minutes|short rest|nap|brief break)\b/.test(lower);
    const longTime=/\b(eight hours|8 hours|overnight|until morning|through the night|long rest|sleep for the night)\b/.test(lower);
    if(explicit || natural && (shortTime || longTime)) {
      const kind=explicit?explicit[1].startsWith('long')?'long':'short':longTime?'long':'short';
      setPendingRest(kind);setRestRolls([]);setRestApproved(false);setRestNarration('');
      await requestRestApproval(kind);
      return;
    }
    const found=detectAdventureSpell(draft);
    if(found){setPendingAdventureSpell(found);setAdventureComponentsConfirmed(false);return;}
    await sendToDM();
  }
  async function requestRestApproval(kind:'short'|'long') {
    if(!campaign || saving)return;
    if(!accessCode){setNotice('Enter your game access code first.');setPendingRest(null);return;}
    const waitMinutes=kind==='long'?minutesUntilLongRestEligible(campaign):0;
    setSaving(true);setNotice('The Dungeon Master is evaluating your rest request…');
    try {
      const history=campaign.journal.filter(e=>e.kind==='player'||e.kind==='dm').slice(-12).map(e=>({role:e.kind==='player'?'user':'assistant',content:e.text}));
      const response=await fetch('/api/dm',{method:'POST',headers:{'Content-Type':'application/json','x-four-keeps-access':accessCode},body:JSON.stringify({message:draft,restRequest:kind,restWaitMinutes:waitMinutes,character:campaign.character??prototypeNighthawk,gameState:{familiar:campaign.familiar??null,elapsedMinutes:campaign.elapsedMinutes??0,recentEvents:campaign.journal.filter(e=>e.kind==='system').slice(-8).map(e=>e.text)},history,worldFacts:campaign.worldFacts??[],world:campaign.world??emptyWorld()})});
      const result:{narration?:string;restDecision?:'approved'|'denied';error?:string}=await response.json();
      if(!response.ok||!result.narration||!['approved','denied'].includes(result.restDecision??''))throw new Error(result.error??'Rest adjudication failed');
      if(result.restDecision==='approved'){setRestWaitMinutes(waitMinutes);setRestNarration(result.narration);setRestApproved(true);setNotice('Rest approved. Choose your recovery options below.');return;}
      const next=addExchange(campaign,draft,result.narration,new Date().toISOString());
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingRest(null);setDraft('');setNotice('The DM denied or interrupted the rest. No resources changed.');
    }catch(error){setPendingRest(null);setNotice('Rest request failed: '+String(error));}
    finally{setSaving(false);}
  }
  async function confirmTestDamage() {
    if(!campaign||pendingTestDamage===null||saving)return;
    setSaving(true);
    try{const next=applyNighthawkDamage(campaign,pendingTestDamage,'controlled mechanics test');await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setPendingTestDamage(null);setDraft('');setNotice('Test damage applied and saved. Check Player → Health & Hit Dice.');}
    catch(error){setNotice('Damage test error: '+String(error));}finally{setSaving(false);}
  }
  async function confirmRest() {
    if(!campaign||!pendingRest||!restApproved||saving)return;
    
    setSaving(true);
    try {
      const eligible=pendingRest==='long'?advanceToLongRestEligibility(campaign,restWaitMinutes):campaign;
      const base=takeNighthawkRest(eligible,pendingRest,pendingRest==='short'?restRolls.length:0,restRolls);
      const next=addExchange(base,draft,restNarration,new Date().toISOString());
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingRest(null);setRestApproved(false);setRestRolls([]);setRestNarration('');setRestWaitMinutes(0);setDraft('');
      setNotice('Rest completed and saved.');
    }catch(error){setNotice('Rest error: '+String(error));}
    finally{setSaving(false);}
  }
  async function confirmAdventureSpell() {
    if(!campaign || !pendingAdventureSpell || saving)return;
    const action=pendingAdventureSpell;
    setSaving(true);
    try {
      const next=castNighthawkSpell(campaign,action.spell,action.ritual,adventureComponentsConfirmed,action.intent);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingAdventureSpell(null);setAdventureComponentsConfirmed(false);
      setNotice('Spell cast and saved. Sending action to Dungeon Master…');
      // The DM receives the updated authoritative state, not the stale pre-cast campaign.
      await sendToDM(next,action.intent,true);
    }catch(error){setNotice('Spell error: '+String(error));}
    finally{setSaving(false);}
  }
  async function sendToDM(override?:Campaign, messageOverride?:string, alreadySaving=false) {
    const current=override??campaign;
    const message=messageOverride??draft;
    if ((!alreadySaving && saving) || !current || !message.trim() || current.pendingCheck) return;
    if (!accessCode) { setNotice('Enter your game access code first.'); return; }
    if(!alreadySaving)setSaving(true);
    setNotice('The Dungeon Master is thinking…');
    try {
      const history = current.journal.filter((entry) => entry.kind === 'player' || entry.kind === 'dm')
        .slice(-12).map((entry) => ({ role: entry.kind === 'player' ? 'user' : 'assistant', content: entry.text }));
      const response = await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-four-keeps-access': accessCode },
        body: JSON.stringify({ message, character:current.character ?? prototypeNighthawk, gameState:{ combat:current.combat??null, familiar:current.familiar ?? null, elapsedMinutes:current.elapsedMinutes ?? 0, concentration:current.concentration??null, spellEffects:(current.spellEffects??[]).slice(-12), recentEvents:current.journal.filter(e=>e.kind==='system').slice(-8).map(e=>e.text) }, history, worldFacts: current.worldFacts ?? [], world: current.world ?? emptyWorld() }) });
      const result: { narration?: string; newFacts?: string[]; worldUpdates?: unknown; checkRequest?: { skill:string; mode:'normal'|'advantage'|'disadvantage'; reason:string; token:string } | null; combatStart?:{enemyName:string}|null; error?: string } = await response.json();
      if (!response.ok || !result.narration) throw new Error(result.error || 'DM request failed');
      const narrated = addExchange(current, message, result.narration, new Date().toISOString(), result.newFacts ?? [], result.worldUpdates, result.checkRequest ?? undefined);
      const next = result.combatStart && !current.combat ? beginDuel(narrated,result.combatStart.enemyName) : narrated;
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns((items) => items.map((item) => item.id === next.id ? next : item));
      setDraft('');
      setActiveView('adventure');
      setNotice(result.combatStart?'Combat started. Tap Roll initiative.':'The DM replied. Conversation saved locally.');
    } catch (error) { setNotice('DM error: ' + String(error)); }
    finally { if(!alreadySaving)setSaving(false); }
  }

  async function rollInitiative() {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=rollDuelInitiative(campaign);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice('Initiative rolled and turn order saved.');}
    catch(error){setNotice('Initiative error: '+String(error));}finally{setSaving(false);}
  }
  function exportCampaign() {
    if (!campaign) return;
    const blob = new Blob([JSON.stringify(createBackup(campaign), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'four-keeps-' + campaign.id + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    setNotice('Backup prepared. Save the downloaded JSON file somewhere safe.');
  }
  async function importCampaign(file: File) {
    if (saving) return;
    setSaving(true);
    try {
      if (file.size > 5_000_000) throw new Error('Backup is too large.');
      const restored = parseBackup(await file.text());
      const existing = await localCampaignStorage.get(restored.id);
      if (existing && !window.confirm('This campaign already exists. Replace its local save with the backup?')) return;
      await localCampaignStorage.save(restored);
      setCampaigns(await localCampaignStorage.list());
      setCampaign(restored);
      setNotice('Campaign restored from backup.');
    } catch (error) { setNotice('Import failed: ' + String(error)); }
    finally { setSaving(false); if (importInput.current) importInput.current.value = ''; }
  }

  const content = { adventure: <Adventure campaign={campaign} fullHistory={fullHistory} onToggleHistory={() => setFullHistory(value => !value)}/>, party: <Party campaign={campaign} saving={saving} onRoll={(skill,mode) => void saveSkillRoll(skill,mode)} onSaveRoll={(ability,mode) => void saveSavingThrow(ability,mode)} onAwardXP={(amount,reason) => void updateProgress('award',amount,reason)} onLevelUp={hp => void updateProgress('level',hp)} onLevelThree={(hp,cantrips,spells) => void updateProgress('level3',hp,'',cantrips,spells)} onReconcile={() => void updateProgress('reconcile')} onUndoReconcile={() => void updateProgress('undoReconcile')} onRestore={() => void updateProgress('restore')} onCastSpell={(spell,ritual,components,target)=>void castSpell(spell,ritual,components,target)} onEndConcentration={()=>void endConcentration()}/>, journal: <Journal campaign={campaign}/>, map: <WorldMap/>, settings: <section className="space-y-4"><h2 className="font-serif text-2xl">Settings</h2><p className="text-sm text-parchment/60">Manage campaigns, backups, and Dungeon Master access below.</p></section> };
  return <div className="min-h-dvh bg-ink text-parchment">
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/95 px-5 pb-4 pt-[max(1.2rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">A living tabletop adventure</p><h1 className="font-serif text-3xl tracking-wide">Four Keeps</h1></div><span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">Prototype</span></div>
        <div className="mt-3 flex items-center justify-between text-xs text-parchment/60"><span>{campaign?.title ?? 'No campaign selected'}</span><span>{campaign?.location ?? 'Frontier Village'}</span></div>
      </header>
      <main className="flex-1 px-5 py-6 pb-48" id="main-content">
        {activeView === 'settings' && <>
        <section className="mb-5 rounded-xl border border-gold/25 bg-panel p-4 space-y-3" aria-label="Local campaigns">
          <div className="flex items-center justify-between"><h2 className="font-serif text-lg">Local campaigns</h2><span className="text-xs text-parchment/55">{loading ? 'Loading…' : 'Saved on this device'}</span></div>
          {campaigns.length > 0 && <label className="block text-xs text-parchment/70">Active campaign
            <select value={campaign?.id ?? ''} onChange={(event) => { setCampaign(campaigns.find((item) => item.id === event.target.value) ?? null); setNotice(''); }} className="mt-1 w-full rounded-lg border border-white/20 bg-ink p-3 text-parchment">
              {campaigns.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select></label>}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="campaign-title">New campaign name</label>
            <input id="campaign-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Campaign name" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-ink px-3 py-2 text-base"/>
            <button type="button" onClick={() => void createCampaign()} disabled={saving || loading || !newTitle.trim()} className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink disabled:opacity-40">New</button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={exportCampaign} disabled={!campaign || saving} className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-gold disabled:opacity-40">Export backup</button>
            <button type="button" onClick={() => importInput.current?.click()} disabled={saving} className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-gold disabled:opacity-40">Import backup</button>
            <input ref={importInput} type="file" accept=".json,application/json" className="hidden" aria-label="Select Four Keeps backup" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCampaign(file); }}/>
          </div>
          <p className="text-xs text-parchment/55">Local saves may be lost if browser website data is cleared. Export a backup regularly.</p>
        </section>
        {campaign && <section className="mb-4 rounded-xl border border-white/10 bg-panel p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dmMode} onChange={(event) => setDmMode(event.target.checked)}/> AI Dungeon Master mode</label>
          {dmMode && <><label htmlFor="access-code" className="block text-xs text-parchment/70">Game access code (remembered on this device)</label>
          <input id="access-code" type="password" autoComplete="off" value={accessCode} onFocus={(event) => { const input = event.currentTarget; const bringIntoView = () => input.scrollIntoView({ behavior: "smooth", block: "center" }); bringIntoView(); window.setTimeout(bringIntoView, 350); }} onChange={(event) => setAccessCode(event.target.value)} placeholder="Enter your private access code" className="w-full scroll-mt-40 scroll-mb-48 rounded-lg border border-white/20 bg-ink px-3 py-2 text-base"/>
          <button type="button" onClick={() => { setAccessCode(''); setNotice('Saved access code cleared from this browser.'); }} className="rounded-lg border border-white/20 px-3 py-2 text-xs text-parchment/70">Forget access code</button><p className="text-xs text-parchment/55">Your access code stays in this browser until you clear it. Do not use this on a shared device. The rules engine resolves skill checks; combat and inventory are not yet connected.</p></>}
        </section>}
        </>}
        {campaign && activeView === 'journal' && (campaign.worldFacts?.length ?? 0) > 0 && <details className="mb-5 rounded-xl border border-gold/25 bg-panel p-4">
          <summary className="cursor-pointer font-serif text-lg">World memory ({campaign.worldFacts?.length} facts)</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-parchment/80">{campaign.worldFacts?.map((fact, index) => <li key={index}>{fact}</li>)}</ul>
        </details>}
        {campaign && activeView === 'journal' && (() => {
          const world = campaign.world ?? emptyWorld();
          return <section className="mb-5 space-y-3" aria-label="World records">
            <h2 className="font-serif text-2xl">People, Places & Quests</h2>
            {world.quests.length > 0 && <details open className="rounded-xl border border-gold/25 bg-panel p-4"><summary className="font-serif text-lg">Quests ({world.quests.length})</summary>
              <div className="mt-3 space-y-3">{world.quests.map(q => <article key={q.id}><p className="font-semibold">{q.title} <span className="text-xs text-gold">· {q.status}</span></p><p className="text-sm">{q.objective}</p>{q.notes.map((n,i) => <p key={i} className="text-xs text-parchment/60">{n}</p>)}</article>)}</div>
            </details>}
            {world.npcs.length > 0 && <details className="rounded-xl border border-white/15 bg-panel p-4"><summary className="font-serif text-lg">People ({world.npcs.length})</summary>
              <div className="mt-3 space-y-3">{world.npcs.map(n => <article key={n.id}><p className="font-semibold">{n.name}</p><p className="text-sm text-parchment/75">{[n.role,n.location,n.relationship].filter(Boolean).join(' · ')}</p>{n.notes.map((note,i) => <p key={i} className="text-xs text-parchment/65">{note}</p>)}</article>)}</div>
            </details>}
            {world.places.length > 0 && <details className="rounded-xl border border-white/15 bg-panel p-4"><summary className="font-serif text-lg">Places ({world.places.length})</summary>
              <div className="mt-3 space-y-3">{world.places.map(p => <article key={p.id}><p className="font-semibold">{p.name}</p><p className="text-sm">{p.description}</p>{p.notes.map((n,i) => <p key={i} className="text-xs text-parchment/65">{n}</p>)}</article>)}</div>
            </details>}
            {world.clues.length > 0 && <details className="rounded-xl border border-white/15 bg-panel p-4"><summary className="font-serif text-lg">Clues ({world.clues.length})</summary>
              <div className="mt-3 space-y-3">{world.clues.map(clue => <article key={clue.id}><p className="text-sm">{clue.text}</p><p className="text-xs text-gold">{clue.evidence} {clue.source && '· ' + clue.source}</p></article>)}</div>
            </details>}
          </section>;
        })()}
        {content[activeView]}
        {activeView==='adventure' && {campaign?.combat && <div className="mt-4 space-y-3 rounded-xl border border-gold/50 bg-panel p-4" aria-label="Combat initiative tracker">
          <p className="eyebrow">Combat · Round {campaign.combat.round}</p>
          <h3 className="font-serif text-lg">Nighthawk vs {campaign.combat.enemyName}</h3>
          {campaign.combat.status==='awaiting-initiative' ? <><p className="text-sm">The enemy's initiative has been rolled. Roll Nighthawk's d20 to establish turn order.</p><button type="button" disabled={saving} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>void rollInitiative()}>Roll initiative (d20 + DEX)</button></> : <><p className="text-sm">Initiative order</p><ol className="space-y-2">{campaign.combat.order?.map((name,i)=><li key={name} className="flex justify-between rounded-lg border border-white/20 p-3"><span>{i+1}. {name}</span><strong>{name==='Nighthawk'?campaign.combat?.playerInitiative:campaign.combat?.enemyInitiative}</strong></li>)}</ol><p className="text-xs text-parchment/70">Initiative confirmed. Movement, actions and enemy turns are the next combat milestone.</p></>}
        </div>}}
      </main>
      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur">
        {pendingTestDamage!==null && <div className="mx-4 mt-3 space-y-3 rounded-xl border border-gold/50 bg-panel p-4"><p className="eyebrow">Damage mechanics test</p><h3 className="font-serif text-xl">Apply {pendingTestDamage} test damage?</h3><p className="text-sm">This is a controlled test, not a DM-adjudicated injury. HP will decrease and the change will be saved in the Journal.</p><p className="text-sm">HP: {campaign?.character?.currentHitPoints??campaign?.character?.maxHitPoints??10} → {Math.max(0,(campaign?.character?.currentHitPoints??campaign?.character?.maxHitPoints??10)-pendingTestDamage)} / {campaign?.character?.maxHitPoints??10}</p><div className="flex gap-2"><button type="button" className="flex-1 rounded-lg border border-white/30 p-3" onClick={()=>setPendingTestDamage(null)}>Cancel</button><button type="button" disabled={saving} className="flex-1 rounded-lg bg-gold p-3 font-semibold text-ink" onClick={()=>void confirmTestDamage()}>Apply test damage</button></div></div>}
        {pendingRest && restApproved && <div role="dialog" aria-label="Rest recovery options" className="mx-4 mt-3 max-h-[65dvh] overflow-y-auto overscroll-contain touch-pan-y space-y-3 rounded-xl border border-gold/50 bg-panel p-4 [-webkit-overflow-scrolling:touch]">
          <p className="eyebrow">DM-approved rest · Recovery options</p>
          <details className="rounded-lg border border-white/15 p-2 text-sm text-parchment/80"><summary className="cursor-pointer font-semibold">DM narration (tap to expand)</summary><p className="mt-2 whitespace-pre-wrap">{restNarration}</p></details>
          {pendingRest==='long' && restWaitMinutes>0 && <p className="rounded-lg border border-gold/30 p-3 text-sm">The DM approved waiting {Math.floor(restWaitMinutes/60)}h {restWaitMinutes%60}m until eligible, followed by the 8-hour Long Rest. Total time advanced on completion: {Math.floor((restWaitMinutes+480)/60)}h {(restWaitMinutes+480)%60}m.</p>}
          <h3 className="font-serif text-xl">{pendingRest==='long'?'Long Rest · 8 hours':'Short Rest · 1 hour'}</h3>
          {pendingRest==='short' ? (() => {
            const character=campaign?.character??prototypeNighthawk;
            const maxHp=character.maxHitPoints??10;
            const startingHp=character.currentHitPoints??maxHp;
            const con=abilityModifier(character.scores.con);
            const healed=restRolls.reduce((total,die)=>total+Math.max(0,die+con),0);
            const previewHp=Math.min(maxHp,startingHp+healed);
            const available=campaign?.hitDiceRemaining??character.level??1;
            return <div className="space-y-3">
              <p className="text-sm">Roll one Hit Die at a time. Stop whenever you're satisfied with your HP recovery.</p>
              <div className="rounded-lg border border-white/20 p-3 space-y-2">
                <div className="flex justify-between gap-2 text-sm"><span>HP after healing</span><strong className="tabular-nums">{previewHp}/{maxHp}</strong></div>
                <div className="h-2 rounded-full bg-ink"><div className="h-full rounded-full bg-gold" style={{width:(100*previewHp/Math.max(1,maxHp))+'%'}}/></div>
                <div className="flex justify-between gap-2 text-xs"><span>Hit Dice spent: {restRolls.length}</span><span>Remaining: {available-restRolls.length}/{character.level??1}</span></div>
              </div>
              {restRolls.length>0 && <div className="space-y-1 text-sm">{restRolls.map((die,i)=><p key={i}>Die {i+1}: {die} + {con} CON = {Math.max(0,die+con)} HP</p>)}<p className="font-semibold">Total healing applied: {previewHp-startingHp} HP</p></div>}
              <button type="button" disabled={saving||restRolls.length>=available||previewHp>=maxHp} className="w-full rounded-lg border border-gold/60 p-3 text-gold disabled:opacity-40" onClick={()=>setRestRolls(v=>[...v,crypto.getRandomValues(new Uint32Array(1))[0]%8+1])}>Roll one Hit Die (d8 + {con} CON)</button>
              {previewHp>=maxHp && <p className="text-xs text-parchment/70">HP is full. You can finish the rest now.</p>}
              {restRolls.length>=available && previewHp<maxHp && <p className="text-xs text-parchment/70">No Hit Dice remain to spend.</p>}
            </div>;
          })() : <p className="text-sm">Restore all HP and expended spell slots, and recover Hit Dice.</p>}
          <div className="sticky bottom-0 z-10 flex gap-2 border-t border-white/15 bg-panel py-3">
            <button type="button" className="flex-1 rounded-lg border border-white/30 p-3" onClick={()=>{setPendingRest(null);setRestApproved(false);setRestRolls([]);setRestNarration('')}}>Cancel</button>
            <button type="button" disabled={saving} className="flex-1 rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>void confirmRest()}>{pendingRest==='short'?'Finish Short Rest':'Finish Long Rest'}</button>
          </div>
          <p className="text-xs text-parchment/60">Changes are saved when you finish the rest. You may spend zero Hit Dice.</p>
        </div>}
        {pendingAdventureSpell && <div className="mx-4 mt-3 rounded-xl border border-gold/50 bg-panel p-4 space-y-3" role="group" aria-label="Confirm spell cast"><p className="eyebrow">Confirm Adventure spell</p><h3 className="font-serif text-xl">{pendingAdventureSpell.spell}{pendingAdventureSpell.ritual?' · Ritual':''}</h3><p className="text-sm text-parchment/80">{pendingAdventureSpell.intent}</p><p className="text-xs text-parchment/70">{pendingAdventureSpell.ritual?'No spell slot spent.':campaign?.character?.cantrips?.includes(pendingAdventureSpell.spell)?'Cantrip · no spell slot spent.':'Consumes one Level 1 spell slot.'}</p>{pendingAdventureSpell.spell==='Find Familiar' && <label className="flex gap-2 text-xs"><input type="checkbox" checked={adventureComponentsConfirmed} onChange={e=>setAdventureComponentsConfirmed(e.target.checked)}/> I have and consume the required 10 gp material components (inventory is not yet tracked).</label>}<div className="flex gap-2"><button type="button" className="flex-1 rounded-lg border border-white/30 p-3" onClick={()=>setPendingAdventureSpell(null)}>Edit action</button><button type="button" disabled={saving || (pendingAdventureSpell.spell==='Find Familiar'&&!adventureComponentsConfirmed)} className="flex-1 rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>void confirmAdventureSpell()}>Cast and continue</button></div></div>}
        {campaign?.pendingCheck && <div className="mx-4 mt-3 rounded-xl border border-gold/40 bg-panel p-4 space-y-2" role="group" aria-label="Pending skill check">
          <p className="eyebrow">Dungeon Master requests a check</p>
          <p className="font-serif text-xl">{campaign.pendingCheck.skill} · {campaign.pendingCheck.mode}</p>
          <p className="text-sm text-parchment/70">{campaign.pendingCheck.reason}</p>
          <button type="button" disabled={saving || !dmMode} onClick={() => void resolvePendingCheck()} className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-40">{campaign.pendingCheck.dice ? (saving ? 'DM is resolving…' : 'Retry DM response') : 'Roll '+campaign.pendingCheck.skill}</button>
           {campaign.pendingCheck.dice && (() => { const dice = campaign.pendingCheck.dice; const used = dice.length === 1 ? dice[0] : campaign.pendingCheck.mode === 'advantage' ? Math.max(...dice) : Math.min(...dice); const modifier = skillModifier(campaign.character ?? prototypeNighthawk, campaign.pendingCheck.skill as Parameters<typeof skillModifier>[1]); return <div role="status" aria-live="polite" className="rounded-lg border border-gold/30 bg-ink/60 p-3"><p className="text-xs uppercase tracking-widest text-gold">Nighthawk · {campaign.pendingCheck.skill} check</p><p className="mt-2 text-xl font-semibold">{dice.length === 1 ? String(dice[0]) : dice.join(' / ')+' ('+campaign.pendingCheck.mode+': '+used+')'} <span className="text-parchment/70">{modifier >= 0 ? '+' : '−'}{Math.abs(modifier)} =</span> {used + modifier}</p><p className="mt-1 text-xs text-parchment/65">{saving ? 'Waiting for the Dungeon Master. Your roll is saved.' : 'Roll saved. Retry the DM response without rerolling.'}</p></div>; })()}
          <p className="text-xs text-parchment/60">The target number is hidden. Your roll is saved before adjudication.</p>
        </div>}
        {activeView !== "settings" && <form className="flex items-end gap-2 px-4 py-3" onSubmit={(event) => { event.preventDefault(); void (dmMode ? submitAdventure() : saveNote()); }}>
          <button type="button" onClick={() => window.location.reload()} aria-label="Refresh Four Keeps" title="Refresh Four Keeps" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-panel text-gold"><RefreshCw size={19}/></button>
          <label htmlFor="dm-input" className="sr-only">Message the Dungeon Master</label>
          <textarea id="dm-input" value={draft} onChange={(event) => { setDraft(event.target.value); setNotice(''); }} rows={1} placeholder={campaign ? (dmMode ? 'What does Nighthawk do?' : 'Write a journal note…') : 'Create a campaign first'} disabled={!campaign || saving || !!campaign.pendingCheck || !!pendingAdventureSpell || !!pendingRest} className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-white/20 bg-panel px-3 py-3 text-base text-parchment placeholder:text-parchment/45 focus:border-gold focus:outline-none"/>
          <button type="submit" disabled={!draft.trim() || !campaign || saving || !!campaign.pendingCheck || !!pendingAdventureSpell} aria-label="Send message to Dungeon Master" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink disabled:opacity-40"><Send size={19}/></button>
        </form>}
        {notice && <p role="status" className="px-5 pb-2 text-xs text-gold">{notice}</p>}
        <nav aria-label="Primary navigation" className="grid grid-cols-5 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => { setActiveView(id); setNotice(''); }} aria-current={activeView === id ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${activeView === id ? 'text-gold' : 'text-parchment/55'}`}><Icon size={21}/><span>{label}</span></button>)}
        </nav>
      </div>
    </div>
  </div>;
}
