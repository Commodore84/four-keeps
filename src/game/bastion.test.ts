import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign,type Campaign} from './campaign';
import {
 SPECIAL_FACILITIES,BASIC_BUILD_COSTS,BIOMES,BASTION_TURN_MINUTES,
 planBastion,establishBastion,eligibleSpecial,bastionSlots,addSpecialFacility,replaceSpecialFacility,
 constructBasic,expandBasic,constructWallSection,upgradeSpecialFacility,
 enterBastion,leaveBastion,issueMaintainOrder,issueFacilityOrder,advanceBastionClock,
 canIssueOrder,currentBastionTurn,roomOpportunity,validBastionState,
 gardenChoices,gardenHarvestRequest,collectBastionSupply,changeGardenType,nameBastionHireling,
} from './bastion';
import {walletCopper} from './frontierShop';
const make=(level=5,gp=12000):Campaign=>{
 const original=newCampaign('Bastion test');
 return {...original,character:{...original.character!,level,subclass:'Arcane Trickster',classId:'rogue',expertiseSkills:['Stealth']},
  characterIdentity:{name:'Explorer',classId:'rogue',speciesId:'human',backgroundId:'sage',draftId:'test',pronouns:'',appearance:'',personality:'',backstory:''},
  location:'Dasahi',elapsedMinutes:0,inventoryLedger:{currency:{CP:5,SP:2,EP:0,GP:gp,PP:0},gear:[]}};
};
const planned=(level=5,gp=12000)=>planBastion(make(level,gp),{name:'Stonewatch Keep',region:'Dasahi',biome:'Mountain',description:'An old watchtower'});
const established=(level=5,gp=12000)=>establishBastion(planned(level,gp),{
 cramped:'Bedroom',roomy:'Storage',specials:['library','workshop']});
