import {useEffect,useRef,useState} from 'react';
import type {ExplorationScene} from '../game/explorationScene';
import {objectAt,type BattlefieldObject} from '../game/battlefield';
import {battlefieldTileName,battlefieldObjectArtworkStyle} from './battlefieldIllustrations';
import {ClassicCombatGrid} from './ClassicCombatPresentation';
import {ClassicCombatMapFrame} from './ClassicCombatMapFrame';

/** A noncombat view of the exact saved combat geometry. The conversation is
 * authoritative for exploration intentions; this view spends no actions or movement. */
export function ExplorationSceneMap({scene,onInspect}:{scene:ExplorationScene;onInspect:(text:string)=>void}){
 const [zoom,setZoom]=useState(1);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const frame=useRef<HTMLDivElement>(null);
 const map=scene.battlefield;
 const selected=map.objects.find(obj=>obj.id===selectedId&&!obj.destroyed);
 const focus=(next:number)=>{
  const el=frame.current;
  const z=Math.max(.25,Math.min(2.5,Math.round(next*100)/100));
  if(!el||z===zoom)return;
  const x=(el.scrollLeft+el.clientWidth/2)/(21*zoom),y=(el.scrollTop+el.clientHeight/2)/(21*zoom);
  setZoom(z);
  requestAnimationFrame(()=>{if(frame.current){frame.current.scrollLeft=x*21*z-frame.current.clientWidth/2;frame.current.scrollTop=y*21*z-frame.current.clientHeight/2;}});
 };
 const fit=()=>{
  const el=frame.current;if(!el)return;
  const z=Math.max(.25,Math.min(2.5,(el.clientWidth-8)/(map.width*21),(el.clientHeight-8)/(map.height*21)));
  setZoom(Math.round(z*100)/100);
  requestAnimationFrame(()=>{if(frame.current){frame.current.scrollLeft=(map.width*21*z-frame.current.clientWidth)/2;frame.current.scrollTop=(map.height*21*z-frame.current.clientHeight)/2;}});
 };
 useEffect(()=>{
  setSelectedId(null);
  const el=frame.current;if(!el)return;
  el.scrollLeft=Math.max(0,(scene.playerPosition.x+.5)*21*zoom-el.clientWidth/2);
  el.scrollTop=Math.max(0,(scene.playerPosition.y+.5)*21*zoom-el.clientHeight/2);
 // Opening an already saved scene should not recenter each time the DM talks.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[scene.id]);
 const label=(o:BattlefieldObject)=>[o.locked?'Locked':o.open?'Open':undefined,o.kind].filter(Boolean).join(' ');
 return <section aria-label="DM scene map" className="space-y-2 rounded-xl border border-gold/35 bg-panel p-3">
  <div className="flex items-center justify-between gap-2">
   <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-gold">Scene map · Dungeon Master</p>
    <h3 className="truncate font-serif text-lg">{scene.title}</h3></div>
   <div className="flex shrink-0 gap-1">
    <button type="button" aria-label="Zoom scene map out" disabled={zoom<=.25} onClick={()=>focus(zoom-.25)} className="min-h-11 min-w-11 rounded border border-white/25">−</button>
    <button type="button" aria-label="Zoom scene map in" disabled={zoom>=2.5} onClick={()=>focus(zoom+.25)} className="min-h-11 min-w-11 rounded border border-white/25">+</button>
    <button type="button" aria-label="Fit scene map" onClick={fit} className="min-h-11 rounded border border-gold/40 px-3 text-xs text-gold">Fit</button>
   </div>
  </div>
  <ClassicCombatMapFrame ref={frame} className="h-[290px] max-h-[40dvh]" style={{overflow:'auto',touchAction:'pan-x pan-y'}}>
   <ClassicCombatGrid size={map.width} height={map.height} zoom={zoom} dynamic theme={map.theme} ariaLabel="DM-presented exploration map">
    {Array.from({length:map.width*map.height},(_,i)=>{
     const x=i%map.width,y=Math.floor(i/map.width),own=x===scene.playerPosition.x&&y===scene.playerPosition.y;
     const obj=objectAt(map,{x,y}).find(o=>!o.destroyed);
     const interact=!!obj&&['door','window','table','crate','cargo','chair','pillar','rock','tree'].includes(obj.kind);
     const content=own?<span aria-label="Character location" className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-300 text-[10px] font-bold text-black">P</span>:null;
     const styles={gridColumnStart:x+1,gridRowStart:y+1,minHeight:0,borderRadius:0,...battlefieldObjectArtworkStyle(obj,x,y,zoom)};
     return interact?<button type="button" key={i} role="gridcell" data-terrain-art={battlefieldTileName(map,obj,x,y)}
      aria-label={'Inspect '+label(obj!)+' at '+(x+1)+', '+(y+1)} aria-pressed={selectedId===obj!.id}
      onClick={()=>setSelectedId(obj!.id)} style={styles}
      className={'relative aspect-square min-w-0 border '+(selectedId===obj!.id?'border-gold bg-gold/15':'border-white/10')}>{content}</button>:
      <div key={i} role="gridcell" aria-label={own?'Character location':'Terrain'} data-terrain-art={battlefieldTileName(map,obj,x,y)} style={styles} className="relative aspect-square min-w-0 border border-white/10">{content}</div>;
    })}
   </ClassicCombatGrid>
  </ClassicCombatMapFrame>
  {selected&&<div aria-label="Selected exploration object" className="flex items-center justify-between gap-2 rounded-lg border border-gold/30 p-2 text-sm">
   <span>{label(selected)} · {selected.x+1}, {selected.y+1}</span>
   <button type="button" onClick={()=>onInspect('I want to inspect the '+label(selected).toLowerCase()+' at '+(selected.x+1)+', '+(selected.y+1)+'.')} className="min-h-11 rounded border border-gold/50 px-3 text-gold">Ask DM</button>
  </div>}
  <p className="text-xs text-parchment/65">Explore through conversation. Tap an object to ask the DM about it. The map does not move your character or spend actions.</p>
 </section>;
}
