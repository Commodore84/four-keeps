import type {Campaign} from '../game/campaign';
import {abilities,abilityModifier,savingThrowModifier} from '../game/checks';
import {classSummary} from '../game/creationClasses';
import {playerEquippedAttack,playerEquippedDefense} from '../game/companionEncounter';
import {SubclassActorManager} from './SubclassActorManager';
import {CompanionEncounterPanel} from './CompanionEncounterPanel';
export function ImportedCharacterSheet({campaign,saving,onChange}:{campaign:Campaign;saving:boolean;onChange:(next:Campaign,message:string)=>void}){
 const c=campaign.character!,identity=campaign.characterIdentity!,cls=classSummary(identity.classId),attack=playerEquippedAttack(campaign);
 return <section className="space-y-4" aria-label="Imported player character">
 <section aria-label="Character identity"><h2 className="font-serif text-2xl">{identity.name}</h2><p>{identity.speciesId} · {cls?.name??identity.classId} · Level {c.level??1} · {campaign.xp??0} XP</p></section>
 <section aria-label="Combat and vital statistics"><p>HP {c.currentHitPoints}/{c.maxHitPoints} · AC {playerEquippedDefense(campaign)?.armorClass} · Speed {c.speed} ft · Hit Die d{cls?.hitDie}</p><p>Conditions: {c.conditions?.join(', ')||'None'}</p>{c.deathSaves&&<p>Death saves: {c.deathSaves.successes} successes, {c.deathSaves.failures} failures · {c.deathSaves.dead?'Dead':c.deathSaves.stable?'Stable':'Unstable'}</p>}</section>
 <section aria-label="Player ability scores">{abilities.map(a=><p key={a}>{a.toUpperCase()}: {c.scores[a]} · modifier {abilityModifier(c.scores[a])} · save {savingThrowModifier(c,a)}</p>)}</section>
 <section aria-label="Attacks and damage cantrips"><h3>Equipped attack</h3><p>{attack?`${attack.name}: ${attack.attackModifier>=0?'+':''}${attack.attackModifier} to hit, ${attack.damageDice} ${attack.damageModifier>=0?'+':''}${attack.damageModifier}`:'Equip an owned weapon in the shared encounter.'}</p><p>Cantrips: {c.cantrips?.join(', ')||'None'}</p><p>Prepared spells: {c.preparedSpells?.join(', ')||'None'}</p><p>Level-one slots: {c.spellSlots?c.spellSlots.level1-c.spellSlots.usedLevel1:0}</p></section>
 <section aria-label="Player class resources"><h3>Class resources</h3>{Object.entries(c.resources??{}).map(([name,pool])=><p key={name}>{name}: {pool.maximum-pool.used}/{pool.maximum}</p>)}<p>Resource effects require DM adjudication. Class advancement and rest recovery are not yet automated.</p></section>
 <section aria-label="Equipment and inventory"><h3>Inventory</h3><p>{Object.entries(campaign.inventoryLedger?.currency??{}).map(([coin,n])=>`${n} ${coin}`).join(' · ')}</p>{campaign.inventoryLedger?.gear.map(i=><p key={i.name}>{i.name} ×{i.quantity}</p>)}</section>
 <section aria-label="Class features"><h3>{cls?.name} features</h3><p>{cls?.features.filter(f=>f.level<=(c.level??1)).flatMap(f=>f.names).join(', ')}</p></section>
 <SubclassActorManager campaign={campaign} saving={saving} onChange={onChange}/><CompanionEncounterPanel campaign={campaign} saving={saving} onChange={onChange}/>
 </section>;
}
