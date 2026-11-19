import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {buyFrontierItem,frontierShopStock,frontierMerchantContext,formatFrontierPrice,parseFrontierPurchase,prepareMerchantPurchase,prepareMerchantCart,settleMerchantPurchase,cityShopStock,merchantCatalogFor,availableMerchants,merchantStockKey,merchantInitialStock,merchantRestockIntervalMinutes,walletCopper,remainingMerchantStock,merchantCatalog,isMerchantBrowseRequest,approveMerchantDiscount,isMerchantPurchaseRequest,classifyMerchantIntent,merchantNegotiationTarget,beginMerchantNegotiation,resolveMerchantNegotiation} from './frontierShop';
function fixture(){const c=newCampaign('Shop','shop-test');return beginAdventureSession({...c,merchantSettlementTier:'town',characterIdentity:{name:'Test',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},inventoryLedger:{currency:{GP:10,SP:0,CP:0,EP:0,PP:0},gear:[]}})}
describe('deterministic merchant negotiation check lifecycle',()=>{
 const pending=(token='social-1')=>({...fixture(),pendingCheck:{token,skill:'Persuasion' as const,mode:'normal' as const,reason:'Negotiate the dagger price'}});
 it('requires an authoritative matching social check before any discount',()=>{
  const c=pending();
  expect(()=>beginMerchantNegotiation(c,'dagger','wrong','Persuasion')).toThrow();
  expect(()=>beginMerchantNegotiation(c,'dagger','social-1','Athletics')).toThrow();
  const prepared=beginMerchantNegotiation(c,'dagger','social-1','Persuasion');
  expect(prepared.merchantDiscount).toBeUndefined();
  expect(prepared.pendingMerchantNegotiation?.itemId).toBe('dagger');
  const saved=JSON.parse(JSON.stringify(prepared));
  expect(()=>resolveMerchantNegotiation(saved,'other',true,22)).toThrow();
  const approved=resolveMerchantNegotiation(saved,'social-1',true,22);
  expect(approved.merchantDiscount).toMatchObject({itemId:'dagger',percent:20});
  expect(approved.pendingMerchantNegotiation).toBeUndefined();
  expect(()=>resolveMerchantNegotiation(approved,'social-1',true,22)).toThrow();
 });
 it('refuses failed bargains and grants only 10% for ordinary successful checks',()=>{
  const c=beginMerchantNegotiation(pending(),'dagger','social-1','Persuasion');
  expect(resolveMerchantNegotiation(c,'social-1',false,25).merchantDiscount).toBeUndefined();
  expect(resolveMerchantNegotiation(c,'social-1',true,15).merchantDiscount?.percent).toBe(10);
  const approved=resolveMerchantNegotiation(c,'social-1',true,15);
  const purchase=prepareMerchantPurchase(approved,'dagger',1,'negotiated');
  expect(purchase.pendingMerchantPurchase?.unitCostCp).toBe(180);
  expect(settleMerchantPurchase(purchase,'negotiated',true).inventoryLedger?.currency.GP).toBe(8);
 });
});
describe('2024 merchant catalog compatibility and ammunition',()=>{
 it('sells only canonical entries from the explicitly selected merchant stock',()=>{
  expect(frontierShopStock.every(item=>item.official2024)).toBe(true);
  expect(frontierShopStock.some(item=>item.id==='greatsword')).toBe(false);
  expect(frontierShopStock.find(item=>item.id==='bolts')).toMatchObject({costCp:5});
  expect(frontierShopStock.find(item=>item.id==='bullets-sling')).toMatchObject({costCp:4,packQuantity:20});
  expect(merchantCatalog(fixture())).toContain('per pack of 20');
 });
 it('prices sling bullets by a 20-piece pack in integer copper and persists stock and ammunition',()=>{
  const c=fixture();
  const pending=prepareMerchantPurchase(c,'bullets-sling',2,'pack-1');
  expect(pending.pendingMerchantPurchase?.unitCostCp).toBe(4);
  expect(pending.inventoryLedger).toEqual(c.inventoryLedger);
  const bought=settleMerchantPurchase(JSON.parse(JSON.stringify(pending)),'pack-1',true);
  expect(bought.inventoryLedger?.gear).toContainEqual({name:'Bullets, Sling (20)',quantity:40});
  expect(walletCopper(bought.inventoryLedger?.currency)).toBe(992);
  expect(remainingMerchantStock(bought,'bullets-sling')).toBe(3);
  expect(()=>settleMerchantPurchase(bought,'pack-1',true)).toThrow();
 });
 it('rejects unlisted merchandise and tampered discount without spending money',()=>{
  const c=fixture();
  expect(isMerchantPurchaseRequest('I will buy a greatsword')).toBe(true);
  expect(isMerchantPurchaseRequest('I look for a place to buy some gear')).toBe(false);
  expect(isMerchantPurchaseRequest('Where can I buy supplies?')).toBe(false);
  expect(isMerchantPurchaseRequest('I want to find a merchant who sells weapons')).toBe(false);
  expect(isMerchantPurchaseRequest('I want to buy a dagger')).toBe(true);
  expect(isMerchantPurchaseRequest('Buy 2 torches')).toBe(true);
  expect(merchantNegotiationTarget('Can you discount the dagger?')).toBe('dagger');
  expect(merchantNegotiationTarget('Can you discount everything?')).toBeNull();
  expect(merchantNegotiationTarget('Can you discount the dagger and rope?')).toBeNull();
  expect(parseFrontierPurchase('I will buy a greatsword')).toBeNull();
  expect(parseFrontierPurchase('I will buy 2 packs of sling bullets')).toEqual({itemId:'bullets-sling',quantity:2});
  expect(parseFrontierPurchase('I will buy 3 crossbow bolts')).toEqual({itemId:'bolts',quantity:3});
  expect(()=>prepareMerchantPurchase(c,'greatsword',1,'no-stock')).toThrow();
  const tampered={...c,merchantDiscount:{itemId:'dagger',percent:90,approvalId:'invalid'}};
  expect(()=>prepareMerchantPurchase(tampered,'dagger',1,'bad-discount')).toThrow();
  expect(c.inventoryLedger?.currency.GP).toBe(10);
 });
});
describe('first visit shop',()=>{
 it('shows standard prices in gold, silver and copper',()=>{expect(formatFrontierPrice(200)).toBe('2 GP');expect(formatFrontierPrice(125)).toBe('1.25 GP');expect(formatFrontierPrice(5)).toBe('5 CP');expect(formatFrontierPrice(0)).toBe('0 CP')});
 it('uses the canonical item catalog and deducts exact copper pieces',()=>{const item=frontierShopStock.find(i=>i.id==='dagger')!;expect(item.costCp).toBe(200);const c=buyFrontierItem(fixture(),'dagger',2);expect(c.inventoryLedger?.currency.GP).toBe(6);expect(c.inventoryLedger?.gear).toContainEqual({name:'Dagger',quantity:2});expect(JSON.parse(JSON.stringify(c)).inventoryLedger.gear[0].quantity).toBe(2)});
 it('does not mutate a campaign on invalid, unavailable or unaffordable purchases',()=>{const c=fixture();for(const [id,q] of [['dagger',21],['greatsword',1],['dagger',6]] as const)expect(()=>buyFrontierItem(c,id,q)).toThrow();expect(c.inventoryLedger?.currency.GP).toBe(10)});
 it('exposes authoritative shop prices and wallet to merchant conversation without transactions',()=>{const c=fixture();const ctx=frontierMerchantContext(c)!;expect(ctx.items).toContainEqual({id:'potion-of-healing',name:'Potion of Healing',costCp:5000,packQuantity:1,remaining:3});expect(ctx.walletCp).toBe(1000);expect(ctx.purchaseRule).toContain('explicit confirmation');expect(c.inventoryLedger?.gear).toEqual([])});
 it('requires a started imported character in Frontier Village',()=>{const c=fixture();expect(()=>buyFrontierItem({...c,adventureSession:{...c.adventureSession!,site:'crossroads'}},'dagger')).toThrow('not available')});
});

