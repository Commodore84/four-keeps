import {test,expect,type Page} from '@playwright/test';
async function navigate(page:Page,tab:'Adventure'|'Player'|'Journal'|'Map'|'Settings'|'Developer'){
 const menu=page.getByRole('button',{name:'Open navigation menu'});
 await menu.waitFor({state:'visible',timeout:2500}).catch(()=>{});
 if(await menu.count()===0){if(tab==='Settings'){await page.getByRole('button',{name:'Settings',exact:true}).click();return;}throw new Error('Navigation menu is unavailable on the portal screen');}
 if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:tab,exact:true}).click();
}
async function openDevelopment(page:Page){
 await navigate(page,'Settings');
 await navigate(page,'Developer');
 const panel=page.getByLabel('Development section');
 if(!(await panel.getByLabel('Legacy campaign creation').isVisible()))await panel.locator('summary').first().click();
}

async function awardImportedTestXP(page:Page,amount:string,reason:string){
 await navigate(page,'Developer');
 const tools=page.getByLabel('Imported player development tools');
 await tools.getByLabel('Manual XP award').locator('summary').click();
 await tools.getByLabel('Award XP amount').fill(amount);
 await tools.getByLabel('Award XP reason').fill(reason);
 await tools.getByRole('button',{name:'Record XP award'}).click();
 await navigate(page,'Player');
}
const word=(s:string)=>new RegExp('^'+s+'\\b');
type ClassId='fighter'|'rogue'|'cleric'|'wizard'|'warlock';
const config={
 fighter:{skills:['Perception','Acrobatics'],choices:[['Fighting Style',['Defense']],['Weapon Masteries',['Greatsword','Flail','Javelin']]],scores:{Str:15,Dex:14,Con:13,Int:12,Wis:10,Cha:8},hp:12,weapon:'Greatsword'},
 rogue:{skills:['Perception','Acrobatics','Investigation','Deception'],choices:[['Expertise',['Perception','Acrobatics']],['Weapon Masteries',['Dagger','Shortbow']]],scores:{Str:8,Dex:15,Con:13,Int:14,Wis:12,Cha:10},hp:10,weapon:'Dagger'},
 cleric:{skills:['History','Medicine'],choices:[['Divine Order',['Protector']]],scores:{Str:10,Dex:13,Con:14,Int:12,Wis:15,Cha:8},hp:10,weapon:'Mace'},
 warlock:{skills:['Arcana','Deception'],choices:[],scores:{Str:8,Dex:14,Con:13,Int:12,Wis:10,Cha:15},hp:10,weapon:'Dagger'},
 wizard:{skills:['Arcana','History'],choices:[],scores:{Str:8,Dex:14,Con:13,Int:15,Wis:12,Cha:10},hp:8,weapon:'Quarterstaff'}
};
async function createAndImport(page:Page,id:ClassId){
 const cfg=config[id];await page.goto('/four-keeps/');await page.getByRole('button',{name:'Characters',exact:true}).click();await page.getByRole('button',{name:'Create character',exact:true}).click();
 const creator=page.getByLabel('Character creator',{exact:true});await creator.getByRole('button',{name:word(id[0].toUpperCase()+id.slice(1))}).click();
 for(const skill of cfg.skills)await creator.getByRole('group',{name:/^Class skills/}).getByRole('checkbox',{name:word(skill)}).check();
 for(const [label,choices] of cfg.choices as [string,string[]][])for(const choice of choices)await creator.getByRole('group',{name:new RegExp('^'+label)}).getByRole('checkbox',{name:word(choice)}).check();
 await creator.getByRole('button',{name:'Continue to abilities'}).click();
 for(const [ability,score] of Object.entries(cfg.scores))await creator.getByLabel(ability+' base score',{exact:true}).selectOption(String(score));
 await creator.getByRole('button',{name:'Continue to origins'}).click();
 await creator.getByRole('button',{name:/^Elf/}).click();await creator.getByRole('radio',{name:/^Wood Elf/}).check();await creator.getByRole('button',{name:id==='cleric'?/^Acolyte/:/^Criminal/}).click();if(id==='rogue')await creator.getByLabel('Replacement for tool').selectOption('Herbalism Kit');
 await creator.getByLabel(id==='cleric'?'Wis background bonus':'Dex background bonus').selectOption('2');await creator.getByLabel(id==='cleric'?'Int background bonus':'Con background bonus').selectOption('1');await creator.getByRole('button',{name:'Continue to equipment'}).click();
 await creator.getByRole('group',{name:'Class equipment',exact:true}).getByRole('radio').first().check();await creator.getByRole('group',{name:'Background equipment',exact:true}).getByRole('radio').first().check();
 const row=creator.locator('section').filter({has:page.getByRole('heading',{name:'Inventory and equipment',exact:true})}).locator('div').filter({has:page.getByText(new RegExp('^\\d+ × '+cfg.weapon+'$'))}).last();
 await row.getByRole('button',{name:'Equip',exact:true}).click();
 await creator.getByRole('button',{name:'Continue to spells'}).click();
 if(id==='cleric'){
  for(const name of ['Guidance','Light','Sacred Flame'])await creator.getByRole('checkbox',{name:word(name)}).first().check();
  for(const name of ['Bless','Cure Wounds','Guiding Bolt','Healing Word'])await creator.getByRole('checkbox',{name:word(name)}).first().check();
  for(const name of ['Resistance','Thaumaturgy'])await creator.getByRole('checkbox',{name:word(name)}).last().check();
  await creator.getByRole('radio',{name:word('Cure Wounds')}).check();await creator.getByLabel('Magic Initiate ability').selectOption('Wis');
 }
 if(id==='warlock'){for(const name of ['Eldritch Blast','Minor Illusion'])await creator.getByRole('checkbox',{name:word(name)}).first().check();for(const name of ['Hex','Armor of Agathys'])await creator.getByRole('checkbox',{name:word(name)}).first().check();await creator.getByRole('radio',{name:word('Eldritch Mind')}).check();}
 if(id==='wizard'){
  for(const name of ['Fire Bolt','Mage Hand','Minor Illusion'])await creator.getByRole('checkbox',{name:word(name)}).check();
  for(const name of ['Alarm','Burning Hands','Charm Person','Detect Magic','Find Familiar','Magic Missile'])await creator.getByRole('checkbox',{name:word(name)}).first().check();
  for(const name of ['Alarm','Burning Hands','Charm Person','Magic Missile'])await creator.getByRole('checkbox',{name:word(name)}).last().check();
 }
 await creator.getByRole('button',{name:'Continue to identity'}).click();await creator.getByLabel('name *',{exact:true}).fill(id+' Hero');await creator.getByRole('button',{name:'Continue to future levels'}).click();await creator.getByRole('button',{name:'Continue to review'}).click();await expect(creator.getByLabel('Character review')).toBeVisible();
 await page.getByRole('button',{name:/Home/}).click();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'New Adventure'}).click();const value=await page.getByLabel('Starting character').getByRole('option',{name:new RegExp(id+' Hero')}).getAttribute('value');await page.getByLabel('Starting character').selectOption(value!);await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
}
async function saved(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise<any>(resolve=>{const r=db.transaction('campaigns','readonly').objectStore('campaigns').getAll();r.onsuccess=()=>{db.close();resolve(r.result[0]);};});});}
for(const id of ['rogue'] as const)test(id+' complete creation, solo encounter, rewards, short/long rest and resume',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await createAndImport(page,id);
 const snapshot=structuredClone((await saved(page)).characterBuild);expect(snapshot.selections.equipment.equipped.weapons).toHaveLength(1);
 await openDevelopment(page);
 const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();await session.getByRole('button',{name:'Speak with the city watchkeeper'}).click();await session.getByRole('button',{name:'Travel to Road outside Dasahi'}).click();await session.getByRole('button',{name:'Travel to Roadside ruins'}).click();await expect(session).toContainText('Visited 3/3 locations');
 if(id==='wizard'){
  await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-only-test-code');localStorage.setItem('four-keeps-dm-mode','on');});await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();let sent:any;
  await page.route('**/api/dm',async route=>{sent=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The reported footprints remain uncertain.',newFacts:[],worldUpdates:{},combatStart:null})});});
  await page.getByLabel('Message the Dungeon Master').fill('What does the watchkeeper report mean here?');await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();await navigate(page,'Adventure');await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The reported footprints remain uncertain.');await openDevelopment(page);expect(sent.gameState.playerBuild.spellbook).toContain('magic-missile');expect(sent.gameState.characterIdentity.classId).toBe('wizard');
 }
 const quick=session.getByLabel('Quick adventure encounter');for(const [field,value] of Object.entries({'player initiative':'20','enemy initiative':'10','enemy identifier':'tower-guard','enemy hp':'3','enemy ac':'10','enemy attack bonus':'2','enemy damage bonus':'1','enemy damage dice':'1d4'}))await quick.getByLabel('Quick '+field,{exact:true}).fill(value);
 await quick.getByRole('checkbox').check();await quick.getByRole('button',{name:'Start verified encounter'}).click();const battle=session.getByLabel('Companion encounter',{exact:true});
 await expect(battle.getByLabel('Verified equipped combat calculations')).toContainText(config[id].weapon);expect((await saved(page)).subclassActors).toBeUndefined();
 if(id==='fighter')await battle.getByRole('button',{name:/Spend Second Wind/}).click();
 if(id==='rogue'){await battle.getByLabel('Character campaign item',{exact:true}).selectOption('daggers');await battle.getByLabel('Campaign item quantity',{exact:true}).fill('1');await battle.getByRole('button',{name:'Spend campaign inventory'}).click();}
 if(id==='cleric'){
  await battle.getByRole('button',{name:'Cast origin spell without a slot'}).click();await expect(battle.getByLabel('Unified spell slots')).toContainText('2 remaining');
  await battle.getByRole('button',{name:'End companion turn'}).click();await battle.getByRole('button',{name:'End companion turn'}).click();
 }
 if(id==='wizard'){await expect(battle.getByLabel('Wizard verified spell resolution')).toBeVisible();await expect(battle.getByRole('button',{name:'Resolve verified Wizard spell'})).toBeDisabled();await expect(battle.getByLabel('Wizard resolved spell')).toHaveValue('Magic Missile');await expect(battle.getByRole('button',{name:'Resolve multi-target Magic Missile'})).toBeDisabled();await expect(battle.getByLabel('Wizard Magic Missile dart targets')).toBeVisible();}
 if(id==='wizard'||id==='cleric'){
  await battle.getByLabel('Unified prepared spell',{exact:true}).selectOption(id==='wizard'?'Magic Missile':'Guiding Bolt');await battle.getByRole('button',{name:'Cast prepared level-one spell'}).click();await expect(battle.getByLabel('Unified spell slots')).toContainText('1 remaining');
  await battle.getByLabel('Companion target',{exact:true}).selectOption('tower-guard');await battle.getByLabel('Companion damage',{exact:true}).fill('3');await battle.getByRole('button',{name:'Apply damage',exact:true}).click();
 }else{
  await battle.getByLabel('Companion target',{exact:true}).selectOption('tower-guard');await battle.getByLabel('Companion attack d20',{exact:true}).fill('15');await battle.getByLabel('Companion damage',{exact:true}).fill('5');await battle.getByRole('button',{name:'Attack with verified statistics'}).click();await expect(battle.getByLabel('Companion last event')).toContainText('hit');
 }
 await battle.getByLabel('Companion target',{exact:true}).selectOption('nighthawk');await battle.getByLabel('Companion damage',{exact:true}).fill('3');await battle.getByRole('button',{name:'Apply damage',exact:true}).click();await battle.getByRole('button',{name:'Finish companion encounter'}).click();
 await session.getByLabel('Encounter reward XP').fill('30');await session.getByLabel('Encounter reward gold').fill('5');await session.getByLabel('Encounter reward item',{exact:true}).fill(id+' keepsake');await session.getByRole('button',{name:'Save encounter rewards'}).click();await expect(session).toContainText('Rewards saved: 30 XP');await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await openDevelopment(page);await expect(session).toContainText('Rewards saved: 30 XP');
 let c=await saved(page);expect(c.character.currentHitPoints).toBe(config[id].hp-3);expect(c.characterBuild).toEqual(snapshot);if(id==='cleric'){expect(c.character.resources['Magic Initiate'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(1);}if(id==='rogue')expect(c.inventoryLedger.gear.find((g:any)=>g.name==='Dagger').quantity).toBe(3);
 await session.getByRole('button',{name:'Resume exploration after encounter'}).click();await navigate(page,'Developer');const rest=page.getByLabel('Imported player development tools').getByLabel('Player rest recovery');await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByLabel('Rest Hit Die result').fill('1');if(id==='wizard')await rest.getByRole('checkbox',{name:/Use Arcane Recovery/}).check();await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toHaveText('Rest completed and saved.');
 c=await saved(page);expect(c.hitDiceRemaining).toBe(0);expect(c.character.currentHitPoints).toBe(config[id].hp);if(id==='fighter')expect(c.character.resources['Second Wind'].used).toBe(0);if(id==='wizard'){expect(c.character.resources['Arcane Recovery'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(0);}if(id==='cleric')expect(c.character.spellSlots.usedLevel1).toBe(1);
 await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByRole('button',{name:'Complete long rest'}).click();await expect.poll(async()=>(await saved(page)).hitDiceRemaining).toBe(1);await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();c=await saved(page);expect(c.hitDiceRemaining).toBe(1);expect(c.character.currentHitPoints).toBe(config[id].hp);expect(c.characterBuild).toEqual(snapshot);expect(c.xp).toBe(30);if(c.character.spellSlots)expect(c.character.spellSlots.usedLevel1).toBe(0);for(const pool of Object.values(c.character.resources??{}) as any[])expect(pool.used).toBe(0);
 if(id==='fighter'){await navigate(page,'Developer');const again=page.getByLabel('Imported player development tools').getByLabel('Player rest recovery');await again.getByRole('checkbox',{name:/DM confirms safe/}).check();await expect(again.getByRole('button',{name:'Complete long rest'})).toBeDisabled();await again.getByRole('checkbox',{name:/Include 960 minutes/}).check();await again.getByRole('button',{name:'Complete long rest'}).click();await expect(again.getByRole('status')).toHaveText('Rest completed and saved.');expect((await saved(page)).elapsedMinutes).toBe(1980);}
 await navigate(page,'Developer');await expect(page.getByLabel('Saved character build')).toContainText('Background and character choices');expect(errors).toEqual([]);
});

test('rest save failure preserves Hit Dice, reports the failure, and permits a successful retry',async({page})=>{
 test.setTimeout(60000);await createAndImport(page,'fighter');await openDevelopment(page);
 const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();await navigate(page,'Developer');const rest=page.getByLabel('Imported player development tools').getByLabel('Player rest recovery');
 await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByLabel('Rest Hit Die result').fill('2');
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).__originalTransaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('Test write failure','QuotaExceededError');return Reflect.apply(original,this,args);} as typeof original;});
 await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toContainText('Rest could not be saved');expect((await saved(page)).hitDiceRemaining).toBe(1);await expect(rest.getByRole('checkbox',{name:/DM confirms safe/})).toBeChecked();
 await page.evaluate(()=>{IDBDatabase.prototype.transaction=(window as any).__originalTransaction;delete (window as any).__originalTransaction;});await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toHaveText('Rest completed and saved.');expect((await saved(page)).hitDiceRemaining).toBe(0);
});

test('AI-led opening, world memory and saved pending action retry survive reload',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'fighter');
 await expect.poll(async()=>Boolean((await saved(page))?.characterIdentity)).toBe(true);
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const requests:any[]=[];let failure:string|null=null;
 await page.route('**/api/dm',async route=>{
   const body=route.request().postDataJSON();requests.push(body);
   if(failure){await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:failure})});return;}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:body.opening?'A bell tolls from the abandoned keep. The road winds through a crowded marketplace, where a suspicious merchant argues with a particularly uncooperative mule. Beyond the village gates, the old tower waits beneath the gathering clouds.':'Mira says the bell rang at dusk.',newFacts:['A bell rang at dusk'],mapActions:body.opening?[{type:'create',site:{id:'dm-opening-bell-camp',name:'Bell Camp',description:'A quiet camp near the road',x:38,y:63,kind:'minor',createdAt:1000,discovered:true}}]:[],worldUpdates:{npcs:[{name:'Mira',role:'Watchkeeper',location:'Dasahi',relationship:'neutral',notes:['Knows the old road']}],clues:[{text:'A stranger passed at dusk',evidence:'reported',source:'Mira'}]},combatStart:null})});
 })
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const narration=page.getByLabel('Dungeon Master narration').first();
 await expect(narration).toContainText('A bell tolls from the abandoned keep.');
 await expect(narration.locator('.dm-narration-line')).toHaveCount(1);
 await narration.click();
 await expect(narration).toContainText('gathering clouds.');

 await expect(page.getByLabel('Narration speed')).toHaveCount(0);
 await navigate(page,'Settings');
 await expect(page.getByLabel('Narration speed')).toHaveValue('normal');
 await page.getByLabel('Narration speed').selectOption('instant');
 await navigate(page,'Adventure');
 await expect(page.getByLabel('Dungeon Master narration').first()).toContainText('A bell tolls');
 await expect(page.getByLabel('Adventure journal')).toHaveCount(0);
 await expect(page.getByLabel('AI adventure session')).toHaveCount(0);
 await expect(page.getByLabel('Adventure',{exact:true})).not.toContainText('The road bends toward a frontier village');

 expect(requests[0].opening).toBe(true);
 expect(requests[0].message).toContain('Dasahi');
 expect(requests[0].message).toContain('Anchamida');
 await expect.poll(async()=> (await saved(page))?.mapDynamicSites?.some((site:any)=>site.id==='dm-opening-bell-camp')).toBe(true);

 expect(requests[0].gameState.adventureSession.site).toBe('frontier');
 expect(requests[0].gameState.characterIdentity.classId).toBe('fighter');
 const firstOpening=(await saved(page)).journal.filter((entry:any)=>entry.id.endsWith('-dm-opening'));
 expect(firstOpening).toHaveLength(1);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).journal.filter((entry:any)=>entry.id.endsWith('-dm-opening'))).toEqual(firstOpening);
 expect(page.getByRole('button',{name:'Generate opening scene'})).toHaveCount(0);
 expect(requests.filter(request=>request.opening)).toHaveLength(1);

 await expect(page.getByLabel('Adventure journal')).toHaveCount(0);
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('button',{name:'Journal',exact:true}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toHaveCount(0);
 await page.getByRole('navigation',{name:'Journal sections'}).getByRole('button',{name:'People'}).click();
 await expect(page.locator('details').filter({hasText:'Mira'}).first()).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('A bell tolls from the abandoned keep.');
 await expect(page.getByRole('button',{name:'Begin AI-led adventure'})).toHaveCount(0);
 const beforeFailure=await saved(page);
 failure='The Dungeon Master response was incomplete. Retry your action.';
 await page.getByLabel('Message the Dungeon Master').fill('Ask Mira about the bell');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByRole('button',{name:'Retry saved action'})).toBeVisible();
 const pending=await saved(page);
 const pendingId=pending.pendingAdventureAction.id;
 expect(pending.journal).toEqual(beforeFailure.journal);
 expect(pending.world).toEqual(beforeFailure.world);
 expect(pending.adventureSession).toEqual(beforeFailure.adventureSession);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 failure='The Dungeon Master proposed an incomplete encounter. Retry the action.';
 await page.getByRole('button',{name:'Retry saved action'}).click();
 await expect(page.getByText(/proposed an incomplete encounter/)).toBeVisible();
 expect((await saved(page)).pendingAdventureAction.id).toBe(pendingId);
 failure=null;
 await page.getByRole('button',{name:'Retry saved action'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('Mira says the bell rang at dusk.');
 expect(requests.at(-1).actionId).toBe(pendingId);
 const final=await saved(page);
 expect(final.pendingAdventureAction).toBeUndefined();
 expect(final.journal.filter((e:any)=>e.id===pendingId+'-player')).toHaveLength(1);
 expect(final.world.clues[0].evidence).toBe('reported');
});


