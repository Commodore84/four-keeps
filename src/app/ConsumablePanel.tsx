import {useRef,useState} from 'react';
import type {Campaign} from '../game/campaign';
import {antitoxinSecondsRemaining,eligibleKitTargets,equipmentLightRemaining,equipmentLightRules,provisionsToday,type EquipmentLight,type ConsumableName,type ConsumableRequest} from '../game/consumables';
import {attackCompanionWithVerifiedStats,basicPoisonWeapon,endCompanionTurn,finishCompanionEncounter,recoverEncounterAmmunition,thrownConsumableTargets,type HolyWaterTargetType} from '../game/companionEncounter';
export function ConsumablePanel({campaign,saving,onUse,onEncounterChange}:{campaign:Campaign;saving:boolean;onUse:(r:ConsumableRequest)=>Promise<boolean>;onEncounterChange?:(next:Campaign,message:string)=>Promise<boolean>|boolean|void}){
 const owned=(campaign.inventoryLedger?.gear??[]).filter(g=>g.quantity>0&&(g.name==='Ball Bearings'||g.name==='Caltrops'||g.name==='Rations'||g.name==='Waterskin'||g.name==='Rope'||g.name==='Candle'||g.name==='Lamp'||g.name==='Torch'||g.name==='Poison, Basic'||g.name==='Oil'||g.name==='Alchemist’s Fire'||g.name==='Holy Water'||g.name==='Acid'||g.name==='Antitoxin'||g.name==="Healer's Kit"));
 const [name,setName]=useState<ConsumableName|null>(null),[target,setTarget]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [acidSave,setAcidSave]=useState(''),[acidDamage,setAcidDamage]=useState('');
 const [creatureType,setCreatureType]=useState<HolyWaterTargetType|''>('');
  const [ropeCheck,setRopeCheck]=useState(''),[waterChoice,setWaterChoice]=useState<'drink'|'refill'>('drink');
 const [groundX,setGroundX]=useState(''),[groundY,setGroundY]=useState(''),[level,setLevel]=useState(false),[spillOil,setSpillOil]=useState(false);
 const [poisonQuantity,setPoisonQuantity]=useState('3');
 const [combatTarget,setCombatTarget]=useState(''),[combatD20,setCombatD20]=useState(''),[combatDamage,setCombatDamage]=useState(''),[combatRange,setCombatRange]=useState(''),[recoverAmmo,setRecoverAmmo]=useState('1');
 const [recoveryId,setRecoveryId]=useState(''),[recoveryAccess,setRecoveryAccess]=useState(false);
 const pending=useRef<string|null>(null);
 const antitoxinRemaining=antitoxinSecondsRemaining(campaign);
 const lights=(Object.keys(equipmentLightRules) as EquipmentLight[]).filter(light=>equipmentLightRemaining(campaign,light)>0);
 const recovery=campaign.companionEncounter?.status==='completed'?
  campaign.companionEncounter.groundSupplies??[]:[];
 const recoverable=recovery.find(supply=>supply.id===recoveryId);
 const canTrack=!!campaign.characterIdentity&&campaign.companionEncounter?.status!=='active'&&!campaign.provisionTracking;
 if(!canTrack&&!campaign.provisionTracking&&!recovery.length&&!owned.length&&!antitoxinRemaining&&!campaign.companionEncounter?.basicPoison&&!campaign.companionEncounter?.poisonedAmmunition&&!campaign.companionEncounter?.groundOil?.length&&!lights.length)return null;
 const item=owned.find(g=>g.name===name),battle=campaign.companionEncounter,actor=battle?.participants.nighthawk,targets=eligibleKitTargets(campaign);
 const selected=targets.find(t=>t.id===target),recipient=battle?.participants[target]??battle?.objects?.[target];
 const throwing=name==='Oil'||name==='Alchemist’s Fire'||name==='Acid'||name==='Holy Water';
 const targetsInRange=throwing?thrownConsumableTargets(campaign,name!=='Oil',name==='Acid'||name==='Oil'):[];
 const objectTarget=Object.hasOwn(battle?.objects??{},target);
 const needsDamage=name!=='Oil'&&(name!=='Holy Water'||creatureType!=='Other');
 const poisonWeapon=name==='Poison, Basic'?basicPoisonWeapon(campaign):undefined;
 const equippedAmmo=({shortbow:'Arrows',longbow:'Arrows','light-crossbow':'Crossbow Bolts','heavy-crossbow':'Crossbow Bolts','hand-crossbow':'Crossbow Bolts',sling:'Sling Bullets'} as Record<string,'Arrows'|'Crossbow Bolts'|'Sling Bullets'>)[campaign.encounterLoadout?.weaponId??''];
 const ammoOwned=equippedAmmo?(campaign.inventoryLedger?.gear.find(g=>g.name===equippedAmmo)?.quantity??0)+(equippedAmmo==='Arrows'&&!campaign.characterIdentity?campaign.equipment?.arrows??0:0):0;
 const ammoWeaponName=({shortbow:'Shortbow',longbow:'Longbow','light-crossbow':'Light Crossbow','heavy-crossbow':'Heavy Crossbow','hand-crossbow':'Hand Crossbow',sling:'Sling'} as Record<string,string>)[campaign.encounterLoadout?.weaponId??''];
 const canCoatAmmo=!!equippedAmmo&&!!ammoWeaponName&&campaign.inventoryLedger?.gear.some(g=>g.name===ammoWeaponName&&g.quantity>0)&&ammoOwned>=Number(poisonQuantity)&&Number.isInteger(Number(poisonQuantity))&&Number(poisonQuantity)>=1&&Number(poisonQuantity)<=3;
 const canCoat=!!(poisonWeapon||canCoatAmmo)&&battle?.status==='active'&&battle.mode==='unified'&&battle.order[battle.turnIndex]==='nighthawk'&&!!actor&&!actor.bonusActionUsed&&!battle.basicPoison&&!battle.poisonedAmmunition;
 const lightName=name==='Candle'||name==='Lamp'||name==='Torch'?name:undefined;
 const light=lightName?campaign.equipmentLights?.[lightName]:undefined;
 const oil=owned.find(gear=>gear.name==='Oil');
 const lightRemaining=lightName?equipmentLightRemaining(campaign,lightName):0;
 const isBurning=lightRemaining>0&&light?.startedAt!==undefined;
 const extinguishing=lightName==='Lamp'&&isBurning;
 const canLight=!!lightName&&(extinguishing||!isBurning&&
  campaign.inventoryLedger?.gear.some(gear=>gear.name==='Tinderbox'&&gear.quantity>0)&&
  (lightName!=='Lamp'||lightRemaining>0||!!oil?.quantity));
 const today=provisionsToday(campaign),pints=campaign.waterskinPints??4;
 const supplyState=name==='Rope'?campaign.ropeKnotted??false:name==='Waterskin'?{today,pints}:today;
 const useSupply=name==='Rations'&&battle?.status!=='active'||
  name==='Waterskin'&&item?.quantity===1&&battle?.status!=='active'&&(waterChoice==='drink'?pints>0:pints<4)||
  name==='Rope'&&item?.quantity===1&&!campaign.ropeKnotted&&ropeCheck!=='';
 const deploying=name==='Ball Bearings'||name==='Caltrops'||name==='Oil'&&spillOil;
 const canDeploy=deploying&&battle?.status==='active'&&level&&groundX!==''&&groundY!=='';
 const ready=canDeploy||useSupply||canLight||canCoat||throwing&&!deploying&&targetsInRange.includes(target)&&(objectTarget||acidSave!=='')&&(!needsDamage||acidDamage!=='')&&(name!=='Holy Water'||creatureType!=='')||name==='Antitoxin'||name==="Healer's Kit"&&!!selected;
 const clear=()=>{setName(null);setTarget('');setAcidSave('');setAcidDamage('');setCreatureType('');setRopeCheck('');setWaterChoice('drink');setGroundX('');setGroundY('');setLevel(false);setSpillOil(false);pending.current=null;setError('')};
 return <section aria-label="Adventuring consumables" className="rounded-xl border border-white/20 p-3 space-y-2">
 <h3 className="font-semibold">Adventuring consumables</h3>
 <p className="text-xs text-parchment/70">Antitoxin: Bonus Action, advantage against Poisoned for 1 in-game hour. Healer's Kit: Action, stabilize an adjacent unconscious ally at 0 HP; 10 uses per kit.</p>
 {antitoxinRemaining>0&&<p role="status">Antitoxin active: {Math.floor(antitoxinRemaining/60)} in-game minutes remaining{antitoxinRemaining%60>0?' ('+antitoxinRemaining%60+' additional seconds)':''}</p>}
 {lights.map(source=>{
  const rules=equipmentLightRules[source],remaining=Math.ceil(equipmentLightRemaining(campaign,source)/60);
  const burning=campaign.equipmentLights?.[source]?.startedAt!==undefined;
  return <p key={source} role="status">{source}: {burning?`${rules.bright} ft bright, ${rules.dim} ft additional dim`:'extinguished'} · {remaining} min remaining</p>;
 })}
 {battle?.status==='active'&&battle.mode==='unified'&&!!battle.groundOil?.length&&<details className="rounded border border-white/20 p-2"><summary>Ground Oil — DM-confirmed ignition</summary>
 {battle.groundOil.filter(o=>o.ignitedRound===undefined&&battle.round<o.expiresRound).map(o=><div key={o.id} className="flex items-center justify-between gap-2 py-2"><span>Oil at ({o.x}, {o.y})</span><button type="button" disabled={saving||busy} className="rounded bg-amber-700 px-3 py-2" onClick={async()=>{setBusy(true);setError('');try{if(!await onUse({name:'Oil',requestId:crypto.randomUUID(),confirmed:true,expectedQuantity:0,expectedElapsedMinutes:campaign.elapsedMinutes??0,expectedEncounterId:battle.id,expectedRound:battle.round,expectedTurnIndex:battle.turnIndex,igniteOilId:o.id}))setError('Ignition rejected; refresh encounter state.')}catch(e){setError(String(e))}finally{setBusy(false)}}}>Confirm DM ignition</button></div>)}
 </details>}
 {lightName&&<p className="text-sm">{extinguishing?'Extinguish the lamp with Utilize. Unused oil is retained.':`Light ${lightName} with an owned Tinderbox as a Bonus Action.${lightName==='Lamp'&&!lightRemaining?' A new burn uses one flask of Oil.':''}`}</p>}
 <label className="block text-sm">Supply<select aria-label="Choose consumable" className="mt-1 block w-full rounded bg-slate-900 p-2" value={name??''} onChange={e=>{setName(e.target.value as ConsumableName||null);setTarget('');setAcidSave('');setAcidDamage('');setCreatureType('');setRopeCheck('');setWaterChoice('drink');setGroundX('');setGroundY('');setLevel(false);setSpillOil(false);pending.current=null;setError('')}}><option value="">Choose a supply</option>{owned.map(g=><option key={g.name} value={g.name}>{g.name} ({g.quantity}{g.name==="Healer's Kit"?", "+(campaign.healerKitUsesRemaining??10)+" uses in current kit":''})</option>)}</select></label>
 {name==='Oil'&&<label className="block text-sm"><input type="checkbox" checked={spillOil} onChange={e=>{setSpillOil(e.target.checked);pending.current=null}}/> Spill Oil on an adjacent 5-foot square instead of throwing at a target</label>}
 {deploying&&<fieldset className="space-y-2">
  <label>Ground X<input type="number" className="w-full bg-slate-900" value={groundX} onChange={e=>{setGroundX(e.target.value);pending.current=null}}/></label>
  <label>Ground Y<input type="number" className="w-full bg-slate-900" value={groundY} onChange={e=>{setGroundY(e.target.value);pending.current=null}}/></label>
  <label><input type="checkbox" checked={level} onChange={e=>{setLevel(e.target.checked);pending.current=null}}/> DM confirms level ground</label>
 </fieldset>}
 {name==='Rations'&&<p>Eat one ration. Today: {today.rations} eaten.</p>}
 {name==='Waterskin'&&<div><p>Water: {pints}/4 pints · {today.waterPints} drunk today</p>
  <label>Waterskin use<select className="block w-full bg-slate-900" value={waterChoice} onChange={e=>{setWaterChoice(e.target.value as 'drink'|'refill');pending.current=null}}>
   <option value="drink">Drink one pint</option><option value="refill">Refill from a DM-confirmed source</option>
  </select></label></div>}
 {name==='Rope'&&(campaign.ropeKnotted?<p>Rope knot tied.</p>:<label>Tie a knot · DC 10 Sleight of Hand
  <input className="block w-full bg-slate-900" type="number" aria-label="Verified Rope check total" value={ropeCheck} onChange={e=>{setRopeCheck(e.target.value);pending.current=null}}/>
 </label>)}
 {name==="Healer's Kit"&&<label className="block text-sm">Recipient<select aria-label="Consumable recipient" className="mt-1 block w-full rounded bg-slate-900 p-2" value={target} onChange={e=>{setTarget(e.target.value);pending.current=null;setError('')}}><option value="">Select an eligible ally</option>{targets.map(t=><option key={t.id} value={t.id}>{t.id} (0 HP)</option>)}</select></label>}
 {battle?.basicPoison&&<p role="status">Basic Poison coating active.</p>}
 {battle?.poisonedAmmunition&&<p role="status">Poisoned {battle.poisonedAmmunition.name}: {battle.poisonedAmmunition.remaining} coated shot(s) remain.</p>}
 {battle?.poisonedAmmunition&&onEncounterChange&&<section aria-label="Player poisoned ammunition combat" className="space-y-2 rounded border border-amber-500/40 p-2">
  <strong>Poisoned ammunition combat</strong><p className="text-xs">A coated shot is spent on a hit or miss. Use the DM-verified attack roll, damage dice and range; weapon bonuses are calculated from your equipped weapon.</p>
  {battle.status==='active'&&battle.order[battle.turnIndex]==='nighthawk'&&<>
   <label className="block">Enemy target<select aria-label="Poisoned ammunition enemy" className="block w-full bg-slate-900" value={combatTarget} onChange={e=>setCombatTarget(e.target.value)}><option value="">Choose enemy</option>{Object.entries(battle.participants).filter(([,a])=>a.actorKind==='enemy'&&a.hp>0).map(([id])=><option key={id} value={id}>{id}</option>)}</select></label>
   <label className="block">Attack d20<input aria-label="Poisoned ammunition d20" type="number" min="1" max="20" className="block w-full bg-slate-900" value={combatD20} onChange={e=>setCombatD20(e.target.value)}/></label>
   <label className="block">Verified weapon damage dice<input aria-label="Poisoned ammunition damage dice" type="number" min="0" className="block w-full bg-slate-900" value={combatDamage} onChange={e=>setCombatDamage(e.target.value)}/></label>
   <label className="block">Range (feet)<input aria-label="Poisoned ammunition range" type="number" min="5" step="5" className="block w-full bg-slate-900" value={combatRange} onChange={e=>setCombatRange(e.target.value)}/></label>
   <button type="button" disabled={saving||busy||battle.participants.nighthawk.actionUsed||!combatTarget||!combatD20||combatDamage===''||!combatRange} className="rounded bg-amber-700 px-3 py-2 disabled:opacity-40" onClick={async()=>{setBusy(true);setError('');try{const next=attackCompanionWithVerifiedStats(campaign,'nighthawk',combatTarget,Number(combatD20),Number(combatDamage),'Piercing',Number(combatRange));if(await onEncounterChange(next,'Poisoned ammunition attack resolved')===false)throw Error('Attack could not be saved');setCombatD20('');setCombatDamage('')}catch(e){setError(String(e))}finally{setBusy(false)}}}>Attack with poisoned ammunition</button>
   <button type="button" disabled={saving||busy} className="rounded border border-white/30 px-3 py-2" onClick={async()=>{setBusy(true);setError('');try{const next=endCompanionTurn(campaign,'nighthawk');if(await onEncounterChange(next,'Player combat turn ended')===false)throw Error('Turn could not be saved')}catch(e){setError(String(e))}finally{setBusy(false)}}}>End player turn</button>
  </>}
  {battle.status==='completed'&&<><label className="block">Recoverable arrows<input aria-label="Poisoned ammunition recovery quantity" type="number" min="1" className="block w-full bg-slate-900" value={recoverAmmo} onChange={e=>setRecoverAmmo(e.target.value)}/></label><button type="button" disabled={saving||busy} onClick={async()=>{setBusy(true);setError('');try{const next=recoverEncounterAmmunition(campaign,'Arrows',Number(recoverAmmo));if(await onEncounterChange(next,'Ammunition recovered')===false)throw Error('Recovery could not be saved')}catch(e){setError(String(e))}finally{setBusy(false)}}}>Recover spent arrows</button></>}
  {battle.status==='active'&&battle.order[battle.turnIndex]==='nighthawk'&&<button type="button" disabled={saving||busy} onClick={async()=>{setBusy(true);setError('');try{const next=finishCompanionEncounter(campaign);if(await onEncounterChange(next,'Encounter completed')===false)throw Error('Encounter could not be saved')}catch(e){setError(String(e))}finally{setBusy(false)}}}>Finish encounter (DM confirmed)</button>}
 </section>}
 {name==='Poison, Basic'&&<p>{poisonWeapon?'Coat '+poisonWeapon.name+' as a Bonus Action.':equippedAmmo?'Coat up to three owned '+equippedAmmo+' as a Bonus Action.':'Equip a compatible owned weapon.'}</p>}
 {name==='Poison, Basic'&&equippedAmmo&&<label className="block">Ammunition pieces (1–3)<input aria-label="Poisoned ammunition quantity" type="number" min={1} max={3} className="block w-full bg-slate-900" value={poisonQuantity} onChange={e=>{setPoisonQuantity(e.target.value);pending.current=null}}/></label>}
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
  try{const ok=await onUse({name:item.name as ConsumableName,requestId:pending.current,confirmed:true,expectedQuantity:item.quantity,expectedElapsedMinutes:campaign.elapsedMinutes??0,expectedWeaponId:poisonWeapon?.id,...(name==='Poison, Basic'&&equippedAmmo?{poisonAmmunition:{name:equippedAmmo,quantity:Number(poisonQuantity)}}:{}),expectedSupplyState:JSON.stringify(supplyState),supplyOperation:waterChoice,ropeCheck:Number(ropeCheck),...(deploying?{ground:{x:Number(groundX),y:Number(groundY),level}}:{}),...(lightName?{lightOperation:extinguishing?'extinguish' as const:'light' as const,expectedLight:JSON.stringify(light??null),expectedFuelQuantity:oil?.quantity}:{}),...(throwing&&!deploying?{targetId:target,expectedTargetHP:recipient?.hp,expectedTargetPosition:recipient?{x:recipient.x,y:recipient.y}:undefined,throwRolls:{saveTotal:Number(acidSave),damage:Number(acidDamage),targetType:name==='Holy Water'?creatureType||undefined:undefined}}:name==="Healer's Kit"?{expectedKitUses:campaign.healerKitUsesRemaining??10,targetId:target,expectedTargetHP:recipient?.hp,expectedTargetPosition:recipient?{x:recipient.x,y:recipient.y}:undefined}:{targetId:'nighthawk'}),...(battle?.status==='active'?{expectedEncounterId:battle.id,expectedTurnIndex:battle.turnIndex,expectedRound:battle.round,expectedActorPosition:actor?{x:actor.x,y:actor.y}:undefined}:{})});if(ok)clear();else setError('Use rejected; refresh and check the current state.')}catch(e){setError(String(e))}finally{setBusy(false)}
 }} className="rounded bg-amber-700 px-3 py-2 disabled:opacity-40">Confirm use</button><button type="button" onClick={clear}>Cancel</button></div>}
 {canTrack&&<details className="rounded border border-white/20 p-2">
  <summary>Daily food and water</summary>
  <p>Track the next full game day. Use the Rations and Waterskin controls to record intake. Enable this for campaigns using those supplies.</p>
  <button disabled={saving||busy} onClick={async()=>{
   setBusy(true);setError('');
   try{if(!await onUse({name:'Rations',requestId:crypto.randomUUID(),confirmed:true,expectedQuantity:0,
    expectedElapsedMinutes:campaign.elapsedMinutes??0,supplyOperation:'track'}))setError('Supply tracking could not be enabled.')}
   catch(error){setError(String(error))}finally{setBusy(false)}
  }}>Enable daily supply tracking</button>
 </details>}
 {campaign.provisionTracking&&<p>Daily supplies: {today.rations} ration(s) · {today.waterPints}/8 pints</p>}
 {recovery.length>0&&<fieldset className="space-y-2">
  <legend>Recover deployed supplies</legend>
  <label>Deployed supply<select className="block w-full bg-slate-900" value={recoveryId} onChange={e=>{setRecoveryId(e.target.value);setRecoveryAccess(false)}}>
   <option value="">Choose a deployment</option>
   {recovery.map(supply=><option value={supply.id} key={supply.id}>{supply.name} at ({supply.x}, {supply.y})</option>)}
  </select></label>
  {recoverable&&<><label className="block"><input type="checkbox" checked={recoveryAccess} onChange={e=>setRecoveryAccess(e.target.checked)}/> DM confirms access to the deployed supply</label>
   <button type="button" disabled={saving||busy||!recoveryAccess} className="rounded bg-amber-700 px-3 py-2 disabled:opacity-40" onClick={async()=>{
    setBusy(true);setError('');
    try{
     const ok=await onUse({name:recoverable.name,requestId:crypto.randomUUID(),confirmed:true,
      expectedQuantity:owned.find(entry=>entry.name===recoverable.name)?.quantity??0,
      expectedElapsedMinutes:campaign.elapsedMinutes??0,expectedEncounterId:battle?.id,
      recoverGround:{id:recoverable.id,accessConfirmed:recoveryAccess}});
     if(ok){setRecoveryId('');setRecoveryAccess(false)}
     else setError('Recovery rejected; refresh and check the current state.');
    }catch(error){setError(String(error))}finally{setBusy(false)}
   }}>Recover (10 minutes)</button></>}
 </fieldset>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
