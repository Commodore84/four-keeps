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
  if(name.endsWith(' pack')||name.endsWith(' pack (10)')||name.endsWith(' pack (20)'))return 'Adventuring packs';
  if(item.category==='tool'&&(name.includes('kit')||name.includes('tools')||name.includes('supplies')))return 'Kits and tools';
  if(item.category==='weapon')return 'Weapons';
  if(item.category==='armor'||item.category==='shield')return 'Armor and shields';
  if(item.category==='ammunition')return 'Ammunition';
  if(name.includes('potion')||name.includes('rations')||name.includes('oil')||name.includes('torch')||name.includes('candle'))return 'Consumables';
  if(item.category==='tool')return 'Kits and tools';
  return 'Adventuring gear';
 };
 const grouped=Object.entries(visible.reduce<Record<string,typeof visible>>((groups,line)=>{const name=groupFor(line.item);(groups[name]??=[]).push(line);return groups;},{})).sort(([a],[b])=>a.localeCompare(b));
 const total=selected.reduce((sum,line)=>sum+line.unit*line.quantity,0);
 const eligible=selected.length>0&&total<=funds&&selected.every(line=>line.quantity<=line.stock&&line.quantity<=20);
 const pendingLines=pending?.lines??(pending?[{itemId:pending.itemId,quantity:pending.quantity,unitCostCp:pending.unitCostCp}]:[]);
 const pendingTotal=pendingLines.reduce((sum,line)=>sum+line.quantity*line.unitCostCp,0);
 return <section aria-label={tier==='city'?(campaign.location||'City')+' marketplace':tier==='traveling'?'Traveling merchant':'Frontier Village general store'} className="rounded-2xl border border-gold/40 bg-panel p-4 space-y-4 pb-28">
  <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{tier==='city'?(campaign.location||'City'):tier==='traveling'?'Trade route':'Frontier Village'}</p><h2 className="font-serif text-xl">{tier==='city'?(campaign.location||'City')+' Marketplace':tier==='traveling'?'Traveling Trader':"Mara Vell's General Store"}</h2><p className="text-xs text-parchment/65">Equipment and provisions · Prices from the rules engine</p></div><button type="button" onClick={onClose} disabled={saving||!!pending||!!campaign.pendingMerchantSupplyOrder} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Leave shop</button></div>
  <p className="text-sm text-parchment/80" aria-label="Current merchant">Shopping with {MERCHANT_LABELS[merchant]}. Only this merchant's merchandise is available.</p>
  <div className="rounded-lg border border-gold/25 bg-ink/50 p-3 text-sm" aria-label="Current wallet"><span className="text-parchment/70">Your money</span><strong className="float-right text-gold">{formatFrontierPrice(funds)}</strong></div>
  <div className="space-y-2"><h3 className="font-semibold">Available equipment</h3>
  <input aria-label="Search merchandise" placeholder="Search items" value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-lg border border-white/25 bg-ink p-2 text-sm"/>
  <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-white/15" aria-label="Merchant inventory">
   {grouped.map(([group,entries])=><section key={group} aria-label={group} className="border-b border-white/20"><h4 className="sticky top-0 z-10 bg-panel px-3 py-2 font-semibold text-gold">{group} ({entries?.length??0})</h4>
   {entries?.map(({item,quantity,unit,stock,owned})=><div key={item.id} className="border-t border-white/10 p-3 space-y-2" aria-label={item.name}>
    <div className="flex justify-between gap-2 text-sm">
     <div className="min-w-0"><strong className="block">{item.name}</strong>
      <span className="text-xs text-parchment/60">{stock} in stock · {owned} in inventory{item.packQuantity?' · pack of '+item.packQuantity:''}</span>
     </div>
     <span className="shrink-0 tabular-nums text-gold">{formatFrontierPrice(unit)}</span>
    </div>
    <details className="rounded-lg border border-white/15 px-3 text-sm text-parchment/90">
     <summary className="cursor-pointer py-2 font-medium text-gold" aria-label={item.name+' description'}>Description &amp; rules</summary>
     <p className="pb-2 leading-relaxed">{merchantItemDescription(item)}</p>
     <p className="pb-2 text-xs text-parchment/75">{merchantItemFacts(item).join(' · ')}</p>
    </details>
    <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-3"><button type="button" aria-label={'Remove '+item.name} disabled={saving||!!pending||quantity===0} onClick={()=>setCart(old=>({...old,[item.id]:Math.max(0,quantity-1)}))} className="rounded-lg border border-white/30 px-3 py-1 text-lg">−</button><span className="w-5 text-center tabular-nums">{quantity}</span><button type="button" aria-label={'Add '+item.name} disabled={saving||!!pending||quantity>=Math.min(stock,20)} onClick={()=>setCart(old=>({...old,[item.id]:quantity+1}))} className="rounded-lg border border-white/30 px-3 py-1 text-lg">+</button></div><span className="text-xs text-parchment/70">{quantity?formatFrontierPrice(unit*quantity):'Select quantity'}</span></div>
   </div>)}</section>)}
{visible.length===0&&<p className="text-sm text-parchment/60">No merchandise matches your search.</p>}</div></div>

  {pending?<div aria-label="Confirm merchant purchase" className="sticky bottom-2 z-20 space-y-3 rounded-lg border border-gold/40 bg-panel p-3 shadow-lg"><h3 className="font-semibold">Confirm purchase</h3>{pendingLines.map(line=><p key={line.itemId} className="text-sm">{line.quantity} × {merchantStock(campaign).find(item=>item.id===line.itemId)?.name} — {formatFrontierPrice(line.quantity*line.unitCostCp)}</p>)}<p className="font-semibold">Total: {formatFrontierPrice(pendingTotal)}</p><p className="text-xs text-parchment/70">Nothing is charged until you confirm.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={()=>void onSettle(false)} className="rounded-lg border border-white/30 p-3">Cancel</button><button type="button" disabled={saving} onClick={()=>void onSettle(true)} className="rounded-lg bg-gold p-3 font-semibold text-ink">Confirm purchase</button></div></div>:<div className="sticky bottom-2 z-20 space-y-2 rounded-lg border border-white/15 bg-panel p-3 shadow-lg"><div className="flex justify-between"><strong>Cart total</strong><strong>{formatFrontierPrice(total)}</strong></div>{total>funds&&<p className="text-xs text-red-300">Not enough money for this cart.</p>}<button type="button" disabled={saving||!!pending||!selected.length} onClick={()=>void onDiscuss(selected.map(line=>({itemId:line.item.id,quantity:line.quantity})),merchant)} className="rounded-lg border border-gold/50 px-3 py-2 text-sm">Discuss order with DM</button><button type="button" disabled={saving||!eligible} onClick={()=>void onPrepare(selected.map(line=>({itemId:line.item.id,quantity:line.quantity})),merchant)} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40">Review purchase</button></div>}
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
