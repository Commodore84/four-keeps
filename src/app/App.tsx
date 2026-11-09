import { useEffect, useRef, useState } from 'react';
import { createBackup, parseBackup } from '../game/backup';
import { BookOpen, Bird, Blocks, Compass, Droplet, Map, RefreshCw, Send, Settings, Shield, Swords, UserRound, Users } from 'lucide-react';
import { addExchange, addNote, addRoll, beginDuel, adjustEquipment, rollDuelInitiative, takeDuelTurnAction, utilizeCombatItem, takeCombatSkillAction, readyCombatAction, readyCombatMindSliver, resolveReadiedSpellReaction, resolveReadiedCombatReaction, resolveReadiedWeaponAttack, moveDuelToken, moveOwl, owlHelp, owlTurnAction, tacticalRoute, tacticalOpportunityEnemies, publicCombatText, resolveEnemyOpportunity, moveTrainingDummy, resolveTrainingReaction, rollTrainingReaction, advanceDuelTestEnemyTurn, resolveDuelEnemyTurn, beginEnemyShove, beginEnemyGrapple, rollPlayerGrappleSave, beginPlayerGrappleEscape, rollPlayerGrappleEscape, rollPlayerShoveSave, standNighthawk, rollDuelAttack, shoveTrainingEnemy, hideNighthawk, searchForNighthawk, trainingMapSize, isTrainingPillar, trainingTerrain, trainingRouteCost, trainingCoverBlocksSight, canNighthawkHide, addSecondTrainingEnemy, selectTrainingTarget, grappleTrainingEnemy, escapeTrainingGrapple, concludeDuel, quitTrainingEncounter, newCampaign, awardExperience, levelUpRogue, levelUpArcaneTrickster, tricksterCantrips, tricksterSpells, isRitualSpell, castNighthawkSpell, castCombatMagicAction, resolveCombatSpellSave, resolveLaughterRepeatSave, availableCombatSpells, takeNighthawkRest, applyNighthawkDamage, minutesUntilLongRestEligible, advanceToLongRestEligibility, endNighthawkConcentration, spellRequiresConcentration, reconcileNighthawkScores, undoNighthawkScoreReconciliation, xpThresholds, type Campaign } from '../game/campaign';
import { localCampaignStorage } from '../game/storage';
import { availableCombatMovement, combatHideStatus, combatAttackRollPreview } from '../game/combat-ui';
import type { View } from '../game/types';
import { emptyWorld } from '../game/world';
import { prototypeNighthawk, abilities, abilityModifier, skillAbility, skillModifier, savingThrowModifier, rogueSneakAttackDice, rollCheck, describeCheck, type Skill, type RollMode } from '../game/checks';

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
    
    {turns.length === 0 && <div className="rounded-xl border border-white/10 bg-panel p-5 space-y-3">
      <p className="eyebrow">Dungeon Master</p>
      <p className="leading-7 text-parchment/85">The road bends toward a frontier village, its lanterns glowing beneath the evening mist. Beyond the tree line, an old keep waits in silence.</p>
    </div>}
    {turns.map((entry) => <article key={entry.id} className={entry.kind === 'player' ? 'ml-8 rounded-xl border border-gold/30 bg-gold/10 p-4' : 'mr-3 rounded-xl border border-white/10 bg-panel p-5'}>
      <p className="eyebrow">{entry.kind === 'player' ? 'Nighthawk' : 'Dungeon Master'}</p>
      <p className="mt-2 whitespace-pre-wrap leading-7 text-parchment/90">{entry.kind==='system'?publicCombatText(entry.text):entry.text}</p>
    </article>)}
    {campaign && <p className="text-xs text-gold/80">Campaign saved on this device · {turns.length ? 'AI Dungeon Master connected' : 'Ready for your first action'}</p>}
    <div ref={endRef}/>
  </section>;
}
function Party({ campaign, onRoll, onSaveRoll, onAwardXP, onLevelUp, onLevelThree, onReconcile, onUndoReconcile, onRestore, onCastSpell, onEndConcentration, onAdjustEquipment, saving }: { campaign: Campaign | null; onRoll: (skill: Skill, mode: RollMode) => void; onSaveRoll: (ability: typeof abilities[number], mode: RollMode) => void; onAwardXP: (amount: number, reason: string) => void; onLevelUp: (hpGain: number) => void; onLevelThree: (hpGain: number, cantrips: string[], spells: string[]) => void; onReconcile: () => void; onUndoReconcile: () => void; onRestore: () => void; onCastSpell: (spell: string, ritual: boolean, components: boolean, target: string) => void; onEndConcentration: () => void; onAdjustEquipment: (item:'daggers'|'arrows'|'caltrops'|'ballBearings',delta:number)=>void; saving: boolean }) {
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
    <section aria-label="Character identity" className="rounded-2xl border border-gold/40 bg-panel p-4">
      <p className="text-xs uppercase tracking-widest text-gold">Character sheet</p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1"><h3 className="font-serif text-3xl">Nighthawk</h3><p className="mt-1 text-sm text-parchment/65">Wood Elf · Rogue {(stats.level??1)>=3?'(Arcane Trickster)':''}</p></div>
        <div className="flex min-w-[42%] items-center gap-3" aria-label="Experience toward next level">
          <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-gold text-gold"><span className="text-[10px] font-semibold uppercase">Lv</span><strong className="text-xl leading-5">{stats.level??1}</strong></div>
          <div className="min-w-0 flex-1"><p className="mb-1 whitespace-nowrap text-xs tabular-nums">{campaign?.xp??0} / {(stats.level??1)>=20?'MAX':xpThresholds[Math.min(stats.level??1,19)]} XP</p><div className="h-2 overflow-hidden rounded-full bg-ink"><div className="h-full rounded-full bg-gold" style={{width:(stats.level??1)>=20?'100%':Math.min(100,Math.max(0,100*((campaign?.xp??0)-(xpThresholds[Math.max(0,(stats.level??1)-1)]??0))/Math.max(1,xpThresholds[Math.min(stats.level??1,19)]-(xpThresholds[Math.max(0,(stats.level??1)-1)]??0))))+'%'}}/></div></div></div>
      </div>
    </section>
    <section aria-label="Combat and vital statistics" className="rounded-2xl border border-white/15 bg-panel p-4 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gold">Combat &amp; Vital Statistics</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        {([['Armor Class',String(stats.armorClass??14),'AC'],['Initiative',signed(abilityModifier(stats.scores.dex)),'DEX modifier'],['Speed',String(stats.speed??35),'feet']] as const).map(([label,value,unit])=><div key={label} className="rounded-xl border border-white/10 bg-ink/40 p-2 sm:p-3"><p className="text-[10px] uppercase tracking-wide text-parchment/65">{label}</p><strong className="mt-1 block text-2xl tabular-nums">{value}</strong><p className="text-xs text-parchment/55">{unit}</p></div>)}
      </div>
      <div className="rounded-xl border border-white/10 bg-ink/40 p-3 space-y-2">
        <div className="flex justify-between gap-2"><h4 className="text-sm font-semibold">Hit Points</h4><strong className="tabular-nums">{stats.currentHitPoints??stats.maxHitPoints??10} / {stats.maxHitPoints??10} HP</strong></div>
        <div className="h-2 overflow-hidden rounded-full bg-ink"><div className="h-full rounded-full bg-gold" style={{width:Math.min(100,Math.max(0,100*(stats.currentHitPoints??stats.maxHitPoints??10)/Math.max(1,stats.maxHitPoints??10)))+'%'}}/></div>
        <div className="flex justify-between gap-2 text-xs text-parchment/70"><span>Temporary HP: Not tracked</span><span>Hit Dice: {campaign?.hitDiceRemaining??stats.level??1}/{stats.level??1} d8</span></div>
        <p className="text-xs text-parchment/55">Spend Hit Dice during a DM-approved Short Rest; recover spent dice on Long Rests.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 p-3 space-y-2"><h4 className="text-xs font-semibold uppercase tracking-wide">Death Saves</h4><div className="grid grid-cols-[3.5rem_1fr] items-center gap-y-2 text-xs text-parchment/65"><span>Success</span><span className="flex justify-end gap-2" aria-label="Three success markers">○ ○ ○</span><span>Failure</span><span className="flex justify-end gap-2" aria-label="Three failure markers">○ ○ ○</span></div><p className="text-[11px] text-parchment/50">Tracking not yet implemented</p></div>
        <div className="rounded-xl border border-white/10 p-3 space-y-2"><h4 className="text-xs font-semibold uppercase tracking-wide">Heroic Inspiration</h4><p className="text-xs text-parchment/65">○ Not tracked</p><p className="text-[11px] text-parchment/50">No editable placeholder</p></div>
      </div>
      {campaign?.combat&&<p className="border-t border-white/10 pt-3 text-xs text-parchment/70">Active conditions: {[campaign.combat.playerHidden?'Hidden':null,campaign.combat.playerProne?'Prone':null,campaign.combat.playerGrappled?'Grappled':null,campaign.combat.lastAction==='Dodge'?'Dodging':null].filter(Boolean).join(', ')||'None'}</p>}
    </section>
      <section aria-label="Attacks and damage cantrips" className="rounded-2xl border border-white/15 bg-panel p-4 space-y-3">
        <h3 className="font-serif text-xl">Attacks &amp; Damage Cantrips</h3>
        <p className="text-xs text-parchment/65">Attack statistics are calculated from your character. Weapon Mastery selections are not yet finalized.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-gold/35 bg-ink/40 p-3 space-y-2"><div className="flex items-center justify-between"><h4 className="font-semibold">Shortbow</h4><strong className="text-xl text-gold">{signed(abilityModifier(stats.scores.dex)+stats.proficiencyBonus)}</strong></div><p className="text-sm">1d6 {signed(abilityModifier(stats.scores.dex))} piercing</p><p className="text-xs text-parchment/65">Range 80/320 ft · Ammunition · Two-Handed</p><p className="text-xs text-parchment/55">Weapon Mastery: selection pending</p></article>
          <article className="rounded-xl border border-gold/35 bg-ink/40 p-3 space-y-2"><div className="flex items-center justify-between"><h4 className="font-semibold">Dagger</h4><strong className="text-xl text-gold">{signed(abilityModifier(stats.scores.dex)+stats.proficiencyBonus)}</strong></div><p className="text-sm">1d4 {signed(abilityModifier(stats.scores.dex))} piercing</p><p className="text-xs text-parchment/65">Melee / Thrown 20/60 ft · Finesse · Light</p><p className="text-xs text-parchment/55">Weapon Mastery: selection pending</p></article>
          {(stats.cantrips??[]).filter(spell=>spell==='Mind Sliver').map(spell=><article key={spell} className="rounded-xl border border-gold/35 bg-ink/40 p-3 space-y-2"><div className="flex items-center justify-between"><h4 className="font-semibold">{spell}</h4><strong className="text-lg text-gold">DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)}</strong></div><p className="text-sm">1d6 psychic · Intelligence save</p><p className="text-xs text-parchment/65">Range 60 ft · Cantrip</p><button type="button" className="text-xs text-gold underline" onClick={()=>setSelectedSpell(spell)}>Spell details</button></article>)}
        </div>
        <p className="text-xs text-parchment/60">Sneak Attack damage and eligibility are described once in Class Features below. Attacks are performed during Adventure.</p>
      </section>
    <section aria-label="Equipment and inventory" className="rounded-2xl border border-white/15 bg-panel p-4 space-y-4">
      <div><h3 className="font-serif text-xl">Equipment &amp; Inventory</h3><p className="mt-1 text-xs text-parchment/65">Combat equipment quantities persist between encounters. Complete purchased inventory is not yet recorded.</p></div>
      <div className="rounded-xl border border-gold/30 bg-ink/30 p-3 space-y-2"><h4 className="font-semibold">Weapons &amp; Armor</h4><div className="flex justify-between text-sm"><span>Shortbow</span><span className="text-parchment/70">1 · Playtest equipped</span></div><p className="text-xs text-parchment/55">Armor details not yet recorded · AC shown under Combat Statistics</p></div>
      <div className="rounded-xl border border-white/15 bg-ink/30 p-3 space-y-2"><h4 className="font-semibold">Ammunition &amp; Consumables</h4>
      {([['daggers','Daggers'],['arrows','Arrows'],['caltrops','Caltrops'],['ballBearings','Ball bearings']] as const).map(([key,label])=><div key={key} className="flex items-center justify-between gap-3 border-t border-white/10 pt-2"><span className="text-sm">{label}</span><div className="flex items-center gap-3"><button type="button" aria-label={'Remove '+label} disabled={saving||!!campaign?.combat||(campaign?.equipment?.[key]??(key==='daggers'?2:key==='arrows'?20:0))<=0} className="rounded border border-white/30 px-3 py-1 disabled:opacity-30" onClick={()=>onAdjustEquipment(key,-1)}>−</button><strong className="min-w-6 text-center tabular-nums">{campaign?.combat?(key==='daggers'?campaign.combat.daggersAvailable??campaign.equipment?.daggers??2:key==='arrows'?campaign.combat.arrowsRemaining??campaign.equipment?.arrows??20:campaign.equipment?.[key]??0):campaign?.equipment?.[key]??(key==='daggers'?2:key==='arrows'?20:0)}</strong><button type="button" aria-label={'Add '+label} disabled={saving||!!campaign?.combat} className="rounded border border-white/30 px-3 py-1 disabled:opacity-30" onClick={()=>onAdjustEquipment(key,1)}>+</button></div></div>)}
      {!!campaign?.combat?.daggersThrown&&<p className="text-xs text-gold">{campaign.combat.daggersThrown} thrown dagger(s) awaiting recovery.</p>}</div>
      <div className="rounded-xl border border-white/15 bg-ink/30 p-3"><h4 className="font-semibold">Adventuring Gear</h4><p className="mt-2 text-sm text-parchment/60">Not recorded</p></div>
      <div className="rounded-xl border border-white/15 bg-ink/30 p-3"><h4 className="font-semibold">Currency</h4><div className="mt-2 grid grid-cols-5 gap-2 text-center">{(['CP','SP','EP','GP','PP'] as const).map(unit=><div key={unit} className="rounded-lg border border-white/10 p-2"><p className="text-xs text-gold">{unit}</p><p className="mt-1 text-xs text-parchment/60">—</p></div>)}</div><p className="mt-2 text-xs text-parchment/55">Currency ledger not implemented; no balances assumed.</p></div>
      <div className="rounded-xl border border-white/15 bg-ink/30 p-3 space-y-2"><h4 className="font-semibold">Training, Languages &amp; Attunement</h4><p className="text-sm text-parchment/70">Armor training, weapon training, tools and languages: complete choices not yet recorded.</p><p className="text-sm text-parchment/70">Attuned magic items: not tracked · Carrying capacity: not tracked</p></div>
    </section>
    <div className="rounded-xl border border-white/10 bg-panel p-5">
      <h3 className="font-serif text-xl">Character Advancement</h3>
{(stats.level ?? 1) === 1 && (campaign?.xp ?? 0) >= 300 && <div className="mt-3 space-y-2"><p className="text-sm text-gold">Level 2 unlocked: Cunning Action, +HP</p><label className="block text-xs">HP increase<select className="mt-1 w-full rounded-lg bg-ink p-2 text-base" value={hpChoice} onChange={e => setHpChoice(e.target.value)}><option value="7">Fixed 5 + CON 2 = 7 HP</option>{Array.from({length:8},(_,i)=><option key={i} value={i+3}>Rolled {i+1} + CON 2 = {i+3} HP</option>)}</select></label><button type="button" disabled={saving} onClick={() => onLevelUp(Number(hpChoice))} className="rounded-lg bg-gold px-4 py-2 font-semibold text-ink">Confirm Level 2</button></div>}
      {(stats.level ?? 1) === 2 && (campaign?.xp ?? 0) >= 900 && <div className="mt-3 rounded-xl border-2 border-gold bg-gold/10 p-4 space-y-3"><p className="text-xs font-bold uppercase tracking-widest text-gold">Level up available</p><h3 className="font-serif text-xl">Level 3 · Arcane Trickster</h3><p className="text-sm">Unlock Steady Aim, Mage Hand Legerdemain, Spellcasting, Sneak Attack 2d6 and more HP. Choose your spells before confirming.</p>
        <label className="block text-sm">HP increase<select className="mt-1 w-full rounded-lg bg-ink p-2 text-base" value={hpChoice} onChange={e=>setHpChoice(e.target.value)}><option value="7">Fixed 5 + CON 2 = 7 HP</option>{Array.from({length:8},(_,i)=><option key={i} value={i+3}>Rolled {i+1} + CON 2 = {i+3} HP</option>)}</select></label>
        <div><p className="text-sm font-semibold">Cantrips · {cantripChoices.length}/2</p><p className="text-xs text-parchment/70">Mage Hand is granted automatically. Choose two additional Wizard cantrips.</p><div className="mt-2 grid grid-cols-2 gap-2">{tricksterCantrips.filter(s=>s!=='Mage Hand').map(s=><label key={s} className="flex items-center gap-2 rounded-lg border border-white/15 p-2 text-xs"><input type="checkbox" checked={cantripChoices.includes(s)} disabled={!cantripChoices.includes(s) && cantripChoices.length>=2} onChange={e=>setCantripChoices(v=>e.target.checked?[...v,s]:v.filter(x=>x!==s))}/><button type="button" className="text-left underline decoration-dotted underline-offset-2" onClick={()=>setSelectedSpell(s)}>{s}</button></label>)}</div></div>
        <div><p className="text-sm font-semibold">Level 1 Wizard spells · {spellChoices.length}/3</p><p className="text-xs text-parchment/70">Choose three spells to prepare. You have two Level 1 spell slots.</p><div className="mt-2 grid grid-cols-2 gap-2">{tricksterSpells.map(s=><label key={s} className="flex items-center gap-2 rounded-lg border border-white/15 p-2 text-xs"><input type="checkbox" checked={spellChoices.includes(s)} disabled={!spellChoices.includes(s) && spellChoices.length>=3} onChange={e=>setSpellChoices(v=>e.target.checked?[...v,s]:v.filter(x=>x!==s))}/><button type="button" className="text-left underline decoration-dotted underline-offset-2" onClick={()=>setSelectedSpell(s)}>{s}{isRitualSpell(s) ? ' (Ritual)' : ''}</button></label>)}</div></div>
        <button type="button" disabled={saving || cantripChoices.length!==2 || spellChoices.length!==3} onClick={()=>onLevelThree(Number(hpChoice),cantripChoices,spellChoices)} className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-40">Confirm Level 3</button>
      </div>}
      <details className="mt-3 rounded-lg border border-gold/30 p-3"><summary className="cursor-pointer text-sm font-semibold">Review provisional ability scores</summary><p className="mt-2 text-sm text-parchment/75">Earlier build notes suggest STR 8, DEX 17, CON 14, INT 16, WIS 10, CHA 8. Your current campaign may have different provisional scores. Nothing changes unless you confirm, and you can undo the correction.</p><p className="mt-2 text-xs">Current: STR {stats.scores.str}, DEX {stats.scores.dex}, CON {stats.scores.con}, INT {stats.scores.int}, WIS {stats.scores.wis}, CHA {stats.scores.cha}</p>{campaign?.preReconciliationScores ? <button type="button" disabled={saving} onClick={onUndoReconcile} className="mt-3 rounded-lg border border-gold px-3 py-2 text-sm">Undo score correction</button> : <button type="button" disabled={saving || !campaign} onClick={onReconcile} className="mt-3 rounded-lg border border-gold px-3 py-2 text-sm">Confirm and apply proposed scores</button>}</details>
      
      
      <section aria-label="Abilities, saving throws and skills" className="mt-5 space-y-3">
        <div><h3 className="font-serif text-xl">Abilities, Saving Throws &amp; Skills</h3><p className="mt-1 text-xs text-parchment/65">Six ability groups · tap a save or skill to roll. Proficiency and Expertise are included in the displayed modifier.</p></div>
        <div className="rounded-xl border border-gold/30 bg-ink/30 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">Roll mode</p><div className="grid grid-cols-3 gap-1 text-center text-xs text-parchment/75"><span>Disadvantage</span><span>Normal</span><span>Advantage</span></div><input aria-label="Roll mode" type="range" min={-1} max={1} step={1} value={mode === 'disadvantage' ? -1 : mode === 'advantage' ? 1 : 0} onChange={e => setMode(Number(e.target.value) === -1 ? 'disadvantage' : Number(e.target.value) === 1 ? 'advantage' : 'normal')} className="mt-2 w-full accent-gold"/><p className="mt-1 text-center text-xs text-gold">{mode === 'normal' ? 'Normal roll' : mode === 'advantage' ? 'Advantage: higher d20' : 'Disadvantage: lower d20'}</p></div>
        <p className="text-xs text-parchment/65">Proficiency Bonus: <strong className="text-parchment">+{stats.proficiencyBonus}</strong> · <span className="text-gold">●</span> Proficient · <span className="text-gold">◆</span> Expertise</p>
        {abilities.map(a => <div key={a} className="rounded-xl border border-white/15 bg-ink/30 p-3">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-gold/60 bg-gold/10"><strong className="text-2xl leading-7 tabular-nums">{stats.scores[a]}</strong><span className="text-sm text-gold tabular-nums">{signed(abilityModifier(stats.scores[a]))}</span></div>
            <div className="min-w-0 flex-1"><h4 className="font-serif text-lg capitalize">{({str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'} as const)[a]}</h4><button type="button" disabled={!campaign || saving} onClick={() => onSaveRoll(a,mode)} className="mt-1 flex w-full items-center justify-between rounded-lg border border-white/15 px-3 py-2 text-left text-sm active:border-gold disabled:opacity-40"><span>Saving Throw {(a==='dex'||a==='int')&&<span className="text-gold" aria-label="Proficient">●</span>}</span><strong className="tabular-nums">{signed(savingThrowModifier(stats,a))}</strong></button></div>
          </div>
          <div className="mt-2 space-y-1">{skills.filter(skill=>skillAbility[skill]===a).map(skill=><button type="button" key={skill} disabled={!campaign || saving} onClick={() => onRoll(skill,mode)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 active:bg-gold/10 disabled:opacity-40"><span>{skill} {stats.expertiseSkills?.includes(skill)?<span className="text-gold" aria-label="Expertise">◆</span>:stats.proficientSkills.includes(skill)?<span className="text-gold" aria-label="Proficient">●</span>:null}</span><strong className="tabular-nums">{signed(skillModifier(stats,skill))}</strong></button>)}{!skills.some(skill=>skillAbility[skill]===a)&&<p className="px-3 py-2 text-xs text-parchment/55">No skills use this ability.</p>}</div>
        </div>)}
        <div className="rounded-xl border border-white/15 bg-ink/30 p-3"><h4 className="text-sm font-semibold">Passive Scores</h4><p className="mt-2 text-sm">Perception <strong className="ml-2">{10+skillModifier(stats,'Perception')}</strong> · Investigation <strong className="ml-2">{10+skillModifier(stats,'Investigation')}</strong> · Insight <strong className="ml-2">{10+skillModifier(stats,'Insight')}</strong></p><p className="mt-2 text-xs text-parchment/60">Passive scores shown for reference; situational bonuses are adjudicated during play.</p></div>
        <p className="text-xs text-parchment/60">Rolls are saved to the campaign; the DM determines outcomes.</p>
      </section>
      {lastRoll && <p role="status" className="mt-3 rounded-lg border border-gold/30 p-3 text-sm">{lastRoll.text}</p>}
    </div>
      {(stats.level ?? 1) >= 3 && <section aria-label="Spells and spell slots" className="rounded-xl border border-gold/35 bg-panel p-5 space-y-4">
        <div><p className="eyebrow">Arcane Trickster</p><h3 className="mt-1 font-serif text-2xl">Spells</h3><p className="mt-1 text-xs text-parchment/65">INT spellcasting · Save DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)} · Spell attack {signed(stats.proficiencyBonus+abilityModifier(stats.scores.int))}</p></div>
        <div className="rounded-xl border border-gold/30 bg-ink/40 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Level 1 spell slots</h4><span className="font-semibold tabular-nums text-gold">{Math.max(0,(stats.spellSlots?.level1??2)-(stats.spellSlots?.usedLevel1??0))} / {stats.spellSlots?.level1??2} available</span></div>
        <div className="mt-3 flex gap-3" role="img" aria-label={Math.max(0,(stats.spellSlots?.level1??2)-(stats.spellSlots?.usedLevel1??0))+' of '+(stats.spellSlots?.level1??2)+' level 1 spell slots available'}>{Array.from({length:stats.spellSlots?.level1??2},(_,i)=><div key={i} className={i<(stats.spellSlots?.level1??2)-(stats.spellSlots?.usedLevel1??0)?'h-4 flex-1 rounded-full border border-gold bg-gold':'h-4 flex-1 rounded-full border border-white/35 bg-transparent'}/>)}</div><p className="mt-2 text-xs text-parchment/60">Filled = available · Outline = spent. Cantrips and ritual casting do not spend slots.</p></div>
        {([['Cantrips',stats.cantrips??[]],['Level 1 Spells',stats.preparedSpells??[]]] as const).map(([group,spells])=><div key={group} className="space-y-2">
          <h4 className="font-semibold">{group} <span className="text-xs font-normal text-parchment/60">{group==='Cantrips'?'Level 0 · unlimited':'Prepared spells'}</span></h4>
          {spells.length===0&&<p className="text-sm text-parchment/55">No spells recorded.</p>}
          {spells.map(spell=><div key={spell} className="overflow-hidden rounded-xl border border-white/15 bg-ink/30">
            <button type="button" aria-expanded={selectedSpell===spell} onClick={()=>setSelectedSpell(selectedSpell===spell?null:spell)} className="w-full p-3 text-left">
              <span className="flex items-center justify-between gap-2"><strong className="text-sm">{spell}</strong><span className="text-xs text-gold">{selectedSpell===spell?'Hide details':'Show details'}</span></span>
              <span className="mt-2 block text-xs text-parchment/65">{group==='Cantrips'?'Cantrip':'Level 1'} · {isRitualSpell(spell)?'Ritual · ':''}{spellRequiresConcentration(spell)?'Concentration · ':''}Casting time / range / duration: see details</span>
            </button>
            {selectedSpell===spell&&<div className="space-y-3 border-t border-gold/25 p-3">
              <p className="text-sm leading-6">{spellSummaries[spell]??'Detailed rules are not yet recorded for this spell.'}</p>
              <p className="text-xs text-parchment/60">Components and complete spell metadata are not yet stored. Verify casting requirements during Adventure.</p>
              {spellRequiresConcentration(spell)&&<p className="text-xs text-gold">Requires concentration. Casting replaces any existing concentration.</p>}
              {isRitualSpell(spell)&&<p className="text-xs text-gold">Ritual casting adds 10 minutes and spends no spell slot.</p>}
              <p className="text-xs text-parchment/60">Use the Adventure screen to cast and resolve this spell.</p>
            </div>}
          </div>)}
        </div>)}
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
      </div>
    <section aria-label="Character details and notes" className="rounded-2xl border border-gold/30 bg-panel p-4 space-y-4">
      <div className="border-b border-gold/25 pb-3"><p className="text-xs uppercase tracking-[0.2em] text-gold">Character record</p><h3 className="mt-1 font-serif text-xl">Character Details</h3></div>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-ink/30 p-3 text-sm">
        <div><p className="text-xs uppercase text-parchment/55">Background</p><p className="mt-1 font-semibold">Scholar-Adventurer</p><p className="text-xs text-parchment/55">Custom · mechanics pending</p></div>
        <div><p className="text-xs uppercase text-parchment/55">Alignment</p><p className="mt-1 text-parchment/65">Not recorded</p></div>
        <div><p className="text-xs uppercase text-parchment/55">Age</p><p className="mt-1 text-parchment/65">Not recorded</p></div>
        <div><p className="text-xs uppercase text-parchment/55">Height / Weight</p><p className="mt-1 text-parchment/65">Not recorded</p></div>
        <div><p className="text-xs uppercase text-parchment/55">Eyes / Hair</p><p className="mt-1 text-parchment/65">Not recorded</p></div>
        <div><p className="text-xs uppercase text-parchment/55">Skin</p><p className="mt-1 text-parchment/65">Not recorded</p></div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 p-3"><h4 className="font-semibold">Appearance</h4><p className="mt-1 text-sm text-parchment/70">Shadowed Pathfinder · detailed description not recorded</p></div>
        <div className="rounded-xl border border-white/10 p-3"><h4 className="font-semibold">Backstory &amp; Personality</h4><p className="mt-1 text-sm text-parchment/70">Quiet Investigator · Insatiable Curiosity</p><p className="mt-2 text-xs text-parchment/55">Full backstory not recorded</p></div>
        {(['Ideals','Bonds','Flaws','Additional Notes'] as const).map(label=><div key={label} className="rounded-xl border border-white/10 p-3"><h4 className="font-semibold">{label}</h4><p className="mt-1 text-sm text-parchment/60">{label==='Flaws'?'Insatiable Curiosity':'Not recorded'}</p></div>)}
      </div>
      <p className="text-xs text-parchment/55">This is a read-only character profile until editable campaign fields are implemented. No placeholder details are saved.</p>
    </section>
    <details className="rounded-xl border border-gold/30 bg-panel p-4"><summary className="cursor-pointer font-semibold">Development: XP and level-up testing</summary><p className="mt-2 text-xs text-parchment/70">Test XP only. Your level 1 character is snapshotted before the first grant; restore it to repeat tests. DM XP awards will be integrated separately.</p><div className="mt-3 flex gap-2"><input type="number" min="1" max="100000" value={testXP} onChange={e=>setTestXP(e.target.value)} aria-label="Test XP amount" className="w-28 rounded-lg bg-ink p-2"/><button type="button" disabled={saving || !campaign} onClick={()=>onAwardXP(Number(testXP), "Development test reward")} className="rounded-lg bg-gold px-3 py-2 text-ink">Grant test XP</button></div><button type="button" disabled={saving || !campaign?.levelOneSnapshot} onClick={onRestore} className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-sm">Restore level 1 snapshot</button></details>
    <div className="rounded-xl border border-dashed border-gold/30 p-5"><p className="font-semibold">Three companions await</p><p className="mt-2 text-sm text-parchment/60">Companion recruitment will arrive in a later milestone.</p></div>
      {selectedSpell && !(stats.level??1>=3 && [...(stats.cantrips??[]),...(stats.preparedSpells??[])].includes(selectedSpell)) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={()=>setSelectedSpell(null)}><section role="dialog" aria-modal="true" aria-label={selectedSpell+' spell details'} className="w-full max-w-md rounded-2xl border border-gold/50 bg-panel p-5 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-gold">{tricksterCantrips.includes(selectedSpell as typeof tricksterCantrips[number]) ? 'Wizard cantrip' : 'Level 1 Wizard spell'}</p><h3 className="mt-1 font-serif text-2xl">{selectedSpell}</h3></div><button type="button" onClick={()=>setSelectedSpell(null)} aria-label="Close spell details" className="rounded-lg border border-white/30 px-3 py-2">Close</button></div>{isRitualSpell(selectedSpell) && <p className="mt-3 text-sm font-semibold text-gold">Ritual · +10 minutes casting time · no spell slot spent</p>}<p className="mt-4 text-sm leading-6">{spellSummaries[selectedSpell] ?? 'Spell details unavailable.'}</p>{(stats.level ?? 1)>=3 && (stats.cantrips?.includes(selectedSpell) || stats.preparedSpells?.includes(selectedSpell)) && <div className="mt-4 space-y-3 border-t border-white/15 pt-4"><p className="text-sm font-semibold">Cast this spell</p><label className="block text-xs">Target or intended effect (optional)<input className="mt-1 w-full rounded-lg border border-white/20 bg-ink p-2 text-sm" value={spellTarget} onChange={e=>setSpellTarget(e.target.value)} placeholder="e.g. guard at the gate"/></label>{spellRequiresConcentration(selectedSpell) && <p className="text-xs text-gold">Concentration spell. Casting replaces any existing concentration.</p>}{selectedSpell==='Mind Sliver' && <p className="text-xs">Target makes an Intelligence saving throw against spell DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)}; damage and the save penalty await adjudication.</p>}{selectedSpell==='Tasha’s Hideous Laughter' && <p className="text-xs">Target makes a Wisdom saving throw against spell DC {8+stats.proficiencyBonus+abilityModifier(stats.scores.int)}. Condition and repeated saves await adjudication.</p>}{isRitualSpell(selectedSpell) && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={castRitual} onChange={e=>setCastRitual(e.target.checked)}/> Cast as ritual (no slot; +10 minutes)</label>}{selectedSpell==='Find Familiar' && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={componentsConfirmed} onChange={e=>setComponentsConfirmed(e.target.checked)}/><span>I have and consume 10 gp worth of charcoal, incense and herbs in a brass brazier. This prototype does not yet deduct inventory or gold.</span></label>}<p className="text-xs text-parchment/65">Slots remaining: {(stats.spellSlots?.level1??0)-(stats.spellSlots?.usedLevel1??0)} / {stats.spellSlots?.level1??0}. Effects other than Find Familiar still require DM adjudication.</p><button type="button" disabled={saving || (selectedSpell==='Find Familiar'&&!componentsConfirmed) || (!castRitual && !stats.cantrips?.includes(selectedSpell) && (stats.spellSlots?.usedLevel1??0)>=(stats.spellSlots?.level1??0))} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>{onCastSpell(selectedSpell,castRitual,componentsConfirmed,spellTarget);setSpellTarget('');setSelectedSpell(null);setCastRitual(false);setComponentsConfirmed(false)}}>Confirm cast {castRitual?'as ritual':''}</button></div>}<p className="mt-4 text-xs text-parchment/60">Quick reference only; full casting time, range, components, duration, and exact 2024 rules text will be added in a later update.</p></section></div>}
</section>;
}
function Journal({ campaign }: { campaign: Campaign | null }) {
  return <section className="space-y-4"><div className="flex items-center gap-3"><BookOpen className="text-gold"/><h2 className="font-serif text-2xl">Campaign Journal</h2></div>
    {!!campaign?.world?.places?.length && <div className="rounded-xl border border-gold/25 bg-panel p-4 space-y-3"><h3 className="font-serif text-lg">Discovered places</h3>{campaign.world.places.map(place=><div key={place.id} className="border-t border-white/10 pt-2"><p className="font-semibold text-gold">{place.name}</p><p className="text-sm text-parchment/75">{place.description}</p>{place.notes.map((note,i)=><p key={i} className="text-xs text-parchment/60">{note}</p>)}</div>)}</div>}
    {campaign ? campaign.journal.filter(entry => entry.kind === 'note' || entry.kind === 'system').map((entry) => <div key={entry.id} className="rounded-xl border border-white/10 bg-panel p-4">
      <p className="text-xs text-gold">{entry.kind === 'note' ? 'Your note' : entry.kind === 'player' ? 'Nighthawk' : entry.kind === 'dm' ? 'Dungeon Master' : 'Campaign event'} · {new Date(entry.createdAt).toLocaleString()}</p>
      <p className="mt-2 text-sm leading-6">{entry.kind==='system'?publicCombatText(entry.text):entry.text}</p>
    </div>) : <p className="text-parchment/60">Create a campaign to start your journal.</p>}
  </section>;
}
const atlasSites = [
 {id:'frontier',name:'Frontier Village',x:68,y:55,description:'Nighthawk’s starting settlement.'},
 {id:'crossroads',name:'Old Crossroads',x:49,y:48,description:'An ancient road junction.'},
 {id:'watchtower',name:'Weathered Watchtower',x:33,y:35,description:'A crumbling lookout near the western woodland.'},
] as const;
function WorldMap({campaign}:{campaign:Campaign|null}) {
 const [detail,setDetail]=useState<'world'|'frontier'>('world');
 const [zoom,setZoom]=useState(1);
 const [offset,setOffset]=useState({x:0,y:0});
 const gesture=useRef<{x:number;y:number;distance?:number}|null>(null);
 const current=campaign?.location??'Frontier Village';
 const known=new Set(['frontier',...(campaign?.mapDiscovered??[])]);
 const mapped=atlasSites.filter(p=>known.has(p.id)||p.name.toLowerCase()===current.toLowerCase());
 const reset=()=>{setZoom(1);setOffset({x:0,y:0});gesture.current=null;};
 const showDetail=()=>{setDetail('frontier');reset();};
 const showWorld=()=>{setDetail('world');reset();};
 const distance=(a:React.Touch,b:React.Touch)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 const touchStart=(e:React.TouchEvent)=>{if(e.touches.length===2)gesture.current={x:0,y:0,distance:distance(e.touches[0],e.touches[1])};else if(e.touches.length===1)gesture.current={x:e.touches[0].clientX,y:e.touches[0].clientY};};
 const touchMove=(e:React.TouchEvent)=>{const g=gesture.current;if(!g)return;if(e.touches.length===2&&g.distance){const d=distance(e.touches[0],e.touches[1]);setZoom(v=>Math.max(1,Math.min(5,v*d/g.distance!)));gesture.current={...g,distance:d};}else if(e.touches.length===1&&!g.distance){setOffset(v=>({x:v.x+e.touches[0].clientX-g.x,y:v.y+e.touches[0].clientY-g.y}));gesture.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}};
 return <section aria-label="World map" className="flex h-full min-h-0 flex-col">
  <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
   <div className="flex min-w-0 items-center gap-2">{detail==='frontier'?<button type="button" aria-label="Back to Four Keeps world map" onClick={showWorld} className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-gold">← Back</button>:<Map className="text-gold" size={20}/>}<h2 className="truncate font-serif text-lg">{detail==='world'?'Four Keeps':'Frontier Village'}</h2></div>
   <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label="Zoom out" onClick={()=>setZoom(v=>Math.max(1,v-.5))} className="rounded border border-gold/40 px-3 py-1.5">−</button><button type="button" aria-label="Zoom in" onClick={()=>setZoom(v=>Math.min(5,v+.5))} className="rounded border border-gold/40 px-3 py-1.5">+</button><button type="button" onClick={reset} className="rounded border border-gold/40 px-2 py-1.5 text-xs">Reset</button></div>
  </div>
  <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-gold/40 bg-[#d6c39a] touch-none" onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={()=>{gesture.current=null;}} onPointerDown={e=>{if(e.pointerType==='mouse')gesture.current={x:e.clientX,y:e.clientY};}} onPointerMove={e=>{if(e.pointerType==='mouse'&&e.buttons===1&&gesture.current){setOffset(v=>({x:v.x+e.clientX-gesture.current!.x,y:v.y+e.clientY-gesture.current!.y}));gesture.current={x:e.clientX,y:e.clientY};}}} onPointerUp={()=>{gesture.current=null;}}>
   <div className="absolute inset-0 mx-auto h-full max-w-full origin-center" style={{aspectRatio:'4 / 5',transform:`translate(${offset.x}px,${offset.y}px) scale(${zoom})`}}>
    {detail==='world'?<>
     <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" role="img" aria-label="Parchment continent with northern mountains, western forest, eastern greenlands and southern coast">
     <defs><radialGradient id="mapPaper"><stop stopColor="#f0dfb7"/><stop offset="1" stopColor="#c6aa78"/></radialGradient><pattern id="mapWaves" width="24" height="22" patternUnits="userSpaceOnUse"><path d="M2 12q6 -7 12 0t12 0" fill="none" stroke="#7897a1" strokeWidth="1" opacity=".55"/></pattern></defs>
     <rect width="400" height="500" fill="url(#mapPaper)"/>
     <path d="M0 320Q55 300 72 345T160 369Q213 345 245 388T400 351V500H0Z" fill="#9cb8b7" opacity=".85"/>
     <path d="M0 320Q55 300 72 345T160 369Q213 345 245 388T400 351V500H0Z" fill="url(#mapWaves)"/>
     <path d="M0 70Q75 15 147 51T270 28Q347 30 400 79V350Q329 378 261 388T162 365Q94 344 72 318T0 326Z" fill="#b6c195" opacity=".38" stroke="#7b7958" strokeWidth="2"/>
     {Array.from({length:11},(_,i)=><g key={'mount'+i} transform={`translate(${18+i*34} ${57+(i%3)*19})`}><path d="M-19 35L0 -12 22 35Z" fill="#8d877b" stroke="#5f5d54" strokeWidth="1.5"/><path d="M-8 9L0 -12 10 9L2 4L-3 12Z" fill="#f2e9d3"/></g>)}
     {Array.from({length:25},(_,i)=><g key={'tree'+i} transform={`translate(${25+(i%5)*30+(i%3)*4} ${156+Math.floor(i/5)*32})`}><path d="M0 -15L-11 5H-6L-14 17H14L6 5H11Z" fill={i%3?'#526e52':'#667c52'} stroke="#3e5743" strokeWidth="1"/><path d="M0 17v6" stroke="#624e37" strokeWidth="2"/></g>)}
     <path d="M225 95Q209 161 246 208T225 300Q215 336 270 381" fill="none" stroke="#86a9ad" strokeWidth="11" strokeLinecap="round" opacity=".75"/>
     <path d="M225 95Q209 161 246 208T225 300Q215 336 270 381" fill="none" stroke="#e2d4b4" strokeWidth="2" opacity=".8"/>
     <path d="M132 175Q155 215 196 240T272 275" fill="none" stroke="#866e4c" strokeWidth="3" strokeDasharray="6 6"/>
     <path d="M196 240Q215 265 272 275" fill="none" stroke="#866e4c" strokeWidth="3" strokeDasharray="6 6"/>
     <g fill="#493d30" fontFamily="Georgia,serif" fontStyle="italic" textAnchor="middle"><text x="197" y="31" fontSize="18" letterSpacing="3">THE FOUR KEEPS</text><text x="207" y="136" fontSize="15">The High Marches</text><text x="83" y="333" fontSize="15">Elderwood</text><text x="309" y="194" fontSize="15">The Greenlands</text><text x="306" y="434" fontSize="17">The Salt Coast</text></g>
     <g fill="none" stroke="#715c3f" strokeWidth="2"><path d="M74 125l12 -14 12 14v17H74Z"/><path d="M321 124l12 -14 12 14v17h-24Z"/><path d="M55 358l12 -14 12 14v17H55Z"/><path d="M315 342l12 -14 12 14v17h-24Z"/></g>
     <g fontFamily="Georgia,serif" fill="#715c3f" fontSize="11" textAnchor="middle"><text x="86" y="155">Northern Keep</text><text x="332" y="155">Eastern Keep</text><text x="67" y="391">Forest Keep</text><text x="326" y="374">Coastal Keep</text></g>
     <g transform="translate(348 460)" stroke="#594a38" fill="none"><circle r="22"/><path d="M0 -28V28M-28 0H28"/><path d="M0 -20L-6 8L0 4L6 8Z" fill="#594a38"/></g>
     <text x="348" y="423" fontSize="13" textAnchor="middle" fill="#594a38">N</text>
    </svg>
     {mapped.map(p=>p.id==='frontier'?<button key={p.id} type="button" onClick={showDetail} style={{left:p.x+'%',top:p.y+'%'}} title="Frontier Village — detailed map available" aria-label="Open acquired Frontier Village map" className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#f7e8c5] bg-[#172f49] text-[#fff4d9] shadow-md ring-1 ring-[#172f49]"><span aria-hidden="true" className="text-base leading-none">⌂</span></button>:<span key={p.id} title={p.name+' — no detailed map acquired'} aria-label={p.name+' — no detailed map acquired'} style={{left:p.x+'%',top:p.y+'%'}} className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b4ada0] bg-[#888780] opacity-45"/>)}
    </>:<svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" role="img" aria-label="Acquired detailed map of Frontier Village showing the village roads, buildings, inn, market and surrounding farms">
      <defs><radialGradient id="villagePaper"><stop stopColor="#f2e2bb"/><stop offset="1" stopColor="#c8ab78"/></radialGradient></defs>
      <rect width="400" height="500" fill="url(#villagePaper)"/>
      <path d="M0 75Q120 40 210 80T400 55M0 420Q150 390 270 430T400 410" stroke="#7f9d7a" strokeWidth="38" fill="none" opacity=".35"/>
      <path d="M12 350Q100 325 145 345T260 330Q330 310 405 360" fill="none" stroke="#7c9fa9" strokeWidth="28" opacity=".7"/>
      <path d="M12 350Q100 325 145 345T260 330Q330 310 405 360" fill="none" stroke="#e5d7b3" strokeWidth="2"/>
      <path d="M190 -10L185 175L212 250L190 520M-10 235L140 225L212 250L405 205" fill="none" stroke="#b29a6c" strokeWidth="22"/>
      <path d="M190 -10L185 175L212 250L190 520M-10 235L140 225L212 250L405 205" fill="none" stroke="#e9d6aa" strokeWidth="16"/>
      {Array.from({length:18},(_,i)=>{const x=36+(i%5)*76+(i%2)*8,y=104+Math.floor(i/5)*83;return <g key={i} transform={`translate(${x} ${y}) rotate(${i%3===0?12:-8})`}><rect x="-16" y="-11" width="32" height="24" fill="#e0c89b" stroke="#785b3e" strokeWidth="1.5"/><path d="M-20 -11L0 -25L20 -11Z" fill="#9a6747" stroke="#6e4d37" strokeWidth="1.5"/></g>})}
      <g stroke="#667e53" fill="#71885d">{Array.from({length:20},(_,i)=><circle key={i} cx={18+(i%5)*93} cy={65+Math.floor(i/5)*115} r={9+(i%3)*3}/>)}</g>
      <g fontFamily="Georgia,serif" textAnchor="middle" fill="#4e3b2c"><text x="200" y="35" fontSize="23" letterSpacing="2">FRONTIER VILLAGE</text><text x="200" y="56" fontSize="11">A TRAVELER'S SURVEY</text><text x="104" y="165" fontSize="13">The Inn</text><text x="302" y="169" fontSize="13">Market Square</text><text x="90" y="305" fontSize="12">West Farms</text><text x="302" y="290" fontSize="12">Village Green</text><text x="215" y="462" fontSize="12">South Road</text><text x="198" y="93" fontSize="12">North Road</text></g>
      <g stroke="#785b3e" fill="none" strokeWidth="2"><path d="M81 187h46v29H81zM271 184h65v38h-65z"/><circle cx="295" cy="270" r="24"/></g>
      <g transform="translate(345 453)" stroke="#594a38" fill="none"><circle r="19"/><path d="M0 -25V25M-25 0H25"/><path d="M0 -19L-5 6L0 3L5 6Z" fill="#594a38"/></g>
     </svg>}
   </div>
  </div>
 </section>;
}
export function App() {
  const [activeView, setActiveView] = useState<View>('adventure');
  const [fullHistory, setFullHistory] = useState(false);
  const [draft, setDraft] = useState('');
  const [askDMOpen, setAskDMOpen] = useState(false);
  const [askDMDraft, setAskDMDraft] = useState('');
  const [pendingAdventureSpell, setPendingAdventureSpell] = useState<{spell:string;ritual:boolean;intent:string}|null>(null);
  const [adventureComponentsConfirmed,setAdventureComponentsConfirmed] = useState(false);
  const [pendingRest,setPendingRest] = useState<'short'|'long'|null>(null);
  const [restRolls,setRestRolls] = useState<number[]>([]);
  const [restApproved,setRestApproved] = useState(false);
  const [restNarration,setRestNarration] = useState('');
  const [restWaitMinutes,setRestWaitMinutes] = useState(0);
  const [pendingTestDamage,setPendingTestDamage] = useState<number|null>(null);
  const [notice, setNotice] = useState('');
  const [hideToast, setHideToast] = useState<{hidden:boolean;detail:string}|null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!hideToast) return;
    const timeout = window.setTimeout(() => setHideToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [hideToast]);

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

  async function deleteSelectedCampaign() {
    if (saving || loading || !campaign || deleteCampaignId !== campaign.id) return;
    const removedId = campaign.id;
    setSaving(true);
    try {
      await localCampaignStorage.remove(removedId);
      const remaining = campaigns.filter(item => item.id !== removedId);
      setCampaigns(remaining);
      setCampaign(remaining[0] ?? null);
      setDeleteCampaignId(null);
      setNotice('Campaign deleted from this device.');
    } catch (error) { setNotice('Could not delete campaign: ' + String(error)); }
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
    if(campaign?.combat?.status==='awaiting-initiative'){setNotice('Roll initiative using the highlighted button before taking your turn.');return;}
    if(campaign?.combat?.status==='initiative-set'){setNotice('Use the inline combat action buttons to take your turn.');return;}
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
      const next = result.combatStart && !current.combat && !current.pendingAftermath ? beginDuel(narrated,result.combatStart.enemyName) : current.pendingAftermath ? {...narrated,pendingAftermath:undefined} : narrated;
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns((items) => items.map((item) => item.id === next.id ? next : item));
      setDraft('');
      setActiveView('adventure');
      setNotice(result.combatStart?'Combat started. Tap Roll initiative.':'The DM replied. Conversation saved locally.');
    } catch (error) { setNotice('DM error: ' + String(error)); }
    finally { if(!alreadySaving)setSaving(false); }
  }

  async function changeEquipment(item:'daggers'|'arrows'|'caltrops'|'ballBearings',delta:number){
    if(!campaign||saving)return;
    setSaving(true);
    try{const next=adjustEquipment(campaign,item,delta);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(entry=>entry.id===next.id?next:entry));}
    catch(error){setNotice('Equipment: '+String(error));}finally{setSaving(false);}
  }
  async function startTrainingCombatTest() {
    if(!campaign||saving||campaign.combat||campaign.pendingAftermath)return;
    setSaving(true);
    try {
      const next=beginDuel(campaign,'Training Dummy');
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice('');
    }catch(error){setNotice('Training combat: '+String(error));}
    finally{setSaving(false);}
  }

  async function rollInitiative() {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=rollDuelInitiative(campaign);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice('');}
    catch(error){setNotice('Initiative error: '+String(error));}finally{setSaving(false);}
  }
  const [gridDestination,setGridDestination]=useState<{x:number;y:number}|null>(null);
  const [combatZoom,setCombatZoom]=useState(1);
  const combatMapRef=useRef<HTMLDivElement>(null);
  const combatGesture=useRef<{points:{x:number;y:number}[];startDistance:number;startZoom:number;startScrollX:number;startScrollY:number;startMidX:number;startMidY:number;moved:boolean}|null>(null);
  const suppressCombatTap=useRef(false);
  const combatTouches=(touches:React.TouchList)=>Array.from(touches,t=>({x:t.clientX,y:t.clientY}));
  const combatDistance=(p:{x:number;y:number}[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
  const combatMid=(p:{x:number;y:number}[])=>({x:p.reduce((s,t)=>s+t.x,0)/p.length,y:p.reduce((s,t)=>s+t.y,0)/p.length});
  function startCombatTouch(e:React.TouchEvent<HTMLDivElement>){
    const el=combatMapRef.current;if(!el)return;
    const points=combatTouches(e.touches),mid=combatMid(points);
    if(points.length<2){combatGesture.current=null;return;}
    suppressCombatTap.current=true;
    combatGesture.current={points,startDistance:combatDistance(points),startZoom:combatZoom,startScrollX:el.scrollLeft,startScrollY:el.scrollTop,startMidX:mid.x,startMidY:mid.y,moved:true};
  }
  function moveCombatTouch(e:React.TouchEvent<HTMLDivElement>){
    const el=combatMapRef.current;if(!el||e.touches.length<2)return;
    e.preventDefault();
    const points=combatTouches(e.touches),mid=combatMid(points);
    let g=combatGesture.current;
    if(!g||g.points.length<2){g={points,startDistance:combatDistance(points),startZoom:combatZoom,startScrollX:el.scrollLeft,startScrollY:el.scrollTop,startMidX:mid.x,startMidY:mid.y,moved:true};combatGesture.current=g;}
    suppressCombatTap.current=true;
    const next=Math.max(1,Math.min(4,g.startZoom*combatDistance(points)/g.startDistance));
    const rect=el.getBoundingClientRect();
    const anchorX=g.startScrollX+g.startMidX-rect.left,anchorY=g.startScrollY+g.startMidY-rect.top;
    setCombatZoom(next);
    requestAnimationFrame(()=>{if(combatMapRef.current){combatMapRef.current.scrollLeft=anchorX*next/g.startZoom-(mid.x-rect.left);combatMapRef.current.scrollTop=anchorY*next/g.startZoom-(mid.y-rect.top);}});
  }
  function endCombatTouch(e:React.TouchEvent<HTMLDivElement>){
    if(e.touches.length<2){combatGesture.current=null;return;}
    const points=combatTouches(e.touches),mid=combatMid(points),el=combatMapRef.current;
    combatGesture.current={points,startDistance:combatDistance(points),startZoom:combatZoom,startScrollX:el?.scrollLeft??0,startScrollY:el?.scrollTop??0,startMidX:mid.x,startMidY:mid.y,moved:true};
  }

  const [activeCombatToken,setActiveCombatToken]=useState<'nighthawk'|'owl'>('nighthawk');
  const previewRoute=activeCombatToken==='owl'&&campaign?.combat?.owl&&gridDestination?(()=>{const start=campaign.combat!.owl!.position;const dx=gridDestination.x-start.x,dy=gridDestination.y-start.y,steps=Math.max(Math.abs(dx),Math.abs(dy));return Array.from({length:steps+1},(_,i)=>({x:start.x+Math.sign(dx)*Math.min(i,Math.abs(dx)),y:start.y+Math.sign(dy)*Math.min(i,Math.abs(dy))}));})():campaign?.combat&&gridDestination?tacticalRoute(campaign.combat,gridDestination):null;
  const previewCost=activeCombatToken==='owl'&&campaign?.combat?.owl&&gridDestination?5*Math.max(Math.abs(gridDestination.x-campaign.combat.owl.position.x),Math.abs(gridDestination.y-campaign.combat.owl.position.y)):previewRoute?(previewRoute.length-1)*5:0;
  const previewAttacks=activeCombatToken==='owl'?[]:campaign?.combat&&previewRoute?tacticalOpportunityEnemies(campaign.combat,previewRoute):[];
  const activeOwlTarget=campaign?.combat?.selectedEnemy??'first';
  const sightPosition=campaign?.combat?.playerPosition??{x:2,y:4};
  const sightEnemies=campaign?.combat?[{name:'Dummy 1',alive:(campaign.combat.enemyHp??0)>0,blocked:trainingCoverBlocksSight(sightPosition,campaign.combat.enemyPosition??{x:6,y:4})},...(campaign.combat.secondEnemy?[{name:'Dummy 2',alive:campaign.combat.secondEnemy.hp>0,blocked:trainingCoverBlocksSight(sightPosition,campaign.combat.secondEnemy.position)}]:[])].filter(e=>e.alive):[];
  const visibleEnemies=sightEnemies.filter(e=>!e.blocked);
  const hideStatus=campaign?.combat?combatHideStatus(campaign.combat):null;
  const owlHelpTargetAlive=activeOwlTarget==='second'?(campaign?.combat?.secondEnemy?.hp??0)>0:(campaign?.combat?.enemyHp??0)>0;
  const owlHelpPosition=campaign?.combat?.owl?.position;
  const owlHelpEnemy=activeOwlTarget==='second'?campaign?.combat?.secondEnemy?.position:campaign?.combat?.enemyPosition;
  const owlHelpInRange=owlHelpTargetAlive&&!!owlHelpPosition&&!!owlHelpEnemy&&Math.max(Math.abs(owlHelpPosition.x-owlHelpEnemy.x),Math.abs(owlHelpPosition.y-owlHelpEnemy.y))<=1;
  const [selectedWeapon,setSelectedWeapon]=useState<'dagger'|'throw-dagger'|'shortbow'|null>(null);
  const [attackChoice,setAttackChoice]=useState<'weapon'|'shove'|'grapple'>('weapon');
  const [pendingCombatAction,setPendingCombatAction]=useState<'hide'|'attack'|'dodge'|'steady-aim'|'cunning-dash'|'cunning-disengage'|'disengage'|'dash'|'magic'|'utilize'|'search'|'study'|'influence'|'ready'|'end'|null>(null);
  async function repeatLaughterSave(){
    if(!campaign||saving)return;
    setSaving(true);
    try{
      const next=resolveLaughterRepeatSave(campaign);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice(next.journal[next.journal.length-1].text);
    }catch(error){setNotice('Repeat save: '+String(error));}finally{setSaving(false);}
  }
  async function resolveEncounterSpellSave(){
    if(!campaign||saving)return;
    setSaving(true);
    try{
      const next=resolveCombatSpellSave(campaign);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice(next.journal[next.journal.length-1].text);
    }catch(error){setNotice('Spell save: '+String(error));}finally{setSaving(false);}
  }
  async function castEncounterSpell(spell:string) {
    if(!campaign||saving)return;
    setSaving(true);
    try {
      const c=campaign.combat!;
      const target=c.selectedEnemy==='second'?c.secondEnemy?.name:c.enemyName;
      const next=castCombatMagicAction(campaign,spell,target??'',selectedWeapon==='dagger'?'dagger':'shortbow');
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingCombatAction(null);
      setNotice(spell+' cast. Magic Action spent; spell effect awaits DM adjudication.');
    } catch(error){setNotice('Magic Action: '+String(error));}
    finally{setSaving(false);}
  }
  async function combatAction(action:'move'|'attack'|'throw-dagger'|'shortbow'|'dash'|'disengage'|'dodge'|'steady-aim'|'cunning-dash'|'cunning-disengage'|'end') {
    if(!campaign||saving)return;
    setSaving(true);
    try {
      const next=takeDuelTurnAction(campaign,action);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingCombatAction(null);
      setNotice(publicCombatText(next.journal[next.journal.length-1].text));
    } catch(error){setNotice('Combat: '+String(error));} finally{setSaving(false);}
  }
  const [readyTrigger,setReadyTrigger]=useState('');
  const [readyResponse,setReadyResponse]=useState('');
  const [readyWeapon,setReadyWeapon]=useState<'narrative'|'dagger'|'throw-dagger'|'shortbow'|'mind-sliver'>('narrative');
  async function adjudicateCombatWithDM(current:Campaign) {
    const pending=current.combatAdjudication;
    if(!pending)return;
    if(!accessCode){setNotice('Combat action saved. Enter your DM access code to adjudicate its consequences.');return;}
    setNotice('Combat action saved. The DM is adjudicating the consequences…');
    try{
      const history=current.journal.filter(e=>e.kind==='player'||e.kind==='dm').slice(-12).map(e=>({role:e.kind==='player'?'user':'assistant',content:e.text}));
      const response=await fetch('/api/dm',{method:'POST',headers:{'Content-Type':'application/json','x-four-keeps-access':accessCode},
        body:JSON.stringify({message:'Resolve the recorded combat action.',combatAdjudication:{kind:pending.kind,detail:pending.detail},character:current.character??prototypeNighthawk,
          gameState:{combat:current.combat??null,familiar:current.familiar??null,concentration:current.concentration??null,spellEffects:(current.spellEffects??[]).slice(-12),recentEvents:current.journal.filter(e=>e.kind==='system').slice(-8).map(e=>e.text)},
          history,worldFacts:current.worldFacts??[],world:current.world??emptyWorld()})});
      const result:{narration?:string;newFacts?:string[];worldUpdates?:unknown;error?:string}=await response.json();
      if(!response.ok||!result.narration)throw Error(result.error??'DM adjudication failed');
      const updated=addExchange(current,pending.detail,result.narration,new Date().toISOString(),result.newFacts??[],result.worldUpdates);
      const next={...updated,combatAdjudication:undefined};
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(entry=>entry.id===next.id?next:entry));
      setNotice('Combat consequences narrated and saved to the persistent world.');
    }catch(error){setNotice('Combat action saved, but DM adjudication failed: '+String(error)+'. Use Retry DM adjudication to continue.');}
  }
  async function retryCombatAdjudication(){
    if(!campaign?.combatAdjudication||saving)return;
    setSaving(true);try{await adjudicateCombatWithDM(campaign);}finally{setSaving(false);}
  }
  async function skillCombatAction(action:'Search'|'Study'|'Influence',skill:Parameters<typeof takeCombatSkillAction>[2]){
    if(!campaign||saving)return;
    setSaving(true);
    try{const next=takeCombatSkillAction(campaign,action,skill);
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(entry=>entry.id===next.id?next:entry));setPendingCombatAction(null);setNotice(publicCombatText(next.journal.at(-1)!.text));await adjudicateCombatWithDM(next);
    }catch(error){setNotice(action+': '+String(error));}finally{setSaving(false);}
  }
  async function declareReady(){
    if(!campaign||saving)return;
    setSaving(true);
    try{const next=readyWeapon==='mind-sliver'?readyCombatMindSliver(campaign,readyTrigger):readyCombatAction(campaign,readyTrigger,readyWeapon==='narrative'?readyResponse:readyWeapon==='shortbow'?'Fire my shortbow':readyWeapon==='throw-dagger'?'Throw my dagger':'Strike with my dagger',readyWeapon==='narrative'?undefined:readyWeapon);
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(entry=>entry.id===next.id?next:entry));setPendingCombatAction(null);setNotice(publicCombatText(next.journal.at(-1)!.text));if(next.combatAdjudication)await adjudicateCombatWithDM(next);
    }catch(error){setNotice('Ready: '+String(error));}finally{setSaving(false);}
  }
  async function triggerReady(){
    if(!campaign||saving)return;
    setSaving(true);
    try{const weapon=campaign.combat?.readiedAction?.weapon;
    const next=campaign.combat?.readiedAction?.spell?resolveReadiedSpellReaction(campaign):weapon?resolveReadiedWeaponAttack(campaign,weapon):resolveReadiedCombatReaction(campaign);
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(entry=>entry.id===next.id?next:entry));setNotice(publicCombatText(next.journal.at(-1)!.text));if(next.combatAdjudication)await adjudicateCombatWithDM(next);
    }catch(error){setNotice('Ready: '+String(error));}finally{setSaving(false);}
  }
  async function useCombatItem(item:'caltrops'|'ballBearings') {
    if(!campaign||saving)return;
    setSaving(true);
    try{
      const next=utilizeCombatItem(campaign,item);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(entry=>entry.id===next.id?next:entry));
      setPendingCombatAction(null);
      setNotice(publicCombatText(next.journal[next.journal.length-1].text));
    }catch(error){setNotice('Utilize: '+String(error));}finally{setSaving(false);}
  }
  async function confirmWeaponAttack(weapon:'dagger'|'throw-dagger'|'shortbow'){
    if(!campaign||saving)return;
    if(campaign.combat?.actionUsed||campaign.combat?.attack){setNotice('Attack already used this turn. You may still use an available Bonus Action.');setPendingCombatAction(null);return;}
    setSaving(true);
    try{
      const selected=takeDuelTurnAction(campaign,weapon==='shortbow'?'shortbow':weapon==='throw-dagger'?'throw-dagger':'attack');
      const next=rollDuelAttack(selected,'hit');
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingCombatAction(null);setSelectedWeapon(null);
      setNotice(publicCombatText(next.journal[next.journal.length-1].text));
    }catch(error){setNotice('Combat: '+String(error));}finally{setSaving(false);}
  }
  async function owlAction(action:'help'|'dash'|'disengage'|'dodge'){
    if(!campaign||saving)return;setSaving(true);
    try{if(action==='help'&&!owlHelpInRange)throw Error('Select a living enemy and move the owl within 5 feet before using Help.');const next=action==='help'?owlHelp(campaign,activeOwlTarget):owlTurnAction(campaign,action);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice(next.journal[next.journal.length-1].text);}catch(error){setNotice('Owl: '+String(error));}finally{setSaving(false);}
  }
  async function confirmGridMove(){
    if(!campaign||!gridDestination||saving)return;
    setSaving(true);
    try{
      const next=activeCombatToken==='owl'?moveOwl(campaign,gridDestination.x,gridDestination.y):moveDuelToken(campaign,gridDestination.x,gridDestination.y);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice(publicCombatText(next.journal[next.journal.length-1].text));
      setGridDestination(null);
    }catch(error){setNotice('Movement: '+String(error));}finally{setSaving(false);}
  }
  async function enemyOpportunityRoll(kind:'hit'|'damage'|'finish'){
    if(!campaign||saving)return;
    setSaving(true);
    try{const next=resolveEnemyOpportunity(campaign,kind);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Opportunity attack: '+String(error));}finally{setSaving(false);}
  }
  async function performShove(outcome:'prone'|'push') {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=shoveTrainingEnemy(campaign,outcome);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setPendingCombatAction(null);setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Shove: '+String(error));}finally{setSaving(false);}
  }
  async function chooseTrainingTarget(target:'first'|'second') {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=selectTrainingTarget(campaign,target);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Target: '+String(error));}finally{setSaving(false);}
  }
  async function addSecondDummy() {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=addSecondTrainingEnemy(campaign);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Training: '+String(error));}finally{setSaving(false);}
  }
  async function stealthTest(kind:'hide'|'search',hideType:'action'|'bonus'='bonus') {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=kind==='hide'?hideNighthawk(campaign,hideType):searchForNighthawk(campaign);await localCampaignStorage.save(next);setCampaign(next);if(kind==='hide'&&next.combat?.hideResult)setHideToast({hidden:!!next.combat.playerHidden,detail:next.combat.hideResult});setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Stealth: '+String(error));}finally{setSaving(false);}
  }
  async function grappleTest(kind:'grapple'|'str'|'dex') {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=kind==='grapple'?grappleTrainingEnemy(campaign):escapeTrainingGrapple(campaign,kind);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setPendingCombatAction(null);setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Grapple: '+String(error));}finally{setSaving(false);}
  }
  async function rollCombatAttack(kind:'hit'|'damage') {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=rollDuelAttack(campaign,kind);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Combat: '+String(error));}finally{setSaving(false);}
  }
  const [confirmTrainingReset,setConfirmTrainingReset]=useState(false);
  async function resetTrainingEncounter(){
    if(!campaign||saving)return;
    setSaving(true);
    try{
      const next=quitTrainingEncounter(campaign);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingCombatAction(null);setGridDestination(null);setSelectedWeapon(null);setConfirmTrainingReset(false);
      setNotice('Encounter training ended. Nighthawk is fully healed; dummy reset. Start a new encounter to test again.');
    }catch(error){setNotice('Training reset: '+String(error));}finally{setSaving(false);}
  }
  async function finishDefeatedDuel() {
    if(!campaign||saving||(campaign.combat?.enemyHp!==0&&campaign.combat?.outcome!=='player-defeated'))return;
    const opponent=campaign.combat.enemyName;
    const playerDefeated=campaign.combat.outcome==='player-defeated';
    setSaving(true);
    try {
      const concluded=concludeDuel(campaign);
      // Training Dummy is a mechanics-only sandbox, not a character in the story.
      // Never send its knockout to the narrative DM or leave an aftermath request.
      if(opponent==='Training Dummy'){
        const next={...concluded,pendingAftermath:undefined};
        await localCampaignStorage.save(next);
        setCampaign(next);
        setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
        setPendingCombatAction(null);
        setNotice('Encounter training complete. HP fully restored; simulated thrown daggers recovered. The adventure story is unchanged.');
        setSaving(false);
        return;
      }
      const next=concluded;
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setPendingCombatAction(null);
      setNotice('Combat ended; requesting the DM aftermath.');
      await sendToDM(next,playerDefeated?'The sparring match is over. Nighthawk was reduced to 0 HP by a nonlethal strike and is unconscious, not dead. Narrate the aftermath and how Bran or bystanders help Nighthawk recover; do not restart combat or silently change HP.':'The nonlethal sparring match is over. '+opponent+' was reduced to 0 HP and knocked unconscious, not killed. Narrate the immediate aftermath, how the bystanders respond, and how '+opponent+' eventually recovers. Do not restart combat or change mechanical HP.');
    } catch(error){setNotice('Encounter conclusion failed: '+String(error));setSaving(false);}
  }
  async function retryCombatAftermath() {
    if(!campaign?.pendingAftermath||saving)return;
    const {opponent,playerDefeated}=campaign.pendingAftermath;
    setSaving(true);
    try {
      await sendToDM(campaign,playerDefeated
        ? 'The completed nonlethal sparring match ended with Nighthawk unconscious at 0 HP. Narrate only the aftermath and aid; do not restart the fight or change HP.'
        : 'The completed nonlethal sparring match ended with '+opponent+' unconscious at 0 HP. Narrate only the aftermath, witnesses, and eventual recovery. Do not restart the fight or change HP.',true);
    } finally {setSaving(false);}
  }
  const [selectedShoveSave,setSelectedShoveSave]=useState<'str'|'dex'|null>(null);
  async function proneTrainingAction(kind:'begin'|'str'|'dex'|'stand') {
    if(!campaign||saving)return;
    setSaving(true);
    try {
      const next=kind==='begin'?beginEnemyShove(campaign):kind==='stand'?standNighthawk(campaign):rollPlayerShoveSave(campaign,kind);
      if(kind==='begin'||kind==='str'||kind==='dex')setSelectedShoveSave(null);
      await localCampaignStorage.save(next);
      setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice(publicCombatText(next.journal[next.journal.length-1]?.text??'Enemy Shove: choose a saving throw.'));
    }catch(error){setNotice('Prone test: '+String(error));}finally{setSaving(false);}
  }
  const [selectedGrappleRoll,setSelectedGrappleRoll]=useState<'str'|'dex'|null>(null);
  async function playerGrappleAction(kind:'begin'|'save'|'escape'|'check') {
    if(!campaign||saving)return;
    setSaving(true);
    try {
      const next=kind==='begin'?beginEnemyGrapple(campaign):kind==='save'?rollPlayerGrappleSave(campaign,selectedGrappleRoll!):kind==='escape'?beginPlayerGrappleEscape(campaign):rollPlayerGrappleEscape(campaign,selectedGrappleRoll!);
      if(kind==='begin'||kind==='escape'||kind==='save'||kind==='check')setSelectedGrappleRoll(null);
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice(publicCombatText(next.journal[next.journal.length-1]?.text??'Choose a roll.'));
    }catch(error){setNotice('Grapple: '+String(error));}finally{setSaving(false);}
  }
  const enemyAutoRunning=useRef(false);
  useEffect(()=>{
    const c=campaign?.combat;
    if(!campaign||!c||c.status!=='initiative-set'||!c.order||c.order[c.turnIndex??0]==='Nighthawk'||saving||enemyAutoRunning.current||c.opportunity||c.pendingEnemyShove||c.pendingEnemyGrapple)return;
    enemyAutoRunning.current=true;
    let cancelled=false;
    const run=async()=>{
      try {
        let next=campaign;
        for(let n=0;n<8;n++){
          const turn=next.combat;
          if(!turn||turn.status!=='initiative-set'||turn.order?.[turn.turnIndex??0]==='Nighthawk'||turn.opportunity||turn.pendingEnemyShove||turn.pendingEnemyGrapple)break;
          next=resolveDuelEnemyTurn(next);
        }
        if(!cancelled&&next!==campaign){await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setNotice(publicCombatText(next.journal[next.journal.length-1]?.text??'Enemy turn resolved.'));}
      }catch(error){if(!cancelled)setNotice('Enemy turn: '+String(error));}
      finally{enemyAutoRunning.current=false;}
    };
    void run();
    return()=>{cancelled=true;};
  },[campaign,saving]);
  async function resolveEnemyTurn() {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=resolveDuelEnemyTurn(campaign);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setPendingCombatAction(null);setNotice(publicCombatText(next.journal[next.journal.length-1].text));}
    catch(error){setNotice('Enemy turn: '+String(error));}finally{setSaving(false);}
  }
  async function trainingReaction(action:'move'|'attack'|'decline'|'hit'|'damage'|'finish'){
    if(!campaign||saving)return;
    setSaving(true);
    try{
      const next=action==='move'?moveTrainingDummy(campaign):action==='attack'||action==='decline'?resolveTrainingReaction(campaign,action):rollTrainingReaction(campaign,action);
      await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));
      setNotice(publicCombatText(next.journal[next.journal.length-1].text));
    }catch(error){setNotice('Reaction test: '+String(error));}finally{setSaving(false);}
  }
  async function skipEnemyTurnForTest() {
    if(!campaign||saving)return;
    setSaving(true);
    try {const next=advanceDuelTestEnemyTurn(campaign);await localCampaignStorage.save(next);setCampaign(next);setCampaigns(items=>items.map(item=>item.id===next.id?next:item));setPendingCombatAction(null);setNotice("Test-only: enemy turn skipped. Nighthawk may act.");}
    catch(error){setNotice('Combat: '+String(error));}finally{setSaving(false);}
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

  const content = { adventure: campaign?.combat && campaign.combat.status!=='completed' ? null : <Adventure campaign={campaign} fullHistory={fullHistory} onToggleHistory={() => setFullHistory(value => !value)}/>, party: <Party campaign={campaign} saving={saving} onRoll={(skill,mode) => void saveSkillRoll(skill,mode)} onSaveRoll={(ability,mode) => void saveSavingThrow(ability,mode)} onAwardXP={(amount,reason) => void updateProgress('award',amount,reason)} onLevelUp={hp => void updateProgress('level',hp)} onLevelThree={(hp,cantrips,spells) => void updateProgress('level3',hp,'',cantrips,spells)} onReconcile={() => void updateProgress('reconcile')} onUndoReconcile={() => void updateProgress('undoReconcile')} onRestore={() => void updateProgress('restore')} onCastSpell={(spell,ritual,components,target)=>void castSpell(spell,ritual,components,target)} onEndConcentration={()=>void endConcentration()} onAdjustEquipment={(item,delta)=>void changeEquipment(item,delta)}/>, journal: <Journal campaign={campaign}/>, map: <WorldMap campaign={campaign}/>, settings: <section className="space-y-4"><h2 className="font-serif text-2xl">Settings</h2><p className="text-sm text-parchment/60">Manage campaigns, backups, and Dungeon Master access below.</p></section> };
  return <div className="min-h-dvh bg-ink text-parchment">
    <div className={activeView==='map'?"mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden":"mx-auto flex min-h-dvh w-full max-w-3xl flex-col"}>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/95 px-5 pb-4 pt-[max(1.2rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">A living tabletop adventure</p><div className="flex items-center gap-2"><img src="/dragon-sigil.svg" alt="" aria-hidden="true" className="h-8 w-8 opacity-85"/><h1 className="font-serif text-3xl tracking-wide">Four Keeps</h1></div></div><span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">Prototype</span></div>
        <div className="mt-3 flex items-center justify-between text-xs text-parchment/60"><span className="flex flex-wrap items-center gap-2">{campaign?.combat&&<UserRound size={15} className="text-emerald-300" aria-label="Player token"/>}{campaign?.title ?? 'No campaign selected'}{campaign?.combat?.owl&&(campaign.character?.level??1)>=3&&campaign.familiar?.status!=='dismissed'&&campaign.familiar?.status!=='destroyed'&&<Bird size={15} className="text-sky-300" aria-label="Familiar token"/>}{campaign?.combat&&<span className="ml-2 inline-flex flex-wrap gap-1 align-middle" aria-label="Active player statuses">
          {campaign.combat.playerHidden&&<span className="rounded border border-emerald-400/60 px-2 py-0.5 text-emerald-300" title="Hidden from Hide; ends when discovered or revealed">◉ Hidden</span>}
          {campaign.combat.playerProne&&<span className="rounded border border-amber-400/60 px-2 py-0.5 text-amber-200">Prone</span>}
          {campaign.combat.playerGrappled&&<span className="rounded border border-amber-400/60 px-2 py-0.5 text-amber-200">Grappled</span>}
          {campaign.combat.lastAction==='Dodge'&&<span className="rounded border border-sky-400/60 px-2 py-0.5 text-sky-200">Dodging</span>}
          {campaign.concentration&&<span className="rounded border border-violet-400/60 px-2 py-0.5 text-violet-200">Concentrating: {campaign.concentration.spell}</span>}
          </span>}</span><span>{campaign?.location ?? 'Frontier Village'}</span></div>
        {campaign?.combat?.status==='initiative-set'&&campaign.combat.selectedEnemy&&<div className="mt-2 flex flex-wrap items-center gap-2 text-xs" aria-label="Selected combat target">
          <span className="text-parchment/55">TARGET</span>
          <strong className="text-parchment">{campaign.combat.selectedEnemy==='second'&&campaign.combat.secondEnemy?campaign.combat.secondEnemy.name:campaign.combat.enemyName}</strong>
          <span className="text-parchment/70">{(()=>{const c=campaign.combat!,second=c.selectedEnemy==='second'&&!!c.secondEnemy;const hp=second?c.secondEnemy!.hp:c.enemyHp??12,max=second?c.secondEnemy!.maxHp:c.enemyMaxHp??12;return hp<=0?'Defeated':hp<=max/2?'Bloodied':'Standing';})()}</span>
          {(()=>{const c=campaign.combat!,second=c.selectedEnemy==='second'&&!!c.secondEnemy;return <>{(second?c.secondEnemy!.prone:c.enemyProne)&&<span className="text-amber-200">Prone</span>}{(second?c.secondEnemy!.grappled:c.enemyGrappled)&&<span className="text-amber-200">Grappled</span>}</>;})()}
        </div>}
        {campaign?.combat&&<div className="mt-2 text-xs font-semibold tracking-widest text-gold" aria-label="Combat round">ROUND {campaign.combat.round}</div>}
        {campaign?.combat?.status==='initiative-set'&&<div aria-label="Combat resources" className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
          <div className="rounded bg-white/10 p-1"><span className="block text-[10px] text-parchment/60">ACTION</span><strong>{campaign.combat.actionUsed||campaign.combat.attack?'Spent':'Ready'}</strong></div>
          <div className="rounded bg-white/10 p-1"><span className="block text-[10px] text-parchment/60">BONUS</span><strong>{campaign.combat.bonusActionUsed?'Spent':'Ready'}</strong></div>
          <div className="rounded bg-white/10 p-1"><span className="block text-[10px] text-parchment/60">MOVE</span><strong>{availableCombatMovement(campaign.combat)} ft</strong></div>
          <div className="rounded bg-white/10 p-1"><span className="block text-[10px] text-parchment/60">REACTION</span><strong>{campaign.combat.reactionUsed?'Spent':'Ready'}</strong></div>
        </div>}
      </header>
      {hideToast&&<div role="status" aria-live="polite" className={`fixed left-4 right-4 top-28 z-50 mx-auto max-w-lg rounded-xl border-2 p-3 shadow-xl text-sm ${hideToast.hidden?'border-emerald-400 bg-emerald-950 text-emerald-100':'border-red-400 bg-red-950 text-red-100'}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{hideToast.hidden?'Hide succeeded — Hidden':'Hide failed — Spotted'}</p><p className="mt-1 text-xs">{hideToast.detail}</p></div><button type="button" aria-label="Dismiss hide notification" onClick={()=>setHideToast(null)}>×</button></div>
      </div>}
      <main className={activeView==='map'?"min-h-0 flex-1 overflow-hidden px-3 py-3":"flex-1 px-5 py-6 pb-48"} id="main-content">
        {activeView === 'settings' && <>
        <section className="mb-5 rounded-xl border border-gold/25 bg-panel p-4 space-y-3" aria-label="Local campaigns">
          <div className="flex items-center justify-between"><h2 className="font-serif text-lg">Local campaigns</h2><span className="text-xs text-parchment/55">{loading ? 'Loading…' : 'Saved on this device'}</span></div>
          {campaigns.length > 0 && <label className="block text-xs text-parchment/70">Active campaign
            <select value={campaign?.id ?? ''} onChange={(event) => { setCampaign(campaigns.find((item) => item.id === event.target.value) ?? null); setDeleteCampaignId(null); setNotice(''); }} className="mt-1 w-full rounded-lg border border-white/20 bg-ink p-3 text-parchment">
              {campaigns.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select></label>}
          {campaign && <div className="space-y-2">
            {deleteCampaignId === campaign.id ? <div className="rounded-lg border border-red-400/60 p-3 space-y-3" role="group" aria-label="Confirm campaign deletion">
              <p className="text-sm">Permanently delete <strong>{campaign.title}</strong> from this device? This cannot be undone unless you have exported a backup.</p>
              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={() => void deleteSelectedCampaign()} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Confirm delete</button>
                <button type="button" disabled={saving} onClick={() => setDeleteCampaignId(null)} className="rounded-lg border border-white/30 px-3 py-2 text-sm">Cancel</button>
              </div>
            </div> : <button type="button" disabled={saving || loading} onClick={() => setDeleteCampaignId(campaign.id)} className="rounded-lg border border-red-400/50 px-3 py-2 text-sm text-red-200 disabled:opacity-40">Delete selected campaign</button>}
          </div>}
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
        {activeView==='adventure' && campaign?.pendingCheck && <div className="mt-4 rounded-xl border border-gold/40 bg-panel p-4 space-y-2" role="group" aria-label="Pending skill check">
          <p className="eyebrow">Dungeon Master requests a check</p>
          <p className="font-serif text-xl">{campaign.pendingCheck.skill} · {campaign.pendingCheck.mode}</p>
          <p className="text-sm text-parchment/70">{campaign.pendingCheck.reason}</p>
          <button type="button" disabled={saving || !dmMode} onClick={() => void resolvePendingCheck()} className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-40">{campaign.pendingCheck.dice ? (saving ? 'DM is resolving…' : 'Retry DM response') : 'Roll '+campaign.pendingCheck.skill}</button>
           {campaign.pendingCheck.dice && (() => { const dice = campaign.pendingCheck.dice; const used = dice.length === 1 ? dice[0] : campaign.pendingCheck.mode === 'advantage' ? Math.max(...dice) : Math.min(...dice); const modifier = skillModifier(campaign.character ?? prototypeNighthawk, campaign.pendingCheck.skill as Parameters<typeof skillModifier>[1]); return <div role="status" aria-live="polite" className="rounded-lg border border-gold/30 bg-ink/60 p-3"><p className="text-xs uppercase tracking-widest text-gold">Nighthawk · {campaign.pendingCheck.skill} check</p><p className="mt-2 text-xl font-semibold">{dice.length === 1 ? String(dice[0]) : dice.join(' / ')+' ('+campaign.pendingCheck.mode+': '+used+')'} <span className="text-parchment/70">{modifier >= 0 ? '+' : '−'}{Math.abs(modifier)} =</span> {used + modifier}</p><p className="mt-1 text-xs text-parchment/65">{saving ? 'Waiting for the Dungeon Master. Your roll is saved.' : 'Roll saved. Retry the DM response without rerolling.'}</p></div>; })()}
          <p className="text-xs text-parchment/60">The target number is hidden. Your roll is saved before adjudication.</p>
        </div>}
        {activeView==='adventure' && campaign?.pendingAftermath && !campaign.combat && <div className="mt-4 space-y-3 rounded-xl border border-gold/50 bg-panel p-4" role="status"><p className="eyebrow">Combat concluded · aftermath pending</p><p className="text-sm">{campaign.pendingAftermath.playerDefeated?'Nighthawk':' '+campaign.pendingAftermath.opponent} was knocked unconscious in the nonlethal sparring match. The result is saved; the DM narration can be retried without repeating combat.</p><button type="button" disabled={saving} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>void retryCombatAftermath()}>{saving?'Contacting DM…':'Continue aftermath'}</button></div>}
        {activeView==='adventure' && !!campaign?.encounterRecaps?.length && !campaign.combat && <details className="mt-4 rounded-xl border border-gold/40 bg-panel p-4"><summary className="font-semibold text-gold">Past Encounter Recaps ({campaign.encounterRecaps.length})</summary><div className="mt-3 space-y-2">{campaign.encounterRecaps.slice().reverse().map(r=><div key={r.id} className="rounded-lg border border-white/20 p-3 text-sm"><strong>{r.outcome} · {r.rounds} rounds</strong><p>Damage {r.damage} · Movement {r.movement} ft · Hits {r.hits}/{r.attacks} · Criticals {r.criticalHits} · Finishing blows {r.finishingBlows}</p></div>)}</div></details>}
        {activeView==='adventure' && campaign?.combat && <div className="mt-4 space-y-3 rounded-xl border border-gold/50 bg-panel p-4" aria-label="Combat initiative tracker">
          {(()=>{const latestDamage=campaign.journal.slice(campaign.combat!.journalStartIndex??0).filter(entry=>entry.kind==='system'&&(/Nighthawk HP: \d+ → \d+\//.test(entry.text)||/Nighthawk takes \d+ damage/.test(entry.text))).at(-1);return <div className="space-y-2">{latestDamage&&campaign.journal.at(-1)?.id===latestDamage.id&&<p role="status" aria-live="polite" className="rounded-lg border border-red-400/70 bg-red-950/30 p-3 text-sm font-semibold">{latestDamage.text}</p>}</div>;})()}
          {campaign.combat.status==='completed'&&(()=>{const s=campaign.combat!.stats??{damage:0,movement:0,attacks:0,hits:0,criticalHits:0,sneakDamage:0,finishingBlows:0};return <section className="rounded-xl border border-gold/60 bg-gold/10 p-4 space-y-3" aria-label="Encounter recap"><p className="eyebrow">Encounter Complete</p><h3 className="font-serif text-xl text-gold">{campaign.combat!.outcome==='player-defeated'?'Defeat':'Victory'} · Combat Recap</h3><div className="grid grid-cols-3 gap-2 text-center">{[['Rounds',campaign.combat!.round],['Damage',s.damage],['Movement',s.movement+' ft']].map(([label,value])=><div key={label} className="rounded-lg border border-white/20 p-2"><strong className="block text-lg">{value}</strong><span className="text-xs">{label}</span></div>)}</div><p className="font-semibold">Nighthawk · Scorecard</p><p className="text-sm">Attacks: {s.attacks} · Hits: {s.hits} · Accuracy: {s.attacks?Math.round(100*s.hits/s.attacks):0}%</p><p className="text-sm">Critical hits: {s.criticalHits} · Sneak Attack damage: {s.sneakDamage} · Finishing blows: {s.finishingBlows}</p><p className="text-xs text-parchment/70">Training encounter statistics. Continue to save the recap in your campaign history.</p></section>;})()}
          {(campaign.combat.status==='completed'||(campaign.combat.enemyHp===0&&(!campaign.combat.secondEnemy||campaign.combat.secondEnemy.hp===0))) ? <div className="space-y-3 rounded-lg border border-gold/60 bg-gold/10 p-3"><p className="font-semibold text-gold">{campaign.combat.outcome==='player-defeated'?'Nighthawk is unconscious — sparring ends':'Victory — nonlethal sparring match'}</p><p className="text-sm">{campaign.combat.outcome==='player-defeated'?'Nighthawk was reduced to 0 HP by a nonlethal training strike. Combat has ended.':campaign.combat.enemyName+' is at 0 HP and unconscious, not dead. Combat is over; no further turns are needed.'}</p><button type="button" disabled={saving} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>void finishDefeatedDuel()}>Continue to aftermath</button></div> : campaign.combat.status==='awaiting-initiative' ? <><p className="text-sm">The enemy's initiative has been rolled. Roll Nighthawk's d20 to establish turn order.</p><button type="button" disabled={saving} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>void rollInitiative()}>Roll initiative (d20 + DEX)</button></> : <><p className="font-semibold text-gold">{campaign.combat.order?.[campaign.combat.turnIndex??0]==='Nighthawk'?'Your turn — Nighthawk':'Enemy turn — '+campaign.combat.order?.[campaign.combat.turnIndex??0]}</p>{!campaign.combat.secondEnemy&&<button type="button" disabled={saving} className="hidden" onClick={()=>void addSecondDummy()}>Add Second Training Dummy · Test Multiple Enemies</button>}
          
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-3 space-y-3" aria-label="Combat turn summary">
            <p className="text-sm font-semibold text-gold">Initiative · Round {campaign.combat.round}</p>
            {(()=>{
              const c=campaign.combat!,order=c.order??[],index=c.turnIndex??0;
              const encounterEntries=campaign.journal.slice(c.journalStartIndex??0).filter(entry=>entry.kind==='system');
              const displayName=(name:string)=>name==='Training Dummy'?'Training Dummy 1':name;
              const summaryFor=(name:string):string=>{
                const entries=[...encounterEntries].reverse();
                for(const entry of entries){
                  const message=entry.text;
                  if(name==='Nighthawk'){
                    if(!/^(Shortbow \(|Dagger \(|Thrown dagger \(|Nighthawk hits |Nighthawk misses |Nighthawk takes |Nighthawk uses |Nighthawk casts |Nighthawk hides |Nighthawk fails to hide |Nighthawk dodges |Nighthawk dashes |Nighthawk disengages |Nighthawk shoves |Nighthawk grapples )/.test(message))continue;
                    if(/^(Shortbow \(|Dagger \(|Thrown dagger \()/.test(message)){
                      const hit=/\bHIT\b/.test(message),target=message.match(/(?:Training Dummy(?: 2)?)/)?.[0]??c.secondEnemy?.name??c.enemyName;
                      const damage=message.match(/(?:total damage|Damage):?\s*(\d+)/i)?.[1];
                      return hit?'Hit '+displayName(target)+(damage?' · '+damage+' dmg':''):'Missed '+displayName(target);
                    }
                    return message.replace(/Training Dummy(?! \d)/g,'Training Dummy 1').slice(0,72);
                  }
                  const original=name==='Training Dummy'?'Training Dummy':name;
                  if(!message.startsWith(original+' ')||name==='Training Dummy'&&message.startsWith('Training Dummy 2 '))continue;
                  if(!/training attack:| attacks | waits out of range| moves | hits | misses /.test(message))continue;
                  if(/training attack:| attacks /.test(message)){
                    const hit=/\bHIT\b/.test(message),damage=message.match(/Damage:\s*(\d+)/)?.[1];
                    return hit?'Hit Nighthawk'+(damage?' · '+damage+' dmg':''):'Missed Nighthawk';
                  }
                  return 'Moved';
                }
                return '—';
              };
               const statusFor=(name:string)=>{const hp=name==='Nighthawk'?(campaign.character?.currentHitPoints??campaign.character?.maxHitPoints??10):name===c.secondEnemy?.name?c.secondEnemy.hp:c.enemyHp??12;const max=name==='Nighthawk'?(campaign.character?.maxHitPoints??10):name===c.secondEnemy?.name?c.secondEnemy.maxHp:c.enemyMaxHp??12;return hp<=0?'Defeated':hp<=max/2?'Bloodied':'';};
               const conditionsFor=(name:string)=>name==='Nighthawk'?[c.playerProne?'Prone':'',c.playerGrappled?'Grappled':'',c.playerHidden?'Hidden':'']:name===c.secondEnemy?.name?[c.secondEnemy.prone?'Prone':'',c.secondEnemy.grappled?'Grappled':'']:[c.enemyProne?'Prone':'',c.enemyGrappled?'Grappled':''];
               return <div className="space-y-3 text-sm">
                 <ol className="space-y-1">{order.map((name,i)=><li key={name} className={`rounded-lg border px-3 py-2 ${statusFor(name)==='Defeated'?'border-white/10 bg-black/30 opacity-60':i===index?'border-gold bg-gold/15':'border-white/15'}`}><div className="flex items-center justify-between gap-2"><span><span className="mr-2 text-parchment/60">{i+1}.</span><strong className={i===index?'text-gold':''}>{displayName(name)}</strong>{i===index&&<span className="ml-2 text-xs text-gold">CURRENT</span>}</span><span className="flex items-center gap-2">{statusFor(name)==='Bloodied'&&<Droplet aria-label="Bloodied" className="h-3.5 w-3.5 text-red-400" fill="currentColor"/>}{statusFor(name)==='Defeated'&&<span className="text-xs text-red-300">Defeated</span>}<span className="tabular-nums">{name==='Nighthawk'?c.playerInitiative:name===c.secondEnemy?.name?c.secondEnemy.initiative:c.enemyInitiative}</span></span></div>{conditionsFor(name).filter(Boolean).length>0&&<p className="pl-5 text-xs text-amber-200">{conditionsFor(name).filter(Boolean).join(' · ')}</p>}<p className="mt-1 pl-5 text-xs leading-relaxed text-parchment/75">{summaryFor(name)}</p></li>)}</ol>
               </div>;
             })()}
          </div>{campaign.combat.order?.[campaign.combat.turnIndex??0]==='Nighthawk' ? <div className="space-y-3">
          {campaign.combat.lastPlayerShoveSave&&<div role="status" aria-live="polite" className="rounded-lg border-2 border-gold bg-gold/10 p-4 space-y-2"><p className="text-sm font-bold uppercase tracking-wide">Saving Throw Result · Current Turn</p><p className="text-base font-semibold">{campaign.combat.lastPlayerShoveSave}</p><p className="text-xs text-parchment/70">This result remains visible until you confirm End Turn.</p></div>}
          {campaign.combat.playerProne&&<div className="rounded-lg border border-amber-400 p-3 space-y-2"><p className="font-semibold">Nighthawk is Prone</p><p className="text-sm">Stand up costs 15 feet of movement, leaving {Math.max(0,(campaign.combat.movementAllowance??35)-(campaign.combat.movementUsed??0)-15)} feet. Normal grid movement is unavailable until you stand.</p><button type="button" disabled={saving||!!campaign.combat.playerGrappled||(campaign.combat.movementUsed??0)+15>(campaign.combat.movementAllowance??35)} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>void proneTrainingAction('stand')}>Stand Up (15 ft movement)</button></div>}
          {campaign.combat.playerGrappled&&<div className="rounded-lg border border-amber-400 p-3 space-y-2"><p className="font-semibold">Nighthawk is Grappled · Speed 0</p><p className="text-sm">You can attack, but cannot move or stand from Prone until the Grapple ends.</p>{!campaign.combat.pendingPlayerEscape&&<button type="button" disabled={saving||campaign.combat.actionUsed} className="w-full rounded border border-gold p-3 disabled:opacity-40" onClick={()=>void playerGrappleAction('escape')}>Use Action to Escape Grapple</button>}</div>}
          {campaign.combat.pendingPlayerEscape&&<div className="rounded-lg border border-gold p-3 space-y-2"><p className="font-semibold">Escape Grapple · DC 12</p><p>Choose Athletics or Acrobatics, then roll manually.</p><div className="grid grid-cols-2 gap-2"><button type="button" className="rounded border p-2" onClick={()=>setSelectedGrappleRoll('str')}>Athletics {selectedGrappleRoll==='str'?'✓':''}</button><button type="button" className="rounded border p-2" onClick={()=>setSelectedGrappleRoll('dex')}>Acrobatics {selectedGrappleRoll==='dex'?'✓':''}</button></div><button type="button" disabled={saving||!selectedGrappleRoll} className="w-full rounded bg-gold p-3 text-ink disabled:opacity-40" onClick={()=>void playerGrappleAction('check')}>Roll Escape Check</button></div>}
          {campaign.combat.lastPlayerGrappleResult&&<div role="status" className="rounded-lg border-2 border-gold p-3"><p className="font-semibold">Grapple Result · Current Turn</p><p>{campaign.combat.lastPlayerGrappleResult}</p></div>}
          {campaign.combat.enemySearchResult&&<p role="status" className="rounded-lg border border-gold p-3 text-sm">{campaign.combat.enemySearchResult}</p>}
          <div className="rounded-xl border border-white/20 p-2 space-y-2">
            {campaign.combat.owl&&(campaign.character?.level??1)>=3&&campaign.familiar?.status!=='dismissed'&&campaign.familiar?.status!=='destroyed'&&<div className={`space-y-2 rounded-lg border-2 p-2 transition-colors ${activeCombatToken==='nighthawk'?'border-gold':'border-sky-500'}`}><div className="flex gap-2"><button type="button" onClick={()=>{setActiveCombatToken('nighthawk');setGridDestination(null);setPendingCombatAction(null);}} className={`flex-1 rounded p-2 text-xs ${activeCombatToken==='nighthawk'?'bg-gold text-ink':'border border-white/30'}`}>Nighthawk</button><button type="button" onClick={()=>{setActiveCombatToken('owl');setGridDestination(null);setPendingCombatAction(null);}} className={`flex-1 rounded p-2 text-xs ${activeCombatToken==='owl'?'bg-sky-700 text-white':'border border-white/30'}`}>Owl · {campaign.combat.owl.hp} HP</button></div>{activeCombatToken==='owl'?<><p className="text-xs">Flyby · Target: {activeOwlTarget==='first'?'Dummy 1':'Dummy 2'} · {owlHelpInRange?'Within Help range':'Fly within 5 ft to use Help'}</p>{campaign.combat.owl.helpTarget&&<p className="text-xs text-emerald-300">Help active on {campaign.combat.owl.helpTarget==='first'?'Dummy 1':'Dummy 2'}</p>}</>:<p className="text-xs">Daggers: {campaign.combat.daggersAvailable??2} · Arrows: {campaign.combat.arrowsRemaining??20} · Target: {activeOwlTarget==='first'?'Dummy 1':'Dummy 2'}</p>}</div>}<div ref={combatMapRef} onTouchStart={startCombatTouch} onTouchMove={moveCombatTouch} onTouchEnd={endCombatTouch} onTouchCancel={endCombatTouch} onClickCapture={e=>{if(suppressCombatTap.current){e.stopPropagation();e.preventDefault();suppressCombatTap.current=false;}}} className="h-[340px] max-h-[55vh] overflow-hidden rounded-lg border border-white/20" style={{touchAction:'pan-y'}}><div className="grid gap-0 p-0" style={{gridTemplateColumns:`repeat(${trainingMapSize},minmax(0,1fr))`,width:`${trainingMapSize*21*combatZoom}px`,minWidth:'100%',backgroundImage:"url(/forest-ruins-test.svg)",backgroundSize:"100% 100%"}} role="grid" aria-label="Combat movement grid">
              {Array.from({length:trainingMapSize*trainingMapSize},(_,i)=>{
                const x=i%trainingMapSize,y=Math.floor(i/trainingMapSize),p=campaign.combat!.playerPosition??{x:2,y:4},e=campaign.combat!.enemyPosition??{x:6,y:4};
                const owl=campaign.combat!.owl,owlHere=!!owl&&x===owl.position.x&&y===owl.position.y;const own=x===p.x&&y===p.y,firstDown=x===e.x&&y===e.y&&campaign.combat!.enemyHp===0,secondDown=!!campaign.combat!.secondEnemy&&campaign.combat!.secondEnemy.hp===0&&x===campaign.combat!.secondEnemy.position.x&&y===campaign.combat!.secondEnemy.position.y,enemy=x===e.x&&y===e.y&&(campaign.combat!.enemyHp??12)>0,secondEnemy=!!campaign.combat!.secondEnemy&&campaign.combat!.secondEnemy.hp>0&&x===campaign.combat!.secondEnemy.position.x&&y===campaign.combat!.secondEnemy.position.y,cover=isTrainingPillar(x,y);
                const path=activeCombatToken==='owl'?null:tacticalRoute(campaign.combat!,{x,y});const cost=activeCombatToken==='owl'&&owl?5*Math.max(Math.abs(x-owl.position.x),Math.abs(y-owl.position.y)):path?trainingRouteCost(path):Infinity;
                const remaining=activeCombatToken==='owl'?60-(owl?.movementUsed??0):(campaign.combat!.movementAllowance??35)-(campaign.combat!.movementUsed??0);
                const reachable=cost>0&&cost<=remaining&&(activeCombatToken==='owl'||!campaign.combat!.playerGrappled)&&(activeCombatToken==='owl'||(!campaign.combat!.playerProne&&!cover&&!campaign.combat!.steadyAim&&(!campaign.combat!.attack||campaign.combat!.attack.phase==='resolved')))&&!enemy&&!secondEnemy&&!firstDown&&!secondDown&&!(own&&activeCombatToken==='nighthawk')&&!(owlHere&&activeCombatToken==='owl');
                const firstBloodied=enemy&&(campaign.combat!.enemyHp??12)<=(campaign.combat!.enemyMaxHp??12)/2;const secondBloodied=secondEnemy&&campaign.combat!.secondEnemy!.hp<=campaign.combat!.secondEnemy!.maxHp/2;const chosen=gridDestination?.x===x&&gridDestination?.y===y;const owlChosen=activeCombatToken==='owl'&&((enemy&&activeOwlTarget==='first')||(secondEnemy&&activeOwlTarget==='second'));const onRoute=false;
                return <button key={i} type="button" role="gridcell" aria-label={own&&owlHere?'Nighthawk and owl familiar':owlHere?'Owl familiar':own?`Nighthawk${campaign.combat!.playerProne?' (Prone)':''}${campaign.combat!.playerGrappled?' (Grappled)':''}`:secondEnemy?`Select Training Dummy 2${campaign.combat!.secondEnemy?.prone?' (Prone)':''}${campaign.combat!.secondEnemy?.grappled?' (Grappled)':''}`:enemy?`${campaign.combat!.enemyName}${campaign.combat!.enemyProne?' (Prone)':''}${campaign.combat!.enemyGrappled?' (Grappled)':''}`:`Square ${x+1}, ${y+1}; ${trainingTerrain(x,y)} terrain; ${cost} feet`} disabled={saving||!!campaign.combat!.playerOpportunity||(own&&activeCombatToken==='nighthawk')||(owlHere&&activeCombatToken==='owl')||(cover&&activeCombatToken!=='owl')||firstDown||secondDown||(!enemy&&!secondEnemy&&!reachable)} onClick={()=>{if(enemy)void chooseTrainingTarget('first');else if(secondEnemy)void chooseTrainingTarget('second');else if(!enemy&&!secondEnemy)setGridDestination({x,y});}} className={`aspect-square rounded border text-xs font-bold min-w-0 ${owlChosen?'bg-red-700 text-white border-sky-300 ring-2 ring-inset ring-sky-300':own&&owlHere?'bg-gradient-to-br from-amber-300 to-sky-700 text-ink border-sky-300':owlHere?'bg-sky-700 text-white border-sky-300':own?'bg-gold text-ink border-gold':firstDown||secondDown?'bg-stone-800 text-stone-400 border-stone-600 opacity-60':enemy?(campaign.combat!.selectedEnemy!=='second'?'bg-red-700 text-white border-red-500 ring-2 ring-inset ring-gold':'bg-red-700 text-white border-red-500'):secondEnemy?(campaign.combat!.selectedEnemy==='second'?'bg-red-700 text-white border-red-500 ring-2 ring-inset ring-gold':'bg-red-700 text-white border-red-500'):cover?'bg-stone-500/70 border-stone-300' :chosen?(activeCombatToken==='owl'?'bg-sky-300/80 border-white ring-2 ring-inset ring-white shadow-[0_0_0_2px_rgba(125,211,252,0.9)] text-sky-950':'bg-amber-200/85 border-white ring-2 ring-inset ring-white shadow-[0_0_0_2px_rgba(251,191,36,0.9)] text-stone-950'):onRoute?(activeCombatToken==='owl'?'bg-sky-400/45 border-sky-300':'bg-amber-300/45 border-amber-200'):reachable?(activeCombatToken==='owl'?'bg-sky-500/20 border-sky-400/80':'bg-amber-300/20 border-amber-300/80'):'bg-transparent border-white/15'}`}  >{chosen?null:own&&owlHere?<span className="flex items-center justify-center text-[9px] leading-none font-bold"><UserRound size={12}/><Bird size={12} className="text-sky-950"/></span>:owlHere?<Bird size={16} aria-label="Owl"/>:own?<span className="relative inline-flex items-center justify-center w-full h-full"><UserRound size={16} aria-label="Nighthawk"/>{campaign.combat!.playerProne&&<span aria-hidden="true" className="absolute -right-0.5 -top-1 rounded bg-amber-300 px-0.5 text-[9px] leading-3 font-extrabold text-black shadow">P</span>}{campaign.combat!.playerGrappled&&<span aria-hidden="true" className="absolute -left-0.5 -top-1 rounded bg-orange-300 px-0.5 text-[9px] leading-3 font-extrabold text-black shadow">G</span>}</span>:firstDown||secondDown?null:enemy?<span className="relative inline-flex items-center justify-center w-full h-full"><Swords size={16} aria-label="Enemy 1"/>{campaign.combat!.enemyProne&&<span aria-hidden="true" className="absolute -right-0.5 -top-1 rounded bg-amber-300 px-0.5 text-[9px] leading-3 font-extrabold text-black shadow">P</span>}{firstBloodied&&<Droplet aria-label="Bloodied" fill="currentColor" className="absolute -bottom-1 -right-1 h-3 w-3 text-red-300 drop-shadow-[0_0_1px_#000] [paint-order:stroke] [stroke:#000] [stroke-width:2px]"/>}{campaign.combat!.enemyGrappled&&<span aria-hidden="true" className="absolute -left-0.5 -top-1 rounded bg-orange-300 px-0.5 text-[9px] leading-3 font-extrabold text-black shadow">G</span>}</span>:secondEnemy?<span className="relative inline-flex h-full w-full items-center justify-center"><Swords size={16} aria-label="Enemy 2"/>{campaign.combat!.secondEnemy?.prone&&<span className="absolute -right-0.5 -top-1 rounded bg-amber-300 px-0.5 text-[9px] font-bold text-black">P</span>}{secondBloodied&&<Droplet aria-label="Bloodied" fill="currentColor" className="absolute -bottom-1 -right-1 h-3 w-3 text-red-300 drop-shadow-[0_0_1px_#000] [paint-order:stroke] [stroke:#000] [stroke-width:2px]"/>}{campaign.combat!.secondEnemy?.grappled&&<span className="absolute -left-0.5 -top-1 rounded bg-orange-300 px-0.5 text-[9px] font-bold text-black">G</span>}</span>:chosen?'✓':onRoute?'·':secondEnemy?<Swords size={16}/>:cover?<Blocks size={16} aria-label="Obstacle"/>:''}</button>;
              })}
            </div></div>
            {campaign.combat.playerOpportunity&&<div className="rounded-lg border border-gold p-3 space-y-2 text-sm">
              <p className="font-semibold">Enemy Opportunity Attack</p>
              <p>Nighthawk is leaving melee reach without Disengage. Movement pauses while the dummy uses its reaction.</p>
              {campaign.combat.playerOpportunity.d20!==undefined&&<p>Enemy attack: d20 {campaign.combat.playerOpportunity.d20} → {campaign.combat.playerOpportunity.total} vs AC 14 · {campaign.combat.playerOpportunity.hit?'Hit':'Miss'}</p>}
              {campaign.combat.playerOpportunity.damage!==undefined&&<p>Damage: {campaign.combat.playerOpportunity.damage}</p>}
              <button type="button" disabled={saving} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink" onClick={()=>void enemyOpportunityRoll(campaign.combat!.playerOpportunity!.phase==='roll-to-hit'?'hit':campaign.combat!.playerOpportunity!.phase==='roll-damage'?'damage':'finish')}>{campaign.combat.playerOpportunity.phase==='roll-to-hit'?'Roll enemy attack':campaign.combat.playerOpportunity.phase==='roll-damage'?'Roll enemy damage':'Finish reaction & move'}</button>
            </div>}
            {gridDestination&&(()=>{const cost=previewCost;const remaining=activeCombatToken==='owl'?60-(campaign.combat!.owl?.movementUsed??0):(campaign.combat!.movementAllowance??35)-(campaign.combat!.movementUsed??0);const provokes=previewAttacks.length>0;return <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2"><span>Move {cost} ft · {remaining-cost} ft left</span></div>
              {provokes&&<div role="alert" className="rounded-lg border border-amber-500 bg-amber-900/20 p-3 space-y-1"><p className="font-semibold text-amber-300">Warning: Opportunity Attack</p><p>This route leaves the reach of {previewAttacks.length} {previewAttacks.length===1?'enemy':'enemies'} without Disengaging. The {previewAttacks.length===1?'enemy can':'enemies can'} use a Reaction to attack as Nighthawk leaves reach. Cancel to choose another route or Disengage first.</p></div>}
              {!provokes&&campaign.combat!.disengaged&&<p className="text-xs text-emerald-300">Disengage protects this route from Opportunity Attacks.</p>}
              <div className="flex gap-2"><button type="button" className="flex-1 rounded border border-white/40 px-3 py-2" onClick={()=>setGridDestination(null)}>Cancel</button><button type="button" disabled={saving} className="flex-1 rounded bg-gold text-ink px-3 py-2 font-semibold" onClick={()=>void confirmGridMove()}>{provokes?'Move Anyway':'Confirm Move'}</button></div>
            </div>;})()}
            
          </div>
          {campaign.combat.attack&&<div className="space-y-3 rounded-lg border border-gold/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{campaign.combat.attack.weapon==='shortbow'?'Shortbow':campaign.combat.attack.thrown?'Thrown dagger':'Dagger'} → {campaign.combat.attack.target==='second'?'Training Dummy 2':'Training Dummy 1'}</p>
              {campaign.combat.attack.d20!==undefined&&<span className={`rounded px-2 py-1 text-xs font-bold ${campaign.combat.attack.critical?'bg-amber-300 text-ink':campaign.combat.attack.d20===1?'bg-red-500/25 text-red-200':campaign.combat.attack.hit?'bg-emerald-500/20 text-emerald-200':'bg-white/10 text-parchment'}`}>{campaign.combat.attack.critical?'NAT 20 · CRITICAL HIT':campaign.combat.attack.d20===1?'NAT 1 · MISS':campaign.combat.attack.hit?'HIT':'MISS'}</span>}
            </div>
            {campaign.combat.attack.d20!==undefined&&<div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-parchment/65">{campaign.combat.attack.advantage?'Advantage':campaign.combat.attack.disadvantage?'Disadvantage':'Attack roll'}</span>
                {(campaign.combat.attack.secondD20!==undefined&&(campaign.combat.attack.advantage||campaign.combat.attack.disadvantage)?[campaign.combat.attack.firstD20,campaign.combat.attack.secondD20]:[campaign.combat.attack.d20]).map((roll,i)=><span key={i} className={`inline-flex min-w-10 items-center justify-center rounded border px-2 py-1 font-semibold ${roll===campaign.combat?.attack?.d20?'border-gold bg-gold/20 text-gold':'border-white/15 text-parchment/55'} ${roll===20?'ring-1 ring-amber-300':roll===1?'ring-1 ring-red-400':''}`}>{roll}{roll===20?' ★':roll===1?' !':''}</span>)}
              </div>
              <p className="text-parchment/80">Attack: <strong>{campaign.combat.attack.d20}</strong> + {abilityModifier((campaign.character??prototypeNighthawk).scores.dex)+((campaign.character??prototypeNighthawk).proficiencyBonus)} = <strong>{campaign.combat.attack.total}</strong> · {campaign.combat.attack.hit?'Hit':'Miss'}</p>
              {campaign.combat.attack.phase==='roll-damage'&&campaign.combat.sneakAttackEligible&&<p className="text-xs text-emerald-300">Sneak Attack included in damage roll</p>}
            </div>}
            {campaign.combat.attack.damage!==undefined&&<div className="space-y-2 border-t border-white/15 pt-3">
              <p className="font-semibold">{campaign.combat.attack.critical?'Critical damage':'Damage'}: {campaign.combat.attack.damage}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs text-parchment/65">Weapon</span>
                {(campaign.combat.attack.weaponDamageRolls??[]).map((die,i)=><span key={i} className="inline-flex min-w-9 justify-center rounded border border-gold/60 bg-gold/10 px-2 py-1 font-semibold text-gold">{die}</span>)}
                {!!campaign.combat.attack.sneakAttackRolls?.length&&<span className="text-xs text-parchment/65">Sneak Attack</span>}
                {(campaign.combat.attack.sneakAttackRolls??[]).map((die,i)=><span key={i} className="inline-flex min-w-9 justify-center rounded border border-emerald-400/50 bg-emerald-400/10 px-2 py-1 font-semibold text-emerald-200">{die}</span>)}
              </div>
              <p className="text-sm text-parchment/80">{[...(campaign.combat.attack.weaponDamageRolls??[]),...(campaign.combat.attack.sneakAttackRolls??[])].join(' + ')} + {abilityModifier((campaign.character??prototypeNighthawk).scores.dex)} DEX = <strong>{campaign.combat.attack.damage}</strong></p>
            </div>}
            {campaign.combat.attack.phase==='roll-to-hit'&&<button type="button" disabled={saving} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink" onClick={()=>void rollCombatAttack('hit')}>Roll Attack</button>}
            {campaign.combat.attack.phase==='roll-damage'&&<button type="button" disabled={saving} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink" onClick={()=>void rollCombatAttack('damage')}>{campaign.combat.sneakAttackEligible?'Roll Damage + Sneak Attack':'Roll Damage'}</button>}
          </div>}
          {campaign.combatAdjudication&&<div className="rounded border border-gold/60 p-3 space-y-2 text-sm"><p>Pending DM adjudication: {campaign.combatAdjudication.kind==='skill'?'skill check':'Ready reaction'}</p><button type="button" disabled={saving||!accessCode} className="rounded border border-gold p-2 disabled:opacity-35" onClick={()=>void retryCombatAdjudication()}>Retry DM adjudication</button>{!accessCode&&<p>Enter the game access code to request DM narration.</p>}</div>}
          {campaign.combat.readiedAction&&<div className="rounded border border-gold/60 p-3 space-y-2 text-sm"><p>Readied: if {campaign.combat.readiedAction.trigger}, then {campaign.combat.readiedAction.response}</p><button type="button" disabled={saving||campaign.combat.order?.[campaign.combat.turnIndex??0]==='Nighthawk'||!!campaign.combat.reactionUsed} className="rounded border border-gold p-2 disabled:opacity-35" onClick={()=>void triggerReady()}>Confirm trigger · {campaign.combat.readiedAction.weapon?'Roll weapon attack':campaign.combat.readiedAction.spell?'Release spell':'Spend Reaction'}</button></div>}
          
          
          <div className="grid grid-cols-2 gap-2" aria-label="2024 D&D actions">
            {([
              ['attack','Attack',activeCombatToken==='owl'?false:!campaign.combat!.actionUsed&&!campaign.combat!.attack],
              ['dash','Dash',activeCombatToken==='owl'?!!campaign.combat!.owl&&!campaign.combat!.owl.actionUsed:(!campaign.combat!.actionUsed&&!campaign.combat!.attack)||!campaign.combat!.bonusActionUsed],
              ['disengage','Disengage',activeCombatToken==='owl'?!!campaign.combat!.owl&&!campaign.combat!.owl.actionUsed:(!campaign.combat!.actionUsed&&!campaign.combat!.attack)||!campaign.combat!.bonusActionUsed],
              ['dodge','Dodge',activeCombatToken==='owl'?!!campaign.combat!.owl&&!campaign.combat!.owl.actionUsed:!campaign.combat!.actionUsed&&!campaign.combat!.attack],
              ['help','Help',activeCombatToken==='owl'&&!!campaign.combat!.owl&&!campaign.combat!.owl.actionUsed&&owlHelpInRange],['hide','Hide',activeCombatToken==='owl'?false:combatHideStatus(campaign.combat!).available],
              ['influence','Influence',activeCombatToken==='nighthawk'&&!campaign.combat!.actionUsed&&!campaign.combat!.attack],['magic','Magic',activeCombatToken==='nighthawk'&&!campaign.combat!.actionUsed&&!campaign.combat!.attack&&availableCombatSpells(campaign).length>0],['ready','Ready',activeCombatToken==='nighthawk'&&!campaign.combat!.actionUsed&&!campaign.combat!.attack],
              ['search','Search',activeCombatToken==='nighthawk'&&!campaign.combat!.actionUsed&&!campaign.combat!.attack],['study','Study',activeCombatToken==='nighthawk'&&!campaign.combat!.actionUsed&&!campaign.combat!.attack],['utilize','Utilize',activeCombatToken==='nighthawk'&&!campaign.combat!.actionUsed&&!campaign.combat!.attack&&((campaign.equipment?.caltrops??0)>0||(campaign.equipment?.ballBearings??0)>0)]
            ] as const).map(([action,label,available])=><div className="contents" key={action}><button type="button" title={action==='utilize'&&!available?((campaign.equipment?.caltrops??0)+(campaign.equipment?.ballBearings??0)===0?'No caltrops or ball bearings in inventory.':'Utilize requires Nighthawk\'s available Action.'):undefined} disabled={saving||(!available&&action!=='hide')} className={`rounded-lg border p-2.5 text-sm min-h-11 ${!available?'opacity-35':''} disabled:opacity-35 ${pendingCombatAction===action?'border-gold bg-gold/20 font-semibold':'border-white/30'}`} onClick={()=>{if(action==='hide'&&activeCombatToken==='nighthawk'){setPendingCombatAction(pendingCombatAction==='hide'?null:'hide');return;}if(!available)return;if(activeCombatToken==='owl'){if(action==='dash'||action==='disengage'||action==='dodge'||action==='help')void owlAction(action);return;}if(action==='attack'){setAttackChoice('weapon');setSelectedWeapon(null);}if(action!=='help')setPendingCombatAction(action);}}>{label}{false?<span className="block text-[10px]">Coming later</span>:null}</button>{activeCombatToken==='nighthawk'&&action==='magic'&&campaign.combat!.laughterTarget&&<div className="col-span-2 rounded-lg border border-gold/50 p-3 space-y-2 text-sm"><p className="font-semibold">Tasha’s Hideous Laughter · target incapacitated</p><button type="button" disabled={saving} className="rounded-lg border border-gold p-2.5 disabled:opacity-35" onClick={()=>void repeatLaughterSave()}>Roll repeat Wisdom save</button></div>}
{activeCombatToken==='nighthawk'&&action==='magic'&&campaign.combat!.pendingSpellSave&&<div className="col-span-2 rounded-lg border border-gold/50 p-3 space-y-2 text-sm"><p className="font-semibold">Pending saving throw: {campaign.combat!.pendingSpellSave.spell}</p><p className="text-xs">Training dummy rolls against Nighthawk's spell save DC. Resolve before continuing combat.</p><button type="button" disabled={saving} className="rounded-lg border border-gold p-2.5 disabled:opacity-35" onClick={()=>void resolveEncounterSpellSave()}>Roll enemy saving throw</button></div>}
{activeCombatToken==='nighthawk'&&action==='magic'&&pendingCombatAction==='magic'&&<div className="col-span-2 rounded-lg border border-gold bg-gold/10 p-3 space-y-2 text-sm" role="region" aria-label="Choose Magic Action spell">
 <p className="font-semibold">Magic Action · Choose a spell</p>
 <p className="text-xs text-parchment/70">Uses your Action. Spell effects are recorded for DM adjudication; attacks and saves are not automatically resolved yet.</p>
 <p className="text-xs text-gold">Level 1 slots: {Math.max(0,(campaign.character?.spellSlots?.level1??0)-(campaign.character?.spellSlots?.usedLevel1??0))} remaining</p>
 {availableCombatSpells(campaign).includes('True Strike')&&<div className="flex gap-2 text-xs"><span>True Strike weapon:</span>{(['shortbow','dagger'] as const).map(w=><button type="button" key={w} className={`rounded border px-2 py-1 ${(selectedWeapon??'shortbow')===w?'border-gold':'border-white/30'}`} onClick={()=>setSelectedWeapon(w)}>{w==='shortbow'?'Shortbow':'Dagger'}</button>)}</div>}
 <p className="text-xs text-parchment/70">True Strike creates a weapon attack. Roll to hit and damage using the normal attack controls.</p>
 <div className="grid grid-cols-1 gap-2">{availableCombatSpells(campaign).map(spell=>{const cantrip=campaign.character?.cantrips?.includes(spell)??false;const noSlots=!cantrip&&(campaign.character?.spellSlots?.usedLevel1??0)>=(campaign.character?.spellSlots?.level1??0);return <button type="button" key={spell} disabled={saving||noSlots} className="rounded-lg border border-white/30 p-2.5 text-left disabled:opacity-35" onClick={()=>void castEncounterSpell(spell)}><span className="font-semibold">{spell}</span><span className="block text-xs text-parchment/65">{cantrip?'Cantrip · no slot':'Level 1 · spends one slot'} · {spellSummaries[spell]??'Effect awaits DM adjudication'}</span></button>;})}</div>
 <button type="button" className="text-xs underline" onClick={()=>setPendingCombatAction(null)}>Cancel</button>
 </div>}
 {activeCombatToken==='nighthawk'&&action==='hide'&&pendingCombatAction==='hide'&&<div className="col-span-2 rounded-lg border border-white/20 px-3 py-2 text-xs space-y-1"><p className="font-semibold">Pillar cover / enemy sight</p>{sightEnemies.map(e=><p key={e.name} className={e.blocked?'text-emerald-300':'text-amber-300'}>{e.name}: {e.blocked?'Sight blocked by pillar':'Can see Nighthawk'}</p>)}<p className={visibleEnemies.length?'text-amber-300':'text-emerald-300'}>{hideStatus?.reason}</p></div>}{activeCombatToken==='nighthawk'&&pendingCombatAction===action&&<div className="col-span-2">          {(['search','study','influence'] as const).includes(pendingCombatAction as 'search'|'study'|'influence')&&<div className="rounded-lg border border-gold bg-gold/10 p-3 space-y-2" role="region" aria-label="Choose skill action">
            <p className="font-semibold">{pendingCombatAction==='search'?'Search':pendingCombatAction==='study'?'Study':'Influence'} · Choose skill</p>
            <p className="text-xs text-parchment/70">Uses your Action. Roll is recorded; DM adjudicates information or NPC response.</p>
            <div className="grid grid-cols-2 gap-2">{(pendingCombatAction==='search'?['Perception','Investigation','Survival']:pendingCombatAction==='study'?['Arcana','History','Investigation','Nature','Religion']:['Deception','Intimidation','Performance','Persuasion']).map(skill=><button key={skill} type="button" disabled={saving} className="rounded border border-gold p-2" onClick={()=>void skillCombatAction(pendingCombatAction==='search'?'Search':pendingCombatAction==='study'?'Study':'Influence',skill as Parameters<typeof takeCombatSkillAction>[2])}>{skill}</button>)}</div>
            <button type="button" className="text-xs underline" onClick={()=>setPendingCombatAction(null)}>Cancel</button>
          </div>}
          {pendingCombatAction==='ready'&&<div className="rounded-lg border border-gold bg-gold/10 p-3 space-y-2" role="region" aria-label="Declare Ready action">
            <p className="font-semibold">Ready · Declare trigger and response</p>
            <p className="text-xs text-parchment/70">Spends your Action. You can spend your Reaction when the trigger occurs before your next turn. Weapon attacks resolve hit and damage automatically. Custom responses require DM adjudication. Mind Sliver can be held with concentration and released on the trigger. Other spells are not yet mechanically available.</p>
            <input className="w-full rounded border border-white/30 bg-transparent p-2" maxLength={240} placeholder="Trigger: when the dummy approaches..." value={readyTrigger} onChange={e=>setReadyTrigger(e.target.value)}/>
            <label className="block text-xs">Readied response</label>
            <select className="w-full rounded border border-white/30 bg-ink p-2" value={readyWeapon} onChange={e=>setReadyWeapon(e.target.value as typeof readyWeapon)}><option value="narrative">Custom non-spell response (DM adjudication)</option><option value="dagger">Dagger melee attack</option><option value="throw-dagger">Thrown dagger attack</option><option value="shortbow">Shortbow attack</option>{availableCombatSpells(campaign).includes("Mind Sliver")&&<option value="mind-sliver">Mind Sliver (cast now, hold concentration)</option>}</select>
            {readyWeapon==='narrative'&&<input className="w-full rounded border border-white/30 bg-transparent p-2" maxLength={240} placeholder="Response: I throw my dagger..." value={readyResponse} onChange={e=>setReadyResponse(e.target.value)}/>}
            <button type="button" disabled={saving||!readyTrigger.trim()||(readyWeapon==='narrative'&&!readyResponse.trim())} className="w-full rounded border border-gold p-2 disabled:opacity-35" onClick={()=>void declareReady()}>Ready Action</button>
            <button type="button" className="text-xs underline" onClick={()=>setPendingCombatAction(null)}>Cancel</button>
          </div>}
          {pendingCombatAction==='utilize'&&<div className="rounded-lg border border-gold bg-gold/10 p-3 space-y-2" role="region" aria-label="Choose Utilize item">
            <p className="font-semibold">Utilize · Choose equipment</p>
            <p className="text-xs text-parchment/70">Uses your Action and consumes one item. Terrain placement awaits DM adjudication.</p>
            {(['caltrops','ballBearings'] as const).map(item=><button key={item} type="button" disabled={saving||(campaign.equipment?.[item]??0)<=0} className="block w-full rounded border border-gold p-2.5 disabled:opacity-35" onClick={()=>void useCombatItem(item)}>{item==='caltrops'?'Caltrops':'Ball Bearings'} · {campaign.equipment?.[item]??0} available</button>)}
            <button type="button" className="text-xs underline" onClick={()=>setPendingCombatAction(null)}>Cancel</button>
          </div>}
          {(pendingCombatAction==='dash'||pendingCombatAction==='disengage')&&<div className="rounded-lg border border-gold bg-gold/10 p-3 space-y-2" role="region" aria-label="Choose action economy">
            <p className="font-semibold">{pendingCombatAction==='dash'?'Dash':'Disengage'} · Choose action type</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={saving||campaign.combat!.actionUsed||!!campaign.combat!.attack} className="rounded-lg border border-gold p-2.5 disabled:opacity-40" onClick={()=>void combatAction(pendingCombatAction)}>Use Action</button>
              <button type="button" disabled={saving||campaign.combat!.bonusActionUsed} className="rounded-lg border border-gold p-2.5 disabled:opacity-40" onClick={()=>void combatAction(pendingCombatAction==='dash'?'cunning-dash':'cunning-disengage')}>Use Bonus Action</button>
            </div>
            <button type="button" className="text-xs underline" onClick={()=>setPendingCombatAction(null)}>Cancel</button>
          </div>}
          {pendingCombatAction && pendingCombatAction!=='dash' && pendingCombatAction!=='disengage' && pendingCombatAction!=='magic' && pendingCombatAction!=='utilize' && !(['search','study','influence','ready'] as string[]).includes(pendingCombatAction) && <div className="rounded-lg border border-gold bg-gold/10 p-3 text-sm space-y-2" role="region" aria-label="Confirm combat action">
            <p className="font-semibold">{({hide:'Hide · '+(campaign.combat!.bonusActionUsed?'Action':'Bonus Action'),attack:'Choose weapon','steady-aim':'Steady Aim','cunning-dash':'Cunning Dash (Bonus)',dash:'Dash (Action)','cunning-disengage':'Cunning Disengage',disengage:'Disengage (Action)',dodge:'Dodge',end:'End Turn',search:'Search',study:'Study',influence:'Influence',ready:'Ready',utilize:'Utilize'} as const)[pendingCombatAction]}</p>
            {pendingCombatAction==='attack'&&<div className="grid grid-cols-3 gap-2">{(['weapon','shove','grapple'] as const).map(choice=><button key={choice} type="button" className={`rounded border p-2 text-xs ${attackChoice===choice?'border-gold bg-gold/20':'border-white/30'}`} onClick={()=>setAttackChoice(choice)}>{choice==='weapon'?'Weapon':choice==='shove'?'Shove':'Grapple'}</button>)}</div>}
            {pendingCombatAction==='attack'&&attackChoice!=='weapon'?(()=>{const c=campaign.combat!,p=c.playerPosition??{x:2,y:4},e=c.selectedEnemy==='second'&&c.secondEnemy?c.secondEnemy.position:c.enemyPosition??{x:6,y:4},adjacent=Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y))<=1;return <div className="space-y-2"><p className="text-xs text-parchment/70">Unarmed Strike · Target must be within 5 feet.</p>{attackChoice==='shove'?<div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving||!adjacent} className="rounded border border-gold p-2 disabled:opacity-35" onClick={()=>{void performShove('prone');setPendingCombatAction(null);}}>Knock Prone</button><button type="button" disabled={saving||!adjacent} className="rounded border border-gold p-2 disabled:opacity-35" onClick={()=>{void performShove('push');setPendingCombatAction(null);}}>Push 5 ft</button></div>:<button type="button" disabled={saving||!adjacent||(c.selectedEnemy==='second'?!!c.secondEnemy?.grappled:!!c.enemyGrappled)} className="w-full rounded border border-gold p-2 disabled:opacity-35" onClick={()=>{void grappleTest('grapple');setPendingCombatAction(null);}}>Attempt Grapple</button>}</div>;})():pendingCombatAction==='hide'?<p>Roll Stealth against DC 15. Uses your Bonus Action when available, otherwise your Action. Cover and blocked line of sight are required.</p>:pendingCombatAction==='attack'&&attackChoice==='weapon' ? <div className="space-y-2">
              <p className="text-parchment/80">Choose a weapon before confirming your attack.</p>
              {(()=>{const combat=campaign.combat!;const p=combat.playerPosition??{x:2,y:4},e=combat.selectedEnemy==='second'&&combat.secondEnemy?combat.secondEnemy.position:combat.enemyPosition??{x:6,y:4};const distance=5*Math.max(Math.abs(p.x-e.x),Math.abs(p.y-e.y));const daggerInMelee=distance<=5;
              const rollCondition=(weapon:'dagger'|'throw-dagger'|'shortbow')=>combatAttackRollPreview(combat,weapon);
              const choices=[
                {id:daggerInMelee?'dagger' as const:'throw-dagger' as const,label:daggerInMelee?'Dagger (Melee)':'Dagger (Throw)',detail:daggerInMelee?'1d4 piercing · 5 ft':'1d4 piercing · 20/60 ft',roll:rollCondition(daggerInMelee?'dagger':'throw-dagger'),eligible:distance<=60&&(combat.daggersAvailable??2)>0},
                {id:'shortbow' as const,label:'Shortbow',detail:'1d6 piercing · 80/320 ft · 1 arrow',roll:rollCondition('shortbow'),eligible:distance<=320&&(combat.arrowsRemaining??20)>0}
              ];return <><p className="text-xs text-parchment/70">Target: {distance} ft away. Only eligible attacks are available.</p><div className="grid grid-cols-2 gap-2">{choices.filter(c=>c.eligible).map(c=><button key={c.id} type="button" className={`rounded-lg border p-3 text-left ${selectedWeapon===c.id?'border-gold bg-gold/20':'border-white/30'}`} onClick={()=>setSelectedWeapon(c.id)}><strong>{c.label}</strong><span className="block text-xs">{c.detail}</span><span className={`mt-1 block text-xs font-semibold ${c.roll==='Advantage'?'text-emerald-300':c.roll==='Disadvantage'?'text-rose-300':'text-parchment/80'}`}>{c.roll}</span></button>)}</div>{!choices.some(c=>c.eligible)&&<p>No weapon is in range.</p>}</>;})()}

            </div> : pendingCombatAction==='attack'?null:<p className="text-parchment/80">{({'steady-aim':'Bonus action · Advantage on your next attack this turn. Your speed becomes 0 until the turn ends.','cunning-dash':'Bonus Action · Gain additional movement equal to your speed.',dash:'Action · Gain additional movement equal to your speed.','cunning-disengage':'Cunning Action · Avoid opportunity attacks this turn.',disengage:'Action · Avoid opportunity attacks this turn.',dodge:'Action · Attacks against you have disadvantage.',end:'End your turn and advance initiative. Any unused action, bonus action, movement, or unfinished attack is forfeited.',search:'Search for clues.',study:'Study a creature or object.',influence:'Attempt to influence a creature.',ready:'Declare a trigger and response.',utilize:'Use equipment.'} as const)[pendingCombatAction]}</p>}
            <div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} className="rounded-lg border border-white/40 p-2.5" onClick={()=>setPendingCombatAction(null)}>Cancel</button><button type="button" disabled={saving||(pendingCombatAction==='attack'&&(attackChoice!=='weapon'||!selectedWeapon))||(pendingCombatAction==='hide'&&(!canNighthawkHide(campaign.combat!)||(campaign.combat!.bonusActionUsed&&(campaign.combat!.actionUsed||!!campaign.combat!.attack))))} className={`rounded-lg bg-gold p-2.5 font-semibold text-ink disabled:opacity-40 ${pendingCombatAction==='attack'&&attackChoice!=='weapon'?'hidden':''}`} onClick={()=>{if(pendingCombatAction==='hide'){if(!canNighthawkHide(campaign.combat!)){setNotice('Move out of every living enemy’s sight before hiding.');return;}if(campaign.combat!.bonusActionUsed&&(campaign.combat!.actionUsed||!!campaign.combat!.attack)){setNotice('Hide requires an available Action or Bonus Action.');return;}void stealthTest('hide',campaign.combat!.bonusActionUsed?'action':'bonus');setPendingCombatAction(null);}else if(pendingCombatAction==='attack'&&selectedWeapon)void confirmWeaponAttack(selectedWeapon);else void combatAction(pendingCombatAction as Parameters<typeof combatAction>[0]);}}>Confirm</button></div>
          </div>}
</div>}</div>)}
          </div>
          {activeCombatToken==='nighthawk'&&<div className="flex items-center gap-2 text-xs text-parchment/70"><span>Bonus actions:</span><button type="button" disabled={saving||!!campaign.combat!.bonusActionUsed||!!campaign.combat.movementUsed} onClick={()=>setPendingCombatAction('steady-aim')} className="rounded border border-white/30 px-3 py-2 disabled:opacity-35">Steady Aim</button></div>}{activeCombatToken==='nighthawk'&&pendingCombatAction==='steady-aim'&&<div className="rounded-lg border border-gold bg-gold/10 p-3 space-y-2"><p>Steady Aim · Bonus Action</p><p className="text-sm">Gain Advantage on your next attack this turn. Your Speed becomes 0 until the turn ends.</p><div className="flex gap-2"><button type="button" className="rounded border p-2" onClick={()=>setPendingCombatAction(null)}>Cancel</button><button type="button" disabled={saving} className="rounded bg-gold p-2 text-ink" onClick={()=>void combatAction('steady-aim')}>Confirm</button></div></div>}
          {campaign.combat.lastShoveSave&&<div role="status" aria-live="polite" className={`rounded-lg border-2 p-4 space-y-1 ${campaign.combat.lastShoveSave.passed?'border-emerald-400 bg-emerald-950/50':'border-amber-400 bg-amber-950/40'}`}>
            <p className="text-xs uppercase tracking-widest font-bold">Shove · Saving Throw</p>
            <p className="text-xl font-extrabold">{campaign.combat.lastShoveSave.passed?'SAVE PASSED':'SAVE FAILED'}</p>
            <p className="text-sm">Strength or Dexterity save vs DC {campaign.combat.lastShoveSave.dc}</p>
            <p className="text-sm">{campaign.combat.lastShoveSave.passed?'The enemy resisted the Shove.':campaign.combat.lastShoveSave.effectApplied?(campaign.combat.lastShoveSave.outcome==='prone'?'Enemy knocked Prone.':'Enemy pushed 5 feet.'):'Shove succeeded, but the enemy cannot be pushed outside the map.'}</p>
          </div>}
          {campaign.combat.enemyGrappled&&<p role="status" className="rounded-lg border border-amber-400 p-3 text-sm font-semibold">Enemy Grappled · Speed 0 · Cannot move until it escapes.</p>}
          {campaign.combat.lastGrappleResult&&<p role="status" className="rounded-lg border border-gold p-3 text-sm">{campaign.combat.lastGrappleResult}</p>}
          <p className="text-xs text-parchment/70">{activeCombatToken==='owl'?'Owl actions use the same menu. Choose an enemy on the map, then Help. Flyby applies automatically.':'Select an action to see details.'}  {activeCombatToken==='nighthawk'?'Nothing is spent until Confirm. Already confirmed actions cannot be undone.':''}</p><div className="mt-7 border-t border-white/20 pt-5 space-y-2"><button type="button" disabled={saving} className={`w-full rounded-lg border p-3 min-h-12 font-semibold ${pendingCombatAction==='end'?'border-amber-400 bg-amber-500/20 text-amber-100':'border-gold/70 text-gold'} disabled:opacity-40`} onClick={()=>{if(pendingCombatAction==='end'){void combatAction('end');}else{setPendingCombatAction('end');setSelectedWeapon(null);}}}>{pendingCombatAction==='end'?'Confirm End Turn — Tap Again':'End Turn'}</button>{pendingCombatAction==='end'&&<><p className="text-sm text-amber-100">Tap End Turn again to advance initiative. Unused movement and actions will be forfeited.</p><button type="button" className="w-full rounded-lg border border-white/30 p-2 text-sm" onClick={()=>setPendingCombatAction(null)}>Cancel</button></>}</div>
          <div className="mt-4 border-t border-white/15 pt-4 space-y-2" aria-label="Optional Dungeon Master question">
            <button type="button" aria-expanded={askDMOpen} className="w-full rounded-lg border border-white/25 p-3 text-sm text-parchment/80" onClick={()=>setAskDMOpen(open=>!open)}>Ask DM {askDMOpen?'−':'+'}</button>
            {askDMOpen&&<form className="space-y-2" onSubmit={event=>{event.preventDefault();if(askDMDraft.trim()&&campaign){void sendToDM(campaign,askDMDraft);setAskDMDraft('');}}}>
              <label htmlFor="combat-dm-question" className="block text-xs text-parchment/70">Optional question or improvised action. The DM determines any action cost.</label>
              <textarea id="combat-dm-question" rows={2} value={askDMDraft} onChange={event=>setAskDMDraft(event.target.value)} className="w-full rounded-lg border border-white/30 bg-ink p-3 text-base" placeholder="What would Nighthawk like to try?"/>
              <button type="submit" disabled={!askDMDraft.trim()||saving||!accessCode} className="rounded-lg border border-gold px-4 py-2 text-sm text-gold disabled:opacity-40">Send to DM</button>
              {!accessCode&&<p className="text-xs text-amber-200">Configure your DM access code in Settings first.</p>}
              {campaign.journal.filter(entry=>entry.kind==='dm').at(-1)&&<details className="text-xs text-parchment/70"><summary>Latest DM response</summary><p className="mt-2 whitespace-pre-wrap">{campaign.journal.filter(entry=>entry.kind==='dm').at(-1)?.text}</p></details>}
            </form>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>window.location.reload()} aria-label="Refresh Four Keeps" className="flex items-center justify-center gap-2 rounded-lg border border-white/25 p-3 text-sm text-parchment/80"><RefreshCw size={16}/>Refresh</button>
            {campaign.combat.enemyName==='Training Dummy'&&<button type="button" disabled={saving} className="rounded-lg border border-white/25 p-3 text-sm text-parchment/80" onClick={()=>setConfirmTrainingReset(true)}>Reset encounter</button>}
          </div>
          {campaign.combat.enemyName==='Training Dummy'&&confirmTrainingReset&&<div className="rounded-lg border border-gold/50 p-3 space-y-2"><p className="text-sm">End this encounter? Nighthawk will return to full HP, the dummy will reset, and the current combat will be discarded.</p><div className="grid grid-cols-2 gap-2"><button type="button" className="rounded-lg border border-white/40 p-2" onClick={()=>setConfirmTrainingReset(false)}>Keep fighting</button><button type="button" disabled={saving} className="rounded-lg bg-gold p-2 font-semibold text-ink" onClick={()=>void resetTrainingEncounter()}>Quit & reset</button></div></div>}
        </div> : <div className="space-y-3">
          {campaign.combat.enemyName==='Training Dummy'&&<div className="space-y-2"><p className="text-xs text-parchment/70">Tactical grid · Enemy turn · N = Nighthawk, red 1 and 2 = training dummies, # = pillar</p><div className="grid gap-0.5" style={{gridTemplateColumns:`repeat(${trainingMapSize},minmax(0,1fr))`}} aria-label="Training encounter map">{Array.from({length:trainingMapSize*trainingMapSize},(_,i)=>{const x=i%trainingMapSize,y=Math.floor(i/trainingMapSize),p=campaign.combat!.playerPosition??{x:2,y:4},e=campaign.combat!.enemyPosition??{x:6,y:4},second=campaign.combat!.secondEnemy;const own=x===p.x&&y===p.y,firstDown=x===e.x&&y===e.y&&campaign.combat!.enemyHp===0,secondDown=!!second&&second.hp===0&&x===second.position.x&&y===second.position.y,first=x===e.x&&y===e.y&&(campaign.combat!.enemyHp??12)>0,other=!!second&&second.hp>0&&x===second.position.x&&y===second.position.y,pillar=isTrainingPillar(x,y);return <div key={i} className={`aspect-square rounded border flex items-center justify-center text-xs font-bold ${own?'bg-gold text-ink border-gold':firstDown||secondDown?'bg-stone-800 text-stone-400 border-stone-600 opacity-60':first?'bg-red-700 text-white border-red-500':other?'bg-red-800 text-white border-red-300':pillar?'bg-stone-500/70 border-stone-300':'bg-white/5 border-white/15'}`}>{own?<UserRound size={16} aria-label="Nighthawk"/>:firstDown||secondDown?<span className="line-through">{firstDown?'1':'2'}</span>:first?<span className="relative"><Swords size={16} aria-label="Enemy 1"/>{(campaign.combat!.enemyHp??12)<=(campaign.combat!.enemyMaxHp??12)/2&&<Droplet aria-label="Bloodied" fill="currentColor" className="absolute -bottom-2 -right-2 h-3 w-3 text-red-300"/>}{campaign.combat!.enemyProne&&<span className="absolute -top-2 -right-2 text-[9px] text-amber-200">P</span>}</span>:other?<span className="relative"><Swords size={16} aria-label="Enemy 2"/>{second!.hp<=second!.maxHp/2&&<Droplet aria-label="Bloodied" fill="currentColor" className="absolute -bottom-2 -right-2 h-3 w-3 text-red-300"/>}{second!.prone&&<span className="absolute -top-2 -right-2 text-[9px] text-amber-200">P</span>}</span>:pillar?<Blocks size={16} aria-label="Obstacle"/>:''}</div>})}</div></div>}
          {campaign.combat.enemyName==='Training Dummy'&&<div className="rounded-lg border border-gold/40 p-3 space-y-2">
            {campaign.combat.playerHidden&&<div className="rounded-lg border border-emerald-400 p-3 space-y-2"><p className="font-semibold">Nighthawk is Hidden</p><p className="text-sm">The dummy can spend its action to Search against Nighthawk's Stealth result.</p><button type="button" disabled={saving} className="w-full rounded border border-gold p-3" onClick={()=>void stealthTest('search')}>Dummy Search · Roll Perception</button></div>}<p className="hidden">Moving dummy · Reaction test</p>{campaign.combat.enemyGrappled&&<div className="rounded-lg border border-amber-400 p-3 space-y-2"><p className="font-semibold">Dummy is Grappled (Speed 0)</p><p className="text-sm">Use its action to attempt escape: Strength (Athletics) or Dexterity (Acrobatics) against Nighthawk's Grapple DC.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} className="rounded border border-gold p-2" onClick={()=>void grappleTest('str')}>Escape: Athletics</button><button type="button" disabled={saving} className="rounded border border-gold p-2" onClick={()=>void grappleTest('dex')}>Escape: Acrobatics</button></div></div>}
            {campaign.combat.opportunity?<>{campaign.combat.reactionAttack?<div className="space-y-3 rounded-lg border border-gold/50 p-3">
              <p className="font-semibold">Opportunity attack · Dagger</p>
              <p className="text-sm">Your reaction is spent. The dummy stays within reach until this attack resolves.</p>
              {campaign.combat.reactionAttack.d20!==undefined&&<p className="text-sm">Attack roll: d20 {campaign.combat.reactionAttack.d20} → total {campaign.combat.reactionAttack.total} vs AC 12 · {campaign.combat.reactionAttack.hit?'Hit':'Miss'}</p>}
              {campaign.combat.reactionAttack.damage!==undefined&&<p className="text-sm">Damage: {campaign.combat.reactionAttack.damage} · {campaign.combat.enemyHp===0?'Dummy defeated':(campaign.combat.enemyHp??12)<=(campaign.combat.enemyMaxHp??12)/2?'Dummy Bloodied':'Dummy standing'}</p>}
              {campaign.combat.reactionAttack.phase==='roll-to-hit'?<button type="button" disabled={saving} className="w-full rounded-lg bg-gold text-ink p-3 font-semibold" onClick={()=>void trainingReaction('hit')}>Roll to Hit (d20 + DEX + proficiency)</button>:campaign.combat.reactionAttack.phase==='roll-damage'?<button type="button" disabled={saving} className="w-full rounded-lg bg-gold text-ink p-3 font-semibold" onClick={()=>void trainingReaction('damage')}>Roll Damage (1d4 + DEX)</button>:<button type="button" disabled={saving} className="w-full rounded-lg bg-gold text-ink p-3 font-semibold" onClick={()=>void trainingReaction('finish')}>Finish reaction</button>}
            </div>:<><p className="text-sm">The dummy is leaving your 5-foot reach. You may spend your reaction to make a melee dagger attack before it leaves, or let it go. This attack does not consume your Action.</p>
              <div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving||(campaign.combat.daggersAvailable??2)<1} className="rounded-lg bg-gold text-ink p-3 font-semibold disabled:opacity-40" onClick={()=>void trainingReaction('attack')}>React: Dagger</button><button type="button" disabled={saving} className="rounded-lg border border-white/30 p-3" onClick={()=>void trainingReaction('decline')}>Let it move</button></div></>}
            </>:<><p className="hidden text-sm">Move the dummy one square along its patrol. It can move in any direction, including diagonally. If it leaves your reach, combat pauses for an opportunity attack.</p><button type="button" disabled={saving} className="hidden" onClick={()=>void trainingReaction('move')}>Move training dummy</button></>}
          </div>}
          {campaign.combat.enemyProne&&<div role="status" className="rounded-lg border border-amber-400 p-3"><p className="font-semibold">Enemy is Prone</p><p className="text-sm">Standing costs 15 feet of its 30-foot Speed, leaving 15 feet. It does not consume an action or bonus action. Resolving this turn will stand the enemy up before its attack.</p></div>}{campaign.combat.pendingEnemyShove?<div className="rounded-lg border border-gold p-3 space-y-2"><p className="font-semibold">Enemy Shove · Nighthawk saving throw (DC 12)</p><p className="text-sm">Choose which saving throw to make, then tap Roll d20. No roll occurs until you press Roll.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} className={`rounded border p-3 ${selectedShoveSave==='str'?'border-gold bg-gold/20':'border-white/40'}`} onClick={()=>setSelectedShoveSave('str')}>Strength Save</button><button type="button" disabled={saving} className={`rounded border p-3 ${selectedShoveSave==='dex'?'border-gold bg-gold/20':'border-white/40'}`} onClick={()=>setSelectedShoveSave('dex')}>Dexterity Save</button></div><button type="button" disabled={saving||!selectedShoveSave} className="w-full rounded bg-gold p-3 font-semibold text-ink disabled:opacity-40" onClick={()=>{if(selectedShoveSave)void proneTrainingAction(selectedShoveSave);}}>Roll d20 Saving Throw</button></div>:<button type="button" disabled={saving||!!campaign.combat.opportunity} className="hidden" onClick={()=>void proneTrainingAction('begin')}>Enemy Shove Nighthawk Prone (test)</button>}
          {campaign.combat.pendingEnemyGrapple?<div className="rounded-lg border border-gold p-3 space-y-2"><p className="font-semibold">Enemy Grapple · Saving Throw DC 12</p><p>Choose Strength or Dexterity, then press Roll. Dexterity includes Rogue saving throw proficiency.</p><div className="grid grid-cols-2 gap-2"><button type="button" className="rounded border p-2" onClick={()=>setSelectedGrappleRoll('str')}>Strength {selectedGrappleRoll==='str'?'✓':''}</button><button type="button" className="rounded border p-2" onClick={()=>setSelectedGrappleRoll('dex')}>Dexterity {selectedGrappleRoll==='dex'?'✓':''}</button></div><button type="button" disabled={saving||!selectedGrappleRoll} className="w-full rounded bg-gold p-3 text-ink disabled:opacity-40" onClick={()=>void playerGrappleAction('save')}>Roll Grapple Save</button></div>:<button type="button" disabled={saving||!!campaign.combat.pendingEnemyShove} className="hidden" onClick={()=>void playerGrappleAction('begin')}>Enemy Grapple Nighthawk (test)</button>}
          <p className="hidden text-sm">{campaign.combat.enemyName} makes a nonlethal training strike. Temporary stats: +4 to hit, 1d6 + 2 damage, against AC 14. Dodge imposes disadvantage.</p><button type="button" disabled={saving||!!campaign.combat.opportunity} className="hidden" onClick={()=>void resolveEnemyTurn()}>{campaign.combat.enemyProne?"Stand up and resolve enemy turn":"Resolve enemy turn"}</button><button type="button" disabled={saving||!!campaign.combat.opportunity} className="hidden" onClick={()=>void skipEnemyTurnForTest()}>Skip enemy turn (test only)</button></div>}</>}
        </div>}
        {activeView==='adventure' && campaign && !campaign.combat && !campaign.pendingAftermath && <div className="mx-4 my-4 rounded-xl border border-gold/40 bg-panel p-3 space-y-2"><p className="text-sm font-semibold text-gold">Encounter training</p><p className="text-xs text-parchment/70">Start a standard two-opponent sparring encounter. Use the tactical grid and normal combat actions.</p><button type="button" disabled={saving} className="w-full rounded-lg border border-gold/70 p-3 font-semibold disabled:opacity-40" onClick={()=>void startTrainingCombatTest()}>Start encounter training</button></div>}
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
        {activeView !== "settings" && activeView !== "map" && !(activeView==="adventure"&&campaign?.combat) && <form className="flex items-end gap-2 px-4 py-3" onSubmit={(event) => { event.preventDefault(); void (dmMode ? submitAdventure() : saveNote()); }}>
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
