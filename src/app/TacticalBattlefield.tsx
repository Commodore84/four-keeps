import {useEffect,useMemo,useRef,useState,type TouchEvent} from 'react';
import type {Campaign} from '../game/campaign';
import {ClassicCombatMapFrame} from './ClassicCombatMapFrame';
import {ClassicCombatGrid,ClassicCombatResources,ClassicInitiativeList,classicCombatCellBase} from './ClassicCombatPresentation';
import {UserRound,Swords} from 'lucide-react';
import {distanceFeet,squareKey,type Square} from '../game/combatScenario';
import {nighthawkEquippedAttack,unifiedCarriedWeaponChoices,unifiedHeldWeapons,stowUnifiedHeldWeapon,pendingWebSave,previewCompanionMovement,primaryAttackLimit,resolveWebTurnSave,setPlayerLoadout,standCompanionFromProne} from '../game/companionEncounter';
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
 const [target,setTarget]=useState(()=>(setup??tactical?.scenario)?.actors.find(actor=>actor.side==='enemies')?.id??'');
 const [showActions,setShowActions]=useState(false);
 const [selectedAction,setSelectedAction]=useState<TacticalAction>('Dash');
 const [mode,setMode]=useState('weapon');
 const [attackWeaponId,setAttackWeaponId]=useState('');
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
 const board=useMemo(()=>scenario?Array.from({length:(scenario.battlefield?.width??scenario.size)*(scenario.battlefield?.height??scenario.size)},(_,index)=>({x:index%(scenario.battlefield?.width??scenario.size),y:Math.floor(index/(scenario.battlefield?.width??scenario.size))})):[],[scenario]);
 const reachable=useMemo(()=>{
  if(!canMove||!player)return new Set<string>();
  const limit=Math.max(0,player.speedFeet+player.dashFeet-player.movementSpentFeet);
  return new Set(board.filter(cell=>distanceFeet(cell,player)<=limit&&distanceFeet(cell,player)>0&&!previewCompanionMovement(campaign,'nighthawk',cell.x,cell.y).error).map(squareKey));
 },[board,campaign,canMove,player]);
 const preview=destination&&canMove?previewCompanionMovement(campaign,'nighthawk',destination.x,destination.y):undefined;
 const path=new Set(preview?.path.map(squareKey));
 const current=battle?.participants[target];
 // Keep a valid hostile selected as foes fall, without exposing enemy HP.
 useEffect(()=>{
  if(!battle||!scenario)return;
  const enemies=scenario.actors.filter(actor=>actor.side==='enemies'&&(battle.participants[actor.id]?.hp??0)>0);
  if(!enemies.some(actor=>actor.id===target))setTarget(enemies[0]?.id??'');
 },[battle,scenario,target]);
 const carriedAttacks=battle?.mode==='unified'&&battle.status==='active'&&campaign.characterIdentity?unifiedCarriedWeaponChoices(campaign):[];
 const chosenAttack=carriedAttacks.find(p=>p.id===attackWeaponId) ??
  carriedAttacks.find(p=>p.itemId===campaign.encounterLoadout?.weaponId&&p.mode!=='thrown'&&p.mode!=='versatile') ??
  carriedAttacks.find(p=>p.handPlan.eligible);
 const legacyWeapon=!campaign.characterIdentity?nighthawkEquippedAttack(campaign):null;
 const equipment=ITEM_BY_ID[chosenAttack?.itemId??legacyWeapon?.weaponId??''];
 const ownedWeapons=Object.values(ITEM_BY_ID).filter(item=>item.category==='weapon'&&(campaign.inventoryLedger?.gear??[]).some(entry=>entry.quantity>0&&entry.name.toLowerCase()===item.name.toLowerCase()));
 const range=chosenAttack?.maximumRange??(equipment?weaponAttackProfile(equipment).maximumRange:undefined);
 const targetDistance=player&&current?distanceFeet(player,current):undefined;
 const meleeProfile=equipment?weaponAttackProfile(equipment):undefined;
 const quickThrown=chosenAttack?.mode==='thrown'||
  !!equipment&&targetDistance!==undefined&&targetDistance>(meleeProfile?.reach??5)&&!!equipment.properties?.some(property=>property.startsWith('Thrown '));
 const quickAttack=quickThrown&&chosenAttack?.itemId?
  carriedAttacks.find(p=>p.itemId===chosenAttack.itemId&&p.mode==='thrown')??chosenAttack:
  chosenAttack;
 const quickProfile=quickThrown&&equipment?weaponAttackProfile(equipment,true):undefined;
 const quickInRange=(!campaign.characterIdentity||!!quickAttack?.handPlan.eligible)&&targetDistance!==undefined&&
  targetDistance<=(quickProfile?.maximumRange??range??0);
 const held=battle?.mode==='unified'&&battle.status==='active'?unifiedHeldWeapons(campaign):{};
 const heldName=(id?:string)=>id?ITEM_BY_ID[id]?.name??id:'Empty';
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
 const rollout=tactical?.lastRoll;
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
    <ClassicCombatResources action={!!player?.actionUsed} bonus={!!player?.bonusActionUsed} move={(player?.speedFeet??0)+(player?.dashFeet??0)-(player?.movementSpentFeet??0)} reaction={!!player?.reactionUsed}/>
    {!!player?.conditions.length&&<p className="text-sm">{player.conditions.join(' · ')}</p>}
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
   {!setup&&isPlayer&&<button type="button" className="min-h-9 rounded-md border border-gold/45 bg-gold/10 px-2 font-semibold text-gold" onClick={()=>actionPanel.current?.scrollIntoView({behavior:'smooth',block:'center'})}>Advanced options</button>}
   <button type="button" className="min-h-9 rounded-md border border-white/20 px-2" aria-expanded={showKey} onClick={()=>setShowKey(value=>!value)}>{showKey?'Hide terrain key':'Terrain key'}</button>
   </div>
  </div>
  {showKey&&<div className="grid grid-cols-2 gap-1 rounded-lg border border-white/15 p-2 text-[11px] text-parchment/80" aria-label="Terrain key">
   <span>Blue: your character</span><span>Red: hostile creatures</span><span>Dark: blocked terrain</span><span>Green: difficult ground</span><span>Gold outline: selected</span><span>Arrow: exit</span>
  </div>}
  <ClassicCombatMapFrame className="border-gold/45 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]">
   <div ref={viewport} aria-label="Battle map viewport" className="max-h-[55dvh] overflow-auto overscroll-contain touch-pan-x touch-pan-y" onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={()=>{gesture.current=undefined;}}>
    <ClassicCombatGrid role="group" ariaLabel="Battle map" size={scenario.battlefield?.width??scenario.size} zoom={zoom} backgroundImage={scenario.artwork}>
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
      const decoration=(obstacle?'bg-stone-500/70 border-stone-300':id==='nighthawk'?'bg-gold text-ink border-gold':id&&!ally?'bg-red-700 text-white border-red-500':id?'bg-sky-700 text-white border-sky-300':selected?'bg-amber-200/85 border-white text-stone-950':reachable.has(key)?'bg-amber-300/20 border-amber-300/80':terrain+' border-white/15')+(selected?' ring-2 ring-inset ring-gold':start?' ring-1 ring-inset ring-teal-300/75':'')+(path.has(key)?' outline outline-2 outline-amber-300':'');
      const playerStart=!!setup&&!!activeStart&&start&&squareKey(activeStart)===key;
      const summary=[playerStart?'Nighthawk selected starting position':'',id?label(id):'',obstacle?'obstacle':'',rough?'difficult terrain':'',dark?'darkness':'',height?height+' ft elevation':'',cover?'cover':'',hazard?'hazard':'',exit?'exit':'',start?'starting square':''].filter(Boolean).join(', ');
      return <button key={key} type="button" aria-label={'Square '+cell.x+', '+cell.y+(summary?', '+summary:'')} aria-pressed={selected}
       onClick={()=>pick(cell)} disabled={saving||obstacle||(!!setup&&!start)} className={classicCombatCellBase+' relative transition-colors '+(start?'touch-manipulation ':'')+decoration}>
       {playerStart?<span className="absolute inset-[8%] grid place-items-center rounded-full bg-sky-700 text-xs font-bold text-white ring-2 ring-amber-300 shadow-lg">You</span>:id?<span title={label(id)} className="relative grid h-full w-full place-items-center">{ally?<UserRound size={16} aria-label={label(id)}/>:<Swords size={16} aria-label={label(id)}/>} {battle?.participants[id]?.conditions.includes('Prone')&&<span aria-hidden="true" className="absolute -right-0.5 -top-1 rounded bg-amber-300 px-0.5 text-[9px] leading-3 font-extrabold text-black">P</span>}</span>:
        <span aria-hidden="true" className={'text-lg font-bold '+(obstacle?'text-slate-300':exit?'text-amber-200':cover?'text-amber-200':'text-parchment/45')}>{obstacle?'▣':hazard?'!':exit?'↗':cover?'◢':rough?'≋':start?'●':''}</span>}
      </button>;
     })}
    </ClassicCombatGrid>
   </div>
   <div className="absolute bottom-1 right-1 flex gap-1">
    <button type="button" className={button} aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-0.25))}>−</button>
    <button type="button" className={button} aria-label="Zoom in" disabled={zoom>=2.5} onClick={()=>setZoom(value=>Math.min(2.5,value+0.25))}>+</button>
   </div>
  </ClassicCombatMapFrame>
  {!setup&&isPlayer&&!awaitingPlayer&&<>
   {campaign.characterIdentity&&<div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold/25 p-2 text-xs" aria-label="Carried weapon controls">
    <select aria-label="Tactical attack weapon" value={chosenAttack?.id??''} onChange={event=>{setAttackWeaponId(event.target.value);setMode('weapon');}} className="min-w-0 flex-1 rounded border border-gold/40 bg-panel p-2">
      {carriedAttacks.map(profile=><option key={profile.id} value={profile.id}>{profile.name} · {profile.damageDice}{profile.handPlan.eligible?'':' · unavailable'}</option>)}
    </select>
    <span aria-label="Tactical held hands">Held: {heldName(held.main)} / {held.off?heldName(held.off):campaign.encounterLoadout?.shieldId?'Shield':'Empty'}</span>
    <span aria-label="Tactical weapon interaction">{chosenAttack?.handPlan.eligible?chosenAttack.handPlan.summary:chosenAttack?.handPlan.reason??'No attack available'}</span>
    {!battle?.weaponObjectInteractionUsed&&(['main','off'] as const).filter(hand=>held[hand]).map(hand=>
      <button key={hand} type="button" className={button} disabled={saving} onClick={()=>void apply(()=>stowUnifiedHeldWeapon(campaign,hand),'Weapon stowed.')}>Stow {heldName(held[hand])}</button>)}
   </div>}
   {!campaign.characterIdentity&&(!equipment||!!current&&!quickInRange)&&<div aria-label="Equip weapon for combat" className="rounded-lg border border-amber-400/50 bg-panel p-2 text-sm space-y-2">
    <p>{equipment?'Target is beyond this weapon’s range. Move closer or switch to another owned weapon.':'Equip an owned weapon to attack. Your other combat actions remain available.'}</p>
    {ownedWeapons.length?<select aria-label="Choose weapon" className="min-h-11 w-full rounded-lg border border-gold/50 bg-panel px-2" value="" disabled={saving}
     onChange={event=>{const id=event.target.value;if(id)void apply(()=>setPlayerLoadout(campaign,'weaponId',id),'Weapon equipped.');}}>
      <option value="">Choose a weapon</option>{ownedWeapons.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
     </select>:<p className="text-xs text-parchment/70">No owned weapon found. Use magic or other actions, or acquire equipment.</p>}
   </div>}
   <div aria-label="Quick combat controls" className="grid grid-cols-2 gap-2 rounded-xl border border-gold/30 bg-panel/70 p-2">
    <button type="button" aria-label="Attack target" className="min-h-12 rounded-lg bg-gold px-2 text-sm font-semibold text-ink disabled:opacity-40"
     disabled={saving||!current||!equipment||!quickInRange||(!!campaign.characterIdentity&&!quickAttack?.handPlan.eligible)||!!player?.actionUsed&&((player.primaryAttacks??0)===0||(player.primaryAttacks??0)>=primaryAttackLimit(campaign))}
     onClick={()=>void apply(()=>tacticalPlayerAttack(campaign,target,{offhand:false,thrown:quickThrown,sneak:false,weaponId:quickAttack?.itemId,attackMode:quickAttack?.mode}),'Attack resolved.')}>Attack {current?label(target):'· Select enemy'}</button>
    <button type="button" className="min-h-12 rounded-lg border border-gold/50 px-2 text-sm font-semibold disabled:opacity-40"
     disabled={saving||!destination||!preview||!!preview.error}
     onClick={()=>destination&&void apply(()=>tacticalMove(campaign,'nighthawk',destination),'Movement resolved.')}>Confirm move</button>
    <button type="button" className="min-h-12 rounded-lg border border-gold/50 bg-gold/10 px-2 text-sm font-semibold" aria-expanded={showActions} aria-controls="classic-combat-actions" onClick={()=>setShowActions(v=>!v)}>Combat actions {showActions?'−':'+'}</button>
    <button type="button" className="min-h-12 rounded-lg border border-white/30 px-2 text-sm font-semibold disabled:opacity-40"
     disabled={saving||!!webSave} onClick={()=>void apply(()=>tacticalEndTurn(campaign),'Turn ended.')}>Finish turn</button>
   </div>
   {showActions&&<div id="classic-combat-actions" aria-label="Classic combat actions" className="rounded-xl border border-gold/35 bg-panel p-2 space-y-2">
    <div className="grid grid-cols-3 gap-2">
     {actionNames.map(action=><button key={action} type="button" className={button+' min-h-11'} disabled={saving||!!player?.actionUsed} onClick={()=>void apply(()=>tacticalAction(campaign,'nighthawk',action,{target}),action+' resolved.')}>{action}</button>)}
    </div>
    {rogue&&level>=2&&<div className="grid grid-cols-3 gap-2" aria-label="Rogue bonus actions">
     {(['Dash','Disengage','Hide'] as const).map(action=><button key={action} type="button" className={button+' min-h-11'} disabled={saving||!!player?.bonusActionUsed} onClick={()=>void apply(()=>tacticalAction(campaign,'nighthawk',action,{bonus:true,target}),action+' bonus action resolved.')}>Cunning {action}</button>)}
    </div>}
    {rogue&&level>=3&&<button type="button" className={button+' w-full min-h-11'} disabled={saving||!!player?.bonusActionUsed} onClick={()=>void apply(()=>tacticalAction(campaign,'nighthawk','Steady Aim',{bonus:true,target}),'Steady Aim resolved.')}>Steady Aim (bonus action)</button>}
   </div>}
  </>}

    <div aria-label="Combat turn summary" className="rounded-xl border border-gold/40 bg-gold/5 p-3 space-y-2 text-sm">
     <p className="text-sm font-semibold text-gold">Initiative · Round {battle?.round??1}</p>
     <ClassicInitiativeList activeId={active} entries={(visibleOrder??[]).map(id=>{
      const actor=battle?.participants[id],roll=tactical?.initiative.find(entry=>entry.actor===id);
      const hp=actor?.hp??0,maxHp=actor?.maxHp??0;
      const status=hp<=0?'Defeated':maxHp>0&&hp<=maxHp/2?'Bloodied':'';
      const last=id==='nighthawk'&&roll?'You: '+roll.dice.join('/')+' + '+roll.modifier+' = '+roll.total+(rollout?.actor===id?' · Last roll: '+rollout.dice.join('/'):''):rollout?.actor===id?'Last roll: '+rollout.dice.join('/'):
       id===active?'Taking turn':roll?'Initiative '+roll.total:'Awaiting initiative';
      return {id,name:label(id),initiative:roll?.total,status:status as 'Defeated'|'Bloodied'|'',conditions:actor?.conditions??[],summary:last};
     })}/>
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
       <button className={button} disabled={saving||!current||!equipment||(!!campaign.characterIdentity&&!chosenAttack?.handPlan.eligible&&mode!=='offhand')||!!player?.actionUsed&&mode!=='offhand'&&((player.primaryAttacks??0)===0||(player.primaryAttacks??0)>=primaryAttackLimit(campaign))}
        onClick={()=>void apply(()=>tacticalPlayerAttack(campaign,target,{offhand:mode==='offhand',thrown:mode==='thrown'||chosenAttack?.mode==='thrown',weaponId:chosenAttack?.itemId,attackMode:mode==='thrown'?'thrown':chosenAttack?.mode,sneak:['sneak','trip','poison'].includes(mode),cunning:mode==='trip'?'Trip':mode==='poison'?'Poison':undefined}),'Attack resolved.')}>Attack</button>
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
