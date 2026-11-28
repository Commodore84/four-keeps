import type {Campaign} from './campaign';
import {recoverWarehouseRatEncounter} from './adventureSession';
import {TACTICAL_PROFILES,type ScenarioActor} from './combatScenario';

/**
 * Retire the alternate Phase 3 screen for supported encounters by carrying
 * their saved state into the *existing* Begin Practice Encounter combat.
 * This is deliberately idempotent and never overwrites an active classic fight.
 *
 * Outside disposable Combat Lab, only Rogue encounters migrate to classic.
 * Other classes retain their existing full-featured encounter path; the Lab
 * permits any imported class for baseline ordinary weapon/unarmed tests.
 * Multi-ally and >2-foe scenarios are never silently truncated.
 */
export function restorePracticeEncounter(campaign:Campaign):Campaign {
 if(campaign.combat||campaign.pendingAftermath||campaign.companionEncounter?.status==='completed')return campaign;
 const recovered=recoverWarehouseRatEncounter(campaign);
 const phase=recovered.companionEncounter?.phaseThree;
 const scenario=phase?.scenario??recovered.adventureSession?.pendingEncounter?.scenario;
 if(!scenario)return campaign;
 const playerClass=recovered.characterIdentity?.classId??recovered.character?.classId??'rogue';
 if(playerClass!=='rogue'&&!recovered.combatLab)return campaign;
 const foes=scenario.actors.filter(actor=>actor.side==='enemies');
 if(!foes.length||foes.length>2||scenario.actors.some(actor=>actor.side==='allies'))return campaign;
 const stored=recovered.companionEncounter;
 const active=!!phase&&stored?.status==='active';
 const initiative=(id:string)=>phase?.initiative.find(entry=>entry.actor===id)?.total
  ??stored?.participants[id]?.initiative;
 const displayNames=foes.map((actor,i)=>{
  const name=actor.label.trim()||'Opponent';
  return foes.slice(0,i).some(previous=>(previous.label.trim()||'Opponent')===name)?name+' '+(i+1):name;
 });
 const names=new Map(foes.map((foe,i)=>[foe.id,displayNames[i]]));
 const position=(actorId:string,fallback:{x:number;y:number})=>{
  const p=active?stored?.participants[actorId]:undefined;
  if(!p)return fallback;
  if(scenario.battlefield)return {x:p.x,y:p.y};
  // Keep player movement when migrating an encounter already in progress.
  const x=Math.max(0,Math.min(12,p.x+2)),y=Math.max(0,Math.min(12,p.y+2));
  return {x,y};
 };
 const stats=(actor:ScenarioActor)=>{
  const profile=TACTICAL_PROFILES[actor.profile];
  const weapon=profile.weapons[0];
  const ranged=profile.weapons.find(w=>w.normal!==undefined&&w.reach>5);
  return {name:displayNames[foes.indexOf(actor)],id:actor.id,
   ...(ranged?{rangedWeapon:{name:ranged.name,bonus:ranged.bonus,damageDice:ranged.dice,
    damageModifier:ranged.modifier,normalFeet:ranged.normal??80,longFeet:ranged.reach}}:{}),
   hp:profile.hp,maxHp:profile.hp,speed:profile.speed,perceptionBonus:profile.perception-10,
   attackBonus:weapon?.bonus??0,damageDice:weapon?.dice??'1d4',
   damageModifier:weapon?.modifier??0,ac:profile.ac};
 };
 const first=stats(foes[0]),second=foes[1]?stats(foes[1]):undefined;
 const current=(id:string,defaultHp:number)=>active?stored?.participants[id]?.hp??defaultHp:defaultHp;
 const now=new Date().toISOString();
 const player=stored?.participants.nighthawk;
 const seed:NonNullable<Campaign['combat']>={
  status:active?'initiative-set':'awaiting-initiative',
  enemyName:first.name,enemyInitiative:initiative(first.id)??1,
  enemyHp:current(first.id,first.hp),enemyMaxHp:first.maxHp,
  enemyPosition:position(first.id,scenario.battlefield?foes[0].square:{x:10,y:10}),
  playerPosition:position('nighthawk',scenario.battlefield?scenario.starts[0]:{x:2,y:10}),
  ...(scenario.battlefield?{battlefield:scenario.battlefield,secondStart:foes[1]?.square}:{}),
  ...(!active&&scenario.entryOptions?{entryOptions:scenario.entryOptions}:{}),
  round:active?stored?.round??1:1,
  ...(active?{
   playerInitiative:initiative('nighthawk')??1,
   order:stored?.order.map(id=>id==='nighthawk'?'Nighthawk':names.get(id)??id)??['Nighthawk',first.name],
   turnIndex:stored?.turnIndex??0,
   movementUsed:player?.movementSpentFeet??0,
   movementAllowance:player?.speedFeet??35,
   actionUsed:player?.actionUsed??false,
   bonusActionUsed:player?.bonusActionUsed??false,
   reactionUsed:player?.reactionUsed??false,
   ...(second?{secondEnemy:{name:second.name,
     initiative:initiative(second.id)??1,position:position(second.id,scenario.battlefield?foes[1].square:{x:10,y:2}),
     hp:current(second.id,second.hp),maxHp:second.maxHp,detected:true}}:{}),
  }:{}),
  classicAdventure:{
   origin:'dm',actionId:recovered.adventureSession?.pendingEncounter?.actionId,
   scenarioLocation:scenario.locationKey,first,second,
  },
  journalStartIndex:recovered.journal.length+1,
 };
 const session=recovered.adventureSession;
 return {...recovered,...(active&&player&&recovered.character?{character:{...recovered.character,currentHitPoints:player.hp}}:{}),combat:seed,adventureSession:session?
  {...session,status:'encounter' as const,pendingEncounter:undefined,encounterActorId:first.id}:session,
  updatedAt:now,
  journal:[...recovered.journal,{id:crypto.randomUUID(),kind:'system',createdAt:now,
    text:'Encounter opened in the original practice-combat interface. '+foes.map(actor=>actor.label).join(' and ')+' are present.'}]};
}