test('newly created fighter completes organic AI encounter, saves rewards and resumes AI exploration',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await createAndImport(page,'fighter');
 const original=await saved(page);
 expect(original.characterIdentity.name).toBe('fighter Hero');
 expect(original.location).toBe('Dasahi');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const calls:any[]=[];let firstFightClarified=false;
 await page.route('**/api/dm',async route=>{
  const request=route.request().postDataJSON();calls.push(request);
  const opening=request.opening;
  const investigate=!opening && request.message.includes('investigate the road');
  const secondFight=!opening && request.message.includes('investigate the riverbank');
  const firstFight=!opening && request.message.includes('approach the bridge');
  const combat=firstFight || secondFight;
  if(firstFight && !request.clarification?.answer){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The guard gestures toward the bridge.',clarificationRequest:{question:'Do you approach the guarded bridge or the unguarded ford?'},combatStart:null,newFacts:[],worldUpdates:{}})});
   return;
  }
  if(firstFight && request.clarification?.answer)firstFightClarified=true;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   narration:opening?'In Dasahi, the city watchkeeper reports strange lanterns along the road.':investigate?'A scout points out a camp beside the road outside Dasahi.':secondFight?'A poacher blocks the riverbank with a drawn blade.':combat?'A highway robber draws a sword and attacks.':'The guard acknowledges your return and the bridge is safe.',
   mapActions:investigate?[{type:'create',site:{id:'dm-first-journey-camp',name:'Lantern Camp',description:'A small camp beside the road outside Dasahi',x:61,y:72,kind:'minor',createdAt:1000,discovered:true}}]:[],
   combatStart:combat?{enemyName:secondFight?'Poacher':'Highway robber'}:null,newFacts:combat?['A highway robber attacked the bridge']:['The bridge is safe after the battle'],
   worldUpdates:combat?{clues:[{text:'A robber attacked the bridge',evidence:'confirmed',source:'Fighter'}]}:{quests:[{title:'Secure the bridge',status:'completed',objective:'Defeat the robber',notes:['The bridge is safe']}]}
  })});
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('In Dasahi');
 await page.getByLabel('Message the Dungeon Master').fill('I investigate the road and ask the watchkeeper about the lanterns.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=> (await saved(page)).mapDynamicSites?.filter((site:any)=>site.id==='dm-first-journey-camp').length).toBe(1);
 const beforeRepeat=await saved(page);
 expect(beforeRepeat.inventoryLedger.currency).toEqual(original.inventoryLedger.currency);
 await page.getByLabel('Message the Dungeon Master').fill('I investigate the road again for the same lantern camp.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=> (await saved(page)).mapDynamicSites?.filter((site:any)=>site.id==='dm-first-journey-camp').length).toBe(1);
 await navigate(page,'Developer');
 const routeSession=page.getByLabel('Adventure session',{exact:true});
 await routeSession.getByRole('button',{name:'Speak with the city watchkeeper'}).click();
 await routeSession.getByRole('button',{name:'Travel to Road outside Dasahi'}).click();
 await expect.poll(async()=> (await saved(page)).location).toBe('Road outside Dasahi');
 await navigate(page,'Adventure');
 await page.getByLabel('Message the Dungeon Master').fill('I approach the bridge cautiously.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('guarded bridge');
 const beforeClarification=await saved(page);
 expect(beforeClarification.adventureSession.pendingEncounter).toBeFalsy();
 expect(beforeClarification.pendingAdventureAction.message).toBe('I approach the bridge cautiously.');
 const originalActionId=beforeClarification.pendingAdventureAction.id;
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByLabel('Message the Dungeon Master').fill('I mean the guarded bridge. I approach cautiously.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Opponent: Highway robber',{exact:false})).toBeVisible();
 expect(firstFightClarified).toBe(true);
 expect(calls.at(-1).actionId).toBe(originalActionId);
 expect(calls.at(-1).clarification.answer).toContain('guarded bridge');

 await expect(page.getByRole('button',{name:'Send message to Dungeon Master'})).toBeDisabled();
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const before=await saved(page);
 expect(before.adventureSession.pendingEncounter.enemyName).toBe('Highway robber');
 expect(before.location).toBe('Road outside Dasahi');
 expect(before.mapDynamicSites.filter((site:any)=>site.id==='dm-first-journey-camp')).toHaveLength(1);
 expect(before.characterBuild).toEqual(original.characterBuild);
 await page.getByLabel('Quick player initiative').fill('18');
 await page.getByLabel('Quick enemy initiative').fill('12');
 await page.getByLabel('Paste verified enemy statistics').fill('HP 10, AC 12');
 await page.getByRole('button',{name:'Fill verified enemy statistics'}).click();
 await expect(page.getByText('Still needed: attack bonus, damage bonus, damage dice',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Quick enemy hp')).toHaveValue('10');
 await page.getByLabel('Paste verified enemy statistics').fill('attack bonus +3, damage bonus +1, damage dice 1d6');
 await page.getByRole('button',{name:'Fill verified enemy statistics'}).click();
 await expect(page.getByLabel('Quick enemy hp')).toHaveValue('10');
 await expect(page.getByLabel('Quick enemy ac')).toHaveValue('12');
 await expect(page.getByLabel('Quick enemy attack bonus')).toHaveValue('3');
 await expect(page.getByLabel('Quick enemy damage bonus')).toHaveValue('1');
 await expect(page.getByLabel('Quick enemy damage dice')).toHaveValue('1d6');
 await page.getByRole('checkbox',{name:/DM confirms this encounter/i}).check();
 await page.getByRole('button',{name:'Start verified encounter'}).click();
 const session=page.getByLabel('Adventure session',{exact:true});
 await expect(session.getByLabel('Adventure session status')).toContainText('fighter Hero');
 const battle=session.getByLabel('Companion encounter');
 await expect(battle).toContainText('fighter Hero');
 await expect(page.getByRole('button',{name:'Send message to Dungeon Master'})).toBeDisabled();
 await battle.getByRole('button',{name:/Spend Second Wind/}).click();
 await battle.getByLabel('Companion target',{exact:true}).selectOption('nighthawk');
 await battle.getByLabel('Companion damage',{exact:true}).fill('3');
 await battle.getByRole('button',{name:'Apply damage',exact:true}).click();
 await battle.getByRole('button',{name:'Finish companion encounter'}).click();
 await session.getByLabel('Encounter reward XP').fill('45');
 await session.getByLabel('Encounter reward gold').fill('7');
 await session.getByLabel('Encounter reward item',{exact:true}).fill('Bridge token');
 await session.getByRole('button',{name:'Save encounter rewards'}).click();
 await expect(session).toContainText('Rewards saved: 45 XP');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const afterBattle=await saved(page);
 expect(afterBattle.mapDynamicSites.filter((site:any)=>site.id==='dm-first-journey-camp')).toHaveLength(1);
 expect(afterBattle.character.currentHitPoints).toBe(config.fighter.hp-3);
 expect(afterBattle.character.resources['Second Wind'].used).toBe(1);
 expect(afterBattle.inventoryLedger.currency.GP).toBe((original.inventoryLedger?.currency?.GP??0)+7);
 expect(afterBattle.inventoryLedger.gear).toEqual(expect.arrayContaining([expect.objectContaining({name:'Bridge token',quantity:1})]));
 expect(afterBattle.characterBuild).toEqual(original.characterBuild);
 expect(afterBattle.location).toBe('Road outside Dasahi');
 expect(afterBattle.companionEncounter.settlement.xp).toBe(45);
 await page.getByLabel('Adventure session',{exact:true}).getByRole('button',{name:'Resume exploration after encounter'}).click();
 await expect.poll(async()=> (await saved(page)).adventureSession.status).toBe('exploring');
 await page.getByLabel('Message the Dungeon Master').fill('I return to the guard. What happens next?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The guard acknowledges your return');
 const last=await saved(page);
 expect(last.characterIdentity).toEqual(original.characterIdentity);
 expect(last.characterBuild).toEqual(original.characterBuild);
 expect(last.character.currentHitPoints).toBe(config.fighter.hp-3);
 expect(last.character.resources['Second Wind'].used).toBe(1);
 expect(last.location).toBe('Road outside Dasahi');
 expect(last.adventureSession.status).toBe('exploring');
 expect(last.inventoryLedger.currency.GP).toBe(afterBattle.inventoryLedger.currency.GP);
 expect(last.companionEncounter.settlement).toEqual(afterBattle.companionEncounter.settlement);
 expect(last.worldFacts).toContain('A highway robber attacked the bridge');
 expect(last.worldFacts).toContain('The bridge is safe after the battle');
 expect(last.world.quests.some((q:any)=>q.title==='Secure the bridge')).toBe(true);
 expect(calls.at(-1).gameState.characterIdentity.name).toBe('fighter Hero');
 expect(calls.at(-1).gameState.sharedEncounter.status).toBe('completed');
 expect(calls.at(-1).gameState.location).toBe('Road outside Dasahi');
 await page.getByLabel('Message the Dungeon Master').fill('I investigate the riverbank.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Opponent: Poacher',{exact:false})).toBeVisible();
 await expect.poll(async()=> (await saved(page)).adventureSession.pendingEncounter?.enemyName).toBe('Poacher');
 expect(calls.at(-1).gameState.sharedEncounter.status).toBe('completed');
 expect((await saved(page)).companionEncounter.settlement).toEqual(afterBattle.companionEncounter.settlement);
 expect(errors).toEqual([]);
});

test('organic combat proposal can be declined and AI narration resumes without losing state',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 let calls=0;
 await page.route('**/api/dm',async route=>{
  calls++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:calls===1?'A watchman greets you.':calls===2?'Which stranger do you mean?':calls===3?'A suspicious stranger reaches for a sword.':'The stranger lowers the sword and walks away.',clarificationRequest:calls===2?{question:'Which stranger do you mean?'}:null,combatStart:calls===3?{enemyName:'Suspicious stranger'}:null,newFacts:['The watchman is present'],worldUpdates:{}})});
 });
 await createAndImport(page,'fighter');
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const initial=await saved(page);
 await page.getByLabel('Message the Dungeon Master').fill('I question the stranger.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('Which stranger');
 await page.getByLabel('Message the Dungeon Master').fill('The stranger in the blue cloak by the door.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Opponent: Suspicious stranger',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Send message to Dungeon Master'})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Decline encounter and continue exploring'})).toBeVisible();
 await page.getByRole('button',{name:'Decline encounter and continue exploring'}).click();
 const declined=await saved(page);
 expect(declined.adventureSession.status).toBe('exploring');
 expect(declined.adventureSession.pendingEncounter).toBeUndefined();
 expect(declined.character).toEqual(initial.character);
 expect(declined.location).toBe(initial.location);
 expect(declined.companionEncounter).toBeUndefined();
 expect(declined.journal.some((event:any)=>event.id.startsWith('declined-encounter-'))).toBe(true);
 await page.getByLabel('Message the Dungeon Master').fill('I explain that I do not want a fight.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The stranger lowers the sword');
 const resumed=await saved(page);
 expect(resumed.character).toEqual(initial.character);
 expect(resumed.location).toBe(initial.location);
 expect(resumed.adventureSession.status).toBe('exploring');
 expect(resumed.worldFacts).toContain('The watchman is present');
 expect(calls).toBe(4);
});

