import {test,expect,type Page} from '@playwright/test';
async function openSupplies(page:Page){
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Player',exact:true}).click();
 return page.getByLabel('Equipment and inventory',{exact:true}).getByRole('region',{name:'Adventuring consumables'});
}
async function createCampaign(page:import('@playwright/test').Page,name:string){
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
 const dev=page.getByLabel('Development section');
 if(!(await dev.getByLabel('Legacy campaign creation').isVisible()))await dev.locator('summary').first().click();
 await dev.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill(name);
 await dev.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 return page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  return new Promise<string>((resolve,reject)=>{let id='';const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.getAll();
   r.onsuccess=()=>{const c=r.result[0];id=c.id;c.elapsedMinutes=100;c.character={...c.character,currentHitPoints:12,maxHitPoints:20};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Antitoxin',quantity:2},{name:"Healer's Kit",quantity:1}]};store.put(c)};
   tx.oncomplete=()=>{db.close();resolve(id)};tx.onerror=()=>reject(tx.error);
  });
 });
}
test('iPhone antitoxin confirms, cancels, persists one-hour effect and stock',async({page})=>{
 const id=await createCampaign(page,'Antitoxin smoke');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=await openSupplies(page);
 await panel.getByLabel('Choose consumable').selectOption('Antitoxin');
 await panel.getByRole('button',{name:'Cancel'}).click();
 await expect(panel).toContainText('Antitoxin (2)');
 await panel.getByLabel('Choose consumable').selectOption('Antitoxin');
 await panel.getByRole('button',{name:'Confirm use'}).click();
 await expect(panel).toContainText('Antitoxin (1)');
 await expect(panel).toContainText('60 in-game minutes remaining');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(await openSupplies(page)).toContainText('Antitoxin (1)');
 const result=await page.evaluate(async id=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});const c=await new Promise<any>(resolve=>{const r=db.transaction('campaigns').objectStore('campaigns').get(id);r.onsuccess=()=>resolve(r.result)});db.close();return {until:c.antitoxinUntilMinute,ids:c.consumableUseIds.length}},id);
 expect(result).toEqual({until:160,ids:1});
});
test('two tabs reject stale consumable confirmations and retry winner once after interrupted write',async({page,context})=>{
 const id=await createCampaign(page,'Consumable concurrency');
 const other=await context.newPage();await other.goto('/four-keeps/');
 const use=(p:typeof page,requestId:string,interrupted=false)=>p.evaluate(async({id,requestId,interrupted})=>{
  const {commitConsumableUse}=await import('/src/game/storage.ts');
  const req={name:'Antitoxin' as const,confirmed:true,requestId,expectedQuantity:2,expectedElapsedMinutes:100};
  if(interrupted){const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw Error('Interrupted IndexedDB write')};try{await commitConsumableUse(id,req);return {ok:true}}catch{return {ok:false}}finally{IDBObjectStore.prototype.put=original}}
  try{const c=await commitConsumableUse(id,req);return {ok:true,until:c.antitoxinUntilMinute}}catch(e){return {ok:false,error:String(e)}}
 },{id,requestId,interrupted});
 expect((await use(page,'interrupted',true)).ok).toBe(false);
 const [a,b]=await Promise.all([use(page,'tab-a'),use(other,'tab-b')]);
 expect([a.ok,b.ok].sort()).toEqual([false,true]);
 const winner=a.ok?'tab-a':'tab-b';
 expect((await use(other,winner)).ok).toBe(true);
 const saved=await page.evaluate(async id=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});const c=await new Promise<any>(resolve=>{const r=db.transaction('campaigns').objectStore('campaigns').get(id);r.onsuccess=()=>resolve(r.result)});db.close();return {qty:c.inventoryLedger.gear[0].quantity,ids:c.consumableUseIds,until:c.antitoxinUntilMinute}},id);
 expect(saved).toEqual({qty:1,ids:[winner],until:160});await other.close();
});

