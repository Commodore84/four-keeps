import {useEffect,useMemo,useState} from 'react';
import {MAGIC_ITEMS,readMagicWishlist,writeMagicWishlist} from '../game/magicWishlist';
export function MagicItemCompendium({campaignId}:{campaignId:string|null}){
 const [wanted,setWanted]=useState<string[]>([]);
 const [tab,setTab]=useState<'all'|'wishlist'>('all');
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('All');
 const [rarity,setRarity]=useState('All');
 const [expanded,setExpanded]=useState<string|null>(null);
 useEffect(()=>setWanted(campaignId?readMagicWishlist(campaignId):[]),[campaignId]);
 const categories=useMemo(()=>['All',...new Set(MAGIC_ITEMS.map(item=>item.category))],[]);
 const rarities=['All','Common','Uncommon','Rare','Very Rare','Legendary','Artifact','Varies'];
 const filtered=MAGIC_ITEMS.filter(item=>(tab==='all'||wanted.includes(item.id))&&(category==='All'||item.category===category)&&(rarity==='All'||(rarity==='Varies'?item.rarity.includes(',')||item.rarity.includes('Varies'):item.rarity.startsWith(rarity)))&&item.name.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
 function toggle(id:string){
  if(!campaignId)return;
  const next=wanted.includes(id)?wanted.filter(item=>item!==id):[...wanted,id];
  try {writeMagicWishlist(campaignId,next);setWanted(next);}catch{ /* Storage unavailable; do not claim a saved favorite. */ }
 }
 return <section aria-label="Magic Item Compendium" className="space-y-4">
  <h2 className="font-serif text-2xl text-gold">Magic Items</h2>
  <p className="text-sm text-parchment/75">Browse the 2024 SRD magic-item catalog and mark items you'd like to find. Your choices may inform future DM rewards; they never guarantee an item.</p>
  {!campaignId&&<p className="rounded-lg border border-gold/30 p-3 text-sm">Open a campaign to save a wish list.</p>}
  <div className="flex gap-2"><button type="button" onClick={()=>setTab('all')} aria-pressed={tab==='all'} className={`rounded-lg border px-3 py-2 text-sm ${tab==='all'?'border-gold text-gold':'border-white/20'}`}>Browse All</button><button type="button" onClick={()=>setTab('wishlist')} aria-pressed={tab==='wishlist'} className={`rounded-lg border px-3 py-2 text-sm ${tab==='wishlist'?'border-gold text-gold':'border-white/20'}`}>Wish List ({wanted.length})</button></div>
  <input aria-label="Search magic items" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search magic items" className="w-full rounded-lg border border-white/20 bg-panel p-3 text-base"/>
  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Category<select aria-label="Magic item category" value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-panel p-2 text-base">{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-xs">Rarity<select aria-label="Magic item rarity" value={rarity} onChange={e=>setRarity(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-panel p-2 text-base">{rarities.map(r=><option key={r}>{r}</option>)}</select></label></div>
  <p className="text-xs text-parchment/60">{filtered.length} items</p>
  {filtered.map(item=><article key={item.id} className="rounded-xl border border-white/15 bg-panel p-3"><div className="flex items-start gap-3"><button type="button" disabled={!campaignId} aria-label={wanted.includes(item.id)?`Remove ${item.name} from Wish List`:`Add ${item.name} to Wish List`} aria-pressed={wanted.includes(item.id)} onClick={()=>toggle(item.id)} className="rounded-lg border border-white/20 px-3 py-2 text-xl text-gold disabled:opacity-40">{wanted.includes(item.id)?'♥':'♡'}</button><div className="min-w-0 flex-1"><button type="button" aria-expanded={expanded===item.id} onClick={()=>setExpanded(expanded===item.id?null:item.id)} className="text-left font-semibold text-parchment underline decoration-white/20 underline-offset-4">{item.name}</button><p className="mt-1 text-xs text-parchment/65">{item.rarity} · {item.category}{item.attunement?' · Attunement':''}</p>{expanded===item.id&&<p className="mt-3 whitespace-pre-wrap text-sm text-parchment/85">{item.description}</p>}</div></div></article>)}
  {filtered.length===0&&<p className="py-8 text-center text-sm text-parchment/70">No matching items.</p>}
  <p className="text-xs text-parchment/50">Includes material from the SRD 5.2.1 by Wizards of the Coast LLC, licensed under CC BY 4.0. Catalog data from 5e-bits/5e-database. Non-SRD DMG items are not included.</p>
 </section>;
}
