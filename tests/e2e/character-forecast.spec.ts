import {test,expect} from '@playwright/test';

test('character creator exposes an accessible draft and forecast navigation',async({page})=>{
 await page.goto('/four-keeps/');
 const creator=page.getByText('Character Creator',{exact:true});
 await expect(creator).toBeVisible();
 await page.getByRole('button',{name:'Create character'}).click();
 await expect(page.getByRole('navigation',{name:'Character creation steps'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Future Levels/})).toBeVisible();
 await expect(page.getByRole('button',{name:'All characters'})).toBeVisible();
});

test('forecast level selector and automatic spells are rendered for a saved Paladin draft',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const key='four-keeps-character-drafts-v1';
  const draft={
   schemaVersion:1,id:'forecast-e2e-paladin',status:'draft',
   rules:{edition:'2024',allowCompatibleLegacy:false},
   identity:{name:'Forecast Test Paladin'},
   selections:{classId:'paladin'},
   step:'forecast',
   forecast:{targetLevel:5,levels:[{level:3,subclassId:'paladin-devotion'}]},
   createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  };
  localStorage.setItem(key,JSON.stringify([draft]));
 });
 await page.reload();
 await page.getByRole('button',{name:/Forecast Test Paladin.*Resume draft/}).click();
 await expect(page.getByLabel('Character advancement forecast')).toBeVisible();
 await expect(page.getByText('Your Future Character')).toBeVisible();
 await expect(page.getByText('Find Steed',{exact:false}).first()).toBeVisible();
});
