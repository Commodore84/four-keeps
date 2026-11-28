import {useEffect,useState} from 'react';
import {Castle,BookOpen,DoorOpen,BrickWall,Clock,Coins,Hammer,MapPin,MessageCircle,Plus,Shield,Users} from 'lucide-react';
import type {Campaign} from '../game/campaign';
import {
 BASIC_TYPES,BIOMES,SIZES,SPECIAL_FACILITIES,BASTION_TURN_MINUTES,BASIC_BUILD_COSTS,
 bastionLevel,bastionSlots,eligibleSpecial,planBastion,establishBastion,addSpecialFacility,replaceSpecialFacility,
 constructBasic,expandBasic,upgradeSpecialFacility,constructWallSection,
 nextBastionTurnMinutes,canIssueOrder,issueFacilityOrder,
 enterBastion,leaveBastion,issueMaintainOrder,advanceBastionClock,roomOpportunity,
 GARDEN_TYPES,gardenChoices,gardenHarvestRequest,collectBastionSupply,changeGardenType,nameBastionHireling,
 type BastionBiome,type BasicType,type FacilitySize,type GardenType,type BastionFacility,
} from '../game/bastion';
import {walletCopper} from '../game/frontierShop';

type Props={campaign:Campaign|null;saving:boolean;onChange:(next:Campaign,message:string)=>Promise<boolean>|boolean|void;onAdventure:(message?:string)=>void};
const panel='rounded-xl border border-white/15 bg-panel p-3';
const button='min-h-11 rounded-lg border border-gold/35 px-3 py-2 text-sm font-medium text-gold disabled:opacity-40';
const select='min-h-11 w-full rounded-lg border border-white/20 bg-ink px-3 py-2 text-base text-parchment';
const input='min-h-11 w-full rounded-lg border border-white/20 bg-ink px-3 py-2 text-base text-parchment';
const zones=['Courtyard','Main Hall','West Wing','East Wing','Upper Floor','Outer Grounds'] as const;
const formatCost=(n:number)=>new Intl.NumberFormat('en-US').format(n)+' GP';
export function BastionPlace({campaign,saving,onChange,onAdventure}:Props){
 const b=campaign?.bastion;
 const [name,setName]=useState('');const [region,setRegion]=useState('');
 const [biome,setBiome]=useState<BastionBiome>('Temperate');const [description,setDescription]=useState('');
 const [cramped,setCramped]=useState<BasicType>('Bedroom');
 const [roomy,setRoomy]=useState<BasicType>('Storage');
 const [specialOne,setSpecialOne]=useState('library');const [specialTwo,setSpecialTwo]=useState('workshop');
 const [newSpecial,setNewSpecial]=useState('');const [replacement,setReplacement]=useState('');
 const [selected,setSelected]=useState('');const [newBasic,setNewBasic]=useState<BasicType>('Bedroom');
 const [newSize,setNewSize]=useState<FacilitySize>('Cramped');const [wallSection,setWallSection]=useState('North wall');
 const [orderText,setOrderText]=useState('');const [error,setError]=useState('');
 const [gardenOne,setGardenOne]=useState<GardenType>('Food');
 const [gardenTwo,setGardenTwo]=useState<GardenType>('Herb');
 const [newGarden,setNewGarden]=useState<GardenType>('Food');
 const [upgradeGarden,setUpgradeGarden]=useState<GardenType>('Herb');
 const [replantPlot,setReplantPlot]=useState(0);const [replantType,setReplantType]=useState<GardenType>('Herb');
 const [gardenOutputOne,setGardenOutputOne]=useState('');
 const [gardenOutputTwo,setGardenOutputTwo]=useState('');
 const [pickupAmount,setPickupAmount]=useState<Record<string,string>>({});
 const [hirelingName,setHirelingName]=useState('');

 useEffect(()=>{setName(b?.name??'');setRegion(b?.region??campaign?.location??'');setBiome(b?.biome??'Temperate');setDescription(b?.description??'');},[b?.id]);
 const level=campaign?bastionLevel(campaign):1;
 const gold=campaign?.inventoryLedger?Math.floor(walletCopper(campaign.inventoryLedger.currency)/100):0;
 const minute=campaign?.elapsedMinutes??0;
 const canManage=!!campaign&&!!b&&b.status==='established'&&b.visited&&campaign.location===b.name;
 const eligible=campaign?SPECIAL_FACILITIES.filter(d=>eligibleSpecial(campaign,d)):[];
 const activeSpecials=b?.facilities.filter(f=>f.kind==='special')??[];
 const pendingOrders=b?.orders.filter(o=>o.status!=='resolved')??[];
 const selectable=eligible.filter(d=>d.repeatable||!activeSpecials.some(f=>f.definitionId===d.id));
 const chosen=b?.facilities.find(f=>f.id===selected);
 const chosenDefinition=chosen?.definitionId?SPECIAL_FACILITIES.find(x=>x.id===chosen.definitionId):undefined;
 const gardenPlots=chosen?.definitionId==='garden'?chosen.gardenTypes??['Food']:[];
 const gardenOptions=gardenPlots.map((g,i)=>gardenChoices(g).find(x=>x.id===(i===0?gardenOutputOne:gardenOutputTwo))?.id??gardenChoices(g)[0].id);
 const gardenTask=gardenPlots.length?gardenHarvestRequest(gardenPlots,gardenOptions):'';

 const constructionOn=chosen?b?.construction.find(j=>j.facilityId===chosen.id&&j.finishesAt>minute):undefined;
 const progress=campaign&&b?.status==='established'?Math.max(0,Math.ceil((nextBastionTurnMinutes(campaign)-minute)/1440)):0;
 const isPending=!!campaign?.bastion&&campaign.bastion.status==='established';
 const pendingClock=!!campaign&&isPending&&(minute>=(b!.foundedAtMinutes??minute)+BASTION_TURN_MINUTES*(b!.lastProcessedTurn+1)||
  b!.construction.some(p=>p.finishesAt<=minute)||b!.orders.some(o=>o.status==='active'&&o.completedAt<=minute));
 useEffect(()=>{
  if(!campaign||saving||!pendingClock)return;
  const next=advanceBastionClock(campaign);
  if(next!==campaign)void onChange(next,'Bastion projects and turns updated.');
 },[campaign?.id,campaign?.elapsedMinutes,campaign?.bastion?.lastProcessedTurn,
  campaign?.bastion?.construction.length,campaign?.bastion?.orders.length,saving,pendingClock]);
 async function perform(fn:()=>Campaign,success:string){
  if(!campaign||saving)return;setError('');
  try{await onChange(fn(),success);}
  catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 if(!campaign)return <section className="space-y-2"><h2 className="font-serif text-2xl">Bastion</h2><p className="text-parchment/70">Choose a campaign to view its Bastion.</p></section>;
 const available=!!b&&b.status==='established';
 const pendingRoomConstruction=!!constructionOn;
 const mention=(f:BastionFacility)=>{
  if(!b)return;
  onAdventure('At '+b.name+', I want to visit the '+f.name+' in the '+f.zone+'. Describe the location and introduce any established residents or relevant events.');
 };
 return <section className="space-y-3" aria-label="Bastion location">
   <header className="space-y-1">
    <div className="flex items-center gap-2"><Castle className="h-5 w-5 text-gold"/><h2 className="font-serif text-2xl">Bastion</h2></div>
    <p className="text-xs text-parchment/65">Your physical headquarters · 2024 Dungeon Master’s Guide</p>
   </header>
   {error&&<p role="alert" className="rounded border border-red-400/40 p-2 text-sm text-red-300">{error}</p>}
   {!b||b.status==='prospective'?<>
    <div className={panel+' space-y-3'}>
      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold"/><h3 className="font-serif text-xl">The future stronghold</h3></div>
      <p className="text-sm text-parchment/75">Introduce a property early in the story. Until level 5, it is a persistent place to visit, not a working Bastion with production or bonuses.</p>
      <label className="block space-y-1 text-xs">Property name<input aria-label="Bastion name" className={input} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="block space-y-1 text-xs">Region<input aria-label="Bastion region" className={input} maxLength={120} value={region} onChange={e=>setRegion(e.target.value)}/></label>
      <label className="block space-y-1 text-xs">Surrounding biome<select aria-label="Bastion biome" className={select} value={biome||b?.biome} onChange={e=>setBiome(e.target.value as BastionBiome)}>
       {BIOMES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block space-y-1 text-xs">History or appearance (optional)<textarea aria-label="Bastion description" className={input+' h-auto'} maxLength={240} rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></label>
      <button type="button" disabled={saving} className={button+' w-full'} onClick={()=>void perform(()=>planBastion(campaign,{name:name||b?.name||'',region:region||b?.region||campaign.location,biome,description:description||b?.description||''}),'Property recorded in campaign memory.')}>Save property</button>
      {b&&<button type="button" className={button+' w-full'} onClick={()=>onAdventure('I would like to visit '+b.name+' in '+b.region+' and explore what is already there. Do not grant Bastion abilities before level 5.')}><MessageCircle size={15} className="mr-1 inline"/>Explore through the DM</button>}
    </div>
    {level<5?<p className={panel+' text-sm text-parchment/75'}>Bastion facilities unlock at level 5. There are no early production benefits, orders, or special rooms.</p>:b&&<div className={panel+' space-y-3'}>
      <h3 className="font-serif text-lg">Establish your Bastion</h3>
      <p className="text-xs text-parchment/70">At level 5, choose one free Cramped room, one free Roomy room, and two free eligible special facilities.</p>
      <label className="block space-y-1 text-xs">Cramped basic room<select aria-label="Starting Cramped room" className={select} value={cramped} onChange={e=>setCramped(e.target.value as BasicType)}>{BASIC_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block space-y-1 text-xs">Roomy basic room<select aria-label="Starting Roomy room" className={select} value={roomy} onChange={e=>setRoomy(e.target.value as BasicType)}>{BASIC_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block space-y-1 text-xs">First special facility<select aria-label="First special facility" className={select} value={specialOne} onChange={e=>setSpecialOne(e.target.value)}>{eligible.map(d=><option key={d.id} value={d.id}>{d.name} · {d.order}</option>)}</select></label>
      <label className="block space-y-1 text-xs">Second special facility<select aria-label="Second special facility" className={select} value={specialTwo} onChange={e=>setSpecialTwo(e.target.value)}>{eligible.map(d=><option key={d.id} value={d.id}>{d.name} · {d.order}</option>)}</select></label>
      {specialOne==='garden'&&<label className="block space-y-1 text-xs">First Garden type<select aria-label="First Garden type" className={select} value={gardenOne} onChange={e=>setGardenOne(e.target.value as GardenType)}>{GARDEN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>}
      {specialTwo==='garden'&&<label className="block space-y-1 text-xs">Second Garden type<select aria-label="Second Garden type" className={select} value={gardenTwo} onChange={e=>setGardenTwo(e.target.value as GardenType)}>{GARDEN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>}
      <button type="button" className={button+' w-full'} disabled={saving||!eligible.some(d=>d.id===specialOne)||!eligible.some(d=>d.id===specialTwo)} onClick={()=>void perform(()=>establishBastion(campaign,{cramped,roomy,specials:[specialOne,specialTwo],gardenTypes:[gardenOne,gardenTwo]}),'Bastion established at level '+level+'.')}>Confirm free Bastion facilities</button>
    </div>}
   </>:available&&<>
    <div className={panel+' space-y-2'}>
      <h3 className="font-serif text-xl">{b.name}</h3>
      <p className="text-xs text-parchment/70">{b.region} · {b.biome} · {canManage?'At your Bastion':'Away from Bastion'}</p>
      {b.description&&<p className="text-sm text-parchment/80">{b.description}</p>}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
       <div className="rounded-lg bg-ink p-2"><p className="font-semibold text-gold">{activeSpecials.length}/{bastionSlots(level)}</p>Special</div>
       <div className="rounded-lg bg-ink p-2"><p className="font-semibold text-gold">{progress}d</p>Next turn</div>
       <div className="rounded-lg bg-ink p-2"><p className="font-semibold text-gold">{gold.toLocaleString()}</p>Gold</div>
      </div>
      <div className="flex flex-wrap gap-2">
       {!canManage&&(campaign.location===b.region||campaign.location===b.name)&&<button type="button" disabled={saving} className={button} onClick={()=>void perform(()=>enterBastion(campaign),'Entered '+b.name+'.')}><DoorOpen className="mr-1 inline h-4 w-4"/>Enter Bastion</button>}
       {canManage&&<button type="button" disabled={saving} className={button} onClick={()=>void perform(()=>leaveBastion(campaign),'Left '+b.name+'.')}><DoorOpen className="mr-1 inline h-4 w-4"/>Leave Bastion</button>}
       <button type="button" className={button} onClick={()=>onAdventure('I would like to explore '+b.name+' and speak to anyone there. Preserve its saved rooms, history, and inhabitants.')}><MessageCircle className="mr-1 inline h-4 w-4"/>Speak to DM</button>
      </div>
      {!canManage&&<p className="text-xs text-parchment/60">The building can be viewed from afar. You must visit to issue facility orders unless appropriate magical communication is established through the DM.</p>}
    </div>

    <section aria-label="Bastion spaces" className="space-y-2">
      <div className="flex items-center justify-between gap-2"><h3 className="font-serif text-xl">Explore the property</h3><p className="text-xs text-parchment/60">Select a space</p></div>
      {zones.map(zone=>{
       const rooms=b.facilities.filter(f=>f.zone===zone);if(!rooms.length)return null;
       return <div key={zone} className={panel+' space-y-2'}>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-gold">{zone}</h4>
        {rooms.map(f=>{
         const building=b.construction.find(p=>p.facilityId===f.id&&p.finishesAt>minute);
         const d=f.definitionId?SPECIAL_FACILITIES.find(x=>x.id===f.definitionId):null;
         return <button key={f.id} type="button" aria-label={'Open '+f.name+' '+f.id.slice(0,5)} aria-expanded={selected===f.id} onClick={()=>{setSelected(selected===f.id?'':f.id);setOrderText('');setReplacement('');}} className={'flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left '+(selected===f.id?'border-gold/65 bg-gold/10':'border-white/10 bg-ink/45')}>
          <span><span className="block text-sm font-semibold">{f.name}</span><span className="text-xs text-parchment/60">{f.size} · {d?d.order:'Basic room'}{building?' · Building':''}</span></span><span className="text-xs text-gold">{selected===f.id?'Selected':'Visit'}</span>
         </button>;
        })}
       </div>
      })}
    </section>
    {chosen&&<div className={panel+' space-y-3'} aria-label="Selected Bastion room">
      <div className="flex items-center justify-between gap-2"><h3 className="font-serif text-xl">{chosen.name}</h3><span className="text-xs text-parchment/70">{chosen.size}</span></div>
      <p className="text-sm text-parchment/70">{chosen.kind==='basic'?roomOpportunity(chosen.name as BasicType,b.biome):
        chosenDefinition?chosenDefinition.order+' facility · '+chosenDefinition.hirelings+' included hireling(s).':'Special facility'}</p>
      {chosen.definitionId==='garden'&&<p className="text-xs text-gold">Garden plots: {gardenPlots.join(' + ')}{chosen.size==='Vast'?' · two harvests per order':''}</p>}
      {chosen.definitionId==='barrack'&&<p className="text-xs text-gold">Recruit up to four defenders per completed order · {chosen.size==='Vast'?'25':'12'} defender capacity</p>}
      {chosen.definitionId==='garden'&&<div className="space-y-2 border-t border-white/10 pt-2">
        <p className="text-xs font-semibold">Replant Garden · 21 days, free</p>
        <div className="grid grid-cols-2 gap-2">
          {gardenPlots.length>1&&<select aria-label="Garden plot to replant" className={select} value={replantPlot} onChange={e=>setReplantPlot(Number(e.target.value))}>{gardenPlots.map((type,i)=><option key={i} value={i}>Plot {i+1}: {type}</option>)}</select>}
          <select aria-label="Garden replant type" className={select} value={replantType} onChange={e=>setReplantType(e.target.value as GardenType)}>{GARDEN_TYPES.map(x=><option key={x}>{x}</option>)}</select>
        </div>
        <button className={button+' w-full'} type="button" disabled={saving||!canManage||!!pendingRoomConstruction||gardenPlots[replantPlot]===replantType||b.orders.some(o=>o.facilityId===chosen.id&&o.status==='active')} onClick={()=>void perform(()=>changeGardenType(campaign,chosen.id,replantPlot,replantType),'Garden replanting begun; 21 days until ready.')}>Replant selected plot</button>
      </div>}
      {pendingRoomConstruction&&<p className="text-xs text-gold">Under construction · {Math.ceil((constructionOn!.finishesAt-minute)/1440)} days remaining</p>}
      <button type="button" className={button+' w-full'} onClick={()=>mention(chosen)}><MessageCircle className="mr-1 inline h-4 w-4"/>Visit and talk with the DM</button>
      {chosen.kind==='basic'&&chosen.size!=='Vast'&&<button type="button" disabled={saving||pendingRoomConstruction||!b.visited} className={button+' w-full'} onClick={()=>void perform(()=>expandBasic(campaign,chosen.id),'Expansion funded; construction started.')}>
       Enlarge · {chosen.size==='Cramped'?'500 GP · 25 days':'2,000 GP · 80 days'}</button>}
      {chosen.kind==='special'&&chosenDefinition?.upgradeToVast&&chosen.size==='Roomy'&&<div className="space-y-2">
        {chosen.definitionId==='garden'&&<label className="block space-y-1 text-xs">Second Garden plot type<select aria-label="Vast Garden second plot" value={upgradeGarden} onChange={e=>setUpgradeGarden(e.target.value as GardenType)} className={select}>{GARDEN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>}
        <button type="button" className={button+' w-full'} disabled={saving||!canManage||gold<2000} onClick={()=>void perform(()=>upgradeSpecialFacility(campaign,chosen.id,upgradeGarden),'Special facility upgraded to Vast.')}>Upgrade to Vast · 2,000 GP</button>
       </div>}
      {chosen.kind==='special'&&chosenDefinition&&<div className="space-y-2 border-t border-white/10 pt-2">
        <h4 className="text-sm font-semibold">Residents · Facility hirelings</h4>
        {(chosen.hirelingNames??[]).length>0&&<p className="text-sm">{chosen.hirelingNames!.join(' · ')}</p>}
        <div className="flex items-center gap-2">
          <input aria-label="Name a Bastion hireling" className={input+' min-w-0 flex-1'} placeholder="Hireling's name" value={hirelingName} maxLength={60} onChange={e=>setHirelingName(e.target.value)}/>
          <button className={button} disabled={!canManage||saving||hirelingName.trim().length<2} type="button" onClick={()=>void perform(()=>nameBastionHireling(campaign,chosen.id,hirelingName),'Named resident recorded in the shared NPC world.').then(()=>setHirelingName(''))}>Name</button>
        </div>
      </div>}
      {chosen.kind==='special'&&chosenDefinition&&<>
       <p className="text-xs text-parchment/60">Orders: {chosenDefinition.order}. Tasks run on the campaign clock; any printed rewards not yet automated require DM adjudication.</p>
       {chosen.definitionId==='garden'?<div className="space-y-2">
        {gardenPlots.map((type,i)=><label key={i} className="block space-y-1 text-xs">{type} Garden harvest{gardenPlots.length>1?' · plot '+(i+1):''}<select aria-label={'Garden harvest plot '+(i+1)} className={select} value={gardenOptions[i]} onChange={e=>i===0?setGardenOutputOne(e.target.value):setGardenOutputTwo(e.target.value)}>{gardenChoices(type).map(o=><option key={o.id} value={o.id}>{o.quantity} × {o.name}</option>)}</select></label>)}
       </div>:<label className="block space-y-1 text-xs">Task or intended outcome<input aria-label="Bastion order task" className={input} maxLength={160} placeholder={chosen.definitionId==='barrack'?'Recruit Bastion Defenders':chosenDefinition.order==='Research'?'Research a local ruin':chosenDefinition.order==='Craft'?'Specify the item':chosenDefinition.order==='Recruit'?'Recruit eligible defenders':'Specify the work'} value={chosen.definitionId==='barrack'?'Recruit Bastion Defenders':orderText} disabled={chosen.definitionId==='barrack'} onChange={e=>setOrderText(e.target.value)}/></label>}
       <button type="button" disabled={saving||!canIssueOrder(campaign,chosen.id)||(chosen.definitionId!=='barrack'&&chosen.definitionId!=='garden'&&orderText.trim().length<3)} className={button+' w-full'} onClick={()=>void perform(()=>issueFacilityOrder(campaign,chosen.id,chosen.definitionId==='garden'?gardenTask:orderText),'Facility order recorded and scheduled.')}>Issue {chosenDefinition.order} order</button>
       {level>b.lastReplacementLevel&&<div className="space-y-2 border-t border-white/10 pt-3">
         <p className="text-xs text-parchment/70">You may replace one facility after gaining a level. This uses your replacement for level {level}.</p>
         <select aria-label="Replacement special facility" className={select} value={replacement} onChange={e=>setReplacement(e.target.value)}><option value="">Choose replacement</option>{selectable.filter(d=>d.id!==chosen.definitionId).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
         <button type="button" className={button+' w-full'} disabled={saving||!replacement} onClick={()=>void perform(()=>replaceSpecialFacility(campaign,chosen.id,replacement),'Special facility replaced for level '+level+'.')}>Replace facility</button>
       </div>}
      </>}
    </div>}
    <section aria-label="Develop Bastion" className={panel+' space-y-3'}>
      <h3 className="flex items-center gap-2 font-serif text-xl"><Hammer className="h-4 w-4 text-gold"/>Develop</h3>
      <p className="text-xs text-parchment/65">Special facilities are gained free at level milestones; basic rooms and walls cost gold and in-game construction time.</p>
      <p className="text-sm">{activeSpecials.length}/{bastionSlots(level)} special facilities occupied</p>
      {activeSpecials.length<bastionSlots(level)&&<div className="space-y-2">
       <select className={select} aria-label="Add special facility" value={newSpecial} onChange={e=>setNewSpecial(e.target.value)}><option value="">Choose a free special facility</option>{selectable.map(d=><option key={d.id} value={d.id}>{d.name} · level {d.level}</option>)}</select>
       {newSpecial==='garden'&&<label className="block space-y-1 text-xs">Garden type<select aria-label="Additional Garden type" className={select} value={newGarden} onChange={e=>setNewGarden(e.target.value as GardenType)}>{GARDEN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>}
       <button type="button" className={button+' w-full'} disabled={saving||!newSpecial} onClick={()=>void perform(()=>addSpecialFacility(campaign,newSpecial,newGarden),'Special facility added.')}>Add eligible facility (free)</button>
      </div>}
      <div className="border-t border-white/10 pt-3 space-y-2">
       <h4 className="font-semibold">Add basic room</h4>
       <div className="grid grid-cols-2 gap-2">
         <label className="text-xs">Type<select aria-label="New basic room type" className={select} value={newBasic} onChange={e=>setNewBasic(e.target.value as BasicType)}>{BASIC_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
         <label className="text-xs">Size<select aria-label="New basic room size" className={select} value={newSize} onChange={e=>setNewSize(e.target.value as FacilitySize)}>{SIZES.map(x=><option key={x}>{x}</option>)}</select></label>
       </div>
       <button type="button" className={button+' w-full'} disabled={saving||gold<BASIC_BUILD_COSTS[newSize].gp} onClick={()=>void perform(()=>constructBasic(campaign,newBasic,newSize),'Basic room construction started.')}>
        <Plus className="mr-1 inline h-4 w-4"/>Build · {formatCost(BASIC_BUILD_COSTS[newSize].gp)} · {BASIC_BUILD_COSTS[newSize].days} days
       </button>
      </div>
      <div className="border-t border-white/10 pt-3 space-y-2">
       <h4 className="flex items-center gap-2 font-semibold"><BrickWall className="h-4 w-4"/>Defensive walls</h4>
       <p className="text-sm text-parchment/70">{b.wallSections.filter(w=>w.completeAt<=minute).length} completed sections · {b.wallSections.filter(w=>w.completeAt>minute).length} under construction</p>
       <p className="text-xs text-parchment/65">Each 5-foot section costs 250 GP and takes 10 days. The defense bonus requires a verified fully enclosed perimeter; length alone does not prove enclosure.</p>
       <input aria-label="Wall section location" className={input} maxLength={70} value={wallSection} onChange={e=>setWallSection(e.target.value)}/>
       <button type="button" className={button+' w-full'} disabled={saving||gold<250||!wallSection.trim()} onClick={()=>void perform(()=>constructWallSection(campaign,wallSection),'Defensive wall section started.')}>Build 5-foot wall section · 250 GP</button>
      </div>
    </section>
    {canManage&&<div className={panel+' space-y-2'}>
      <h3 className="font-serif text-lg">Maintain the Bastion</h3>
      <p className="text-xs text-parchment/65">Instead of ordering facilities, have your hirelings maintain the property this turn. This triggers one official Bastion event.</p>
      <button type="button" className={button+' w-full'} disabled={saving||b.maintainedTurns.includes(Math.max(0,Math.floor((minute-(b.foundedAtMinutes??minute))/BASTION_TURN_MINUTES)))||b.orders.some(o=>o.issuedTurn===Math.max(0,Math.floor((minute-(b.foundedAtMinutes??minute))/BASTION_TURN_MINUTES)))} onClick={()=>void perform(()=>issueMaintainOrder(campaign),'Maintain order recorded; event awaiting DM review.')}>Issue Maintain instead</button>
    </div>}
    {b.stores.length>0&&<section className={panel+' space-y-3'} aria-label="Bastion storage">
      <h3 className="font-serif text-xl">Stored supplies</h3>
      <p className="text-xs text-parchment/65">Harvested goods remain at the Bastion until you collect them. They do not teleport into your adventuring inventory.</p>
      {b.stores.map(item=><div key={item.name} className="space-y-2 border-t border-white/10 pt-2">
        <p className="text-sm font-medium">{item.name} · {item.quantity} available</p>
        <div className="flex items-center gap-2"><input aria-label={'Collect quantity of '+item.name} inputMode="numeric" className={input+' flex-1'} value={pickupAmount[item.name]??String(item.quantity)} onChange={e=>setPickupAmount(v=>({...v,[item.name]:e.target.value}))}/>
        <button className={button} type="button" disabled={saving||!canManage} onClick={()=>void perform(()=>collectBastionSupply(campaign,item.name,Number(pickupAmount[item.name]??item.quantity)),'Supplies collected from Bastion storage.')}>Collect</button></div>
      </div>)}
    </section>}
    {(b.construction.length>0||pendingOrders.length>0)&&<section className={panel+' space-y-2'} aria-label="Bastion projects">
      <h3 className="flex items-center gap-2 font-serif text-lg"><Clock className="h-4 w-4 text-gold"/>Ongoing work</h3>
      {b.construction.map(p=><p key={p.id} className="text-sm">{p.kind==='wall-section'?'Wall · '+(p.section??''):p.kind==='replant-garden'?'Replant Garden':p.kind==='expand-basic'?'Expand '+b.facilities.find(f=>f.id===p.facilityId)?.name:'Build '+b.facilities.find(f=>f.id===p.facilityId)?.name} · {Math.max(0,Math.ceil((p.finishesAt-minute)/1440))} days</p>)}
      {pendingOrders.slice(-12).map(o=><div key={o.id} className="space-y-1 border-t border-white/10 pt-2 text-sm">
        <p className="font-medium">{b.facilities.find(f=>f.id===o.facilityId)?.name} · {o.type} · {o.status==='active'?'In progress':'DM review required'}</p>
        <p className="text-xs text-parchment/70">{o.request}</p>
        {o.status==='awaiting-dm'&&<button type="button" className={button} onClick={()=>onAdventure('At '+b.name+', the '+o.type+' order for '+(b.facilities.find(f=>f.id===o.facilityId)?.name??'the facility')+' has finished: '+o.request+'. Please adjudicate its outcome using the published 2024 Bastion rules without inventing automatic rewards.')}>Discuss finished order</button>}
      </div>)}
    </section>}
    {(b.events.length>0||b.reports.length>0)&&<section className={panel+' space-y-2'} aria-label="Bastion reports">
      <h3 className="font-serif text-xl">Steward's reports</h3>
      {b.events.slice(-6).reverse().map(e=><div key={e.id} className="space-y-1 rounded border border-white/10 p-2 text-sm">
        <p className="font-semibold">{e.name} · turn {e.turn} (d100: {e.roll})</p>
        <p className="text-xs text-parchment/65">Official Maintain event; consequences await DM adjudication.</p>
        <button type="button" className={button} onClick={()=>onAdventure('My Bastion '+b.name+' has a pending Maintain event, '+e.name+' (roll '+e.roll+'). Please run the official 2024 Bastion event and any choices through our conversation, preserving the saved Bastion state.')}>Discuss with DM</button>
      </div>)}
      {b.reports.slice(-5).reverse().map((r,i)=><p key={i} className="text-xs text-parchment/70">{r}</p>)}
    </section>}
    <div className="flex items-center justify-between gap-2 text-xs text-parchment/50"><span><Shield className="mr-1 inline h-3 w-3"/> {b.defenders} defenders</span><span><Users className="mr-1 inline h-3 w-3"/> {activeSpecials.reduce((sum,f)=>sum+((SPECIAL_FACILITIES.find(d=>d.id===f.definitionId)?.hirelings??0)+(f.size==='Vast'&&['garden','workshop'].includes(f.definitionId??'')?(f.definitionId==='garden'?1:2):0)),0)} facility hirelings</span><span><Coins className="mr-1 inline h-3 w-3"/> {formatCost(gold)}</span></div>
    <p className="text-xs text-parchment/55"><BookOpen className="mr-1 inline h-3 w-3"/>The room list is the saved property layout. A future illustration will render these same spaces, not generate new rooms.</p>
   </>}
 </section>;
}
