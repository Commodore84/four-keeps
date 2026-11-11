import {useState} from 'react';
import type {Campaign} from '../game/campaign';
import {classSummary} from '../game/creationClasses';
import {completePlayerRest,playerLongRestWaitMinutes} from '../game/playerRecovery';
export function PlayerRestPanel({campaign,saving,onChange}:{campaign:Campaign;saving:boolean;onChange:(next:Campaign,message:string)=>Promise<boolean>|boolean|void}){
 const [safe,setSafe]=useState(false),[die,setDie]=useState(''),[arcane,setArcane]=useState(false),[wait,setWait]=useState(false),[trance,setTrance]=useState(false),[feedback,setFeedback]=useState('');
 const cls=classSummary(campaign.characterIdentity?.classId??''),c=campaign.character;
 if(!cls||!c)return null;
 const required=playerLongRestWaitMinutes(campaign),blocked=!!campaign.pendingCheck||campaign.companionEncounter?.status==='active'||campaign.adventureSession?.status==='encounter'||(c.currentHitPoints??0)<1;
 async function finish(kind:'short'|'long'){
  try{const next=completePlayerRest(campaign,kind,{confirmedSafe:safe,hitDieRolls:kind==='short'&&die.trim()?[Number(die)]:[],arcaneRecovery:kind==='short'&&arcane,waitMinutes:kind==='long'&&wait?required:0,useTrance:kind==='long'&&trance});const persisted=await onChange(next,'Rest saved');if(persisted===false)throw Error('Rest could not be saved; campaign state is unchanged.');setDie('');setArcane(false);setSafe(false);setWait(false);setFeedback('Rest completed and saved.');}catch(error){setFeedback(String(error));}
 }
 return <section aria-label="Player rest recovery" className="space-y-3 rounded-xl border border-gold/30 p-4">
 <h3 className="font-serif text-xl">Rest and recover</h3><p>HP {c.currentHitPoints}/{c.maxHitPoints} · Hit Dice {campaign.hitDiceRemaining??1}/1 d{cls.hitDie} · In-game time {campaign.elapsedMinutes??0} minutes</p>
 <p className="text-sm">Record a completed rest after the DM confirms safety. A short rest takes 1 hour. A long rest takes 8 hours. Damage, initiative, or a non-cantrip spell interrupts a rest; interrupted rests do not use these completion controls.</p>
 {blocked&&<p>Finish the encounter and resume exploration with at least 1 HP before resting.</p>}
 <label className="flex gap-2"><input type="checkbox" checked={safe} onChange={e=>setSafe(e.target.checked)}/>DM confirms safe, uninterrupted rest and any waiting</label>
 <div className="space-y-2"><label>Optional Hit Die result (d{cls.hitDie})<input aria-label="Rest Hit Die result" className="ml-2 w-20 rounded bg-ink p-2" type="number" min="1" max={cls.hitDie} value={die} onChange={e=>setDie(e.target.value)}/></label><p className="text-xs">Leave blank to spend no Hit Die. Add Constitution to the supplied roll; recover at least 1 HP, capped at maximum HP.</p>
 {cls.id==='wizard'&&<label className="flex gap-2"><input type="checkbox" checked={arcane} onChange={e=>setArcane(e.target.checked)}/>Use Arcane Recovery (study your spellbook) to restore one spent level-one slot</label>}
 <button disabled={saving||blocked||!safe} onClick={()=>finish('short')} className="rounded border border-gold/40 px-3 py-2">Complete short rest</button></div>
 <div className="space-y-2 border-t border-white/15 pt-2">{campaign.characterIdentity?.speciesId==='elf'&&<label className="flex gap-2"><input type="checkbox" checked={trance} onChange={e=>setTrance(e.target.checked)}/>Use Elf Trance (4-hour long rest)</label>}{required>0&&<label className="flex gap-2"><input type="checkbox" checked={wait} onChange={e=>setWait(e.target.checked)}/>Include {required} minutes of approved waiting before the long rest</label>}
 <p className="text-xs">Long rest restores HP, all spent Hit Dice, spell slots and long-rest resources. Wait 16 hours after finishing one before starting another.</p><button disabled={saving||blocked||!safe||required>0&&!wait} onClick={()=>finish('long')} className="rounded border border-gold/40 px-3 py-2">Complete long rest</button></div>
 {feedback&&<p role="status">{feedback}</p>}
 </section>;
}