describe('2024 Bastion progression and property records',()=>{
 it('keeps the prospective property inert at levels 1–4, but saved and visitable through the DM',()=>{
  const c=planned(1);
  expect(c.bastion?.status).toBe('prospective');expect(c.bastion?.facilities).toEqual([]);
  expect(isCampaign(JSON.parse(JSON.stringify(c)))).toBe(true);
  expect(()=>establishBastion(c,{cramped:'Bedroom',roomy:'Kitchen',specials:['library','workshop']})).toThrow('level 5');
  expect(bastionSlots(4)).toBe(0);
 });
 it('has all 29 catalog entries with level and prerequisite gating',()=>{
  expect(SPECIAL_FACILITIES).toHaveLength(29);
  expect(new Set(SPECIAL_FACILITIES.map(d=>d.id)).size).toBe(29);
  const c=planned();
  expect(eligibleSpecial(c,SPECIAL_FACILITIES.find(d=>d.id==='arcane-study')!)).toBe(true);
  expect(eligibleSpecial(c,SPECIAL_FACILITIES.find(d=>d.id==='sanctuary')!)).toBe(false);
  expect(eligibleSpecial(c,SPECIAL_FACILITIES.find(d=>d.id==='guildhall')!)).toBe(false);
  expect(bastionSlots(5)).toBe(2);expect(bastionSlots(9)).toBe(4);
  expect(bastionSlots(13)).toBe(5);expect(bastionSlots(17)).toBe(6);
  expect(BIOMES).toContain('Mountain');
 });
 it('starts with exactly two free basic facilities and two free special facilities',()=>{
  const c=established();
  expect(c.bastion!.facilities.map(f=>[f.name,f.size])).toEqual([
   ['Bedroom','Cramped'],['Storage','Roomy'],['Library','Roomy'],['Workshop','Roomy'],
  ]);
  expect(walletCopper(c.inventoryLedger!.currency)).toBe(1200025);
  expect(isCampaign(c)).toBe(true);
  expect(()=>establishBastion(c,{cramped:'Bedroom',roomy:'Kitchen',specials:['library','workshop']})).toThrow();
  expect(()=>addSpecialFacility(c,'garden')).toThrow('slots');
  expect(()=>establishBastion(planned(),{cramped:'Bedroom',roomy:'Kitchen',specials:['library','library']})).toThrow('twice');
 });
 it('adds free facilities at 9/13/17 and allows only one replacement per new level',()=>{
  let c=established();
  c={...c,character:{...c.character!,level:9}};
  c=addSpecialFacility(c,'training-area');c=addSpecialFacility(c,'arcane-study');
  expect(()=>addSpecialFacility(c,'garden')).toThrow('slots');
  c={...c,character:{...c.character!,level:10}};
  const replaced=replaceSpecialFacility(c,c.bastion!.facilities.find(f=>f.definitionId==='workshop')!.id,'garden');
  expect(replaced.bastion?.facilities.some(f=>f.definitionId==='garden')).toBe(true);
  expect(()=>replaceSpecialFacility(replaced,replaced.bastion!.facilities.find(f=>f.definitionId==='library')!.id,'storehouse')).toThrow('level-up');
  c={...replaced,character:{...replaced.character!,level:17}};
  c=addSpecialFacility(c,'guildhall');
  c=addSpecialFacility(c,'pub');
  expect(c.bastion!.facilities.filter(f=>f.kind==='special')).toHaveLength(6);
  expect(()=>addSpecialFacility(c,'barrack')).toThrow('slots');
  expect(isCampaign(c)).toBe(true);
 });
 it('allows the Garden exception to repeating special facilities but not other types',()=>{
  let c=established();
  c={...c,character:{...c.character!,level:9}};
  c=addSpecialFacility(c,'garden');c=addSpecialFacility(c,'garden');
  expect(c.bastion?.facilities.filter(f=>f.definitionId==='garden')).toHaveLength(2);
  expect(()=>addSpecialFacility(c,'library')).toThrow('slots');
 });
});
describe('2024 Bastion paid construction and deterministic time',()=>{
 it('charges the shared wallet once for added rooms and completes after the specified days',()=>{
  let c=established(),baseCopper=walletCopper(c.inventoryLedger!.currency);
  expect(BASIC_BUILD_COSTS.Roomy).toEqual({gp:1000,days:45});
  c=constructBasic(c,'Kitchen','Roomy');
  const f=c.bastion!.facilities.find(x=>x.name==='Kitchen')!;
  expect(walletCopper(c.inventoryLedger!.currency)).toBe(baseCopper-100000);
  expect(c.bastion!.construction[0]).toMatchObject({kind:'new-basic',costGp:1000,finishesAt:45*1440});
  expect(()=>expandBasic(c,f.id)).toThrow('already underway');
  c=advanceBastionClock({...c,elapsedMinutes:44*1440},()=>1);
  expect(c.bastion!.construction).toHaveLength(1);
  c=advanceBastionClock({...c,elapsedMinutes:45*1440},()=>1);
  expect(c.bastion!.construction).toHaveLength(0);
  expect(c.bastion!.facilities.find(x=>x.id===f.id)?.size).toBe('Roomy');
  c=expandBasic(c,f.id);
  expect(walletCopper(c.inventoryLedger!.currency)).toBe(baseCopper-300000);
  c=advanceBastionClock({...c,elapsedMinutes:(45+80)*1440},()=>1);
  expect(c.bastion!.facilities.find(x=>x.id===f.id)?.size).toBe('Vast');
  expect(isCampaign(c)).toBe(true);
  expect(advanceBastionClock(c)).toBe(c);
 });
 it('tracks walls individually without granting an unverified enclosure bonus',()=>{
  const c=constructWallSection(established(),'South gate');
  expect(c.bastion?.wallSections).toHaveLength(1);
  expect(c.bastion?.construction[0]).toMatchObject({costGp:250,finishesAt:10*1440});
  expect(c.bastion?.wallSections[0].section).toBe('South gate');
  expect(walletCopper(c.inventoryLedger!.currency)).toBe(1200025-25000);
 });
 it('enlarges only eligible special facilities and does not invent construction delays',()=>{
  let c=established(),b=c.bastion!;
  expect(()=>upgradeSpecialFacility(c,b.facilities.find(x=>x.definitionId==='library')!.id)).toThrow();
  c={...c,character:{...c.character!,level:9}};
  c=addSpecialFacility(c,'garden');
  b=c.bastion!;
  const f=b.facilities.find(x=>x.definitionId==='garden')!;
  c=upgradeSpecialFacility(c,f.id);
  expect(c.bastion?.facilities.find(x=>x.id===f.id)?.size).toBe('Vast');
  expect(c.bastion?.construction).toHaveLength(0);
  expect(walletCopper(c.inventoryLedger!.currency)).toBe(1200025-200000);
  expect(()=>upgradeSpecialFacility(c,f.id)).toThrow();
  expect(()=>constructBasic(established(5,0),'Kitchen','Roomy')).toThrow('Not enough gold');
 });
});
describe('Bastion orders and DM adjudication',()=>{
 it('requires presence and spends exactly one order per facility per Bastion turn',()=>{
  let c=established();
  const library=c.bastion!.facilities.find(x=>x.definitionId==='library')!.id;
  expect(canIssueOrder(c,library)).toBe(false);
  c=enterBastion(c);expect(c.location).toBe('Stonewatch Keep');
  expect(canIssueOrder(c,library)).toBe(true);
  c=issueFacilityOrder(c,library,'Research the ruins of Dasahi');
  expect(c.bastion!.orders[0]).toMatchObject({type:'Research',status:'active',issuedTurn:0});
  expect(()=>issueFacilityOrder(c,library,'Research again')).toThrow();
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES},()=>50);
  expect(c.bastion!.orders[0].status).toBe('awaiting-dm');
  expect(c.bastion!.events).toHaveLength(0); // no Maintain event when present
  expect(canIssueOrder(c,library)).toBe(true);
  c=issueFacilityOrder(c,library,'Research the distant ruin');
  expect(c.bastion?.orders).toHaveLength(2);
 });
 it('maintain is mutually exclusive with special orders and triggers official event d100',()=>{
  let c=enterBastion(established());
  c=issueMaintainOrder(c,()=>84);
  expect(c.bastion!.events[0]).toMatchObject({name:'Refugees',roll:84,turn:0});
  const library=c.bastion!.facilities.find(x=>x.definitionId==='library')!.id;
  expect(canIssueOrder(c,library)).toBe(false);
  expect(()=>issueMaintainOrder(c,()=>10)).toThrow();
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES},()=>50);
  expect(c.bastion?.events).toHaveLength(1);
 });
 it('automatically defaults to Maintain while away and records events without granting unearned treasure',()=>{
  let c=enterBastion(established());
  c=leaveBastion(c);
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES*3},()=>99);
  expect(currentBastionTurn(c)).toBe(3);
  expect(c.bastion?.events.map(e=>e.name)).toEqual(['Treasure','Treasure','Treasure']);
  expect(c.bastion?.orders).toHaveLength(0);
  expect(walletCopper(c.inventoryLedger!.currency)).toBe(1200025);
  expect(c.bastion?.events.every(e=>e.status==='awaiting-dm')).toBe(true);
  expect(advanceBastionClock(c)).toBe(c);
 });
 it('uses the Barrack printed Recruit order with a bounded defender cap',()=>{
  let c=established();c={...c,character:{...c.character!,level:9}};
  c=addSpecialFacility(c,'barrack');c=enterBastion(c);
  const barrack=c.bastion!.facilities.find(f=>f.definitionId==='barrack')!.id;
  c=issueFacilityOrder(c,barrack,'Try to recruit 200 defenders');
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES},()=>50);
  expect(c.bastion?.defenders).toBe(4);
  expect(c.bastion?.orders[0].status).toBe('resolved');
  c=issueFacilityOrder(c,barrack,'Again');
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES*2},()=>50);
  c=issueFacilityOrder(c,barrack,'Again');
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES*3},()=>50);
  expect(c.bastion?.defenders).toBe(12);
  expect(advanceBastionClock(c)).toBe(c);
  expect(roomOpportunity('Storage','Coastal')).toContain('captains');
  expect(validBastionState(JSON.parse(JSON.stringify(c.bastion)))).toBe(true);
 });
});