test('DM clarification pauses dangerous action, persists answer, and resumes exactly once',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on')});
 await createAndImport(page,'fighter');
 const calls:any[]=[];let failConfirmed=false;
 await page.route('**/api/dm',async route=>{
  const body=route.request().postDataJSON();calls.push(body);
  if(body.clarification?.answer&&failConfirmed){await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'The Dungeon Master is temporarily unavailable.'})});return;}
  const response=body.opening?{narration:'You see a dragon on a distant ridge.',newFacts:[],worldUpdates:{},combatStart:null}
   : !body.clarification?.answer?{narration:'Before you attack, one question.',clarificationRequest:{question:'Are you sure you want to attack that dragon with a dagger?'},newFacts:[],worldUpdates:{},combatStart:null}
   : {narration:'You draw your dagger and approach. The dragon notices you.',newFacts:[],worldUpdates:{},combatStart:null};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 await page.getByLabel('Message the Dungeon Master').fill('I attack the dragon with my dagger');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('Are you sure');
 const paused=await saved(page);
 expect(paused.pendingAdventureAction.message).toBe('I attack the dragon with my dagger');
 expect(paused.journal.filter((e:any)=>e.text.includes('I attack the dragon'))).toHaveLength(0);
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Home'}).click();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('Are you sure');
 failConfirmed=true;
 await page.getByLabel('Message the Dungeon Master').fill('Yes, I know it is dangerous. I attack.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByRole('button',{name:'Retry confirmed action'})).toBeVisible();
 const pendingAfterError=await saved(page);
 expect(pendingAfterError.pendingClarification.answer).toContain('Yes, I know');
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Home'}).click();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByRole('button',{name:'Retry confirmed action'})).toBeVisible();
 failConfirmed=false;
 await page.getByRole('button',{name:'Retry confirmed action'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toHaveCount(0);
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The dragon notices you.');
 const final=await saved(page);
 expect(final.pendingAdventureAction).toBeUndefined();
 expect(final.pendingClarification).toBeUndefined();
 expect(final.journal.filter((e:any)=>e.text.includes('I attack the dragon'))).toHaveLength(1);
 expect(calls.at(-1).clarification.answer).toContain('Yes, I know');
 expect(calls.at(-1).actionId).toBe(calls.at(-2).actionId);
});

test('iPhone DM connection preflight verifies configuration without spending provider tokens',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await createAndImport(page,'fighter');
 await navigate(page,'Settings');
 await page.getByLabel('AI Dungeon Master mode').check();
 const calls:any[]=[];
 await page.route('**/api/dm',async route=>{
  const req=route.request();calls.push({method:req.method(),access:req.headers()['x-four-keeps-access']});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ready:true,provider:'configured',liveModelTested:false})});
 });
 await expect(page.getByRole('button',{name:'Check DM connection'})).toBeDisabled();
 await page.getByLabel('Game access code (remembered on this device)').fill('browser-test-code');
 await page.getByRole('button',{name:'Check DM connection'}).click();
 await expect(page.getByLabel('DM connection status')).toContainText('Live AI responses are not tested');
 expect(calls.filter(call=>call.method==='GET')).toEqual([{method:'GET',access:'browser-test-code'}]);
 await page.getByRole('button',{name:'Forget access code'}).click();
 await expect(page.getByLabel('DM connection status')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Check DM connection'})).toBeDisabled();
});
test('imported Rogue unlocks Cunning Action and selects Arcane Trickster spells at level three',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');await navigate(page,'Player');
 const sheet=page.getByLabel('Imported player character');
 await awardImportedTestXP(page,'900','Verified adventure rewards');
 await sheet.getByLabel('Level-up hit points').fill('5');
 await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();
 await sheet.getByRole('button',{name:'Confirm and save level 2'}).click();
 await expect(sheet).toContainText('Level 2');
 await sheet.getByLabel('Level-up subclass').selectOption('rogue-arcane-trickster');
 await sheet.getByLabel('Arcane cantrip 1').selectOption('Minor Illusion');
 await sheet.getByLabel('Arcane cantrip 2').selectOption('Message');
 await sheet.getByLabel('Arcane spell 1').selectOption('Shield');
 await sheet.getByLabel('Arcane spell 2').selectOption('Magic Missile');
 await sheet.getByLabel('Arcane spell 3').selectOption('Disguise Self');
 await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();
 await sheet.getByRole('button',{name:'Confirm and save level 3'}).click();
 await expect(sheet).toContainText('Level 3');
 const record=await saved(page);
 expect(record.importedSubclassId).toBe('rogue-arcane-trickster');
 expect(record.character.cantrips).toContain('Mage Hand');
 expect(record.character.preparedSpells).toContain('Shield');
 expect(record.character.spellSlots.level1).toBe(2);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 await expect(page.getByLabel('Imported player character')).toContainText('Level 3');
 await awardImportedTestXP(page,'1800','Verified Rogue level-four rewards');
 const advanced=page.getByLabel('Imported player character');
 await expect(advanced.getByLabel('Imported character level-up')).toContainText('Level 4');
 await advanced.getByLabel('Level-up improvement').selectOption('Ability Score Improvement');
 await advanced.getByLabel('Level-up hit points').fill('5');
 await advanced.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();
 await advanced.getByRole('button',{name:'Confirm and save level 4'}).click();
 await expect(advanced.getByLabel('Rogue rules reference')).toContainText('2d6');
 expect((await saved(page)).character.level).toBe(4);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 await expect(page.getByLabel('Imported player character')).toContainText('Level 4');
 await awardImportedTestXP(page,'20300','Verified Rogue progression to level seven');
 const levelSheet=page.getByLabel('Imported player character');
 for(const level of [5,6,7]){
  await levelSheet.getByLabel('Level-up hit points').fill('5');
  if(level===6){const expertise=levelSheet.getByLabel('Rogue level 6 Expertise');await expertise.getByRole('checkbox').nth(0).check();await expertise.getByRole('checkbox').nth(1).check();}
  await levelSheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();
  await levelSheet.getByRole('button',{name:`Confirm and save level ${level}`}).click();
  await expect(levelSheet.getByLabel('Rogue rules reference')).toContainText(`${Math.ceil(level/2)}d6`);
 }
 expect((await saved(page)).character.level).toBe(7);
 await expect(levelSheet).toContainText('Reliable Talent');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 await expect(page.getByLabel('Imported player character')).toContainText('Level 7');
});

