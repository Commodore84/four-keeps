import {test,expect} from '@playwright/test';

test('character creator exposes an accessible draft and forecast navigation',async({page})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
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
  const draft={schemaVersion:1,id:'forecast-e2e-paladin',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},identity:{name:'Forecast Test Paladin'},selections:{classId:'paladin'},step:'forecast',forecast:{targetLevel:5,levels:[{level:3,subclassId:'paladin-devotion'}]},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  localStorage.setItem(key,JSON.stringify([draft]));
 });
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Forecast Test Paladin.*Resume draft/}).click();
 await expect(page.getByLabel('Character advancement forecast')).toBeVisible();
 await expect(page.getByText('Your Future Character')).toBeVisible();
 await expect(page.getByText(/Find Steed/).first()).toBeVisible();
});

test('forecast UI changes Druid terrain and displays the resulting always-prepared spells',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{schemaVersion:1,id:'druid-e2e',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},identity:{name:'Terrain Druid'},selections:{classId:'druid'},step:'forecast',forecast:{targetLevel:5,levels:[{level:3,subclassId:'druid-land'}]},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]));
 });
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Terrain Druid.*Resume draft/}).click();
 await expect(page.getByLabel('Planned subclass')).toHaveValue('druid-land');
 await page.getByLabel('Level 3 Circle of the Land terrain').selectOption('arid');
 await expect(page.getByLabel('Level 5 Circle of the Land terrain')).toHaveValue('arid');
 await page.getByLabel('Level 5 Circle of the Land terrain').selectOption('polar');
 await expect(page.getByLabel('Level 5 Circle of the Land terrain')).toHaveValue('polar');
 await expect(page.getByText(/Sleet Storm/).first()).toBeVisible();
});
test('forecast UI displays Warlock Mystic Arcanum replacement selectors',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{schemaVersion:1,id:'warlock-e2e',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},identity:{name:'Arcanum Warlock'},selections:{classId:'warlock'},step:'forecast',forecast:{targetLevel:12,levels:[{level:3,subclassId:'warlock-fiend'}]},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]));
 });
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Arcanum Warlock.*Resume draft/}).click();
 await expect(page.getByLabel('Level 12 Mystic Arcanum to replace')).toBeVisible();
 await expect(page.getByLabel('Level 12 Mystic Arcanum replacement')).toBeVisible();
});
