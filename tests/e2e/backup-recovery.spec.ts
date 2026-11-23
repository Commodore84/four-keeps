import {test,expect,type Page} from '@playwright/test';

async function navigate(page:Page,tab:'Settings'|'Developer'|'Adventure'){
  const menu=page.getByRole('button',{name:'Open navigation menu'});
  await menu.waitFor({state:'visible',timeout:2500}).catch(()=>{});
  if(await menu.count()===0){
    if(tab==='Settings'){await page.getByRole('button',{name:'Settings',exact:true}).click();return;}
    throw new Error('Navigation menu is unavailable on the portal screen');
  }
  if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:tab,exact:true}).click();
}

test('iPhone campaign backup export and restore with replacement confirmation',async({page})=>{
  await page.goto('/four-keeps/');
  await navigate(page,'Settings');
  await navigate(page,'Developer');
  const legacy=page.getByLabel('Legacy campaign creation');
  if(!(await legacy.isVisible()))await page.getByLabel('Development section').locator('summary').first().click();
  await legacy.getByLabel('New campaign name').fill('Backup recovery');
  await legacy.getByRole('button',{name:'New',exact:true}).click();
  await navigate(page,'Settings');
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup'}).click();
  const download=await downloading;
  expect(download.suggestedFilename()).toMatch(/^four-keeps-.*\.json$/);
  const saved=await download.path();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('input[type=file]').setInputFiles(saved!);
  await expect(page.getByText('Campaign restored from backup.')).toBeVisible();
});

test('two iPhone tabs reject a stale save without erasing the newer journal',async({page,context})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await navigate(page,'Developer');
 const legacy=page.getByLabel('Legacy campaign creation');
 if(!(await legacy.isVisible()))await page.getByLabel('Development section').locator('summary').first().click();
 await legacy.getByLabel('New campaign name').fill('Two tab conflict');
 await legacy.getByRole('button',{name:'New',exact:true}).click();
 const other=await context.newPage();
 await other.goto('/four-keeps/');
 await navigate(page,'Adventure');
 await navigate(other,'Adventure');
 await page.getByLabel('Message the Dungeon Master').fill('Newer progress from first tab');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Saved to your local journal.')).toBeVisible();
 await other.getByLabel('Message the Dungeon Master').fill('Stale progress from second tab');
 await other.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(other.getByText(/changed in another tab/i)).toBeVisible();
 const texts=await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('four-keeps-local');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const rows=await new Promise<any[]>((resolve,reject)=>{const req=db.transaction('campaigns','readonly').objectStore('campaigns').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  db.close();return rows.flatMap(row=>row.journal.map((entry:any)=>entry.text));
 });
 expect(texts.join(' ')).toContain('Newer progress from first tab');
 expect(texts.join(' ')).not.toContain('Stale progress from second tab');
});
