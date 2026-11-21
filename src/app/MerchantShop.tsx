import {CatalogJumpNavigation} from './CatalogJumpNavigation';
import {merchantItemDescription,merchantItemFacts} from '../game/merchantItemDetails';
import {prepareCitySupplyOrder,confirmCitySupplyOrder,collectCitySupplyOrder} from '../game/merchantSupply';
import {useState} from 'react';
import {ADVENTURE_SITES,beginTravelingMerchantRoute} from '../game/adventureSession';
import type {Campaign} from '../game/campaign';
import {merchantStock,remainingMerchantStock,formatFrontierPrice,walletCopper,availableMerchants,settlementTier,MERCHANT_LABELS,merchantCatalogFor} from '../game/frontierShop';

export function MerchantShop({campaign,saving,onClose,onPrepare,onSettle,onDiscuss,onSupplyChange}:{campaign:Campaign;saving:boolean;onClose:()=>void;onPrepare:(items:{itemId:string;quantity:number}[],merchant:ReturnType<typeof availableMerchants>[number])=>Promise<void>;onSettle:(confirmed:boolean)=>Promise<void>;onDiscuss:(items:{itemId:string;quantity:number}[],merchant:ReturnType<typeof availableMerchants>[number])=>Promise<void>;onSupplyChange:(next:Campaign,message:string)=>Promise<boolean>|boolean|void}){
 const [cart,setCart]=useState<Record<string,number>>({});
 const [orderQuantity,setOrderQuantity]=useState<Record<string,number>>({});
 const [orderError,setOrderError]=useState('');
 const orderAction=(action:()=>Campaign,message:string)=>{try{setOrderError('');void Promise.resolve(onSupplyChange(action(),message)).catch(e=>setOrderError(String(e)));}catch(e){setOrderError(String(e));}};
 const tier=settlementTier(campaign);
 const merchant=campaign.merchantShopType??'general';
 const [search,setSearch]=useState('');

 const pending=campaign.pendingMerchantPurchase;
 const funds=walletCopper(campaign.inventoryLedger?.currency);
 const lines=merchantCatalogFor(tier,merchant).map(item=>{
  const quantity=cart[item.id]??0;
  const discount=campaign.merchantDiscount?.itemId===item.id?campaign.merchantDiscount.percent:0;
  const unit=item.costCp-Math.floor(item.costCp*discount/100);
  const stock=remainingMerchantStock(campaign,item.id,merchant);
  const owned=campaign.inventoryLedger?.gear.find(gear=>gear.name===item.name)?.quantity??0;
  return {item,quantity,unit,stock,owned};
 });
 const selected=lines.filter(line=>line.quantity>0);
 const visible=lines.filter(line=>line.item.name.toLowerCase().includes(search.toLowerCase()));
 const groupFor=(item:(typeof lines)[number]['item'])=>{
  const name=item.name.toLowerCase();
  if(item.category==='weapon')return name.includes('crossbow')||name.includes('bow')||name.includes('sling')||name.includes('blowgun')?'Ranged weapons':'Melee weapons';
  if(item.category==='armor'||item.category==='shield')return 'Armor and shields';
  if(item.category==='ammunition')return 'Ammunition';
  if(name.includes('potion')||name.includes('antitoxin')||name.includes('acid')||name.includes('alchemist')||name.includes('holy water')||name.includes('poison'))return 'Potions and alchemical supplies';
  if(name.includes('rations')||name.includes('waterskin')||name.includes('wine')||name.includes('ale'))return 'Food and drink';
  if(name.includes('torch')||name.includes('candle')||name.includes('lantern')||name.includes('lamp')||name.includes('tinderbox')||name.includes('oil'))return 'Lighting and fuel';
  if(name.includes('rope')||name.includes('grappling hook')||name.includes('climber')||name.includes('piton')||name.includes('ladder'))return 'Climbing and rope';
  if(name.includes('tent')||name.includes('bedroll')||name.includes('blanket')||name.includes('pack'))return 'Camping and travel';
  if(name.includes('backpack')||name.includes('pouch')||name.includes('sack')||name.includes('chest')||name.includes('barrel')||name.includes('basket')||name.includes('bottle')||name.includes('case')||name.includes('flask')||name.includes('vial'))return 'Containers and storage';
  if(item.category==='tool'||name.includes('kit')||name.includes('tools')||name.includes('supplies'))return 'Kits and tools';
  if(name.includes('ball bearing')||name.includes('caltrop')||name.includes('trap')||name.includes('manacles')||name.includes('chain'))return 'Traps and restraints';
  return 'Other adventuring gear';
 };
 const subgroupFor=(item:(typeof lines)[number]['item'])=>{
  const n=item.name.toLowerCase();
  if(item.category==='weapon')return /crossbow|bow|sling|blowgun/.test(n)?'Bows and ranged weapons':/dagger|rapier|shortsword|scimitar|sword/.test(n)?'Blades':'Other melee weapons';
  if(item.category==='armor'||item.category==='shield')return item.category==='shield'?'Shields':/plate|splint|chain mail/.test(n)?'Heavy armor':/leather|hide|studded/.test(n)?'Light and medium armor':'Other armor';
  if(item.category==='ammunition')return /arrow/.test(n)?'Arrows':/bolt/.test(n)?'Bolts':'Other ammunition';
  if(/potion|antitoxin|acid|alchemist|holy water|poison/.test(n))return /healing|antitoxin/.test(n)?'Healing and protection':'Alchemical supplies';
  if(/rope|grappling|climber|piton|ladder/.test(n))return 'Climbing equipment';
  if(/torch|candle|lantern|lamp|tinderbox|oil/.test(n))return /oil|tinderbox/.test(n)?'Fuel and fire starting':'Light sources';
  if(/kit|tools|supplies/.test(n))return /healer|herbal|poison/.test(n)?'Medical and herbal kits':'Professional tools and kits';
  if(/ball bearing|caltrop|trap|manacles|chain/.test(n))return 'Traps and restraints';
  if(/tent|bedroll|blanket|pack/.test(n))return 'Travel and shelter';
  if(/pouch|sack|chest|barrel|basket|bottle|case|flask|vial/.test(n))return 'Containers';
  if(/mirror|glass|spyglass|magnifying/.test(n))return 'Optics and observation';
  if(/ink|paper|parchment|book|pen|chalk|map/.test(n))return 'Writing and navigation';
  if(/lock|key|crowbar|hammer|shovel|pick|pole/.test(n))return 'Utility and construction';
  return 'General supplies';
 };
 const grouped=Object.entries(visible.reduce<Record<string,typeof visible>>((groups,line)=>{const name=groupFor(line.item);(groups[name]??=[]).push(line);return groups;},{})).map(([group,entries])=>[group,entries.sort((a,b)=>subgroupFor(a.item).localeCompare(subgroupFor(b.item))||a.item.name.localeCompare(b.item.name))] as [string,typeof visible]).sort(([a],[b])=>a.localeCompare(b));
 const total=selected.reduce((sum,line)=>sum+line.unit*line.quantity,0);
 const eligible=selected.length>0&&total<=funds&&selected.every(line=>line.quantity<=line.stock&&line.quantity<=20);
 const pendingLines=pending?.lines??(pending?[{itemId:pending.itemId,quantity:pending.quantity,unitCostCp:pending.unitCostCp}]:[]);
 const pendingTotal=pendingLines.reduce((sum,line)=>sum+line.quantity*line.unitCostCp,0);
 return <section aria-label={tier==='city'?(campaign.location||'City')+' marketplace':tier==='traveling'?'Traveling merchant':'Frontier Village general store'} className="rounded-2xl border border-gold/40 bg-panel p-3 space-y-3 pb-4">
  <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{tier==='city'?(campaign.location||'City'):tier==='traveling'?'Trade route':'Frontier Village'}</p><h2 className="font-serif text-xl">{tier==='city'?(campaign.location||'City')+' Marketplace':tier==='traveling'?'Traveling Trader':"Mara Vell's General Store"}</h2><p className="text-xs text-parchment/65">Equipment and provisions · Prices from the rules engine</p></div><button type="button" onClick={onClose} disabled={saving||!!pending||!!campaign.pendingMerchantSupplyOrder} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Leave shop</button></div>
  <p className="text-sm text-parchment/80" aria-label="Current merchant">Shopping with {MERCHANT_LABELS[merchant]}. Only this merchant's merchandise is available.</p>
  
  <div className="space-y-2"><div className="sticky top-0 z-30 -mx-2 space-y-2 rounded-lg border border-gold/30 bg-panel/95 p-2 shadow-lg backdrop-blur" aria-label="Persistent merchandise navigation"><h3 className="text-sm font-semibold">Available equipment</h3>
  <input aria-label="Search merchandise" placeholder="Search items" value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-lg border border-white/25 bg-ink p-2 text-sm"/>
  <CatalogJumpNavigation embedded title="Merchandise" groups={grouped.length>1?grouped.map(([group,entries],index)=>({id:'merchant-group-'+index,label:group+' ('+entries.length+')'})):[]} subgroups={grouped.flatMap(([group,entries])=>[...new Set(entries.map(line=>subgroupFor(line.item)))].map(subgroup=>({id:'merchant-subgroup-'+encodeURIComponent(group)+'-'+encodeURIComponent(subgroup),label:group+' — '+subgroup})))}/></div>
  <div className="rounded-lg border border-gold/50 bg-[#322c24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" role="region" aria-label="Merchant inventory" tabIndex={0}>
   {grouped.map(([group,entries])=><section key={group} id={"merchant-group-"+grouped.findIndex(([name])=>name===group)} aria-label={group} className="scroll-mt-44 border-b border-white/20"><h4 className="bg-[#3d3428] px-3 py-2 font-semibold text-gold">{group} ({entries?.length??0})</h4>
   {entries?.map(({item,quantity,unit,stock,owned},index)=><div key={item.id} id={'merchant-item-'+item.id} className="scroll-mt-14 space-y-1 border-t border-white/10 px-3 py-2" aria-label={item.name}>
    {(index===0||subgroupFor(entries[index-1].item)!==subgroupFor(item))&&<h5 id={'merchant-subgroup-'+encodeURIComponent(group)+'-'+encodeURIComponent(subgroupFor(item))} className="scroll-mt-44 border-b border-white/15 py-2 text-sm font-semibold text-parchment/85">{subgroupFor(item)}</h5>}
    <div className="flex items-baseline justify-between gap-x-2 text-sm" aria-label={item.name+' availability'}>
     <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <strong>{item.name}</strong>
      <span className="whitespace-nowrap text-xs tabular-nums text-parchment/70">{owned} owned · {stock} in stock</span>
     </div>
     <span className="shrink-0 tabular-nums text-gold">{formatFrontierPrice(unit)}</span>
    </div>
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-parchment/90" aria-label={item.name+' description'}>{merchantItemDescription(item)}</p>
    <div className="flex items-center justify-between gap-2">
     <p className="min-w-0 text-xs leading-snug text-parchment/75">{merchantItemFacts(item).join(' · ')}</p>
     <div className="flex shrink-0 items-center gap-1">
      {quantity>1&&<span className="text-xs tabular-nums text-parchment/70" aria-label={item.name+' subtotal'}>{formatFrontierPrice(unit*quantity)}</span>}
      <button type="button" aria-label={'Remove '+item.name} disabled={saving||!!pending||quantity===0} onClick={()=>setCart(old=>({...old,[item.id]:Math.max(0,quantity-1)}))} className="h-11 w-11 rounded-lg border border-white/30 text-lg disabled:opacity-40">−</button>
      <span className="min-w-4 text-center tabular-nums" aria-label={item.name+' quantity'}>{quantity}</span>
      <button type="button" aria-label={'Add '+item.name} disabled={saving||!!pending||quantity>=Math.min(stock,20)} onClick={()=>setCart(old=>({...old,[item.id]:quantity+1}))} className="h-11 w-11 rounded-lg border border-white/30 text-lg disabled:opacity-40">+</button>
     </div>
    </div>
   </div>)}</section>)}
{visible.length===0&&<p className="text-sm text-parchment/60">No merchandise matches your search.</p>}</div></div>

  {pending?<div aria-label="Confirm merchant purchase" className="sticky bottom-0 z-20 space-y-3 rounded-lg border border-gold/40 bg-panel p-3 shadow-lg"><h3 className="font-semibold">Confirm purchase</h3>{pendingLines.map(line=><p key={line.itemId} className="text-sm">{line.quantity} × {merchantStock(campaign).find(item=>item.id===line.itemId)?.name} — {formatFrontierPrice(line.quantity*line.unitCostCp)}</p>)}<p className="font-semibold">Total: {formatFrontierPrice(pendingTotal)}</p><p className="text-xs text-parchment/70">Nothing is charged until you confirm.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={()=>void onSettle(false)} className="rounded-lg border border-white/30 p-3">Cancel</button><button type="button" disabled={saving} onClick={()=>void onSettle(true)} className="rounded-lg bg-gold p-3 font-semibold text-ink">Confirm purchase</button></div></div>:<div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 rounded-lg border border-gold/35 bg-panel/95 px-2 py-2 shadow-lg backdrop-blur" aria-label="Compact purchase summary"><div className="min-w-0 text-xs leading-tight"><div aria-label="Current wallet"><span className="text-parchment/70">Available </span><strong className="text-gold">{formatFrontierPrice(funds)}</strong></div><div><span className="text-parchment/70">Cart ({selected.reduce((sum,line)=>sum+line.quantity,0)}) </span><strong>{formatFrontierPrice(total)}</strong></div>{total>funds&&<span className="text-red-300">Insufficient funds</span>}</div><div className="flex shrink-0 items-center gap-2"><button type="button" aria-label="Discuss order with DM" title="Discuss order with DM" disabled={saving||!!pending||!selected.length} onClick={()=>void onDiscuss(selected.map(line=>({itemId:line.item.id,quantity:line.quantity})),merchant)} className="rounded-lg border border-gold/50 px-2 py-2 text-xs disabled:opacity-40">Discuss</button><button type="button" disabled={saving||!eligible} onClick={()=>void onPrepare(selected.map(line=>({itemId:line.item.id,quantity:line.quantity})),merchant)} className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink disabled:opacity-40">Review purchase</button></div></div>}
  {tier==='traveling'&&<section aria-label="Traveling merchant supply route" className="space-y-2 rounded-lg border border-white/20 p-3">
   <h3 className="font-semibold">Traveling merchant route</h3>
   {campaign.merchantTraderRoute&&campaign.merchantTraderRoute.nextStopIndex<campaign.merchantTraderRoute.stops.length?
    <p className="text-xs">Next verified stop: {ADVENTURE_SITES[campaign.merchantTraderRoute.stops[campaign.merchantTraderRoute.nextStopIndex]].name}. Stock is resupplied only on arrival.</p>:
    <button disabled={saving||!campaign.adventureSession||campaign.adventureSession.status!=='exploring'} className="rounded border p-2 text-xs" onClick={()=>orderAction(()=>{const site=campaign.adventureSession!.site;const destination=ADVENTURE_SITES[site].neighbors[0];return beginTravelingMerchantRoute(campaign,'trader-'+crypto.randomUUID(),[site,destination]);},'Merchant supply route recorded. Travel to the next stop to resupply.')}>Begin verified supply route</button>}
  </section>}
  {tier==='city'&&<section aria-label="City supplier orders" className="space-y-3 rounded-lg border border-white/20 p-3">
   <h3 className="font-semibold">Supplier orders</h3>
   <p className="text-xs text-parchment/70">Out-of-stock equipment can be ordered at its listed price. Payment is taken only after confirmation; collect it here once delivered.</p>
   {orderError&&<p role="alert" className="text-xs text-red-300">{orderError}</p>}
   {campaign.pendingMerchantSupplyOrder? <div className="space-y-2" aria-label="Confirm supplier order">
    <p className="text-sm">{campaign.pendingMerchantSupplyOrder.quantity} × {merchantCatalogFor('city',campaign.pendingMerchantSupplyOrder.merchant as typeof merchant).find(x=>x.id===campaign.pendingMerchantSupplyOrder?.itemId)?.name} · {formatFrontierPrice(campaign.pendingMerchantSupplyOrder.quantity*campaign.pendingMerchantSupplyOrder.unitCostCp)}</p>
    <p className="text-xs">Ready at game minute {campaign.pendingMerchantSupplyOrder.readyAtMinutes}. You will pay upon confirmation.</p>
    <div className="flex gap-2"><button disabled={saving} className="rounded-lg border p-2" onClick={()=>orderAction(()=>confirmCitySupplyOrder(campaign,campaign.pendingMerchantSupplyOrder!.id,false),'Supplier order canceled.')}>Cancel order</button><button disabled={saving} className="rounded-lg bg-gold text-ink p-2" onClick={()=>orderAction(()=>confirmCitySupplyOrder(campaign,campaign.pendingMerchantSupplyOrder!.id,true),'Supplier order placed and paid.')}>Confirm order</button></div>
   </div>:<div className="space-y-2">{lines.filter(x=>x.stock===0).map(({item})=><div key={item.id} className="flex items-center justify-between gap-2 text-xs"><span>{item.name} · {formatFrontierPrice(item.costCp)}</span><div className="flex gap-2 items-center"><input type="number" aria-label={'Order quantity '+item.name} min={1} max={20} value={orderQuantity[item.id]??1} onChange={e=>setOrderQuantity(o=>({...o,[item.id]:Number(e.target.value)}))} className="w-14 rounded bg-ink border p-1"/><button disabled={saving||!!pending} className="rounded border p-2" onClick={()=>orderAction(()=>prepareCitySupplyOrder({...campaign,merchantShopType:merchant},item.id,orderQuantity[item.id]??1,crypto.randomUUID()),'Review supplier order.')}>Order</button></div></div>)}</div>}
   {(campaign.merchantSupplyOrders??[]).filter(o=>o.settlement===(campaign.location||'unknown').trim().toLowerCase()).map(o=><div key={o.id} className="flex justify-between items-center gap-2 text-xs"><span>{o.quantity} × {merchantCatalogFor('city',o.merchant as typeof merchant).find(x=>x.id===o.itemId)?.name??o.itemId} · {o.status==='collected'?'Collected':'Ready at minute '+o.readyAtMinutes}</span>{o.status==='ordered'&&<button className="rounded border p-2" disabled={saving||(campaign.elapsedMinutes??0)<o.readyAtMinutes} onClick={()=>orderAction(()=>collectCitySupplyOrder(campaign,o.id),'Collected supplier order.')}>Collect</button>}</div>)}
  </section>}

 </section>;
}
