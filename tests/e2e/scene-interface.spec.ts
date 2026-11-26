import {test,expect,type Page} from '@playwright/test';
async function navigate(page:Page,tab:'Adventure'|'Settings'|'Developer') {
 const menu=page.getByRole('button',{name:'Open navigation menu'});
 if(await menu.count()===0){if(tab==='Settings'){await page.getByRole('button',{name:'Settings',exact:true}).click();return;}throw new Error('No menu on landing page');}
 if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:tab,exact:true}).click();
}
async function createScene(page:Page) {
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await navigate(page,'Developer');
 const details=page.getByLabel('Development section');
 if(!(await details.getByLabel('Legacy campaign creation').isVisible()))await details.locator('summary').first().click();
 await details.getByLabel('New campaign name').fill('Mobile scene test');
 await details.getByRole('button',{name:'New',exact:true}).click();
 await navigate(page,'Adventure');
 await navigate(page,'Settings');
 await navigate(page,'Developer');
 if(!(await details.getByLabel('Development tools').isVisible()))await details.locator('summary').first().click();
 await page.getByRole('button',{name:'Start encounter training'}).click();
 await page.getByRole('button',{name:'Roll initiative (d20 + DEX)'}).click();
 await expect(page.getByLabel('Scene action dock')).toBeVisible();
}
test('iPhone scene keeps battlefield visible with initiative, resources, favorites and conversation',async({page})=>{
 await createScene(page);
 await expect(page.getByLabel('Compact initiative order')).toBeVisible();
 await expect(page.getByLabel('Battlefield scene')).toBeVisible();
 await expect(page.getByLabel('Combat Lab session')).toHaveCount(0);
 await expect(page.getByLabel('Scene combat resources')).toContainText('HP');
 await expect(page.getByRole('button',{name:'More scene actions'})).toBeVisible();
 await expect(page.getByRole('button',{name:'End Turn'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Speak'})).toBeVisible();
 await page.screenshot({path:'test-results/mobile-scene-default-iphone.png',fullPage:false});
 await page.getByRole('button',{name:'Expand initiative and combat history'}).click();
 await expect(page.getByLabel('Expanded initiative and combat roll history')).toBeVisible();
 await page.getByRole('button',{name:'Expand initiative and combat history'}).click();
 const attack=page.getByRole('button',{name:'Scene action: Attack'});
 if(await attack.isEnabled()){
   await attack.click();
   await expect(page.getByRole('region',{name:'Confirm combat action'})).toBeVisible();
   await page.getByRole('region',{name:'Confirm combat action'}).getByRole('button',{name:'Cancel'}).click();
   const reachable=page.locator('[role="gridcell"][aria-label^="Square"]:not([disabled]):visible').first();
   await expect(reachable).toBeVisible();
   await reachable.click();
   await expect(page.getByRole('button',{name:/Confirm Move|Move Anyway/})).toBeVisible();
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
 }
 await page.getByRole('button',{name:'More scene actions'}).click();
 await expect(page.getByLabel('2024 D&D actions')).toBeVisible();
 await page.screenshot({path:'test-results/mobile-scene-more-iphone.png',fullPage:false});
 await page.getByRole('button',{name:'More scene actions'}).click();
 await page.getByRole('button',{name:'Speak'}).click();
 await expect(page.locator('#scene-speak-input')).toBeVisible();
 await expect(page.locator('#scene-speak-input')).toHaveCSS('font-size','16px');
 await page.getByRole('button',{name:'Speak'}).click();
});
test('iPhone Option B keeps action choices compact and detailed controls from eclipsing the map',async({page})=>{
 await createScene(page);
 const viewport=page.viewportSize();
 expect(viewport).toBeTruthy();
 const map=page.getByLabel('Battlefield scene');
 await expect(map).toBeVisible();
 await page.getByRole('button',{name:'More scene actions'}).click();
 const panel=page.locator('#scene-action-panel');
 await expect(panel).toBeVisible();
 const menu=await panel.evaluate(el=>({height:el.getBoundingClientRect().height,
   columns:getComputedStyle(el.querySelector('[aria-label="2024 D&D actions"]')!).gridTemplateColumns.split(' ').length,
   maxHeight:getComputedStyle(el).maxHeight}));
 expect(menu.columns).toBe(4);
 expect(menu.height).toBeLessThanOrEqual(viewport!.height*.31+2);
 await expect(map).toBeVisible();
 await page.screenshot({path:'test-results/mobile-scene-option-b-more-iphone.png',fullPage:false});
 await page.getByRole('button',{name:'More scene actions'}).click();
 await page.getByRole('button',{name:'Detailed controls',exact:true}).click();
 const details=page.getByLabel('Combat initiative tracker');
 await expect(details).toBeVisible();
 expect((await details.boundingBox())!.height).toBeLessThanOrEqual(viewport!.height*.37);
 await expect(page.getByRole('button',{name:'Close detailed controls panel'})).toBeVisible();
 await expect(map).toBeVisible();
 await page.screenshot({path:'test-results/mobile-scene-option-b-details-iphone.png',fullPage:false});
 await page.getByRole('button',{name:'Close detailed controls panel'}).click();
 await expect(details).toBeHidden();
 // All controls stay connected to the original battlefield, not an overlay map.
 await expect(page.getByRole('grid',{name:'Combat movement grid'})).toBeVisible();
});
test('scene favorites and order persist for the selected character',async({page})=>{
 await createScene(page);
 await navigate(page,'Settings');
 const settings=page.getByLabel('Scene action bar settings');
 await expect(settings).toBeVisible();
 await settings.getByRole('checkbox',{name:'Favorite Hide'}).uncheck();
 await settings.getByRole('button',{name:'Move Dash up'}).click();
 await navigate(page,'Adventure');
 await expect(page.getByRole('button',{name:'Scene action: Hide'})).toHaveCount(0);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await navigate(page,'Settings');
 await expect(settings.getByRole('checkbox',{name:'Favorite Hide'})).not.toBeChecked();
});
