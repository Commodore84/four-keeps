import { test, expect, type Page } from '@playwright/test';
async function navigate(page:Page,tab:'Adventure'|'Player'|'Journal'|'Map'|'Settings'){
 const menu=page.getByRole('button',{name:'Open navigation menu'});
 await menu.waitFor({state:'visible',timeout:2500}).catch(()=>{});
 if(await menu.count()===0){if(tab==='Settings'){await page.getByRole('button',{name:'Settings',exact:true}).click();return;}throw new Error('Navigation menu is unavailable on the portal screen');}
 if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:tab,exact:true}).click();
}
async function openDevelopment(page:Page){
 await navigate(page,'Settings');
 const panel=page.getByLabel('Development section');
 if(!(await panel.getByLabel('Legacy campaign creation').isVisible()))await panel.locator('summary').first().click();
}


async function createLegacyCampaign(page:Page,title:string) {
 await openDevelopment(page);
 await page.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill(title);
 await page.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 await navigate(page,'Settings');
}


test('creates a local campaign and restores its journal after reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await expect(page.getByRole('heading', { name: 'Four Keeps' })).toBeVisible();
  await navigate(page,'Settings');
  await createLegacyCampaign(page,'Browser journal smoke');
  await navigate(page,'Adventure');
  await expect(page.getByText('Campaign saved on this device', { exact: false })).toBeVisible();
  await page.getByLabel('Message the Dungeon Master').fill('I inspect the road.');
  await navigate(page,'Player');
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('I inspect the road.');
  await page.getByRole('button', { name: 'Send message to Dungeon Master' }).click();
  await navigate(page,'Journal');
  await expect(page.getByText('I inspect the road.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue Adventure' }).click();
  await navigate(page,'Journal');
  await expect(page.getByText('I inspect the road.')).toBeVisible();
});

test('training encounter starts, rolls initiative, and survives reload', async ({ page }) => {
  await page.goto('/four-keeps/');
  await navigate(page,'Settings');
  await createLegacyCampaign(page,'Browser combat smoke');
  await navigate(page,'Adventure');
  await openDevelopment(page);
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
  await navigate(page,'Settings');
  await createLegacyCampaign(page,'Browser persistence');
  await navigate(page,'Adventure');
  await page.getByLabel('Message the Dungeon Master').fill('Draft before navigating');
  await navigate(page,'Map');
  await navigate(page,'Adventure');
  await expect(page.getByLabel('Message the Dungeon Master')).toHaveValue('Draft before navigating');
  await page.reload();
  await expect(page.getByText('Browser persistence')).toBeVisible();
});

test('campaign deletion requires confirmation and preserves other campaigns', async ({ page }) => {
  await page.goto('/four-keeps/');
  await navigate(page,'Settings');
  await createLegacyCampaign(page,'Keep this campaign');
  await createLegacyCampaign(page,'Delete this campaign');
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
  await navigate(page,'Settings');
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
  await navigate(page,'Settings');
  await createLegacyCampaign(page,'Combat UI regression');
  await navigate(page,'Adventure');
  await openDevelopment(page);
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
  await navigate(page,'Settings');
  await createLegacyCampaign(page,'Forest map browser test');
  await navigate(page,'Adventure');
  await openDevelopment(page);
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
 await page.evaluate(()=>{const key='four-keeps-character-drafts-v1';const drafts=JSON.parse(localStorage.getItem(key)??'[]');drafts[0].identity.name='Browser Hero';localStorage.setItem(key,JSON.stringify(drafts));});
 await page.getByRole('button',{name:'All characters'}).click();
 await page.reload();
 await expect(page.getByLabel('Four Keeps landing page')).toBeVisible();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Browser Hero/}).click();
 await expect(page.getByText('Browser Hero',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Home/}).click();
 await page.getByRole('button',{name:'New Adventure'}).click();
 await expect(page.getByLabel('Starting character')).toHaveValue('');
 await expect(page.getByRole('button',{name:'Create campaign'})).toBeDisabled();
 await expect(page.getByText('Create and complete a character under My Characters first.',{exact:false})).toBeVisible();
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
 await page.getByRole('button',{name:'Point Buy',exact:true}).click();
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

test('character creator does not show redundant full rules with DM buttons',async({page})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:'Create character',exact:true}).click();
 await expect(page.getByRole('button',{name:/Full (class|background) rules with DM/i})).toHaveCount(0);
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
 await page.getByRole('button',{name:'1. Class'}).click();
 await expect(page.getByText(/Pact Magic slots refresh on Short Rests/)).toBeVisible();
 await expect(page.getByText(/Warlock spell slots return on a Short or Long Rest/)).toHaveCount(1);
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

test('registered subclass actors persist in campaign and remain separate from Nighthawk',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Subclass actor persistence');
 await navigate(page,'Adventure');
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('four-keeps-local',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction('campaigns','readwrite');const store=tx.objectStore('campaigns');
   const req=store.getAll();req.onsuccess=()=>{
    const campaign=req.result[0];campaign.subclassActors={'ally-fiend':{classId:'warlock',subclassId:'warlock-fiend',level:10,charismaModifier:3,luckRemaining:2,fiendResistance:'Fire'}};store.put(campaign);
   };tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });db.close();
 });
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 const actors=page.getByLabel('Registered subclass combat actors');
 await expect(actors).toContainText('ally-fiend');
 await expect(actors).toContainText('Dark One’s Own Luck 2 remaining');
 await expect(actors).toContainText('Fiendish Resilience: Fire');
 await expect(actors).toContainText('Separate from Nighthawk combat');
});

