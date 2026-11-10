import { availableSpecies, availableBackgrounds, validateOrigins, originBenefits } from '../game/creationOrigins';
import { useEffect, useState } from 'react';

export type CreationStep = 'identity'|'origins'|'class'|'abilities'|'equipment'|'spells'|'review';
export interface CharacterDraft {
  schemaVersion: 1;
  id: string;
  status: 'draft';
  rules: { edition: '2024'; allowCompatibleLegacy: boolean };
  step: CreationStep;
  identity: { name: string; pronouns: string; appearance: string; personality: string; backstory: string; portrait: null|string };
  selections: { speciesId?: string; lineageId?: string; backgroundId?: string; classId?: string };
  createdAt: string;
  updatedAt: string;
}
export const CREATION_STEPS: {id:CreationStep;label:string}[] = [
  {id:'identity',label:'Identity'}, {id:'origins',label:'Origins'}, {id:'class',label:'Class'},
  {id:'abilities',label:'Abilities'}, {id:'equipment',label:'Equipment'},
  {id:'spells',label:'Spells & Features'}, {id:'review',label:'Review'}
];
const KEY='four-keeps-character-drafts-v1';
export function validateIdentity(draft:CharacterDraft):string[] {
  return draft.identity.name.trim() ? [] : ['Character name is required.'];
}
export function createCharacterDraft():CharacterDraft {
  const now=new Date().toISOString();
  return {schemaVersion:1,id:crypto.randomUUID(),status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'identity',
    identity:{name:'',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},
    selections:{},createdAt:now,updatedAt:now};
}
export function readCharacterDrafts():CharacterDraft[] {
  try {
    const value=JSON.parse(localStorage.getItem(KEY)??'[]');
    return Array.isArray(value)?value.filter((item:unknown):item is CharacterDraft=>typeof item==='object'&&item!==null&&(item as CharacterDraft).schemaVersion===1&&(item as CharacterDraft).status==='draft'):[];
  } catch {return [];}
}
export function saveCharacterDrafts(drafts:CharacterDraft[]):void {
  localStorage.setItem(KEY,JSON.stringify(drafts));
}
export function CharacterCreator(){
  const [drafts,setDrafts]=useState<CharacterDraft[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{setDrafts(readCharacterDrafts());},[]);
  const draft=drafts.find(item=>item.id===selected);
  function persist(next:CharacterDraft[]){
    try {saveCharacterDrafts(next);setDrafts(next);setError('');}
    catch(e){setError('Unable to save draft: '+String(e));}
  }
  function update(patch:Partial<CharacterDraft>){
    if(!draft)return;
    persist(drafts.map(item=>item.id===draft.id?{...item,...patch,updatedAt:new Date().toISOString()}:item));
  }
  function updateSelections(patch:Partial<CharacterDraft['selections']>){
    if(!draft)return;
    update({selections:{...draft.selections,...patch}});
  }
  function updateRules(allowCompatibleLegacy:boolean){
    if(!draft)return;
    update({rules:{...draft.rules,allowCompatibleLegacy}});
  }
  function updateIdentity(field:keyof CharacterDraft['identity'],value:string){
    if(!draft)return;
    update({identity:{...draft.identity,[field]:value}});
  }
  return <section aria-label="Character creator" className="space-y-4 rounded-2xl border border-gold/30 bg-panel p-4">
    <div><h3 className="font-serif text-xl">Character Creator</h3><p className="text-sm text-parchment/65">Create characters independently of campaigns. Drafts are saved on this device.</p></div>
    {error&&<p role="alert" className="text-amber-200">{error}</p>}
    {!draft?<><button type="button" className="rounded-lg bg-gold px-4 py-2 font-semibold text-ink" onClick={()=>{const next=createCharacterDraft();persist([next,...drafts]);setSelected(next.id);}}>Create character</button>
      {drafts.length>0&&<div className="space-y-2"><h4 className="font-semibold">Unfinished characters</h4>{drafts.map(item=><button key={item.id} type="button" onClick={()=>setSelected(item.id)} className="block w-full rounded-lg border border-white/20 p-3 text-left">{item.identity.name||'Unnamed character'} <span className="text-xs text-parchment/60">· Resume draft</span></button>)}</div>}</>:
    <><div className="flex items-center justify-between gap-2"><strong>{draft.identity.name||'Unnamed character'}</strong><button type="button" onClick={()=>setSelected(null)} className="rounded-lg border border-white/25 px-3 py-2 text-sm">All characters</button></div>
      <nav aria-label="Character creation steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{CREATION_STEPS.map((step,index)=><button type="button" key={step.id} disabled={index>1||index===1&&validateIdentity(draft).length>0} onClick={()=>update({step:step.id})} className={`rounded-lg border px-2 py-2 text-left text-sm ${draft.step===step.id?'border-gold text-gold':'border-white/20'} disabled:opacity-40`}>{index+1}. {step.label}</button>)}</nav>
      {draft.step==='identity'?<div className="space-y-3">
        <p className="text-sm text-parchment/65">Tell us about your adventurer. Only the name is required.</p>
        {(['name','pronouns','appearance','personality','backstory'] as const).map(field=><label key={field} className="block space-y-1"><span className="block text-sm capitalize">{field}{field==='name'?' *':''}</span>{field==='name'||field==='pronouns'?<input className="w-full rounded-lg border border-white/20 bg-ink p-2" value={draft.identity[field]} onChange={e=>updateIdentity(field,e.target.value)}/>:<textarea className="w-full rounded-lg border border-white/20 bg-ink p-2" rows={2} value={draft.identity[field]} onChange={e=>updateIdentity(field,e.target.value)}/>}</label>)}
        <p className="text-xs text-parchment/60">Portrait and guided AI interview will be added in a later milestone.</p>
        <button type="button" disabled={validateIdentity(draft).length>0} onClick={()=>update({step:'origins'})} className="rounded-lg bg-gold px-4 py-2 font-semibold text-ink disabled:opacity-40">Continue to origins</button>
      </div>:<div className="space-y-4" aria-label="Origins selection">
        <h4 className="font-serif text-lg">Species & Background</h4>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.rules.allowCompatibleLegacy} onChange={e=>updateRules(e.target.checked)}/>Allow compatible legacy rules</label>
        <p className="text-xs text-parchment/60">2024 Player's Handbook options are available. Legacy options will appear only after their rules have been reviewed and added to the catalog.</p>
        <div className="space-y-2"><h5 className="font-semibold">Species</h5>
          <div className="grid grid-cols-2 gap-2">{availableSpecies(draft.rules.allowCompatibleLegacy).map(species=><button key={species.id} type="button" aria-pressed={draft.selections.speciesId===species.id} onClick={()=>updateSelections({speciesId:species.id,lineageId:undefined})} className={`rounded-lg border p-3 text-left ${draft.selections.speciesId===species.id?'border-gold bg-gold/10':'border-white/20'}`}><strong>{species.name}</strong><span className="block text-xs text-parchment/60">{species.sourceBook}</span></button>)}</div>
          {availableSpecies(draft.rules.allowCompatibleLegacy).filter(species=>species.id===draft.selections.speciesId).map(species=><div key={species.id} className="rounded-lg border border-white/15 p-3 text-sm space-y-2"><p>{species.summary} · Speed {species.speed} ft. · Size {species.size}</p><p className="text-parchment/70">{species.traits.join(' · ')}</p>{species.lineages&&<fieldset className="space-y-2"><legend className="font-semibold">Choose lineage</legend>{species.lineages.map(lineage=><label key={lineage.id} className="flex items-start gap-2"><input type="radio" name="character-lineage" checked={draft.selections.lineageId===lineage.id} onChange={()=>updateSelections({lineageId:lineage.id})}/><span>{lineage.name}<span className="block text-xs text-parchment/60">{lineage.traits.join(' · ')}</span></span></label>)}</fieldset>}</div>)}
        </div>
        <div className="space-y-2"><h5 className="font-semibold">Background</h5><div className="grid grid-cols-2 gap-2">{availableBackgrounds(draft.rules.allowCompatibleLegacy).map(background=><button key={background.id} type="button" aria-pressed={draft.selections.backgroundId===background.id} onClick={()=>updateSelections({backgroundId:background.id})} className={`rounded-lg border p-3 text-left ${draft.selections.backgroundId===background.id?'border-gold bg-gold/10':'border-white/20'}`}><strong>{background.name}</strong><span className="block text-xs text-parchment/60">{background.sourceBook}</span></button>)}</div>
          {availableBackgrounds(draft.rules.allowCompatibleLegacy).filter(background=>background.id===draft.selections.backgroundId).map(background=><div key={background.id} className="rounded-lg border border-white/15 p-3 text-sm space-y-1"><p>{background.summary}</p><p>Ability choices: {background.abilities.join(', ')}</p><p>Origin feat: {background.feat}</p><p>Skills: {background.skills.join(', ')}</p><p>Tool: {background.tool}</p><p>Equipment: {background.equipment}</p></div>)}
        </div>
        <div className="rounded-lg border border-gold/30 p-3 space-y-1"><h5 className="font-semibold">Origin benefits preview</h5>{(()=>{const b=originBenefits(draft.selections,draft.rules.allowCompatibleLegacy);return <div className="text-sm text-parchment/80"><p>{[b.species,b.lineage,b.background].filter(Boolean).join(' · ')||'Choose your origins above'}</p>{b.originFeat&&<p>Origin feat: {b.originFeat}</p>}{b.speed&&<p>Speed: {b.speed} ft.</p>}{b.skills.length>0&&<p>Skills: {b.skills.join(', ')}</p>}</div>})()}</div>
        {validateOrigins(draft.selections,draft.rules.allowCompatibleLegacy).length>0&&<p role="status" className="text-sm text-amber-200">{validateOrigins(draft.selections,draft.rules.allowCompatibleLegacy).join(' ')}</p>}
        <div className="flex gap-2"><button type="button" onClick={()=>update({step:'identity'})} className="rounded-lg border border-white/25 px-3 py-2">Back to identity</button><button type="button" disabled className="rounded-lg bg-gold px-3 py-2 text-ink opacity-40">Continue to class (next phase)</button></div>
      </div>}
      <p className="text-xs text-parchment/55">Draft only · not attached to a campaign · cannot enter play until all required choices are valid</p>
    </>}
  </section>;
}
