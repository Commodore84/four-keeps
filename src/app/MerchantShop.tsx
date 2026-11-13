import {useState} from 'react';
import type {Campaign} from '../game/campaign';
import {frontierShopStock,remainingMerchantStock,formatFrontierPrice,walletCopper} from '../game/frontierShop';

export function MerchantShop({campaign,saving,onClose,onPrepare,onSettle}:{campaign:Campaign;saving:boolean;onClose:()=>void;onPrepare:(itemId:string,quantity:number)=>Promise<void>;onSettle:(confirmed:boolean)=>Promise<void>}){
 const [itemId,setItemId]=useState<string>(frontierShopStock[0]?.id??'');
 const [quantity,setQuantity]=useState(1);
 const selected=frontierShopStock.find(item=>item.id===itemId);
 const pending=campaign.pendingMerchantPurchase;
 const remaining=selected?remainingMerchantStock(campaign,selected.id):0;
 const discount=campaign.merchantDiscount?.itemId===itemId?campaign.merchantDiscount.percent:0;
 const unit=selected?selected.costCp-Math.floor(selected.costCp*discount/100):0;
 const funds=walletCopper(campaign.inventoryLedger?.currency);
 const total=unit*quantity;
 const eligible=!!selected&&quantity<=remaining&&quantity>=1&&total<=funds;
 return <section aria-label="Frontier Village general store" className="rounded-2xl border border-gold/40 bg-panel p-4 space-y-4">
   <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Frontier Village</p><h2 className="font-serif text-xl">Mara Vell's General Store</h2><p className="text-xs text-parchment/65">Equipment and provisions · Prices from the rules engine</p></div><button type="button" onClick={onClose} disabled={saving||!!pending} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Leave shop</button></div>
   <div className="rounded-lg border border-gold/25 bg-ink/50 p-3 text-sm" aria-label="Current wallet"><span className="text-parchment/70">Your money</span><strong className="float-right text-gold">{formatFrontierPrice(funds)}</strong><p className="mt-1 text-xs text-parchment/60">GP, SP and CP are calculated together; purchases make change automatically.</p></div>
   <div className="space-y-2"><h3 className="font-semibold">Available equipment</h3><div className="max-h-72 overflow-y-auto rounded-lg border border-white/15" role="table" aria-label="Merchant inventory">
    {frontierShopStock.map(item=><button key={item.id} type="button" disabled={!!pending||saving} onClick={()=>{setItemId(item.id);setQuantity(1)}} className={'flex w-full items-center justify-between gap-2 border-b border-white/10 px-3 py-3 text-left text-sm last:border-0 '+(item.id===itemId?'bg-gold/15':'')} aria-pressed={item.id===itemId}><span className="min-w-0 flex-1"><strong className="block">{item.name}</strong><span className="text-xs text-parchment/60">{remainingMerchantStock(campaign,item.id)} in stock{item.packQuantity?' · pack of '+item.packQuantity:''}</span></span><span className="shrink-0 tabular-nums text-gold">{formatFrontierPrice(item.costCp)}</span></button>)}
   </div></div>
   {pending?<div aria-label="Confirm merchant purchase" className="space-y-3 rounded-lg border border-gold/40 p-3"><h3 className="font-semibold">Confirm purchase</h3><p>{pending.quantity} × {frontierShopStock.find(item=>item.id===pending.itemId)?.name} — <strong>{formatFrontierPrice(pending.quantity*pending.unitCostCp)}</strong></p><p className="text-xs text-parchment/70">No gold or items change until you confirm.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={()=>void onSettle(false)} className="rounded-lg border border-white/30 p-3">Cancel</button><button type="button" disabled={saving} onClick={()=>void onSettle(true)} className="rounded-lg bg-gold p-3 font-semibold text-ink">Confirm purchase</button></div></div>:<div className="space-y-3 rounded-lg border border-white/15 p-3"><h3 className="font-semibold">Prepare purchase</h3><label className="block text-sm">Quantity <input aria-label="Purchase quantity" type="number" min={1} max={Math.min(20,remaining)} value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/20 bg-ink p-3"/></label><div className="flex justify-between text-sm"><span>Total</span><strong className="text-gold">{formatFrontierPrice(total)}</strong></div>{total>funds&&<p role="status" className="text-sm text-amber-300">Not enough money.</p>}{remaining<quantity&&<p role="status" className="text-sm text-amber-300">Not enough stock.</p>}<button type="button" disabled={!eligible||saving} onClick={()=>void onPrepare(itemId,quantity)} className="w-full rounded-lg bg-gold p-3 font-semibold text-ink disabled:opacity-40">Review purchase</button></div>}
   <p className="text-xs text-parchment/65">You can still speak to Mara, ask about items, or negotiate through the Dungeon Master conversation.</p>
 </section>;
}