test('player registers and manages a Fiend actor without modifying Nighthawk',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Fiend manager browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('companion-fiend');
 await manager.getByLabel('New subclass',{exact:true}).selectOption('warlock-fiend');
 await manager.getByLabel('New actor level').fill('10');
 await manager.getByLabel('New actor Charisma modifier').fill('3');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const actor=page.getByLabel('Manage actor companion-fiend');
 await expect(actor).toContainText('Dark One’s Own Luck: 3 remaining');
 await actor.getByLabel('Luck d10 companion-fiend').fill('7');
 await actor.getByRole('button',{name:'Spend Dark One’s Own Luck'}).click();
 await expect(actor).toContainText('Dark One’s Own Luck: 2 remaining');
 await actor.getByLabel('Fiend resistance companion-fiend').selectOption('Cold');
 await actor.getByRole('button',{name:'Save resistance'}).click();
 await expect(page.getByLabel('Registered subclass combat actors')).toContainText('Fiendish Resilience: Cold');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 const saved=page.getByLabel('Manage actor companion-fiend');
 await expect(saved).toContainText('Dark One’s Own Luck: 2 remaining');
 await saved.getByRole('button',{name:'Short Rest'}).click();
 await expect(saved).toContainText('Dark One’s Own Luck: 2 remaining');
 await saved.getByRole('button',{name:'Long Rest'}).click();
 await expect(saved).toContainText('Dark One’s Own Luck: 3 remaining');
 await navigate(page,'Player');
 await expect(page.getByRole('heading',{name:'Player Character'})).toBeVisible();
});
test('Druid terrain changes only on Long Rest and persists',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Land manager browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('companion-druid');
 await manager.getByLabel('New subclass',{exact:true}).selectOption('druid-land');
 await manager.getByLabel('New actor level').fill('10');
 await manager.getByLabel('New actor terrain').selectOption('arid');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const actor=page.getByLabel('Manage actor companion-druid');
 await actor.getByLabel('Rest terrain companion-druid').selectOption('polar');
 await actor.getByRole('button',{name:'Short Rest'}).click();
 await expect(page.getByLabel('Registered subclass combat actors')).toContainText('Land terrain: arid');
 await actor.getByRole('button',{name:'Long Rest'}).click();
 await expect(page.getByLabel('Registered subclass combat actors')).toContainText('Land terrain: polar');
});

test('companion encounter initiative, turn, resistance and persistence stay isolated from Nighthawk',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Companion encounter browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByLabel('New subclass',{exact:true}).selectOption('paladin-devotion');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 await manager.getByLabel('New subclass actor ID').fill('druid');
 await manager.getByLabel('New subclass',{exact:true}).selectOption('druid-land');
 await manager.getByLabel('New actor level').fill('10');
 await manager.getByLabel('New actor terrain').selectOption('polar');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Initiative paladin').fill('17');
 await panel.getByLabel('Initiative druid').fill('12');
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await expect(panel).toContainText('Active turn: paladin');
 await panel.getByLabel('Companion target',{exact:true}).selectOption('druid');
 await panel.getByLabel('Companion damage',{exact:true}).fill('11');
 await panel.getByLabel('Companion damage type').selectOption('Cold');
 await panel.getByRole('button',{name:'Apply damage'}).click();
 await expect(panel).toContainText('druid: 15/20 HP');
 await panel.getByRole('button',{name:'End companion turn'}).click();
 await expect(panel).toContainText('Active turn: druid');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('Active turn: druid');
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('druid: 15/20 HP');
 await navigate(page,'Player');
 await expect(page.getByRole('heading',{name:'Player Character'})).toBeVisible();
});

test('companion attack consumes action and movement budget persists across reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Companion attacks browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 for(const [id,subclass] of [['paladin','paladin-devotion'],['fiend','warlock-fiend']] as const){
  await manager.getByLabel('New subclass actor ID').fill(id);
  await manager.getByLabel('New subclass',{exact:true}).selectOption(subclass);
  await manager.getByRole('button',{name:'Register subclass actor'}).click();
 }
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Initiative paladin').fill('18');
 await panel.getByLabel('Initiative fiend').fill('12');
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Move Y').fill('2');
 await panel.getByRole('button',{name:'Move active actor'}).click();
 await expect(panel).toContainText('movement 20/30 ft');
 await panel.getByLabel('Companion target',{exact:true}).selectOption('fiend');
 await panel.getByLabel('Companion attack range').fill('30');
 await panel.getByLabel('Companion attack d20').fill('15');
 await panel.getByLabel('Companion attack modifier').fill('3');
 await panel.getByLabel('Companion target AC').fill('14');
 await panel.getByLabel('Companion damage',{exact:true}).fill('8');
 await panel.getByLabel('Companion damage modifier').fill('2');
 await panel.getByRole('button',{name:'Attack with action'}).click();
 await expect(panel).toContainText('fiend: 10/20 HP');
 await expect(panel.getByRole('button',{name:'Attack with action'})).toBeDisabled();
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('fiend: 10/20 HP');
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('movement 20/30 ft');
});

test('companion grid Dash and attack range checks persist after reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Companion Dash browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Companion action choice').selectOption('Dash');
 await panel.getByRole('button',{name:'Use companion action'}).click();
 await expect(panel).toContainText('movement 60/60 ft');
 await expect(panel).toContainText('action used');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('movement 60/60 ft');
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('action used');
});

test('companion obstacles block attacks and persist across reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Companion obstacles browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 for(const id of ['paladin','fiend']){
  await manager.getByLabel('New subclass actor ID').fill(id);
  await manager.getByRole('button',{name:'Register subclass actor'}).click();
 }
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Initiative paladin').fill('18');
 await panel.getByLabel('Initiative fiend').fill('12');
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Obstacle X').fill('1');
 await panel.getByLabel('Obstacle Y').fill('0');
 await panel.getByRole('button',{name:'Add obstacle'}).click();
 await expect(panel.getByLabel('Companion obstacles',{exact:true})).toContainText('(1,0)');
 await panel.getByLabel('Companion target',{exact:true}).selectOption('fiend');
 await panel.getByLabel('Companion attack range').fill('30');
 await panel.getByLabel('Companion attack d20').fill('20');
 await panel.getByRole('button',{name:'Attack with action'}).click();
 await expect(panel.getByRole('status')).toContainText('Line of sight blocked');
 await expect(panel).toContainText('fiend: 20/20 HP');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Companion obstacles',{exact:true})).toContainText('(1,0)');
});

