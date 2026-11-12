import {test,expect} from '@playwright/test';
async function openPlan(page:import('@playwright/test').Page,classId='rogue'){
 await page.goto('/four-keeps/');await page.evaluate(id=>{const now=new Date().toISOString();localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{schemaVersion:1,id:'future-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},step:'forecast',identity:{name:'Future Hero',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{classId:id,abilities:{method:'standard',base:{Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Dex:2,Int:1},rolls:[],rollDice:[]}},createdAt:now,updatedAt:now}]));},classId);
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero.*Resume draft/}).click();
}
test('planner exposes subclass and correct rogue improvement milestones',async({page})=>{
 await openPlan(page);await expect(page.getByText('Future ASIs & Feats')).toBeVisible();await page.getByLabel('Planned subclass').selectOption('rogue-arcane-trickster');
 for(const level of [4,8,10,12,16])await expect(page.getByLabel(`Level ${level} feat choice`)).toBeVisible();
 await expect(page.getByLabel('Level 6 feat choice')).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero/}).click();await expect(page.getByLabel('Planned subclass¶»§q«^