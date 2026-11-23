import {test,expect} from '@playwright/test';
async function createCampaign(page:import('@playwright/test').Page,name:string){
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
 const dev=page.getByLabel('Development section');
 if(!(await dev.getByLabel('Legacy campaign creation').isVisible()))await dev.locator('summary').first().click();
 await dev.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill(name);
 await dev.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 return page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  return new Promise<string>((resolve,reject)=>{let id='';const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.getAll();
   r.onsuccess=()=>{const c=r.result[0];id=c.id;c.elapsedMinutes=100;c.character={...c.character,currentHitPoints:12,maxHitPoints:20};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Antitoxin',quantity:2},{name:"Healer's Kit",quantity:1}]};store.put(c)};
   tx.oncomplete=()=>{db.close();resolve(id)};tx.onerror=()=>reject(tx.error);
  });
 });
}
test('iPhone quest buyer offer confirms once and persists inventory',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const id=await createCampaign(page,'Quest magic buyer');
 await page.evaluate(async id=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite');const store=tx.objectStore('campaigns');const r=store.get(id);
   r.onsuccess=()=>{const c=r.result;c.characterIdentity=c.characterIdentity??{name:'Tester',classId:'rogue',speciesId:'human',backgroundId:'sage',draftId:'test',pronouns:'',appearance:'',personality:'',backstory:''};c.adventureSession={site:'frontier',status:'exploring',characterSource:'campaign-character',visited:['frontier'],interactions:[]};c.merchantShopOpen=true;c.merchantShopType='general';c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Bag of Holding',quantity:2}]};c.journal=[...(c.journal??[]),{id:'dm-quest-sale-1',kind:'dm',createdAt:new Date().toISOString(),text:'Magic-item buyer: Collector; quest: quest-1; item: Bag of Holding; quantity: 1; offer: 12500 CP'}];store.put(c)};
   tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);
  });
 },id);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByRole('tab',{name:'Sell'}).click();
 const sale=page.getByRole('region',{name:'Quest magic-item sale'});
 await expect(sale).toBeVisible();
 await expect(sale).toContainText('Collector');
 await page.screenshot({path:'test-results/v22-quest-offer-iphone.png',fullPage:true});
 await sale.getByRole('button',{name:'Confirm quest sale'}).click();
 await expect(sale).toBeHidden();
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByRole('tab',{name:'Sell'}).click();
 await expect(page.getByRole('region',{name:'Quest magic-item sale'})).toBeHidden();
 const result=await page.evaluate(async id=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});return new Promise<{quantity:number;pp:number}>(resolve=>{const tx=db.transaction('campaigns','readonly');tx.objectStore('campaigns').get(id).onsuccess=e=>{const c=(e.target as IDBRequest).result;resolve({quantity:c.inventoryLedger.gear[0].quantity,pp:c.inventoryLedger.currency.PP})}})},id);
 expect(result).toEqual({quantity:1,pp:12});
});

test('iPhone DM-generated quest buyer offer opens Sell and completes once',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 const id=await createCampaign(page,'DM quest buyer');
 await page.evaluate(async id=>{
  localStorage.setItem('four-keeps-access-code','browser-test-code');
  localStorage.setItem('four-keeps-dm-mode','on');
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite');const store=tx.objectStore('campaigns');const r=store.get(id);
   r.onsuccess=()=>{const c=r.result;c.characterIdentity={name:'Tester',classId:'rogue',speciesId:'human',backgroundId:'sage',draftId:'test',pronouns:'',appearance:'',personality:'',backstory:''};c.adventureSession={site:'frontier',status:'exploring',characterSource:'campaign-character',visited:['frontier'],interactions:[]};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Bag of Holding',quantity:2}]};c.journal=[{id:'prior-dm',kind:'dm',createdAt:new Date().toISOString(),text:'You meet a collector at the frontier.'}];store.put(c)};
   tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);
  });
 },id);
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'Collector offers 125 gold for your Bag of Holding, as part of the museum acquisition quest. You may accept or decline.',magicSaleOffer:{buyer:'Collector',questId:'museum-acquisition',itemName:'Bag of Holding',quantity:1,proceedsCp:12500},worldUpdates:{},newFacts:[]})}));
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByLabel('Message the Dungeon Master').fill('I want to sell my Bag of Holding to a collector');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const sale=page.getByRole('region',{name:'Quest magic-item sale'});
 await expect(sale).toBeVisible({timeout:20000});
 await expect(page.getByRole('tab',{name:'Sell'})).toHaveAttribute('aria-selected','true');
 await expect(sale).toContainText('museum-acquisition');
 await page.screenshot({path:'test-results/v22-dm-quest-offer-iphone.png',fullPage:true});
 await sale.getByRole('button',{name:'Confirm quest sale'}).click();
 await expect(sale).toBeHidden();
});
