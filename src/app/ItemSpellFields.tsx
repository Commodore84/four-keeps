import {useState} from 'react';
import type {Campaign} from '../game/campaign';

export function useItemSpellInputs(){
 const [targets,setTargets]=useState('');
 const [dice,setDice]=useState('');
 const [shielded,setShielded]=useState('');
 const [x,setX]=useState('');
 const [y,setY]=useState('');
 const [anchored,setAnchored]=useState(false);
 const split=(value:string)=>value.split(',').map(part=>part.trim()).filter(Boolean);
 return {
  targets,setTargets,dice,setDice,shielded,setShielded,x,setX,y,setY,anchored,setAnchored,
  request(spell:string,rank:number){
   if(spell==='Magic Missile'&&targets.trim()&&dice.trim()){
    const ids=split(targets);
    return {missile:{targets:ids.length===1?Array(rank+2).fill(ids[0]) as string[]:ids,dice:split(dice).map(Number),shieldedTargets:split(shielded)}};
   }
   return spell==='Web'&&x!==''&&y!==''?{web:{x:Number(x),y:Number(y),anchored}}:{};
  },
 };
}

export function ItemSpellFields({campaign,spell,rank,fields}:{campaign:Campaign;spell:string;rank:number;fields:ReturnType<typeof useItemSpellInputs>}){
 const battle=campaign.companionEncounter;
 if(battle?.status!=='active')return null;
 const fieldClass='block w-full rounded border border-white/20 bg-ink px-2 py-1';
 if(spell==='Magic Missile')return <div className="space-y-1">
  <p>Targets in encounter: {Object.keys(battle.participants).join(', ')}</p>
  <label>Target ID or one ID per dart<input className={fieldClass} value={fields.targets} onChange={e=>fields.setTargets(e.target.value)}/></label>
  <label>Verified d4 rolls ({rank+2}, comma-separated)<input className={fieldClass} inputMode="numeric" value={fields.dice} onChange={e=>fields.setDice(e.target.value)}/></label>
  <label>Targets protected by Shield, if verified<input className={fieldClass} value={fields.shielded} onChange={e=>fields.setShielded(e.target.value)}/></label>
 </div>;
 if(spell==='Web')return <div className="space-y-1">
  <div className="grid grid-cols-2 gap-2">
   <label>Web origin X<input className={fieldClass} type="number" min={0} max={16} value={fields.x} onChange={e=>fields.setX(e.target.value)}/></label>
   <label>Web origin Y<input className={fieldClass} type="number" min={0} max={16} value={fields.y} onChange={e=>fields.setY(e.target.value)}/></label>
  </div>
  <label className="flex gap-2"><input type="checkbox" checked={fields.anchored} onChange={e=>fields.setAnchored(e.target.checked)}/>DM verified anchored Web</label>
  <p>A 20-foot cube. Casting Web replaces current concentration.</p>
 </div>;
 return null;
}