describe('Garden harvests and separate Bastion storage',()=>{
 it('resolves a Food Garden harvest after seven days into Bastion storage, not player inventory',()=>{
  let c=establishBastion(planned(),{cramped:'Bedroom',roomy:'Storage',
   specials:['garden','library'],gardenTypes:['Food','Food']});
  c=enterBastion(c);
  const garden=c.bastion!.facilities.find(f=>f.definitionId==='garden')!;
  const request=gardenHarvestRequest(['Food'],['Rations']);
  expect(request).toBe('Food:Rations');
  c=issueFacilityOrder(c,garden.id,request);
  expect(()=>issueFacilityOrder(c,garden.id,request)).toThrow();
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES},()=>50);
  expect(c.bastion!.stores).toEqual([{name:'Rations',quantity:100}]);
  expect(c.bastion!.orders[0].status).toBe('resolved');
  expect(c.inventoryLedger!.gear).toHaveLength(0);
  expect(advanceBastionClock(c)).toBe(c);
  expect(()=>collectBastionSupply(c,'Rations',101)).toThrow();
  c=collectBastionSupply(c,'Rations',30);
  expect(c.bastion!.stores).toEqual([{name:'Rations',quantity:70}]);
  expect(c.inventoryLedger!.gear).toEqual([{name:'Rations',quantity:30}]);
  c=leaveBastion(c);
  expect(()=>collectBastionSupply(c,'Rations',1)).toThrow();
  expect(isCampaign(JSON.parse(JSON.stringify(c)))).toBe(true);
 });
 it('a Vast Garden independently harvests two legal plots and cannot produce invented goods',()=>{
  let c=establishBastion(planned(),{cramped:'Bedroom',roomy:'Storage',
   specials:['garden','library'],gardenTypes:['Food','Food']});
  const garden=c.bastion!.facilities.find(f=>f.definitionId==='garden')!;
  const base=walletCopper(c.inventoryLedger!.currency);
  c=upgradeSpecialFacility(c,garden.id,'Herb');
  const updated=c.bastion!.facilities.find(f=>f.id===garden.id)!;
  expect(updated.gardenTypes).toEqual(['Food','Herb']);
  expect(updated.size).toBe('Vast');
  expect(walletCopper(c.inventoryLedger!.currency)).toBe(base-200000);
  expect(()=>gardenHarvestRequest(['Food','Herb'],['Rations','Unknown'])).toThrow();
  c=enterBastion(c);
  expect(()=>issueFacilityOrder(c,garden.id,'Food:Rations|Herb:Basic Poison')).toThrow();
  const request=gardenHarvestRequest(['Food','Herb'],['Rations','Potion']);
  c=issueFacilityOrder(c,garden.id,request);
  c=advanceBastionClock({...c,elapsedMinutes:BASTION_TURN_MINUTES},()=>50);
  expect(c.bastion!.stores).toEqual([
   {name:'Rations',quantity:100},{name:'Potion of Healing',quantity:1},
  ]);
  expect(isCampaign(c)).toBe(true);
 });
 it('four Garden types retain different official harvest menus',()=>{
  expect(gardenChoices('Decorative').map(x=>x.id)).toEqual(['Bouquets','Perfume','Candles']);
  expect(gardenChoices('Poison').map(x=>x.id)).toEqual(['Antitoxin','Basic Poison']);
 });
});