test('imported Warlock advances to Celestial and persists Pact Magic resources',async({page})=>{
 test.setTimeout(90000);await createAndImport(page,'warlock');await navigate(page,'Player');const sheet=page.getByLabel('Imported player character');
 await awardImportedTestXP(page,'2700','Verified rewards');
 await sheet.getByLabel('Level-up hit points').fill('5');await sheet.getByLabel('Warlock invocation 1').selectOption('Agonizing Blast');await sheet.getByLabel('Warlock invocation 2').selectOption('Armor of Shadows');await sheet.getByLabel('Warlock advancement spell').selectOption('Charm Person');await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 2'}).click();
 await expect(sheet).toContainText('Level 2');await sheet.getByLabel('Level-up subclass').selectOption('warlock-celestial');await sheet.getByLabel('Warlock advancement spell').selectOption('Protection from Evil and Good');await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 3'}).click();
 await expect(sheet).toContainText('Level 3');const c=await saved(page);expect(c.importedWarlockPactSlotLevel).toBe(2);expect(c.importedWarlockInvocations).toContain('Agonizing Blast');expect(c.character.resources['Healing Light'].maximum).toBe(4);await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');await expect(page.getByLabel('Imported player character')).toContainText('Level 3');
});
test('imported Wizard advances to Diviner with persistent spellbook and level-two slots',async({page})=>{
 test.setTimeout(90000);await createAndImport(page,'wizard');await navigate(page,'Player');const sheet=page.getByLabel('Imported player character');
 await awardImportedTestXP(page,'2700','Verified rewards');
 await sheet.getByLabel('Level-up hit points').fill('5');await sheet.getByLabel('Wizard spellbook addition 1').selectOption('Shield');await sheet.getByLabel('Wizard spellbook addition 2').selectOption('Sleep');
 for(const name of ['Alarm','Burning Hands','Charm Person','Magic Missile','Shield'])await sheet.getByRole('checkbox',{name:'Prepare '+name}).check();
 await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 2'}).click();await expect(sheet).toContainText('Level 2');
 await sheet.getByLabel('Level-up subclass').selectOption('wizard-diviner');await sheet.getByLabel('Wizard spellbook addition 1').selectOption('Misty Step');await sheet.getByLabel('Wizard spellbook addition 2').selectOption('Web');
 for(const name of ['Alarm','Burning Hands','Charm Person','Magic Missile','Shield','Misty Step'])await sheet.getByRole('checkbox',{name:'Prepare '+name}).check();
 await sheet.getByLabel('Wizard Portent roll 1').fill('17');await sheet.getByLabel('Wizard Portent roll 2').fill('3');await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 3'}).click();
 await expect(sheet).toContainText('Level 3');const c=await saved(page);expect(c.importedSubclassId).toBe('wizard-diviner');expect(c.character.spellSlots.level2).toBe(2);expect(c.importedWizardPortents).toEqual([17,3]);expect(c.importedWizardSpellbook).toContain('Misty Step');await expect(sheet.getByLabel('Earned subclass')).toContainText('Portent');await expect(sheet.getByLabel('Earned subclass')).not.toContainText('Greater Portent');await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');await expect(page.getByLabel('Imported player character')).toContainText('Level 3');
});

test('imported Arcane Trickster advances through levels nine and ten with persisted spell and ASI choices',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('four-keeps-local',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns');
  const c:any=await new Promise(resolve=>{const r=store.getAll();r.onsuccess=()=>resolve(r.result[0]);});
  c.xp=64000;c.character.level=8;c.importedSubclassId='rogue-arcane-trickster';
  c.character.preparedSpells=['Shield','Magic Missile','Sleep','Charm Person','Disguise Self'];
  c.character.spellSlots={level1:4,usedLevel1:0,level2:2,usedLevel2:0};
  store.put(c);
  await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 const sheet=page.getByLabel('Imported player character');
 await expect(sheet).toContainText('Level 8');
 await sheet.getByLabel('Arcane Trickster new spell 1').selectOption('Hold Person');
 await sheet.getByLabel('Level-up hit points').fill('5');
 await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();
 await sheet.getByRole('button',{name:'Confirm and save level 9'}).click();
 await expect(sheet).toContainText('Level 9');
 await sheet.getByLabel('Arcane Trickster new spell 1').selectOption('Detect Magic');
 await sheet.getByLabel('Level-up improvement').selectOption('Ability Score Improvement');
 await sheet.getByLabel('First ASI ability').selectOption('Dex');
 await sheet.getByLabel('Second ASI ability').selectOption('Dex');
 await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();
 await sheet.getByRole('button',{name:'Confirm and save level 10'}).click();
 await expect(sheet).toContainText('Level 10');
 const record=await saved(page);
 expect(record.character.preparedSpells).toContain('Hold Person');
 expect(record.character.preparedSpells).toContain('Detect Magic');
 expect(record.character.spellSlots.level2).toBe(3);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 await expect(page.getByLabel('Imported player character')).toContainText('Level 10');
});

