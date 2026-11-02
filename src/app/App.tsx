import { useEffect, useRef, useState } from 'react';
import { createBackup, parseBackup } from '../game/backup';
import { BookOpen, Compass, Map, Send, Shield, Swords, Users } from 'lucide-react';
import { addExchange, addNote, newCampaign, type Campaign } from '../game/campaign';
import { localCampaignStorage } from '../game/storage';
import type { View } from '../game/types';

const tabs = [
  { id: 'adventure', label: 'Adventure', Icon: Compass },
  { id: 'party', label: 'Party', Icon: Users },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'map', label: 'Map', Icon: Map },
] as const;

function Adventure({ campaign }: { campaign: Campaign | null }) {
  return <section className="space-y-5" aria-label="Adventure">
    <div className="scene"><div className="scene-glow"/><div className="absolute bottom-5 left-5 right-5"><p className="eyebrow">Chapter One</p><h2 className="font-serif text-3xl">A Road to the Forgotten Keep</h2></div></div>
    <div className="rounded-xl border border-white/10 bg-panel p-5 space-y-3">
      <p className="eyebrow">Dungeon Master</p>
      <p className="leading-7 text-parchment/85">The road bends toward a frontier village, its lanterns glowing beneath the evening mist. Beyond the tree line, an old keep waits in silence.</p>
      {campaign && campaign.journal.filter((entry) => entry.kind === 'player' || entry.kind === 'dm').slice(-8).map((entry) => <div key={entry.id} className="border-t border-white/10 pt-3"><p className="eyebrow">{entry.kind === 'player' ? 'Nighthawk' : 'Dungeon Master'}</p><p className="mt-2 whitespace-pre-wrap leading-7 text-parchment/85">{entry.text}</p></div>)}
      <p className="text-xs text-gold/80">{campaign ? 'Campaign saved locally · AI DM not connected yet' : 'Create a local campaign to begin'}</p>
    </div>
  </section>;
}
function Party() {
  return <section className="space-y-4"><div className="flex items-center gap-3"><Shield className="text-gold"/><h2 className="font-serif text-2xl">The Party</h2></div>
    <div className="rounded-xl border border-white/10 bg-panel p-5"><p className="font-semibold">Nighthawk</p><p className="mt-1 text-sm text-parchment/60">Wood Elf Rogue · Level 1 · Planned character</p></div>
    <div className="rounded-xl border border-dashed border-gold/30 p-5"><p className="font-semibold">Three companions await</p><p className="mt-2 text-sm text-parchment/60">Companion recruitment will arrive in a later milestone.</p></div>
  </section>;
}
function Journal({ campaign }: { campaign: Campaign | null }) {
  return <section className="space-y-4"><div className="flex items-center gap-3"><BookOpen className="text-gold"/><h2 className="font-serif text-2xl">Campaign Journal</h2></div>
    {campaign ? campaign.journal.map((entry) => <div key={entry.id} className="rounded-xl border border-white/10 bg-panel p-4">
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
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [newTitle, setNewTitle] = useState('The Forgotten Keep');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [dmMode, setDmMode] = useState(false);
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

  async function saveNote() {
    if (saving || !campaign || !draft.trim()) return;
    setSaving(true);
    try {
      const next = addNote(campaign, draft);
      await localCampaignStorage.save(next);
      setCampaign(next);
      setCampaigns((items) => items.map((item) => item.id === next.id ? next : item));
      setDraft('');
      setNotice('Saved to your local journal. The AI DM is not connected yet.');
    } catch (error) { setNotice('Could not save note: ' + String(error)); }
    finally { setSaving(false); }
  }

  async function sendToDM() {
    if (saving || !campaign || !draft.trim()) return;
    if (!accessCode) { setNotice('Enter your game access code first.'); return; }
    setSaving(true);
    setNotice('The Dungeon Master is thinking…');
    try {
      const history = campaign.journal.filter((entry) => entry.kind === 'player' || entry.kind === 'dm')
        .slice(-12).map((entry) => ({ role: entry.kind === 'player' ? 'user' : 'assistant', content: entry.text }));
      const response = await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-four-keeps-access': accessCode },
        body: JSON.stringify({ message: draft, history }) });
      const result: { narration?: string; error?: string } = await response.json();
      if (!response.ok || !result.narration) throw new Error(result.error || 'DM request failed');
      const next = addExchange(campaign, draft, result.narration);
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

  const content = { adventure: <Adventure campaign={campaign}/>, party: <Party/>, journal: <Journal campaign={campaign}/>, map: <WorldMap/> };
  return <div className="min-h-dvh bg-ink text-parchment">
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/95 px-5 pb-4 pt-[max(1.2rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">A living tabletop adventure</p><h1 className="font-serif text-3xl tracking-wide">Four Keeps</h1></div><span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">Prototype</span></div>
        <div className="mt-3 flex items-center justify-between text-xs text-parchment/60"><span>{campaign?.title ?? 'No campaign selected'}</span><span>{campaign?.location ?? 'Frontier Village'}</span></div>
      </header>
      <main className="flex-1 px-5 py-6" id="main-content">
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
          {dmMode && <><label htmlFor="access-code" className="block text-xs text-parchment/70">Game access code (not saved)</label>
          <input id="access-code" type="password" autoComplete="off" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Enter your private access code" className="w-full rounded-lg border border-white/20 bg-ink px-3 py-2 text-base"/>
          <p className="text-xs text-parchment/55">The AI narrates only. Dice, inventory, and rules are not yet connected.</p></>}
        </section>}
        {content[activeView]}
      </main>
      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur">
        <form className="flex items-end gap-2 px-4 py-3" onSubmit={(event) => { event.preventDefault(); void (dmMode ? sendToDM() : saveNote()); }}>
          <label htmlFor="dm-input" className="sr-only">Message the Dungeon Master</label>
          <textarea id="dm-input" value={draft} onChange={(event) => { setDraft(event.target.value); setNotice(''); }} rows={1} placeholder={campaign ? (dmMode ? 'What does Nighthawk do?' : 'Write a journal note…') : 'Create a campaign first'} disabled={!campaign || saving} className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-white/20 bg-panel px-3 py-3 text-base text-parchment placeholder:text-parchment/45 focus:border-gold focus:outline-none"/>
          <button type="submit" disabled={!draft.trim() || !campaign || saving} aria-label="Send message to Dungeon Master" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink disabled:opacity-40"><Send size={19}/></button>
        </form>
        {notice && <p role="status" className="px-5 pb-2 text-xs text-gold">{notice}</p>}
        <nav aria-label="Primary navigation" className="grid grid-cols-4 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => { setActiveView(id); setNotice(''); }} aria-current={activeView === id ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${activeView === id ? 'text-gold' : 'text-parchment/55'}`}><Icon size={21}/><span>{label}</span></button>)}
        </nav>
      </div>
    </div>
  </div>;
}
