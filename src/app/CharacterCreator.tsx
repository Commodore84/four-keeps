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
      </div>:<div className="space-y-2"><h4 className="font-serif text-lg">Origins</h4><p className="text-sm text-parchment/70">Species, background, and legacy compatibility will be implemented next. This section is not yet available for selection.</p><button type="button" onClick={()=>update({step:'identity'})} className="rounded-lg border border-white/25 px-3 py-2">Back to identity</button></div>}
      <p className="text-xs text-parchment/55">Draft only · not attached to a campaign · cannot enter play until all required choices are valid</p>
    </>}
  </section>;
}