test('imported character summary and section navigation survive reload',async({page})=>{
 await createAndImport(page,'fighter');
 await navigate(page,'Player');
 const sheet=page.getByLabel('Imported player character');
 const summary=sheet.getByLabel('Persistent character summary');
 await expect(summary).toBeVisible();
 const campaign=await saved(page);
 await expect(summary).toContainText(campaign.characterIdentity.name);
 await expect(summary).toContainText('Level 1');
 await expect(summary).toContainText('HP');
 await expect(summary).toContainText('AC');
 await sheet.getByLabel('Jump to character section').selectOption('abilities');
 await expect(sheet.getByLabel('Player ability scores')).toBeInViewport();
 await sheet.getByLabel('Jump to character section').selectOption('equipment');
 await expect(sheet.getByLabel('Equipment and inventory')).toBeInViewport();
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 await expect(page.getByLabel('Persistent character summary')).toContainText(campaign.characterIdentity.name);
 await expect(page.getByLabel('Imported player character')).toContainText('Level 1');
});
test('new Rogue starts at Frontier Village, buys supplies, and sees persisted Player sheet',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');
 await navigate(page,'Player');
 const sheet=page.getByLabel('Imported player character');
 await expect(sheet.getByLabel('Player ability scores')).toBeVisible();
 await expect(sheet.getByLabel('Player ability scores')).toContainText('Stealth');
 const abilities=sheet.getByLabel('Player ability scores');
 await expect(abilities.getByLabel('DEX ability group')).toContainText('Stealth');
 await expect(abilities.getByLabel('DEX ability group')).toContainText('Saving throw');
 await expect(abilities.getByLabel('WIS ability group')).toContainText('Perception');
 await expect(abilities.getByLabel('STR ability group')).not.toContainText('Stealth');
 await expect(sheet.getByLabel('Combat and vital statistics')).toContainText('Proficiency bonus');
 await expect(sheet.getByLabel('Hit points and Hit Dice')).toContainText('Temporary HP');
 await expect(sheet.getByLabel('Hit points and Hit Dice')).toContainText('Hit Dice remaining');
 await expect(sheet.getByLabel('Death saving throws')).toContainText('Successes:');
 await expect(sheet.getByLabel('Attacks and damage cantrips')).toContainText('Selected weapon masteries');
 await expect(sheet.getByLabel('Equipment training and proficiencies')).toContainText('Weapon proficiencies');
 await expect(sheet.getByLabel('Earned class features')).toContainText('Level 1');
 await expect(sheet.getByLabel('Earned class features')).toContainText('Sneak Attack');
 await expect(sheet.getByLabel('Rogue rules reference')).toContainText('1d6');
 await expect(sheet.getByLabel('Imported character level-up')).toContainText('Level 2');
 await expect(sheet.getByLabel('Imported character level-up')).not.toContainText('Level 14');
 await expect(sheet.getByLabel('Imported character level-up')).not.toContainText('Slippery Mind');
 await expect(sheet.getByLabel('Imported character level-up')).not.toContainText('Epic Boon');
 await expect(sheet.getByLabel('Rogue rules reference')).not.toContainText('Cunning Strike:');
 await expect(sheet.getByLabel('Rogue rules reference')).not.toContainText('Evasion');
 await expect(sheet.getByLabel('Earned class features')).not.toContainText('Reliable Talent');
 await expect(sheet.getByLabel('Player class resources')).toBeVisible();
 await expect(sheet.getByLabel('Player spellcasting')).toBeVisible();
 await expect(sheet.getByLabel('Player spellcasting')).not.toContainText('Level undefined');
 await expect(sheet.getByLabel('Player spellcasting')).not.toContainText('Level 0 slots');
 await expect(sheet.getByLabel('Class spell progression')).toHaveCount(0); // A level-one Rogue has no spellcasting progression.
 await expect(sheet.getByLabel('Species traits')).toBeVisible();
 await expect(sheet.getByLabel('Species traits')).toContainText('Fey Ancestry');
 await expect(sheet.getByLabel('Species traits')).toContainText('Elven Lineage');
 await expect(sheet.getByLabel('Species traits')).toContainText('chosen lineage');
 await expect(sheet.getByLabel('Species traits')).not.toContainText('Pass without Trace (level 5)');
 await expect(sheet.getByLabel('Species traits')).toContainText('Passive');
 await expect(sheet.getByLabel('Species traits')).not.toContainText('Misty Step (level 5)');
 await expect(sheet.getByLabel('Earned feats')).toBeVisible();
 await expect(sheet.getByLabel('Player class resources')).toBeVisible();
 await expect(sheet.getByLabel('Player spellcasting')).toBeVisible();
 const sectionMenu=sheet.getByLabel('Jump to character section');
 await expect(sectionMenu.locator('option')).toHaveCount(10);
 for(const [value,label] of [['identity','Character Overview'],['combat','Combat & Defenses'],['vitality','Hit Points & Recovery'],['abilities','Abilities, Saves & Skills'],['attacks','Attacks & Weapon Mastery'],['training','Proficiencies & Training'],['features','Features & Resources'],['equipment','Equipment & Inventory'],['spells','Spellcasting']]){
  await expect(sectionMenu.locator(`option[value="${value}"]`)).toHaveText(label);
 }
 await sectionMenu.selectOption('identity');
 await expect(sheet.getByLabel('Character identity')).toBeInViewport();
 await sheet.getByLabel('Jump to character section').selectOption('features');
 await expect(sheet.getByLabel('Class features',{exact:true})).toBeInViewport();
 await sheet.getByLabel('Jump to character section').selectOption('spells');
 await expect(sheet.getByLabel('Player spellcasting')).toBeInViewport();

 await sheet.getByLabel('Jump to character section').selectOption('vitality');
 await expect(sheet.getByLabel('Hit points and Hit Dice')).toBeInViewport();


 await expect(sheet.getByLabel('Character details')).toContainText('Background: criminal');
 await expect(sheet.getByLabel('Combat and vital statistics')).toContainText('Passive Perception');
 await expect(sheet.getByLabel('Combat and vital statistics')).toContainText('Armor Class');
 await expect(sheet.getByLabel('Combat and vital statistics')).toContainText('Initiative');
 await expect(sheet.getByLabel('Equipment training and proficiencies')).toContainText('Tool proficiencies:');
 await expect(sheet.getByLabel('Owned weapon attacks')).toContainText('Shortbow');
 await expect(sheet.getByLabel('Class features',{exact:true})).toContainText('Only earned features are listed');
 await expect(sheet.getByLabel('Player class resources')).toContainText('Saved resource totals');
 await expect(sheet.getByLabel('Player spellcasting')).toContainText('Saved spell and slot values are authoritative');
 await expect(sheet.getByLabel('Character identity')).toContainText('criminal');
 await expect(sheet.getByLabel('Player class resources')).toContainText('Spend 1 use control appears only on your active encounter turn');
 await expect(sheet.getByLabel('Player spellcasting')).toContainText('this section is read-only');
 await expect(sheet.getByLabel('Equipment and inventory')).toBeVisible();
 await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const dmRequests:any[]=[];
 await page.route('**/api/dm',route=>{dmRequests.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The village shop is open; the watchkeeper watches the road.',worldUpdates:{},newFacts:[]})});});
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 await expect(page.getByLabel('Dasahi marketplace')).toHaveCount(0);
 await page.getByLabel('Message the Dungeon Master').fill('I ask the shopkeeper what a dagger costs');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(()=>dmRequests.length).toBeGreaterThanOrEqual(2);
 expect(dmRequests.at(-1).gameState.merchant.items).toContainEqual({id:'dagger',name:'Dagger',costCp:200,remaining:12,packQuantity:1});
 expect(dmRequests.at(-1).gameState.merchant.purchaseRule).toContain('explicit confirmation');
 await expect.poll(async()=>Boolean((await saved(page)).pendingAdventureAction)).toBe(false);
 const before=(await saved(page)).inventoryLedger;
 const requestsBeforeSearch=dmRequests.length;
 await page.getByLabel('Message the Dungeon Master').fill('I look for a place to buy some gear');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(()=>dmRequests.length).toBeGreaterThan(requestsBeforeSearch);
 await expect.poll(async()=>Boolean((await saved(page)).pendingAdventureAction)).toBe(false);
 expect((await saved(page)).inventoryLedger).toEqual(before);
 await expect(page.getByText('The merchant cannot prepare that purchase')).toHaveCount(0);
 await page.getByLabel('Message the Dungeon Master').fill("I'd like to browse");
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const shop=page.getByLabel('Dasahi marketplace');
 await expect(shop).toBeVisible();
 // The storefront replaces the narration while shopping, so it cannot be missed.
 await expect(page.getByLabel('Adventure storefront')).toBeVisible();
 await expect(page.getByLabel('Adventure',{exact:true})).toHaveCount(0);
 await expect(shop.getByLabel('Merchant specialties')).toHaveCount(0);
 await expect(shop.getByLabel('Current merchant')).toContainText('General');
 await expect(shop.getByLabel('Merchant inventory')).toContainText('Dagger');
 await expect(shop.getByRole('region',{name:'Camping and travel',exact:true})).toBeVisible();
 await expect(shop.getByRole('region',{name:'Kits and tools',exact:true})).toBeVisible();
 await expect(shop.getByRole('region',{name:'Lighting and fuel',exact:true})).toBeVisible();
 const sectionNav=shop.getByRole('navigation',{name:'Jump to merchandise section'});
 await expect(sectionNav).toBeVisible();
 await sectionNav.getByRole('button',{name:/Melee weapons/}).click();
 await expect(shop.getByRole('region',{name:'Melee weapons',exact:true})).toBeVisible();
 const dagger=shop.getByLabel('Dagger',{exact:true});
 await expect(dagger.getByLabel('Dagger availability')).toContainText(/Dagger.*\d+ owned · \d+ in stock/);
 await expect(dagger.getByLabel('Dagger description')).toBeVisible();
 await expect(dagger.getByText('Simple weapon proficiency',{exact:false})).toBeVisible();
 await expect(dagger.getByText('1d4 Piercing damage',{exact:false}).first()).toBeVisible();
 await expect(shop.getByLabel('Current wallet')).toBeVisible();
 await expect(shop.getByLabel('City supplier orders')).toBeVisible();
 expect((await saved(page)).pendingMerchantSupplyOrder).toBeUndefined();
 await expect(shop.getByLabel('Merchant inventory')).toContainText('Dagger');
 await shop.getByRole('button',{name:'Add Dagger'}).click();
 await expect(dagger.getByLabel('Dagger quantity')).toHaveText('1');
 await shop.getByRole('button',{name:'Review purchase'}).click();
 await expect(shop.getByLabel('Confirm merchant purchase')).toBeVisible();
 expect((await saved(page)).inventoryLedger).toEqual(before);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Confirm merchant purchase')).toBeVisible();
 await page.getByLabel('Confirm merchant purchase').getByRole('button',{name:'Cancel'}).click();
 await expect(page.getByLabel('Dasahi marketplace')).toBeVisible();
 expect((await saved(page)).inventoryLedger).toEqual(before);
 const shopAfterCancel=page.getByLabel('Dasahi marketplace');
 await shopAfterCancel.getByRole('button',{name:'Add Rope'}).click();
 await shopAfterCancel.getByRole('button',{name:'Add Rope'}).click();
 await shopAfterCancel.getByRole('button',{name:'Add Torch'}).click();
 const reviewButton=shopAfterCancel.getByRole('button',{name:'Review purchase'});
 await reviewButton.scrollIntoViewIfNeeded();
 const reviewBounds=await reviewButton.boundingBox();
 const composerBounds=await page.getByLabel('Message the Dungeon Master').boundingBox();
 expect(reviewBounds).not.toBeNull();
 expect(composerBounds).not.toBeNull();
 expect(reviewBounds!.y+reviewBounds!.height).toBeLessThanOrEqual(composerBounds!.y);
 await reviewButton.click();
 await expect(shopAfterCancel.getByLabel('Confirm merchant purchase')).toContainText('2 × Rope');
 await shopAfterCancel.getByLabel('Confirm merchant purchase').getByRole('button',{name:'Confirm purchase'}).click();
 await expect.poll(async()=> (await saved(page)).merchantStockRemaining?.['location:dasahi:city:general:rope']).toBe(38);
 await expect.poll(async()=> (await saved(page)).inventoryLedger.gear.find((item:any)=>item.name==='Rope')?.quantity).toBeGreaterThan(0);
 await expect(page.getByLabel('Dasahi marketplace')).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Dasahi marketplace')).toContainText('38 in stock');
 const beforeDagger=(await saved(page)).inventoryLedger;
 await page.getByLabel('Message the Dungeon Master').fill('I buy one rope');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Confirm purchase',{exact:false}).first()).toBeVisible();
 expect((await saved(page)).inventoryLedger).toEqual(beforeDagger);
 await page.getByLabel('Message the Dungeon Master').fill('yes');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=>{const c=await saved(page);return c.inventoryLedger.gear.find((i:any)=>i.name==='Rope')?.quantity??0}).toBeGreaterThan(before.gear.find((i:any)=>i.name==='Rope')?.quantity??0);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await navigate(page,'Player');
 await expect(page.getByLabel('Equipment and inventory')).toContainText('Dagger');
});

test('conversational purchase confirms once and persists gold and gear after reload',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');
 await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The general store is open.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const before=await saved(page);
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('I will buy 2 daggers');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=>Boolean((await saved(page)).pendingMerchantPurchase)).toBe(true);
 const pending=await saved(page);
 expect(pending.inventoryLedger).toEqual(before.inventoryLedger);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByLabel('Message the Dungeon Master').fill('yes');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=>Boolean((await saved(page)).completedMerchantPurchaseIds?.length)).toBe(true);
 const after=await saved(page);
 expect(after.pendingMerchantPurchase).toBeUndefined();
 expect(after.inventoryLedger.gear.find((g:any)=>g.name==='Dagger')?.quantity).toBeGreaterThanOrEqual(2);
 expect(after.completedMerchantPurchaseIds).toContain(pending.pendingMerchantPurchase.id);
 await navigate(page,'Player');
 await expect(page.getByLabel('Equipment and inventory')).toContainText('GP');
 await expect(page.getByLabel('Equipment and inventory')).toContainText('Dagger');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).inventoryLedger).toEqual(after.inventoryLedger);
});

