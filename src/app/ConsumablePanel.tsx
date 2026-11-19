import {useRef,useState} from 'react';
import type {Campaign} from '../game/campaign';
import {eligibleKitTargets,type ConsumableName,type ConsumableRequest} from '../game/consumables';
export function ConsumablePanel({campaign,saving,onUse}:{campaign:Campaign;saving:boolean;onUse:(r:ConsumableRequest)=>Promise<boolean>}){
 const owned=(campaign.inventoryLedger?.gear??[]).filter(g=>g.quantity>0&&(g.name==='Antitoxin'||g.name==="Healer's Kit"));
 const [name,setName]=useState<ConsumableName|null>(null),[target,setTarget]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<string|null>(null);
 if(!owned.length)return null;
 const item=owned.find(g=>g.name===name),battle=campaign.companionEncounter,actor=battle?.participants.nighthawk,targets=eligibleKitTargets(campaign);
 const selected=targets.find(t=>t.id===target),recipient=battle?.participants[target];
 const ready=name==='Antitoxin'||name==="Healer's Kit"&&!!selected;
 const clear=()=>{setName(null);setTarget('');pending.current=null;setError('')};
 return <section aria-label="Adventuring consumables" className="rounded-xl border border-white/20 p-3 space-y-2">
 <h3 className="font-semibold">Adventuring consumables</h3>
 <p className="text-xs text-parchment/70">Antitoxin: Bonus Action, advantage against Poisoned for 1 in-game hour. Healer's Kit: Action, stabilize an adjacent unconscious ally at 0 HP; 10 uses per kit.</p>
 {campaign.antitoxinUntilMinute!==undefined&&campaign.antitoxinUntilMinute>(campaign.elapsedMinutes??0)&&<p role="status">Antitoxin active: {campaign.antitoxinUntilMinute-(campaign.elapsedMinutes??0)} in-game minutes remaining</p>}
 <label className="block text-sm">Supply<select aria-label="Choose consumable" className="mt-1 block w-full rounded bg-slate-900 p-2" value={name??''} onChange={e=>{setName(e.target.value as ConsumableName||null);setTarget('');pending.current=null;setError('')}}><option value="">Choose a supply</option>{owned.map(g=><option key={g.name} value={g.name}>{g.name} ({g.quantity}{g.name==="Healer's Kit"?", "+(campaign.healerKitUsesRemaining??10)+" uses in current kit":''})</option>)}</select></label>
 {name==="Healer's Kit"&&<label className="block text-sm">Recipient<select aria-label="Consumable recipient" className="mt-1 block w-full rounded bg-slate-900 p-2" value={target} onChange={e=>{setTarget(e.target.value);pending.current=null;setError('')}}><option value="">Select an eligible ally</option>{targets.map(t=><option key={t.id} value={t.id}>{t.id} (0 HP)</option>)}</select></label>}
 {item&&<div className="flex gap-2"><button type="button" disabled={saving||busy||!ready} onClick={async()=>{
  if(!pending.current)pending.current=crypto.randomUUID();
  setBusy(true);setError('');
  try{const ok=await onUse({name:item.name as ConsumableName,requestId:pending.current,confirmed:true,expectedQuantity:item.quantity,expectedElapsedMinutes:campaign.elapsedMinutes??0,...(name==="Healer's Kit"?{expectedKitUses:campaign.healerKitUsesRemaining??10,targetId:target,expectedTargetHP:recipient?.hp,expectedTargetPosition:recipient?{x:recipient.x,y:recipient.y}:undefined}:{targetId:'nighthawk'}),...(battle?.status==='active'?{expectedTurnIndex:battle.turnIndex,expectedRound:battle.round,expectedActorPosition:actor?{x:actor.x,y:actor.y}:undefined}:{})});if(ok)clear();else setError('Use rejected; refresh and check the current state.')}catch(e){setError(String(e))}finally{setBusy(false)}
 }} className="rounded bg-amber-700 px-3 py-2 disabled:opacity-40">Confirm use</button><button type="button" onClick={clear}>Cancel</button></div>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
