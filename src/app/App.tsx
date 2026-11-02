import { useState } from 'react';
import { BookOpen, Compass, Map, Send, Shield, Swords, Users } from 'lucide-react';
import { previewCampaign } from '../game/state';
import type { View } from '../game/types';

const tabs = [
  { id: 'adventure', label: 'Adventure', Icon: Compass },
  { id: 'party', label: 'Party', Icon: Users },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'map', label: 'Map', Icon: Map },
] as const;

function Adventure() {
  return <section className="space-y-5" aria-label="Adventure">
    <div className="scene"><div className="scene-glow" /><div className="absolute bottom-5 left-5 right-5"><p className="eyebrow">Chapter One</p><h2 className="font-serif text-3xl text-parchment">A Road to the Forgotten Keep</h2></div></div>
    <div className="rounded-xl border border-white/10 bg-panel p-5 space-y-3">
      <p className="eyebrow">Dungeon Master</p>
      <p className="leading-7 text-parchment/85">The road bends toward a frontier village, its lanterns glowing beneath the evening mist. Beyond the tree line, an old keep waits in silence.</p>
      <p className="text-xs text-gold/80">Preview scene · AI Dungeon Master not connected</p>
    </div>
  </section>;
}
function Party() {
  return <section className="space-y-4"><div className="flex items-center gap-3"><Shield className="text-gold"/><h2 className="font-serif text-2xl">The Party</h2></div>
    <div className="rounded-xl border border-white/10 bg-panel p-5"><p className="font-semibold">Nighthawk</p><p className="mt-1 text-sm text-parchment/60">Wood Elf Rogue · Level 1 · Planned character</p></div>
    <div className="rounded-xl border border-dashed border-gold/30 p-5"><p className="font-semibold">Three companions await</p><p className="mt-2 text-sm text-parchment/60">Recruitment and autonomous companion behavior will be implemented in later milestones.</p></div>
  </section>;
}
function Journal() {
  return <section className="space-y-4"><div className="flex items-center gap-3"><BookOpen className="text-gold"/><h2 className="font-serif text-2xl">Campaign Journal</h2></div>
    <div className="rounded-xl border border-dashed border-gold/30 p-5"><p className="font-semibold">Your story starts here.</p><p className="mt-2 text-sm text-parchment/60">Events, discoveries, quests, and character knowledge will appear when persistence is connected.</p></div>
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
  const [notice, setNotice] = useState(false);
  const content = { adventure: <Adventure/>, party: <Party/>, journal: <Journal/>, map: <WorldMap/> };
  return <div className="min-h-dvh bg-ink text-parchment">
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/95 px-5 pb-4 pt-[max(1.2rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">A living tabletop adventure</p><h1 className="font-serif text-3xl tracking-wide">Four Keeps</h1></div><span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">Prototype</span></div>
        <div className="mt-3 flex items-center justify-between text-xs text-parchment/60"><span>{previewCampaign.title}</span><span>{previewCampaign.location}</span></div>
      </header>
      <main className="flex-1 px-5 py-6" id="main-content">{content[activeView]}</main>
      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur">
        <form className="flex items-end gap-2 px-4 py-3" onSubmit={(event) => { event.preventDefault(); setNotice(true); }}>
          <label htmlFor="dm-input" className="sr-only">Message the Dungeon Master</label>
          <textarea id="dm-input" value={draft} onChange={(event) => { setDraft(event.target.value); setNotice(false); }} rows={1} placeholder="What do you do?" className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-white/20 bg-panel px-3 py-3 text-sm text-parchment placeholder:text-parchment/45 focus:border-gold focus:outline-none"/>
          <button type="submit" disabled={!draft.trim()} aria-label="Send message to Dungeon Master" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink disabled:opacity-40"><Send size={19}/></button>
        </form>
        {notice && <p role="status" className="px-5 pb-2 text-xs text-gold">The DM is not connected yet. Your message has not been sent.</p>}
        <nav aria-label="Primary navigation" className="grid grid-cols-4 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => { setActiveView(id); setNotice(false); }} aria-current={activeView === id ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${activeView === id ? 'text-gold' : 'text-parchment/55'}`}><Icon size={21}/><span>{label}</span></button>)}
        </nav>
      </div>
    </div>
  </div>;
}