test('conversational purchase cancellation and duplicate confirmation cannot spend twice',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');
 await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The store is open.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 const send=page.getByRole('button',{name:'Send message to Dungeon Master'});
 const before=await saved(page);
 await input.fill('I will buy a dagger');await send.click();
 await expect.poll(async()=>Boolean((await saved(page)).pendingMerchantPurchase)).toBe(true);
 await input.fill('no');await send.click();
 await expect.poll(async()=>!(await saved(page)).pendingMerchantPurchase).toBe(true);
 expect((await saved(page)).inventoryLedger).toEqual(before.inventoryLedger);
 await input.fill('I will buy a dagger');await send.click();
 await expect.poll(async()=>Boolean((await saved(page)).pendingMerchantPurchase)).toBe(true);
 await input.fill('yes');await send.click();
 await expect.poll(async()=>Boolean((await saved(page)).completedMerchantPurchaseIds?.length)).toBe(true);
 const purchased=await saved(page);
 await input.fill('yes');await send.click();
 await page.waitForTimeout(500);
 expect((await saved(page)).inventoryLedger).toEqual(purchased.inventoryLedger);
 expect((await saved(page)).completedMerchantPurchaseIds).toEqual(purchased.completedMerchantPurchaseIds);
});

test('merchant catalog reflects finite stock and refuses unavailable quantities',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');
 await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The general store is open.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 const send=page.getByRole('button',{name:'Send message to Dungeon Master'});
 await input.fill('What do you sell?');await send.click();
 await expect(page.getByLabel('Dasahi marketplace').getByLabel('Current merchant')).toContainText('General');
 await expect(page.getByLabel('Dasahi marketplace').getByLabel('Dagger',{exact:true})).toContainText('12 in stock');
 await page.getByLabel('Dasahi marketplace').getByRole('button',{name:'Leave shop'}).click();
 await input.fill('I will buy 99999 daggers');await send.click();
 expect((await saved(page)).pendingMerchantPurchase).toBeUndefined();
 await input.fill('I will buy 2 daggers');await send.click();
 await expect.poll(async()=>Boolean((await saved(page)).pendingMerchantPurchase)).toBe(true);
 await input.fill('yes');await send.click();
 await expect.poll(async()=>(await saved(page)).merchantStockRemaining?.['location:dasahi:city:general:dagger']).toBe(10);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).merchantStockRemaining['location:dasahi:city:general:dagger']).toBe(10);
});
test('conversational sling ammunition packs use canonical price and persist 40 projectiles',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The general store is open.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 const send=page.getByRole('button',{name:'Send message to Dungeon Master'});
 const before=await saved(page);
 await input.fill('I will buy 2 packs of sling bullets');await send.click();
 await expect.poll(async()=>(await saved(page)).pendingMerchantPurchase?.unitCostCp).toBe(4);
 const pending=await saved(page);
 expect(pending.inventoryLedger).toEqual(before.inventoryLedger);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByLabel('Message the Dungeon Master').fill('yes');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=>(await saved(page)).merchantStockRemaining?.['location:dasahi:city:weaponsmith:bullets-sling']).toBe(58);
 const after=await saved(page);
 expect(after.inventoryLedger.gear).toContainEqual({name:'Bullets, Sling (20)',quantity:40});
 expect(after.completedMerchantPurchaseIds).toContain(pending.pendingMerchantPurchase.id);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).merchantStockRemaining['location:dasahi:city:weaponsmith:bullets-sling']).toBe(58);
});
test('merchant negotiation requires a persisted social check and never spends without purchase confirmation',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',async route=>{
  const body=route.request().postDataJSON();
  const result=body.checkToken
    ? {narration:'The merchant grudgingly agrees to a discount.',checkResult:{skill:'Persuasion',dice:[20],kept:20,modifier:3,total:23,success:true},newFacts:[],worldUpdates:{}}
    : body.message?.includes('negotiate')
      ? {narration:'I might consider it. Make your case.',merchantDiscount:{itemId:'dagger',percent:20},checkRequest:{skill:'Persuasion',mode:'normal',reason:'Negotiate dagger price',token:'merchant-test-token'},newFacts:[],worldUpdates:{}}
      : {narration:'The shopkeeper is ready.',newFacts:[],worldUpdates:{}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 const send=page.getByRole('button',{name:'Send message to Dungeon Master'});
 await input.fill('Can you negotiate a discount on a dagger?');await send.click();
 await expect.poll(async()=>(await saved(page)).pendingMerchantNegotiation?.itemId).toBe('dagger');
 expect((await saved(page)).merchantDiscount).toBeUndefined();
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByRole('button',{name:'Roll Persuasion'}).click();
 await expect.poll(async()=>(await saved(page)).merchantDiscount?.percent).toBe(20);
 expect((await saved(page)).pendingMerchantNegotiation).toBeUndefined();
 await page.getByLabel('Message the Dungeon Master').fill('I will buy a dagger');await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=>(await saved(page)).pendingMerchantPurchase?.unitCostCp).toBe(160);
 const before=await saved(page);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).inventoryLedger).toEqual(before.inventoryLedger);
 await page.getByLabel('Message the Dungeon Master').fill('yes');await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=>!(await saved(page)).pendingMerchantPurchase).toBe(true);
 expect((await saved(page)).merchantDiscount).toBeUndefined();
});
test('imported character sheet excludes developer tools and rest controls',async({page})=>{
 await createAndImport(page,'rogue');
 await navigate(page,'Player');
 const sheet=page.getByLabel('Imported player character');
 await expect(sheet.getByLabel('Character details')).toBeVisible();
 await expect(sheet.getByLabel('Player ability scores')).toBeVisible();
 await expect(sheet.getByText('Subclass actor management')).toHaveCount(0);
 await expect(sheet.getByText('Rest and recover')).toHaveCount(0);
 await expect(sheet.getByLabel('Manual XP award')).toHaveCount(0);
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 const nav=page.getByRole('navigation',{name:'Primary navigation'});
 await expect(nav.getByRole('button').last()).toContainText('Developer');
 await nav.getByRole('button',{name:'Developer'}).click();
 await expect(page.getByLabel('Imported player development tools')).toBeVisible();
 await expect(page.getByText('Subclass actor management').first()).toBeVisible();
 await expect(page.getByLabel('Manual XP award')).toBeVisible();
 await navigate(page,'Player');
 await expect(page.getByLabel('Manual XP award')).toHaveCount(0);
});


test('imported Rogue requests DM rest, confirms exactly once, and reloads',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');
 await expect.poll(async()=>Boolean((await saved(page))?.characterIdentity)).toBe(true);
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on')});
 const requests:any[]=[];
 await page.route('**/api/dm',route=>{const body=route.request().postDataJSON();requests.push(body);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body.restRequest?{narration:'The watchkeeper confirms the inn is safe and uninterrupted.',restDecision:'approved'}:{narration:'The village is quiet.',worldUpdates:{},newFacts:[]})})});
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 await page.getByLabel('Message the Dungeon Master').fill('I want to take a short rest');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByRole('dialog',{name:'Rest recovery options'})).toBeVisible();
 expect(requests.at(-1).restRequest).toBe('short');
 const before=await saved(page);
 await page.getByRole('dialog',{name:'Rest recovery options'}).getByRole('button',{name:'Cancel'}).click();
 expect((await saved(page)).elapsedMinutes).toBe(before.elapsedMinutes);
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByRole('dialog',{name:'Rest recovery options'})).toBeVisible();
 await page.getByRole('button',{name:'Finish Short Rest'}).click();
 await expect(page.getByRole('dialog',{name:'Rest recovery options'})).toHaveCount(0);
 const after=await saved(page);
 expect(after.elapsedMinutes).toBe((before.elapsedMinutes??0)+60);
 await page.reload();
 await expect.poll(async()=>(await saved(page))?.elapsedMinutes).toBe(after.elapsedMinutes);
});

test('DM denial never grants imported rest recovery',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');
 await expect.poll(async()=>Boolean((await saved(page))?.characterIdentity),{timeout:15000}).toBe(true);
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on')});
 await page.route('**/api/dm',route=>{const body=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body.restRequest?{narration:'Bandits interrupt the attempted rest.',restDecision:'denied'}:{narration:'The village is quiet.',newFacts:[],worldUpdates:{}})})});
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await expect(page.getByRole('button',{name:'Continue Adventure'})).toBeEnabled({timeout:15000});await page.getByRole('button',{name:'Continue Adventure'}).click();await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening')),{timeout:30000}).toBe(true);
 const before=await saved(page);
 await page.getByLabel('Message the Dungeon Master').fill('I want to take a long rest');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('The DM denied or interrupted the rest. No resources changed.')).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Rest recovery options'})).toHaveCount(0);
 const after=await saved(page);
 expect(after.elapsedMinutes).toBe(before.elapsedMinutes);
 expect(after.character.currentHitPoints).toBe(before.character.currentHitPoints);
});

test('invalid DM map batch is rejected without partial locations and later valid discovery survives reload',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'fighter');
 await expect.poll(async()=>Boolean((await saved(page))?.characterIdentity)).toBe(true);
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 let turns=0;
 const site={id:'dm-recovery-lanterns',name:'Recovery Lanterns',description:'A camp on the Dasahi road',x:60,y:72,kind:'minor',createdAt:1000,discovered:true};
 await page.route('**/api/dm',async route=>{
  const body=route.request().postDataJSON();
  if(!body.opening)turns++;
  const actions=body.opening?[]:turns===1?[{type:'create',site},{type:'update',id:'dm-recovery-lanterns',archived:'false'}]:[{type:'create',site}];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:body.opening?'The watchkeeper stands near the Dasahi gate.':'The watchkeeper describes lanterns beside the road.',newFacts:[],worldUpdates:{},mapActions:actions,combatStart:null})});
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 await page.getByLabel('Message the Dungeon Master').fill('I investigate the lanterns outside Dasahi.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.text?.includes('lanterns beside the road')||entry.narration?.includes('lanterns beside the road'))).toBe(true);
 expect((await saved(page)).mapDynamicSites?.filter((s:any)=>s.id==='dm-recovery-lanterns')??[]).toHaveLength(0);
 await page.getByLabel('Message the Dungeon Master').fill('I ask again where the lanterns are.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=> (await saved(page)).mapDynamicSites?.filter((s:any)=>s.id==='dm-recovery-lanterns').length).toBe(1);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).mapDynamicSites?.filter((s:any)=>s.id==='dm-recovery-lanterns')).toHaveLength(1);
});