test('iPhone healer kit stabilizes adjacent ally and preserves nine remaining uses across reload',async({page})=>{
 const id=await createCampaign(page,'Healer kit smoke');
 await page.evaluate(async id=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.get(id);
   r.onsuccess=()=>{const c=r.result;const actor={x:2,y:2,hp:12,maxHp:20,initiative:20,conditions:[],speedFeet:30,movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,actorKind:'party'};
    c.companionEncounter={id:'kit-test',status:'active',mode:'unified',round:1,turnIndex:0,order:['nighthawk','ally'],participants:{nighthawk:actor,ally:{...actor,x:3,hp:0,maxHp:15,initiative:10,conditions:['Unconscious'],deathSaves:{successes:0,failures:1,stable:false,dead:false}}},log:[],nighthawkSheetHpSnapshot:12};store.put(c)};
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });db.close();
 },id);
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=await openSupplies(page);
 await panel.getByLabel('Choose consumable').selectOption("Healer's Kit");
 await panel.getByLabel('Consumable recipient').selectOption('ally');
 await panel.getByRole('button',{name:'Confirm use'}).click();
 await expect(panel).toContainText('9 uses in current kit');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const result=await page.evaluate(async id=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});const c=await new Promise<any>(resolve=>{const r=db.transaction('campaigns').objectStore('campaigns').get(id);r.onsuccess=()=>resolve(r.result)});db.close();return {uses:c.healerKitUsesRemaining,quantity:c.inventoryLedger.gear[1].quantity,stable:c.companionEncounter.participants.ally.deathSaves.stable,hp:c.companionEncounter.participants.ally.hp,action:c.companionEncounter.participants.nighthawk.actionUsed}},id);
 expect(result).toEqual({uses:9,quantity:1,stable:true,hp:0,action:true});
});

test('iPhone encounter antitoxin affects Poisoned saves after reload',async({page})=>{
 const id=await createCampaign(page,'Antitoxin encounter');
 await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const {startUnifiedEncounter}=await import('/src/game/companionEncounter.ts');
  const current=await localCampaignStorage.get(id);
  if(!current)throw Error('Campaign fixture was not saved');
  const battle=startUnifiedEncounter(current,{nighthawk:20},{nighthawk:{x:2,y:2}},{});
  await localCampaignStorage.save({...battle,adventureSession:{status:'encounter',site:'watchtower',
   characterSource:'campaign-character',visited:['watchtower'],interactions:[]}});
 },id);
 const reopen=async()=>{
  await page.reload();
  await page.getByRole('button',{name:'Campaigns',exact:true}).click();
  await page.getByRole('button',{name:'Continue Adventure'}).click();
 };
 await reopen();
 const panel=await openSupplies(page);
 await panel.getByLabel('Choose consumable').selectOption('Antitoxin');
 await panel.getByRole('button',{name:'Confirm use'}).click();
 await expect(panel).toContainText('Antitoxin (1)');
 await reopen();
 await page.getByLabel('Encounter save purpose').selectOption('avoid-poisoned');
 await page.getByLabel('Encounter save ability').selectOption('Constitution');
 await page.getByLabel('Encounter save total',{exact:true}).fill('5');
 await page.getByLabel('Encounter second save total').fill('19');
 await page.getByLabel('Encounter save DC').fill('15');
 await page.getByRole('button',{name:'Resolve condition save'}).click();
 await expect(page.getByLabel('Companion last event')).toContainText('success (19)');
 await page.getByLabel('Encounter second save total').fill('9');
 await page.getByRole('button',{name:'Resolve condition save'}).click();
 await expect(page.getByLabel('Companion last event')).toContainText('gained Poisoned');
 await page.getByLabel('Encounter save purpose').selectOption('end-poisoned');
 await page.getByLabel('Encounter second save total').fill('19');
 await page.getByRole('button',{name:'Resolve condition save'}).click();
 await expect(page.getByLabel('Companion last event')).toContainText('ended Poisoned');
});

