import {visibleDynamicSites,clusterDynamicSites} from '../game/anchamidaDynamic';
import {useEffect,useRef,useState} from 'react';
import type {PointerEvent, WheelEvent} from 'react';
import type {Campaign} from '../game/campaign';
import {anchamidaLocations, visibleAnchamidaLocations, anchamidaDMConstraints} from '../game/anchamida';

type Gesture={x:number;y:number;distance?:number};
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

/** Campaign knowledge is authoritative; the map never writes discoveries just by viewing a pin. */
export function AnchamidaRegionMap({campaign}:{campaign:Campaign|null}) {
  const [zoom,setZoom]=useState(1);
  const [offset,setOffset]=useState({x:0,y:0});
  const [selected,setSelected]=useState<string|null>(null);
  const [imageFailed,setImageFailed]=useState(false);
  const [showList,setShowList]=useState(false);
  const [filter,setFilter]=useState<'all'|'predefined'|'dynamic'>('all');
  const [search,setSearch]=useState('');
  const frame=useRef<HTMLDivElement|null>(null);
  const gesture=useRef<Gesture|null>(null);
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const key='four-keeps-anchamida-viewport-'+(campaign?.id??'preview');
  useEffect(()=>{
    try {
      const v=JSON.parse(localStorage.getItem(key)??'null');
      setZoom(Number.isFinite(v?.zoom)?clamp(v.zoom,1,6):1);
      setOffset(Number.isFinite(v?.x)&&Number.isFinite(v?.y)?{x:v.x,y:v.y}:{x:0,y:0});
    } catch {setZoom(1);setOffset({x:0,y:0});}
    setSelected(null);
    pointers.current.clear();gesture.current=null;
  },[key]);
  useEffect(()=>{
    try {localStorage.setItem(key,JSON.stringify({zoom,x:offset.x,y:offset.y}));}catch{/* Private browsing */}
  },[key,zoom,offset.x,offset.y]);
  const visible=visibleAnchamidaLocations(campaign?.mapDiscovered??[]);
  const dynamic=visibleDynamicSites(campaign,Date.now());
  const allDynamic=(campaign?.mapDynamicSites??[]).filter(s=>s.discovered&&!s.archived&&!s.hidden&&(s.kind!=='temporary'||s.expiresAt===undefined||s.expiresAt>Date.now()));
  const clusters=clusterDynamicSites(dynamic,zoom);
  const site=selected?visible.find(p=>p.id===selected):undefined;
  const dynamicSite=selected?allDynamic.find(p=>p.id===selected):undefined;
  const identity=site?campaign?.mapPoiIdentities?.[site.id]:undefined;
  const reset=()=>{setZoom(1);setOffset({x:0,y:0});};
  const focusSite=(id:string,x:number,y:number)=>{
    setSelected(id);
    const rect=frame.current?.getBoundingClientRect();
    if(!rect)return;
    const width=Math.min(rect.width,rect.height*2/3);
    const height=width*1.5;
    const targetZoom=3;
    setZoom(targetZoom);
    setOffset({x:-(x/100-.5)*width*targetZoom,y:-(y/100-.5)*height*targetZoom});
  };
  const move=(e:PointerEvent<HTMLDivElement>)=>{
    if(!pointers.current.has(e.pointerId))return;
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const pts=[...pointers.current.values()];
    const center={x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length};
    const distance=pts.length>1?Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y):undefined;
    const previous=gesture.current;
    if(previous) {
      setOffset(v=>({x:v.x+center.x-previous.x,y:v.y+center.y-previous.y}));
      if(distance&&previous.distance)setZoom(v=>clamp(v*distance/previous.distance!,1,6));
    }
    gesture.current={...center,distance};
  };
  const onWheel=(e:WheelEvent<HTMLDivElement>)=>{if(e.ctrlKey){e.preventDefault();setZoom(v=>clamp(v+(e.deltaY<0?.15:-.15),1,6));}};
  return <section aria-label="Anchamida regional map" className="flex h-full min-h-0 flex-col">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="font-serif text-lg">Anchamida</h2>
      <div className="flex gap-1">
        <button aria-label="Toggle location list" className="rounded border border-gold/40 px-2 py-1.5 text-xs" onClick={()=>setShowList(v=>!v)}>Locations</button>
        <button aria-label="Zoom out" className="rounded border border-gold/40 px-3 py-1.5" onClick={()=>setZoom(v=>clamp(v-.5,1,6))}>−</button>
        <button aria-label="Zoom in" className="rounded border border-gold/40 px-3 py-1.5" onClick={()=>setZoom(v=>clamp(v+.5,1,6))}>+</button>
        <button className="rounded border border-gold/40 px-2 py-1.5 text-xs" onClick={reset}>Reset</button>
      </div>
    </div>
    {showList&&<div className="mb-2 max-h-48 overflow-auto rounded border border-gold/40 p-2 text-sm" aria-label="Discovered map locations">
      <label className="block text-xs">Search locations <input aria-label="Search map locations" value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded border bg-transparent p-1"/></label>
      <div className="flex gap-2 py-1">{(['all','predefined','dynamic'] as const).map(v=><button key={v} aria-pressed={filter===v} onClick={()=>setFilter(v)} className="rounded border px-2 py-1 text-xs">{v==='all'?'All':v==='predefined'?'Predefined':'Additional'}</button>)}</div>
      <p className="text-xs">{allDynamic.length} additional discovered · {dynamic.length} shown as markers</p>
      {[
        ...(filter==='dynamic'?[]:visible.map(s=>({id:s.id,name:campaign?.mapPoiIdentities?.[s.id]?.name||s.name||'Unnamed discovery',x:s.x,y:s.y}))),
        ...(filter==='predefined'?[]:allDynamic.map(s=>({id:s.id,name:s.name,x:s.x,y:s.y})))
      ].filter(s=>s.name.toLowerCase().includes(search.toLowerCase())).map(s=><button key={s.id} className="block w-full border-b border-gold/20 py-1 text-left" onClick={()=>focusSite(s.id,s.x,s.y)}>{s.name}</button>)}
    </div>}
    <p className="mb-1 text-xs text-parchment/60">Drag to pan · Pinch to zoom · Only discovered locations appear</p>
    <div ref={frame} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-gold/40 bg-[#d6c39a]" style={{touchAction:'none',containerType:'size'}}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture.current=null;}}
      onPointerMove={move}
      onPointerUp={e=>{pointers.current.delete(e.pointerId);gesture.current=null;}}
      onPointerCancel={e=>{pointers.current.delete(e.pointerId);gesture.current=null;}}
      onWheel={onWheel}>
      <div className="absolute inset-0 flex items-center justify-center" style={{transform:`translate(${offset.x}px,${offset.y}px) scale(${zoom})`,transformOrigin:'center'}}>
        <div className="relative" style={{aspectRatio:'2 / 3',width:'min(100cqw, calc(100cqh * 2 / 3))'}}>
          {!imageFailed?<img src="/anchamida-region.webp" draggable={false} alt="Anchamida illustrated regional terrain" className="absolute inset-0 h-full w-full object-contain select-none" onError={()=>setImageFailed(true)}/>:<div role="img" aria-label="Regional artwork unavailable" className="absolute inset-0 flex items-center justify-center bg-[#b8b092] px-5 text-center text-sm text-[#40372a]">Regional artwork pending installation</div>}
          {clusters.map(cluster=><button key={cluster.sites.map(s=>s.id).join('-')} type="button" title={cluster.sites.map(s=>s.name).join(', ')} aria-label={cluster.sites.length>1?cluster.sites.length+' nearby locations':cluster.sites[0].name} style={{left:cluster.x+'%',top:cluster.y+'%',transform:`translate(-50%,-50%) scale(${1/zoom})`}} className="absolute z-20 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-800 px-1 text-xs text-white shadow-md" onClick={()=>{if(cluster.sites.length===1)setSelected(cluster.sites[0].id);else setZoom(v=>Math.min(v+1,6));}}>{cluster.sites.length>1?cluster.sites.length:'•'}</button>)}
          {visible.map(p=><button key={p.id} type="button" onClick={()=>setSelected(p.id)} title={identity?.name||p.name||'Uncharted location'} aria-label={identity?.name||p.name||'Discovered location'} style={{left:p.x+'%',top:p.y+'%',transform:`translate(-50%,-50%) scale(${1/zoom})`}} className="absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#fff4d9] bg-[#8e342d] text-xs text-white shadow-md">{p.type==='city'?'⌂':'•'}</button>)}
        </div>
      </div>
    </div>
    <div className="mt-2 text-xs text-parchment/70">{visible.length} of {anchamidaLocations.length} locations discovered · {dynamic.length} additional mapped</div>
    {dynamicSite&&<div role="region" aria-label="Discovered location details" className="mt-2 rounded-lg border border-gold/30 p-3 text-sm"><div className="flex justify-between"><strong>{dynamicSite.name}</strong><button onClick={()=>setSelected(null)}>Close</button></div><p>{dynamicSite.description}</p></div>}
    {site&&<div role="region" aria-label="Discovered location details" className="mt-2 rounded-lg border border-gold/30 p-3 text-sm">
      <div className="flex justify-between gap-3"><strong>{identity?.name||site.name||'Uncharted location'}</strong><button onClick={()=>setSelected(null)} aria-label="Close location details">Close</button></div>
      {(identity?.description||anchamidaDMConstraints(site).terrain)&&<p className="mt-1 text-parchment/75">{identity?.description||anchamidaDMConstraints(site).terrain}</p>}
    </div>}
  </section>;
}