describe('conversational merchant transaction lifecycle',()=>{
 it('recognizes a single listed item and refuses ambiguous or invalid requests',()=>{
  expect(parseFrontierPurchase('I will buy 2 daggers')).toEqual({itemId:'dagger',quantity:2});
  expect(parseFrontierPurchase('What do you sell?')).toBeNull();
  expect(parseFrontierPurchase('Buy 30 daggers')).toBeNull();
  expect(parseFrontierPurchase('Buy a greatsword')).toBeNull();
 });
 it('requires confirmation, survives serialization and rejects duplicate settlement',()=>{
  const initial=fixture();
  const pending=prepareMerchantPurchase(initial,'dagger',2,'transaction-1');
  expect(walletCopper(pending.inventoryLedger?.currency)).toBe(1000);
  const reloaded=JSON.parse(JSON.stringify(pending));
  const done=settleMerchantPurchase(reloaded,'transaction-1',true);
  expect(walletCopper(done.inventoryLedger?.currency)).toBe(600);
  expect(done.inventoryLedger?.gear).toContainEqual({name:'Dagger',quantity:2});
  expect(()=>settleMerchantPurchase(done,'transaction-1',true)).toThrow();
  expect(done.completedMerchantPurchaseIds).toContain('transaction-1');
 });
 it('cancels without spending and rejects insufficient funds',()=>{
  const pending=prepareMerchantPurchase(fixture(),'dagger',1,'transaction-2');
  const canceled=settleMerchantPurchase(pending,'transaction-2',false);
  expect(walletCopper(canceled.inventoryLedger?.currency)).toBe(1000);
  expect(canceled.pendingMerchantPurchase).toBeUndefined();
  expect(()=>prepareMerchantPurchase(fixture(),'potion-of-healing',1,'unaffordable')).toThrow();
  expect(()=>prepareMerchantPurchase(pending,'dagger',1,'overlap')).toThrow();
 });
});

