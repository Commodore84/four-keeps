import {test,expect} from '@playwright/test';

test('iPhone campaign backup can be exported and restored with replacement confirmation',async({page})=>{
  await page.goto('/four-keeps/');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Open navigation menu'}).count().then(async count=>{
    if(count===0) return;
  });
  // Create a campaign through the existing development entry point.
  // On the portal, Developer becomes available after Settings navigation.
  const menu=page.getByRole('button',{name:'Open navigation menu'});
  if(await menu.count()===0) {
    await page.getByRole('button',{name:'Home',exact:true}).click();
  }
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
  const legacy=page.getByLabel('Legacy campaign creation');
  if(!(await legacy.isVisible()))await page.getByLabel('Development section').locator('summary').first().click();
  await legacy.getByLabel('New campaign name').fill('Backup recovery');
  await legacy.getByRole('button',{name:'New',exact:true}).click();
  const nav=page.getByRole('button',{name:'Open navigation menu'});
  if(await nav.getAttribute('aria-expanded')!=='true')await nav.click();
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Settings',exact:true}).click();
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup'}).click();
  const download=await downloading;
  expect(download.suggestedFilename()).toMatch(/^four-keeps-.*\.json$/);
  const saved=await download.path();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('input[type=file]').setInputFiles(saved!);
  await expect(page.getByText('Campaign restored from backup.')).toBeVisible();
});
