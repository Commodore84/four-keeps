import {test,expect,type Page} from '@playwright/test';
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
 const cfg=config[id];await page.goto('/four-keeps/');await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:'Create character',exact:true}).click();
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
 await page.getByRole('button',{name:/Home/}).click();await page.getByRole('button',{name:'New Adventure'}).click();const value=await page.getByLabel('Starting character').getByRole('option',{name:new RegExp(id+' Hero')}).getAttribute('value');await page.getByLabel('Starting character').selectOption(value!);await page.getByLabel('Campaign name',{exact:true}).fill(id+' Full Journey');await page.getByRole('button',{name:'Create campaign',exact:true}).click();
}
async function saved(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise<any>(resolve=>{const r=db.transaction('campaigns','readonly').objectStore('campaigns').getAll();r.onsuccess=()=>{db.close();resolve(r.result[0]);};});});}
for(const id of ['fighter','rogue','cleric','wizard'] as const)test(id+' complete creation, solo encounter, rewards, short/long rest and resume',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await createAndImport(page,id);
 const snapshot=structuredClone((await saved(page)).characterBuild);expect(snapshot.selections.equipment.equipped.weapons).toHaveLength(1);
 await openDevelopment(page);
 const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();await session.getByRole('button',{name:'Speak with the watchkeeper'}).click();await session.getByRole('button',{name:'Travel to Old Crossroads'}).click();await session.getByRole('button',{name:'Travel to Old Watchtower'}).click();await expect(session).toContainText('Visited 3/3 locations');
 if(id==='wizard'){
  await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-only-test-code');localStorage.setItem('four-keeps-dm-mode','on');});await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();let sent:any;
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
 await session.getByLabel('Encounter reward XP').fill('30');await session.getByLabel('Encounter reward gold').fill('5');await session.getByLabel('Encounter reward item',{exact:true}).fill(id+' keepsake');await session.getByRole('button',{name:'Save encounter rewards'}).click();await expect(session).toContainText('Rewards saved: 30 XP');await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await openDevelopment(page);await expect(session).toContainText('Rewards saved: 30 XP');
 let c=await saved(page);expect(c.character.currentHitPoints).toBe(config[id].hp-3);expect(c.characterBuild).toEqual(snapshot);if(id==='cleric'){expect(c.character.resources['Magic Initiate'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(1);}if(id==='rogue')expect(c.inventoryLedger.gear.find((g:any)=>g.name==='Dagger').quantity).toBe(3);
 await session.getByRole('button',{name:'Resume exploration after encounter'}).click();const rest=session.getByLabel('Player rest recovery');await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByLabel('Rest Hit Die result').fill('1');if(id==='wizard')await rest.getByRole('checkbox',{name:/Use Arcane Recovery/}).check();await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toHaveText('Rest completed and saved.');
 c=await saved(page);expect(c.hitDiceRemaining).toBe(0);expect(c.character.currentHitPoints).toBe(config[id].hp);if(id==='fighter')expect(c.character.resources['Second Wind'].used).toBe(0);if(id==='wizard'){expect(c.character.resources['Arcane Recovery'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(0);}if(id==='cleric')expect(c.character.spellSlots.usedLevel1).toBe(1);
 await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByRole('button',{name:'Complete long rest'}).click();await expect.poll(async()=>(await saved(page)).hitDiceRemaining).toBe(1);await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();c=await saved(page);expect(c.hitDiceRemaining).toBe(1);expect(c.character.currentHitPoints).toBe(config[id].hp);expect(c.characterBuild).toEqual(snapshot);expect(c.xp).toBe(30);if(c.character.spellSlots)expect(c.character.spellSlots.usedLevel1).toBe(0);for(const pool of Object.values(c.character.resources??{}) as any[])expect(pool.used).toBe(0);
 if(id==='fighter'){await openDevelopment(page);const again=session.getByLabel('Player rest recovery');await again.getByRole('checkbox',{name:/DM confirms safe/}).check();await expect(again.getByRole('button',{name:'Complete long rest'})).toBeDisabled();await again.getByRole('checkbox',{name:/Include 960 minutes/}).check();await again.getByRole('button',{name:'Complete long rest'}).click();await expect(again.getByRole('status')).toHaveText('Rest completed and saved.');expect((await saved(page)).elapsedMinutes).toBe(1980);}
 await navigate(page,'Player');await expect(page.getByLabel('Saved character build')).toContainText('Saved level-one choices');expect(errors).toEqual([]);
});

test('rest save failure preserves Hit Dice, reports the failure, and permits a successful retry',async({page})=>{
 test.setTimeout(60000);await createAndImport(page,'fighter');await openDevelopment(page);
 const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();const rest=session.getByLabel('Player rest recovery');
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
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const requests:any[]=[];let failure:string|null=null;
 await page.route('**/api/dm',async route=>{
   const body=route.request().postDataJSON();requests.push(body);
   if(failure){await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:failure})});return;}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:body.opening?'A bell tolls from the abandoned keep.':'Mira says the bell rang at dusk.',newFacts:['A bell rang at dusk'],worldUpdates:{npcs:[{name:'Mira',role:'Watchkeeper',location:'Frontier Village',relationship:'neutral',notes:['Knows the old road']}],clues:[{text:'A stranger passed at dusk',evidence:'reported',source:'Mira'}]},combatStart:null})});
 });
 await page.getByRole('button',{name:'Begin AI-led adventure'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('A bell tolls from the abandoned keep.');
 await expect(page.getByLabel('Adventure journal')).toContainText('1 people · 1 clues');
 await page.getByLabel('Adventure journal').locator('summary').click();
 await expect(page.getByLabel('Adventure journal')).toContainText('Mira');
 await expect(page.getByLabel('Adventure journal')).toContainText('reported');
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
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
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
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
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const calls:any[]=[];let firstFightClarified=false;
 await page.route('**/api/dm',async route=>{
  const request=route.request().postDataJSON();calls.push(request);
  const opening=request.opening;
  const secondFight=!opening && request.message.includes('investigate the riverbank');
  const firstFight=!opening && request.message.includes('approach the bridge');
  const combat=firstFight || secondFight;
  if(firstFight && !request.clarification?.answer){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The guard gestures toward the bridge.',clarificationRequest:{question:'Do you approach the guarded bridge or the unguarded ford?'},combatStart:null,newFacts:[],worldUpdates:{}})});
   return;
  }
  if(firstFight && request.clarification?.answer)firstFightClarified=true;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   narration:opening?'The old bridge is watched by the town guard.':secondFight?'A poacher blocks the riverbank with a drawn blade.':combat?'A highway robber draws a sword and attacks.':'The guard acknowledges your return and the bridge is safe.',
   combatStart:combat?{enemyName:secondFight?'Poacher':'Highway robber'}:null,newFacts:combat?['A highway robber attacked the bridge']:['The bridge is safe after the battle'],
   worldUpdates:combat?{clues:[{text:'A robber attacked the bridge',evidence:'confirmed',source:'Fighter'}]}:{quests:[{title:'Secure the bridge',status:'completed',objective:'Defeat the robber',notes:['The bridge is safe']}]}
  })});
 });
 await page.getByRole('button',{name:'Begin AI-led adventure'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The old bridge');
 await page.getByLabel('Message the Dungeon Master').fill('I approach the bridge cautiously.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('guarded bridge');
 const beforeClarification=await saved(page);
 expect(beforeClarification.adventureSession.pendingEncounter).toBeFalsy();
 expect(beforeClarification.pendingAdventureAction.message).toBe('I approach the bridge cautiously.');
 const originalActionId=beforeClarification.pendingAdventureAction.id;
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByLabel('Answer the Dungeon Master').fill('I mean the guarded bridge. I approach cautiously.');
 await page.getByRole('button',{name:'Confirm and continue'}).click();
 await expect(page.getByText('Opponent: Highway robber',{exact:false})).toBeVisible();
 expect(firstFightClarified).toBe(true);
 expect(calls.at(-1).actionId).toBe(originalActionId);
 expect(calls.at(-1).clarification.answer).toContain('guarded bridge');

 await expect(page.getByRole('button',{name:'Send message to Dungeon Master'})).toBeDisabled();
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const before=await saved(page);
 expect(before.adventureSession.pendingEncounter.enemyName).toBe('Highway robber');
 expect(before.location).toBe(original.location);
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
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const afterBattle=await saved(page);
 expect(afterBattle.character.currentHitPoints).toBe(config.fighter.hp-3);
 expect(afterBattle.character.resources['Second Wind'].used).toBe(1);
 expect(afterBattle.inventoryLedger.currency.GP).toBe((original.inventoryLedger?.currency?.GP??0)+7);
 expect(afterBattle.inventoryLedger.gear).toEqual(expect.arrayContaining([expect.objectContaining({name:'Bridge token',quantity:1})]));
 expect(afterBattle.characterBuild).toEqual(original.characterBuild);
 expect(afterBattle.location).toBe(original.location);
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
 expect(last.location).toBe(original.location);
 expect(last.adventureSession.status).toBe('exploring');
 expect(last.inventoryLedger.currency.GP).toBe(afterBattle.inventoryLedger.currency.GP);
 expect(last.companionEncounter.settlement).toEqual(afterBattle.companionEncounter.settlement);
 expect(last.worldFacts).toContain('A highway robber attacked the bridge');
 expect(last.worldFacts).toContain('The bridge is safe after the battle');
 expect(last.world.quests.some((q:any)=>q.title==='Secure the bridge')).toBe(true);
 expect(calls.at(-1).gameState.characterIdentity.name).toBe('fighter Hero');
 expect(calls.at(-1).gameState.sharedEncounter.status).toBe('completed');
 expect(calls.at(-1).gameState.location).toBe(original.location);
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
 await createAndImport(page,'fighter');
 let calls=0;
 await page.route('**/api/dm',async route=>{
  calls++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:calls===1?'A watchman greets you.':calls===2?'Which stranger do you mean?':calls===3?'A suspicious stranger reaches for a sword.':'The stranger lowers the sword and walks away.',clarificationRequest:calls===2?{question:'Which stranger do you mean?'}:null,combatStart:calls===3?{enemyName:'Suspicious stranger'}:null,newFacts:['The watchman is present'],worldUpdates:{}})});
 });
 await page.getByRole('button',{name:'Begin AI-led adventure'}).click();
 const initial=await saved(page);
 await page.getByLabel('Message the Dungeon Master').fill('I question the stranger.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('Which stranger');
 await page.getByLabel('Answer the Dungeon Master').fill('The stranger in the blue cloak by the door.');
 await page.getByRole('button',{name:'Confirm and continue'}).click();
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
 await page.getByRole('button',{name:'Begin AI-led adventure'}).click();
 await page.getByLabel('Message the Dungeon Master').fill('I attack the dragon with my dagger');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('Are you sure');
 const paused=await saved(page);
 expect(paused.pendingAdventureAction.message).toBe('I attack the dragon with my dagger');
 expect(paused.journal.filter((e:any)=>e.text.includes('I attack the dragon'))).toHaveLength(0);
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Home'}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByLabel('Dungeon Master clarification')).toContainText('Are you sure');
 failConfirmed=true;
 await page.getByLabel('Answer the Dungeon Master').fill('Yes, I know it is dangerous. I attack.');
 await page.getByRole('button',{name:'Confirm and continue'}).click();
 await expect(page.getByRole('button',{name:'Retry confirmed action'})).toBeVisible();
 const pendingAfterError=await saved(page);
 expect(pendingAfterError.pendingClarification.answer).toContain('Yes, I know');
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Home'}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
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
 expect(calls).toEqual([{method:'GET',access:'browser-test-code'}]);
 await page.getByRole('button',{name:'Forget access code'}).click();
 await expect(page.getByLabel('DM connection status')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Check DM connection'})).toBeDisabled();
});
test('imported Rogue unlocks Cunning Action and selects Arcane Trickster spells at level three',async({page})=>{
 test.setTimeout(90000);
 await createAndImport(page,'rogue');await navigate(page,'Player');
 const sheet=page.getByLabel('Imported player character');
 await sheet.getByLabel('Manual XP award').locator('summary').click();
 await sheet.getByLabel('Award XP amount').fill('900');
 await sheet.getByLabel('Award XP reason').fill('Verified adventure rewards');
 await sheet.getByRole('button',{name:'Record XP award'}).click();
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
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 await expect(page.getByLabel('Imported player character')).toContainText('Level 3');
});

