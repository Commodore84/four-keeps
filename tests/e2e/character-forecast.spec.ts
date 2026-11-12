import {test,expect} from '@playwright/test';
async function openPlan(page:import('@playwright/test').Page,classId='rogue'){
 await page.goto('/four-keeps/');await page.evaluate(id=>{const now=new Date().toISOString();localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{schemaVersion:1,id:'future-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},step:'forecast',identity:{name:'Future Hero',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{classId:id,abilities:{method:'standard',base:{Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Dex:2,Int:1},rolls:[],rollDice:[]}},createdAt:now,updatedAt:now}]));},classId);
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero.*Resume draft/}).click();
}
test('planner exposes subclass and correct rogue improvement milestones',async({page})=>{
 await openPlan(page);await expect(page.getByText('Future ASIs & Feats')).toBeVisible();await page.getByLabel('Planned subclass').selectOption('rogue-arcane-trickster');
 for(const level of [4,8,10,12,16])await expect(page.getByLabel(`Level ${level} feat choice`)).toBeVisible();
 await expect(page.getByLabel('Level 6 feat choice')).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero/}).click();await expect(page.getByLabel('Planned subclass')).toHaveValue('rogue-arcane-trickster');
});
test('ASI changes cumulative projected scores and survives reload',async({page})=>{
 await openPlan(page);await page.getByLabel('Level 4 feat choice').selectOption('Ability Score Improvement');await page.getByRole('button',{name:'Add level 4 Dex increase'}).click();
 await expect(page.getByLabel('Level 8 projected ability scores')).toContainText('18');
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero/}).click();await expect(page.getByLabel('Level 4 feat choice')).toHaveValue('Ability Score Improvement');await expect(page.getByLabel('Level 8 projected ability scores')).toContainText('18');
});
test('feat ability increase is projected and earlier choices recalculate later scores',async({page})=>{
 await openPlan(page);await page.getByLabel('Level 4 feat choice').selectOption('Skill Expert');await page.getByLabel('Level 4 feat ability').selectOption('Int');
 await expect(page.getByLabel('Level 8 projected ability scores')).toContainText('15');
 await page.getByLabel('Level 4 feat choice').selectOption('Ability Score Improvement');await expect(page.getByLabel('Level 8 projected ability scores')).toContainText('14');
});
test('Epic Boon selection and ability persist after reload',async({page})=>{
 await openPlan(page);await page.getByLabel('Level 19 Epic Boon',{exact:true}).selectOption('Boon of Fortitude');await page.getByLabel('Level 19 Epic Boon ability').selectOption('Con');
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero/}).click();await expect(page.getByLabel('Level 19 Epic Boon',{exact:true})).toHaveValue('Boon of Fortitude');await expect(page.getByLabel('Level 19 Epic Boon ability')).toHaveValue('Con');
});
test('legacy elf lineage feat, subclass and ability forecast survive reload',async({page})=>{
 await openPlan(page);
 await page.evaluate(()=>{const key='four-keeps-character-drafts-v1';const drafts=JSON.parse(localStorage.getItem(key)!);drafts[0].rules.allowCompatibleLegacy=true;drafts[0].selections.speciesId='elf';drafts[0].selections.lineageId='high-elf';localStorage.setItem(key,JSON.stringify(drafts));});
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero.*Resume draft/}).click();
 await page.getByLabel('Planned subclass').selectOption('rogue-arcane-trickster');await page.getByLabel('Level 4 feat choice').selectOption('Fey Teleportation');await page.getByLabel('Level 4 feat ability').selectOption('Int');
 await expect(page.getByText(/DM approval required/).first()).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:/Future Hero.*Resume draft/}).click();
 await expect(page.getByLabel('Planned subclass')).toHaveValue('rogue-arcane-trickster');await expect(page.getByLabel('Level 4 feat choice')).toHaveValue('Fey Teleportation');await expect(page.getByLabel('Level 4 feat ability')).toHaveValue('Int');
});
