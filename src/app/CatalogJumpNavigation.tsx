import {useEffect,useRef,useState} from 'react';

type CatalogJump = {id:string;label:string;parentId?:string};
/** Horizontal catalog navigation that retains the selected tab on narrow screens. */
export function CatalogJumpNavigation({title,groups,subgroups,embedded=false,contextualSubgroups=false}:{title:string;groups:CatalogJump[];subgroups:CatalogJump[];embedded?:boolean;contextualSubgroups?:boolean}){
 const [activeGroup,setActiveGroup]=useState<string|null>(contextualSubgroups?groups[0]?.id??null:null);
 const [activeSubgroup,setActiveSubgroup]=useState<string|null>(null);
 const groupNav=useRef<HTMLElement>(null);
 const subgroupNav=useRef<HTMLElement>(null);
 const jump=(id:string,kind:'group'|'subgroup')=>{
  const target=document.getElementById(id);
  if(!target)return;
  target.scrollIntoView({behavior:'smooth',block:'start'});
  if(kind==='group'){setActiveGroup(id);setActiveSubgroup(null);}
  else{
   setActiveSubgroup(id);
   const parent=target.closest('section[id]');
   if(parent)setActiveGroup(parent.id);
  }
 };
 useEffect(()=>{
  const center=(nav:HTMLElement|null,id:string|null)=>{
   if(!nav||!id)return;
   const button=Array.from(nav.querySelectorAll<HTMLButtonElement>('button[data-jump-id]')).find(item=>item.dataset.jumpId===id);
   if(button)nav.scrollTo({left:button.offsetLeft-nav.offsetLeft-(nav.clientWidth-button.offsetWidth)/2,behavior:'smooth'});
  };
  center(groupNav.current,activeGroup);
  center(subgroupNav.current,activeSubgroup);
 },[activeGroup,activeSubgroup]);
 const renderRow=(items:CatalogJump[],kind:'group'|'subgroup')=><nav ref={kind==='group'?groupNav:subgroupNav} aria-label={'Jump to '+title.toLowerCase()+' '+(kind==='group'?'section':'subgroup')} className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:'thin'}}>
  {items.map(item=>{
   const selected=(kind==='group'?activeGroup:activeSubgroup)===item.id;
   return <button key={item.id} data-jump-id={item.id} type="button" aria-label={kind==='subgroup'?item.label:undefined} onClick={()=>jump(item.id,kind)} aria-current={selected?'location':undefined} className={'shrink-0 rounded-lg border px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold '+(selected?'border-gold bg-gold/20 text-gold':kind==='group'?'border-gold/40 text-gold':'border-white/30')}>{kind==='group'?item.label:item.label.split(' — ').at(-1)}</button>;
  })}
 </nav>;
 return <div aria-label={title+' section navigation'} className={(embedded?'':'sticky top-0 z-20 ')+'space-y-1 rounded-lg border border-gold/30 bg-ink/95 p-2 shadow-lg backdrop-blur'}>
  {groups.length>0&&renderRow(groups,'group')}
  {(!contextualSubgroups||activeGroup)&&renderRow(contextualSubgroups?subgroups.filter(item=>item.parentId===activeGroup):subgroups,'subgroup')}
 </div>;
}
