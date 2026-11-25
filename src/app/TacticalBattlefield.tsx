import {useEffect,useMemo,useRef,useState,type TouchEvent} from 'react';
import type {Campaign} from '../game/campaign';
import {distanceFeet,squareKey,type Square} from '../game/combatScenario';
import {pendingWebSave,previewCompanionMovement,primaryAttackLimit,resolveWebTurnSave,standCompanionFromProne} from '../game/companionEncounter';
import {ITEM_BY_ID} from '../game/creationEquipment';
import {weaponAttackProfile} from '../game/weaponAttackProfile';
import {
 escapeTacticalGrapple,finishTacticalEncounter,resolveTacticalConcentration,resumeTacticalMovement,resolveTacticalReaction,rollDie,startTacticalEncounter,tacticalAction,tacticalDeathSave,tacticalEndTurn,tacticalMove,
 tacticalPlayerAttack,tacticalPlayerSpell,type TacticalAction,
} from '../game/tacticalCombat';
import {abilityModifier} from '../game/checks';

const actionNames:TacticalAction[]=['Dash','Disengage','Dodge','Hide','Search','Study','Help','Grapple','Shove','Ready','Utilize'];
const button='min-h-10 rounded-md border border-gold/40 bg-panel px-2 py-1 text-sm disabled:opacity-45';
type Props={campaign:Campaign;saving:boolean;onChange:(next:Campaign,message:string)=>Promise<boolean>|boolean|void;onDm:(message?:string)=>Promise<void>};