describe('finite stock and bounded merchant prices',()=>{
 it('lists actual quantities and rejects purchases beyond stock',()=>{
  const c=fixture();expect(isMerchantBrowseRequest('What do you sell?')).toBe(true);
  expect(merchantCatalog(c)).toContain('Dagger: 2 GP each (8 available)');
  expect(()=>prepareMerchantPurchase(c,'dagger',9,'too-many')).toThrow('stock');
  const bought=buyFrontierItem(c,'dagger',2);
  expect(remainingMerchantStock(bought,'dagger')).toBe(6);
  expect(remainingMerchantStock(JSON.parse(JSON.stringify(bought)),'dagger')).toBe(6);
  expect(()=>buyFrontierItem(bought,'dagger',7)).toThrow('stock');
 });
 it('bounds DM-approved discounts and consumes them on purchase',()=>{
  const c=fixture();
  expect(()=>approveMerchantDiscount(c,'dagger',25,'bad')).toThrow();
  const discounted=approveMerchantDiscount(c,'dagger',20,'dm-approved');
  const pending=prepareMerchantPurchase(discounted,'dagger',2,'txn');
  expect(pending.pendingMerchantPurchase?.unitCostCp).toBe(160);
  const settled=settleMerchantPurchase(pending,'txn',true);
  expect(walletCopper(settled.inventoryLedger?.currency)).toBe(680);
  expect(settled.merchantDiscount).toBeUndefined();
  expect(remainingMerchantStock(settled,'dagger')).toBe(6);
 });
});


describe('natural DM intent does not become a transaction',()=>{
 it.each([
  ['Can I look around for where I could get a leather arm warmer made?', 'find-service'],
  ['I want to find a leatherworker who could make an arm warmer.', 'find-service'],
  ['Where can I buy leather armor?', 'find-service'],
  ['Could I commission a custom leather sleeve?', 'commission'],
  ['Can you repair my boots?', 'commission'],
  ['What is an arm warmer?', 'information'],
  ['Show me your inventory.', 'browse'],
  ['I buy a dagger.', 'purchase'],
  ['I buy a dagger from the merchant.', 'purchase'],
  ['Buy me two torches.', 'purchase'],
  ['I need some equipment.', 'clarify'],
 ] as const)('classifies %s as %s',(message,intent)=>{
  expect(classifyMerchantIntent(message)).toBe(intent);
  if(intent!=='purchase'){
   expect(isMerchantPurchaseRequest(message)).toBe(false);
   expect(parseFrontierPurchase(message)).toBeNull();
  }
 });
 it('preserves an explicit stocked purchase and deterministic confirmation',()=>{
  expect(parseFrontierPurchase('I buy a dagger.')).toEqual({itemId:'dagger',quantity:1});
  const pending=prepareMerchantPurchase(fixture(),'dagger',1,'safe-intent');
  expect(pending.pendingMerchantPurchase).toBeDefined();
  expect(settleMerchantPurchase(pending,'safe-intent',false).inventoryLedger?.currency.GP).toBe(10);
 });
});