test('imported Warlock advances to Celestial and persists Pact Magic resources',async({page})=>{
 test.setTimeout(90000);await createAndImport(page,'warlock');await navigate(page,'Player');const sheet=page.getByLabel('Imported player character');
 await sheet.getByLabel('Manual XP award').locator('summary').click();await sheet.getByLabel('Award XP amount').fill('2700');await sheet.getByLabel('Award XP reason').fill('Verified rewards');await sheet.getByRole('button',{name:'Record XP award'}).click();
 await sheet.getByLabel('Level-up hit points').fill('5');await sheet.getByLabel('Warlock invocation 1').selectOption('Agonizing Blast');await sheet.getByLabel('Warlock invocation 2').selectOption('Armor of Shadows');await sheet.getByLabel('Warlock advancement spell').selectOption('Charm Person');await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 2'}).click();
 await expect(sheet).toContainText('Level 2');await sheet.getByLabel('Level-up subclass').selectOption('warlock-celestial');await sheet.getByLabel('Warlock advancement spell').selectOption('Protection from Evil and Good');await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 3'}).click();
 await expect(sheet).toContainText('Level 3');const c=await saved(page);expect(c.importedWarlockPactSlotLevel).toBe(2);expect(c.importedWarlockInvocations).toContain('Agonizing Blast');expect(c.character.resources['Healing Light'].maximum).toBe(4);await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');await expect(page.getByLabel('Imported player character')).toContainText('Level 3');
});
test('imported Wizard advances to Diviner with persistent spellbook and level-two slots',async({page})=>{
 test.setTimeout(90000);await createAndImport(page,'wizard');await navigate(page,'Player');const sheet=page.getByLabel('Imported player character');
 await sheet.getByLabel('Manual XP award').locator('summary').click();await sheet.getByLabel('Award XP amount').fill('2700');await sheet.getByLabel('Award XP reason').fill('Verified rewards');await sheet.getByRole('button',{name:'Record XP award'}).click();
 await sheet.getByLabel('Level-up hit points').fill('5');await sheet.getByLabel('Wizard spellbook addition 1').selectOption('Shield');await sheet.getByLabel('Wizard spellbook addition 2').selectOption('Sleep');
 for(const name of ['Alarm','Burning Hands','Charm Person','Magic Missile','Shield'])await sheet.getByRole('checkbox',{name:'Prepare '+name}).check();
 await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 2'}).click();await expect(sheet).toContainText('Level 2');
 await sheet.getByLabel('Level-up subclass').selectOption('wizard-diviner');await sheet.getByLabel('Wizard spellbook addition 1').selectOption('Misty Step');await sheet.getByLabel('Wizard spellbook addition 2').selectOption('Web');
 for(const name of ['Alarm','Burning Hands','Charm Person','Magic Missile','Shield','Misty Step'])await sheet.getByRole('checkbox',{name:'Prepare '+name}).check();
 await sheet.getByLabel('Wizard Portent roll 1').fill('17');await sheet.getByLabel('Wizard Portent roll 2').fill('3');await sheet.getByRole('checkbox',{name:'I confirm these level-up choices'}).check();await sheet.getByRole('button',{name:'Confirm and save level 3'}).click();
 await expect(sheet).toContainText('Level 3');const c=await saved(page);expect(c.importedSubclassId).toBe('wizard-diviner');expect(c.character.spellSlots.level2).toBe(2);expect(c.importedWizardPortents).toEqual([17,3]);expect(c.importedWizardSpellbook).toContain('Misty Step');await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');await expect(page.getByLabel('Imported player character')).toContainText('Level 3');
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
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
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
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await navigate(page,'Player');
 await expect(page.getByLabel('Imported player character')).toContainText('Level 10');
});
