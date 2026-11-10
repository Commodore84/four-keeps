import { test, expect } from '@playwright/test';

test('creates a local campaign and restores its journal after reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await expect(page.getByRole('heading', { name: 'Four Keeps' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await expect(page.getByText('Campaign saved on this device', { exact: false })).toBeVisible();
  await page.getByLabel('Message the Dungeon Master').fill('I inspect the road.');
  await page.getByRole('button', { name: 'Player', exact: true }).click();
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('I inspect the road.');
  await page.getByRole('button', { name: 'Send message to Dungeon Master' }).click();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByText('I inspect the road.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue Adventure' }).click();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByText('I inspect the road.')).toBeVisible();
});

test('training encounter starts, rolls initiative, and survives reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Browser combat smoke');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Start encounter training' }).click();
  await expect(page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue Adventure' }).click();
  await expect(page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' })).toBeVisible();
  await page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' }).click();
  await expect(page.locator('[aria-label="Combat turn summary"]')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue Adventure' }).click();
  await expect(page.locator('[aria-label="Combat turn summary"]')).toBeVisible();
});

test('navigation preserves unsent draft and a saved campaign after reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Browser persistence');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await page.getByLabel('Message the Dungeon Master').fill('Draft before navigating');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('Draft before navigating');
  await page.reload();
  await expect(page.getByText('Browser persistence')).toBeVisible();
});

test('campaign deletion requires confirmation and preserves other campaigns', async ({ page }) => {
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Keep this campaign');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Delete this campaign');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Delete selected campaign' }).click();
  await expect(page.getByRole('group', { name: 'Confirm campaign deletion' })).toContainText('Delete this campaign');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByLabel('Active campaign')).toHaveValue(/.+/);
  await expect(page.getByLabel('Active campaign').locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete selected campaign' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('Campaign deleted from this device.')).toBeVisible();
  await expect(page.getByLabel('Active campaign').locator('option')).toHaveCount(1);
  await expect(page.getByLabel('Active campaign')).toContainText('Keep this campaign');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Active campaign').locator('option')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete selected campaign' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('No campaign selected')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Four Keeps landing page')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue Adventure' })).toBeDisabled();
});

test('combat replaces persistent DM composer with optional Ask DM and header resources', async ({ page }) => {
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Combat UI regression');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Start encounter training' }).click();
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveCount(0);
  await page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' }).click();
  await expect(page.getByLabel('Combat resources')).toBeVisible();
  await expect(page.getByText('Last action:', { exact: false })).toHaveCount(0);
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ask DM +' }).click();
  await expect(page.locator('#combat-dm-question')).toBeVisible();
  await page.getByRole('button', { name: 'Ask DM −' }).click();
  await expect(page.locator('#combat-dm-question')).toHaveCount(0);
});

test('illustrated forest map displays terrain-aligned grid without a legend', async ({ page, request }) => {
  expect((await request.get('/forest-ruins-test.svg')).status()).toBe(200);
  expect((await request.get('/dragon-sigil.svg')).status()).toBe(200);
  await page.goto('/four-keeps/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('New campaign name').fill('Forest map browser test');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('button', { name: 'Adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Start encounter training' }).click();
  await page.getByRole('button', { name: 'Roll initiative (d20 + DEX)' }).click();
  const grid=page.getByRole('grid', { name: 'Combat movement grid' });
  await expect(grid).toBeVisible();
  await expect(grid).toHaveCSS('background-image', /forest-ruins-test/);
  await expect(page.getByText('N = Nighthawk')).toHaveCount(0);
  await expect(page.getByRole('gridcell', { name: /Square 10, 11; stream terrain/ })).toHaveCount(1);
});

test('landing page routes and character draft survive reload', async ({page})=>{
 await page.goto('/four-keeps/');
 await expect(page.getByLabel('Four Keeps landing page')).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue Adventure'})).toBeDisabled();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:'Create character'}).click();
 await page.getByLabel('name *').fill('Browser Hero');
 await page.getByRole('button',{name:'All characters'}).click();
 await page.reload();
 await expect(page.getByLabel('Four Keeps landing page')).toBeVisible();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Browser Hero/}).click();
 await expect(page.getByLabel('name *')).toHaveValue('Browser Hero');
 await page.getByRole('button',{name:/Home/}).click();
 await page.getByRole('button',{name:'New Adventure'}).click();
 await page.getByRole('button',{name:/Home/}).click();
 await page.getByRole('button',{name:'My Campaigns'}).click();
 await page.getByRole('button',{name:/Home/}).click();
 await page.getByRole('button',{name:'Help'}).click();
 await expect(page.getByRole('heading',{name:'Help'})).toBeVisible();
});

