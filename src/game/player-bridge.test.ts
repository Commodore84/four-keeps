import {describe,it,expect} from 'vitest';
import {newCampaign,registerSubclassActor,beginDuel,reconcileNighthawkScores,levelUpRogue,castNighthawkSpell,takeNighthawkRest,isCampaign} from './campaign';
import {CLASSES} from './creationClasses';
import {savingThrowModifier} from './checks';
import {initialSubclassCombatState} from './subclassCombatRules';
import {startUnifiedEncounter,nighthawkEquippedAttack,damageCompanion,finishCompanionEncounter,spendPlayerResource,spendUnifiedNighthawkInventory} from './companionEncounter';
import {settleEncounterRewards} from './encounterRewards';
import {beginAdventureSession,travelAdventure,enterAdventureEncounter,resumeAdventureExploration} from './adventureSession';
function player(classId='fighter'){
 const c=newCampaign('Class test');const cls=CLASSES.find(x=>x.id===classId)!;
 c.characterIdentity={name:'Aster',speciesId:'human',backgroundId:'criminal',classId,draftId:'test',pronouns:'',appearance:'',personality:'',backstory:''};
 c.character={...c.character!,classId,savingThrowProficiencies:cls.savingThrows.map(a=>a.toLowerCase()) as ('str'|'dex')[],weaponProficiencies:cls.weapons,resources:{'Second Wind':{maximum:2,used:0,recovery:'long'}}};
 c.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Longsword',quantity:1},{name:'Arrows',quantity:2}]};c.encounterLoadout={weaponId:'longsword'};
 return registerSubclassActor(c,'ally',initialSubclassCombatState('paladin','devotion',3,2));
}
const start=(c=player())=>startUnifiedEncounter(c,{nighthawk:20,ally:10},{nighthawk:{x:1,y:1},ally:{x:1,y:2}},{ally:20});
describe('class-neutral player bridge',()=>{
 it.each(CLASSES.map(c=>[c.id]))('%s uses its own saving throws and shared encounter',classId=>{
 const c=player(classId),cls=CLASSES.find(x=>x.id===classId)!;
 expect(savingThrowModifier(c.character!,'int')).toBe(2+(cls.savingThrows.includes('Int')?2:0));
 expect(start(c).companionEncounter?.participants.nighthawk.hp).toBe(10);
 });
 it('uses fighter martial proficiency without granting it to a wizard or Rogue',()=>{
 expect(nighthawkEquippedAttack(player())?.attackModifier).toBe(1);
 expect(nighthawkEquippedAttack(player('wizard'))?.attackModifier).toBe(-1);
 expect(nighthawkEquippedAttack(player('rogue'))?.proficient).toBe(false);
 });
 it('rejects legacy mutations without changing imported state',()=>{
 const c=player();const before=structuredClone(c);
 for(const mutate of [()=>beginDuel(c,'Training Dummy'),()=>reconcileNighthawkScores(c),()=>levelUpRogue({...c,xp:300},7),()=>castNighthawkSpell(c,'Mage Armor',false),()=>takeNighthawkRest(c,'long')])expect(mutate).toThrow();
 expect(c).toEqual(before);expect(beginDuel(newCampaign('Legacy'),'Training Dummy').combat).toBeDefined();
 });
 it('spends class resources and ledger inventory without duplicate aliases',()=>{
 const c=spendPlayerResource(start(),'Second Wind');expect(c.character?.resources?.['Second Wind'].used).toBe(1);
 expect(()=>spendPlayerResource(c,'Rage')).toThrow();
 const spent=spendUnifiedNighthawkInventory(c,'arrows',2);
 expect(spent.inventoryLedger?.gear.find(i=>i.name==='Arrows')?.quantity).toBe(0);
 expect(()=>spendUnifiedNighthawkInventory(spent,'arrows')).toThrow();
 });
 it('completes, rewards and resumes with persisted HP and resources and no repeat loot',()=>{
 let c=travelAdventure(travelAdventure(beginAdventureSession(player()),'crossroads'),'watchtower');
 c=enterAdventureEncounter(c,'ally',{nighthawk:20,companion:10},20);
 c=spendPlayerResource(c,'Second Wind');c=damageCompanion(c,'nighthawk',3,'Slashing');
 c=finishCompanionEncounter(c);expect(c.character?.currentHitPoints).toBe(7);
 c=settleEncounterRewards(c,{xp:50,gold:8,items:[{name:'Potion',quantity:1}]});
 const restored=JSON.parse(JSON.stringify(c));expect(isCampaign(restored)).toBe(true);
 expect(()=>settleEncounterRewards(restored,{xp:50,gold:8,items:[]})).toThrow('already recorded');
 const resumed=resumeAdventureExploration(restored);expect(resumed).toMatchObject({xp:50,character:{currentHitPoints:7,resources:{'Second Wind':{used:1}}},inventoryLedger:{currency:{GP:8}},adventureSession:{status:'exploring'}});
 expect(resumed.combat).toBeUndefined();
 });
 it('rejects HP conflicts and invalid rewards atomically',()=>{
 const c=start();expect(()=>finishCompanionEncounter({...c,character:{...c.character!,currentHitPoints:9}})).toThrow('changed');
 expect(()=>settleEncounterRewards(c,{xp:1,gold:1,items:[]})).toThrow('Complete');
 const done=finishCompanionEncounter(c);expect(()=>settleEncounterRewards(done,{xp:-1,gold:1,items:[]})).toThrow('Invalid');expect(done.xp).toBe(0);
 });
});