test('companion cover annotations persist and keep Nighthawk separate',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Companion cover browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Cover X').fill('3');
 await panel.getByLabel('Cover Y').fill('3');
 await panel.getByRole('button',{name:'Mark partial cover'}).click();
 await expect(panel.getByLabel('Companion cover',{exact:true})).toContainText('(3,3)');
 await expect(panel.getByLabel('Unified party readiness')).toContainText('Nighthawk remains in separate prototype combat');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Companion cover',{exact:true})).toContainText('(3,3)');
});

test('companion mobile quick movement spends five feet and respects arena bounds',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Quick movement browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByRole('button',{name:'Move East'}).click();
 await expect(panel).toContainText('paladin: 20/20 HP · (1,0)');
 await expect(panel).toContainText('movement 25/30 ft');
 await panel.getByRole('button',{name:'Move North'}).click();
 await expect(panel.getByRole('status')).toContainText('outside 20×20 arena');
});

test('opt-in unified Nighthawk encounter shares initiative and survives reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Unified party browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Include Nighthawk in unified encounter').check();
 await panel.getByLabel('Initiative nighthawk').fill('20');
 await panel.getByLabel('Initiative paladin').fill('10');
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await expect(panel).toContainText('Active turn: nighthawk');
 await expect(panel).toContainText('nighthawk: 10/10 HP');
 await panel.getByRole('button',{name:'Move South'}).click();
 await expect(panel).toContainText('nighthawk: 10/10 HP · (0,3)');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('Active turn: nighthawk');
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('nighthawk: 10/10 HP · (0,3)');
});

test('unified reaction and explicit Nighthawk HP sync persist after reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Unified HP sync browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Include Nighthawk in unified encounter').check();
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Companion reaction note').fill('DM opportunity attack');
 await panel.getByRole('button',{name:'Record reaction'}).click();
 await expect(panel.getByLabel('Reaction status')).toContainText('used');
 await panel.getByRole('button',{name:'Sync Nighthawk HP to sheet'}).click();
 await expect(panel.getByRole('status')).toContainText('Nighthawk HP synchronized');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Reaction status')).toContainText('used');
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('Nighthawk HP synchronized to character sheet');
});

test('unified actor resources and derived statistics persist in browser',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Unified resource browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Include Nighthawk in unified encounter').check();
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await expect(panel.getByLabel('Nighthawk derived combat statistics')).toContainText('AC 14');
 await panel.getByLabel('Concentration spell').fill('Bless');
 await panel.getByRole('button',{name:'Start concentration'}).click();
 await panel.getByLabel('Consumable name').fill('Potion');
 await panel.getByLabel('Consumable quantity').fill('2');
 await panel.getByRole('button',{name:'Set inventory'}).click();
 await panel.getByRole('button',{name:'Spend item'}).click();
 await expect(panel.getByLabel('Consumable status')).toContainText('Potion: 1');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Concentration status')).toContainText('Bless');
 await expect(page.getByLabel('Consumable status')).toContainText('Potion: 1');
});

test('manual concentration save resolution records success and failure',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Concentration save browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Concentration spell').fill('Bless');
 await panel.getByRole('button',{name:'Start concentration'}).click();
 await panel.getByLabel('Concentration damage').fill('22');
 await panel.getByLabel('Constitution save total').fill('10');
 await panel.getByRole('button',{name:'Resolve concentration save'}).click();
 await expect(panel.getByLabel('Concentration status')).toContainText('Not concentrating');
 await expect(panel).toContainText('concentration save 10 vs DC 11 failed');
});

test('DM-verified opportunity reaction consumes only the attacker reaction',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Opportunity browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 await manager.getByLabel('New subclass actor ID').fill('fiend');
 await manager.getByLabel('New subclass',{exact:true}).selectOption('warlock-fiend');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Opportunity attacker').selectOption('paladin');
 await panel.getByLabel('Opportunity d20').fill('20');
 await panel.getByRole('button',{name:'Resolve DM-verified opportunity'}).click();
 await expect(panel).toContainText('opportunity attack vs fiend: hit');
});

test('unified campaign ammunition spending rejects missing campaign equipment',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Ammunition browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Include Nighthawk in unified encounter').check();
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Nighthawk campaign item').selectOption('arrows');
 await panel.getByLabel('Campaign item quantity').fill('1');
 await panel.getByRole('button',{name:'Spend campaign inventory'}).click();
 await expect(panel.getByRole('status')).toContainText('Insufficient campaign equipment');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Nighthawk campaign inventory')).toContainText('unknown arrows');
});

test('DM condition and actor faction controls persist in encounter',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Condition browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Expanded encounter condition').selectOption('Prone');
 await panel.getByRole('button',{name:'Apply DM condition'}).click();
 await expect(panel).toContainText('Prone');
 await panel.getByLabel('Actor faction').fill('allies');
 await panel.getByLabel('Actor melee reach').fill('10');
 await panel.getByRole('button',{name:'Set actor tactics'}).click();
 await expect(panel).toContainText('Configured: allies · 10 ft reach');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('Configured: allies · 10 ft reach');
});

test('enemy actor with DM-supplied combat statistics persists after reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Enemy actor browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('goblin1');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await expect(panel.getByRole('status')).toContainText('Enemy added');
 await expect(panel).toContainText('goblin1');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('goblin1');
});