test('wizard spellbook and prepared choices persist after reload', async ({page})=>{
 const now='2026-11-09T00:00:00.000Z';
 const draft={schemaVersion:1,id:'spell-browser-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'spells',identity:{name:'Spell Browser Hero',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{speciesId:'human',backgroundId:'sage',classId:'wizard',classChoices:{'class-skills':['Arcana','Investigation']},abilities:{method:'standard',base:{Str:8,Dex:14,Con:13,Int:15,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Int:2,Wis:1},rolls:[],rollDice:[]},equipment:{classPackage:0,backgroundPackage:0,purchases:{},equipped:{weapons:[]}}},createdAt:now,updatedAt:now};
 await page.addInitScript((value)=>{if(!localStorage.getItem('four-keeps-character-drafts-v1'))localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([value]));},draft);
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Spell Browser Hero/}).click();
 await expect(page.getByLabel('Spells and features')).toBeVisible();
 for(const name of ['Fire Bolt','Mage Hand','Minor Illusion'])await page.getByRole('checkbox',{name:new RegExp('^'+name)}).first().check();
 for(const name of ['Alarm','Burning Hands','Charm Person','Detect Magic','Find Familiar','Magic Missile'])await page.getByRole('checkbox',{name:new RegExp('^'+name)}).first().check();
 for(const name of ['Alarm','Burning Hands','Charm Person','Detect Magic'])await page.getByRole('checkbox',{name:new RegExp('^'+name)}).last().check();
 await page.getByRole('checkbox',{name:/^Fire Bolt/}).last().check();
 await page.getByRole('checkbox',{name:/^Mage Hand/}).last().check();
 await page.getByRole('radio',{name:'Find Familiar'}).check();
 await expect(page.getByText('Level-one spell choices valid and saved.')).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Spell Browser Hero/}).click();
 await expect(page.getByText('Level-one spell choices valid and saved.')).toBeVisible();
});

test('point buy begins at eight and blocks overspending',async ({page})=>{
 const now='2026-11-10T00:00:00.000Z';
 const draft={schemaVersion:1,id:'pointbuy-browser-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'abilities',identity:{name:'Point Buy Hero',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{speciesId:'human',backgroundId:'farmer',classId:'fighter',classChoices:{}},createdAt:now,updatedAt:now};
 await page.addInitScript(value=>{if(!localStorage.getItem('four-keeps-character-drafts-v1'))localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([value]));},draft);
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Point Buy Hero/}).click();
 await page.getByRole('button',{name:'Point Buy'}).click();
 await expect(page.getByText(/Points remaining:/)).toContainText('27 / 27');
 for(const ability of ['Str','Dex','Con'])for(let i=0;i<7;i++)await page.getByRole('button',{name:'Increase '+ability}).click();
 await expect(page.getByText(/Points remaining:/)).toContainText('0 / 27');
 await expect(page.getByRole('button',{name:'Increase Int'})).toBeDisabled();
 await page.getByRole('button',{name:'Decrease Str'}).click();
 await expect(page.getByText(/Points remaining:/)).toContainText('2 / 27');
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Point Buy Hero/}).click();
 await expect(page.getByText(/Points remaining:/)).toContainText('2 / 27');
});

test('Ask DM sees current character selections and responds in creation flow',async ({page})=>{
 const now='2026-11-10T00:00:00.000Z';
 const draft={schemaVersion:1,id:'ask-dm-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'identity',identity:{name:'Nighthawk',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{speciesId:'elf',lineageId:'wood-elf',classId:'rogue',backgroundId:'sage'},createdAt:now,updatedAt:now};
 await page.addInitScript(value=>{if(!localStorage.getItem('four-keeps-character-drafts-v1'))localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([value]));},draft);
 let sent:unknown;
 await page.route('**/api/ask-dm',async route=>{sent=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'For your wood elf Rogue, Dexterity is central to attacks and stealth.'})});});
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Nighthawk/}).click();
 await expect(page.getByLabel('Ask DM')).toBeVisible();
 await page.getByLabel('Your question').fill('Which ability matters most?');
 await page.getByRole('button',{name:'Ask DM',exact:true}).click();
 await expect(page.getByText(/Dexterity is central/)).toBeVisible();
 expect((sent as {draft:{identity:{name:string};selections:{classId:string}}}).draft.identity.name).toBe('Nighthawk');
 expect((sent as {draft:{identity:{name:string};selections:{classId:string}}}).draft.selections.classId).toBe('rogue');
});

