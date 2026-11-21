import {test,expect} from '@playwright/test';

test('iPhone adjacent companion administration spends Bonus Action, heals companion, and persists',async({page})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
 const dev=page.getByLabel('Development section');
 if(!(await dev.getByLabel('Legacy campaign creation').isVisible()))await dev.locator('summary').first().click();
 await dev.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill('Companion potion');
 await dev.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.getAll();
   r.onsuccess=()=>{const c=r.result[0];c.character={...c.character,currentHitPoints:12,maxHitPoints:20};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion of Healing',quantity:2}]};
    const actor={x:2,y:2,hp:12,maxHp:20,initiative:20,conditions:[],speedFeet:30,movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,actorKind:'party'};
    c.companionEncounter={id:'potion-test',status:'active',mode:'unified',round:1,turnIndex:0,order:['nighthawk','ally'],participants:{nighthawk:actor,ally:{...actor,x:3,hp:2,maxHp:15,initiative:10}},log:[],nighthawkSheetHpSnapshot:12};
    store.put(c)};
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Campaigns',exact:true}).click();await page.getByRole('button',{name:'Continue Adventure'}).click();
 const panel=page.getByRole('region',{name:'Healing potions'});
 await panel.getByLabel('Choose healing potion').selectOption('Potion of Healing');
 await panel.getByLabel('Potion recipient').selectOption('ally');
 await panel.getByRole('button',{name:'Confirm administer potion'}).click();
 await expect(panel).toContainText('Potion of Healing (1)');
 const saved=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});const c=await new Promise<any>(resolve=>{const r=db.transaction('campaigns').objectStore('campaigns').getAll();r.onsuccess=()=>resolve(r.result[0])});db.close();return {hp:c.character.currentHitPoints,ally:c.companionEncounter.participants.ally.hp,action:c.companionEncounter.participants.nighthawk.actionUsed,bonus:c.companionEncounter.participants.nighthawk.bonusActionUsed}});
 expect(saved.hp).toBe(12);expect(saved.ally).toBeGreaterThan(2);expect(saved.action).toBe(false);expect(saved.bonus).toBe(true);
});


test('two iPhone tabs serialize competing potion uses and safely replay the winning request',async({page,context})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Open navigation menu'}).click();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Developer'}).click();
 const dev=page.getByLabel('Development section');
 if(!(await dev.getByLabel('Legacy campaign creation').isVisible()))await dev.locator('summary').first().click();
 await dev.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill('Two tab potion race');
 await dev.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 const id=await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});
  return new Promise<string>((resolve,reject)=>{let id='';const tx=db.transaction('campaigns','readwrite'),store=tx.objectStore('campaigns'),r=store.getAll();
   r.onsuccess=()=>{const c=r.result[0];id=c.id;c.character={...c.character,currentHitPoints:2,maxHitPoints:50};c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Potion of Healing',quantity:2}]};store.put(c)};
   tx.oncomplete=()=>{db.close();resolve(id)};tx.onerror=()=>reject(tx.error);
  });
 });
 const other=await context.newPage();await other.goto('/four-keeps/');
 const submit=(p:typeof page,requestId:string)=>p.evaluate(async({id,requestId})=>{
  const {commitHealingPotionUse}=await import('/src/game/storage.ts');
  try{const c=await commitHealingPotionUse(id,{name:'Potion of Healing',confirmed:true,expectedQuantity:2,expectedHP:2,requestId,rollDie:()=>4});return {ok:true,hp:c.character.currentHitPoints}}catch(e){return {ok:false,error:String(e)}}
 },{id,requestId});
 const [first,second]=await Promise.all([submit(page,'tab-1'),submit(other,'tab-2')]);
 expect([first.ok,second.ok].sort()).toEqual([false,true]);
 const winner=first.ok?'tab-1':'tab-2';
 const replay=await submit(other,winner);
 expect(replay.ok).toBe(true);
 const saved=await page.evaluate(async id=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('four-keeps-local',1);r.onsuccess=()=>resolve(r.result)});const c=await new Promise<any>(resolve=>{const r=db.transaction('campaigns').objectStore('campaigns').get(id);r.onsuccess=()=>resolve(r.result)});db.close();return {hp:c.character.currentHitPoints,stock:c.inventoryLedger.gear[0].quantity,ids:c.healingPotionUseIds}},id);
 expect(saved.hp).toBe(12);expect(saved.stock).toBe(1);expect(saved.ids).toEqual([winner]);
 await other.close();
});
