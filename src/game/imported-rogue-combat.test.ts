import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {startUnifiedEncounter,addCompanionEnemy,importedRogueCunningAction,attackImportedRogue,importedRogueUncannyDodge,resolveImportedRogueEvasion,endCompanionTurn,resolveRoguePoisonSave,resolveRogueKnockoutSave,damageCompanion,moveCompanion,useCompanionAction,useImportedMageHandLegerdemain} from './companionEncounter';
import type {Campaign} from './campaign';
function arena(level=2,subclass=false){
 const c=newCampaign('Rogue combat');
 const imported:Campaign={...c,character:{...c.character!,level,classId:'rogue'},characterIdentity:{name:'Test',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'x',pronouns:'',appearance:'',personality:'',backstory:''},characterBuild:{rules:{allowCompatibleLegacy:false}} as Campaign['characterBuild'],...(subclass?{importedSubclassId:'rogue-arcane-trickster'}:{}),inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Dagger',quantity:1}]},encounterLoadout:{weaponId:'dagger'}};
 let b=startUnifiedEncounter(imported,{nighthawk:20},{nighthawk:{x:2,y:2}},{});
 b=addCompanionEnemy(b,'goblin',10,{x:3,y:2},40,10,3);
 return b;
}
describe('imported Rogue in unified combat',()=>{
 it('Evasion is unavailable while stunned or unconscious and rejects unverified damage',()=>{const c=arena(7);for(const condition of ['Stunned','Unconscious'] as const){const blocked={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,nighthawk:{...c.companionEncounter!.participants.nighthawk,conditions:[condition]}}}};expect(()=>resolveImportedRogueEvasion(blocked,true,10,'Fire')).toThrow('incapacitated');}expect(()=>resolveImportedRogueEvasion(c,false,-1,'Fire')).toThrow('Verified');});

 it('Evasion at level seven applies zero or half verified Dexterity-save damage and preserves source',()=>{const c=arena(7);const success=resolveImportedRogueEvasion(c,true,17,'Fire');expect(success.companionEncounter!.participants.nighthawk.hp).toBe(c.companionEncounter!.participants.nighthawk.hp);const failure=resolveImportedRogueEvasion(c,false,17,'Fire');expect(failure.companionEncounter!.participants.nighthawk.hp).toBe(c.companionEncounter!.participants.nighthawk.hp-8);expect(c.companionEncounter!.participants.nighthawk.hp).toBeGreaterThan(failure.companionEncounter!.participants.nighthawk.hp);expect(()=>resolveImportedRogueEvasion(arena(6),true,17,'Fire')).toThrow('level 7');});
 it('critical Cunning Strike Trip costs two doubled Sneak Attack dice',()=>{const c=arena(5);const advantaged={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,nighthawk:{...c.companionEncounter!.participants.nighthawk,conditions:['Invisible' as const]}}}};const struck=attackImportedRogue(advantaged,'goblin',20,3,5,[1,2,3,4,5,6],12,{effect:'Trip',saveTotal:1});expect(struck.companionEncounter!.log.join(' ')).toContain('= 18 extra piercing damage');});

 it('Cunning Action Dash adds movement and spends only bonus action',()=>{const c=arena();const next=importedRogueCunningAction(c,'Dash');expect(next.companionEncounter!.participants.nighthawk.dashFeet).toBe(next.companionEncounter!.participants.nighthawk.speedFeet);expect(next.companionEncounter!.participants.nighthawk.actionUsed).toBe(false);expect(()=>importedRogueCunningAction(next,'Disengage')).toThrow('unavailable');expect(c.companionEncounter!.participants.nighthawk.bonusActionUsed).toBe(false)});
 it('Cunning Action Disengage prevents opportunity triggers',()=>{const c=importedRogueCunningAction(arena(),'Disengage');expect(c.companionEncounter!.participants.nighthawk.disengaged).toBe(true)});
 it('halves verified incoming hit damage using one reaction at level five',()=>{const c=arena(5);const dodged=importedRogueUncannyDodge(c,'goblin',9,'Piercing');expect(dodged.companionEncounter!.participants.nighthawk.hp).toBe(c.companionEncounter!.participants.nighthawk.hp-4);expect(dodged.companionEncounter!.participants.nighthawk.reactionUsed).toBe(true);expect(()=>importedRogueUncannyDodge(dodged,'goblin',9,'Piercing')).toThrow('available reaction');expect(()=>importedRogueUncannyDodge(arena(4),'goblin',9,'Piercing')).toThrow('level-5');});
 it('trades one verified Sneak Attack die for Cunning Strike Trip and checks save',()=>{const c=arena(5);const advantaged={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,nighthawk:{...c.companionEncounter!.participants.nighthawk,conditions:['Invisible' as const]}}}};const struck=attackImportedRogue(advantaged,'goblin',15,3,5,[1,2,3],12,{effect:'Trip',saveTotal:1});expect(struck.companionEncounter!.participants.goblin.conditions).toContain('Prone');expect(struck.companionEncounter!.participants.goblin.hp).toBe(40-(3+5+3));expect(()=>attackImportedRogue(advantaged,'goblin',15,3,5,[1,2,3],12,{effect:'Trip',saveTotal:-1})).toThrow('Verified Dexterity');});
 it('validates sneak dice and attack advantage and never grants extra damage on miss',()=>{const c=arena(3);expect(()=>attackImportedRogue(c,'goblin',15,3,5,[2,3])).toThrow('Sneak Attack requires advantage');const advantaged={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,nighthawk:{...c.companionEncounter!.participants.nighthawk,conditions:['Invisible' as const]}}}};expect(()=>attackImportedRogue(advantaged,'goblin',15,3,5,[2])).toThrow('2 verified');const hit=attackImportedRogue(advantaged,'goblin',15,3,5,[2,3],12);expect(hit.companionEncounter!.participants.goblin.hp).toBe(40-(3+5+3));expect(hit.companionEncounter!.participants.nighthawk.rogueSneakUsed).toBe(true);expect(()=>attackImportedRogue(hit,'goblin',15,3,5,[2,3],12)).toThrow();});
 it('requires doubled sneak dice on critical and resets once-per-turn use',()=>{const c=arena(3);const advantaged={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,nighthawk:{...c.companionEncounter!.participants.nighthawk,conditions:['Invisible' as const]}}}};expect(()=>attackImportedRogue(advantaged,'goblin',20,6,5,[1,2],18)).toThrow('4 verified');const hit=attackImportedRogue(advantaged,'goblin',20,6,5,[1,2,3,4],18);const enemyTurn=endCompanionTurn(hit,'nighthawk');const next=endCompanionTurn(enemyTurn,'goblin');expect(next.companionEncounter!.participants.nighthawk.rogueSneakUsed).toBe(false)});
 it('Mage Hand requires confirmed subclass and spends an action without inventing effects',()=>{expect(()=>useImportedMageHandLegerdemain(arena(3),'Pick lock')).toThrow('not available');const c=useImportedMageHandLegerdemain(arena(3,true),'Pick lock');expect(c.companionEncounter!.participants.nighthawk.actionUsed).toBe(true);expect(c.companionEncounter!.log.at(-1)).toContain('DM adjudication required')});
});

 describe('2024 Rogue Cunning Strike extensions',()=>{
  it('Poison costs one die, requires a verified Constitution save and persists Poisoned only on failure',()=>{
   const c=arena(7);const prepared={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,goblin:{...c.companionEncounter!.participants.goblin,hp:60,maxHp:60},ally:{...c.companionEncounter!.participants.nighthawk,x:4,y:2,actorKind:'party' as const,faction:'party'}}}};
   const hit=attackImportedRogue(prepared,'goblin',19,1,5,[1,2,3,4],undefined,{effect:'Poison',saveTotal:2});
   expect(hit.companionEncounter!.participants.goblin.conditions).toContain('Poisoned');
   expect(hit.companionEncounter!.participants.nighthawk.rogueSneakUsed).toBe(true);
   expect(hit.companionEncounter!.log.join(' ')).toContain('Constitution save');
   expect(JSON.parse(JSON.stringify(hit)).companionEncounter.participants.goblin.conditions).toContain('Poisoned');
   expect(hit.companionEncounter!.participants.goblin.roguePoisonRounds).toBe(10);
   const enemyTurn={...hit,companionEncounter:{...hit.companionEncounter!,order:['goblin','nighthawk'],turnIndex:0}};
   expect(()=>endCompanionTurn(enemyTurn,'goblin')).toThrow('Resolve Rogue Poison');
   const failed=resolveRoguePoisonSave(enemyTurn,'goblin',1);
   expect(failed.companionEncounter!.participants.goblin.roguePoisonRounds).toBe(9);
   const recovered=resolveRoguePoisonSave(enemyTurn,'goblin',99);
   expect(recovered.companionEncounter!.participants.goblin.conditions).not.toContain('Poisoned');
   expect(endCompanionTurn(recovered,'goblin').companionEncounter!.turnIndex).toBe(1);
   expect(()=>attackImportedRogue(hit,'goblin',19,1,5,[1,2,3,4],undefined,{effect:'Poison',saveTotal:2})).toThrow();
   const saved=attackImportedRogue(prepared,'goblin',19,1,5,[1,2,3,4],undefined,{effect:'Poison',saveTotal:99});
   expect(saved.companionEncounter!.participants.goblin.conditions).not.toContain('Poisoned');
   expect(()=>attackImportedRogue(prepared,'goblin',19,1,5,[1,2,3,4],undefined,{effect:'Poison'})).toThrow('Constitution');
  });
  it('Withdraw moves immediately without opportunity attacks, preserves movement cost and rejects excess movement',()=>{
   const c=arena(7);const prepared={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,goblin:{...c.companionEncounter!.participants.goblin,hp:60,maxHp:60},ally:{...c.companionEncounter!.participants.nighthawk,x:4,y:2,actorKind:'party' as const,faction:'party'}}}};
   const moved=attackImportedRogue(prepared,'goblin',19,1,5,[1,2,3,4],undefined,{effect:'Withdraw',withdrawTo:{x:1,y:2}});
   expect(moved.companionEncounter!.participants.nighthawk.x).toBe(1);
   expect(moved.companionEncounter!.participants.nighthawk.disengaged).toBe(false);
   expect(moved.companionEncounter!.participants.nighthawk.movementSpentFeet).toBe(5);
   expect(moved.companionEncounter!.pendingOpportunity).toBeUndefined();
   expect(()=>attackImportedRogue(prepared,'goblin',19,1,5,[1,2,3,4],undefined,{effect:'Withdraw',withdrawTo:{x:19,y:19}})).toThrow();
  });
 });

 describe('2024 Improved Cunning Strike',()=>{
  it('requires level eleven, different effects, and charges two dice on one hit',()=>{
   const base=arena(11);const b=base.companionEncounter!;
   const c={...base,companionEncounter:{...b,participants:{...b.participants,goblin:{...b.participants.goblin,hp:100,maxHp:100},ally:{...b.participants.nighthawk,x:4,y:2,actorKind:'party' as const,faction:'party'}}}};
   const options=[{effect:'Trip' as const,saveTotal:1},{effect:'Poison' as const,saveTotal:1}];
   const result=attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6],undefined,options);
   expect(result.companionEncounter!.participants.goblin.conditions).toEqual(expect.arrayContaining(['Prone','Poisoned']));
   expect(result.companionEncounter!.log.join(' ')).toContain('= 18 extra piercing damage');
   expect(()=>attackImportedRogue({...c,character:{...c.character!,level:10}},'goblin',19,1,5,[1,2,3,4,5],undefined,options)).toThrow('level 11');
   expect(()=>attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6],undefined,[options[0],options[0]])).toThrow('different');
   expect(()=>attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6],undefined,[...options,options[0]])).toThrow();
  });
 });

 describe('2024 Devious Strikes safe deterministic subset',()=>{
  it('Obscure charges three d6, validates level/save, persists Blindness and expires at end of next target turn',()=>{
   const base=arena(14);const b=base.companionEncounter!;const c={...base,companionEncounter:{...b,participants:{...b.participants,goblin:{...b.participants.goblin,hp:100,maxHp:100},ally:{...b.participants.nighthawk,x:4,y:2,actorKind:'party' as const,faction:'party'}}}};
   const obscured=attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Obscure',saveTotal:1});
   expect(obscured.companionEncounter!.participants.goblin.conditions).toContain('Blinded');
   expect(obscured.companionEncounter!.participants.goblin.rogueObscureUntilTurn).toBe(1);
   expect(obscured.companionEncounter!.log.join(' ')).toContain('= 16 extra piercing damage');
   const enemyTurn={...obscured,companionEncounter:{...obscured.companionEncounter!,order:['goblin','nighthawk'],turnIndex:0}};
   const once=endCompanionTurn(enemyTurn,'goblin');expect(once.companionEncounter!.participants.goblin.conditions).not.toContain('Blinded');
   const twice=endCompanionTurn({...once,companionEncounter:{...once.companionEncounter!,turnIndex:0}},'goblin');expect(twice.companionEncounter!.participants.goblin.conditions).not.toContain('Blinded');
   expect(JSON.parse(JSON.stringify(obscured)).companionEncounter.participants.goblin.rogueObscureUntilTurn).toBe(1);
   const resisted=attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Obscure',saveTotal:99});expect(resisted.companionEncounter!.participants.goblin.conditions).not.toContain('Blinded');
   expect(()=>attackImportedRogue({...c,character:{...c.character!,level:13}},'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Obscure',saveTotal:1})).toThrow('level 14');
   expect(()=>attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Obscure'})).toThrow('Dexterity');
  });
 });

 describe('2024 Devious Strikes Daze and Knock Out',()=>{
  function prepared(){const c=arena(14);const b=c.companionEncounter!;return {...c,companionEncounter:{...b,participants:{...b.participants,goblin:{...b.participants.goblin,hp:100,maxHp:100},ally:{...b.participants.nighthawk,x:4,y:2,actorKind:'party' as const,faction:'party'}}}};}
  it('Daze costs two d6, constrains next turn action versus movement, and expires',()=>{
   const c=prepared();const hit=attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Daze',saveTotal:1});
   expect(hit.companionEncounter!.participants.goblin.rogueDazeTurns).toBe(1);
   expect(hit.companionEncounter!.log.join(' ')).toContain('= 19 extra piercing damage');
   const turn={...hit,companionEncounter:{...hit.companionEncounter!,order:['goblin','nighthawk'],turnIndex:0}};
   const moved=moveCompanion(turn,'goblin',3,3);expect(()=>useCompanionAction(moved,'goblin','Dash')).toThrow('Dazed');
   const acted=useCompanionAction(turn,'goblin','Dash');expect(()=>moveCompanion(acted,'goblin',3,3)).toThrow('Dazed');
   const first=endCompanionTurn(turn,'goblin');expect(first.companionEncounter!.participants.goblin.rogueDazeTurns).toBeUndefined();
   const second=endCompanionTurn({...first,companionEncounter:{...first.companionEncounter!,turnIndex:0}},'goblin');expect(second.companionEncounter!.participants.goblin.rogueDazeTurns).toBeUndefined();
   expect(JSON.parse(JSON.stringify(hit)).companionEncounter.participants.goblin.rogueDazeTurns).toBe(1);
   expect(attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Daze',saveTotal:99}).companionEncounter!.participants.goblin.rogueDazeTurns).toBeUndefined();
  });
  it('Knock Out costs six d6, requires a verified Constitution save, wakes on damage and supports repeat saves',()=>{
   const c=prepared();const hit=attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Knock Out',saveTotal:1});
   expect(hit.companionEncounter!.participants.goblin.conditions).toContain('Unconscious');
   expect(hit.companionEncounter!.participants.goblin.rogueKnockoutRounds).toBe(10);
   expect(hit.companionEncounter!.log.join(' ')).toContain('= 1 extra piercing damage');
   const turn={...hit,companionEncounter:{...hit.companionEncounter!,order:['goblin','nighthawk'],turnIndex:0}};
   expect(()=>endCompanionTurn(turn,'goblin')).toThrow('Knock Out');
   const failed=resolveRogueKnockoutSave(turn,'goblin',1);expect(failed.companionEncounter!.participants.goblin.rogueKnockoutRounds).toBe(9);
   const recovered=resolveRogueKnockoutSave(turn,'goblin',99);expect(recovered.companionEncounter!.participants.goblin.conditions).not.toContain('Unconscious');
   expect(endCompanionTurn(recovered,'goblin').companionEncounter!.turnIndex).toBe(1);
   const damaged=damageCompanion(hit,'goblin',1,'Fire');expect(damaged.companionEncounter!.participants.goblin.conditions).not.toContain('Unconscious');
   expect(damaged.companionEncounter!.participants.goblin.rogueKnockoutDC).toBeUndefined();
   expect(JSON.parse(JSON.stringify(hit)).companionEncounter.participants.goblin.rogueKnockoutRounds).toBe(10);
   expect(attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Knock Out',saveTotal:99}).companionEncounter!.participants.goblin.conditions).not.toContain('Unconscious');
   const immune={...c,companionEncounter:{...c.companionEncounter!,participants:{...c.companionEncounter!.participants,goblin:{...c.companionEncounter!.participants.goblin,conditionImmunities:['Unconscious']}}}};
   expect(attackImportedRogue(immune,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,{effect:'Knock Out',saveTotal:1}).companionEncounter!.participants.goblin.conditions).not.toContain('Unconscious');
   const both=attackImportedRogue(c,'goblin',19,1,5,[1,2,3,4,5,6,1],undefined,[{effect:'Knock Out',saveTotal:1},{effect:'Trip',saveTotal:1}]);
   expect(both.companionEncounter!.log.join(' ')).toContain('= 0 extra piercing damage');
   expect(both.companionEncounter!.participants.goblin.conditions).toContain('Prone');
  });
 });