test('conflicting provider transitions are rejected before narration and retry preserves the same player action',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'fighter');
 await expect.poll(async()=>Boolean((await saved(page))?.characterIdentity)).toBe(true);
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const requests:any[]=[];let conflicting=true;
 await page.route('**/api/dm',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  const result=body.opening?{narration:'The Dasahi watchkeeper greets you at the gate.'}:{narration:conflicting?'You travel and fight simultaneously.':'The watchkeeper explains the road is safe.',combatStart:conflicting?{enemyName:'Bandit'}:null,travelDestination:conflicting?'crossroads':null};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...result,newFacts:[],worldUpdates:{},mapActions:[]})});
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((e:any)=>e.id?.endsWith('-dm-opening'))).toBe(true);
 const initial=await saved(page);
 await page.getByLabel('Message the Dungeon Master').fill('I ask about the road ahead.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByRole('button',{name:'Retry saved action'})).toBeVisible();
 const pending=await saved(page);
 expect(pending.pendingAdventureAction.message).toBe('I ask about the road ahead.');
 expect(pending.journal).toEqual(initial.journal);
 expect(pending.adventureSession).toEqual(initial.adventureSession);
 expect(pending.combat).toEqual(initial.combat);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 conflicting=false;
 await page.getByRole('button',{name:'Retry saved action'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The watchkeeper explains the road is safe.');
 const last=await saved(page);
 expect(last.pendingAdventureAction).toBeUndefined();
 expect(last.journal.filter((e:any)=>e.id===pending.pendingAdventureAction.id+'-player')).toHaveLength(1);
 expect(requests.at(-1).actionId).toBe(pending.pendingAdventureAction.id);
 expect(last.combat).toEqual(initial.combat);
});


test('fresh iPhone campaign Journal records encounters, people, places and read-only recall across reload',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await createAndImport(page,'rogue');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 let calls=0;
 await page.route('**/api/dm',async route=>{
  calls++;
  const body=route.request().postDataJSON();
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   narration:body.opening?'The road leads toward the village. A bell rings above the gate.':'Mira points toward the old bridge and warns that a wagon broke there.',
   newFacts:[],combatStart:null,
   worldUpdates:{npcs:[{name:'Mira',role:'Watchkeeper',location:'Dasahi',relationship:'neutral',notes:['The bridge is damaged']}],places:[{name:'Old Bridge',description:'A damaged crossing',notes:['A wagon broke here']}]}
  })});
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=>Boolean((await saved(page))?.journal?.some((e:any)=>e.kind==='dm'))).toBe(true);
 await page.getByLabel('Message the Dungeon Master').fill('I ask Mira about the old bridge.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect.poll(async()=>Boolean((await saved(page))?.encounterJournal?.some((e:any)=>e.playerAction?.includes('Mira')))).toBe(true);
 const before=JSON.stringify(await saved(page));
 await navigate(page,'Journal');
 const nav=page.getByRole('navigation',{name:'Journal sections'});
 await expect(nav.getByRole('button')).toHaveCount(3);
 await expect(page.getByText('Level 1',{exact:true})).toBeVisible();
 const encounter=page.locator('article').filter({hasText:'Mira points toward the old bridge'}).first();
 await encounter.getByRole('button').click();
 await expect(encounter).toContainText('I ask Mira about the old bridge.');
 await expect(encounter).toContainText('Mira points toward the old bridge');
 await nav.getByRole('button',{name:'People'}).click();
 await expect(page.locator('details').filter({hasText:'Mira'}).last()).toBeVisible();
 await nav.getByRole('button',{name:'Places'}).click();
 await expect(page.locator('details').filter({hasText:'Old Bridge'}).last()).toBeVisible();
 await page.getByLabel('Ask the DM about campaign history').getByRole('textbox').fill('What do we know about Mira?');
 await page.getByLabel('Ask the DM about campaign history').getByRole('button').click();
 await expect(page.getByText('The bridge is damaged',{exact:false}).last()).toBeVisible();
 expect(JSON.stringify(await saved(page))).toBe(before);
 expect(calls).toBeGreaterThanOrEqual(2);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await navigate(page,'Journal');
 await expect(page.locator('article').filter({hasText:'Mira points toward the old bridge'})).toHaveCount(1);
 await nav.getByRole('button',{name:'People'}).click();
 await expect(page.locator('details').filter({hasText:'Mira'}).last()).toBeVisible();
 await nav.getByRole('button',{name:'Places'}).click();
 await expect(page.locator('details').filter({hasText:'Old Bridge'}).last()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});


test('DM treats custom leatherwork inquiry as dialogue without a merchant transaction',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await createAndImport(page,'rogue');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const requests:any[]=[];
 await page.route('**/api/dm',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   narration:body.opening?'Dasahi awakens around you.':'You could ask around the market for a leatherworker or an armorer. Would you like to inquire with the locals?',
   newFacts:[],worldUpdates:{},mapActions:[]
  })});
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=>Boolean((await saved(page))?.journal?.some((e:any)=>e.kind==='dm'))).toBe(true);
 const before=await saved(page);
 await page.getByLabel('Message the Dungeon Master').fill('Can I look around for where I could get a leather arm warmer made?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('ask around the market for a leatherworker');
 const after=await saved(page);
 expect(requests.length).toBeGreaterThanOrEqual(2);
 expect(after.pendingMerchantPurchase).toBeUndefined();
 expect(after.inventoryLedger).toEqual(before.inventoryLedger);
 expect(after.merchantStockRemaining).toEqual(before.merchantStockRemaining);
 expect(after.journal.some((e:any)=>e.kind==='player'&&e.text.includes('leather arm warmer'))).toBe(true);
 await expect(page.getByText('The merchant cannot prepare that purchase')).toHaveCount(0);
});


test('iPhone opening has intentional loading, safe retry and one saved opening',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await createAndImport(page,'rogue');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 let count=0;let fail=true;
 await page.route('**/api/dm',async route=>{
  const body=route.request().postDataJSON();
  if(!body.opening)throw Error('Unexpected non-opening DM call');
  count++;
  await new Promise(resolve=>setTimeout(resolve,250));
  if(fail){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporary provider issue'})});return;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The harbor bells welcome you to Dasahi.',newFacts:[],worldUpdates:{},mapActions:[]})});
 });
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 const opening=page.getByRole('region',{name:'Adventure opening'});
 await expect(opening).toContainText('Your adventure begins');
 await expect(page.getByRole('region',{name:'Adventuring consumables'})).toHaveCount(0);
 await expect(opening).toContainText('preparing your opening scene');
 await expect(page.getByLabel('Message the Dungeon Master')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Send message to Dungeon Master'})).toBeDisabled();
 await expect(opening.getByRole('button',{name:'Try opening again'})).toBeVisible();
 expect(count).toBe(1);
 fail=false;
 await opening.getByRole('button',{name:'Try opening again'}).click();
 await expect(page.getByRole('region',{name:'Adventure opening'})).toHaveCount(0);
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('harbor bells welcome you');
 expect(count).toBe(2);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('harbor bells welcome you');
 expect(count).toBe(2);
 await expect(page.getByRole('region',{name:'Adventuring consumables'})).toHaveCount(0);
 await navigate(page,'Player');
 await page.getByLabel('Jump to character section').selectOption('equipment');
 await expect(page.getByLabel('Equipment and inventory',{exact:true}).getByRole('region',{name:'Adventuring consumables'})).toBeVisible();
 expect((await saved(page)).journal.filter((entry:any)=>entry.id.endsWith('-dm-opening'))).toHaveLength(1);
});


test('iPhone adventure preserves reading position and message composer across Player and Map',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:390,height:844});
 await createAndImport(page,'rogue');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const story=Array.from({length:14},(_,i)=>'Waterfront scene '+(i+1)+': The harbor bustles with merchants and sailors.').join('\n\n');
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:story,newFacts:[],worldUpdates:{},mapActions:[]})}));
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await navigate(page,'Adventure');
 await expect(page.getByLabel('Message the Dungeon Master')).toBeVisible();
 const opening=page.getByLabel('Dungeon Master narration').first();
 await expect(opening).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,Math.min(350,document.documentElement.scrollHeight-innerHeight)));
 await page.waitForTimeout(180);
 const before=await page.evaluate(()=>window.scrollY);
 await navigate(page,'Player');
 await navigate(page,'Map');
 await expect(page.getByRole('img',{name:'Current player location: Dasahi'})).toBeVisible();
 await navigate(page,'Adventure');
 await expect(page.getByLabel('Message the Dungeon Master')).toBeVisible();
 const after=await page.evaluate(()=>window.scrollY);
 expect(Math.abs(after-before)).toBeLessThan(80);
 await expect(opening).toBeVisible();
});


test('iPhone compact adventure header uses system wordmark and map shows saved player location',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:390,height:844});
 await createAndImport(page,'rogue');
 await navigate(page,'Adventure');
 const header=page.locator('header').first();
 await expect(header.getByRole('heading',{name:'Four Keeps'})).toBeVisible();
 await expect(header.locator('img[alt="Four Keeps"]')).toHaveCount(0);
 await expect(header.getByText('Adventure',{exact:true})).toHaveCount(0);
 await expect(header.getByText(/Nighthawk.*2026|Dasahi/)).toHaveCount(0);
 const heading=header.getByRole('heading',{name:'Four Keeps'});
 expect(await heading.evaluate(el=>getComputedStyle(el).fontFamily)).toContain('system-ui');
 await navigate(page,'Map');
 await expect(page.getByRole('img',{name:'Current player location: Dasahi'})).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await navigate(page,'Map');
 await expect(page.getByRole('img',{name:'Current player location: Dasahi'})).toBeVisible();
});


test('iPhone Dasahi opening offers a voluntary waterfront store with readable dialogue and browse handoff',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:390,height:844});
 await createAndImport(page,'rogue');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const opening='You step off the boat onto Dasahi’s waterfront. The general store beside the dock has an open door. The harbor smells of salt and fresh bread. Fishermen are hauling crates while the morning sun climbs over the rooftops. There is plenty to see along the waterfront, and no one stops you from exploring.\n\nMara: “Welcome ashore! Come browse if you need supplies.”\n\nBeyond the store, a narrow lane leads toward the city.';
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:opening,newFacts:[],worldUpdates:{},mapActions:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const narration=page.getByLabel('Dungeon Master narration').first();
 await expect(narration).toBeVisible();await narration.click();
 await expect(narration.locator('blockquote')).toHaveCount(1);
 await expect(narration.locator('blockquote')).toContainText('Mara');
 expect(await narration.locator('p').count()).toBeGreaterThanOrEqual(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 const before=await saved(page);
 expect(before.merchantShopOpen).not.toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('Can I take a look at your goods?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Dasahi marketplace')).toBeVisible();
 const inventory=page.getByRole('region',{name:'Merchant inventory'});
 await expect(inventory).toHaveCSS('overflow-y','visible');
 expect(await inventory.evaluate(list=>list.scrollTop)).toBe(0);
 await expect(inventory).toHaveCSS('background-color','rgb(50, 44, 36)');
 expect(await inventory.evaluate(list=>list.scrollHeight-list.clientHeight)).toBeLessThanOrEqual(1);
 await inventory.focus();
 await expect(inventory).toBeFocused();
 await page.getByLabel('Search merchandise').fill('Torch');
 const torch=page.getByLabel('Torch',{exact:true});
 await expect(torch.getByLabel('Torch availability')).toContainText(/Torch.*\d+ owned · \d+ in stock/);
 await expect(torch.getByLabel('Torch description')).toBeVisible();
 await expect(torch.getByText('Bright Light out to 20 feet',{exact:false})).toBeVisible();
 await expect(torch.getByText('1 lb.',{exact:true})).toBeVisible();
 await expect(torch.getByRole('button',{name:'Add Torch'})).toBeEnabled();
 const torchName=await torch.getByText('Torch',{exact:true}).boundingBox();
 const torchCounts=await torch.getByText(/\d+ owned · \d+ in stock/).boundingBox();
 expect(torchCounts!.x).toBeGreaterThan(torchName!.x + torchName!.width);
 expect(Math.abs(torchCounts!.y-torchName!.y)).toBeLessThan(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 const after=await saved(page);
 expect(after.pendingMerchantPurchase).toBeUndefined();
 expect(after.completedMerchantPurchaseIds??[]).toEqual(before.completedMerchantPurchaseIds??[]);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Dasahi marketplace')).toBeVisible();
 expect((await saved(page)).journal.filter((entry:any)=>entry.id?.endsWith('-dm-opening'))).toHaveLength(1);
});