test('prone standing consumes movement and persists across reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Prone lifecycle browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Expanded encounter condition').selectOption('Prone');
 await panel.getByRole('button',{name:'Apply DM condition'}).click();
 await expect(panel.getByRole('button',{name:'Stand from prone'})).toBeVisible();
 await panel.getByRole('button',{name:'Stand from prone'}).click();
 await expect(panel).toContainText('movement 15/30 ft');
 await expect(panel.getByRole('button',{name:'Stand from prone'})).toHaveCount(0);
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('movement 15/30 ft');
});

test('enemy damage profile and healing controls persist in encounter UI',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Enemy damage and healing browser');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('goblin1');
 await panel.getByLabel('Enemy damage modifier').fill('3');
 await panel.getByLabel('Enemy damage dice').fill('1d6 slashing');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await expect(panel.getByRole('status')).toContainText('Enemy added');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('goblin1');
 await expect(page.getByLabel('Enemy damage modifier')).toBeVisible();
 await expect(page.getByRole('button',{name:'Heal encounter target'})).toBeVisible();
});

test('enemy tactic selection persists through reload without autonomous attacks',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Persistent enemy tactics');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('goblin1');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await panel.getByRole('button',{name:'End companion turn'}).click();
 await expect(panel.getByLabel('Active enemy tactic')).toBeVisible();
 await panel.getByLabel('Active enemy tactic').selectOption('nearest');
 await expect(panel.getByLabel('Enemy tactic preview')).toContainText('nearest');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Active enemy tactic')).toHaveValue('nearest');
 await expect(page.getByLabel('Enemy tactic preview')).toContainText('nearest');
});

test('DM-approved enemy movement turn persists across campaign reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Enemy movement persistence');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('goblin1');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await panel.getByRole('button',{name:'End companion turn'}).click();
 await panel.getByLabel('Active enemy tactic').selectOption('nearest');
 await panel.getByRole('button',{name:'Execute configured enemy movement'}).click();
 await expect(panel).toContainText('Active turn:');
 await expect(panel).toContainText('goblin1: 12/12 HP · (1,1)');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('goblin1: 12/12 HP · (1,1)');
});

test('DM-rolled enemy move and attack resolves and persists after reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Enemy attack persistence');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Include Nighthawk in unified encounter').check();
 await panel.getByLabel('Initiative nighthawk').fill('20');
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('goblin1');
 await panel.getByLabel('Enemy X').fill('1');
 await panel.getByLabel('Enemy Y').fill('2');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await panel.getByRole('button',{name:'End companion turn'}).click();
 await panel.getByLabel('Active enemy tactic').selectOption('nearest');
 await panel.getByLabel('Companion attack d20').fill('18');
 await panel.getByRole('button',{name:'Execute enemy move and attack'}).click();
 await expect(panel).toContainText('Active turn: paladin');
 await expect(panel).toContainText('nighthawk: 5/10 HP');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('nighthawk: 5/10 HP');
});

test('mobile tactical grid selects a square and persists movement after reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Tactical grid persistence');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByRole('button',{name:'Toggle tactical grid'}).click();
 await expect(panel.getByLabel('Tactical grid',{exact:true})).toBeVisible();
 await panel.getByRole('button',{name:'Grid square 1,0'}).click();
 await panel.getByRole('button',{name:'Confirm grid move'}).click();
 await expect(panel).toContainText('paladin: 20/20 HP · (1,0)');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('paladin: 20/20 HP · (1,0)');
});

test('DM-configured ranged enemy attack persists verified HP and range after reload',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Ranged enemy persistence');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByLabel('Include Nighthawk in unified encounter').check();
 await panel.getByLabel('Initiative nighthawk').fill('20');
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('archer1');
 await panel.getByLabel('Enemy X').fill('6');
 await panel.getByLabel('Enemy Y').fill('2');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await panel.getByRole('button',{name:'End companion turn'}).click();
 await panel.getByLabel('Enemy ranged reach').fill('60');
 await panel.getByRole('button',{name:'Configure ranged profile'}).click();
 await panel.getByLabel('Companion target',{exact:true}).selectOption('nighthawk');
 await panel.getByLabel('Companion attack d20').fill('18');
 await panel.getByRole('button',{name:'Ranged attack and end turn'}).click();
 await expect(panel).toContainText('nighthawk: 5/10 HP');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('nighthawk: 5/10 HP');
});

test('mobile tactical preview shows movement cost and selects enemy target without moving',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Tactical targeting preview');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('goblin1');
 await panel.getByLabel('Enemy X').fill('2');
 await panel.getByLabel('Enemy Y').fill('1');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await panel.getByRole('button',{name:'Toggle tactical grid'}).click();
 await panel.getByRole('button',{name:'Grid square 1,0'}).click();
 await expect(panel.getByLabel('Movement path preview')).toContainText('Cost: 5 ft');
 await expect(panel.getByLabel('Movement path preview')).toContainText('After move: 25 ft');
 await expect(panel.getByLabel('Tactical turn status')).toContainText('Action: ready');
 await panel.getByRole('button',{name:/Grid square 2,1 occupied by goblin1/}).click();
 await expect(panel.getByLabel('Grid selected target')).toContainText('Target: goblin1');
 await expect(panel.getByLabel('Companion target',{exact:true})).toHaveValue('goblin1');
 await expect(panel).toContainText('paladin: 20/20 HP · (0,0)');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByRole('region',{name:'Companion encounter',exact:true})).toContainText('goblin1: 12/12 HP · (2,1)');
});

