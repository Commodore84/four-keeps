import {useEffect,useRef,useState} from 'react';
import type {ExplorationScene} from '../game/explorationScene';
import {objectAt,battlefieldBlocked,type BattlefieldObject} from '../game/battlefield';
import {battlefieldTileName,battlefieldObjectArtworkStyle} from './battlefieldIllustrations';
import {ClassicCombatGrid} from './ClassicCombatPresentation';
import {ClassicCombatMapFrame} from './ClassicCombatMapFrame';

/** A noncombat view of the exact saved combat geometry. The conversation is
 * authoritative for exploration intentions; this view spends no actions or movement. */
export function ExplorationSceneMap({scene,onInspect}:{scene:ExplorationScene;onInspect:(text:string)=>void}){
 const [zoom,setZoom]=useState(1);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [selectedSquare,setSelectedSquare]=useState<{x:number;y:number}|null>(null);
 const frame=useRef<HTMLDivElement>(null);
 const map=scene.battlefield;
 const selected=map.objects.find(obj=>obj.id===selectedId&&!obj.destroyed);
 const selectedFeature=selectedSquare?scene.features?.find(f=>f.discovered&&f.position.x===selectedSquare.x&&f.position.y===selectedSquare.y):undefined;
 const selectedDoorTrap=selected?scene.features?.find(f=>f.kind==='trap'&&f.targetObjectId===selected.id&&f.discovered):undefined;
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
  setSelectedSquare(null);
  const el=frame.current;if(!el)return;
  // Small interiors fit their physical viewport instead of leaving a narrow
  // 8-by-6 grid in a mostly empty frame. Larger scenes retain normal zoom.
  const fitZoom=Math.max(1,Math.min(2.5,
    (el.clientWidth-8)/(map.width*21),(el.clientHeight-8)/(map.height*21)));
  const initialZoom=Math.round(fitZoom*100)/100;
  setZoom(initialZoom);
  requestAnimationFrame(()=>{
    if(frame.current!==el)return;
    el.scrollLeft=Math.max(0,(scene.playerPosition.x+.5)*21*initialZoom-el.clientWidth/2);
    el.scrollTop=Math.max(0,(scene.playerPosition.y+.5)*21*initialZoom-el.clientHeight/2);
  });
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
  <ClassicCombatMapFrame ref={frame} className={map.height<=2?"h-[108px] max-h-[40dvh]":map.height<=4?"h-[156px] max-h-[40dvh]":map.width<=12&&map.height<=10?"h-[240px] max-h-[40dvh]":"h-[290px] max-h-[40dvh]"} style={{overflow:'auto',touchAction:'pan-x pan-y'}}>
   <ClassicCombatGrid size={map.width} height={map.height} zoom={zoom} dynamic theme={map.theme} ariaLabel="DM-presented exploration map">
    {Array.from({length:map.width*map.height},(_,i)=>{
     const x=i%map.width,y=Math.floor(i/map.width),own=x===scene.playerPosition.x&&y===scene.playerPosition.y;
     const obj=objectAt(map,{x,y}).find(o=>!o.destroyed);
     const blocked=battlefieldBlocked(map,{x,y});
     const interact=!!obj&&['door','window','table','crate','cargo','chair','pillar','rock','tree'].includes(obj.kind);
     const feature=scene.features?.find(f=>f.discovered&&f.position.x===x&&f.position.y===y);
     const content=own?<span aria-label="Character location" className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-300 text-[10px] font-bold text-black">P</span>:null;
     const styles={gridColumnStart:x+1,gridRowStart:y+1,minHeight:0,borderRadius:0,...battlefieldObjectArtworkStyle(obj,x,y,zoom)};
     if(!interact && feature)return <button key={i} type="button" role="gridcell" aria-label={'Examine '+feature.kind+' '+feature.label}
      onClick={()=>{setSelectedId(null);setSelectedSquare({x,y});}}
      data-terrain-art={battlefieldTileName(map,obj,x,y)} style={styles}
      className="relative aspect-square min-w-0 border border-amber-400/50 text-[10px] text-gold">{content??(feature.kind==='mechanism'?(feature.activated?'✓':'◉'):feature.kind==='trap'?(feature.disarmed?'✓':feature.triggered?'!':'?'):'?')}</button>;
     return interact?<button type="button" key={i} role="gridcell" data-terrain-art={battlefieldTileName(map,obj,x,y)}
      aria-label={'Inspect '+label(obj!)+' at '+(x+1)+', '+(y+1)} aria-pressed={selectedId===obj!.id}
      onClick={()=>{setSelectedId(obj!.id);setSelectedSquare(null);}} style={styles}
      className={'relative aspect-square min-w-0 border '+(selectedId===obj!.id?'border-gold bg-gold/15':'border-white/10')}>{content}</button>:
      <button key={i} type="button" role="gridcell" aria-label={own?'Character location':blocked?'Blocked square '+(x+1)+', '+(y+1):'Explore square '+(x+1)+', '+(y+1)} disabled={blocked} onClick={()=>{setSelectedId(null);setSelectedSquare({x,y});}} data-terrain-art={battlefieldTileName(map,obj,x,y)} style={styles} className="relative aspect-square min-w-0 border border-white/10">{content}</button>;
    })}
   </ClassicCombatGrid>
  </ClassicCombatMapFrame>
  {selected&&<div aria-label="Selected exploration object" className="flex items-center justify-between gap-2 rounded-lg border border-gold/30 p-2 text-sm">
   <span>{label(selected)} · {selected.x+1}, {selected.y+1}</span>
   <div className="flex gap-1">
    <button type="button" onClick={()=>onInspect('I want to inspect the '+label(selected).toLowerCase()+' at '+(selected.x+1)+', '+(selected.y+1)+'.')} className="min-h-11 rounded border border-gold/50 px-2 text-gold">Ask DM</button>
    {['door','window'].includes(selected.kind)&&<button type="button" onClick={()=>onInspect(selected.locked?
     'I use my Thieves’ Tools to pick the lock on '+selected.id+'.':
     'I '+(selected.open?'close':'open')+' the '+selected.kind+' '+selected.id+'.')}
     className="min-h-11 rounded border border-gold/50 px-2 text-gold">{selected.locked?'Pick lock':selected.open?'Close':'Open'}</button>}
   </div>
  </div>}
  {selected&&['crate','chair'].includes(selected.kind)&&selected.width===1&&selected.height===1&&
   <div aria-label="Move selected object" className="flex items-center justify-between gap-2 text-xs">
    <span className="text-parchment/65">Move {selected.kind}</span>
    <div className="flex gap-1">
     {(['north','east','south','west'] as const).map(dir=><button key={dir} type="button"
       onClick={()=>onInspect('I push the '+selected.kind+' '+selected.id+' one square '+dir+'.')}
       className="min-h-11 min-w-11 rounded border border-gold/50 px-2 text-gold" aria-label={'Push '+selected.kind+' '+dir}>
       {{north:'N',east:'E',south:'S',west:'W'}[dir]}
     </button>)}
    </div>
   </div>}
  {selectedDoorTrap&&<div className="flex items-center justify-between gap-2 text-xs text-gold">
   <span>{selectedDoorTrap.disarmed?'Disarmed trap':selectedDoorTrap.triggered?'Sprung trap':'Detected trap'}: {selectedDoorTrap.label}</span>
   {!selectedDoorTrap.disarmed&&!selectedDoorTrap.triggered&&<button type="button" onClick={()=>onInspect('I use my Thieves’ Tools to disarm '+selectedDoorTrap.label+' on '+selected?.id+'.')} className="min-h-11 rounded border border-gold/50 px-2">Disarm</button>}
  </div>}
  {selectedSquare&&<div aria-label="Selected exploration square" className="flex items-center justify-between gap-2 rounded-lg border border-gold/30 p-2 text-sm">
   <span>{selectedFeature?
      ((selectedFeature.kind==='mechanism'?(selectedFeature.activated?'Activated mechanism':'Mechanism'):selectedFeature.kind==='trap'?(selectedFeature.disarmed?'Disarmed trap':selectedFeature.triggered?'Triggered trap':'Trap'):'Clue')+': '+selectedFeature.label):
      'Square '+(selectedSquare.x+1)+', '+(selectedSquare.y+1)}</span>
   <button type="button" onClick={()=>onInspect(selectedFeature?
     selectedFeature.kind==='mechanism'?'I pull the '+selectedFeature.label+' and observe its effect.':
     'I inspect the '+selectedFeature.label+' more closely.':
     'I move to square '+(selectedSquare.x+1)+', '+(selectedSquare.y+1)+' and look around carefully.')} className="min-h-11 rounded border border-gold/50 px-3 text-gold">{selectedFeature?.kind==='mechanism'?'Use mechanism':selectedFeature?'Ask DM about feature':'Ask DM to move'}</button>
  </div>}
  <p className="text-xs text-parchment/65">Explore through conversation. Tap an object to ask the DM about it. The map does not move your character or spend actions until the DM resolves your request.</p>
 </section>;
}