test('iPhone narration uses paragraphs, speaker dialogue and survives reload',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await createAndImport(page,'rogue');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 const story='Morning settles over\nDasahi.\n\nMara: "Fresh figs!"\n\nThe cart moves on.\n\nGuard: "Keep moving."';
 let calls=0;
 await page.route('**/api/dm',async route=>{
  calls++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:story,newFacts:[],worldUpdates:{},mapActions:[]})});
 });
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 const narration=page.getByLabel('Dungeon Master narration').first();
 await expect(narration).toBeVisible();
 await expect(narration.locator('p').first()).toContainText('Morning');
 // Each progressive unit is a measured visual line within its paragraph.
 expect(await narration.locator('span.dm-narration-line').count()).toBeGreaterThan(0);
 await narration.click();
 await expect(narration.locator('p')).toHaveCount(4);
 await expect(narration.locator('blockquote')).toHaveCount(2);
 await expect(narration.locator('blockquote').first()).toContainText('Mara');
 await expect(narration.locator('blockquote').last()).toContainText('Guard');
 await expect(narration.locator('p').first()).toHaveText('Morning settles over Dasahi.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 const original=(await saved(page)).journal.find((entry:any)=>entry.id.endsWith('-dm-opening')).text;
 expect(original).toBe(story);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Dungeon Master narration').first().locator('blockquote')).toHaveCount(2);
 expect(calls).toBe(1);
});

test('iPhone city supplier ordering confirms, persists, delivers and collects once',async({page})=>{
 test.setTimeout(120000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The weaponsmith checks the supplier ledger.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('four-keeps-local',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const tx=db.transaction('campaigns','readwrite');const store=tx.objectStore('campaigns');
  const all=await new Promise<any[]>((resolve,reject)=>{const req=store.getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const c=all[0];c.merchantStockRemaining={...c.merchantStockRemaining,'location:dasahi:city:weaponsmith:dagger':0};store.put(c);
  await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('Can the blacksmith special-order a dagger that is out of stock?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const shop=page.getByLabel('Dasahi marketplace');
 await expect(shop).toBeVisible();
 await expect(shop.getByLabel('City supplier orders')).toContainText('Dagger');
 const before=(await saved(page)).inventoryLedger;
 await shop.getByRole('button',{name:'Order',exact:true}).first().click();
 await expect(shop.getByLabel('Confirm supplier order')).toBeVisible();
 expect((await saved(page)).inventoryLedger).toEqual(before);
 await shop.getByLabel('Confirm supplier order').getByRole('button',{name:'Confirm order'}).click();
 await expect.poll(async()=> (await saved(page)).merchantSupplyOrders?.length).toBe(1);
 expect((await saved(page)).inventoryLedger.gear).toEqual(before.gear);
 const paid=(await saved(page)).inventoryLedger.currency;
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('City supplier orders')).toContainText('Ready at minute');
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('four-keeps-local',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const tx=db.transaction('campaigns','readwrite');const store=tx.objectStore('campaigns');
  const all=await new Promise<any[]>((resolve,reject)=>{const req=store.getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const c=all[0];c.elapsedMinutes=c.merchantSupplyOrders[0].readyAtMinutes;store.put(c);
  await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByLabel('City supplier orders').getByRole('button',{name:'Collect'}).click();
 await expect.poll(async()=> (await saved(page)).merchantSupplyOrders?.[0]?.status).toBe('collected');
 expect((await saved(page)).inventoryLedger.currency).toEqual(paid);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('City supplier orders').getByRole('button',{name:'Collect'})).toHaveCount(0);
 expect((await saved(page)).merchantSupplyOrders[0].status).toBe('collected');
});

test('iPhone traveling merchant registers a route and resupplies only after validated arrival',async({page})=>{
 test.setTimeout(120000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The trader follows the road.',worldUpdates:{},newFacts:[],travelDestination:'crossroads'})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('four-keeps-local',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const tx=db.transaction('campaigns','readwrite');const store=tx.objectStore('campaigns');
  const all=await new Promise<any[]>((resolve,reject)=>{const req=store.getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const c=all[0];c.merchantSettlementTier='traveling';c.merchantShopType='trader';c.merchantShopOpen=true;c.merchantStockRemaining={...c.merchantStockRemaining,['traveler:'+c.id+':traveling:trader:torch']:0};store.put(c);
  await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const shop=page.getByLabel('Traveling merchant',{exact:true});await expect(shop).toBeVisible();
 await expect(shop.getByLabel('Traveling merchant supply route')).toBeVisible();
 expect((await saved(page)).merchantTraderResupply).toBeUndefined();
 await shop.getByRole('button',{name:'Begin verified supply route'}).click();
 await expect.poll(async()=> (await saved(page)).merchantTraderRoute?.nextStopIndex).toBe(1);
 expect((await saved(page)).merchantTraderResupply).toBeUndefined();
 await page.getByLabel('Message the Dungeon Master').fill('Travel along the road to the crossroads');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=> (await saved(page)).merchantTraderRoute?.nextStopIndex).toBe(2);
 const arrived=await saved(page);expect(Object.keys(arrived.merchantTraderResupply??{})).toHaveLength(1);
 expect(arrived.merchantStockRemaining['traveler:'+arrived.id+':traveling:trader:torch']).toBeGreaterThan(0);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect(Object.keys((await saved(page)).merchantTraderResupply??{})).toHaveLength(1);
});


test('iPhone merchant cart hands off an editable unsent message and preserves quoted order on send',async({page})=>{
 test.setTimeout(120000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The merchant presents the catalog.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('Show me what you have for sale.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const shop=page.getByLabel('Dasahi marketplace');
 await expect(shop).toBeVisible();
 await shop.getByRole('button',{name:'Add Dagger'}).click();
 await expect(shop.getByLabel('Dagger',{exact:true})).toContainText('piercing');
 const before=(await saved(page)).inventoryLedger;
 await shop.getByRole('button',{name:'Discuss order with DM'}).click();
 await expect(shop).toHaveCount(0);
 await expect(input).toHaveValue(/1 × Dagger/);
 expect((await saved(page)).inventoryLedger).toEqual(before);
 await input.fill((await input.inputValue())+' Can we discuss the price?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=>Boolean((await saved(page)).pendingMerchantPurchase)).toBe(true);
 expect((await saved(page)).inventoryLedger).toEqual(before);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).pendingMerchantPurchase).toBeTruthy();
});


test('iPhone merchant negotiation hides DC, rolls, and keeps confirmation explicit',async({page})=>{
 test.setTimeout(120000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The merchant opens the catalog.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('Show me what you have for sale.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const shop=page.getByLabel('Dasahi marketplace');await expect(shop).toBeVisible();
 await shop.getByRole('button',{name:'Add Dagger'}).click();
 await shop.getByRole('button',{name:'Discuss order with DM'}).click();
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Pending merchant order')).toBeVisible();
 const original=(await saved(page)).inventoryLedger;
 await input.fill('Could you give me 10% off?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Pending skill check')).toBeVisible();
 await expect(page.getByLabel('Pending skill check')).not.toContainText('DC 15');
 await expect(page.getByLabel('Pending merchant order').getByRole('button',{name:'Confirm Purchase'})).toBeDisabled();
 await page.getByRole('button',{name:'Roll Persuasion'}).click();
 await expect(page.getByLabel('Pending skill check')).toHaveCount(0);
 expect((await saved(page)).inventoryLedger).toEqual(original);
 expect((await saved(page)).merchantCartNegotiation?.attempted).toBe(true);
 await input.fill('Can I try for 5% off instead?');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText(/cannot be renegotiated/i)).toBeVisible();
 await page.getByLabel('Pending merchant order').getByRole('button',{name:'Confirm Purchase'}).click();
 await expect(page.getByLabel('Pending merchant order')).toHaveCount(0);
 const after=await saved(page);
 expect(after.pendingMerchantPurchase).toBeUndefined();
 expect(after.completedMerchantPurchaseIds?.length).toBeGreaterThan(0);
 const transactionIds=after.completedMerchantPurchaseIds;
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).completedMerchantPurchaseIds).toEqual(transactionIds);
});


test('iPhone natural merchant chat acceptance buys a pending cart exactly once after reload',async({page})=>{
 test.setTimeout(120000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The smith lays out the merchandise.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('Show me what you have for sale.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const shop=page.getByLabel('Dasahi marketplace');await expect(shop).toBeVisible();
 await shop.getByRole('button',{name:'Add Dagger'}).click();
 await shop.getByRole('button',{name:'Add Club'}).click();
 await shop.getByRole('button',{name:'Discuss order with DM'}).click();
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Pending merchant order')).toBeVisible();
 const pending=(await saved(page)).pendingMerchantPurchase;
 expect(pending.lines).toHaveLength(2);
 const before=(await saved(page)).inventoryLedger;
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await input.fill('You have a deal.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect.poll(async()=> (await saved(page)).completedMerchantPurchaseIds?.includes(pending.id)).toBe(true);
 const paid=await saved(page);
 expect(paid.inventoryLedger).not.toEqual(before);
 expect(paid.journal.at(-1)?.text??'').not.toContain('DC ');
 await input.fill('You have a deal.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 expect((await saved(page)).completedMerchantPurchaseIds.filter((id:string)=>id===pending.id)).toHaveLength(1);
});


test('iPhone canceling an editable merchant chat draft never creates an order or spends money',async({page})=>{
 test.setTimeout(120000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The smith shows the equipment.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('Show me what you have for sale.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const shop=page.getByLabel('Dasahi marketplace');await expect(shop).toBeVisible();
 await shop.getByRole('button',{name:'Add Dagger'}).click();
 const before=await saved(page);
 await shop.getByRole('button',{name:'Discuss order with DM'}).click();
 await expect(input).toHaveValue(/1 × Dagger/);
 await input.fill('Never mind.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Unsubmitted order canceled. No money was spent.')).toBeVisible();
 const after=await saved(page);
 expect(after.pendingMerchantPurchase).toBeUndefined();
 expect(after.merchantCartDraft).toBeUndefined();
 expect(after.inventoryLedger).toEqual(before.inventoryLedger);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).pendingMerchantPurchase).toBeUndefined();
 expect((await saved(page)).merchantCartDraft).toBeUndefined();
});


test('iPhone abandoning an unsent merchant cart clears it without spending',async({page})=>{
 test.setTimeout(120000);
 await createAndImport(page,'rogue');await navigate(page,'Adventure');
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.route('**/api/dm',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The merchant offers to show you the goods.',worldUpdates:{},newFacts:[]})}));
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect.poll(async()=> (await saved(page))?.journal?.some((entry:any)=>entry.id?.endsWith('-dm-opening'))).toBe(true);
 const input=page.getByLabel('Message the Dungeon Master');
 await input.fill('Show me what you have for sale.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 const shop=page.getByLabel('Dasahi marketplace');await expect(shop).toBeVisible();
 await shop.getByRole('button',{name:'Add Dagger'}).click();
 const before=(await saved(page)).inventoryLedger;
 await shop.getByRole('button',{name:'Discuss order with DM'}).click();
 expect((await saved(page)).merchantCartDraft).toBeTruthy();
 await navigate(page,'Player');
 await expect.poll(async()=> (await saved(page)).merchantCartDraft).toBeFalsy();
 expect((await saved(page)).pendingMerchantPurchase).toBeUndefined();
 expect((await saved(page)).inventoryLedger).toEqual(before);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 expect((await saved(page)).merchantCartDraft).toBeUndefined();
});
