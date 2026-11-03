import { useEffect, useRef, useState } from 'react';
import { createBackup, parseBackup } from '../game/backup';
import { BookOpen, Compass, Map, RefreshCw, Send, Settings, Shield, Swords, Users } from 'lucide-react';
import { addExchange, addNote, addRoll, newCampaign, type Campaign } from '../game/campaign';
import { localCampaignStorage } from '../game/storage';
import type { View } from '../game/types';
import { emptyWorld } from '../game/world';
import { prototypeNighthawk, abilities, abilityModifier, skillAbility, skillModifier, savingThrowModifier, passivePerception, rollCheck, describeCheck, type Skill, type RollMode } from '../game/checks';

const tabs = [
  { id: 'adventure', label: 'Adventure', Icon: Compass },
  { id: 'party', label: 'Party', Icon: Users },
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
function Party({ campaign, onRoll, onSaveRoll, saving }: { campaign: Campaign | null; onRoll: (skill: Skill, mode: RollMode) => void; onSaveRoll: (ability: typeof abilities[number], mode: RollMode) => void; saving: boolean }) {
  const [mode, setMode] = useState<RollMode>('normal');
  const skills = Object.keys(skillAbility) as Skill[];
  const stats = campaign?.character ?? prototypeNighthawk;
  const lastRoll = campaign?.journal.filter(entry => entry.kind === 'system' && (entry.text.startsWith('Nighthawk rolled ') || entry.text.startsWith('Nighthawk · '))).at(-1);
  const signed = (value: number) => (value >= 0 ? '+' : '') + value;
  return <section className="space-y-4"><div className="flex items-center gap-3"><Shield className="text-gold"/><h2 className="font-serif text-2xl">The Party</h2></div>
    <div className="rounded-xl border border-white/10 bg-panel p-5">
      <p className="font-semibold">Nighthawk</p><p className="mt-1 text-sm text-parchment/60">Wood Elf Rogue · Level {stats.level ?? 1} · Playtest character sheet</p>
      <div className="mt-4 grid grid-cols-3 gap-2">{abilities.map(ability => <div key={ability} className="rounded-lg border border-white/15 p-3 text-center"><p className="text-xs uppercase text-gold">{ability}</p><p className="text-xl font-semibold">{stats.scores[ability]}</p><p className="text-sm text-parchment/70">{signed(abilityModifier(stats.scores[ability]))}</p></div>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><p>HP: {stats.currentHitPoints ?? 10} / {stats.maxHitPoints ?? 10}</p><p>Armor Class: {stats.armorClass ?? 14}</p><p>Speed: {stats.speed ?? 35} ft.</p><p>Proficiency: +{stats.proficiencyBonus}</p><p>Passive Perception: {passivePerception(stats)}</p></div>
      <div className="mt-5 rounded-lg border border-gold/30 p-3"><p className="mb-2 text-sm font-semibold">Roll mode</p><div className="grid grid-cols-3 gap-1 text-center text-xs text-parchment/75"><span>Disadvantage</span><span>Normal</span><span>Advantage</span></div><input aria-label="Roll mode" type="range" min={-1} max={1} step={1} value={mode === 'disadvantage' ? -1 : mode === 'advantage' ? 1 : 0} onChange={e => setMode(Number(e.target.value) === -1 ? 'disadvantage' : Number(e.target.value) === 1 ? 'advantage' : 'normal')} className="mt-2 w-full accent-gold"/><p className="mt-1 text-center text-xs text-gold">{mode === 'normal' ? 'Normal roll' : mode === 'advantage' ? 'Advantage: keep higher d20' : 'Disadvantage: keep lower d20'}</p></div>
      <h3 className="mt-5 font-serif text-lg">Saving throws</h3><div className="mt-2 grid grid-cols-3 gap-2 text-sm">{abilities.map(a => <button type="button" key={a} disabled={!campaign || saving} onClick={() => onSaveRoll(a,mode)} className="rounded-lg border border-white/15 p-3 text-left uppercase active:border-gold disabled:opacity-40">{a}: {signed(savingThrowModifier(stats,a))}{a === 'dex' || a === 'int' ? ' *' : ''}</button>)}</div>
      <h3 className="mt-5 font-serif text-lg">Skills</h3><div className="mt-2 grid grid-cols-2 gap-2 text-xs">{skills.map(s => <button type="button" key={s} disabled={!campaign || saving} onClick={() => onRoll(s,mode)} className="rounded-lg border border-white/15 p-3 text-left active:border-gold disabled:opacity-40">{s} {signed(skillModifier(stats,s))} {stats.expertiseSkills?.includes(s) ? '**' : stats.proficientSkills.includes(s) ? '*' : ''}</button>)}</div>
      <p className="mt-3 text-xs text-parchment/60">Tap any skill or saving throw to roll using the selected mode. * Proficient · ** Expertise. Rolls are saved to the campaign; the DM determines outcomes.</p>
      {lastRoll && <p role="status" className="mt-3 rounded-lg border border-gold/30 p-3 text-sm">{lastRoll.text}</p>}
    </div>
    <div className="rounded-xl border border-dashed border-gold/30 p-5"><p className="font-semibold">Three companions await</p><p className="mt-2 text-sm text-parchment/60">Companion recruitment will arrive in a later milestone.</p></div>
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
        body:JSON.stringify({ checkToken:pending.token, dice, character:locked.character ?? prototypeNighthawk, history, worldFacts:locked.worldFacts ?? [], world:locked.world ?? emptyWorld() }) });
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

  async function sendToDM() {
    if (saving || !campaign || !draft.trim() || campaign.pendingCheck) return;
    if (!accessCode) { setNotice('Enter your game access code first.'); return; }
    setSaving(true);
    setNotice('The Dungeon Master is thinking…');
    try {
      const history = campaign.journal.filter((entry) => entry.kind === 'player' || entry.kind === 'dm')
        .slice(-12).map((entry) => ({ role: entry.kind === 'player' ? 'user' : 'assistant', content: entry.text }));
      const response = await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-four-keeps-access': accessCode },
        body: JSON.stringify({ message: draft, character:campaign.character ?? prototypeNighthawk, history, worldFacts: campaign.worldFacts ?? [], world: campaign.world ?? emptyWorld() }) });
      const result: { narration?: string; newFacts?: string[]; worldUpdates?: unknown; checkRequest?: { skill:string; mode:'normal'|'advantage'|'disadvantage'; reason:string; token:string } | null; error?: string } = await response.json();
      if (!response.ok || !result.narration) throw new Error(result.error || 'DM request failed');
      const next = addExchange(campaign, draft, result.narration, new Date().toISOString(), result.newFacts ?? [], result.worldUpdates, result.checkRequest ?? undefined);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns((items) => items.map((item) => item.id === next.id ? next : item));
      setDraft('');
      setActiveView('adventure');
      setNotice('The DM replied. Conversation saved locally.');
    } catch (error) { setNotice('DM error: ' + String(error)); }
    finally { setSaving(false); }
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

  const content = { adventure: <Adventure campaign={campaign} fullHistory={fullHistory} onToggleHistory={() => setFullHistory(value => !value)}/>, party: <Party campaign={campaign} saving={saving} onRoll={(skill,mode) => void saveSkillRoll(skill,mode)} onSaveRoll={(ability,mode) => void saveSavingThrow(ability,mode)}/>, journal: <Journal campaign={campaign}/>, map: <WorldMap/>, settings: <section className="space-y-4"><h2 className="font-serif text-2xl">Settings</h2><p className="text-sm text-parchment/60">Manage campaigns, backups, and Dungeon Master access below.</p></section> };
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
      </main>
      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur">
        {campaign?.pendingCheck && <div className="mx-4 mt-3 rounded-xl border border-gold/40 bg-panel p-4 space-y-2" role="group" aria-label="Pending skill check">
          <p className="eyebrow">Dungeon Master requests a check</p>
          <p className="font-serif text-xl">{campaign.pendingCheck.skill} · {campaign.pendingCheck.mode}</p>
          <p className="text-sm text-parchment/70">{campaign.pendingCheck.reason}</p>
          <button type="button" disabled={saving || !dmMode} onClick={() => void resolvePendingCheck()} className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-40">{campaign.pendingCheck.dice ? (saving ? 'DM is resolving…' : 'Retry DM response') : 'Roll '+campaign.pendingCheck.skill}</button>
           {campaign.pendingCheck.dice && (() => { const dice = campaign.pendingCheck.dice; const used = dice.length === 1 ? dice[0] : campaign.pendingCheck.mode === 'advantage' ? Math.max(...dice) : Math.min(...dice); const modifier = skillModifier(campaign.character ?? prototypeNighthawk, campaign.pendingCheck.skill as Parameters<typeof skillModifier>[1]); return <div role="status" aria-live="polite" className="rounded-lg border border-gold/30 bg-ink/60 p-3"><p className="text-xs uppercase tracking-widest text-gold">Nighthawk · {campaign.pendingCheck.skill} check</p><p className="mt-2 text-xl font-semibold">{dice.length === 1 ? String(dice[0]) : dice.join(' / ')+' ('+campaign.pendingCheck.mode+': '+used+')'} <span className="text-parchment/70">{modifier >= 0 ? '+' : '−'}{Math.abs(modifier)} =</span> {used + modifier}</p><p className="mt-1 text-xs text-parchment/65">{saving ? 'Waiting for the Dungeon Master. Your roll is saved.' : 'Roll saved. Retry the DM response without rerolling.'}</p></div>; })()}
          <p className="text-xs text-parchment/60">The target number is hidden. Your roll is saved before adjudication.</p>
        </div>}
        {activeView !== "settings" && <form className="flex items-end gap-2 px-4 py-3" onSubmit={(event) => { event.preventDefault(); void (dmMode ? sendToDM() : saveNote()); }}>
          <button type="button" onClick={() => window.location.reload()} aria-label="Refresh Four Keeps" title="Refresh Four Keeps" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-panel text-gold"><RefreshCw size={19}/></button>
          <label htmlFor="dm-input" className="sr-only">Message the Dungeon Master</label>
          <textarea id="dm-input" value={draft} onChange={(event) => { setDraft(event.target.value); setNotice(''); }} rows={1} placeholder={campaign ? (dmMode ? 'What does Nighthawk do?' : 'Write a journal note…') : 'Create a campaign first'} disabled={!campaign || saving || !!campaign.pendingCheck} className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-white/20 bg-panel px-3 py-3 text-base text-parchment placeholder:text-parchment/45 focus:border-gold focus:outline-none"/>
          <button type="submit" disabled={!draft.trim() || !campaign || saving || !!campaign.pendingCheck} aria-label="Send message to Dungeon Master" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink disabled:opacity-40"><Send size={19}/></button>
        </form>}
        {notice && <p role="status" className="px-5 pb-2 text-xs text-gold">{notice}</p>}
        <nav aria-label="Primary navigation" className="grid grid-cols-5 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => { setActiveView(id); setNotice(''); }} aria-current={activeView === id ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${activeView === id ? 'text-gold' : 'text-parchment/55'}`}><Icon size={21}/><span>{label}</span></button>)}
        </nav>
      </div>
    </div>
  </div>;
}
