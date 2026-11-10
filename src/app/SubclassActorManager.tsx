import {useState} from 'react';
import type {Campaign} from '../game/campaign';
import {initialSubclassCombatState,type DamageType,type Terrain} from '../game/subclassCombatRules';
import {registerSubclassActor,restSubclassActor,chooseSubclassResistance,useSubclassLuck} from '../game/campaign';

const choices=[{id:'paladin-devotion',label:'Paladin — Oath of Devotion',classId:'paladin'},{id:'druid-land',label:'Druid — Circle of the Land',classId:'druid'},{id:'warlock-fiend',label:'Warlock — Fiend Patron',classId:'warlock'}] as const;
const terrains:Terrain[]=['arid','polar','temperate','tropical'];
const damageTypes:DamageType[]=['Acid','Bludgeoning','Cold','Fire','Lightning','Necrotic','Piercing','Poison','Psychic','Radiant','Slashing','Thunder'];
export function SubclassActorManager({campaign,saving,onChange}:{campaign:Campaign;saving:boolean;onChange:(next:Campaign,message:string)=>void}){
 const [name,setName]=useState('');
 const [subclass,setSubclass]=useState<(typeof choices)[number]['id']>('paladin-devotion');
 const [level,setLevel]=useState(7);
 const [charisma,setCharisma]=useState(3);
 const [terrain,setTerrain]=useState<Terrain>('arid');
 const [restTerrain,setRestTerrain]=useState<Record<string,Terrain>>({});
 const [resistance,setResistance]=useState<Record<string,DamageType>>({});
 const [luckRoll,setLuckRoll]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState('');
 const act=(operation:()=>Campaign,message:string)=>{try{onChange(operation(),message);setFeedback(message)}catch(error){setFeedback(String(error))}};
 const add=()=>{
  const id=name.trim();
  if(!id||['nighthawk','player'].includes(id.toLowerCase())||campaign.subclassActors?.[id]){setFeedback('Choose a unique actor ID other than Nighthawk or player.');return}
  if(!Number.isInteger(level)||level<3||level>20||!Number.isInteger(charisma)||charisma< -5||charisma>10){setFeedback('Level must be 3–20 and Charisma modifier must be -5 to +10.');return}
  const choice=choices.find(item=>item.id===subclass)!;
  act(()=>registerSubclassActor(campaign,id,initialSubclassCombatState(choice.classId,subclass,level,charisma,subclass==='druid-land'?terrain:undefined)),'Registered '+id);
  setName('');
 };
 return <section aria-label="Subclass actor manager" className="rounded-xl border border-white/15 p-3 space-y-3">
  <h3 className="font-semibold">Subclass actor management</h3>
  <p className="text-xs opacity-75">Experimental actor-scoped rules and resources. These actors do not join Nighthawk’s training encounter automatically. Aura eligibility and Luck roll timing require explicit adjudication.</p>
  <div className="grid gap-2 sm:grid-cols-2">
   <label>Actor ID<input aria-label="New subclass actor ID" className="w-full rounded bg-black/30 p-2" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. companion-paladin"/></label>
   <label>Subclass<select aria-label="New subclass" className="w-full rounded bg-black/30 p-2" value={subclass} onChange={e=>setSubclass(e.target.value as typeof subclass)}>{choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
   <label>Level<input aria-label="New actor level" type="number" min="3" max="20" className="w-full rounded bg-black/30 p-2" value={level} onChange={e=>setLevel(Number(e.target.value))}/></label>
   <label>Charisma modifier<input aria-label="New actor Charisma modifier" type="number" min="-5" max="10" className="w-full rounded bg-black/30 p-2" value={charisma} onChange={e=>setCharisma(Number(e.target.value))}/></label>
   {subclass==='druid-land'&&<label>Starting terrain<select aria-label="New actor terrain" className="w-full rounded bg-black/30 p-2" value={terrain} onChange={e=>setTerrain(e.target.value as Terrain)}>{terrains.map(t=><option key={t}>{t}</option>)}</select></label>}
  </div>
  <button disabled={saving} onClick={add} className="rounded border border-gold px-3 py-2">Register subclass actor</button>
  {Object.entries(campaign.subclassActors??{}).map(([id,actor])=><div key={id} aria-label={'Manage actor '+id} className="rounded border border-white/20 p-3 space-y-2">
   <p className="font-semibold">{id} · {actor.subclassId} · level {actor.level}</p>
   {actor.subclassId==='paladin-devotion'&&<p>Aura of Devotion: {actor.level>=7?'Charmed immunity applies only while the aura is active and the target is within range.':'Unlocks at level 7.'} Not enforced in Nighthawk combat.</p>}
   {actor.subclassId==='druid-land'&&<label>Terrain after Long Rest<select aria-label={'Rest terrain '+id} value={restTerrain[id]??actor.terrain??'arid'} onChange={e=>setRestTerrain(prev=>({...prev,[id]:e.target.value as Terrain}))}>{terrains.map(t=><option key={t}>{t}</option>)}</select></label>}
   {actor.subclassId==='warlock-fiend'&&actor.level>=6&&<><p>Dark One’s Own Luck: {actor.luckRemaining} remaining</p><label>Manual d10 result<input aria-label={'Luck d10 '+id} type="number" min="1" max="10" value={luckRoll[id]??''} onChange={e=>setLuckRoll(prev=>({...prev,[id]:e.target.value}))}/></label><button disabled={saving||actor.luckRemaining<1} onClick={()=>{const roll=Number(luckRoll[id]);if(!Number.isInteger(roll)||roll<1||roll>10){setFeedback('Enter a valid d10 result (1–10).');return}try{const result=useSubclassLuck(campaign,id,roll);onChange(result.campaign,'Luck bonus +'+result.bonus+' for '+id);setFeedback('Luck bonus +'+result.bonus)}catch(error){setFeedback(String(error))}}}>Spend Dark One’s Own Luck</button></>}
   {actor.subclassId==='warlock-fiend'&&actor.level>=10&&<label>Fiendish Resilience choice<select aria-label={'Fiend resistance '+id} value={resistance[id]??actor.fiendResistance??''} onChange={e=>setResistance(prev=>({...prev,[id]:e.target.value as DamageType}))}><option value="">Choose a damage type</option>{damageTypes.map(t=><option key={t}>{t}</option>)}</select><button disabled={saving} onClick={()=>{const selected=resistance[id]??actor.fiendResistance;if(!selected){setFeedback('Choose a resistance type first.');return}act(()=>chooseSubclassResistance(campaign,id,selected),'Resistance saved for '+id)}}>Save resistance</button></label>}
   <div className="flex gap-2"><button disabled={saving} onClick={()=>act(()=>restSubclassActor(campaign,id,'short',{}),'Short Rest saved for '+id)}>Short Rest</button><button disabled={saving} onClick={()=>act(()=>restSubclassActor(campaign,id,'long',actor.subclassId==='druid-land'?{terrain:restTerrain[id]??actor.terrain??'arid'}:actor.subclassId==='warlock-fiend'&&actor.level>=10?{fiendResistance:resistance[id]??actor.fiendResistance??'Fire'}:{}),'Long Rest saved for '+id)}>Long Rest</button></div>
  </div>)}
  {feedback&&<p role="status">{feedback}</p>}
 </section>
}
