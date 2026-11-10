import { ITEMS, ITEM_BY_ID, CLASS_PACKAGES, BACKGROUND_PACKAGES, emptyEquipment, inventory, remainingCp, buy, armorClass, attackBonus, weaponTrained, armorTrained, equipmentErrors, carryingWeight, carryingCapacity, type EquipmentDraft } from '../game/creationEquipment';
import { ABILITIES, STANDARD_ARRAY, POINT_COSTS, emptyAbilityDraft, pointCost, rollSet, totalScores, modifier, validateAbilityDraft, type AbilityDraft } from '../game/creationAbilities';
import { CLASSES, classChoices, classSummary, reconcileChoices, setChoice, spellcastingAtLevel, validateClassAgainstBackground, type ChoiceSelections, type ChoiceDefinition } from '../game/creationClasses';
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
  selections: { speciesId?: string; lineageId?: string; backgroundId?: string; classId?: string; classChoices?: ChoiceSelections; abilities?: AbilityDraft; equipment?: EquipmentDraft };
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
  function chooseClass(classId:string){if(!draft)return;updateSelections({classId,classChoices:{}});}
  function toggleClassChoice(definition:ChoiceDefinition,value:string){
    if(!draft?.selections.classId)return;
    const next=setChoice(draft.selections.classChoices??{},definition,value);
    updateSelections({classChoices:reconcileChoices(classChoices(draft.selections.classId,next['class-skills']??[]),next)});
  }
  function updateEquipment(next:EquipmentDraft){updateSelections({equipment:next});}
  function updateAbilities(next:AbilityDraft){updateSelections({abilities:next});}
  function rollAbilities(){
    const random=()=>{const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);return bytes[0]/4294967296;};
    const rolls=rollSet(random);
    updateAbilities({...emptyAbilityDraft(),method:'rolled',...rolls});
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
      <nav aria-label="Character creation steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{CREATION_STEPS.map((step,index)=><button type="button" key={step.id} disabled={index>4||index===1&&validateIdentity(draft).length>0||index>=2&&(validateIdentity(draft).length>0||validateOrigins(draft.selections,draft.rules.allowCompatibleLegacy).length>0)||index>=3&&validateClassAgainstBackground(draft.selections.classId,draft.selections.classChoices??{},availableBackgrounds(draft.rules.allowCompatibleLegacy).find(b=>b.id===draft.selections.backgroundId)?.skills??[]).length>0} onClick={()=>update({step:step.id})} className={`rounded-lg border px-2 py-2 text-left text-sm ${draft.step===step.id?'border-gold text-gold':'border-white/20'} disabled:opacity-40`}>{index+1}. {step.label}</button>)}</nav>
      {draft.step==='identity'?<div className="space-y-3">
        <p className="text-sm text-parchment/65">Tell us about your adventurer. Only the name is required.</p>
        {(['name','pronouns','appearance','personality','backstory'] as const).map(field=><label key={field} className="block space-y-1"><span className="block text-sm capitalize">{field}{field==='name'?' *':''}</span>{field==='name'||field==='pronouns'?<input className="w-full rounded-lg border border-white/20 bg-ink p-2" value={draft.identity[field]} onChange={e=>updateIdentity(field,e.target.value)}/>:<textarea className="w-full rounded-lg border border-white/20 bg-ink p-2" rows={2} value={draft.identity[field]} onChange={e=>updateIdentity(field,e.target.value)}/>}</label>)}
        <p className="text-xs text-parchment/60">Portrait and guided AI interview will be added in a later milestone.</p>
        <button type="button" disabled={validateIdentity(draft).length>0} onClick={()=>update({step:'origins'})} className="rounded-lg bg-gold px-4 py-2 font-semibold text-ink disabled:opacity-40">Continue to origins</button>
      </div>:draft.step==="origins"?<div className="space-y-4" aria-label="Origins selection">
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
        <div className="flex gap-2"><button type="button" onClick={()=>update({step:'identity'})} className="rounded-lg border border-white/25 px-3 py-2">Back to identity</button><button type="button" disabled={validateOrigins(draft.selections,draft.rules.allowCompatibleLegacy).length>0} onClick={()=>update({step:"class"})} className="rounded-lg bg-gold px-3 py-2 text-ink disabled:opacity-40">Continue to class</button></div>
      </div>:draft.step==='class'?<div className="space-y-4" aria-label="Class selection">
        <h4 className="font-serif text-lg">Choose a Class</h4>
        <p className="text-xs text-parchment/60">2024 Player's Handbook · Level 1 choices. Future features are previewed only.</p>
        <div className="grid grid-cols-2 gap-2">{CLASSES.map(cls=><button key={cls.id} type="button" aria-pressed={draft.selections.classId===cls.id} onClick={()=>chooseClass(cls.id)} className={'rounded-lg border p-3 text-left '+(draft.selections.classId===cls.id?'border-gold bg-gold/10':'border-white/20')}><strong>{cls.name}</strong><span className="block text-xs text-parchment/60">d{cls.hitDie} · {cls.primaryAbilities.join(' / ')}</span></button>)}</div>
        {(()=>{const cls=classSummary(draft.selections.classId??'');if(!cls)return <p className="text-sm text-amber-200">Choose a class to continue.</p>;
          const selections=draft.selections.classChoices??{};
          return <div className="space-y-4"><section className="space-y-2 rounded-lg border border-white/20 p-3 text-sm">
            <h5 className="font-semibold">{cls.name}</h5><p>{cls.summary}</p><p>Hit Die: d{cls.hitDie} · Primary: {cls.primaryAbilities.join(', ')}</p><p>Saves: {cls.savingThrows.join(', ')}</p><p>Armor: {cls.armor.join(', ')||'None'}</p><p>Weapons: {cls.weapons.join(', ')}</p><p>Tools: {cls.tools.join(', ')||'None'}</p><p>Starting equipment: {cls.startingEquipment}</p>
            <details><summary className="cursor-pointer font-semibold">Level progression preview</summary>{cls.features.map(f=><p key={f.level} className="mt-1">Level {f.level}: {f.names.join(', ')}</p>)}</details>
          </section>
          {(()=>{const magic=spellcastingAtLevel(cls.id,1);return magic?<p className="text-sm rounded-lg border border-white/20 p-3">Level 1 spellcasting: {magic.ability} · {magic.kind} · slots {magic.slots.join(' / ')}{magic.cantrips!==null?' · '+magic.cantrips+' cantrips':''}. Spell preparation will be configured in Spells & Features.</p>:null})()}
          {classChoices(cls.id,selections['class-skills']??[]).map(definition=><fieldset key={definition.id} className="space-y-2 rounded-lg border border-white/20 p-3">
            <legend className="px-1 font-semibold">{definition.label} — choose {definition.count}</legend>
            <p className="text-xs text-parchment/60">{(selections[definition.id]??[]).length} / {definition.count} selected</p>
            <div className="grid grid-cols-2 gap-2">{definition.options.map(option=><label key={option} className="flex items-start gap-2 rounded border border-white/15 p-2 text-sm"><input type="checkbox" checked={(selections[definition.id]??[]).includes(option)} onChange={()=>toggleClassChoice(definition,option)}/><span>{option}</span></label>)}</div>
          </fieldset>)}
          {validateClassAgainstBackground(cls.id,selections,availableBackgrounds(draft.rules.allowCompatibleLegacy).find(b=>b.id===draft.selections.backgroundId)?.skills??[]).length>0?<p role="status" className="text-sm text-amber-200">{validateClassAgainstBackground(cls.id,selections,availableBackgrounds(draft.rules.allowCompatibleLegacy).find(b=>b.id===draft.selections.backgroundId)?.skills??[]).join(' ')}</p>:<p role="status" className="text-sm text-emerald-300">Class choices valid and saved.</p>}
          </div>})()}
        <div className="flex gap-2"><button type="button" onClick={()=>update({step:'origins'})} className="rounded-lg border border-white/25 px-3 py-2">Back to origins</button><button type="button" disabled={validateClassAgainstBackground(draft.selections.classId,draft.selections.classChoices??{},availableBackgrounds(draft.rules.allowCompatibleLegacy).find(b=>b.id===draft.selections.backgroundId)?.skills??[]).length>0} onClick={()=>update({step:'abilities'})} className="rounded-lg bg-gold px-3 py-2 text-ink disabled:opacity-40">Continue to abilities</button></div>
      </div>:draft.step==='abilities'?<div className="space-y-4" aria-label="Ability scores">
        <h4 className="font-serif text-lg">Ability Scores</h4>
        {(()=>{const abilities=draft.selections.abilities??emptyAbilityDraft();
          const background=availableBackgrounds(draft.rules.allowCompatibleLegacy).find(b=>b.id===draft.selections.backgroundId);
          const allowed=background?.abilities??[];
          const scores=totalScores(abilities);
          const errors=validateAbilityDraft(abilities,allowed);
          const options=abilities.method==='standard'?[...STANDARD_ARRAY]:abilities.method==='rolled'?abilities.rolls:[];
          return <div className="space-y-4">
            <fieldset className="space-y-2"><legend className="font-semibold">Generation method</legend>
              <div className="flex flex-wrap gap-2">{(['standard','point-buy','rolled'] as const).map(method=><button type="button" key={method} aria-pressed={abilities.method===method} onClick={()=>updateAbilities({...emptyAbilityDraft(),method})} className={'rounded-lg border px-3 py-2 text-sm '+(abilities.method===method?'border-gold bg-gold/10':'border-white/20')}>{method==='standard'?'Standard Array':method==='point-buy'?'Point Buy':'4d6 drop lowest'}</button>)}</div>
            </fieldset>
            {abilities.method==='rolled'&&<div className="space-y-2"><button type="button" onClick={rollAbilities} className="rounded-lg border border-gold/40 px-3 py-2 text-gold">{abilities.rolls.length===6?'Reroll six scores':'Roll six scores'}</button>{abilities.rollDice.length===6&&<p className="text-xs text-parchment/65">Rolls: {abilities.rollDice.map((dice,i)=>dice.join('+')+' → '+abilities.rolls[i]).join(' · ')}</p>}</div>}
            {abilities.method==='point-buy'&&<p className="text-sm">Points spent: <strong>{pointCost(abilities.base)} / 27</strong> · Unassigned abilities count as 8 until selected.</p>}
            <div className="space-y-2">{ABILITIES.map(ability=><div key={ability} className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2 rounded-lg border border-white/15 p-2">
              <strong>{ability}</strong>
              <label className="space-y-1 text-xs"><span className="block">Base</span><select aria-label={ability+' base score'} value={abilities.base[ability]??''} onChange={e=>updateAbilities({...abilities,base:{...abilities.base,[ability]:e.target.value===''?undefined:Number(e.target.value)}})} className="w-full rounded border border-white/20 bg-ink p-2"><option value="">Choose</option>{(abilities.method==='point-buy'?Object.keys(POINT_COSTS).map(Number):options).map((score,i)=><option key={i} value={score}>{score}</option>)}</select></label>
              <label className="space-y-1 text-xs"><span className="block">Background</span><select aria-label={ability+' background bonus'} value={abilities.bonuses[ability]??0} disabled={!allowed.includes(ability)} onChange={e=>updateAbilities({...abilities,bonuses:{...abilities.bonuses,[ability]:Number(e.target.value)}})} className="w-full rounded border border-white/20 bg-ink p-2 disabled:opacity-40">{[0,1,2].map(v=><option key={v} value={v}>+{v}</option>)}</select></label>
              <span className="col-span-3 text-right text-xs text-parchment/70">Total {abilities.base[ability]===undefined?'—':scores[ability]} · Modifier {abilities.base[ability]===undefined?'—':(modifier(scores[ability])>=0?'+':'')+modifier(scores[ability])}</span>
            </div>)}</div>
            <fieldset className="space-y-2"><legend className="font-semibold">Background increase ({background?.name??'choose a background'})</legend><div className="flex flex-wrap gap-2">{(['two-one','one-one-one'] as const).map(mode=><button type="button" key={mode} aria-pressed={abilities.bonusMode===mode} onClick={()=>updateAbilities({...abilities,bonusMode:mode,bonuses:{}})} className={'rounded border px-3 py-2 text-sm '+(abilities.bonusMode===mode?'border-gold':'border-white/20')}>{mode==='two-one'?'+2 / +1':'+1 / +1 / +1'}</button>)}</div><p className="text-xs text-parchment/60">Eligible abilities: {allowed.join(', ')}. Each bonus must go to a different ability.</p></fieldset>
            {errors.length>0?<p role="status" className="text-sm text-amber-200">{errors.join(' ')}</p>:<p role="status" className="text-sm text-emerald-300">Ability scores valid and saved.</p>}
            <div className="flex gap-2"><button type="button" onClick={()=>update({step:'class'})} className="rounded-lg border border-white/25 px-3 py-2">Back to class</button><button type="button" disabled={errors.length>0} onClick={()=>update({step:'equipment'})} className="rounded-lg bg-gold px-3 py-2 text-ink disabled:opacity-40">Continue to equipment</button></div>
          </div>})()}
      </div>:<div className="space-y-4" aria-label="Starting equipment">
        <h4 className="font-serif text-lg">Starting Equipment</h4>
        {(()=>{const classId=draft.selections.classId??'';const backgroundId=draft.selections.backgroundId??'';
          const eq=draft.selections.equipment??emptyEquipment();
          const scores=totalScores(draft.selections.abilities??emptyAbilityDraft());
          const owned=inventory(eq,classId,backgroundId);
          const funds=remainingCp(eq,classId,backgroundId);
          const errors=equipmentErrors(eq,classId,backgroundId,scores);
          const setPackage=(key:'classPackage'|'backgroundPackage',index:number)=>updateEquipment({...eq,[key]:index,purchases:{},equipped:{weapons:[]}});
          const equip=(id:string,category:'weapon'|'armor'|'shield')=>{
            if(category==='weapon'){const weapons=eq.equipped.weapons.includes(id)?eq.equipped.weapons.filter(x=>x!==id):[...eq.equipped.weapons,id].slice(-2);updateEquipment({...eq,equipped:{...eq.equipped,weapons}});}
            else updateEquipment({...eq,equipped:{...eq.equipped,[category]:eq.equipped[category]===id?undefined:id}});
          };
          return <div className="space-y-4">
            {([['Class equipment',CLASS_PACKAGES[classId]??[],'classPackage'],['Background equipment',BACKGROUND_PACKAGES[backgroundId]??[],'backgroundPackage']] as const).map(([label,packages,key])=><fieldset key={key} className="space-y-2 rounded-lg border border-white/20 p-3"><legend className="font-semibold">{label}</legend>{packages.map((p,i)=><label key={i} className="flex items-start gap-2 rounded border border-white/15 p-2 text-sm"><input type="radio" name={key} checked={eq[key]===i} onChange={()=>setPackage(key,i)}/><span><strong>{p.label}</strong> — {p.gold} GP{Object.keys(p.items).length>0?' + '+Object.entries(p.items).map(([id,n])=>n+' × '+(ITEM_BY_ID[id]?.name??id)).join(', '):' to spend'}</span></label>)}</fieldset>)}
            <section className="space-y-2 rounded-lg border border-gold/30 p-3">
              <h5 className="font-semibold">Currency and carrying capacity</h5>
              <p className="text-sm">Remaining: <strong>{(funds/100).toFixed(2)} GP</strong> · Carrying {(carryingWeight(eq,classId,backgroundId)).toFixed(1)} / {carryingCapacity(scores)} lb.</p>
              <p className="text-xs text-parchment/65">Class and background funds combine. Purchases use exact copper-piece accounting.</p>
            </section>
            <section className="space-y-2"><h5 className="font-semibold">Shop — 2024 equipment</h5>
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-white/20 p-2">{ITEMS.map(item=><div key={item.id} className="flex items-center justify-between gap-2 border-b border-white/10 py-2 text-sm"><div><strong>{item.name}</strong><span className="block text-xs text-parchment/60">{item.category} · {(item.costCp/100).toFixed(2)} GP · {item.weight} lb.{item.damage?' · '+item.damage:''}{item.properties?.length?' · '+item.properties.join(', '):''}</span></div><button type="button" disabled={eq.classPackage===null||eq.backgroundPackage===null||funds<item.costCp} onClick={()=>updateEquipment(buy(eq,classId,backgroundId,item.id))} className="shrink-0 rounded border border-gold/40 px-2 py-1 text-gold disabled:opacity-30">Buy</button></div>)}</div>
            </section>
            <section className="space-y-2"><h5 className="font-semibold">Inventory and equipment</h5>
              {Object.entries(owned).filter(([,n])=>n>0).length===0?<p className="text-sm text-parchment/60">Choose starting packages to receive equipment.</p>:Object.entries(owned).filter(([,n])=>n>0).map(([id,n])=>{const item=ITEM_BY_ID[id];if(!item)return <p key={id} className="text-amber-200">Unknown item: {id}</p>;
                const equipable=item.category==='weapon'||item.category==='armor'||item.category==='shield';
                const equipped=item.category==='weapon'?eq.equipped.weapons.includes(id):item.category==='armor'?eq.equipped.armor===id:eq.equipped.shield===id;
                const trained=item.category==='weapon'?weaponTrained(classId,item):armorTrained(classId,item);
                return <div key={id} className="flex items-center justify-between gap-2 rounded border border-white/15 p-2 text-sm"><span>{n} × {item.name}{equipable&&!trained?<span className="block text-xs text-amber-200">Not proficient/trained</span>:null}</span>{equipable&&<button type="button" aria-pressed={equipped} onClick={()=>equip(id,item.category as 'weapon'|'armor'|'shield')} className={'rounded border px-2 py-1 '+(equipped?'border-gold text-gold':'border-white/20')}>{equipped?'Unequip':'Equip'}</button>}</div>})}
            </section>
            <section className="space-y-2 rounded-lg border border-gold/30 p-3"><h5 className="font-semibold">Combat statistics</h5><p className="text-sm">Armor Class: <strong>{armorClass(eq,classId,backgroundId,scores)}</strong></p>
              {eq.equipped.weapons.map(id=>{const item=ITEM_BY_ID[id];return item?<p key={id} className="text-sm">{item.name}: attack {(attackBonus(classId,item,scores)>=0?'+':'')+attackBonus(classId,item,scores)} · {item.damage} · {item.mastery} mastery</p>:null})}
              <p className="text-xs text-parchment/60">Armor training, shield training, weapon proficiency, and Strength requirements are checked below. Additional class feature modifiers will be integrated later.</p>
            </section>
            {errors.length?<p role="status" className="text-sm text-amber-200">{errors.join(' ')}</p>:<p role="status" className="text-sm text-emerald-300">Equipment selections valid and saved.</p>}
            <div className="flex gap-2"><button type="button" onClick={()=>update({step:'abilities'})} className="rounded-lg border border-white/25 px-3 py-2">Back to abilities</button><button type="button" disabled className="rounded-lg bg-gold px-3 py-2 text-ink opacity-40">Continue to spells (next phase)</button></div>
          </div>})()}
      </div>}
      <p className="text-xs text-parchment/55">Draft only · not attached to a campaign · cannot enter play until all required choices are valid</p>
    </>}
  </section>;
}