describe('multi-item merchant cart',()=>{
 it('opens browsing directly but does not misclassify finding a craftsperson',()=>{
  expect(classifyMerchantIntent("I'd like to browse")).toBe('browse');
  expect(classifyMerchantIntent('Can I see the merchandise?')).toBe('information');
  expect(classifyMerchantIntent('Where can I find a leatherworker?')).toBe('find-service');
 });
 it('quotes multiple items, persists, confirms once and updates exact inventory and currency',()=>{
  const c=fixture();
  const quoted=prepareMerchantCart(c,[{itemId:'dagger',quantity:1},{itemId:'torch',quantity:3}],'cart-1');
  expect(quoted.inventoryLedger).toEqual(c.inventoryLedger);
  expect(quoted.pendingMerchantPurchase?.lines).toHaveLength(2);
  const restored=JSON.parse(JSON.stringify(quoted));
  const paid=settleMerchantPurchase(restored,'cart-1',true);
  expect(paid.inventoryLedger?.gear.find(item=>item.name==='Dagger')?.quantity).toBe(1);
  expect(paid.inventoryLedger?.gear.find(item=>item.name==='Torch')?.quantity).toBe(3);
  expect(walletCopper(paid.inventoryLedger?.currency)).toBe(walletCopper(c.inventoryLedger?.currency)-203);
  expect(()=>settleMerchantPurchase(paid,'cart-1',true)).toThrow();
 });
 it('rejects duplicate items, insufficient total funds, and cancellation without changing stock',()=>{
  const c=fixture();
  expect(()=>prepareMerchantCart(c,[{itemId:'dagger',quantity:1},{itemId:'dagger',quantity:1}],'dup')).toThrow();
  expect(()=>prepareMerchantCart(c,[{itemId:'dagger',quantity:8},{itemId:'rope',quantity:12}],'expensive')).toThrow();
  const pending=prepareMerchantCart(c,[{itemId:'dagger',quantity:1},{itemId:'torch',quantity:1}],'cancel');
  const canceled=settleMerchantPurchase(pending,'cancel',false);
  expect(canceled.inventoryLedger).toEqual(c.inventoryLedger);
  expect(canceled.merchantStockRemaining).toEqual(c.merchantStockRemaining);
 });
 it('formats copper and silver naturally',()=>{
  expect(formatFrontierPrice(1)).toBe('1 CP');
  expect(formatFrontierPrice(50)).toBe('5 SP');
  expect(formatFrontierPrice(200)).toBe('2 GP');
 });
});

describe('2024 equipment catalog and merchant availability',()=>{
 it('offers a broad SRD-priced village general store and wider city assortment',()=>{
  expect(frontierShopStock.length).toBeGreaterThan(35);
  expect(cityShopStock.length).toBeGreaterThan(frontierShopStock.length+30);
  expect(frontierShopStock.find(item=>item.id==='backpack')?.costCp).toBe(200);
  expect(frontierShopStock.find(item=>item.id==='healer-s-kit')?.costCp).toBe(500);
  expect(frontierShopStock.find(item=>item.id==='waterskin')?.costCp).toBe(20);
  expect(frontierShopStock.some(item=>item.id==='plate-armor')).toBe(false);
  expect(cityShopStock.some(item=>item.id==='plate-armor')).toBe(true);
 });
 it('rejects a specialist item in a village without changing money or inventory',()=>{
  const c=fixture();
  expect(()=>prepareMerchantCart(c,[{itemId:'plate-armor',quantity:1}],'no-plate')).toThrow();
  expect(c.pendingMerchantPurchase).toBeUndefined();
 });
});

describe('settlement marketplace and merchant specialties',()=>{
 it('partitions every nonmagic standard equipment entry across city specialists exactly once',()=>{
  const types=availableMerchants('city');
  const ids=types.flatMap(type=>merchantCatalogFor('city',type).map(item=>item.id));
  expect(ids.length).toBe(cityShopStock.length);
  expect(new Set(ids).size).toBe(cityShopStock.length);
  expect(merchantCatalogFor('city','weaponsmith').some(item=>item.id==='greatsword')).toBe(true);
  expect(merchantCatalogFor('city','armorer').some(item=>item.id==='plate-armor')).toBe(true);
  expect(merchantCatalogFor('city','general').some(item=>item.id==='plate-armor')).toBe(false);
 });
 it('limits traveling merchants to a small consumable catalog',()=>{
  const items=merchantCatalogFor('traveling','trader');
  expect(items.length).toBeGreaterThan(2);
  expect(items.length).toBeLessThan(12);
  expect(items.some(item=>item.id==='greatsword')).toBe(false);
  expect(items.some(item=>item.id==='rations')).toBe(true);
  expect(availableMerchants('traveling')).toEqual(['trader']);
 });
 it('uses separate persistent merchant stock keys',()=>{
  expect(merchantStockKey('city','weaponsmith','dagger')).not.toBe(merchantStockKey('village','trader','dagger'));
 });
});

