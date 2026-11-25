import {describe,expect,it} from 'vitest';
import {newCampaign} from './campaign';
import {createCharacterDraft} from '../app/CharacterCreator';
import {ITEM_BY_ID} from './creationEquipment';
import {
 addCompanionEnemy,attackCompanionWithVerifiedStats,attackWithOffhandWeapon,endCompanionTurn,
 resolveWeaponCleave,resolveWeaponPush,resolveWeaponTopple,setPlayerLoadout,startUnifiedEncounter,
} from './companionEncounter';

function armed(id:string, offhand?:string, mastery=[id,offhand??'']) {
 const base=newCampaign('Equipment arena');
 const draft=createCharacterDraft();
 draft.selections.classChoices={'weapon-mastery':mastery};
 const gear=[{name:ITEM_BY_ID[id].name,quantity:id===offhand?2:1}];
 if(offhand&&offhand!==id)gear.push({name:ITEM_BY_ID[offhand].name,quantity:1});
 const identity={name:'Player',speciesId:'human',backgroundId:'soldier',classId:'fighter',draftId:'arena',pronouns:'',appearance:'',personality:'',backstory:''};
 const character={...base.character!,classId:'fighter',scores:{...base.character!.scores,str:16},weaponProficiencies:['Simple','Martial']};
 const staged={...base,character,characterBuild:draft,characterIdentity:identity,inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear}};
 const main=setPlayerLoadout(staged,'weaponId',id);
 const loaded=offhand?setPlayerLoadout(main,'offhandWeaponId',offhand):main;
 return addCompanionEnemy(startUnifiedEncounter(loaded,{nighthawk:20},{nighthawk:{x:2,y:2}},{}),'guard',15,{x:3,y:2},100,12,4);
}
const strike=(campaign:ReturnType<typeof armed>,roll=16,damage=2)=>attackCompanionWithVerifiedStats(campaign,'nighthawk','guard',roll,damage,'Piercing');

describe('2024 equipped weapon properties and mastery',()=>{
 it('uses a verified Light follow-up once and applies Nick and Vex on the correct weapons',()=>{
  const c=armed('shortsword','dagger');
  expect(()=>attackWithOffhandWeapon(c,'guard',17,2)).toThrow('required first');
  const attacked=strike(c);
  expect(attacked.companionEncounter?.weaponVex).toMatchObject({target:'guard'});
  expect(()=>attackWithOffhandWeapon(attacked,'guard',17,2)).toThrow('second d20');
  const nick=attackWithOffhandWeapon(attacked,'guard',17,2,11);
  expect(nick.companionEncounter?.participants.guard.hp).toBe(93);
  expect(nick.companionEncounter?.participants.nighthawk.bonusActionUsed).toBe(false);
  expect(nick.companionEncounter?.weaponVex).toBeUndefined();
  expect(()=>attackWithOffhandWeapon(nick,'guard',17,2)).toThrow('required first');
 });
 it('spends the Bonus Action for a Light extra attack without Nick mastery',()=>{
  const c=strike(armed('shortsword','dagger',[]));
  const next=attackWithOffhandWeapon(c,'guard',17,2);
  expect(next.companionEncounter?.participants.nighthawk.bonusActionUsed).toBe(true);
 });
 it('uses Graze on a miss and expires Slow at the start of the attacker’s next turn',()=>{
  const grazed=strike(armed('greatsword'),1);
  expect(grazed.companionEncounter?.participants.guard.hp).toBe(97);
  const slowed=strike(armed('club'));
  expect(slowed.companionEncounter?.participants.guard.speedFeet).toBe(20);
  const after=endCompanionTurn(endCompanionTurn(slowed,'nighthawk'),'guard');
  expect(after.companionEncounter?.participants.guard.speedFeet).toBe(30);
 });
 it('applies Sap to the target’s next attack',()=>{
  const c=endCompanionTurn(strike(armed('longsword')),'nighthawk');
  expect(()=>attackCompanionWithVerifiedStats(c,'guard','nighthawk',18,3,'Slashing')).toThrow('second d20');
  const next=attackCompanionWithVerifiedStats(c,'guard','nighthawk',18,3,'Slashing',5,1);
  expect(next.companionEncounter?.weaponSap?.guard).toBeUndefined();
  expect(next.companionEncounter?.participants.nighthawk.hp).toBe(c.companionEncounter?.participants.nighthawk.hp);
 });
 it('executes Topple only after a verified save and pushes straight away after size confirmation',()=>{
  const toppled=resolveWeaponTopple(strike(armed('quarterstaff')),2);
  expect(toppled.companionEncounter?.participants.guard.conditions).toContain('Prone');
  expect(()=>resolveWeaponTopple(toppled,2)).toThrow('verified');
  const hit=strike(armed('warhammer'));
  expect(()=>resolveWeaponPush(hit,10,false)).toThrow('Large');
  const pushed=resolveWeaponPush(hit,10,true);
  expect(pushed.companionEncounter?.participants.guard).toMatchObject({x:5,y:2});
 });
 it('cleaves a second reachable target once without adding a positive ability damage modifier',()=>{
  const initial=addCompanionEnemy(armed('greataxe'),'second',12,{x:2,y:3},100,12,4);
  const c=strike(initial);
  expect(()=>resolveWeaponCleave(c,'guard',15,2)).toThrow('different target');
  const cleaved=resolveWeaponCleave(c,'second',15,2);
  expect(cleaved.companionEncounter?.participants.second.hp).toBe(98);
  expect(()=>resolveWeaponCleave(cleaved,'second',15,2)).toThrow('different target');
 });
 it('permits two-handed Versatile damage with an available hand',()=>{
  const c=armed('quarterstaff');
  const attack=(damage:number)=>attackCompanionWithVerifiedStats(c,'nighthawk','guard',15,damage,'Bludgeoning',5,undefined,undefined,undefined,false,true);
  expect(()=>attack(9)).toThrow('Versatile damage dice');
  expect(attack(8).companionEncounter?.participants.guard.hp).toBe(89);
 });
});
