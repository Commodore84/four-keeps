import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign} from './campaign';
import {CLASSES} from './creationClasses';
import {completePlayerRest,initialPlayerResources,playerLongRestWaitMinutes} from './playerRecovery';
import {beginAdventureSession,travelAdventure,enterSoloAdventureEncounter,resumeAdventureExploration} from './adventureSession';
import {finishCompanionEncounter,damageCompanion,spendPlayerResource} from './companionEncounter';
import {settleEncounterRewards} from './encounterRewards';
function player(classId='fighter'){
 const c=newCampaign('Recovery');c.characterIdentity={name:'Hero',classId,speciesId:'human',backgroundId:'criminal',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''};
 c.character={...c.character!,classId,currentHitPoints:2,maxHitPoints:12,resources:initialPlayerResources(classId,14)};return c;
}
const safe={confirmedSafe:true};
describe('2024 level-one rest recovery',()=>{
 it.each(CLASSES.map(c=>[c.id,c.hitDie]))('%s spends its own d%s and Constitution modifier',(id,die)=>{
 const c=player(String(id)),next=completePlayerRest(c,'short',{...safe,hitDieRolls:[Number(die)]});expect(next.character?.currentHitPoints).toBe(Number(die)===6?10:12);expect(next.hitDiceRemaining).toBe(0);expect(next.elapsedMinutes).toBe(60);expect(c.character?.currentHitPoints).toBe(2);
 expect(()=>completePlayerRest(c,'short',{...safe,hitDieRolls:[Number(die)+1]})).toThrow('Hit Dice');
 });
 it('heals at least one HP for a poor Constitution roll and caps at maximum',()=>{
 const c=player();c.character!.scores.con=1;
 expect(completePlayerRest(c,'short',{...safe,hitDieRolls:[1]}).character?.currentHitPoints).toBe(3);
 c.character!.currentHitPoints=11;c.character!.scores.con=14;expect(completePlayerRest(c,'short',{...safe,hitDieRolls:[10]}).character?.currentHitPoints).toBe(12);
 });
 it('does not restore Hit Dice or HP without expenditure on a short rest',()=>{
 const c={...player(),hitDiceRemaining:0};const next=completePlayerRest(c,'short',safe);expect(next.hitDiceRemaining).toBe(0);expect(next.character?.currentHitPoints).toBe(2);
 expect(()=>completePlayerRest(c,'short',{...safe,hitDieRolls:[1]})).toThrow();
 });
 it.each(['fighter','barbarian'])('%s recovers one use per short rest and all on long rest',id=>{
 const c=player(id),name=id==='fighter'?'Second Wind':'Rage';c.character!.resources![name].used=2;
 const next=completePlayerRest(c,'short',safe);expect(next.character?.resources?.[name].used).toBe(1);
 expect(completePlayerRest(next,'short',safe).character?.resources?.[name].used).toBe(0);
 expect(completePlayerRest(c,'long',safe).character?.resources?.[name].used).toBe(0);
 });
 it.each(['bard','paladin','ranger','sorcerer'])('%s long-rest pools remain spent on short rest',id=>{
 const c=player(id),name=Object.keys(c.character!.resources!)[0];c.character!.resources![name].used=1;
 expect(completePlayerRest(c,'short',safe).character?.resources?.[name].used).toBe(1);expect(completePlayerRest(c,'long',safe).character?.resources?.[name].used).toBe(0);
 });
 it.each(['cleric','wizard','bard','druid','paladin','ranger','sorcerer','warlock'])('%s slots recover at the correct rest',id=>{
 const c=player(id);c.character!.spellSlots={level1:id==='warlock'?1:2,usedLevel1:id==='warlock'?1:2};
 expect(completePlayerRest(c,'short',safe).character?.spellSlots?.usedLevel1).toBe(id==='warlock'?0:2);expect(completePlayerRest(c,'long',safe).character?.spellSlots?.usedLevel1).toBe(0);
 });
 it('uses Arcane Recovery only when selected and only once until long rest',()=>{
 const c=player('wizard');c.character!.spellSlots={level1:2,usedLevel1:2};
 const next=completePlayerRest(c,'short',{...safe,arcaneRecovery:true});expect(next.character?.spellSlots?.usedLevel1).toBe(1);expect(next.character?.resources?.['Arcane Recovery'].used).toBe(1);
 expect(()=>completePlayerRest(next,'short',{...safe,arcaneRecovery:true})).toThrow('unavailable');expect(completePlayerRest(next,'long',safe).character?.resources?.['Arcane Recovery'].used).toBe(0);
 expect(()=>completePlayerRest(player('cleric'),'short',{...safe,arcaneRecovery:true})).toThrow('unavailable');
 });
 it('restores all Hit Dice, HP and slots without changing unrelated conditions or inventory',()=>{
 const c={...player('cleric'),hitDiceRemaining:0};c.character!.conditions=['Poisoned','Exhaustion'];c.character!.exhaustionLevel=2;
 const next=completePlayerRest(c,'long',safe);expect(next.hitDiceRemaining).toBe(1);expect(next.character?.currentHitPoints).toBe(12);expect(next.character?.exhaustionLevel).toBe(1);expect(next.character?.conditions).toContain('Poisoned');expect(next.equipment).toEqual(c.equipment);expect(isCampaign(next)).toBe(true);
 });
 it('requires sixteen hours of explicit waiting before starting another long rest',()=>{
 const c=completePlayerRest(player(),'long',safe);expect(c.elapsedMinutes).toBe(480);expect(playerLongRestWaitMinutes(c)).toBe(960);
 expect(()=>completePlayerRest(c,'long',safe)).toThrow('960');
 const next=completePlayerRest(c,'long',{...safe,waitMinutes:960});expect(next.elapsedMinutes).toBe(1920);expect(next.lastLongRestCompletedAt).toBe(1920);
 const short=completePlayerRest(c,'short',safe);expect(playerLongRestWaitMinutes(short)).toBe(900);
 });
 it('supports explicit Elf Trance without granting it to other species',()=>{
 const c=player();c.characterIdentity!.speciesId='elf';expect(completePlayerRest(c,'long',{...safe,useTrance:true}).elapsedMinutes).toBe(240);
 expect(()=>completePlayerRest(player(),'long',{...safe,useTrance:true})).toThrow('Trance');
 });
 it('rejects unconfirmed rests, zero HP, combat, invalid clocks and higher levels atomically',()=>{
 const c=player(),before=structuredClone(c);expect(()=>completePlayerRest(c,'short',{confirmedSafe:false})).toThrow('Confirm');
 for(const hp of [0,-1,13])expect(()=>completePlayerRest({...c,character:{...c.character!,currentHitPoints:hp}},'long',safe)).toThrow();
 expect(()=>completePlayerRest({...c,character:{...c.character!,level:2}},'short',safe)).toThrow('level-one');
 expect(()=>completePlayerRest({...c,elapsedMinutes:1,lastLongRestCompletedAt:2},'short',safe)).toThrow('clock');expect(()=>completePlayerRest(newCampaign('Legacy'),'long',safe)).toThrow('legacy');expect(c).toEqual(before);
 });
 it('supports solo encounter, persistent rewards and recovery without companion registration',()=>{
 let c=travelAdventure(travelAdventure(beginAdventureSession(player()),'crossroads'),'watchtower');c=enterSoloAdventureEncounter(c,{playerInitiative:20,enemyInitiative:10,enemyId:'scout',hitPoints:3,armorClass:10,attackModifier:2,damageModifier:1,damageDice:'1d4'});
 expect(c.companionEncounter?.order).toEqual(['nighthawk','scout']);expect(()=>completePlayerRest(c,'short',safe)).toThrow('encounter');c=spendPlayerResource(c,'Second Wind');c=damageCompanion(c,'nighthawk',1,'Slashing');c=finishCompanionEncounter(c);c=settleEncounterRewards(c,{xp:5,gold:2,items:[]});c=resumeAdventureExploration(c);c=completePlayerRest(c,'short',{...safe,hitDieRolls:[5]});expect(c.character?.currentHitPoints).toBe(8);expect(c.character?.resources?.['Second Wind'].used).toBe(0);expect(c.xp).toBe(5);
 });
});

