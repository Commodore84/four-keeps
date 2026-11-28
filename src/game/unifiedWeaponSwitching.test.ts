import {describe,expect,it} from 'vitest';
import {newCampaign,type Campaign} from './campaign';
import {createCharacterDraft} from '../app/CharacterCreator';
import {ITEMS} from './creationEquipment';
import {ammunitionNamesForWeapon} from './weaponAttackProfile';
import {
 addCompanionEnemy,attackUnifiedCarriedWeapon,attackImportedRogue,withUnifiedCarriedWeaponAttack,endCompanionTurn,stowUnifiedHeldWeapon,
 startUnifiedEncounter,unifiedCarriedWeaponChoices,unifiedHeldWeapons,
} from './companionEncounter';
import {beginAdventureSession,proposeAdventureEncounter} from './adventureSession';
import {startTacticalEncounter,tacticalPlayerAttack} from './tacticalCombat';

const currency={CP:0,SP:0,EP:0,GP:0,PP:0};
function fighter(weapons:{name:string;quantity:number}[]=[
 {name:'Shortbow',quantity:1},{name:'Dagger',quantity:2},{name:'Arrows',quantity:20}
],level=5):Campaign {
 const base=newCampaign('Carried weapon tests');
 return {...base,character:{
  ...base.character!,classId:'fighter',level,proficiencyBonus:level>=5?3:2,
  scores:{...base.character!.scores,str:12,dex:16},weaponProficiencies:['Simple','Martial'],
 },characterIdentity:{
  name:'Weapon tester',speciesId:'human',classId:'fighter',backgroundId:'soldier',
  draftId:'weapons',pronouns:'',appearance:'',personality:'',backstory:'',
 },encounterLoadout:{weaponId:'shortbow'},
 inventoryLedger:{currency,gear:weapons}};
}
function ready(source=fighter(),distance=1){
 return addCompanionEnemy(startUnifiedEncounter(source,{nighthawk:20},{nighthawk:{x:1,y:1}},{}),
  'guard',15,{x:1+distance,y:1},100,12,4);
}
const item=(c:Campaign,name:string)=>c.inventoryLedger?.gear.find(g=>g.name===name)?.quantity;