test('spell choices show full inline descriptions without per-spell DM buttons',async ({page})=>{
 const now='2026-11-10T00:00:00.000Z';
 const draft={schemaVersion:1,id:'spell-details-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'spells',identity:{name:'Wizard Scholar',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{speciesId:'human',backgroundId:'sage',classId:'wizard',classChoices:{}},createdAt:now,updatedAt:now};
 await page.addInitScript(value=>{if(!localStorage.getItem('four-keeps-character-drafts-v1'))localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([value]));},draft);
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Wizard Scholar/}).click();
 await expect(page.getByText('Hurl a bubble of acid at one creature you can see.',{exact:false}).first()).toBeVisible();
 await expect(page.getByText('Sorcerer, Wizard',{exact:false}).first()).toBeVisible();
 await expect(page.getByRole('button',{name:'Full spell rules with DM'})).toHaveCount(0);
 await expect(page.getByLabel('Ask DM')).toBeVisible();
});

test('character builder shows species, background, class, and choice rules inline',async ({page})=>{
 const now='2026-11-10T00:00:00.000Z';
 const base={schemaVersion:1,id:'guide-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},identity:{name:'Guide Tester',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{speciesId:'elf',lineageId:'wood-elf',backgroundId:'sage',classId:'warlock',classChoices:{}},createdAt:now,updatedAt:now};
 await page.addInitScript(value=>{if(!localStorage.getItem('four-keeps-character-drafts-v1'))localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{...value,step:'origins'}]));},base);
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Guide Tester/}).click();
 await expect(page.getByText(/Your walking Speed increases to 35 feet/)).toBeVisible();
 await expect(page.getByText(/Choose two Wizard cantrips and one level-one Wizard spell/)).toBeVisible();
 await page.getByRole('button',{name:'Class',exact:true}).click();
 await expect(page.getByText(/Pact Magic slots refresh on Short Rests/)).toBeVisible();
 await expect(page.getByText(/Warlock spell slots return on a Short or Long Rest/)).toBeVisible();
});

test('all Warlock subclass options are readable without selecting one at level one',async ({page})=>{
 const now='2026-11-10T00:00:00.000Z';
 const draft={schemaVersion:1,id:'subclass-preview',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'class',identity:{name:'Warlock Preview',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{speciesId:'human',backgroundId:'sage',classId:'warlock',classChoices:{}},createdAt:now,updatedAt:now};
 await page.addInitScript(value=>{if(!localStorage.getItem('four-keeps-character-drafts-v1'))localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([value]));},draft);
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Warlock Preview/}).click();
 const section=page.getByLabel('Subclass options preview');
 await expect(section.getByText('Archfey',{exact:true})).toBeVisible();
 await expect(section.getByText('Celestial',{exact:true})).toBeVisible();
 await expect(section.getByText('Fiend',{exact:true})).toBeVisible();
 await expect(section.getByText('Great Old One',{exact:true})).toBeVisible();
 await expect(section.getByText(/you will choose a subclass when you reach level 3/)).toBeVisible();
});

test('future-level forecast grows sequentially and saves subclass plans',async ({page})=>{
 const now='2026-11-10T00:00:00.000Z';
 const draft={schemaVersion:1,id:'forecast-browser',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'forecast',identity:{name:'Forecast Warlock',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},selections:{speciesId:'human',backgroundId:'sage',classId:'warlock',classChoices:{}},createdAt:now,updatedAt:now};
 await page.addInitScript(value=>{if(!localStorage.getItem('four-keeps-character-drafts-v1'))localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([value]));},draft);
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Forecast Warlock/}).click();
 await expect(page.getByRole('button',{name:'See level 2'})).toBeVisible();
 await page.getByRole('button',{name:'See level 2'}).click();
 await page.getByLabel('Level 2 notes').fill('Practice invocations');
 await page.getByRole('button',{name:'See level 3'}).click();
 await page.getByLabel('Planned subclass').selectOption('warlock-archfey');
 await expect(page.getByText(/A patron from the Feywild/)).toBeVisible();
 await page.reload();
 await expect(page.getByLabel('Planned subclass')).toHaveValue('warlock-archfey');
 await expect(page.getByLabel('Level 2 notes')).toHaveValue('Practice invocations');
});