test('tactical path preview identifies reach-exit opportunity threats before committing movement',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Reach exit preview');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 const panel=page.getByRole('region',{name:'Companion encounter',exact:true});
 await panel.getByRole('button',{name:'Start companion encounter'}).click();
 await panel.getByLabel('Enemy ID').fill('goblin1');
 await panel.getByLabel('Enemy X').fill('1');
 await panel.getByLabel('Enemy Y').fill('0');
 await panel.getByRole('button',{name:'Add enemy actor'}).click();
 await panel.getByRole('button',{name:'Toggle tactical grid'}).click();
 await panel.getByRole('button',{name:'Grid square 0,3'}).click();
 await expect(panel.getByLabel('Movement path preview')).toContainText('Opportunity threats: goblin1');
 await expect(panel.getByLabel('Movement path preview')).toContainText('Reach exit:');
 await expect(panel).toContainText('paladin: 20/20 HP · (0,0)');
});

test('frontier adventure travels, records interactions and resumes from campaign save',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Frontier session persistence');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const session=page.getByLabel('Adventure session',{exact:true});
 await session.getByRole('button',{name:'Start frontier adventure'}).click();
 await expect(session.getByLabel('Adventure session status')).toContainText('exploring');
 await session.getByRole('button',{name:'Speak with the watchkeeper'}).click();
 await expect(session.getByLabel('Adventure narrative history')).toContainText('watchkeeper reports travelers');
 await session.getByRole('button',{name:'Travel to Old Crossroads'}).click();
 await session.getByRole('button',{name:'Travel to Old Watchtower'}).click();
 await expect(session).toContainText('Visited 3/3 locations');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Adventure session',{exact:true})).toContainText('Old Watchtower');
 await expect(page.getByLabel('Adventure narrative history')).toContainText('watchkeeper reports travelers');
});
test('frontier encounter handoff uses registered companion and resumes after completed encounter',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Linked adventure encounter');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const manager=page.getByLabel('Subclass actor manager');
 await manager.getByLabel('New subclass actor ID').fill('paladin');
 await manager.getByRole('button',{name:'Register subclass actor'}).click();
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const session=page.getByLabel('Adventure session',{exact:true});
 await session.getByRole('button',{name:'Start frontier adventure'}).click();
 await session.getByRole('button',{name:'Travel to Old Crossroads'}).click();
 await session.getByRole('button',{name:'Travel to Old Watchtower'}).click();
 await session.getByLabel('Adventure companion',{exact:true}).selectOption('paladin');
 await session.getByLabel('Adventure Nighthawk initiative').fill('20');
 await session.getByLabel('Adventure companion initiative').fill('10');
 await session.getByLabel('Adventure companion HP').fill('20');
 await session.getByRole('button',{name:'Enter linked encounter'}).click();
 await expect(session.getByLabel('Adventure session status')).toContainText('encounter');
 await expect(session.getByLabel('Companion encounter')).toContainText('nighthawk: 10/10 HP');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 const restored=page.getByLabel('Adventure session',{exact:true});
 await expect(restored.getByLabel('Companion encounter')).toContainText('paladin: 20/20 HP');
 await restored.getByRole('button',{name:'Finish companion encounter'}).click();
 await restored.getByRole('button',{name:'Resume exploration after encounter'}).click();
 await expect(restored.getByLabel('Adventure session status')).toContainText('exploring');
 await expect(restored).toContainText('Old Watchtower');
});

test('validated character draft becomes a persistent campaign without replacing legacy Nighthawk',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const draft={schemaVersion:1,id:'valid-rogue-draft',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'review',
   identity:{name:'Raven',pronouns:'they/them',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{speciesId:'elf',lineageId:'wood-elf',backgroundId:'criminal',classId:'rogue',toolReplacement:'Herbalism Kit',
    classChoices:{'class-skills':['Perception','Acrobatics','Investigation','Deception'],expertise:['Perception','Acrobatics'],'weapon-mastery':['Dagger','Shortbow']},
    abilities:{method:'standard',base:{Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Dex:2,Int:1},rolls:[],rollDice:[]},
    equipment:{classPackage:0,backgroundPackage:0,purchases:{},equipped:{weapons:[]}}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([draft]));
 });
 await page.reload();
 await page.getByRole('button',{name:'New Adventure'}).click();
 await page.getByLabel('Starting character').selectOption('valid-rogue-draft');
 await page.getByLabel('Campaign name').fill('Raven Campaign');
 await page.getByRole('button',{name:'Create campaign'}).click();
 await openDevelopment(page);
 await page.getByLabel('Adventure session',{exact:true}).getByRole('button',{name:'Start frontier adventure'}).click();
 await expect(page.getByLabel('Adventure session status')).toContainText('Raven');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await openDevelopment(page);
 await expect(page.getByLabel('Adventure session status')).toContainText('Raven');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Legacy Nighthawk');
 await openDevelopment(page);
 await expect(page.getByLabel('Adventure session',{exact:true})).not.toContainText('Raven');
});

test('adventure DM request carries authoritative location and interaction context without legacy auto-combat',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.reload();
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'DM scene integration');
 await navigate(page,'Adventure');
 await openDevelopment(page);
 const session=page.getByLabel('Adventure session',{exact:true});
 await session.getByRole('button',{name:'Start frontier adventure'}).click();
 await session.getByRole('button',{name:'Speak with the watchkeeper'}).click();
 await session.getByRole('button',{name:'Travel to Old Crossroads'}).click();
 let request:Record<string,any>|undefined;
 await page.route('**/api/dm',async route=>{
  request=route.request().postDataJSON();
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The crossroads remain quiet.',combatStart:{enemyName:'Unverified enemy'},newFacts:[],worldUpdates:{}})});
 });
 await navigate(page,'Adventure');
 await page.getByLabel('Message the Dungeon Master').fill('What can I see from the crossroads?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The crossroads remain quiet.');
 expect(request?.gameState?.adventureSession?.site).toBe('crossroads');
 expect(request?.gameState?.adventureSession?.interactions?.[0]?.choice).toBe('speak-watchkeeper');
 expect(request?.gameState?.location).toBe('Old Crossroads');
 await expect(page.getByRole('button',{name:'Roll initiative (d20 + DEX)'})).toHaveCount(0);
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The crossroads remain quiet.');
});