describe('rule-accurate legal repeatable rooms and Garden cultivation',()=>{
 it('Barracks, Stables and Training Areas may repeat, but Library and Workshop may not',()=>{
  const ids=['barrack','stable','training-area','garden'];
  for(const key of ids)expect(SPECIAL_FACILITIES.find(d=>d.id===key)?.repeatable).toBe(true);
  expect(SPECIAL_FACILITIES.find(d=>d.id==='archive')?.upgradeToVast).toBe(true);
  expect(SPECIAL_FACILITIES.find(d=>d.id==='stable')?.upgradeToVast).toBe(true);
  let c=established(17);
  c=addSpecialFacility(c,'barrack');
  c=addSpecialFacility(c,'barrack');
  c=addSpecialFacility(c,'stable');
  c=addSpecialFacility(c,'training-area');
  expect(c.bastion?.facilities.filter(f=>f.kind==='special')).toHaveLength(6);
  expect(()=>addSpecialFacility(c,'library')).toThrow('slots');
 });
 it('a Garden cannot harvest while it is being replanted and changes type after 21 days',()=>{
  let c=establishBastion(planned(),{cramped:'Bedroom',roomy:'Storage',specials:['garden','library']});
  const f=c.bastion!.facilities.find(x=>x.definitionId==='garden')!;
  c=enterBastion(c);
  expect(()=>changeGardenType(c,f.id,0,'Food')).toThrow('different');
  c=changeGardenType(c,f.id,0,'Poison');
  expect(canIssueOrder(c,f.id)).toBe(false);
  expect(()=>changeGardenType(c,f.id,0,'Herb')).toThrow('Finish current');
  c=advanceBastionClock({...c,elapsedMinutes:21*1440},()=>50);
  expect(c.bastion!.facilities.find(x=>x.id===f.id)?.gardenTypes).toEqual(['Poison']);
  const task=gardenHarvestRequest(['Poison'],['Antitoxin']);
  c=issueFacilityOrder(c,f.id,task);
  c=advanceBastionClock({...c,elapsedMinutes:28*1440},()=>50);
  expect(c.bastion!.stores).toEqual([{name:'Antitoxin',quantity:2}]);
  expect(isCampaign(c)).toBe(true);
 });
});

describe('living Bastion residents',()=>{
 it('names hirelings in the persistent world and respects the facility staffing limit',()=>{
  let c=enterBastion(established());
  const library=c.bastion!.facilities.find(f=>f.definitionId==='library')!;
  c=nameBastionHireling(c,library.id,'Tessa Marr');
  expect(c.world?.npcs.find(n=>n.name==='Tessa Marr')).toMatchObject({
    role:'Library hireling',location:'Stonewatch Keep',relationship:'Loyal employee',
  });
  expect(c.bastion!.facilities.find(f=>f.id===library.id)?.hirelingNames).toEqual(['Tessa Marr']);
  expect(()=>nameBastionHireling(c,library.id,'Another Librarian')).toThrow('already have names');
  expect(()=>nameBastionHireling(c,library.id,'Tessa Marr')).toThrow();
  expect(isCampaign(JSON.parse(JSON.stringify(c)))).toBe(true);
 });
});
