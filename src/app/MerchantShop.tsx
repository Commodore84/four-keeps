import {carriedWeight,carryingCapacity,purchaseWeightAfter} from '../game/carryingCapacity';
import {merchantCategory} from '../game/merchantCategories';
import {merchantItemDescription,merchantItemFacts} from '../game/merchantItemDetails';
import {equipmentPackContents,equipmentPackIndividualValue,packCartContents} from '../game/equipmentPacks';
import {prepareCitySupplyOrder,confirmCitySupplyOrder,collectCitySupplyOrder} from '../game/merchantSupply';
import {useEffect,useState} from 'react';
import {classSummary} from '../game/creationClasses';
import {ADVENTURE_SITES,beginTravelingMerchantRoute} from '../game/adventureSession';
import type {Campaign} from '../game/campaign';
import {merchantStock,remainingMerchantStock,formatFrontierPrice,walletCopper,availableMerchants,settlementTier,MERCHANT_LABELS,merchantCatalogFor} from '../game/frontierShop';

export function MerchantShop({campaign,saving,onClose,onPrepare,onSettle,onDiscuss,onSupplyChange}:{campaign:Campaign;saving:boolean;onClose:()=>void;onPrepare:(items:{itemId:string;quantity:number}[],merchant:ReturnType<typeof availableMerchants>[number])=>Promise<void>;onSettle:(confirmed:boolean)=>Promise<void>;onDiscuss:(items:{itemId:string;quantity:number}[],merchant:ReturnType<typeof availableMerchants>[number])=>Promise<void>;onSupplyChange:(next:Campaign,message:string)=>Promise<boolean>|boolean|void}){
 const merchantKey='four-keeps:cart:v1:'+campaign.id+':'+(campaign.location??'')+':'+(campaign.merchantShopType??'general');
 const [cart,setCart]=useState<Record<string,number>>(()=>{
  try{const raw=localStorage.getItem(merchantKey);if(!raw)return {};const parsed:unknown=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};return Object.fromEntries(Object.entries(parsed).filter(([id,n])=>/^[a-z0-9-]+$/.test(id)&&typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=1000000));}catch{return {};}
 });
 useEffect(()=>{try{localStorage.setItem(merchantKey,JSON.stringify(cart));}catch{/* Storage may be disabled; shopping still works in memory. */}},[cart,merchantKey]);
 const [orderQuantity,setOrderQuantity]=useState<Record<string,number>>({});
 const [orderError,setOrderError]=useState('');
 const orderAction=(action:()=>Campaign,message:string)=>{try{setOrderError('');void Promise.resolve(onSupplyChange(action(),message)).catch(e=>setOrderError(String(e)));}catch(e){setOrderError(String(e));}};
 const tier=settlementTier(campaign);
 const merchant=campaign.merchantShopType??'general';
 const [search,setSearch]=useState('');
 const [sort,setSort]=useState<'name'|'price-up'|'price-down'>('name');
 const [activeCategory,setActiveCategory]=useState<string|null>(null);

 const pending=campaign.pendingMerchantPurchase;
 const funds=walletCopper(campaign.inventoryLedger?.currency);
 const includedByPacks=packCartContents(cart);
 const lines=merchantCatalogFor(tier,merchant).map(item=>{
  const quantity=cart[item.id]??0;
  const discount=campaign.merchantDiscount?.itemId===item.id?campaign.merchantDiscount.percent:0;
  const unit=item.costCp-Math.floor(item.costCp*discount/100);
  const stock=remainingMerchantStock(campaign,item.id,merchant);
  const owned=campaign.inventoryLedger?.gear.find(gear=>gear.name===item.name)?.quantity??0;
  return {item,quantity,unit,stock,owned,packIncluded:includedByPacks.get(item.id)};
 });
 const selected=lines.filter(line=>line.quantity>0);
 const query=search.trim().toLowerCase();
 const visible=lines.filter(line=>{
  const item=line.item;
  const aliases=item.name==='Potion of Healing'?'healing potion':item.name==='Plate Armor'?'plate':'';
  return [item.name,aliases,merchantCategory(item),...(item.properties??[]),...(item.armorGroup?[item.armorGroup+' armor']:[])].join(' ').toLowerCase().includes(query);
 });
 const grouped=Object.entries(visible.reduce<Record<string,typeof visible>>((groups,line)=>{const name=merchantCategory(line.item);(groups[name]??=[]).push(line);return groups;},{})).map(([group,entries])=>[group,entries.sort((a,b)=>sort==='name'?a.item.name.localeCompare(b.item.name):((a.unit-b.unit)*(sort==='price-up'?1:-1)||a.item.name.localeCompare(b.item.name)))] as [string,typeof visible]).sort(([a],[b])=>a.localeCompare(b));
 const total=selected.reduce((sum,line)=>sum+line.unit*line.quantity,0);
 const currentLoad=carriedWeight(campaign);
 const maxLoad=carryingCapacity(campaign);
 const projectedLoad=purchaseWeightAfter(campaign,selected.map(line=>({itemId:line.item.id,quantity:line.quantity})),total);
 const alreadyOverCapacity=maxLoad!==null&&currentLoad.weight>maxLoad;
 const overCapacity=projectedLoad?.capacity!==null&&projectedLoad?.capacity!==undefined&&projectedLoad.weight>projectedLoad.capacity;
 const pendingLoad=purchaseWeightAfter(campaign,(pending?.lines??(pending?[{itemId:pending.itemId,quantity:pending.quantity}]:[])),pending?.lines?.reduce((sum,line)=>sum+line.quantity*line.unitCostCp,0)??(pending?pending.quantity*pending.unitCostCp:0));
 const pendingOverCapacity=pendingLoad?.capacity!=null&&pendingLoad.weight>pendingLoad.capacity;
 const eligible=selected.length>0&&total<=funds&&selected.every(line=>line.quantity<=line.stock);
 const pendingLines=pending?.lines??(pending?[{itemId:pending.itemId,quantity:pending.quantity,unitCostCp:pending.unitCostCp}]:[]);
 const pendingTotal=pendingLines.reduce((sum,line)=>sum+line.quantity*line.unitCostCp,0);
 return <section aria-label={tier==='city'?(campaign.location||'City')+' marketplace':tier==='traveling'?'Traveling merchant':'Frontier Village general store'} className="rounded-xl border border-gold/35 bg-panel p-1 space-y-1 pb-0">
  <div className={(pending?"relative ":"sticky top-0 ")+"z-40 -mx-1 space-y-1 rounded-md border border-gold/25 bg-panel px-1 py-1 shadow-lg"} aria-label="Persistent shopping toolbar">
  <div className="flex items-center justify-between gap-2 px-1" aria-label="Current merchant">
   <div className="min-w-0"><h2 className="truncate text-xs font-semibold">{tier==='city'?(campaign.location||'City')+' · '+MERCHANT_LABELS[merchant]:tier==='traveling'?'Traveling · '+MERCHANT_LABELS[merchant]:'Frontier Village · '+MERCHANT_LABELS[merchant]}</h2><p className="text-[11px] text-parchment/65">Equipment & provisions · {formatFrontierPrice(funds)} available</p></div>
   <button type="button" onClick={onClose} disabled={saving||!!pending||!!campaign.pendingMerchantSupplyOrder} className="shrink-0 rounded-md border border-white/25 px-2 py-1 text-xs">Leave shop</button>
  </div>
  <div className="flex min-w-0 items-center gap-1" aria-label="Persistent merchandise navigation">
   <input aria-label="Search merchandise" placeholder="Search items" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 rounded-md border border-white/25 bg-ink px-2 py-1 text-xs"/>
   <select aria-label="Sort items within categories" value={sort} onChange={e=>setSort(e.target.value as typeof sort)} className="w-24 shrink-0 rounded-md border border-white/25 bg-ink px-1 py-1 text-xs"><option value="name">A–Z</option><option value="price-up">Price ↑</option><option value="price-down">Price ↓</option></select>
  </div>
  <nav aria-label="Jump to merchandise sections" className="flex min-w-0 gap-1 overflow-x-auto pb-0.5" style={{scrollbarWidth:'thin'}}>
   {grouped.map(([group,entries],index)=><button key={group} type="button" onClick={()=>{setActiveCategory(group);document.getElementById('merchant-group-'+index)?.scrollIntoView({behavior:'smooth',block:'start'});}} aria-current={activeCategory===group?'location':undefined} className={'shrink-0 rounded-md border px-2 py-1 text-xs '+(activeCategory===group?'border-gold bg-gold/20 text-gold':'border-gold/40 text-gold')}>{group} ({entries.length})</button>)}
  </nav></div>
  <div className="rounded-lg border border-white/20 bg-[#242a30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" role="region" aria-label="Merchant inventory" tabIndex={0}>
   {grouped.map(([group,entries])=><section key={group} id={"merchant-group-"+grouped.findIndex(([name])=>name===group)} aria-label={group} className="scroll-mt-36 border-b border-white/20"><h4 className={'border-l-4 px-3 py-2 font-semibold '+(/ammunition/i.test(group)?'border-[#7094b2] bg-[#273744] text-[#b8d6ed]':/armor|shield/i.test(group)?'border-[#8d9eb4] bg-[#303a47] text-[#d3dfef]':/weapon/i.test(group)?'border-[#ba866d] bg-[#3a302f] text-[#f0c6b3]':/potion|alchem|food|drink/i.test(group)?'border-[#ac9870] bg-[#38362d] text-[#e8d8a9]':/climb|camp|travel|container|lighting/i.test(group)?'border-[#7d9e87] bg-[#293a34] text-[#c2e2cb]':'border-[#9684ae] bg-[#34303e] text-[#ddd0ed]')}>{group} ({entries?.length??0})</h4>
   {entries?.map(({item,quantity,unit,stock,owned,packIncluded})=><div key={item.id} id={'merchant-item-'+item.id} className="scroll-mt-14 space-y-1 border-t border-white/10 bg-[#272c32] px-3 py-2" aria-label={item.name}>
    <div className="flex items-baseline justify-between gap-x-2 text-sm" aria-label={item.name+' availability'}>
     <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <strong>{item.name}</strong>
      <span className="whitespace-nowrap text-xs tabular-nums text-parchment/70">{owned} owned · {item.id==='arrows'?Math.floor(stock/20)+' packs in stock':stock+' in stock'}</span>
     </div>
     <span className="shrink-0 tabular-nums text-gold">{formatFrontierPrice(unit*(item.id==='arrows'?20:1))}{item.id==='arrows'?' / 20':''}</span>
    </div>
    {(quantity>0||packIncluded)&&<div role="status" className="text-xs font-semibold text-gold" aria-label={item.name+' cart status'}>{quantity>0?`${quantity} directly in cart`:''}{quantity>0&&packIncluded?' · ':''}{packIncluded?`${packIncluded.quantity} included via ${packIncluded.packs.join(', ')}`:''}</div>}
    {item.armorGroup&&<div className="space-y-0.5 text-xs" aria-label={item.name+' armor classification'}>
      <p className="font-bold tracking-wide text-gold">{item.armorGroup.toUpperCase()} ARMOR · AC {item.baseAC}{item.armorGroup==='Light'?' + DEX':item.armorGroup==='Medium'?' + DEX (max 2)':''}{item.strength?' · STR '+item.strength:''}{item.stealthDisadvantage?' · Stealth Disadvantage':''}</p>
      {campaign.character?.classId&&(()=>{const cls=classSummary(campaign.character.classId);if(!cls)return null;const trained=cls.armor.some(a=>a.toLowerCase()===item.armorGroup!.toLowerCase()||a.toLowerCase()==='all armor');return !trained?<p className="text-amber-200" role="note">Your class does not have {item.armorGroup} Armor training. Check other features or training before equipping.</p>:<p className="text-parchment/70">Your class has {item.armorGroup} Armor training.</p>;})()}
     </div>}
     {item.weaponGroup&&<p className="text-xs font-semibold tracking-wide text-parchment/80">{item.weaponGroup.toUpperCase()} WEAPON{campaign.character?.weaponProficiencies?.length?' · '+(campaign.character.weaponProficiencies.some(p=>p.toLowerCase()===item.weaponGroup)?'Class weapon training':'Check weapon training'):''}</p>}
     <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-parchment/90" aria-label={item.name+' description'}>{merchantItemDescription(item)}</p>
    {equipmentPackContents(item.id)&&<div className="rounded-md border border-white/15 bg-[#222b31] p-2 text-xs" aria-label={item.name+' bundle contents'}>
      <p className="mb-1 font-semibold text-parchment">Included equipment · added individually to inventory</p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">{equipmentPackContents(item.id)!.map(({item:component,quantity})=><li key={component.id} className="flex justify-between gap-2"><span>{component.name}</span><span className="shrink-0 text-gold">×{quantity}</span></li>)}</ul>
      {equipmentPackIndividualValue(item.id)!==null&&<p className="mt-2 border-t border-white/15 pt-1 text-parchment/75">Individual item value: {formatFrontierPrice(equipmentPackIndividualValue(item.id)!)}{equipmentPackIndividualValue(item.id)!>item.costCp?' · Bundle savings: '+formatFrontierPrice(equipmentPackIndividualValue(item.id)!-item.costCp):''}</p>}
    </div>}
    <div className="flex items-center justify-between gap-2">
     <p className="min-w-0 text-xs leading-snug text-parchment/75">{merchantItemFacts(item).join(' · ')}</p>
     <div className="flex shrink-0 items-center gap-1">
      {quantity>1&&<span className="text-xs tabular-nums text-parchment/70" aria-label={item.name+' subtotal'}>{formatFrontierPrice(unit*quantity)}</span>}
      <button type="button" aria-label={'Remove '+item.name} disabled={saving||!!pending||quantity===0} onClick={()=>setCart(old=>({...old,[item.id]:Math.max(0,quantity-(item.id==='arrows'?20:1))}))} className="h-11 w-11 rounded-lg border border-white/30 text-lg disabled:opacity-40">−</button>
      <span className="min-w-4 text-center tabular-nums" aria-label={item.name+' quantity'}>{item.id==='arrows'?quantity/20:quantity}</span>
      <button type="button" aria-label={'Add '+item.name} disabled={saving||!!pending||quantity+(item.id==='arrows'?20:1)>stock} onClick={()=>setCart(old=>({...old,[item.id]:quantity+(item.id==='arrows'?20:1)}))} className="h-11 w-11 rounded-lg border border-white/30 text-lg disabled:opacity-40">+</button>
     </div>
    </div>
   </div>)}</section>)}
{visible.length===0&&<p className="text-sm text-parchment/60">No merchandise matches your search.</p>}</div>

  {pending?<div aria-label="Confirm merchant purchase" className="sticky bottom-0 z-20 space-y-3 rounded-lg border border-gold/40 bg-panel p-3 shadow-lg"><h3 className="font-semibold">Confirm purchase</h3>{pendingLines.map(line=><p key={line.itemId} className="text-sm">{line.itemId==='arrows'?(line.quantity/20)+' pack of 20':line.quantity+' ×'} {merchantStock(campaign).find(item=>item.id===line.itemId)?.name} — {formatFrontierPrice(line.quantity*line.unitCostCp)}</p>)}<p className="font-semibold">Total: {formatFrontierPrice(pendingTotal)}</p><p className="text-xs text-parchment/70">Nothing is charged until you confirm.</p>{pendingOverCapacity&&<p role="alert" className="text-xs font-semibold text-red-300">Over carrying capacity: {pendingLoad!.weight.toFixed(1)} / {pendingLoad!.capacity} lb. Review your load before confirming.</p>}<div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={()=>void onSettle(false)} className="rounded-lg border border-white/30 p-3">Cancel</button><button type="button" disabled={saving} onClick={()=>void onSettle(true).then(()=>setCart({}))} className="rounded-lg bg-gold p-3 font-semibold text-ink">Confirm purchase</button></div></div>:<div className="sticky bottom-0 z-40 -mx-1 mb-0 flex items-center justify-between gap-1 rounded-lg border border-gold/35 bg-panel/98 px-2 py-1 shadow-lg backdrop-blur" aria-label="Compact purchase summary"><div className="min-w-0 text-xs leading-tight"><div aria-label="Current wallet"><span className="text-parchment/70">Available </span><strong className="text-gold">{formatFrontierPrice(funds)}</strong></div><div aria-label="Carrying weight" className={overCapacity?"text-red-300":"text-parchment/70"}>Weight {currentLoad.weight.toFixed(1)}{projectedLoad&&selected.length?" → "+projectedLoad.weight.toFixed(1):""} / {maxLoad??"?"} lb.</div>{currentLoad.unknown.length>0&&<div className="text-amber-300" role="status">Weight unknown for {currentLoad.unknown.length} item(s)</div>}{(overCapacity||alreadyOverCapacity)&&<div role="alert" className="font-semibold text-red-300">Over carrying capacity</div>}<div><span className="text-parchment/70">Cart ({selected.reduce((sum,line)=>sum+line.quantity,0)}) </span><strong>{formatFrontierPrice(total)}</strong></div>{total>funds&&<span className="text-red-300">Insufficient funds</span>}</div><div className="flex shrink-0 items-center gap-2"><button type="button" aria-label="Discuss order with DM" title="Discuss order with DM" disabled={saving||!!pending||!selected.length} onClick={()=>void onDiscuss(selected.map(line=>({itemId:line.item.id,quantity:line.quantity})),merchant)} className="rounded-lg border border-gold/50 px-2 py-2 text-xs disabled:opacity-40">Discuss</button><button type="button" disabled={saving||!eligible} onClick={()=>void onPrepare(selected.map(line=>({itemId:line.item.id,quantity:line.quantity})),merchant)} className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink disabled:opacity-40">Review purchase</button></div></div>}
  {tier==='traveling'&&<section aria-label="Traveling merchant supply route" className="scroll-mt-56 space-y-2 rounded-lg border border-white/20 p-3">
   <h3 className="font-semibold">Traveling merchant route</h3>
   {campaign.merchantTraderRoute&&campaign.merchantTraderRoute.nextStopIndex<campaign.merchantTraderRoute.stops.length?
    <p className="text-xs">Next verified stop: {ADVENTURE_SITES[campaign.merchantTraderRoute.stops[campaign.merchantTraderRoute.nextStopIndex]].name}. Stock is resupplied only on arrival.</p>:
    <button disabled={saving||!campaign.adventureSession||campaign.adventureSession.status!=='exploring'} className="scroll-mt-56 rounded border p-2 text-xs" onClick={()=>orderAction(()=>{const site=campaign.adventureSession!.site;const destination=ADVENTURE_SITES[site].neighbors[0];return beginTravelingMerchantRoute(campaign,'trader-'+crypto.randomUUID(),[site,destination]);},'Merchant supply route recorded. Travel to the next stop to resupply.')}>Begin verified supply route</button>}
  </section>}
  {tier==='city'&&<section aria-label="City supplier orders" className="scroll-mt-56 space-y-3 rounded-lg border border-white/20 p-3">
   <h3 className="font-semibold">Supplier orders</h3>
   <p className="text-xs text-parchment/70">Out-of-stock equipment can be ordered at its listed price. Payment is taken only after confirmation; collect it here once delivered.</p>
   {orderError&&<p role="alert" className="text-xs text-red-300">{orderError}</p>}
   {campaign.pendingMerchantSupplyOrder? <div className="space-y-2" aria-label="Confirm supplier order">
    <p className="text-sm">{campaign.pendingMerchantSupplyOrder.quantity} × {merchantCatalogFor('city',campaign.pendingMerchantSupplyOrder.merchant as typeof merchant).find(x=>x.id===campaign.pendingMerchantSupplyOrder?.itemId)?.name} · {formatFrontierPrice(campaign.pendingMerchantSupplyOrder.quantity*campaign.pendingMerchantSupplyOrder.unitCostCp)}</p>
    <p className="text-xs">Ready at game minute {campaign.pendingMerchantSupplyOrder.readyAtMinutes}. You will pay upon confirmation.</p>
    <div className="flex gap-2"><button disabled={saving} className="rounded-lg border p-2" onClick={()=>orderAction(()=>confirmCitySupplyOrder(campaign,campaign.pendingMerchantSupplyOrder!.id,false),'Supplier order canceled.')}>Cancel order</button><button disabled={saving} className="rounded-lg bg-gold text-ink p-2" onClick={()=>orderAction(()=>confirmCitySupplyOrder(campaign,campaign.pendingMerchantSupplyOrder!.id,true),'Supplier order placed and paid.')}>Confirm order</button></div>
   </div>:<div className="space-y-2">{lines.filter(x=>x.stock===0).map(({item})=><div key={item.id} className="flex items-center justify-between gap-2 text-xs"><span>{item.name} · {formatFrontierPrice(item.costCp)}</span><div className="flex gap-2 items-center"><input type="number" aria-label={'Order quantity '+item.name} min={1} max={20} value={orderQuantity[item.id]??1} onChange={e=>setOrderQuantity(o=>({...o,[item.id]:Number(e.target.value)}))} className="w-14 rounded bg-ink border p-1"/><button disabled={saving||!!pending} className="scroll-mt-56 rounded border p-2" onClick={()=>orderAction(()=>prepareCitySupplyOrder({...campaign,merchantShopType:merchant},item.id,orderQuantity[item.id]??1,crypto.randomUUID()),'Review supplier order.')}>Order</button></div></div>)}</div>}
   {(campaign.merchantSupplyOrders??[]).filter(o=>o.settlement===(campaign.location||'unknown').trim().toLowerCase()).map(o=><div key={o.id} className="flex justify-between items-center gap-2 text-xs"><span>{o.quantity} × {merchantCatalogFor('city',o.merchant as typeof merchant).find(x=>x.id===o.itemId)?.name??o.itemId} · {o.status==='collected'?'Collected':'Ready at minute '+o.readyAtMinutes}</span>{o.status==='ordered'&&<button className="rounded border p-2" disabled={saving||(campaign.elapsedMinutes??0)<o.readyAtMinutes} onClick={()=>orderAction(()=>collectCitySupplyOrder(campaign,o.id),'Collected supplier order.')}>Collect</button>}</div>)}
  </section>}

 </section>;
}
