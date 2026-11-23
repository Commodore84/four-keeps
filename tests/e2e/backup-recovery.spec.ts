import {test,expect,type Page} from '@playwright/test';

async function navigate(page:Page,tab:'Settings'|'Developer'){
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