describe('unified class-feature combat uses 2024 carried/held weapon interactions',()=>{
 it('makes all 38 carried catalog weapons selectable with real hand and ammunition checks',()=>{
  const all=ITEMS.filter(item=>item.category==='weapon');
  expect(all).toHaveLength(38);
  for(const item of all){
   const ammo=ammunitionNamesForWeapon(item).slice(0,1).map(name=>({name,quantity:20}));
   const gear=[{name:'Shortbow',quantity:1},{name:'Arrows',quantity:20},
    {name:item.name,quantity:1},...ammo];
   const c=ready(fighter(gear));
   const options=unifiedCarriedWeaponChoices(c).filter(o=>o.itemId===item.id);
   expect(options.length,item.name).toBeGreaterThan(0);
   expect(options.some(o=>o.handPlan.eligible),item.name).toBe(true);
  }
 });
 it('disables an out-of-ammunition carried weapon but leaves the primary melee choices',()=>{
  const c=ready(fighter([{name:'Shortbow',quantity:1},{name:'Arrows',quantity:0},{name:'Dagger',quantity:2}]));
  expect(unifiedCarriedWeaponChoices(c).find(p=>p.id==='shortbow:ranged')?.handPlan.reason)
   .toContain('No Arrows');
  expect(unifiedCarriedWeaponChoices(c).find(p=>p.id==='dagger')?.handPlan.eligible).toBe(true);
 });
 it('draws a carried dagger for stabbing without changing the preferred Shortbow',()=>{
  const c=ready();
  const snapshot=structuredClone(c);
  const choices=unifiedCarriedWeaponChoices(c);
  expect(choices.find(x=>x.id==='dagger')?.handPlan.interactions).toContain('draw Dagger (Attack interaction)');
  expect(choices.find(x=>x.id==='shortbow:ranged')?.handPlan.eligible).toBe(true);
  const next=attackUnifiedCarriedWeapon(c,'dagger','melee','guard',1,2,'Piercing',5);
  expect(next.encounterLoadout).toEqual(c.encounterLoadout);
  expect(unifiedHeldWeapons(next)).toEqual({main:'shortbow',off:'dagger'});
  expect(next.companionEncounter?.weaponObjectInteractionUsed).toBe(false);
  expect(next.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(next.companionEncounter?.log.at(-1)).toContain('draw Dagger');
  expect(item(next,'Dagger')).toBe(2);
  expect(c).toEqual(snapshot);
 });
 it('throws a carried dagger from the belt, deducting one on a miss and tracking recovery',()=>{
  const c=ready(fighter([{name:'Shortbow',quantity:1},{name:'Arrows',quantity:20},{name:'Dagger',quantity:1}]),4);
  const next=attackUnifiedCarriedWeapon(c,'dagger','thrown','guard',1,2,'Piercing',20);
  expect(next.encounterLoadout?.weaponId).toBe('shortbow');
  expect(item(next,'Dagger')).toBe(0);
  expect(next.companionEncounter?.thrownWeaponsPendingRecovery?.Dagger).toBe(1);
  expect(unifiedHeldWeapons(next)).toEqual({main:'shortbow',off:undefined});
  expect(next.companionEncounter?.weaponObjectInteractionUsed).toBe(false);
  expect(unifiedCarriedWeaponChoices(next).some(x=>x.itemId==='dagger')).toBe(false);
  expect(item(c,'Dagger')).toBe(1);
 });
 it('allows one Attack-action stow when the free interaction was used, while rejecting a shielded bow',()=>{
  const original=ready();
  const handsFull={...original,companionEncounter:{...original.companionEncounter!,
   weaponHands:{main:'shortbow',off:'dagger'},weaponObjectInteractionUsed:true}};
  const snapshot=structuredClone(handsFull);
  const plan=unifiedCarriedWeaponChoices(handsFull).find(x=>x.id==='shortbow:ranged');
  expect(plan?.handPlan.eligible).toBe(true);
  expect(plan?.handPlan.interactions).toContain('stow Dagger (Attack interaction)');
  const fired=attackUnifiedCarriedWeapon(handsFull,'shortbow','ranged','guard',15,3,'Piercing',5,2);
  expect(unifiedHeldWeapons(fired)).toEqual({main:'shortbow',off:undefined});
  expect(fired.companionEncounter?.weaponObjectInteractionUsed).toBe(true);
  expect(handsFull).toEqual(snapshot);
  const shielded={...original,encounterLoadout:{weaponId:'shortbow',shieldId:'shield'}};
  expect(unifiedCarriedWeaponChoices(shielded).find(p=>p.id==='shortbow:ranged')?.handPlan.eligible).toBe(false);
 });
 it('stows a weapon with the free object interaction, then resets the interaction next turn but retains hands',()=>{
  const initial=ready();
  const c={...initial,companionEncounter:{...initial.companionEncounter!,
   weaponHands:{main:'shortbow',off:'dagger'}}};
  const stowed=stowUnifiedHeldWeapon(c,'off');
  expect(stowed.companionEncounter?.participants.nighthawk.actionUsed).toBe(false);
  expect(stowed.companionEncounter?.weaponObjectInteractionUsed).toBe(true);
  expect(()=>stowUnifiedHeldWeapon(stowed,'main')).toThrow('interaction');
  expect(unifiedHeldWeapons(JSON.parse(JSON.stringify(stowed)))).toEqual({main:'shortbow'});
  const next=endCompanionTurn(stowed,'nighthawk');
  const refreshed=endCompanionTurn(next,'guard');
  expect(refreshed.companionEncounter?.weaponObjectInteractionUsed).toBe(false);
  expect(unifiedHeldWeapons(refreshed)).toEqual({main:'shortbow'});
 });
 it('keeps weapon mastery for a selected carried weapon rather than the preferred weapon',()=>{
  const draft=createCharacterDraft();
  draft.selections.classChoices={'weapon-mastery':['shortsword']};
  const source={...fighter([{name:'Shortbow',quantity:1},{name:'Shortsword',quantity:1},{name:'Arrows',quantity:20}]),
   characterBuild:draft};
  const next=attackUnifiedCarriedWeapon(ready(source),'shortsword','melee','guard',17,3,'Piercing',5);
  expect(next.companionEncounter?.weaponVex?.target).toBe('guard');
  expect(next.encounterLoadout?.weaponId).toBe('shortbow');
  expect(unifiedHeldWeapons(next).off).toBe('shortsword');
 });
 it('keeps Sneak Attack and its turn limit when a Rogue stabs with a carried dagger',()=>{
  const source=fighter();
  const rogue={...source,character:{...source.character!,classId:'rogue',level:1,proficiencyBonus:2},
   characterIdentity:{...source.characterIdentity!,classId:'rogue'}};
  const initial=ready(rogue);
  const before=initial.companionEncounter!;
  const hidden={...initial,companionEncounter:{...before,participants:{
   ...before.participants,nighthawk:{...before.participants.nighthawk,rogueHidden:true,rogueDetectedBy:[]}
  }}};
  const next=withUnifiedCarriedWeaponAttack(hidden,'dagger','melee',using=>
   attackImportedRogue(using,'guard',15,3,5,[2],1));
  expect(next.encounterLoadout?.weaponId).toBe('shortbow');
  expect(unifiedHeldWeapons(next)).toEqual({main:'shortbow',off:'dagger'});
  expect(next.companionEncounter?.participants.nighthawk.rogueSneakUsed).toBe(true);
  expect(item(next,'Dagger')).toBe(2);
 });
 it('preserves completed attack state and held weapons through JSON reload',()=>{
  const attacked=attackUnifiedCarriedWeapon(ready(),'dagger','melee','guard',1,2,'Piercing',5);
  const resumed=JSON.parse(JSON.stringify(attacked)) as Campaign;
  expect(unifiedHeldWeapons(resumed)).toEqual({main:'shortbow',off:'dagger'});
  expect(resumed.companionEncounter?.participants.nighthawk.actionUsed).toBe(true);
  expect(resumed.encounterLoadout?.weaponId).toBe('shortbow');
 });
});

const scenario={
 size:8,objective:'Survive the bandit.',actors:[
  {id:'bandit',label:'Road bandit',profile:'bandit',side:'enemies' as const,square:{x:2,y:1}}
 ],starts:[{x:1,y:1}],difficult:[],obstacles:[],exits:[{x:0,y:1}],artwork:'weapon-test.svg'
};
it('tactical class-feature engine supports Dagger stab then Shortbow shot as two Fighter attacks',()=>{
 const character=beginAdventureSession(fighter());
 const pending=proposeAdventureEncounter(character,'Bandit','action',undefined,scenario);
 const started=startTacticalEncounter(pending,{x:1,y:1},()=>12);
 const first=tacticalPlayerAttack(started,'bandit',{weaponId:'dagger',attackMode:'melee'},()=>1);
 expect(first.companionEncounter?.participants.nighthawk.primaryAttacks).toBe(1);
 expect(unifiedHeldWeapons(first)).toEqual({main:'shortbow',off:'dagger'});
 const second=tacticalPlayerAttack(JSON.parse(JSON.stringify(first)),'bandit',{weaponId:'shortbow',attackMode:'ranged'},()=>1);
 expect(second.companionEncounter?.participants.nighthawk.primaryAttacks).toBe(2);
 expect(unifiedHeldWeapons(second)).toEqual({main:'shortbow',off:undefined});
 expect(item(second,'Arrows')).toBe(19);
 expect(item(second,'Dagger')).toBe(2);
 expect(second.encounterLoadout?.weaponId).toBe('shortbow');
 expect(()=>tacticalPlayerAttack(second,'bandit',{weaponId:'dagger',attackMode:'melee'},()=>1)).toThrow('Action already used');
});