describe('merchant-specific persistent purchases',()=>{
 it('sells a city weapon at official price, persists the selected weaponsmith, and does not affect other merchants',()=>{
  const c={...fixture(),merchantSettlementTier:'city' as const,merchantShopType:'weaponsmith' as const};
  const quoted=prepareMerchantCart(c,[{itemId:'dagger',quantity:2}],'city-dagger');
  expect(quoted.pendingMerchantPurchase?.lines?.[0].unitCostCp).toBe(200);
  const restored=JSON.parse(JSON.stringify(quoted));
  const paid=settleMerchantPurchase(restored,'city-dagger',true);
  expect(paid.merchantStockRemaining?.['city:weaponsmith:dagger']).toBe(merchantInitialStock('city','dagger','weaponsmith')-2);
  expect(walletCopper(paid.inventoryLedger?.currency)).toBe(600);
  expect(remainingMerchantStock(paid,'dagger','weaponsmith')).toBe(merchantInitialStock('city','dagger','weaponsmith')-2);
  expect(()=>settleMerchantPurchase(paid,'city-dagger',true)).toThrow();
 });
 it('refuses a weapon purchase from the city general store',()=>{
  const c={...fixture(),merchantSettlementTier:'city' as const,merchantShopType:'general' as const};
  expect(()=>prepareMerchantCart(c,[{itemId:'dagger',quantity:1}],'wrong-merchant')).toThrow();
 });
});


describe('atomic cart settlement preflight',()=>{
 it('rejects a stale second line without changing the original campaign',()=>{
  const c=fixture();
  const quoted=prepareMerchantCart(c,[{itemId:'dagger',quantity:1},{itemId:'torch',quantity:2}],'atomic-stale');
  const stale={...quoted,merchantStockRemaining:{...quoted.merchantStockRemaining,[merchantStockKey('town','general','torch')]:0}};
  const before=JSON.stringify(stale);
  expect(()=>settleMerchantPurchase(stale,'atomic-stale',true)).toThrow('stock');
  expect(JSON.stringify(stale)).toBe(before);
  expect(stale.completedMerchantPurchaseIds).toBeUndefined();
 });
 it('rejects a changed wallet before any line is purchased',()=>{
  const c=fixture();
  const quoted=prepareMerchantCart(c,[{itemId:'dagger',quantity:1},{itemId:'torch',quantity:1}],'atomic-wallet');
  const stale={...quoted,inventoryLedger:{...quoted.inventoryLedger!,currency:{GP:0,SP:0,CP:0,EP:0,PP:0}}};
  expect(()=>settleMerchantPurchase(stale,'atomic-wallet',true)).toThrow('Insufficient money');
  expect(stale.inventoryLedger.gear).toEqual([]);
 });
});

describe('finite inventory and game-time replenishment',()=>{
 it('provides realistic city stock and restores common goods daily',()=>{
  const c={...fixture(),merchantSettlementTier:'city' as const,merchantShopType:'general' as const};
  const initial=merchantInitialStock('city','torch','general');
  expect(initial).toBeGreaterThan(10);
  expect(initial).toBeLessThan(100);
  const bought=buyFrontierItem(c,'torch',2);
  expect(remainingMerchantStock(bought,'torch')).toBe(initial-2);
  expect(remainingMerchantStock({...bought,elapsedMinutes:1439},'torch')).toBe(initial-2);
  expect(remainingMerchantStock({...bought,elapsedMinutes:1440},'torch')).toBe(initial);
  expect(remainingMerchantStock(JSON.parse(JSON.stringify({...bought,elapsedMinutes:1440})),'torch')).toBe(initial);
 });
 it('keeps villages and traveling merchants on weekly schedules',()=>{
  expect(merchantRestockIntervalMinutes('village','torch')).toBe(10080);
  expect(merchantRestockIntervalMinutes('traveling','torch')).toBe(10080);
  expect(merchantInitialStock('traveling','torch','trader')).toBeLessThanOrEqual(5);
 });
});
