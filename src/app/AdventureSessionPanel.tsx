import {useState} from 'react';
import type {Campaign} from '../game/campaign';
import {ADVENTURE_SITES,beginAdventureSession,travelAdventure,interactAdventure,enterAdventureEncounter,resumeAdventureExploration} from '../game/adventureSession';
import {CompanionEncounterPanel} from './CompanionEncounterPanel';
export function AdventureSessionPanel({campaign,saving,onChange}:{campaign:Campaign;saving:boolean;onChange:(next:Campaign,message:string)=>void}){
 const [companion,setCompanion]=useState('');
 const [nighthawkRoll,setNighthawkRoll]=useState('');
 const [companionRoll,setCompanionRoll]=useState('');
 const [companionHp,setCompanionHp]=useState('');
 const [feedback,setFeedback]=useState('');
 const session=campaign.adventureSession;
 const apply=(fn:()=>Campaign,message:string)=>{try{onChange(fn(),message);setFeedback('')}catch(error){setFeedback(String(error))}};
 const companions=Object.keys(campaign.subclassActors??{});
 return <section aria-label="Adventure session" className="rounded-xl border border-gold/30 bg-panel p-4 space-y-3">
 <h3 className="font-serif text-xl">Playable adventure path</h3>
 {!session?<><p className="text-sm text-parchment/70">Start a small authored adventure using the saved campaign character. The separate character-builder drafts are not yet imported. Narrative choices here are scripted; the existing AI DM conversation remains available below.</p><button disabled={saving||!campaign.character} onClick={()=>apply(()=>beginAdventureSession(campaign),'Adventure session started')} className="rounded border border-gold/40 px-3 py-2">Start frontier adventure</button></>:
 <><p aria-label="Adventure session status">Session: {session.status} · Character: saved campaign character · Visited {session.visited.length}/3 locations</p>
 <h4 className="font-semibold">{ADVENTURE_SITES[session.site].name}</h4><p className="text-sm">{ADVENTURE_SITES[session.site].description}</p>
 {session.status==='exploring'&&<><div className="flex flex-wrap gap-2">{ADVENTURE_SITES[session.site].options.map(option=><button key={option.id} disabled={saving} onClick={()=>apply(()=>interactAdventure(campaign,option.id),'Narrative interaction saved')} className="rounded border border-white/30 px-3 py-2">{option.label}</button>)}</div>
 <div className="flex flex-wrap gap-2">{ADVENTURE_SITES[session.site].neighbors.map(id=><button key={id} disabled={saving} onClick={()=>apply(()=>travelAdventure(campaign,id),'Travel saved')} className="rounded border border-gold/30 px-3 py-2">Travel to {ADVENTURE_SITES[id].name}</button>)}</div>
 {session.site==='watchtower'&&<div className="space-y-2 border-t border-white/15 pt-3"><h5 className="font-semibold">DM-authorized encounter handoff</h5><p className="text-xs text-parchment/70">Choose an existing registered companion and enter verified initiative and HP. No enemy or dice rolls will be invented. Create companions on the Player screen if needed.</p>
 <label className="block">Registered companion<select aria-label="Adventure companion" value={companion} onChange={e=>setCompanion(e.target.value)}><option value="">Select companion</option>{companions.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
 <div className="flex flex-wrap gap-2"><label>Nighthawk initiative<input aria-label="Adventure Nighthawk initiative" type="number" value={nighthawkRoll} onChange={e=>setNighthawkRoll(e.target.value)}/></label><label>Companion initiative<input aria-label="Adventure companion initiative" type="number" value={companionRoll} onChange={e=>setCompanionRoll(e.target.value)}/></label><label>Companion HP<input aria-label="Adventure companion HP" type="number" value={companionHp} onChange={e=>setCompanionHp(e.target.value)}/></label></div>
 <button disabled={saving||!companion||!nighthawkRoll||!companionRoll||!companionHp} onClick={()=>apply(()=>enterAdventureEncounter(campaign,companion,{nighthawk:Number(nighthawkRoll),companion:Number(companionRoll)},Number(companionHp)),'Encounter entered')} className="rounded border border-gold/40 px-3 py-2">Enter linked encounter</button></div>}</>}
 {session.status==='encounter'&&<><p className="text-sm">Encounter in progress. Resolve combat below using the existing deterministic encounter engine, then return to exploration.</p><CompanionEncounterPanel campaign={campaign} saving={saving} onChange={onChange}/><button disabled={saving||campaign.companionEncounter?.status!=='completed'} onClick={()=>apply(()=>resumeAdventureExploration(campaign),'Exploration resumed')} className="rounded border border-gold/40 px-3 py-2">Resume exploration after encounter</button></>}
 <div aria-label="Adventure narrative history" className="space-y-2">{session.interactions.slice(-5).map((entry,i)=><p key={i} className="text-sm border-l-2 border-gold/30 pl-2">{entry.response}</p>)}</div></>}
 {feedback&&<p role="alert" className="text-sm text-amber-200">{feedback}</p>}
 </section>;
}
