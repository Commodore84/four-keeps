import {test,expect} from '@playwright/test';
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
 const panel=page.getByRole('region',{name:'Adventuring consumables'});
 await panel.getByLabel('Choose consumable').selectOption('Antitoxin');
 await panel.getByRole('button',{name:'Cancel'}).click();
 await expect(panel).toContainText('Antitoxin (2)');
 await panel.getByLabel('Choose consumable').selectOption('Antitoxin');
 await panel.getByRole('button',{name:'Confirm use'}).click();
 await expect(panel).toContainText('Antitoxin (1)');
 await expect(panel).toContainText('60 in-game minutes remaining');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await expect(page.getByRole('region',{name:'Adventuring consumables'})).toContainText('Antitoxin (1)');
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
 const panel=page.getByRole('region',{name:'Adventuring consumables'});
 await panel.getByLabel('Choose consumable').selectOption("Healer's Kit");
 await panel.getByLabel('Consumable recipient').selectOption('ally');
 await panel.getByRole('button',{name:'Confirm use'}).click();
 await expect(panel).toContainText('9 uses in current kit');
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const result=await page.evaluate(async id=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});const c=await new Promise<any>(resolve=>{const r=db.transaction('campaigns').objectStore('campaigns').get(id);r.onsuccess=()=>resolve(r.result)});db.close();return {uses:c.healerKitUsesRemaining,quantity:c.inventoryLedger.gear[1].quantity,stable:c.companionEncounter.participants.ally.deathSaves.stable,hp:c.companionEncounter.participants.ally.hp,action:c.companionEncounter.participants.nighthawk.actionUsed}},id);
 expect(result).toEqual({uses:9,quantity:1,stable:true,hp:0,action:true});
});