describe('new save field validation',()=>{
 it('rejects corrupted resource pools before persistence',()=>{
 const c=player();expect(isCampaign(c)).toBe(true);
 expect(isCampaign({...c,character:{...c.character!,resources:{Rage:{maximum:2,used:3,recovery:'long'}}}})).toBe(false);
 expect(isCampaign({...c,character:{...c.character!,savingThrowProficiencies:['invalid']}})).toBe(false);
 });
});

describe('older imported sheets',()=>{
 it('hydrates class proficiencies without altering HP, abilities or legacy saves',async()=>{
 const {hydratePlayerState}=await import('./playerState');
 const c=player('wizard');delete c.character!.classId;delete c.character!.savingThrowProficiencies;delete c.character!.weaponProficiencies;
 const loaded=hydratePlayerState(c);expect(savingThrowModifier(loaded.character!,'wis')).toBe(3);expect(loaded.character?.currentHitPoints).toBe(c.character?.currentHitPoints);
 const legacy=newCampaign('Legacy');expect(hydratePlayerState(legacy)).toBe(legacy);
 });
});

it('persists caster slot spending and prevents casting while incapacitated',async()=>{
 const {spendUnifiedNighthawkSpellSlot,applyCompanionCondition}=await import('./companionEncounter');
 let c=player('wizard');c.character={...c.character!,preparedSpells:['Shield'],spellSlots:{level1:2,usedLevel1:0}};
 c=start(c);const blocked=applyCompanionCondition(c,'nighthawk','Stunned');expect(()=>spendUnifiedNighthawkSpellSlot(blocked,'Shield')).toThrow('unavailable');
 c=spendUnifiedNighthawkSpellSlot(c,'Shield');c=finishCompanionEncounter(c);expect(JSON.parse(JSON.stringify(c)).character.spellSlots.usedLevel1).toBe(1);
});

it('uses Dexterity for catalog ammunition weapons including slings',()=>{
 const c=player('wizard');c.encounterLoadout={weaponId:'sling'};c.inventoryLedger!.gear.push({name:'Sling',quantity:1});expect(nighthawkEquippedAttack(c)).toMatchObject({ability:'Dexterity',attackModifier:5,damageModifier:3});
});
