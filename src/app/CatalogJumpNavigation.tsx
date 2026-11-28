import {useEffect,useRef,useState} from 'react';

type CatalogJump = {id:string;label:string;parentId?:string};
/** Horizontal catalog navigation that retains the selected tab on narrow screens. */
export function CatalogJumpNavigation({title,groups,subgroups,embedded=false,contextualSubgroups=false}:{title:string;groups:CatalogJump[];subgroups:CatalogJump[];embedded?:boolean;contextualSubgroups?:boolean}){
 const [activeGroup,setActiveGroup]=useState<string|null>(contextualSubgroups?groups[0]?.id??null:null);
 const [activeSubgroup,setActiveSubgroup]=useState<string|null>(null);
 const suppressScrollTrackingUntil=useRef(0);
 const refreshAfterJump=useRef<()=>void>(()=>{});
 const groupNav=useRef<HTMLElement>(null);
 const subgroupNav=useRef<HTMLElement>(null);
 const jump=(id:string,kind:'group'|'subgroup')=>{
  const target=document.getElementById(id);
  if(!target)return;
  suppressScrollTrackingUntil.current=Date.now()+500;
  setTimeout(()=>refreshAfterJump.current(),550);
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
 useEffect(()=>{
  if(!contextualSubgroups||!groups.length)return;
  let frame=0;
  const update=()=>{
   frame=0;
   if(Date.now()<suppressScrollTrackingUntil.current)return;
   const available=groups.map(group=>({id:group.id,element:document.getElementById(group.id)})).filter((entry):entry is {id:string;element:HTMLElement}=>!!entry.element);
   if(!available.length)return;
   // The section nearest the navigation's lower edge is the one the reader is viewing.
   const threshold=(groupNav.current?.parentElement?.getBoundingClientRect().bottom??groupNav.current?.getBoundingClientRect().bottom??0)+12;
   const preceding=available.filter(entry=>entry.element.getBoundingClientRect().top<=threshold);
   const current=preceding.at(-1)??available[0];
   setActiveGroup(previous=>previous===current.id?previous:current.id);
  };
  refreshAfterJump.current=update;
  const onScroll=(event:Event)=>{
   const target=event.target;
   if(target instanceof Node&&(groupNav.current?.contains(target)||subgroupNav.current?.contains(target)))return;
   if(!frame)frame=requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll',onScroll,true);
  window.addEventListener('resize',onScroll);
  return ()=>{window.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',onScroll);if(frame)cancelAnimationFrame(frame);};
 },[contextualSubgroups,groups.map(group=>group.id).join('|')]);
 const renderRow=(items:CatalogJump[],kind:'group'|'subgroup')=><nav ref={kind==='group'?groupNav:subgroupNav} aria-label={'Jump to '+title.toLowerCase()+' '+(kind==='group'?'section':'subgroup')} className="flex gap-2 overflow-x-auto pb-0" style={{scrollbarWidth:'thin'}}>
  {items.map(item=>{
   const selected=(kind==='group'?activeGroup:activeSubgroup)===item.id;
   return <button key={item.id} data-jump-id={item.id} type="button" aria-label={kind==='subgroup'?item.label:undefined} onClick={()=>jump(item.id,kind)} aria-current={selected?'location':undefined} className={'shrink-0 rounded-lg border px-2.5 py-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold '+(selected?'border-gold bg-gold/20 text-gold':kind==='group'?'border-gold/40 text-gold':'border-white/30')}>{kind==='group'?item.label:item.label.split(' — ').at(-1)}</button>;
  })}
 </nav>;
 return <div aria-label={title+' section navigation'} className={(embedded?'':'sticky top-0 z-20 ')+'space-y-0.5 rounded-md border border-gold/30 bg-ink/95 p-1 shadow-lg backdrop-blur'}>
  {groups.length>0&&renderRow(groups,'group')}
  {subgroups.length>0&&(!contextualSubgroups||activeGroup)&&renderRow(contextualSubgroups?subgroups.filter(item=>item.parentId===activeGroup):subgroups,'subgroup')}
 </div>;
}
