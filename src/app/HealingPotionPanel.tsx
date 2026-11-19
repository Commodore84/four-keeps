import {useState,useRef} from 'react';
import type {Campaign} from '../game/campaign';
import {HEALING_POTIONS,type HealingPotionName,isHealingPotion} from '../game/healingPotions';

export function HealingPotionPanel({campaign,saving,onUse}:{campaign:Campaign;saving:boolean;onUse:(request:{name:HealingPotionName;confirmed:boolean;expectedQuantity:number;expectedHP:number;requestId:string})=>Promise<boolean>}){
 const owned=(campaign.inventoryLedger?.gear??[]).filter(g=>g.quantity>0&&isHealingPotion(g.name));
 const [selected,setSelected]=useState<HealingPotionName|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const pending=useRef<string|null>(null);
 if(!owned.length||!campaign.character)return null;
 const item=owned.find(g=>g.name===selected);
 const hp=campaign.character.currentHitPoints;
 const max=campaign.character.maxHitPoints;
 return <section aria-label="Healing potions" className="rounded-xl border border-white/20 p-3 space-y-2">
  <h3 className="font-semibold">Healing potions</h3>
  <p className="text-xs text-parchment/70">Current HP: {hp??'—'} / {max??'—'}. Drinking uses a Bonus Action.</p>
  <label className="block text-sm">Potion
   <select aria-label="Choose healing potion" className="mt-1 block w-full rounded bg-slate-900 p-2" value={selected??''} onChange={e=>{setSelected(isHealingPotion(e.target.value)?e.target.value:null);pending.current=null;setError('')}}>
    <option value="">Select a potion</option>
    {owned.map(g=><option key={g.name} value={g.name}>{g.name} ({g.quantity}) — {HEALING_POTIONS[g.name as HealingPotionName].dice}d4 + {HEALING_POTIONS[g.name as HealingPotionName].bonus}</option>)}
   </select>
  </label>
  {item&&<div className="flex gap-2">
   <button type="button" disabled={saving||busy||typeof hp!=='number'||hp<=0||hp>=(max??0)} className="rounded border border-gold/50 px-3 py-2" onClick={async()=>{
    if(busy||typeof hp!=='number'||!selected)return;
    setBusy(true);setError('');
    try{const requestId=pending.current??crypto.randomUUID();pending.current=requestId;
      const ok=await onUse({name:selected,confirmed:true,expectedQuantity:item.quantity,expectedHP:hp,requestId});
      if(ok){pending.current=null;setSelected(null)}else setError('Save failed. Retry the same confirmation.');
    }catch(e){setError(String(e))}finally{setBusy(false)}
   }}>Confirm drink potion</button>
   <button type="button" disabled={busy} className="rounded border border-white/20 px-3 py-2" onClick={()=>{pending.current=null;setSelected(null);setError('')}}>Cancel</button>
  </div>}
  {error&&<p role="alert" className="text-sm">{error}</p>}
 </section>;
}
