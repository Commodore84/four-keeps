import {useEffect,useMemo,useState} from 'react';
import {MAGIC_ITEMS,readMagicWishlist,writeMagicWishlist} from '../game/magicWishlist';
import {ALCHEMY_JUG_LIQUIDS,magicItemExtendedRules,magicItemUseDescription} from '../game/magicItemUseDescriptions';
const RARITY_STYLES:Record<string,string>={
 Common:'border-slate-400/50 bg-slate-500/15 text-slate-200',
 Uncommon:'border-green-500/50 bg-green-500/15 text-green-300',
 Rare:'border-blue-500/50 bg-blue-500/15 text-blue-300',
 'Very Rare':'border-purple-500/50 bg-purple-500/15 text-purple-300',
 Legendary:'border-orange-500/50 bg-orange-500/15 text-orange-300',
 Artifact:'border-red-500/50 bg-red-500/15 text-red-300',
 Varies:'border-white/30 bg-white/10 text-parchment',
};
const rarityTier=(value:string)=>{
 if(value.includes(',')||value.includes('Varies'))return 'Varies';
 return ['Very Rare','Legendary','Uncommon','Common','Rare','Artifact'].find(tier=>value.startsWith(tier))??'Varies';
};
const itemGroup=(category:string,name:string)=>{
 const c=category.toLowerCase(),n=name.toLowerCase();
 if(c.includes('weapon'))return 'Weapons';
 if(c.includes('armor')||c.includes('shield'))return 'Armor and shields';
 if(c.includes('potion')||n.startsWith('potion '))return 'Potions';
 if(c.includes('scroll')||n.startsWith('spell scroll'))return 'Scrolls';
 if(c.includes('ring'))return 'Rings';
 if(c.includes('wand'))return 'Wands';
 if(c.includes('staff')||n.startsWith('staff '))return 'Staffs';
 if(c.includes('rod'))return 'Rods';
 if(n.includes('bag')||n.includes('backpack')||n.includes('portable hole'))return 'Storage and containers';
 if(/boots|cloak|gloves|gauntlets|hat|helm|robe|bracers|belt|amulet|necklace|periapt|brooch|circlet|goggles|slippers|horseshoes/.test(n))return 'Wearable wonders';
 if(/figurine|statue|apparatus|carpet|broom|boat|fortress|chariot|vehicle/.test(n))return 'Constructs, companions and transport';
 if(/manual|tome|book|deck|card|scrollcase/.test(n))return 'Books, decks and knowledge';
 if(/instrument|horn|drum|lyre|pipes|chime|bell/.test(n))return 'Musical and signaling items';
 if(/gem|stone|crystal|orb|bead|dust|powder|ioun/.test(n))return 'Gems, stones and magical substances';
 if(/cube|gate|portal|mirror|teleport|dimensional|shackle/.test(n))return 'Planar and dimensional items';
 if(/candle|lantern|lamp|light|torch/.test(n))return 'Light and illumination';
 return 'Other wondrous items';
};
const itemSubgroup=(category:string,name:string)=>{
 const c=category.toLowerCase(),n=name.toLowerCase();
 if(c.includes('weapon'))return /bow|crossbow|sling|blowgun/.test(n)?'Ranged weapons':/ammunition|arrow|bolt/.test(n)?'Ammunition':'Melee weapons';
 if(c.includes('armor')||c.includes('shield'))return c.includes('shield')?'Shields':'Armor';
 if(c.includes('potion')||n.startsWith('potion '))return /healing|vitality|restoration/.test(n)?'Healing and restoration':'Other potions';
 if(c.includes('scroll'))return 'Spell scrolls';
 if(c.includes('ring'))return 'Magic rings';
 if(c.includes('wand'))return 'Magic wands';
 if(c.includes('staff'))return 'Magic staffs';
 if(c.includes('rod'))return 'Magic rods';
 if(/bag|backpack|portable hole|quiver|chest|bottle|decanter/.test(n))return 'Containers and storage';
 if(/boots|slippers|horseshoes/.test(n))return 'Footwear and movement';
 if(/cloak|robe|mantle|cape/.test(n))return 'Cloaks and robes';
 if(/gloves|gauntlets|bracers|belt/.test(n))return 'Gloves, bracers and belts';
 if(/hat|helm|headband|circlet|goggles|eyes/.test(n))return 'Headwear and vision';
 if(/amulet|necklace|periapt|medallion|brooch/.test(n))return 'Amulets and jewelry';
 if(/instrument|horn|drum|lyre|pipes/.test(n))return 'Musical instruments';
 if(/figurine|statue|stone|gem|orb|crystal/.test(n))return 'Figurines, stones and gems';
 if(/manual|tome|book|deck|card/.test(n))return 'Books, decks and knowledge';
 if(/apparatus|carpet|broom|boat|chariot|vehicle/.test(n))return 'Travel and vehicles';
 if(/figurine|statue|fortress|guardian|golem/.test(n))return 'Companions and constructs';
 if(/cube|gate|portal|mirror|dimensional|shackle/.test(n))return 'Portals, barriers and dimensions';
 if(/dust|powder|bead|ioun/.test(n))return 'Magical powders and beads';
 if(/candle|lantern|lamp|torch|light/.test(n))return 'Light and illumination';
 if(/chime|bell/.test(n))return 'Signals and sound';
 if(/broom|carpet|wing|flight|flying/.test(n))return 'Flight and aerial travel';
 return 'Miscellaneous wondrous items';
};
export function MagicItemCompendium({campaignId}:{campaignId:string|null}){
 const [wanted,setWanted]=useState<string[]>([]);
 const [tab,setTab]=useState<'all'|'wishlist'>('all');
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('All');
 const [rarity,setRarity]=useState('All');
 const [group,setGroup]=useState('All');
 useEffect(()=>setWanted(campaignId?readMagicWishlist(campaignId):[]),[campaignId]);
 const categories=useMemo(()=>['All',...new Set(MAGIC_ITEMS.map(item=>item.category))],[]);
 const groups=useMemo(()=>['All',...new Set(MAGIC_ITEMS.map(item=>itemGroup(item.category,item.name)))].sort((a,b)=>a==='All'?-1:b==='All'?1:a.localeCompare(b)),[]);
 const subgroups=useMemo(()=>['All',...new Set(MAGIC_ITEMS.filter(item=>(category==='All'||item.category===category)&&(group==='All'||itemGroup(item.category,item.name)===group)).map(item=>itemSubgroup(item.category,item.name)))].sort((a,b)=>a==='All'?-1:b==='All'?1:a.localeCompare(b)),[category,group]);
 const [subgroup,setSubgroup]=useState('All');
 const rarities=['All','Common','Uncommon','Rare','Very Rare','Legendary','Artifact','Varies'];
 const filtered=MAGIC_ITEMS.filter(item=>(tab==='all'||wanted.includes(item.id))&&(category==='All'||item.category===category)&&(group==='All'||itemGroup(item.category,item.name)===group)&&(subgroup==='All'||itemSubgroup(item.category,item.name)===subgroup)&&(rarity==='All'||rarityTier(item.rarity)===rarity)&&item.name.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>itemGroup(a.category,a.name).localeCompare(itemGroup(b.category,b.name))||itemSubgroup(a.category,a.name).localeCompare(itemSubgroup(b.category,b.name))||a.name.localeCompare(b.name));
 function toggle(id:string){
  if(!campaignId)return;
  const next=wanted.includes(id)?wanted.filter(item=>item!==id):[...wanted,id];
  try {writeMagicWishlist(campaignId,next);setWanted(next);}catch{ /* Storage unavailable; do not claim a saved favorite. */ }
 }
 return <section aria-label="Magic Item Compendium" className="space-y-4">
  <h2 className="font-serif text-2xl text-gold">Magic Items</h2>
  <p className="text-sm text-parchment/75">Browse 2024 magic items and mark items you'd like to find. Your choices may inform future DM rewards; they never guarantee an item.</p>
  {!campaignId&&<p className="rounded-lg border border-gold/30 p-3 text-sm">Open a campaign to save a wish list.</p>}
  <div className="flex gap-2"><button type="button" onClick={()=>setTab('all')} aria-pressed={tab==='all'} className={`rounded-lg border px-3 py-2 text-sm ${tab==='all'?'border-gold text-gold':'border-white/20'}`}>Browse All</button><button type="button" onClick={()=>setTab('wishlist')} aria-pressed={tab==='wishlist'} className={`rounded-lg border px-3 py-2 text-sm ${tab==='wishlist'?'border-gold text-gold':'border-white/20'}`}>Wish List ({wanted.length})</button></div>
  <input aria-label="Search magic items" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search magic items" className="w-full rounded-lg border border-white/20 bg-panel p-3 text-base"/>
  <div className="grid grid-cols-2 gap-2"><label className="text-xs">Category<select aria-label="Magic item category" value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-panel p-2 text-base">{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-xs">Rarity<select aria-label="Magic item rarity" value={rarity} onChange={e=>setRarity(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-panel p-2 text-base">{rarities.map(r=><option key={r}>{r}</option>)}</select></label></div>
  <label className="block text-xs">Item group<select aria-label="Magic item group" value={group} onChange={e=>setGroup(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-panel p-2 text-base">{groups.map(g=><option key={g}>{g}</option>)}</select></label>
  <label className="block text-xs">Subgroup<select aria-label="Magic item subgroup" value={subgroups.includes(subgroup)?subgroup:'All'} onChange={e=>setSubgroup(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-panel p-2 text-base">{subgroups.map(g=><option key={g}>{g}</option>)}</select></label>
  <nav aria-label="Jump to magic item section" className="flex gap-2 overflow-x-auto pb-1">{[...new Set(filtered.map(item=>itemGroup(item.category,item.name)))].map(g=><button key={g} type="button" onClick={()=>document.getElementById('magic-group-'+groups.indexOf(g))?.scrollIntoView({behavior:'smooth',block:'start'})} className="shrink-0 rounded-lg border border-gold/40 px-3 py-2 text-xs text-gold">{g}</button>)}</nav>
  <nav aria-label="Jump to magic item subgroup" className="flex gap-2 overflow-x-auto pb-1">{[...new Set(filtered.map(item=>itemGroup(item.category,item.name)+'|'+itemSubgroup(item.category,item.name)))].map(key=>{const [g,sg]=key.split('|');return <button key={key} type="button" onClick={()=>document.getElementById('magic-subgroup-'+groups.indexOf(g)+'-'+encodeURIComponent(sg))?.scrollIntoView({behavior:'smooth',block:'start'})} className="shrink-0 rounded-lg border border-white/30 px-3 py-2 text-xs">{sg}</button>;})}</nav>
  <p className="text-xs text-parchment/60">{filtered.length} items · grouped by type and subgroup</p>
  {filtered.map((item,index)=>{
   const previous=filtered[index-1];
   const currentGroup=itemGroup(item.category,item.name),currentSubgroup=itemSubgroup(item.category,item.name);
   const newGroup=!previous||itemGroup(previous.category,previous.name)!==currentGroup;
   const newSubgroup=newGroup||itemSubgroup(previous.category,previous.name)!==currentSubgroup;
   const usage=magicItemUseDescription(item);
   const extendedRules=magicItemExtendedRules(item.id);
   return <div key={item.id}>{newGroup&&<h3 id={"magic-group-"+groups.indexOf(currentGroup)} className="scroll-mt-4 mt-5 border-b border-gold/40 pb-2 font-serif text-xl text-gold">{currentGroup}</h3>}{newSubgroup&&<h4 id={"magic-subgroup-"+groups.indexOf(currentGroup)+"-"+encodeURIComponent(currentSubgroup)} className="scroll-mt-4 mt-3 text-sm font-semibold text-parchment/80">{currentSubgroup}</h4>}<article className="rounded-xl border border-white/15 bg-panel p-3">
   <div className="flex items-start gap-3">
    <button type="button" disabled={!campaignId} aria-label={wanted.includes(item.id)?`Remove ${item.name} from Wish List`:`Add ${item.name} to Wish List`} aria-pressed={wanted.includes(item.id)} onClick={()=>toggle(item.id)} className="rounded-lg border border-white/20 px-3 py-2 text-xl text-gold disabled:opacity-40">{wanted.includes(item.id)?'♥':'♡'}</button>
    <div className="min-w-0 flex-1">
     <h3 className="font-semibold text-parchment">{item.name}</h3>
     <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-parchment/65"><span className={`rounded-md border px-2 py-0.5 font-semibold ${RARITY_STYLES[rarityTier(item.rarity)]}`}>{item.rarity}</span><span>{itemGroup(item.category,item.name)} · {item.category}{item.attunement?' · Attunement':''}</span></div>
    </div>
   </div>
   <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-parchment/85">{usage??item.description}</p>
   {item.id==='dmg24-alchemy-jug'&&<table className="mt-3 w-full text-left text-sm">
    <caption className="pb-1 text-left font-semibold">Alchemy Jug liquids</caption>
    <thead><tr><th scope="col" className="pb-1">Liquid</th><th scope="col" className="pb-1 text-right">Maximum per dawn</th></tr></thead>
    <tbody>{ALCHEMY_JUG_LIQUIDS.map(([liquid,amount])=><tr key={liquid} className="border-t border-white/10">
     <th scope="row" className="py-1 pr-2 font-normal">{liquid}</th><td className="py-1 text-right">{amount}</td>
    </tr>)}</tbody>
   </table>}
   <section aria-label={item.name+' rules and source'} className="mt-2 rounded-lg border border-white/15 px-3 py-2">
    <h5 className="text-sm font-semibold text-gold">Rules, requirements and source</h5>
    <p className="mt-2 text-sm text-parchment/80">Source: {item.source}{item.license?' · '+item.license:''}</p>
    <p className="mt-1 text-sm text-parchment/80">Type: {item.category} · Rarity: {item.rarity}{item.attunement?' · Requires attunement':''}</p>
    {item.mechanics?.recharge&&<p className="mt-2 text-sm text-parchment/75">{item.mechanics.recharge}</p>}
    {item.mechanics?.attunementRequirement&&<p className="mt-2 text-sm text-parchment/75">Attunement requires {item.mechanics.attunementRequirement}.</p>}
    {extendedRules&&<a className="mt-2 inline-block text-sm text-gold underline" href={extendedRules} target="_blank" rel="noopener noreferrer">Full rules for {item.name}</a>}
   </section>
  </article></div>})}
  {filtered.length===0&&<p className="py-8 text-center text-sm text-parchment/70">No matching items.</p>}
  <p className="text-xs text-parchment/50">Includes SRD 5.2.1 material by Wizards of the Coast LLC (CC BY 4.0), plus practical summaries of additional 2024 DMG items. Use the full rules for artifact properties, random tables, and unusual interactions.</p>
 <a className="text-sm underline text-gold" href="https://www.dndbeyond.com/sources/dnd/dmg-2024" target="_blank" rel="noopener noreferrer">Official 2024 Dungeon Master’s Guide</a>
 </section>;
}
