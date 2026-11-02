import { useEffect, useRef, useState } from 'react';
import { createBackup, parseBackup } from '../game/backup';
import { BookOpen, Compass, Map, Send, Settings, Shield, Swords, Users } from 'lucide-react';
import { addExchange, addNote, addRoll, newCampaign, type Campaign } from '../game/campaign';
import { localCampaignStorage } from '../game/storage';
import type { View } from '../game/types';
import { emptyWorld } from '../game/world';
import { prototypeNighthawk, skillAbility, skillModifier, rollCheck, describeCheck, type Skill, type RollMode } from '../game/checks';

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
function Party({ campaign, onRoll, saving }: { campaign: Campaign | null; onRoll: (skill: Skill, mode: RollMode) => void; saving: boolean }) {
  const [skill, setSkill] = useState<Skill>('Stealth');
  const [mode, setMode] = useState<RollMode>('normal');
  const skills = Object.keys(skillAbility) as Skill[];
  const modifier = skillModifier(prototypeNighthawk, skill);
  const lastRoll = campaign?.journal.filter(entry => entry.kind === 'system' && entry.text.startsWith('Nighthawk rolled ')).at(-1);
  return <section className="space-y-4"><div className="flex items-center gap-3"><Shield className="text-gold"/><h2 className="font-serif text-2xl">The Party</h2></div>
    <div className="rounded-xl border border-white/10 bg-panel p-5"><p className="font-semibold">Nighthawk</p><p className="mt-1 text-sm text-parchment/60">Wood Elf Rogue · Level 1 · Playtest statistics</p><p className="mt-3 text-sm">STR 8 · DEX 16 · CON 14 · INT 14 · WIS 12 · CHA 10</p><p className="mt-2 text-xs text-parchment/60">Proficiency bonus +2. These are provisional values until we finalize character creation.</p></div>
    <div className="rounded-xl border border-gold/30 bg-panel p-5 space-y-3"><h3 className="font-serif text-xl">Skill checks</h3><p className="text-sm text-parchment/70">Tap to roll real d20s. Results are saved to your campaign. The DM does not yet determine success or failure.</p><label className="block text-sm">Skill<select className="mt-1 block w-full rounded-lg border border-white/20 bg-ink p-3 text-base" value={skill} onChange={e => setSkill(e.target.value as Skill)}>{skills.map(s => <option key={s} value={s}>{s} ({skillModifier(prototypeNighthawk,s) >= 0 ? '+' : ''}{skillModifier(prototypeNighthawk,s)})</option>)}</select></label><label className="block text-sm">Roll mode<select className="mt-1 block w-full rounded-lg border border-white/20 bg-ink p-3 text-base" value={mode} onChange={e => setMode(e.target.value as RollMode)}><option value="normal">Normal</option><option value="advantage">Advantage (2d20, higher)</option><option value="disadvantage">Disadvantage (2d20, lower)</option></select></label><button type="button" disabled={!campaign || saving} onClick={() => onRoll(skill,mode)} className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-40">Roll {skill} ({modifier >= 0 ? '+' : ''}{modifier})</button>{lastRoll && <p role="status" className="rounded-lg border border-gold/20 p-3 text-sm">{lastRoll.text}</p>}</div>
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
  const [accessCode, setAccessCode] = useState('');
  const [dmMode, setDmMode] = useState(() => { try { return localStorage.getItem('four-keeps-dm-mode') === 'on'; } catch { return false; } });
  const importInput = useRef<HTMLInputElement>(null);

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
      const result = rollCheck(prototypeNighthawk, skill, mode);
      const next = addRoll(campaign, describeCheck(result));
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items => items.map(item => item.id === next.id ? next : item));
      setNotice('Dice rolled and result saved. No success or failure has been assigned.');
    } catch (error) { setNotice('Roll failed: ' + String(error)); }
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
    if (saving || !campaign?.pendingCheck || !accessCode) { setNotice('Enter your game access code to resolve the check.'); return; }
    setSaving(true);
    setNotice('Resolving the check…');
    try {
      const pending = campaign.pendingCheck;
      const rollD20 = () => {
        const bytes = new Uint8Array(1);
        do { crypto.getRandomValues(bytes); } while (bytes[0] >= 240);
        return (bytes[0] % 20) + 1;
      };
      const dice = pending.dice ?? Array.from({ length: pending.mode === 'normal' ? 1 : 2 }, rollD20);
      const locked = { ...campaign, pendingCheck: { ...pending, dice } };
      await localCampaignStorage.save(locked);
      setCampaign(locked);
      setCampaigns(items => items.map(item => item.id === locked.id ? locked : item));
      const history = locked.journal.filter(entry => entry.kind === 'player' || entry.kind === 'dm').slice(-12)
        .map(entry => ({ role: entry.kind === 'player' ? 'user' : 'assistant', content: entry.text }));
      const response = await fetch('/api/dm', { method:'POST', headers:{ 'Content-Type':'application/json','x-four-keeps-access':accessCode },
        body:JSON.stringify({ checkToken:pending.token, dice, history, worldFacts:locked.worldFacts ?? [], world:locked.world ?? emptyWorld() }) });
      const result: { narration?:string; newFacts?:string[]; worldUpdates?:unknown; checkResult?:{skill:string;dice:number[];kept:number;modifier:number;total:number;success:boolean}; error?:string } = await response.json();
      if (!response.ok || !result.narration || !result.checkResult) throw new Error(result.error || 'Check resolution failed');
      const r = result.checkResult;
      const rollText = 'Nighthawk rolled '+r.skill+': ['+r.dice.join(', ')+'], kept '+r.kept+', modifier '+(r.modifier >= 0 ? '+' : '')+r.modifier+', total '+r.total+'.';
      const next = addExchange(locked, rollText, result.narration, new Date().toISOString(), result.newFacts ?? [], result.worldUpdates);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns(items => items.map(item => item.id === next.id ? next : item));
      setActiveView('adventure');
      setNotice('Check resolved and saved.');
    } catch(error) { setNotice('Check error: '+String(error)+' Your dice are saved; retry to use the same roll.'); }
    finally { setSaving(false); }
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
        body: JSON.stringify({ message: draft, history, worldFacts: campaign.worldFacts ?? [], world: campaign.world ?? emptyWorld() }) });
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

  const content = { adventure: <Adventure campaign={campaign} fullHistory={fullHistory} onToggleHistory={() => setFullHistory(value => !value)}/>, party: <Party campaign={campaign} saving={saving} onRoll={(skill,mode) => void saveSkillRoll(skill,mode)}/>, journal: <Journal campaign={campaign}/>, map: <WorldMap/>, settings: <section className="space-y-4"><h2 className="font-serif text-2xl">Settings</h2><p className="text-sm text-parchment/60">Manage campaigns, backups, and Dungeon Master access below.</p></section> };
  return <div className="min-h-dvh bg-ink text-parchment">
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/95 px-5 pb-4 pt-[max(1.2rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">A living tabletop adventure</p><h1 className="font-serif text-3xl tracking-wide">Four Keeps</h1></div><span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">Prototype</span></div>
        <div className="mt-3 flex items-center justify-between text-xs text-parchment/60"><span>{campaign?.title ?? 'No campaign selected'}</span><span>{campaign?.location ?? 'Frontier Village'}</span></div>
      </header>
      <main className="flex-1 px-5 py-6" id="main-content">
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
          {dmMode && <><label htmlFor="access-code" className="block text-xs text-parchment/70">Game access code (enter after refreshing)</label>
          <input id="access-code" type="password" autoComplete="off" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Enter your private access code" className="w-full rounded-lg border border-white/20 bg-ink px-3 py-2 text-base"/>
          <p className="text-xs text-parchment/55">The AI narrates only. Dice, inventory, and rules are not yet connected.</p></>}
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
          <button type="button" disabled={saving || !dmMode} onClick={() => void resolvePendingCheck()} className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-40">{campaign.pendingCheck.dice ? 'Retry saved roll' : 'Roll '+campaign.pendingCheck.skill}</button>
          <p className="text-xs text-parchment/60">The target number is hidden. Your roll is saved before adjudication.</p>
        </div>}
        {activeView !== "settings" && <form className="flex items-end gap-2 px-4 py-3" onSubmit={(event) => { event.preventDefault(); void (dmMode ? sendToDM() : saveNote()); }}>
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
