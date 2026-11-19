import {test,expect} from '@playwright/test';

test('iPhone owned healing potion confirms once, persists HP and inventory, and cancels safely',async ({page})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const menu=page.getByRole('button',{name:'Open navigation menu'});
 await menu.click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
 const development=page.getByLabel('Development section');
 if(!(await development.getByLabel('Legacy campaign creation').isVisible()))await development.locator('summary').first().click();
 await development.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill('Potion persistence');
 await development.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('four-keeps-local',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),req=store.getAll();
   req.onsuccess=()=>{const c=req.result[0];c.character={...c.character,currentHitPoints:3,maxHitPoints:20};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion of Healing',quantity:2}]};store.put(c)};
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });db.close();
 });
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=page.getByRole('region',{name:'Healing potions'});
 await expect(panel).toBeVisible();
 await panel.getByLabel('Choose healing potion').selectOption('Potion of Healing');
 await panel.getByRole('button',{name:'Cancel'}).click();
 await expect(panel).toContainText('Potion of Healing (2)');
 await panel.getByLabel('Choose healing potion').selectOption('Potion of Healing');
 await panel.getByRole('button',{name:'Confirm drink potion'}).click();
 await expect(panel).toContainText('Potion of Healing (1)');
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByRole('region',{name:'Healing potions'})).toContainText('Potion of Healing (1)');
});


test('iPhone all four 2024 SRD potion tiers heal, decrement inventory, and survive reload',async({page})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const menu=page.getByRole('button',{name:'Open navigation menu'});
 await menu.click();await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
 const dev=page.getByLabel('Development section');
 if(!(await dev.getByLabel('Legacy campaign creation').isVisible()))await dev.locator('summary').first().click();
 await dev.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill('Four potion tiers');
 await dev.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.getAll();
   r.onsuccess=()=>{const c=r.result[0];c.character={...c.character,currentHitPoints:1,maxHitPoints:250};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:['Potion of Healing','Potion of Healing (greater)','Potion of Healing (superior)','Potion of Healing (supreme)'].map(name=>({name,quantity:1}))};store.put(c)};
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=page.getByRole('region',{name:'Healing potions'});
 const tiers=['Potion of Healing','Potion of Healing (greater)','Potion of Healing (superior)','Potion of Healing (supreme)'];
 for(const name of tiers){
  await panel.getByLabel('Choose healing potion').selectOption(name);
  await panel.getByRole('button',{name:'Confirm drink potion'}).click();
  if(name===tiers.at(-1))await expect(panel).toHaveCount(0);
  else await expect(panel.getByLabel('Choose healing potion')).toHaveValue('');
 }
 await expect(panel).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByRole('region',{name:'Healing potions'})).toHaveCount(0);
 const values=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});const c=await new Promise<any>(resolve=>{const r=db.transaction('campaigns').objectStore('campaigns').getAll();r.onsuccess=()=>resolve(r.result[0])});db.close();return {hp:c.character.currentHitPoints,quantities:c.inventoryLedger.gear.map((g:any)=>g.quantity),ids:c.healingPotionUseIds.length}});
 expect(values.hp).toBeGreaterThan(1);expect(values.quantities).toEqual([0,0,0,0]);expect(values.ids).toBe(4);
});


test('atomic IndexedDB potion commit rejects interrupted writes and concurrent stale submissions',async({page,context})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
 const dev=page.getByLabel('Development section');
 if(!(await dev.getByLabel('Legacy campaign creation').isVisible()))await dev.locator('summary').first().click();
 await dev.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill('Atomic persistence');
 await dev.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 const result=await page.evaluate(async()=>{
  const {commitHealingPotionUse}=await import('/src/game/storage.ts');
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const id=await new Promise<string>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.getAll();r.onsuccess=()=>{const c=r.result[0];c.character={...c.character,currentHitPoints:2,maxHitPoints:100};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion of Healing',quantity:2}]};store.put(c);resolve(c.id)};tx.onerror=()=>reject(tx.error)});db.close();
  const request={name:'Potion of Healing' as const,confirmed:true,expectedQuantity:2,expectedHP:2,requestId:'atomic-1',rollDie:()=>4};
  let failed=false;
  try{await commitHealingPotionUse(id,{...request,rollDie:()=>5})}catch{failed=true}
  const originalPut=IDBObjectStore.prototype.put;
  let writeInterrupted=false;
  IDBObjectStore.prototype.put=function(...args){throw Error('Simulated interrupted write')};
  try{await commitHealingPotionUse(id,request)}catch{writeInterrupted=true}finally{IDBObjectStore.prototype.put=originalPut}
  const [a,b]=await Promise.allSettled([commitHealingPotionUse(id,request),commitHealingPotionUse(id,{...request,requestId:'atomic-2'})]);
  const replay=await commitHealingPotionUse(id,request);
  const db2=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  const saved=await new Promise<any>(resolve=>{const r=db2.transaction('campaigns').objectStore('campaigns').get(id);r.onsuccess=()=>resolve(r.result)});db2.close();
  return {failed,writeInterrupted,settled:[a.status,b.status],hp:saved.character.currentHitPoints,stock:saved.inventoryLedger.gear[0].quantity,ids:saved.healingPotionUseIds,replayHp:replay.character.currentHitPoints};
 });
 expect(result.failed).toBe(true);expect(result.writeInterrupted).toBe(true);
 expect(result.settled).toContain('fulfilled');
 expect(result.settled).toContain('rejected');
 expect(result.stock).toBe(1);
 expect(result.ids).toHaveLength(1);
 expect(result.hp).toBe(result.replayHp);
});


