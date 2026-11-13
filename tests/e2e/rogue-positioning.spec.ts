import {test,expect} from '@playwright/test';
test('Rogue Steady Aim and Hide controls persist after reload',async({page})=>{
 await page.goto('/four-keeps/');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const development=page.getByLabel('Development section');if(!(await development.getByLabel('Legacy campaign creation').isVisible()))await development.locator('summary').first().click();
 await development.getByLabel('Legacy campaign creation').getByLabel('New campaign name').fill('Rogue positioning browser');
 await development.getByLabel('Legacy campaign creation').getByRole('button',{name:'New',exact:true}).click();
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('four-keeps-local',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('campaigns','readwrite');const store=tx.objectStore('campaigns');const req=store.getAll();req.onsuccess=()=>{const c=req.result[0];c.characterIdentity={name:'Rogue',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'x',pronouns:'',appearance:'',personality:'',backstory:''};c.character={...c.character,level:4,classId:'rogue'};const actor={x:1,y:1,hp:25,maxHp:25,initiative:20,conditions:[],speedFeet:30,movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,reactionUsed:false,actorKind:'party',faction:'party'};const enemy={...actor,x:3,y:1,initiative:10,hp:25,maxHp:25,actorKind:'enemy',faction:'enemies',armorClass:15};c.companionEncounter={status:'active',mode:'unified',participants:{nighthawk:actor,enemy},order:['nighthawk','enemy'],turnIndex:0,round:1,log:[],cover:[],obstacles:[]};store.put(c)};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByRole('button',{name:'Open navigation menu'}).click();await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Settings',exact:true}).click();
 const section=page.getByLabel('Development section');if(!(await section.getByLabel('Player testing').isVisible()))await section.locator('summary').first().click();
 const rogue=page.getByLabel('Imported Rogue combat features');await expect(rogue.getByRole('button',{name:'Steady Aim'})).toBeVisible();
 await rogue.getByRole('button',{name:'Steady Aim'}).click();await expect(rogue).toContainText('Steady Aim: active');
 await page.reload();await page.getByRole('button',{name:'Continue Adventure'}).click();
 await page.getByRole('button',{name:'Open navigation menu'}).click();await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Settings',exact:true}).click();
 const after=page.getByLabel('Imported Rogue combat features');await expect(after).toContainText('Steady Aim: active');await expect(after.getByLabel('Rogue positioning').locator('button').first()).toBeDisabled();

});