it('keeps legacy resource expenditure while applying the corrected short-rest policy to older imported saves',()=>{
 const c=player();c.character!.resources!['Second Wind']={maximum:2,used:2,recovery:'long'};
 const restored=JSON.parse(JSON.stringify(c));expect(completePlayerRest(restored,'short',{confirmedSafe:true}).character?.resources?.['Second Wind'].used).toBe(1);expect(c.character?.resources?.['Second Wind'].used).toBe(2);
});
it('rejects a malformed solo setup without creating or mutating a battle',()=>{
 const c=travelAdventure(travelAdventure(beginAdventureSession(player()),'crossroads'),'watchtower'),before=structuredClone(c);
 expect(()=>enterSoloAdventureEncounter(c,{playerInitiative:20,enemyInitiative:10,enemyId:'guard',hitPoints:3,armorClass:0,attackModifier:2,damageModifier:1,damageDice:'1d4'})).toThrow('statistics');expect(c).toEqual(before);expect(c.companionEncounter).toBeUndefined();
});
it('does not permit recovery while a pending check has locked an action',()=>{
 const c={...player(),pendingCheck:{skill:'Stealth',mode:'normal' as const,reason:'Hide',token:'locked'}};expect(()=>completePlayerRest(c,'short',{confirmedSafe:true})).toThrow('encounter');
});