export function TacticalBattlefield({campaign,saving,onChange,onDm}:Props){
 const battle=campaign.companionEncounter,tactical=battle?.phaseThree;
 const setup=campaign.adventureSession?.pendingEncounter?.scenario;
 const scenario=setup??tactical?.scenario;
 const player=battle?.participants.nighthawk;
 const active=battle?.order[battle.turnIndex];
 const [destination,setDestination]=useState<Square|undefined>(()=>setup?.starts[0]);
 const activeStart=setup&&(destination===undefined||!setup.starts.some(tile=>squareKey(tile)===squareKey(destination)))?setup.starts[0]:destination;
 const [target,setTarget]=useState('');
 const [selectedAction,setSelectedAction]=useState<TacticalAction>('Dash');
 const [mode,setMode]=useState('weapon');
 const [spell,setSpell]=useState('');
 const [error,setError]=useState('');
 const [zoom,setZoom]=useState(1);
 const [showKey,setShowKey]=useState(false);
 const [showNavigation,setShowNavigation]=useState(false);
 const viewport=useRef<HTMLDivElement>(null);
 const actionPanel=useRef<HTMLDivElement>(null);
 const gesture=useRef<{distance:number;x:number;y:number;left:number;top:number;scale:number}>();
 const auto=useRef('');
 const pending=battle?.pendingOpportunity;
 const incoming=tactical?.pendingHit;
 const isPlayer=active==='nighthawk';
 const awaitingPlayer=!!incoming||!!tactical?.pendingReady||!!tactical?.concentrationCheck||!!pending?.attackerIds.includes('nighthawk');
 const awaitingDm=!setup&&!awaitingPlayer&&(active!=='nighthawk'||!!pending?.attackerIds.length);
 const web=battle?.web;
 const webSave=battle&&pendingWebSave(battle);
 const canMove=!!battle&&isPlayer&&!awaitingPlayer&&!pending?.destination&&!webSave;
 const label=(id:string)=>id==='nighthawk'?(campaign.characterIdentity?.name??'Player'):scenario?.actors.find(actor=>actor.id===id)?.label??id;
 const mask=new Set(scenario?.actors.map(actor=>actor.id));
 const occupied=new Map(Object.entries(battle?.participants??{}).filter(([id,actor])=>actor.hp>0&&(id==='nighthawk'||mask.has(id))&&
  (!actor.rogueHidden||id==='nighthawk'||actor.rogueDetectedBy?.includes('nighthawk'))).map(([id,actor])=>[squareKey(actor),id]));
 if(setup){occupied.clear();for(const actor of setup.actors)occupied.set(squareKey(actor.square),actor.id);}
 const board=useMemo(()=>scenario?Array.from({length:scenario.size**2},(_,index)=>({x:index%scenario.size,y:Math.floor(index/scenario.size)})):[],[scenario]);
 const reachable=useMemo(()=>{
  if(!canMove||!player)return new Set<string>();
  const limit=Math.max(0,player.speedFeet+player.dashFeet-player.movementSpentFeet);
  return new Set(board.filter(cell=>distanceFeet(cell,player)<=limit&&distanceFeet(cell,player)>0&&!previewCompanionMovement(campaign,'nighthawk',cell.x,cell.y).error).map(squareKey));
 },[board,campaign,canMove,player]);
 const preview=destination&&canMove?previewCompanionMovement(campaign,'nighthawk',destination.x,destination.y):undefined;
 const path=new Set(preview?.path.map(squareKey));
 const current=battle?.participants[target];
 const equipment=ITEM_BY_ID[campaign.encounterLoadout?.weaponId??''];
 const range=equipment?weaponAttackProfile(equipment,mode==='thrown').maximumRange:undefined;
 const targetDistance=player&&current?distanceFeet(player,current):undefined;
 const rogue=campaign.characterIdentity?.classId==='rogue';
 const level=campaign.character?.level??1;
 const spells=['Fire Bolt','Magic Missile','Web','Cure Wounds'].filter(name=>campaign.character?.cantrips?.includes(name)||campaign.character?.preparedSpells?.includes(name));
 useEffect(()=>{
  if(!awaitingDm||saving||!battle||awaitingPlayer||pending?.destination&&!pending.attackerIds.length)return;
  const key=battle.id+':'+battle.round+':'+battle.turnIndex+':'+(pending? squareKey(pending.from)+':'+squareKey(pending.to):'turn');
  if(auto.current===key)return;
  auto.current=key;
  void onDm();
 },[awaitingDm,awaitingPlayer,battle,onDm,pending,saving]);
 useEffect(()=>{setDestination(undefined);},[battle?.id,battle?.round,battle?.turnIndex]);
 if(!scenario)return null;
 async function apply(operation:()=>Campaign,message:string){
  setError('');
  try{
   if(await onChange(operation(),message)===false)throw Error('The combat change could not be saved.');
   setDestination(undefined);
  }catch(problem){setError(problem instanceof Error?problem.message:'Combat action failed.');}
 }
 function pick(square:Square){
  if(saving)return;
  if(setup){
   if(setup.starts.some(cell=>squareKey(cell)===squareKey(square))){setDestination(square);setError('');}
   return;
  }
  const id=occupied.get(squareKey(square));
  if(id&&id!=='nighthawk'){setTarget(id);setDestination(undefined);return;}
  if(!canMove)return;
  if(destination&&squareKey(square)===squareKey(destination)&&preview&&!preview.error){
   void apply(()=>tacticalMove(campaign,'nighthawk',square),'Movement resolved.');
  }else setDestination(square);
 }
 function centerView(square:Square){
  const view=viewport.current;
  if(!view)return;
  const cellSize=view.scrollWidth/(scenario?.size??8);
  view.scrollTo({left:Math.max(0,(square.x+0.5)*cellSize-view.clientWidth/2),
   top:Math.max(0,(square.y+0.5)*cellSize-view.clientHeight/2),behavior:'smooth'});
 }
 const visibleFoes=scenario.actors.filter(actor=>actor.side==='enemies'&&
  (setup||!!battle?.participants[actor.id]?.hp));
 function foeSquare(id:string):Square|undefined{
  if(setup)return setup.actors.find(actor=>actor.id===id)?.square;
  const actor=battle?.participants[id];return actor?{x:actor.x,y:actor.y}:undefined;
 }
 function touchStart(event:TouchEvent){
  if(event.touches.length!==2||!viewport.current)return;
  const [a,b]=Array.from(event.touches);
  gesture.current={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,
   left:viewport.current.scrollLeft,top:viewport.current.scrollTop,scale:zoom};
 }
 function touchMove(event:TouchEvent){
  const start=gesture.current,element=viewport.current;
  if(!start||!element||event.touches.length!==2)return;
  const [a,b]=Array.from(event.touches);
  setZoom(Math.max(1,Math.min(2.5,start.scale*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/Math.max(start.distance,1))));
  element.scrollLeft=start.left+start.x-(a.clientX+b.clientX)/2;
  element.scrollTop=start.top+start.y-(a.clientY+b.clientY)/2;
 }
 const rollout=tactical?.lastRoll, initiative=tactical?.initiative.find(roll=>roll.actor==='nighthawk');
 const visibleOrder=battle?.order.filter(id=>id==='nighthawk'||[...occupied.values()].includes(id));
 const enemyCount=scenario?.actors.filter(actor=>actor.side==='enemies').length??0;
 const activeCount=scenario?.actors.filter(actor=>actor.side==='enemies'&&(setup||!!battle?.participants[actor.id]?.hp)).length??0;
 const selectedOpponent=current&&target!=='nighthawk';
 const lastNarration=[...campaign.journal].reverse().find(entry=>entry.kind==='dm')?.text;
 return <section aria-label="Tactical battlefield" className="space-y-2" data-encounter={battle?.id}>
  <header aria-label="Combat initiative tracker" className="rounded-xl border border-gold/40 bg-panel p-3 space-y-2">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div><p className="text-sm font-semibold text-gold">Initiative · Round {battle?.round??1}</p>
     <p className="font-semibold">{setup?'Choose your starting position':awaitingPlayer?'Reaction available':active==='nighthawk'?'Nighthawk’s turn':active?label(active)+' acts':'Combat'}</p></div>
    <div className="flex items-center gap-3 text-sm">
     {!setup&&player&&<span aria-label="Player hit points"><strong>{player.hp}/{player.maxHp}</strong> HP</span>}
     <span aria-label="Enemies remaining">{activeCount}/{enemyCount} foes</span>
    </div>
   </div>
   {setup?<p className="text-sm text-parchment/80">{scenario.objective||lastNarration} · Choose where to enter, then roll initiative.</p>:<>
    <div aria-label="Combat resources" className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-parchment/85">
     <span>Move <strong>{Math.max(0,(player?.speedFeet??0)+(player?.dashFeet??0)-(player?.movementSpentFeet??0))} ft</strong></span>
     <span>Action <strong className={player?.actionUsed?'text-parchment/50':'text-emerald-300'}>{player?.actionUsed?'Spent':'Ready'}</strong></span>
     <span>Bonus <strong className={player?.bonusActionUsed?'text-parchment/50':'text-emerald-300'}>{player?.bonusActionUsed?'Spent':'Ready'}</strong></span>
     <span>Reaction <strong className={player?.reactionUsed?'text-parchment/50':'text-emerald-300'}>{player?.reactionUsed?'Spent':'Ready'}</strong></span>
    </div>
    {!!player?.conditions.length&&<p className="text-sm">{player.conditions.join(' · ')}</p>}
    <p aria-label="Initiative order" className="text-sm text-parchment/75">{visibleOrder?.map(label).join(' → ')}{initiative?' · You: '+initiative.dice.join('/')+' + '+initiative.modifier+' = '+initiative.total:''}</p>
   </>}
  </header>
  {setup&&<div className="space-y-2 rounded-lg border border-gold/25 bg-panel/70 p-3" aria-label="Combat setup controls">
    <p className="text-sm font-semibold text-gold">Nighthawk's starting position</p>
    <p className="text-xs text-parchment/75">A blue You token marks your selected square. Choose a different starting square on the map or with these controls. No initiative has been rolled yet.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Starting positions">
     {setup.starts.map((cell,index)=><button key={squareKey(cell)} type="button" aria-pressed={!!activeStart&&squareKey(activeStart)===squareKey(cell)} disabled={saving}
      onClick={()=>{setDestination(cell);setError('');}} className={button+(activeStart&&squareKey(activeStart)===squareKey(cell)?' border-gold bg-gold/20 text-gold':'')}>Position {index+1}{activeStart&&squareKey(activeStart)===squareKey(cell)?' · Selected':''}</button>)}
    </div>
    <button type="button" className="min-h-12 w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-45" disabled={saving||!activeStart}
     onClick={()=>activeStart&&void apply(()=>startTacticalEncounter(campaign,activeStart),'Initiative rolled.')}>Roll initiative and begin combat</button>
    <p className="text-xs text-parchment/60">Red tokens are enemies · ◢ cover · ▧ obstacle · ≈ difficult terrain · ↗ exit</p>
   </div>}
  <p className="px-1 text-sm leading-snug text-parchment/80" aria-label="Battlefield navigation instructions">Pinch to zoom · Two fingers to pan · Tap to select · Map fits at 100%.</p>
  {!setup&&isPlayer&&!awaitingPlayer&&<div aria-label="Quick combat controls" className="grid grid-cols-3 gap-2 rounded-xl border border-gold/25 bg-[#22272b] p-2">
   <button type="button" className="min-h-11 rounded-lg bg-gold px-2 text-sm font-semibold text-ink disabled:opacity-40"
    disabled={saving||!current||!equipment||!!player?.actionUsed&&((player.primaryAttacks??0)===0||(player.primaryAttacks??0)>=primaryAttackLimit(campaign))}
    onClick={()=>void apply(()=>tacticalPlayerAttack(campaign,target,{offhand:false,thrown:false,sneak:false}),'Attack resolved.')}>Attack target</button>
   <button type="button" className="min-h-11 rounded-lg border border-gold/50 px-2 text-sm font-semibold disabled:opacity-40"
    disabled={saving||!destination||!preview||!!preview.error}
    onClick={()=>destination&&void apply(()=>tacticalMove(campaign,'nighthawk',destination),'Movement resolved.')}>Confirm move</button>
   <button type="button" className="min-h-11 rounded-lg border border-white/30 px-2 text-sm font-semibold disabled:opacity-40"
    disabled={saving||!!webSave} onClick={()=>void apply(()=>tacticalEndTurn(campaign),'Turn ended.')}>Finish turn</button>
  </div>}
  <div className="flex gap-2 px-1"><button type="button" className="min-h-9 rounded-md border border-white/20 px-3 text-sm" aria-expanded={showNavigation} onClick={()=>setShowNavigation(v=>!v)}>{showNavigation?'Hide navigation':'Find character or enemies'}</button></div>
  {showNavigation&&<>
  <div className="flex flex-wrap items-center gap-2 px-1" aria-label="Battlefield navigation">
   <button type="button" className="min-h-11 rounded-lg border border-sky-400/50 bg-sky-950/35 px-3 text-sm font-semibold"
    onClick={()=>{const cell=setup?activeStart:player;if(cell)centerView(cell);}}>Find me</button>
   <button type="button" className="min-h-11 rounded-lg border border-white/30 px-3 text-sm font-semibold"
    onClick={()=>{setZoom(0.7);viewport.current?.scrollTo({left:0,top:0,behavior:'smooth'});}}>Show whole map</button>
   {visibleFoes.map((foe,index)=><button key={foe.id} type="button" className={'min-h-11 rounded-lg border px-3 text-sm font-semibold '+(target===foe.id?'border-amber-300 bg-amber-900/40':'border-red-400/40 bg-red-950/30')}
    onClick={()=>{setTarget(foe.id);const cell=foeSquare(foe.id);if(cell)centerView(cell);}} aria-label={'Focus '+foe.label+' '+(index+1)}>{foe.label} {index+1}</button>)}
  </div>
  </>}
  <div className="flex items-center justify-between gap-2 px-1 text-xs text-parchment/75">
   <span className="font-semibold text-parchment">Battlefield <span className="font-normal text-parchment/55">· 5 ft squares</span></span>
   <div className="flex items-center gap-1">
   {!setup&&isPlayer&&<button type="button" className="min-h-9 rounded-md border border-gold/45 bg-gold/10 px-2 font-semibold text-gold" onClick={()=>actionPanel.current?.scrollIntoView({behavior:'smooth',block:'center'})}>Combat actions</button>}
   <button type="button" className="min-h-9 rounded-md border border-white/20 px-2" aria-expanded={showKey} onClick={()=>setShowKey(value=>!value)}>{showKey?'Hide terrain key':'Terrain key'}</button>
   </div>
  </div>
  {showKey&&<div className="grid grid-cols-2 gap-1 rounded-lg border border-white/15 p-2 text-[11px] text-parchment/80" aria-label="Terrain key">
   <span>Blue: your character</span><span>Red: hostile creatures</span><span>Dark: blocked terrain</span><span>Green: difficult ground</span><span>Gold outline: selected</span><span>Arrow: exit</span>
  </div>}
  <div className="relative overflow-hidden rounded-xl border border-gold/45 bg-[#19201e] shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]">
   <div ref={viewport} aria-label="Battle map viewport" className="max-h-[55dvh] overflow-auto overscroll-contain touch-pan-x touch-pan-y" onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={()=>{gesture.current=undefined;}}>
    <div role="group" aria-label="Battle map" className="grid aspect-square bg-cover bg-center"
     style={{width:zoom*100+'%',gridTemplateColumns:'repeat('+scenario.size+', minmax(0,1fr))',
      backgroundImage:scenario.artwork?'linear-gradient(#151d2055,#151d2055), url('+scenario.artwork+')':undefined}}>
     {board.map(cell=>{
      const key=squareKey(cell),id=occupied.get(key);
      const obstacle=scenario.obstacles.some(tile=>squareKey(tile)===key);
      const rough=scenario.difficult.some(tile=>squareKey(tile)===key)||!!web&&cell.x>=web.x&&cell.x<web.x+4&&cell.y>=web.y&&cell.y<web.y+4;
      const cover=scenario.cover.some(tile=>squareKey(tile)===key);
      const hazard=battle?.groundOil?.some(tile=>squareKey(tile)===key)||battle?.groundSupplies?.some(tile=>squareKey(tile)===key);
      const dark=scenario.darkness?.some(tile=>squareKey(tile)===key);
      const height=scenario.elevation?.[key];
      const exit=scenario.exits.some(tile=>squareKey(tile)===key);
      const start=!!setup&&scenario.starts.some(tile=>squareKey(tile)===key);
      const selected=id!==undefined&&id===target||!!destination&&squareKey(destination)===key;
      const ally=id==='nighthawk'||scenario.actors.some(actor=>actor.id===id&&actor.side==='allies');
      const terrain=obstacle?'bg-[#303235]':dark?'bg-[#171c23]':rough?'bg-[#31483a]':cover?'bg-[#544a3b]':height?'bg-[#46463d]':'bg-[#344039]';
      const decoration=terrain+(selected?' ring-2 ring-inset ring-amber-300 bg-amber-600/35':start?' ring-1 ring-inset ring-teal-300/75':'')+(path.has(key)?' outline outline-2 outline-emerald-300':'')+(reachable.has(key)?' shadow-[inset_0_0_0_2px_rgba(52,211,153,0.25)]':'');
      const playerStart=!!setup&&!!activeStart&&start&&squareKey(activeStart)===key;
      const summary=[playerStart?'Nighthawk selected starting position':'',id?label(id):'',obstacle?'obstacle':'',rough?'difficult terrain':'',dark?'darkness':'',height?height+' ft elevation':'',cover?'cover':'',hazard?'hazard':'',exit?'exit':'',start?'starting square':''].filter(Boolean).join(', ');
      return <button key={key} type="button" aria-label={'Square '+cell.x+', '+cell.y+(summary?', '+summary:'')} aria-pressed={selected}
       onClick={()=>pick(cell)} disabled={saving||obstacle||(!!setup&&!start)} className={'relative aspect-square min-w-0 border border-black/25 text-xs transition-colors '+(start?'touch-manipulation ':'')+decoration}>
       {playerStart?<span className="absolute inset-[8%] grid place-items-center rounded-full bg-sky-700 text-base font-bold text-white ring-2 ring-amber-300 shadow-lg">You</span>:id?<span title={label(id)} className={'absolute inset-[8%] grid place-items-center rounded-full border-2 text-base font-bold text-white shadow-md '+(ally?'border-sky-200 bg-sky-800':'border-red-300 bg-red-900')}>{id==='nighthawk'?'You':id.startsWith('giant-rat-')?'Rat':label(id).slice(0,5)}</span>:
        <span aria-hidden="true" className={'text-lg font-bold '+(obstacle?'text-slate-300':exit?'text-amber-200':cover?'text-amber-200':'text-parchment/45')}>{obstacle?'▣':hazard?'!':exit?'↗':cover?'◢':rough?'≋':start?'●':''}</span>}
      </button>;
     })}
    </div>
   </div>
   <div className="absolute bottom-1 right-1 flex gap-1">
    <button type="button" className={button} aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-0.25))}>−</button>
    <button type="button" className={button} aria-label="Zoom in" disabled={zoom>=2.5} onClick={()=>setZoom(value=>Math.min(2.5,value+0.25))}>+</button>
   </div>
  </div>
  {!setup&&selectedOpponent&&<div aria-label="Selected creature details" className="flex items-center justify-between gap-3 rounded-xl border border-red-400/25 bg-[#292629] px-3 py-3 text-base">
   <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-red-200/75">Selected target</p><strong className="block truncate">{label(target)}</strong><p className="text-xs text-parchment/70">{targetDistance} ft away · {current?.conditions.length?current.conditions.join(', '):'No observed conditions'}</p></div>
   <button type="button" className="min-h-10 rounded-md border border-white/20 px-3 text-xs" onClick={()=>setTarget('')}>Clear target</button>
  </div>}
  {!setup&&isPlayer&&!awaitingPlayer&&<p className="px-1 text-xs text-parchment/70" aria-label="Combat map help">Tap a foe to target it. Tap a reachable square to preview movement, then tap again or choose Move to confirm.</p>}
  {error&&<p role="alert" className="text-sm text-orange-200">{error}</p>}
  {setup?null:<> 
   {tactical?.note&&<p className="text-sm" aria-label="DM combat narration">{tactical.note}</p>}
   {rollout&&<p role="status" className="text-sm">{rollout.actor==='nighthawk'?'d20 '+rollout.dice.join('/')+(rollout.mode?' ('+rollout.mode+')':'')+' '+(rollout.modifier>=0?'+ ':'− ')+Math.abs(rollout.modifier)+' · ':''}{label(rollout.actor)} {rollout.critical?'critically hits':rollout.hit?'hits':'misses'} {label(rollout.target)}{rollout.hit?' · '+rollout.damage+' damage':''}</p>}
   {preview&&<div className="flex items-center gap-2 text-xs"><p aria-label="Movement preview">{preview.error??preview.costFeet+' ft · '+preview.remainingFeet+' ft left'+(preview.opportunityAttackerIds.length?' · Opportunity attack risk':'')}</p>
    {!preview.error&&destination&&<button className={button} disabled={saving} onClick={()=>void apply(()=>tacticalMove(campaign,'nighthawk',destination),'Movement resolved.')}>Move</button>}</div>}
   {incoming&&<div role="group" aria-label="Incoming attack reaction" className="rounded border border-amber-500/50 p-2 text-sm">
    <p>{label(incoming.attacker)} hit you. Choose a reaction or take the hit.</p>
    {incoming.uncanny&&<button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalReaction(campaign,true),'Uncanny Dodge resolved.')}>Uncanny Dodge</button>}
    {incoming.shield&&<button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalReaction(campaign,'shield'),'Shield resolved.')}>Shield</button>}
    <button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalReaction(campaign,false),'Damage resolved.')}>Take the hit</button>
   </div>}
   {tactical?.pendingReady&&<div role="group" aria-label="Readied attack reaction" className="text-sm">
    <p>{label(tactical.pendingReady.target)} ended a move within your reach.</p>
    <button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalReaction(campaign,true),'Readied attack resolved.')}>Take readied attack</button>
    <button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalReaction(campaign,false),'Readied attack declined.')}>Decline</button>
   </div>}
   {tactical?.concentrationCheck&&<button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalConcentration(campaign),'Concentration save resolved.')}>Roll concentration save</button>}
   {pending?.attackerIds.includes('nighthawk')&&!incoming&&<div role="group" aria-label="Opportunity attack reaction" className="rounded border border-amber-500/50 p-2 text-sm">
    <p>{label(pending.moverId)} is leaving your reach.</p>
    <button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalReaction(campaign,true),'Reaction resolved.')}>Opportunity attack</button>
    <button className={button} disabled={saving} onClick={()=>void apply(()=>resolveTacticalReaction(campaign,false),'Reaction declined.')}>Decline</button>
   </div>}
   {!!pending?.destination&&!pending.attackerIds.length&&!incoming&&<button className={button} disabled={saving} onClick={()=>void apply(()=>resumeTacticalMovement(campaign),'Interrupted movement continued.')}>Continue movement</button>}
   {awaitingDm&&!(pending?.destination&&!pending.attackerIds.length)&&<button className={button} disabled={saving} onClick={()=>void onDm()}>Continue DM turn</button>}
   {isPlayer&&!awaitingPlayer&&!pending?.destination&&<div ref={actionPanel} className="scroll-mt-24 space-y-2 rounded-xl border border-gold/25 bg-[#22272b] p-3" aria-label="Your combat actions">
    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Your combat actions</p>
    {webSave?<button className={button} disabled={saving} onClick={()=>void apply(()=>resolveWebTurnSave(campaign,rollDie(20)+abilityModifier(campaign.character?.scores.dex??10)),'Web save resolved.')}>Roll Web Dexterity save</button>:player?.hp===0?
     <button className={button} disabled={saving||player.deathSaves?.stable||player.deathSaves?.dead} onClick={()=>void apply(()=>tacticalDeathSave(campaign),'Death save resolved.')}>Death save</button>:
     <>
      {current&&<p aria-label="Selected target" className="text-xs">{label(target)} · {targetDistance} ft{range!==undefined&&targetDistance!>range?' · Out of weapon range':''}{current.conditions.length?' · '+current.conditions.join(', '):''}</p>}
      <div className="flex flex-wrap gap-1">
       <label className="sr-only" htmlFor="tactical-attack-mode">Attack mode</label>
       <select id="tactical-attack-mode" value={mode} onChange={event=>setMode(event.target.value)} className={button}>
        <option value="weapon">Weapon</option>{equipment?.properties?.some(value=>value.startsWith('Thrown '))&&<option value="thrown">Throw weapon</option>}
        {campaign.encounterLoadout?.offhandWeaponId&&<option value="offhand">Offhand</option>}
        {rogue&&<option value="sneak">Sneak Attack</option>}
        {rogue&&level>=5&&<><option value="trip">Cunning Strike · Trip</option><option value="poison">Cunning Strike · Poison</option></>}
       </select>
       <button className={button} disabled={saving||!current||!equipment||!!player?.actionUsed&&mode!=='offhand'&&((player.primaryAttacks??0)===0||(player.primaryAttacks??0)>=primaryAttackLimit(campaign))}
        onClick={()=>void apply(()=>tacticalPlayerAttack(campaign,target,{offhand:mode==='offhand',thrown:mode==='thrown',sneak:['sneak','trip','poison'].includes(mode),cunning:mode==='trip'?'Trip':mode==='poison'?'Poison':undefined}),'Attack resolved.')}>Attack</button>
       {!!spells.length&&<><label className="sr-only" htmlFor="tactical-spell">Spell</label><select id="tactical-spell" className={button} value={spell} onChange={event=>setSpell(event.target.value)}><option value="">Spell</option>{spells.map(name=><option key={name}>{name}</option>)}</select>
        <button className={button} disabled={saving||player?.actionUsed||!spell||spell!=='Web'&&!target||spell==='Web'&&!destination} onClick={()=>void apply(()=>tacticalPlayerSpell(campaign,spell,target||'nighthawk',rollDie,destination),'Spell resolved.')}>Cast</button></>}
      </div>
      <div className="flex flex-wrap gap-1">
       <label className="sr-only" htmlFor="tactical-action">Action</label><select id="tactical-action" className={button} value={selectedAction} onChange={event=>setSelectedAction(event.target.value as TacticalAction)}>{actionNames.map(name=><option key={name}>{name}</option>)}</select>
       <button className={button} disabled={saving||player?.actionUsed} onClick={()=>void apply(()=>tacticalAction(campaign,'nighthawk',selectedAction,{target}),selectedAction+' resolved.')}>Use Action</button>
       {rogue&&level>=2&&['Dash','Disengage','Hide'].includes(selectedAction)&&<button className={button} disabled={saving||player?.bonusActionUsed} onClick={()=>void apply(()=>tacticalAction(campaign,'nighthawk',selectedAction,{bonus:true}),selectedAction+' resolved.')}>Cunning Action</button>}
       {rogue&&level>=3&&<button className={button} disabled={saving||player?.bonusActionUsed} onClick={()=>void apply(()=>tacticalAction(campaign,'nighthawk','Steady Aim'),'Steady Aim ready.')}>Steady Aim</button>}
       {tactical?.grapples?.nighthawk&&<button className={button} disabled={saving||player?.actionUsed} onClick={()=>void apply(()=>escapeTacticalGrapple(campaign,'nighthawk'),'Escape checked.')}>Escape grapple</button>}
       {player?.conditions.includes('Prone')&&<button className={button} disabled={saving} onClick={()=>void apply(()=>standCompanionFromProne(campaign,'nighthawk'),'You stood up.')}>Stand</button>}
      </div>
     </>}
    <div className="flex flex-wrap gap-1">
     <button className={button} disabled={saving||!!webSave} onClick={()=>void apply(()=>tacticalEndTurn(campaign),'Turn ended.')}>End turn</button>
     {player&&scenario.exits.some(exit=>distanceFeet(exit,player)===0)&&<button className={button} disabled={saving} onClick={()=>void apply(()=>finishTacticalEncounter(campaign,'escape'),'You escaped.')}>Escape</button>}
    </div>
   </div>}
   {battle&&!Object.values(battle.participants).some(actor=>actor.faction==='enemies'&&actor.hp>0)&&<button className={button} disabled={saving||awaitingPlayer} onClick={()=>void apply(()=>finishTacticalEncounter(campaign,'victory'),'The encounter ended.')}>Return to adventure</button>}
  </>}
 </section>;
}
