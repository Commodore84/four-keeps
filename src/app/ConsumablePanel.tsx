import {useRef,useState} from 'react';
import type {Campaign} from '../game/campaign';
import {antitoxinSecondsRemaining,eligibleKitTargets,equipmentLightRemaining,equipmentLightRules,type EquipmentLight,type ConsumableName,type ConsumableRequest} from '../game/consumables';
import {basicPoisonWeapon,thrownConsumableTargets,type HolyWaterTargetType} from '../game/companionEncounter';
export function ConsumablePanel({campaign,saving,onUse}:{campaign:Campaign;saving:boolean;onUse:(r:ConsumableRequest)=>Promise<boolean>}){
 const owned=(campaign.inventoryLedger?.gear??[]).filter(g=>g.quantity>0&&(g.name==='Candle'||g.name==='Lamp'||g.name==='Torch'||g.name==='Poison, Basic'||g.name==='Oil'||g.name==='Alchemist’s Fire'||g.name==='Holy Water'||g.name==='Acid'||g.name==='Antitoxin'||g.name==="Healer's Kit"));
 const [name,setName]=useState<ConsumableName|null>(null),[target,setTarget]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [acidSave,setAcidSave]=useState(''),[acidDamage,setAcidDamage]=useState('');
 const [creatureType,setCreatureType]=useState<HolyWaterTargetType|''>('');
 const pending=useRef<string|null>(null);
 const antitoxinRemaining=antitoxinSecondsRemaining(campaign);
 const lights=(Object.keys(equipmentLightRules) as EquipmentLight[]).filter(light=>equipmentLightRemaining(campaign,light)>0);
 if(!owned.length&&!antitoxinRemaining&&!campaign.companionEncounter?.basicPoison&&!lights.length)return null;
 const item=owned.find(g=>g.name===name),battle=campaign.companionEncounter,actor=battle?.participants.nighthawk,targets=eligibleKitTargets(campaign);
 const selected=targets.find(t=>t.id===target),recipient=battle?.participants[target]??battle?.objects?.[target];
 const throwing=name==='Oil'||name==='Alchemist’s Fire'||name==='Acid'||name==='Holy Water';
 const targetsInRange=throwing?thrownConsumableTargets(campaign,name!=='Oil',name==='Acid'||name==='Oil'):[];
 const objectTarget=Object.hasOwn(battle?.objects??{},target);
 const needsDamage=name!=='Oil'&&(name!=='Holy Water'||creatureType!=='Other');
 const poisonWeapon=name==='Poison, Basic'?basicPoisonWeapon(campaign):undefined;
 const canCoat=!!poisonWeapon&&battle?.status==='active'&&battle.mode==='unified'&&battle.order[battle.turnIndex]==='nighthawk'&&!!actor&&!actor.bonusActionUsed&&!battle.basicPoison;
 const lightName=name==='Candle'||name==='Lamp'||name==='Torch'?name:undefined;
 const light=lightName?campaign.equipmentLights?.[lightName]:undefined;
 const oil=owned.find(gear=>gear.name==='Oil');
 const lightRemaining=lightName?equipmentLightRemaining(campaign,lightName):0;
 const isBurning=lightRemaining>0&&light?.startedAt!==undefined;
 const extinguishing=lightName==='Lamp'&&isBurning;
 const canLight=!!lightName&&(extinguishing||!isBurning&&
  campaign.inventoryLedger?.gear.some(gear=>gear.name==='Tinderbox'&&gear.quantity>0)&&
  (lightName!=='Lamp'||lightRemaining>0||!!oil?.quantity));
 const ready=canLight||canCoat||throwing&&targetsInRange.includes(target)&&(objectTarget||acidSave!=='')&&(!needsDamage||acidDamage!=='')&&(name!=='Holy Water'||creatureType!=='')||name==='Antitoxin'||name==="Healer's Kit"&&!!selected;
 const clear=()=>{setName(null);setTarget('');setAcidSave('');setAcidDamage('');setCreatureType('');pending.current=null;setError('')};
 return <section aria-label="Adventuring consumables" className="rounded-xl border border-white/20 p-3 space-y-2">
 <h3 className="font-semibold">Adventuring consumables</h3>
 <p className="text-xs text-parchment/70">Antitoxin: Bonus Action, advantage against Poisoned for 1 in-game hour. Healer's Kit: Action, stabilize an adjacent unconscious ally at 0 HP; 10 uses per kit.</p>
 {antitoxinRemaining>0&&<p role="status">Antitoxin active: {Math.floor(antitoxinRemaining/60)} in-game minutes remaining{antitoxinRemaining%60>0?' ('+antitoxinRemaining%60+' additional seconds)':''}</p>}
 {lights.map(source=>{
  const rules=equipmentLightRules[source],remaining=Math.ceil(equipmentLightRemaining(campaign,source)/60);
  const burning=campaign.equipmentLights?.[source]?.startedAt!==undefined;
  return <p key={source} role="status">{source}: {burning?`${rules.bright} ft bright, ${rules.dim} ft additional dim`:'extinguished'} · {remaining} min remaining</p>;
 })}
 {lightName&&<p className="text-sm">{extinguishing?'Extinguish the lamp with Utilize. Unused oil is retained.':`Light ${lightName} with an owned Tinderbox as a Bonus Action.${lightName==='Lamp'&&!lightRemaining?' A new burn uses one flask of Oil.':''}`}</p>}
 <label className="block text-sm">Supply<select aria-label="Choose consumable" className="mt-1 block w-full rounded bg-slate-900 p-2" value={name??''} onChange={e=>{setName(e.target.value as ConsumableName||null);setTarget('');setAcidSave('');setAcidDamage('');setCreatureType('');pending.current=null;setError('')}}><option value="">Choose a supply</option>{owned.map(g=><option key={g.name} value={g.name}>{g.name} ({g.quantity}{g.name==="Healer's Kit"?", "+(campaign.healerKitUsesRemaining??10)+" uses in current kit":''})</option>)}</select></label>
 {name==="Healer's Kit"&&<label className="block text-sm">Recipient<select aria-label="Consumable recipient" className="mt-1 block w-full rounded bg-slate-900 p-2" value={target} onChange={e=>{setTarget(e.target.value);pending.current=null;setError('')}}><option value="">Select an eligible ally</option>{targets.map(t=><option key={t.id} value={t.id}>{t.id} (0 HP)</option>)}</select></label>}
 {battle?.basicPoison&&<p role="status">Basic Poison coating active.</p>}
 {name==='Poison, Basic'&&<p>{poisonWeapon?'Coat '+poisonWeapon.name+' as a Bonus Action.':'Equip a single owned piercing or slashing weapon without ammunition.'}</p>}
 {throwing&&<fieldset className="space-y-2">
 <p className="text-sm">{name} replaces one attack. Enter the DM-verified Dexterity save total, including cover, Dodge and other modifiers. {name==='Holy Water'?'Only Fiends and Undead can take the radiant damage.':name==='Acid'?'Roll 2d6 acid damage.':name==='Oil'?'On a failed save, the target is coated for one minute. The next fire damage ignites the oil for 5 extra fire damage.':'Roll 1d4 fire damage. On a failed save, the creature starts Burning.'}</p>
 {!targetsInRange.length&&<p role="status">{name} is available against supported targets during a level 1–4 character’s turn in unified combat.</p>}
 <label className="block">{name} target<select className="w-full bg-slate-900" value={target} onChange={e=>{setTarget(e.target.value);setCreatureType('');setAcidSave('');setAcidDamage('');pending.current=null}}><option value="">Choose a target</option>{targetsInRange.map(id=><option key={id}>{id}</option>)}</select></label>
 {objectTarget?<p>Objects without ability scores automatically fail the save.</p>:<label className="block">Dexterity save total<input className="w-full bg-slate-900" type="number" value={acidSave} onChange={e=>{setAcidSave(e.target.value);pending.current=null}}/></label>}
 {name==='Holy Water'&&<label className="block">DM-verified creature type<select className="w-full bg-slate-900" value={creatureType} onChange={e=>{setCreatureType(e.target.value as HolyWaterTargetType|'');setAcidDamage('');pending.current=null}}><option value="">Choose type</option><option>Fiend</option><option>Undead</option><option>Other</option></select></label>}
 {needsDamage&&<label className="block">{name==='Acid'?'Rolled acid damage':name==='Holy Water'?'Rolled 2d8 radiant damage':'Rolled 1d4 fire damage'}<input className="w-full bg-slate-900" type="number" min={name==='Alchemist’s Fire'?1:2} max={name==='Acid'?12:name==='Holy Water'?16:4} value={acidDamage} onChange={e=>{setAcidDamage(e.target.value);pending.current=null}}/></label>}
 </fieldset>}
 {item&&<div className="flex gap-2"><button type="button" disabled={saving||busy||!ready} onClick={async()=>{
  if(!pending.current)pending.current=crypto.randomUUID();
  setBusy(true);setError('');
  try{const ok=await onUse({name:item.name as ConsumableName,requestId:pending.current,confirmed:true,expectedQuantity:item.quantity,expectedElapsedMinutes:campaign.elapsedMinutes??0,expectedWeaponId:poisonWeapon?.id,...(lightName?{lightOperation:extinguishing?'extinguish' as const:'light' as const,expectedLight:JSON.stringify(light??null),expectedFuelQuantity:oil?.quantity}:{}),...(throwing?{targetId:target,expectedTargetHP:recipient?.hp,expectedTargetPosition:recipient?{x:recipient.x,y:recipient.y}:undefined,throwRolls:{saveTotal:Number(acidSave),damage:Number(acidDamage),targetType:name==='Holy Water'?creatureType||undefined:undefined}}:name==="Healer's Kit"?{expectedKitUses:campaign.healerKitUsesRemaining??10,targetId:target,expectedTargetHP:recipient?.hp,expectedTargetPosition:recipient?{x:recipient.x,y:recipient.y}:undefined}:{targetId:'nighthawk'}),...(battle?.status==='active'?{expectedEncounterId:battle.id,expectedTurnIndex:battle.turnIndex,expectedRound:battle.round,expectedActorPosition:actor?{x:actor.x,y:actor.y}:undefined}:{})});if(ok)clear();else setError('Use rejected; refresh and check the current state.')}catch(e){setError(String(e))}finally{setBusy(false)}
 }} className="rounded bg-amber-700 px-3 py-2 disabled:opacity-40">Confirm use</button><button type="button" onClick={clear}>Cancel</button></div>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
