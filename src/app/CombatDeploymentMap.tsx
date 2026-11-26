import {useEffect,useRef,useState} from 'react';
import {UserRound} from 'lucide-react';
import {battlefieldBlocked,objectAt,type Battlefield,type BattlefieldPoint} from '../game/battlefield';
import {battlefieldTileName,battlefieldObjectArtworkStyle} from './battlefieldIllustrations';
import {ClassicCombatGrid} from './ClassicCombatPresentation';
import {ClassicCombatMapFrame} from './ClassicCombatMapFrame';
import {canDeployAt,type Campaign} from '../game/campaign';

/** The same saved physical battlefield, but never enemy tokens or enemy coordinates.
 * Deployment targets have no dependence on hidden enemy locations.
 */
export function CombatDeploymentMap({combat,onSelect,disabled=false}:{
 combat:NonNullable<Campaign['combat']>;onSelect:(point:BattlefieldPoint)=>void;disabled?:boolean
}){
 const map=combat.battlefield as Battlefield;
 const [zoom,setZoom]=useState(1.8);
 const frame=useRef<HTMLDivElement>(null);
 const selected=combat.playerPosition??combat.entryOptions?.[0]?.square??{x:2,y:4};
 useEffect(()=>{
  const el=frame.current;if(!el)return;
  el.scrollLeft=Math.max(0,(selected.x+.5)*21*zoom-el.clientWidth/2);
  el.scrollTop=Math.max(0,(selected.y+.5)*21*zoom-el.clientHeight/2);
 // Focus the entry on initial display; user panning shouldn't be undone by selecting a square.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[map]);
 return <section aria-label="Choose starting position" className="space-y-2">
  <div className="flex items-center justify-between gap-2">
   <div><p className="font-semibold text-gold">Choose your starting position</p>
    <p className="text-xs text-parchment/70">Tap a highlighted square. Enemy positions stay hidden until initiative.</p></div>
   <div className="flex shrink-0 gap-1">
    <button type="button" aria-label="Zoom deployment map out" onClick={()=>setZoom(v=>Math.max(1,Math.round((v-.25)*100)/100))} className="rounded border border-white/30 px-2 py-1">−</button>
    <button type="button" aria-label="Zoom deployment map in" onClick={()=>setZoom(v=>Math.min(3,Math.round((v+.25)*100)/100))} className="rounded border border-white/30 px-2 py-1">+</button>
   </div>
  </div>
  <ClassicCombatMapFrame ref={frame} style={{overflow:'auto',touchAction:'pan-x pan-y'}} className="h-[360px]">
   <ClassicCombatGrid size={map.width} height={map.height} theme={map.theme} dynamic zoom={zoom} ariaLabel="Starting position battlefield map">
    {Array.from({length:map.width*map.height},(_,i)=>{
     const x=i%map.width,y=Math.floor(i/map.width),point={x,y};
     const legal=canDeployAt(combat,point),own=selected.x===x&&selected.y===y;
     const obj=objectAt(map,point)[0];
     const blocked=battlefieldBlocked(map,point);
     return <button key={i} type="button" role="gridcell" data-battlefield-x={x} data-battlefield-y={y}
      data-terrain-art={battlefieldTileName(map,obj,x,y)}
      aria-label={own?'Your selected starting square':legal?'Choose starting square '+(x+1)+', '+(y+1):'Outside deployment area'}
      aria-pressed={legal?own:undefined} disabled={disabled||!legal}
      onClick={()=>onSelect(point)}
      className={'relative min-w-0 border aspect-square flex items-center justify-center '+(own?'border-amber-200 bg-amber-300/60 ring-2 ring-inset ring-amber-200 text-amber-100 z-10':legal?'border-sky-300/90 bg-sky-400/20 cursor-pointer':'border-white/10 opacity-75')}
      style={{gridColumnStart:x+1,gridRowStart:y+1,minHeight:0,borderRadius:0,...battlefieldObjectArtworkStyle(obj,x,y,zoom)}}>
      {own?<UserRound size={18} aria-label="Player" className="drop-shadow-[0_1px_2px_#000]"/>:legal&&!blocked?<span aria-hidden="true" className="h-1 w-1 rounded-full bg-sky-200/90"/>:null}
     </button>;
    })}
   </ClassicCombatGrid>
  </ClassicCombatMapFrame>
  <p className="text-xs text-parchment/75">Blue squares: available deployment area · Gold: your position. Pan to explore the battlefield. No movement is spent before initiative.</p>
 </section>;
}