for(const [item,target] of [['Acid','Bandit'],['Holy Water','Bandit'],['Alchemist’s Fire','Bandit'],['Oil','Bandit'],['Acid','Crate'],['Oil','Crate']] as const)test(`iPhone ${item} targets ${target} and persists damage, attack use and consumption`,async({page})=>{
 const id=await createCampaign(page,item+' throw');
 await page.evaluate(async ({id,item})=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const {startUnifiedEncounter,addCompanionEnemy}=await import('/src/game/companionEncounter.ts');
  const current=await localCampaignStorage.get(id);
  if(!current?.character||!current.inventoryLedger)throw Error('Campaign fixture was not saved');
  const characterIdentity={name:'Acid tester',speciesId:'human',backgroundId:'criminal',classId:'rogue',
   draftId:'acid-test',pronouns:'',appearance:'',personality:'',backstory:''};
  const player={...current,characterIdentity,character:{...current.character,level:1},
   inventoryLedger:{...current.inventoryLedger,gear:[{name:item,quantity:1}]}};
  const battle=startUnifiedEncounter(player,{nighthawk:20},{nighthawk:{x:2,y:2}},{});
  const encounter=addCompanionEnemy(battle,'Bandit',10,{x:6,y:2},12,12,2);
  await localCampaignStorage.save({...encounter,adventureSession:{status:'encounter',site:'watchtower',
   characterSource:'campaign-character',visited:['watchtower'],interactions:[]}});
 },{id,item});
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 if(target==='Crate'){
  await page.getByText('DM encounter objects',{exact:true}).click();
  await page.getByLabel('Object name').fill('Crate');
  await page.getByLabel('Object HP').fill('12');
  await page.getByLabel('Object X').fill('6');
  await page.getByLabel('Object Y').fill('3');
  await page.getByRole('button',{name:'Add encounter object'}).click();
  await expect(page.getByText('Crate · 12 HP',{exact:true})).toBeVisible();
 }
 const panel=await openSupplies(page);
 await panel.getByLabel('Choose consumable').selectOption(item);
 await panel.getByLabel(item+' target').selectOption(target);
 if(target==='Bandit')await panel.getByLabel('Dexterity save total').fill('1');
 if(item==='Holy Water')await panel.getByLabel('DM-verified creature type').selectOption('Undead');
 if(item!=='Oil')await panel.getByLabel(item==='Acid'?'Rolled acid damage':item==='Holy Water'?'Rolled 2d8 radiant damage':'Rolled 1d4 fire damage').fill(item==='Alchemist’s Fire'?'3':'7');
 await panel.getByRole('button',{name:'Confirm use'}).click();
 await expect(panel).toHaveCount(0);
 await page.reload();
 const result=await page.evaluate(async ({id,item,target})=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const current=await localCampaignStorage.get(id);
  const affected=target==='Crate'?current?.companionEncounter?.objects?.Crate:current?.companionEncounter?.participants.Bandit;
  return {hp:affected?.hp,
   used:current?.companionEncounter?.participants.nighthawk.actionUsed,
   vials:current?.inventoryLedger?.gear.find(gear=>gear.name===item)?.quantity,
   oiled:!!affected?.oilExpires,
   burning:current?.companionEncounter?.burningCreatures??[]};
 },{id,item,target});
 expect(result).toEqual({hp:item==='Oil'?12:item==='Alchemist’s Fire'?9:5,used:true,vials:0,oiled:item==='Oil',
  burning:item==='Alchemist’s Fire'?['Bandit']:[]});
});

test('iPhone Basic Poison coats the equipped dagger and preserves the coating after reload',async({page})=>{
 const id=await createCampaign(page,'Basic Poison');
 await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const {startUnifiedEncounter}=await import('/src/game/companionEncounter.ts');
  const current=await localCampaignStorage.get(id);
  if(!current?.inventoryLedger)throw Error('Campaign fixture was not saved');
  const equipped={...current,encounterLoadout:{weaponId:'dagger'},
   inventoryLedger:{...current.inventoryLedger,gear:[{name:'Dagger',quantity:1},{name:'Poison, Basic',quantity:1}]}};
  const encounter=startUnifiedEncounter(equipped,{nighthawk:20},{nighthawk:{x:2,y:2}},{});
  await localCampaignStorage.save({...encounter,adventureSession:{status:'encounter',site:'watchtower',
   characterSource:'campaign-character',visited:['watchtower'],interactions:[]}});
 },id);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=await openSupplies(page);
 await panel.getByLabel('Choose consumable').selectOption('Poison, Basic');
 await panel.getByRole('button',{name:'Confirm use'}).click();
 await expect(panel.getByRole('status')).toHaveText('Basic Poison coating active.');
 await page.reload();
 const saved=await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const current=await localCampaignStorage.get(id);
  return {weapon:current?.companionEncounter?.basicPoison?.weaponId,
   used:current?.companionEncounter?.participants.nighthawk.bonusActionUsed,
   vial:current?.inventoryLedger?.gear.find(item=>item.name==='Poison, Basic')?.quantity};
 },id);
 expect(saved).toEqual({weapon:'dagger',used:true,vial:0});
});