test('AI combat proposal for imported character persists and enters verified combat without a prototype campaign',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const draft={schemaVersion:1,id:'organic-rogue',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:true},step:'review',
   identity:{name:'Raven',pronouns:'they/them',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{speciesId:'elf',lineageId:'wood-elf',backgroundId:'criminal',classId:'rogue',toolReplacement:'Herbalism Kit',
    classChoices:{'class-skills':['Perception','Acrobatics','Investigation','Deception'],expertise:['Perception','Acrobatics'],'weapon-mastery':['Dagger','Shortbow']},
    abilities:{method:'standard',base:{Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Dex:2,Int:1},rolls:[],rollDice:[]},
    equipment:{classPackage:0,backgroundPackage:0,purchases:{},equipped:{weapons:[]}}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([draft]));
  localStorage.setItem('four-keeps-access-code','browser-test-code');
  localStorage.setItem('four-keeps-dm-mode','on');
 });
 await page.reload();
 await page.getByRole('button',{name:'New Adventure'}).click();
 await page.getByLabel('Starting character').selectOption('organic-rogue');
 await page.getByLabel('Campaign name').fill('Raven Road');
 await page.getByRole('button',{name:'Create campaign'}).click();
 await page.route('**/api/dm',async route=>await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'A road bandit blocks your path.',combatStart:{enemyName:'Road bandit'},newFacts:[],worldUpdates:{}})}));
 await page.getByRole('button',{name:'Begin AI-led adventure'}).click();
 await page.getByLabel('Message the Dungeon Master').fill('I approach the road cautiously.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Opponent: Road bandit',{exact:false})).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByText('Opponent: Road bandit',{exact:false})).toBeVisible();
 const setup=page.getByLabel('Quick adventure encounter');
 await expect(setup).toHaveCount(1);
 await page.getByLabel('Quick player initiative').fill('18');
 await page.getByLabel('Quick enemy initiative').fill('12');
 await page.getByLabel('Quick enemy hp').fill('11');
 await page.getByLabel('Quick enemy ac').fill('12');
 await page.getByLabel('Quick enemy attack bonus').fill('3');
 await page.getByLabel('Quick enemy damage bonus').fill('1');
 await page.getByLabel('Quick enemy damage dice').fill('1d6');
 await page.getByRole('checkbox',{name:/DM confirms this encounter/i}).check();
 await page.getByRole('button',{name:'Start verified encounter'}).click();
 await expect(page.getByLabel('Adventure session status')).toContainText('encounter');
 await expect(page.getByLabel('Adventure session status')).toContainText('Raven');
 await page.reload();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Adventure session status')).toContainText('encounter');
 await expect(page.getByText('Road bandit',{exact:false}).first()).toBeVisible();
});

test('development utilities are isolated from the normal Adventure and Player tabs',async({page})=>{
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 await createLegacyCampaign(page,'Development isolation');
 await navigate(page,'Adventure');
 await expect(page.getByRole('button',{name:'Start encounter training'})).toHaveCount(0);
 await expect(page.getByLabel('Adventure session',{exact:true})).toHaveCount(0);
 await navigate(page,'Player');
 await expect(page.getByLabel('Subclass actor manager')).toHaveCount(0);
 await expect(page.getByLabel('Companion encounter setup')).toHaveCount(0);
 await expect(page.getByText('Development: XP and level-up testing')).toHaveCount(0);
 await openDevelopment(page);
 await expect(page.getByRole('button',{name:'Start encounter training'})).toBeVisible();
 await expect(page.getByLabel('Adventure session',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Subclass actor manager')).toBeVisible();
 await expect(page.getByText('Development: XP and level-up testing')).toBeVisible();
});

test('mobile hamburger navigation preserves five destinations and collapsed development settings',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/four-keeps/');
 await navigate(page,'Settings');
 const menu=page.getByRole('button',{name:'Open navigation menu'});
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('navigation',{name:'Primary navigation'})).toHaveCount(0);
 await menu.click();
 const nav=page.getByRole('navigation',{name:'Primary navigation'});
 await expect(nav.getByRole('button')).toHaveCount(7);
 await expect(nav.getByRole('button',{name:'Home',exact:true})).toBeVisible();
 await expect(page.locator('header > div').first().getByRole('button',{name:'Home',exact:true})).toHaveCount(0);
 await expect(nav.getByRole('button').last()).toContainText('Developer');
 await expect(nav.getByRole('button',{name:'Settings'})).toHaveAttribute('aria-current','page');
 await nav.getByRole('button',{name:'Journal'}).click();
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('navigation',{name:'Primary navigation'})).toHaveCount(0);
 await navigate(page,'Settings');
 const panel=page.getByLabel('Development section');
 await expect(panel.getByLabel('Legacy campaign creation')).toBeHidden();
 await panel.locator('summary').first().click();
 await expect(panel.getByLabel('Legacy campaign creation')).toBeVisible();
 const bounds=await menu.boundingBox();
 expect(bounds).not.toBeNull();
 expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(376);
});

test('Home navigation is inside the hamburger menu, not beside it',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/four-keeps/');
 await createLegacyCampaign(page,'Menu Home Test');
 const menu=page.getByRole('button',{name:'Open navigation menu'});
 await expect(page.getByRole('banner').getByRole('button',{name:'Home',exact:true})).toHaveCount(0);
 await menu.click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Home',exact:true}).click();
 await expect(page.getByLabel('Four Keeps landing page')).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue Adventure'})).toBeVisible();
});

