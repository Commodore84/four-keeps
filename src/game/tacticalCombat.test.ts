import {describe,expect,it} from 'vitest';
import {newCampaign,type Campaign} from './campaign';
import {beginAdventureSession,proposeAdventureEncounter} from './adventureSession';
import {previewCompanionMovement,primaryAttackLimit} from './companionEncounter';
import {executeDmTactics,finishTacticalEncounter,resolveTacticalReaction,resumeTacticalMovement,startTacticalEncounter,
 tacticalAction,tacticalEndTurn,tacticalMove,tacticalPlayerAttack,tacticalPlayerSpell} from './tacticalCombat';

const battlePlan={
 size:8,objective:'Reach the north gate.',actors:[
  {id:'bandit',label:'Road bandit',profile:'bandit',side:'enemies',square:{x:5,y:1}},
  {id:'guard',label:'Watchguard',profile:'guard',side:'allies',square:{x:6,y:5}},
 ],starts:[{x:1,y:1},{x:1,y:2}],difficult:[{x:2,y:1}],obstacles:[{x:3,y:3}],exits:[{x:0,y:1}],artwork:'forest-ruins-test.svg',
};
const importCampaign=(classId='fighter',level=5):Campaign=>{
 const base=newCampaign('Tactical rules');
 return beginAdventureSession({...base,character:{...base.character!,classId,level,currentHitPoints:20,maxHitPoints:20,weaponProficiencies:['Simple','Martial']},
  characterIdentity:{name:'Hero',classId,speciesId:'human',backgroundId:'guard',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},
  encounterLoadout:{weaponId:'shortbow'},inventoryLedger:{currency:{GP:0,PP:0,SP:0,EP:0,CP:0},gear:[{name:'Shortbow',quantity:1},{name:'Arrows',quantity:6}]}});
};
const middle=(faces:number)=>faces===20?12:1;
const begin=(classId='fighter',level=5)=>startTacticalEncounter(proposeAdventureEncounter(importCampaign(classId,level),'Road bandit','action',undefined,battlePlan),{x:1,y:1},middle);
const restore=(campaign:Campaign)=>JSON.parse(JSON.stringify(campaign)) as Campaign;
describe('structured tactical combat',()=>{
 it('rejects forged profiles and placements and saves actual surprise rolls and initiative order',()=>{
  const base=importCampaign();
  expect(()=>proposeAdventureEncounter(base,'Bandit','turn',undefined,{...battlePlan,starts:[{x:5,y:1}]})).toThrow('open');
  expect(()=>proposeAdventureEncounter(base,'Bandit','turn',undefined,{...battlePlan,actors:[{...battlePlan.actors[0],profile:'unverified'}]})).toThrow('verified actor');
  const pending=proposeAdventureEncounter(base,'Bandit','turn',undefined,{...battlePlan,surprised:true});
  expect(()=>startTacticalEncounter(pending,{x:2,y:2},middle)).toThrow('starting');
  const dice=[15,3,11,10];
  const started=restore(startTacticalEncounter(pending,{x:1,y:2},()=>dice.shift()!));
  expect(started.companionEncounter?.order).toEqual(['bandit','guard','nighthawk']);
  expect(started.companionEncounter?.phaseThree?.initiative[0]).toMatchObject({dice:[15,3],total:6});
  expect(started.tacticalArtwork?.[started.companionEncounter!.phaseThree!.scenario.locationKey]).toBe('forest-ruins-test.svg');
 });
 it('allows two Fighter attacks with movement between and spends arrows individually',()=>{
  const original=begin();
  expect(primaryAttackLimit(original)).toBe(2);
  const preview=previewCompanionMovement(original,'nighthawk',2,1);
  expect(preview.costFeet).toBe(10);
  const first=tacticalPlayerAttack(original,'bandit',{},middle);
  const moved=tacticalMove(first,'nighthawk',{x:2,y:1},middle);
  const second=tacticalPlayerAttack(restore(moved),'bandit',{},middle);
  expect(second.inventoryLedger?.gear.find(row=>row.name==='Arrows')?.quantity).toBe(4);
  expect(second.companionEncounter?.participants.nighthawk).toMatchObject({primaryAttacks:2,movementSpentFeet:10});
  expect(()=>tacticalPlayerAttack(second,'bandit',{},middle)).toThrow('Action already used');
 });
 it('applies Sneak Attack and Vex with one arrow on an eligible Rogue attack',()=>{
  const original=begin('rogue',5);
  const battle=original.companionEncounter!;
  const prepared={...original,companionEncounter:{...battle,participants:{...battle.participants,guard:{...battle.participants.guard,x:5,y:2}}}};
  const hit=tacticalPlayerAttack(prepared,'bandit',{sneak:true},middle);
  expect(hit.companionEncounter?.participants.nighthawk.rogueSneakUsed).toBe(true);
  expect(hit.inventoryLedger?.gear.find(row=>row.name==='Arrows')?.quantity).toBe(5);
 });
 it('pauses NPC attacks before Uncanny Dodge and commits damage once across reload',()=>{
  const npc=tacticalEndTurn(begin('rogue',5),middle);
  const pending=executeDmTactics(npc,[{kind:'attack',actor:'bandit',target:'nighthawk',ranged:true},{kind:'end',actor:'bandit'}],middle);
  expect(pending.companionEncounter?.phaseThree?.pendingHit?.uncanny).toBe(true);
  expect(pending.character?.currentHitPoints).toBe(20);
  const resolved=resolveTacticalReaction(restore(pending),true,middle);
  expect(resolved.character?.currentHitPoints).toBe(19);
  expect(resolved.companionEncounter?.phaseThree?.actors.bandit.ammunition).toBe(19);
  expect(()=>resolveTacticalReaction(resolved,true,middle)).toThrow('reaction attack');
  const guard=executeDmTactics(resolved,[{kind:'end',actor:'bandit'}],middle);
  expect(guard.companionEncounter?.order[guard.companionEncounter.turnIndex]).toBe('guard');
  expect(()=>executeDmTactics(guard,[{kind:'move',actor:'nighthawk',x:0,y:0}],middle)).toThrow('active NPC');
  const dodge=executeDmTactics(guard,[{kind:'action',actor:'guard',action:'Dodge'},{kind:'end',actor:'guard'}],middle);
  expect(dodge.companionEncounter?.participants.guard.dodging).toBe(true);
 });
 it('preserves interrupted movement and resumes exactly once',()=>{
  const initial=begin();
  const battle=initial.companionEncounter!;
  const stance={...initial,companionEncounter:{...battle,participants:{...battle.participants,bandit:{...battle.participants.bandit,x:2,y:1}}}};
  const pending=restore(tacticalMove(stance,'nighthawk',{x:0,y:1},middle));
  expect(pending.companionEncounter?.participants.nighthawk.x).toBe(1);
  expect(pending.companionEncounter?.pendingOpportunity?.attackerIds).toEqual(['bandit']);
  const declined=executeDmTactics(pending,[{kind:'opportunity',actor:'bandit',take:false}],middle);
  expect(resumeTacticalMovement(declined).companionEncounter?.participants.nighthawk.x).toBe(0);
  expect(()=>resumeTacticalMovement(resumeTacticalMovement(declined))).toThrow('opportunity reactions');
 });
 it('casts Web, tracks saves and spends the spell slot before returning to Adventure',()=>{
  const base=importCampaign('wizard',3);
  const c={...base,character:{...base.character!,preparedSpells:['Web'],spellSlots:{level1:4,usedLevel1:0,level2:2,usedLevel2:0}}};
  const initial=startTacticalEncounter(proposeAdventureEncounter(c,'Bandit','action',undefined,battlePlan),{x:1,y:1},middle);
  const web=tacticalPlayerSpell(initial,'Web','nighthawk',middle,{x:4,y:0});
  expect(web.character?.spellSlots?.usedLevel2).toBe(1);
  expect(web.companionEncounter?.participants.nighthawk.concentratingOn).toBe('Web');
  expect(web.companionEncounter?.web).toBeDefined();
  const ended=finishTacticalEncounter(restore(web),'negotiation','Both sides agreed to disengage.');
  expect(ended.adventureSession?.status).toBe('exploring');
  expect(ended.companionEncounter?.phaseThree?.outcome).toBe('negotiation');
  expect(ended.companionEncounter?.web).toBeUndefined();
  expect(ended.character?.spellSlots?.usedLevel2).toBe(1);
  expect(()=>finishTacticalEncounter(ended,'negotiation')).toThrow('active tactical');
 });
 it('charges the Ready action and offers the stored trigger when a hostile ends a move in reach',()=>{
  const initial=begin();
  const melee={...initial,encounterLoadout:{weaponId:'dagger'},inventoryLedger:{...initial.inventoryLedger!,gear:[{name:'Dagger',quantity:1}]}};
  const ready=tacticalAction(melee,'nighthawk','Ready',{},middle);
  const turn=tacticalEndTurn(ready,middle);
  const approached=executeDmTactics(turn,[{kind:'move',actor:'bandit',x:2,y:1},{kind:'end',actor:'bandit'}],middle);
  expect(approached.companionEncounter?.phaseThree?.pendingReady?.target).toBe('bandit');
  const attacked=resolveTacticalReaction(approached,true,middle);
  expect(attacked.companionEncounter?.participants.nighthawk.reactionUsed).toBe(true);
  expect(attacked.companionEncounter?.phaseThree?.pendingReady).toBeUndefined();
 });
});
