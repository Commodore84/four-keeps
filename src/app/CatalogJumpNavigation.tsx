type CatalogJump = {id:string;label:string};
/** Shared page-scrolling navigation for catalog and merchant inventories. */
export function CatalogJumpNavigation({title,groups,subgroups}:{title:string;groups:CatalogJump[];subgroups:CatalogJump[]}){
 const jump=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
 return <div aria-label={title+' section navigation'} className="sticky top-14 z-20 space-y-1 rounded-lg border border-gold/30 bg-ink/95 p-2 shadow-lg backdrop-blur">
  <nav aria-label={'Jump to '+title.toLowerCase()+' section'} className="flex gap-2 overflow-x-auto pb-1">{groups.map(item=><button key={item.id} type="button" onClick={()=>jump(item.id)} className="shrink-0 rounded-lg border border-gold/40 px-3 py-2 text-xs text-gold">{item.label}</button>)}</nav>
  <nav aria-label={'Jump to '+title.toLowerCase()+' subgroup'} className="flex gap-2 overflow-x-auto pb-1">{subgroups.map(item=><button key={item.id} type="button" onClick={()=>jump(item.id)} aria-label={item.label} className="shrink-0 rounded-lg border border-white/30 px-3 py-2 text-xs">{item.label.split(' — ').at(-1)}</button>)}</nav>
 </div>;
}
