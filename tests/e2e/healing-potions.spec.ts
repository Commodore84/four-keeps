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
