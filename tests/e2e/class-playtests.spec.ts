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
 const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();await session.getByRole('button',{name:'Speak with the watchkeeper'}).click();await session.getByRole('button',{name:'Travel to Old Crossroads'}).click();await session.getByRole('button',{name:'Travel to Old Watchtower'}).click();
 if(id==='wizard'){
  await page.evaluate(()=>{localStorage.setItem('four-keeps-access-code','browser-only-test-code');localStorage.setItem('four-keeps-dm-mode','on');});await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();let sent:any;
  await page.route('**/api/dm',async route=>{sent=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({narration:'The reported footprints remain uncertain.',newFacts:[],worldUpdates:{},combatStart:null})});});
  await page.getByLabel('Message the Dungeon Master').fill('What does the watchkeeper report mean here?');await page.getByRole('button',{name:'Send message to Dungeon Master'}).click();await expect(session.getByLabel('Quick adventure encounter')).toContainText('The reported footprints remain uncertain.');expect(sent.gameState.playerBuild.spellbook).toContain('magic-missile');expect(sent.gameState.characterIdentity.classId).toBe('wizard');
 }
 const quick=session.getByLabel('Quick adventure encounter');for(const [field,value] of Object.entries({'player initiative':'20','enemy initiative':'10','enemy identifier':'tower-guard','enemy hp':'3','enemy ac':'10','enemy attack bonus':'2','enemy damage bonus':'1','enemy damage dice':'1d4'}))await quick.getByLabel('Quick '+field,{exact:true}).fill(value);
 await quick.getByRole('checkbox').check();await quick.getByRole('button',{name:'Start verified encounter'}).click();const battle=session.getByLabel('Companion encounter',{exact:true});
 await expect(battle.getByLabel('Verified equipped combat calculations')).toContainText(config[id].weapon);expect((await saved(page)).subclassActors).toBeUndefined();
 if(id==='fighter')await battle.getByRole('button',{name:/Spend Second Wind/}).click();
 if(id==='rogue'){await battle.getByLabel('Nighthawk campaign item',{exact:true}).selectOption('daggers');await battle.getByLabel('Campaign item quantity',{exact:true}).fill('1');await battle.getByRole('button',{name:'Spend campaign inventory'}).click();}
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
 await session.getByLabel('Encounter reward XP').fill('30');await session.getByLabel('Encounter reward gold').fill('5');await session.getByLabel('Encounter reward item',{exact:true}).fill(id+' keepsake');await session.getByRole('button',{name:'Save encounter rewards'}).click();await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();await expect(session).toContainText('Rewards saved: 30 XP');
 let c=await saved(page);expect(c.character.currentHitPoints).toBe(config[id].hp-3);expect(c.characterBuild).toEqual(snapshot);if(id==='cleric'){expect(c.character.resources['Magic Initiate'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(1);}if(id==='rogue')expect(c.inventoryLedger.gear.find((g:any)=>g.name==='Dagger').quantity).toBe(3);
 await session.getByRole('button',{name:'Resume exploration after encounter'}).click();const rest=session.getByLabel('Player rest recovery');await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByLabel('Rest Hit Die result').fill('1');if(id==='wizard')await rest.getByRole('checkbox',{name:/Use Arcane Recovery/}).check();await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toHaveText('Rest completed and saved.');
 c=await saved(page);expect(c.hitDiceRemaining).toBe(0);expect(c.character.currentHitPoints).toBe(config[id].hp);if(id==='fighter')expect(c.character.resources['Second Wind'].used).toBe(0);if(id==='wizard'){expect(c.character.resources['Arcane Recovery'].used).toBe(1);expect(c.character.spellSlots.usedLevel1).toBe(0);}if(id==='cleric')expect(c.character.spellSlots.usedLevel1).toBe(1);
 await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByRole('button',{name:'Complete long rest'}).click();await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();c=await saved(page);expect(c.hitDiceRemaining).toBe(1);expect(c.character.currentHitPoints).toBe(config[id].hp);expect(c.characterBuild).toEqual(snapshot);expect(c.xp).toBe(30);if(c.character.spellSlots)expect(c.character.spellSlots.usedLevel1).toBe(0);for(const pool of Object.values(c.character.resources??{}) as any[])expect(pool.used).toBe(0);
 if(id==='fighter'){const again=session.getByLabel('Player rest recovery');await again.getByRole('checkbox',{name:/DM confirms safe/}).check();await expect(again.getByRole('button',{name:'Complete long rest'})).toBeDisabled();await again.getByRole('checkbox',{name:/Include 960 minutes/}).check();await again.getByRole('button',{name:'Complete long rest'}).click();await expect(again.getByRole('status')).toHaveText('Rest completed and saved.');expect((await saved(page)).elapsedMinutes).toBe(1980);}
 await page.getByRole('button',{name:'Player',exact:true}).click();await expect(page.getByLabel('Saved character build')).toContainText('Saved level-one choices');expect(errors).toEqual([]);
});

test('rest save failure preserves Hit Dice, reports the failure, and permits a successful retry',async({page})=>{
 test.setTimeout(60000);await createAndImport(page,'fighter');const session=page.getByLabel('Adventure session',{exact:true});await session.getByRole('button',{name:'Start frontier adventure'}).click();const rest=session.getByLabel('Player rest recovery');
 await rest.getByRole('checkbox',{name:/DM confirms safe/}).check();await rest.getByLabel('Rest Hit Die result').fill('2');
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).__originalTransaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('Test write failure','QuotaExceededError');return Reflect.apply(original,this,args);} as typeof original;});
 await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toContainText('Rest could not be saved');expect((await saved(page)).hitDiceRemaining).toBe(1);await expect(rest.getByRole('checkbox',{name:/DM confirms safe/})).toBeChecked();
 await page.evaluate(()=>{IDBDatabase.prototype.transaction=(window as any).__originalTransaction;delete (window as any).__originalTransaction;});await rest.getByRole('button',{name:'Complete short rest'}).click();await expect(rest.getByRole('status')).toHaveText('Rest completed and saved.');expect((await saved(page)).hitDiceRemaining).toBe(0);
});