test('iPhone lamp lighting, pause and relight spend one Oil flask and survive reload',async({page})=>{
 const id=await createCampaign(page,'Lamp fuel');
 await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const current=await localCampaignStorage.get(id);
  if(!current?.inventoryLedger)throw Error('Campaign fixture was not saved');
  await localCampaignStorage.save({...current,inventoryLedger:{...current.inventoryLedger,gear:[
   {name:'Lamp',quantity:1},{name:'Oil',quantity:1},{name:'Tinderbox',quantity:1},
  ]}});
 },id);
 async function reopen(){
  await page.reload();
  await page.getByRole('button',{name:'Campaigns',exact:true}).click();
  await page.getByRole('button',{name:'Continue Adventure'}).click();
 }
 await reopen();
 const panel=await openSupplies(page);
 async function useLamp(){
  await panel.getByLabel('Choose consumable').selectOption('Lamp');
  await panel.getByRole('button',{name:'Confirm use'}).click();
 }
 await useLamp();
 await expect(panel.getByRole('status')).toHaveText('Lamp: 15 ft bright, 30 ft additional dim · 360 min remaining');
 await useLamp();
 await expect(panel.getByRole('status')).toHaveText('Lamp: extinguished · 360 min remaining');
 await reopen();
 await openSupplies(page);
 await expect(panel.getByRole('status')).toHaveText('Lamp: extinguished · 360 min remaining');
 await useLamp();
 await expect(panel.getByRole('status')).toHaveText('Lamp: 15 ft bright, 30 ft additional dim · 360 min remaining');
 await expect(panel.getByLabel('Choose consumable').getByRole('option',{name:/Oil/})).toHaveCount(0);
});

test('iPhone rations, waterskin and rope keep verified supply changes after reload',async({page})=>{
 const id=await createCampaign(page,'Field supplies');
 await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const current=await localCampaignStorage.get(id);
  if(!current?.inventoryLedger)throw Error('Campaign fixture was not saved');
  await localCampaignStorage.save({...current,inventoryLedger:{...current.inventoryLedger,gear:[
   {name:'Rations',quantity:1},{name:'Waterskin',quantity:1},{name:'Rope',quantity:1},
  ]}});
 },id);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=await openSupplies(page);
 const supplies=panel.getByLabel('Choose consumable');
 const confirm=panel.getByRole('button',{name:'Confirm use'});
 await supplies.selectOption('Rations');
 await confirm.click();
 await expect(supplies).toHaveValue('');
 await supplies.selectOption('Waterskin');
 await confirm.click();
 await expect(supplies).toHaveValue('');
 await supplies.selectOption('Rope');
 await panel.getByLabel('Verified Rope check total').fill('10');
 await confirm.click();
 await expect(supplies).toHaveValue('');
 await page.reload();
 const saved=await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const current=await localCampaignStorage.get(id);
  return {provisions:current?.provisions,pints:current?.waterskinPints,knotted:current?.ropeKnotted};
 },id);
 expect(saved).toEqual({provisions:{day:0,rations:1,waterPints:1},pints:3,knotted:true});
});

