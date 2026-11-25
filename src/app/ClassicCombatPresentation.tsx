import {Droplet} from 'lucide-react';
import type {CSSProperties,ReactNode} from 'react';

/** The historical combat initiative roster. Both the legacy duel and Phase 3
 * now render this same component. Initiative and HP stay in the rule engine. */
export type ClassicInitiativeEntry={id:string;name:string;initiative?:number;status?:'Bloodied'|'Defeated'|'';conditions?:string[];summary?:string};
export function ClassicInitiativeList({entries,activeId}:{entries:ClassicInitiativeEntry[];activeId?:string}){
 return <ol className="space-y-1" aria-label="Initiative order" data-classic-initiative="true">{entries.map((actor,index)=>{
  const current=actor.id===activeId;
  return <li key={actor.id} className={`rounded-lg border px-3 py-2 ${actor.status==='Defeated'?'border-white/10 bg-black/30 opacity-60':current?'border-gold bg-gold/15':'border-white/15'}`}>
   <div className="flex items-center justify-between gap-2"><span><span className="mr-2 text-parchment/60">{index+1}.</span><strong className={current?'text-gold':''}>{actor.name}</strong>{current&&<span className="ml-2 text-xs text-gold">CURRENT</span>}</span>
    <span className="flex items-center gap-2">{actor.status==='Bloodied'&&<Droplet aria-label="Bloodied" className="h-3.5 w-3.5 text-red-400" fill="currentColor"/>}{actor.status==='Defeated'&&<span className="text-xs text-red-300">Defeated</span>}<span className="tabular-nums">{actor.initiative??'—'}</span></span>
   </div>
   {!!actor.conditions?.filter(Boolean).length&&<p className="pl-5 text-xs text-amber-200">{actor.conditions.filter(Boolean).join(' · ')}</p>}
   <p className="mt-1 pl-5 text-xs leading-relaxed text-parchment/75">{actor.summary||'—'}</p>
  </li>;
 })}</ol>;
}

/** Four-slot action economy strip preserved from the original combat UI. */
export function ClassicCombatResources({action,bonus,move,reaction}:{action:boolean;bonus:boolean;move:number;reaction:boolean}){
 return <div aria-label="Combat resources" className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
  {([['ACTION',action?'Spent':'Ready'],['BONUS',bonus?'Spent':'Ready'],['MOVE',Math.max(0,move)+' ft'],['REACTION',reaction?'Spent':'Ready']] as const).map(([name,value])=><div key={name} className="rounded bg-white/10 p-1"><span className="block text-[10px] text-parchment/60">{name}</span><strong>{value}</strong></div>)}
 </div>;
}

/** Original combat board's 21px-per-square grid and zoom behavior. */
export function ClassicCombatGrid({size,zoom=1,backgroundImage,dynamic=false,children,ariaLabel='Combat movement grid',role='grid'}:{size:number;zoom?:number;dynamic?:boolean;backgroundImage?:string;children:ReactNode;ariaLabel?:string;role?:'grid'|'group'}){
 const style:CSSProperties={gridTemplateColumns:`repeat(${size},minmax(0,1fr))`,width:`${size*21*zoom}px`,minWidth:dynamic?'0':'100%',backgroundImage:backgroundImage?`url(${backgroundImage})`:undefined,backgroundSize:'100% 100%'};
 return <div role={role} aria-label={ariaLabel} data-classic-combat-grid="true" className="grid gap-0 p-0" style={style}>{children}</div>;
}
export const classicCombatCellBase='aspect-square rounded border text-xs font-bold min-w-0';