test('custom background editor prevents duplicate class skills and persists choices',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{
   schemaVersion:1,id:'custom-overlap-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},
   step:'origins',identity:{name:'Scout',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{classId:'rogue',classChoices:{'class-skills':['Stealth','Insight','Perception','Acrobatics']},speciesId:'elf',lineageId:'wood-elf'},
   createdAt:now,updatedAt:now
  }]));
 });
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Scout.*Resume draft/}).click();
 await page.getByRole('button',{name:'Create custom background (2024 DMG)'}).click();
 const editor=page.getByRole('group',{name:'Custom background'});
 await editor.getByLabel('Custom background name').fill('Frontier Scout');
 for(const ability of ['Dex','Wis','Con'])await editor.getByRole('checkbox',{name:ability}).check();
 await expect(editor.getByRole('checkbox',{name:/Stealth/})).toBeDisabled();
 for(const skill of ['Survival','Arcana'])await editor.getByRole('checkbox',{name:skill}).check();
 await editor.getByLabel('Custom Origin feat').selectOption('Alert');
 await editor.getByLabel('Custom background tool').selectOption('Cartographer’s Tools');
 await expect(page.getByLabel('Overlapping skill proficiency replacements')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue to equipment'})).toBeDisabled();
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Scout.*Resume draft/}).click();
 await expect(page.getByLabel('Custom background name')).toHaveValue('Frontier Scout');
 await expect(page.getByRole('group',{name:'Custom background'}).getByRole('checkbox',{name:/Arcana/})).toBeChecked();
});

test('characters can be deleted with confirmation without deleting an adventure',async({page})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:'Create character'}).click();
 await page.getByRole('button',{name:'All characters'}).click();
 const row=page.getByRole('button',{name:/Unnamed character.*Resume draft/});
 await expect(row).toBeVisible();
 await page.getByRole('button',{name:'Delete character'}).click();
 await expect(page.getByRole('group',{name:'Confirm character deletion'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel'}).click();
 await expect(row).toBeVisible();
 await page.getByRole('button',{name:'Delete character'}).click();
 await page.getByRole('button',{name:'Confirm delete character'}).click();
 await expect(row).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();
 await expect(row).toHaveCount(0);
});
test('saved adventures can be deleted directly from My Campaigns',async({page})=>{
 await page.goto('/four-keeps/');
 await createLegacyCampaign(page,'Delete from list test');
 await page.getByRole('button',{name:'Open navigation menu'}).click();await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Home'}).click();
 await page.getByRole('button',{name:'My Campaigns'}).click();
 await expect(page.getByRole('button',{name:'Delete adventure Delete from list test'})).toBeVisible();
 await page.getByRole('button',{name:'Delete adventure Delete from list test'}).click();
 await expect(page.getByRole('group',{name:'Confirm adventure deletion'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel'}).click();
 await expect(page.getByText('Delete from list test')).toBeVisible();
 await page.getByRole('button',{name:'Delete adventure Delete from list test'}).click();
 await page.getByRole('button',{name:'Confirm delete adventure'}).click();
 await expect(page.getByText('Delete from list test')).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'My Campaigns'}).click();
 await expect(page.getByText('Delete from list test')).toHaveCount(0);
});

test('origin details appear immediately below selected row and navigation resets scroll',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{
   schemaVersion:1,id:'inline-origin-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},
   step:'origins',identity:{name:'Inline Test',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{classId:'rogue',classChoices:{'class-skills':['Stealth','Insight','Perception','Acrobatics']}},
   createdAt:now,updatedAt:now
  }]));
 });
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Inline Test.*Resume draft/}).click();
 await page.getByRole('button',{name:/Criminal.*Player.s Handbook/}).click();
 const background=page.getByRole('button',{name:/Criminal.*Player.s Handbook/});
 const details=page.getByText('Skills: Sleight of Hand, Stealth').first();
 await expect(details).toBeVisible();
 const next=page.getByRole('button',{name:/Entertainer.*Player.s Handbook/});
 const bgBox=await background.boundingBox(),detailBox=await details.boundingBox(),nextBox=await next.boundingBox();
 expect(bgBox&&detailBox&&nextBox).toBeTruthy();
 expect(detailBox!.y).toBeGreaterThan(bgBox!.y);
 expect(detailBox!.y).toBeLessThan(nextBox!.y);
 await expect(page.getByText(/Stealth — already proficient; choose a replacement below/)).toBeVisible();
 await page.getByLabel('Replacement for Stealth').selectOption('Arcana');
 await page.getByRole('button',{name:/Elf.*Player.s Handbook/}).click();
 await expect(page.getByText(/Fey ancestry and magical lineages.*Speed 30 ft/)).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await page.getByRole('button',{name:'1. Class'}).click();
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeLessThan(50);
});

test('custom background button opens its editor directly below the button',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{
   schemaVersion:1,id:'custom-inline-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},
   step:'origins',identity:{name:'Custom Test',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{classId:'rogue',classChoices:{'class-skills':['Stealth','Insight','Perception','Acrobatics']}},
   createdAt:now,updatedAt:now
  }]));
 });
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Custom Test.*Resume draft/}).click();
 const button=page.getByRole('button',{name:'Create custom background (2024 DMG)'});
 await button.click();
 await expect(button).toHaveAttribute('aria-pressed','true');
 const editor=page.getByRole('group',{name:'Custom background'});
 await expect(editor).toBeVisible();
 const firstStandard=page.getByRole('button',{name:/Acolyte.*Player.s Handbook/});
 const b=await button.boundingBox(),e=await editor.boundingBox(),a=await firstStandard.boundingBox();
 expect(b&&e&&a).toBeTruthy();
 expect(e!.y).toBeGreaterThan(b!.y);
 expect(e!.y).toBeLessThan(a!.y);
 await page.getByRole('textbox',{name:'Custom background name'}).fill('My Custom Origin');
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Custom Test.*Resume draft/}).click();
 await expect(page.getByRole('textbox',{name:'Custom background name'})).toHaveValue('My Custom Origin');
});