test('iPhone recovers Caltrops from a completed encounter and persists inventory and time',async({page})=>{
 const id=await createCampaign(page,'Recover supplies');
 await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const {startUnifiedEncounter,finishCompanionEncounter}=await import('/src/game/companionEncounter.ts');
  const current=await localCampaignStorage.get(id);
  if(!current?.inventoryLedger)throw Error('Campaign fixture was not saved');
  const encounter=startUnifiedEncounter({...current,inventoryLedger:{...current.inventoryLedger,gear:[]}},
   {nighthawk:20},{nighthawk:{x:2,y:2}},{});
  const completed=finishCompanionEncounter(encounter);
  await localCampaignStorage.save({...completed,companionEncounter:{...completed.companionEncounter!,
   groundSupplies:[{id:'caltrops-test',name:'Caltrops',x:2,y:1}]}});
 },id);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=await openSupplies(page);
 await panel.getByLabel('Deployed supply').selectOption('caltrops-test');
 await panel.getByLabel('DM confirms access to the deployed supply').check();
 await panel.getByRole('button',{name:'Recover (10 minutes)'}).click();
 await expect(panel.getByLabel('Choose consumable')).toContainText('Caltrops (1)');
 await page.reload();
 const saved=await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const current=await localCampaignStorage.get(id);
  return {minutes:current?.elapsedMinutes,placements:current?.companionEncounter?.groundSupplies?.length,
   quantity:current?.inventoryLedger?.gear.find(item=>item.name==='Caltrops')?.quantity};
 },id);
 expect(saved).toEqual({minutes:110,placements:0,quantity:1});
});

test('iPhone records verified forced movement into a ground hazard and persists it',async({page})=>{
 const id=await createCampaign(page,'Forced ground entry');
 await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const {startUnifiedEncounter,addCompanionEnemy}=await import('/src/game/companionEncounter.ts');
  const current=await localCampaignStorage.get(id);
  if(!current)throw Error('Campaign fixture was not saved');
  const encounter=startUnifiedEncounter(current,{nighthawk:20},{nighthawk:{x:2,y:2}},{});
  const fight=addCompanionEnemy(encounter,'Bandit',10,{x:3,y:2},12,12,2);
  await localCampaignStorage.save({...fight,companionEncounter:{...fight.companionEncounter!,
   groundSupplies:[{id:'caltrops',name:'Caltrops',x:4,y:2}]},
   adventureSession:{status:'encounter',site:'watchtower',characterSource:'campaign-character',visited:['watchtower'],interactions:[]}});
 },id);
 await page.reload();
 await page.getByRole('button',{name:'Campaigns',exact:true}).click();
 await page.getByRole('button',{name:'Continue Adventure'}).click();
 const encounter=page.getByLabel('Companion encounter',{exact:true});
 await encounter.getByText('DM forced movement and Rope',{exact:true}).click();
 await encounter.getByLabel('Forced movement creature',{exact:true}).selectOption('Bandit');
 await encounter.getByLabel('Forced X').fill('4');
 await encounter.getByLabel('Forced Y').fill('2');
 await encounter.getByLabel('Verified ground hazard Dexterity save').fill('1');
 await encounter.getByRole('button',{name:'Confirm forced 5-foot step'}).click();
 await expect(encounter).toContainText('Verified forced movement recorded');
 await page.reload();
 const saved=await page.evaluate(async id=>{
  const {localCampaignStorage}=await import('/src/game/storage.ts');
  const current=await localCampaignStorage.get(id);
  const bandit=current?.companionEncounter?.participants.Bandit;
  return {x:bandit?.x,hp:bandit?.hp,stopped:bandit?.caltropsStopped};
 },id);
 expect(saved).toEqual({x:4,hp:11,stopped:true});
});

test('iPhone Oil controls distinguish ground spill from thrown flask',async({page})=>{
 await createCampaign(page,'Oil ground selector');
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.getAll();r.onsuccess=()=>{const c=r.result[0];c.inventoryLedger.gear.push({name:'Oil',quantity:2});store.put(c)};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=await openSupplies(page);
 await panel.getByLabel('Choose consumable').selectOption('Oil');
 await expect(panel.getByText('Spill Oil on an adjacent 5-foot square instead of throwing at a target')).toBeVisible();
 await panel.getByText('Spill Oil on an adjacent 5-foot square instead of throwing at a target').click();
 await expect(panel.getByText('Ground X')).toBeVisible();
 await expect(panel.getByText('Ground Y')).toBeVisible();
 await panel.getByRole('button',{name:'Cancel'}).click();
 await expect(panel.getByLabel('Choose consumable')).toHaveValue('');
});
