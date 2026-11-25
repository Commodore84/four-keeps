import type {BattlefieldObject} from '../game/battlefield';
import {fixtureStats} from '../game/battlefieldFixtures';
import type {DuelFixtureAction} from '../game/campaign';

/** Compact optional fixture interactions inside the ORIGINAL classic combat card. */
export function CombatFixtureControls({fixtures,selectedId,onSelect,canAction,canFree,onAction,onFree}:{
 fixtures:BattlefieldObject[];selectedId:string|null;onSelect:(id:string|null)=>void;canAction:boolean;canFree:boolean;
 onAction:(id:string,action:DuelFixtureAction)=>void;onFree:(id:string)=>void;
}){
 if(!fixtures.length)return null;
 const selected=fixtures.find(object=>object.id===selectedId);
 return <div role="group" aria-label="Nearby fixture controls" className="rounded-lg border border-white/20 p-2 text-xs space-y-1.5">
  <div className="flex items-center gap-2">
   <label htmlFor="battlefield-fixture-select" className="text-parchment/80 shrink-0">Fixture</label>
   <select id="battlefield-fixture-select" aria-label="Select nearby fixture" value={selected?.id??''}
    onChange={event=>onSelect(event.target.value||null)}
    className="min-w-0 flex-1 rounded border border-white/30 bg-ink px-2 py-1">
    <option value="">Choose nearby fixture</option>
    {fixtures.map(object=><option key={object.id} value={object.id}>
      {(object.locked?'Locked ':'')+object.kind+' at '+(object.x+1)+', '+(object.y+1)}
    </option>)}
   </select>
  </div>
  {selected&&<div className="space-y-1">
   <div className="text-parchment/70" aria-label="Fixture condition">
    {(selected.locked?'Locked':'Unlocked')+' · '+(selected.open?'Open':'Closed')+
    ' · AC '+fixtureStats(selected).ac+' · HP '+fixtureStats(selected).hp}
   </div>
   <div className="flex flex-wrap gap-1.5">
    {selected.locked&&<button type="button" disabled={!canAction} className="rounded border border-gold/70 px-2 py-1 disabled:opacity-40"
      onClick={()=>onAction(selected.id,'pick')}>Pick lock (Action)</button>}
    {(selected.kind==='door'||selected.kind==='window')&&!selected.open&&
     <button type="button" disabled={!canAction} className="rounded border border-white/30 px-2 py-1 disabled:opacity-40"
      onClick={()=>onAction(selected.id,'force')}>Force open (Action)</button>}
    <button type="button" disabled={!canAction} className="rounded border border-white/30 px-2 py-1 disabled:opacity-40"
      onClick={()=>onAction(selected.id,'strike')}>Strike fixture (Action)</button>
    {(selected.kind==='door'||selected.kind==='window')&&!selected.locked&&
     <button type="button" disabled={!canFree} className="rounded border border-sky-300/50 px-2 py-1 disabled:opacity-40"
      onClick={()=>onFree(selected.id)}>{(selected.open?'Close':'Open')+' (Free)'}</button>}
   </div>
  </div>}
 </div>;
}
