import {test,expect,type Page} from '@playwright/test';
const word=(s:string)=>new RegExp('^'+s+'\\b');
type ClassId='fighter'|'rogue'|'cleric'|'wizard';
const config={
 fighter:{skills:['Perception','Acrobatics'],choices:[['Fighting Style',['Defense']],['Weapon Masteries',['Greatsword','Flail','Javelin']]],scores:{Str:15,Dex:14,Con:13,Int:12,Wis:10,Cha:8},hp:12,weapon:'Greatsword'},
 rogue:{skills:['Perception','Acrobatics','Investigation','Deception'],choices:[['Expertise',['Perception','Acrobatics']],['Weapon Masteries',['Dagger','Shortbow']]],scores:{Str:8,Dex:15,Con:13,Int:14,Wis:12,Cha:10},hp:10,weapon:'Dagger'},
 cleric:{skills:['History','Medicine'],choices:[['Divine Order',['Protector']]],scores:{Str:10,Dex:13,Con:14,Int:12,Wis:15,Cha:8},hp:10,weapon:'Mace'},
 wizard:{skills:['Arcana','History'],choices:[],scores:{Str:8,Dex:14,Con:13,Int:15,Wis:12,Cha:10},hp:8,weapon:'Quarterstaff'}
};
async function createAndImport(page:Page,id:ClassId){
 const cfg=config[id];await page.goto('/four-keeps/');await page.getByRole('button',{name:'My Characters'}).click();await page.getByRole('button',{name:'Create character',exact:true}).click();
 const creator=page.getByLabel('Character creator',{exact:true});await creator.getByLabel('name *',{exact:true}).fill(id+' Hero');await creator.getByRole('button',{name:'Continue to origins'}).click();
 await creator.getByRole('button',{name:/^Elf/}).click();await creator.getByRole('radio',{name:/^Wood Elf/}).check();await creator.getByRole('button',{name:id==='cleric'?/^Acolyte/:/^Criminal/}).click();await creator.getByRole('button',{name:'Continue to class'}).click();
 await creator.getByRole('button',{name:word(id[0].toUpperCase()+id.slice(1))}).click();
 for(const skill of cfg.skills)await creator.getByRole('group',{name:/^Class skills/}).getByRole('checkbox',{name:word(skill)}).check();
 for(const [label,choices] of cfg.choices as [string,string[]][])for(const choice of choices)await creator.getByRole('group',{name:new RegExp('^'+label)}).getByRole('checkbox',{name:word(choice)}).check();
 await creator.getByRole('button',{name:'Continue to abilities'}).click();for(const [ability,score] of Object.entries(cfg.scores))await creator.getByLabel(ability+' base score',{exact:true}).selectOption(String(score));
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
 if(id==='wizard'){
  for(const name of ['Fire Bolt','Mage Hand','Minor Illusion'])await creator.getByRole('checkbox',{name:word(name)}).check();
  for(const name of ['Alarm','Burning Hands','Charm Person','Detect Magic','Find Familiar','Magic Missile'])await creator.getByRole('checkbox',{name:word(name)}).first().check();
  for(const name of ['Alarm','Burning Hands','Charm Person','Magic Missile'])await creator.getByRole('checkbox',{name:word(name)}).last().check();
 }
 await creator.getByRole('button',{name:'Continue to review'}).click();await expect(creator.getByLabel('Character review')).toBeVisible();
 await page.getByRole('button',{name:/Home/}).click();await page.getByRole('button',{name:'New Adventure'}).click();const value=await page.getByLabel('Starting character').getByRole('option',{name:new RegExp(id+' Hero')}).getAttribute('value');await page.getByLabel('Starting character').selectOption(value!);await page.getByLabel('Campaign name',{exact:true}).fill(id+' Full Journey');await page.getByRole('button',{name:'Create campaign',exact:true}).click();
}
async function saved(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise<any>(resolve=>{const r=db.transaction('campaigns','readonly').objectStore('campaigns').getAll();r.onsuccess=()=>{db.close();resolve(r.result[0]);};});});}
for(const id of ['fighter','rogue','cleric','wizard'] as const)test(id+' complete creation, solo encounter, rewards, short/long rest and resume',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await createAndImport(page,id);
 const snapshot=structuredClone((await saved(page)).characterBuild);expect(snapshot.selections.equipment.equipped.weapons).toHaveLength(1);
 await page.getByRole('button',{name:'Dev',exact:true}).click();
 const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();await session.getByRole('button',{name:'Speak with the watchkeeper'}).click();await session.getByRole('button',{name:'Travel to Old Crossroads'}).click();await session.getByRole('button',{name:'Travel to Old Watchtower'}).click();await expect(session).toContainText('Visited 3/3 locations');
 if(id==='wizard'){
  await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-only-test-code');localStorage.setItem('four-keeps-dm-mode','on');});await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await page.getByRole('button',{name:'Dev',exact:true}).click();let sent:any;
  await page.route('**/api/dm',async route=>{sent=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The reported footprints remain uncertain.',newFacts:[],worldUpdates:{},combatStart:null})});});
  await page.getByLabel('Message the Dungeon Master').fill('What does the watchkeeper report mean here?');await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();await page.getByRole('button',{name:'Adventure',exact:true}).click();await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The reported footprints remain uncertain.');await page.getByRole('button',{name:'Dev',exact:true}).click();expect(sent.gameState.playerBuild.spellbook).toContain('magic-missile');expect(sent.gameState.characterIdentity.classId).toBe('wizard');
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
 if(id==='wizard'||id==='cleric'){
  await battle.getByLabel('Unified prepared spell',{exact:true}).selectOption(id==='wizard'?'Magic Missile':'Guiding Bolt');await battle.getByRole('button',{name:'Cast prepared level-one spell'}).click();await expect(battle.getByLabel('Unified spell slots')).toContainText('1 remaining');
  await battle.getByLabel('Companion target',{exact:true}).selectOption('tower-guard');await battle.getByLabel('Companion damage',{exact:true}).fill('3');await battle.getByRole('button',{name:'Apply damage',exact:true}).click();
 }else{
  await battle.getByLabel('Companion target',{exact:true}).selectOption('tower-guard');await battle.getByLabel('Companion attack d20',{exact:true}).fill('15');await battle.getByLabel('Companion damage',{exact:true}).fill('5');await battle.getByRole('button',{name:'Attack with verified statistics'}).click();await expect(battle.getByLabel('Companion last event')).toContainText('hit');
 }
 await battle.getByLabel('Companion target',{exact:true}).selectOption('nighthawk');await battle.getByLabel('Companion damage',{exact:true}).fill('3');await battle.getByRole('button',{name:'Apply damage',exact:true}).click();await battle.getByRole('button',{name:'Finish companion encounter'}).click();
 await session.getByLabel('Encounter reward XP').fill('30');await session.getByLabel('Encounter reward gold').fill('5');await session.getByLabel('Encounter reward item',{exact:true}).fill(id+' keepsake');await session.getByRole('button',{name:'Save encounter rewards'}).click();await expect(session).toContainText('Rewards saved: 30 XP');await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await page.getByRole('button',{name:'Dev',exact:true}).click();await expect(session).toContainText('Rewards saved: 30 XP');
 let c=await saved(page);expect(c.character.currentHitPoints).toBe(config[id].hp-3);expect(c.characterBuild).toEqual(snapshot);if(id==='cleric'){expect(c.character.resources['Magic Initiate'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(1);}if(id==='rogue')expect(c.inventoryLedger.gear.find((g:any)=>g.name==='Dagger').quantity).toBe(3);
 await session.getByRole('button',{name:'Resume exploration after encounter'}).click();const rest=session.getByLabel('Player rest recovery');await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByLabel('Rest Hit Die result').fill('1');if(id==='wizard')await rest.getByRole('checkbox',{name:/Use Arcane Recovery/}).check();await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toHaveText('Rest completed and saved.');
 c=await saved(page);expect(c.hitDiceRemaining).toBe(0);expect(c.character.currentHitPoints).toBe(config[id].hp);if(id==='fighter')expect(c.character.resources['Second Wind'].used).toBe(0);if(id==='wizard'){expect(c.character.resources['Arcane Recovery'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(0);}if(id==='cleric')expect(c.character.spellSlots.usedLevel1).toBe(1);
 await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByRole('button',{name:'Complete long rest'}).click();await expect.poll(async()=>(await saved(page)).hitDiceRemaining).toBe(1);await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();c=await saved(page);expect(c.hitDiceRemaining).toBe(1);expect(c.character.currentHitPoints).toBe(config[id].hp);expect(c.characterBuild).toEqual(snapshot);expect(c.xp).toBe(30);if(c.character.spellSlots)expect(c.character.spellSlots.usedLevel1).toBe(0);for(const pool of Object.values(c.character.resources??{}) as any[])expect(pool.used).toBe(0);
 if(id==='fighter'){await page.getByRole('button',{name:'Dev',exact:true}).click();const again=session.getByLabel('Player rest recovery');await again.getByRole('checkbox',{name:/DM confirms safe/}).check();await expect(again.getByRole('button',{name:'Complete long rest'})).toBeDisabled();await again.getByRole('checkbox',{name:/Include 960 minutes/}).check();await again.getByRole('button',{name:'Complete long rest'}).click();await expect(again.getByRole('status')).toHaveText('Rest completed and saved.');expect((await saved(page)).elapsedMinutes).toBe(1980);}
 await page.getByRole('button',{name:'Player',exact:true}).click();await expect(page.getByLabel('Saved character build')).toContainText('Saved level-one choices');expect(errors).toEqual([]);
});

test('rest save failure preserves Hit Dice, reports the failure, and permits a successful retry',async({page})=>{
 test.setTimeout(60000);await createAndImport(page,'fighter');await page.getByRole('button',{name:'Dev',exact:true}).click();
 const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();const rest=session.getByLabel('Player rest recovery');
 await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByLabel('Rest Hit Die result').fill('2');
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).__originalTransaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('Test write failure','QuotaExceededError');return Reflect.apply(original,this,args);} as typeof original;});
 await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toContainText('Rest could not be saved');expect((await saved(page)).hitDiceRemaining).toBe(1);await expect(rest.getByRole('checkbox',{name:/DM confirms safe/})).toBeChecked();
 await page.evaluate(()=>{IDBDatabase.prototype.transaction=(window as any).__originalTransaction;delete (window as any).__originalTransaction;});await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toHaveText('Rest completed and saved.');expect((await saved(page)).hitDiceRemaining).toBe(0);
});

test('AI-led opening, world memory and saved pending action retry survive reload',async({page})=>{
 test.setTimeout(90000);
 test.setTimeout(90000);
 await createAndImport(page,'fighter');
 await expect.poll(async()=>Boolean((await saved(page))?.characterIdentity)).toBe(true);
 await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 let requests:any[]=[];let fail=false;
 await page.route('**/api/dm',async route=>{
   const body=route.request().postDataJSON();requests.push(body);
   if(fail){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporary outage'})});return;}
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
 fail=true;
 await page.getByLabel('Message the Dungeon Master').fill('Ask Mira about the bell');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByRole('button',{name:'Retry saved action'})).toBeVisible();
 const pendingId=(await saved(page)).pendingAdventureAction.id;
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 fail=false;
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
 const calls:any[]=[];
 await page.route('**/api/dm',async route=>{
  const request=route.request().postDataJSON();calls.push(request);
  const opening=request.opening;
  const combat=!opening && request.message.includes('approach the bridge');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   narration:opening?'The old bridge is watched by the town guard.':combat?'A highway robber draws a sword and attacks.':'The guard acknowledges your return and the bridge is safe.',
   combatStart:combat?{enemyName:'Highway robber'}:null,newFacts:combat?['A highway robber attacked the bridge']:['The bridge is safe after the battle'],
   worldUpdates:combat?{clues:[{text:'A robber attacked the bridge',evidence:'confirmed',source:'Fighter'}]}:{quests:[{title:'Secure the bridge',status:'completed',objective:'Defeat the robber',notes:['The bridge is safe']}]}
  })});
 });
 await page.getByRole('button',{name:'Begin AI-led adventure'}).click();
 await expect(page.getByLabel('Adventure',{exact:true})).toContainText('The old bridge');
 await page.getByLabel('Message the Dungeon Master').fill('I approach the bridge cautiously.');
 await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();
 await expect(page.getByText('Opponent: Highway robber',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Send message to Dungeon Master'})).toBeDisabled();
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const before=await saved(page);
 expect(before.adventureSession.pendingEncounter.enemyName).toBe('Highway robber');
 expect(before.location).toBe(original.location);
 expect(before.characterBuild).toEqual(original.characterBuild);
 await page.getByLabel('Quick player initiative').fill('18');
 await page.getByLabel('Quick enemy initiative').fill('12');
 await page.getByLabel('Quick enemy hp').fill('10');
 await page.getByLabel('Quick enemy ac').fill('12');
 await page.getByLabel('Quick enemy attack bonus').fill('3');
 await page.getByLabel('Quick enemy damage bonus').fill('1');
 await page.getByLabel('Quick enemy damage dice').fill('1d6');
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
 expect(errors).toEqual([]);
});

test('organic combat proposal can be declined and AI narration resumes without losing state',async({page})=>{
 test.setTimeout(90000);
 await page.addInitScript(()=>{localStorage.setItem('four-keeps-access-code','browser-test-code');localStorage.setItem('four-keeps-dm-mode','on');});
 await createAndImport(page,'fighter');
 let calls=0;
 await page.route('**/api/dm',async route=>{
  calls++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:calls===1?'A watchman greets you.':calls===2?'A suspicious stranger reaches for a sword.':'The stranger lowers the sword and walks away.',combatStart:calls===2?{enemyName:'Suspicious stranger'}:null,newFacts:['The watchman is present'],worldUpdates:{}})});
 });
 await page.getByRole('button',{name:'Begin AI-led adventure'}).click();
 const initial=await saved(page);
 await page.getByLabel('Message the Dungeon Master').fill('I question the stranger.');
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
 expect(calls).toBe(3);
});