test('mobile text inputs stay at least 16px to prevent iPhone focus zoom',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{
   schemaVersion:1,id:'zoom-regression-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},
   step:'origins',identity:{name:'Zoom Test',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{classId:'rogue',classChoices:{'class-skills':['Stealth','Insight','Perception','Acrobatics']}},
   createdAt:now,updatedAt:now
  }]));
 });
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Zoom Test.*Resume draft/}).click();
 await page.getByRole('button',{name:'Create custom background (2024 DMG)'}).click();
 const name=page.getByRole('textbox',{name:'Custom background name'});
 await expect(name).toBeVisible();
 await expect.poll(()=>name.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 await name.focus();
 await expect.poll(()=>name.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
 const editableSizes=await page.locator('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="hidden"]),textarea,select').evaluateAll(elements=>elements.map(el=>({tag:el.tagName,size:parseFloat(getComputedStyle(el).fontSize)})));
 expect(editableSizes.length).toBeGreaterThan(0);
 expect(editableSizes.filter(item=>item.size<16)).toEqual([]);
});

test('species precedes background, custom skills lock existing proficiencies and feats explain effects',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{
   schemaVersion:1,id:'species-before-background-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},
   step:'origins',identity:{name:'Species Test',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{classId:'rogue',classChoices:{'class-skills':['Stealth','Insight','Perception','Acrobatics']}},
   createdAt:now,updatedAt:now
  }]));
 });
 await page.reload();
 await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Species Test.*Resume draft/}).click();
 const species=page.getByRole('heading',{name:'Species',exact:true});
 const background=page.getByRole('heading',{name:'Background',exact:true});
 expect((await species.boundingBox())!.y).toBeLessThan((await background.boundingBox())!.y);
 await page.getByRole('button',{name:/Elf.*Player.s Handbook/}).click();
 const speciesSkill=page.getByLabel('Species skill proficiency');
 await expect(speciesSkill.locator('option[value="Insight"]')).toBeDisabled();
 await expect(speciesSkill.locator('option[value="Perception"]')).toBeDisabled();
 await speciesSkill.selectOption('Survival');
 await page.getByRole('button',{name:'Create custom background (2024 DMG)'}).click();
 const editor=page.getByRole('group',{name:'Custom background'});
 await expect(editor.getByText('Already proficient (Class)').first()).toBeVisible();
 await expect(editor.getByText('Already proficient (Species)')).toBeVisible();
 const stealth=editor.getByRole('checkbox',{name:/Stealth/});
 await expect(stealth).toBeChecked();
 await expect(stealth).toBeDisabled();
 const survival=editor.getByRole('checkbox',{name:/Survival/});
 await expect(survival).toBeChecked();
 await expect(survival).toBeDisabled();
 await editor.getByLabel('Custom Origin feat').selectOption('Lucky');
 await expect(editor.getByText(/Luck Points equal to your Proficiency Bonus/)).toBeVisible();
 await page.getByRole('button',{name:/Acolyte.*Player.s Handbook/}).click();
 await expect(page.getByText(/Choose two Cleric cantrips and one level-one Cleric spell/).first()).toBeVisible();
});

test('redesigned creator shows expanded sticky live summary and groups custom skills',async({page})=>{
 await page.goto('/four-keeps/');
 await page.evaluate(()=>{
  const now=new Date().toISOString();
  localStorage.setItem('four-keeps-character-drafts-v1',JSON.stringify([{
   schemaVersion:1,id:'builder-summary-test',status:'draft',rules:{edition:'2024',allowCompatibleLegacy:false},
   step:'abilities',identity:{name:'Relic Hunter',pronouns:'',appearance:'',personality:'',backstory:'',portrait:null},
   selections:{classId:'rogue',classChoices:{'class-skills':['Stealth','Investigation','Perception','Sleight of Hand']}},
   createdAt:now,updatedAt:now
  }]));
 });
 await page.reload();await page.getByRole('button',{name:'My Characters'}).click();
 await page.getByRole('button',{name:/Relic Hunter.*Resume draft/}).click();
 const creator=page.getByLabel('Character creator',{exact:true});
 const nav=creator.getByRole('navigation',{name:'Character creation steps'});
 await expect(nav.getByRole('button').nth(1)).toContainText('Abilities');
 await expect(nav.getByRole('button').nth(2)).toContainText('Origins');
 const summary=creator.getByLabel('Live character summary');
 await expect(summary.getByRole('button',{name:/Relic Hunter.*Collapse/})).toHaveAttribute('aria-expanded','true');
 await expect(summary).toHaveCSS('position','sticky');
 for(const [ability,score] of Object.entries({Str:8,Dex:15,Con:14,Int:13,Wis:12,Cha:10}))await creator.getByLabel(ability+' base score',{exact:true}).selectOption(String(score));
 await expect(summary.getByText('15',{exact:true})).toBeVisible();
 await creator.getByRole('button',{name:'Continue to origins'}).click();
 await creator.getByRole('button',{name:/^Elf/}).click();
 await creator.getByRole('radio',{name:/^Wood Elf/}).check();
 await creator.getByRole('button',{name:'Create custom background (2024 DMG)'}).click();
 const editor=creator.getByRole('group',{name:'Custom background'});
 await expect(editor.getByText('Choose 3 abilities eligible for background bonuses')).toBeVisible();
 const group=editor.getByRole('group',{name:'Dexterity'});
 await expect(group.getByRole('checkbox',{name:/Stealth/})).toBeChecked();
 await expect(group.getByRole('checkbox',{name:/Stealth/})).toBeDisabled();
 await expect(group.getByRole('checkbox',{name:/Acrobatics/})).toBeEnabled();
 await summary.getByRole('button',{name:/Relic Hunter.*Collapse/}).click();
 await expect(summary.getByRole('button',{name:/Relic Hunter.*Expand/})).toHaveAttribute('aria-expanded','false');
});
