import {magicProtectionBonus} from './magicEquipment';
import {getMonster} from './monsterCompendium';
import {recordMonsterSighting,recordMonsterAbility} from './monsterKnowledge';
import type {Campaign} from './campaign';
import {abilityModifier,savingThrowModifier,skillModifier} from './checks';
import {ITEM_BY_ID} from './creationEquipment';
import {weaponAttackProfile} from './weaponAttackProfile';
import {requireArmorSpellcasting} from './armorEffects';
import {statsWithTemporaryEffects} from './temporaryEffects';
import {resumeAdventureExploration} from './adventureSession';
import {settleEncounterRewards} from './encounterRewards';
import {distanceFeet,fitsBattlefield,squareKey,TACTICAL_PROFILES,type ScenarioActor,type EncounterOutcome,type Square} from './combatScenario';
import {
 addCompanionEnemy,attackCompanion,attackCompanionWithVerifiedStats,attackImportedRogue,attackWithOffhandWeapon,attackWithThrownEquippedWeapon,
 castItemMagicMissile,castItemWeb,companionAttackRollMode,companionCanSee,companionLineOfSight,damageCompanion,declineTacticalOpportunity,endCompanionTurn,finishCompanionEncounter,healCompanion,
 importedRogueCunningAction,importedRogueSteadyAim,moveCompanion,nighthawkEquippedAttack,nighthawkEquippedDefense,pendingWebSave,primaryAttackLimit,resolveCompanionConcentrationSave,resolveCompanionDeathSave,resolveCompanionOpportunityAttack,
 resolveRogueKnockoutSave,resolveRoguePoisonSave,resolveTacticalIncomingHit,resolveWebTurnSave,resumeEnemyInterruptedMovement,startUnifiedEncounter,useCompanionAction,
 type CompanionEncounter,
} from './companionEncounter';

export type RollDie=(faces:number)=>number;
export const rollDie:RollDie=faces=>Math.floor(Math.random()*faces)+1;
function die(random:RollDie,faces:number):number{
 const value=random(faces);
 if(!Number.isInteger(value)||value<1||value>faces)throw Error('Invalid dice result.');
 return value;
}
function rollDamage(expression:string,critical:boolean,random:RollDie):number{
 if(expression==='1 piercing')return 1;
 const match=/^(\d+)d(\d+)/i.exec(expression);
 if(!match)throw Error('This damage profile requires DM adjudication.');
 return Array.from({length:Number(match[1])*(critical?2:1)},()=>die(random,Number(match[2]))).reduce((a,b)=>a+b,0);
}
export function startTacticalEncounter(campaign:Campaign,start:Square,random=rollDie):Campaign{
 const session=campaign.adventureSession,pending=session?.pendingEncounter,scenario=pending?.scenario;
 if(!session||session.status!=='exploring'||!scenario||!pending||campaign.companionEncounter?.status==='active')throw Error('There is no pending battlefield.');
 if(!scenario.starts.some(s=>squareKey(s)===squareKey(start)))throw Error('Choose one of the DM’s starting squares.');
 const player=campaign.character;
 if(!player)throw Error('Choose a character before entering combat.');
 const initiative=(actor:string,modifier:number,surprised:boolean)=>{
  const dice=surprised?[die(random,20),die(random,20)]:[die(random,20)];
  return {actor,dice,modifier,total:Math.min(...dice)+modifier};
 };
 const entry=initiative('nighthawk',abilityModifier(player.scores.dex),scenario.surprised);
 const grouped=new Map<string,number[]>();
 const rolls=[entry,...scenario.actors.map(actor=>{
  const profile=TACTICAL_PROFILES[actor.profile];
  const grouping=actor.side==='enemies'?actor.profile+':'+String(!!actor.surprised):actor.id;
  let dice=grouped.get(grouping);
  if(!dice){dice=initiative(actor.id,profile.initiative,!!actor.surprised).dice;grouped.set(grouping,dice);}
  return {actor:actor.id,dice,modifier:profile.initiative,total:Math.min(...dice)+profile.initiative};
 })];
 // The shared initializer accepts only verified positive legacy totals. The tactical
 // order below uses the actual checks, including totals of zero and below.
 let next=startUnifiedEncounter(campaign,{nighthawk:Math.max(1,entry.total)},{nighthawk:start},{});
 for(const actor of scenario.actors){
  const profile=TACTICAL_PROFILES[actor.profile],weapon=profile.weapons[0];
  next=addCompanionEnemy(next,actor.id,1,actor.square,profile.hp,profile.ac,weapon.bonus,profile.speed,weapon.reach,weapon.modifier,weapon.dice);
 }
 const battle=next.companionEncounter!,participants={...battle.participants};
 const species=campaign.characterIdentity?.speciesId;
 const darkvision=['elf','tiefling','dwarf','orc','gnome'].includes(species??'')?species==='dwarf'?120:60:undefined;
 participants.nighthawk={...participants.nighthawk,faction:'allies',initiative:entry.total,darkvision};
 for(const actor of scenario.actors)participants[actor.id]={...participants[actor.id],
  faction:actor.side,actorKind:actor.side==='allies'?'party':'enemy',initiative:rolls.find(r=>r.actor===actor.id)!.total};
 // The DM's declaration order breaks NPC ties. The player acts first in a
 // player/NPC tie under the app's default DM ruling.
 const order=rolls.map((roll,index)=>({...roll,index})).sort((a,b)=>b.total-a.total||a.index-b.index).map(roll=>roll.actor);
 const actors=Object.fromEntries(scenario.actors.map(actor=>[actor.id,{ammunition:TACTICAL_PROFILES[actor.profile].weapons.find(weapon=>weapon.ammunition!==undefined)?.ammunition??0,
  ...(actor.profile==='mage'?{spellUses:{Fireball:2,'Misty Step':3}}:{})}]));
 const now=new Date().toISOString();
 next=recordMonsterSighting(next,scenario.actors.filter(actor=>actor.side==='enemies').map(actor=>actor.profile),now);
 return {...next,updatedAt:now,...(scenario.artwork?{tacticalArtwork:{...campaign.tacticalArtwork,[scenario.locationKey]:scenario.artwork}}:{}),merchantShopOpen:false,adventureSession:{...session,status:'encounter',pendingEncounter:undefined,encounterActorId:scenario.actors.find(actor=>actor.side==='enemies')!.id},
  companionEncounter:{...battle,phaseThree:{scenario,initiative:rolls,actors},participants,order,turnIndex:0,obstacles:scenario.obstacles,cover:scenario.cover},
  journal:[...next.journal,{id:crypto.randomUUID(),kind:'system',createdAt:now,text:'The encounter begins. Initiative has been rolled.'}]};
}
function combat(campaign:Campaign){
 const battle=campaign.companionEncounter,state=battle?.phaseThree;
 if(battle?.status!=='active'||!state)throw Error('No active tactical encounter.');
 return {battle,state,active:battle.order[battle.turnIndex]};
}
function requireTurn(campaign:Campaign,id:string){
 const context=combat(campaign);
 if(context.active!==id||context.state.pendingHit||context.state.pendingReady||context.state.concentrationCheck||context.battle.pendingOpportunity?.attackerIds.length||pendingWebSave(context.battle))throw Error('Resolve the pending turn or interruption first.');
 return context;
}
function sameSide(battle:CompanionEncounter,actor:string,id:string){
 return !!battle.participants[id]&&battle.participants[actor]?.faction===battle.participants[id].faction;
}
function d20Pair(random:RollDie,advantage:boolean,disadvantage:boolean){
 const a=die(random,20),b=advantage!==disadvantage?die(random,20):undefined;
 const kept=b===undefined?a:advantage?Math.max(a,b):Math.min(a,b);
 return {a,b,kept};
}
export function tacticalPlayerAttack(campaign:Campaign,targetId:string,options:{offhand?:boolean;thrown?:boolean;sneak?:boolean;cunning?:'Trip'|'Poison'}={},random=rollDie):Campaign{
 const {battle}=requireTurn(campaign,'nighthawk');
 const target=battle.participants[targetId];
 if(!target||sameSide(battle,'nighthawk',targetId)||target.hp<=0)throw Error('Choose an active hostile target.');
 const equipped=nighthawkEquippedAttack(campaign,options.offhand?(campaign.encounterLoadout?.offhandWeaponId??''):undefined);
 const item=ITEM_BY_ID[equipped?.weaponId??''];
 if(!item||!equipped)throw Error('Equip a weapon to attack.');
 const thrown=options.thrown||item.id==='dart';
 if(thrown&&!item.properties?.some(property=>property.startsWith('Thrown ')))throw Error('This weapon cannot be thrown.');
 const profile=weaponAttackProfile(item,thrown);
 const mode=companionAttackRollMode(campaign,'nighthawk',targetId,item.id,thrown);
 const {a,b,kept}=d20Pair(random,!!mode.attackAdvantage,!!mode.attackDisadvantage);
 const critical=kept===20||kept!==1&&target.conditions.includes('Unconscious')&&mode.distanceFeet<=5;
 const damage=rollDamage(equipped.damageDice,critical,random);
 if(options.sneak){
  const count=Math.ceil((campaign.character?.level??1)/2)*(kept===20?2:1);
  const strike=options.cunning?{effect:options.cunning,saveTotal:die(random,20)+npcAbility(campaign,targetId,options.cunning==='Trip'?'dex':'con')}:undefined;
  return attackImportedRogue(campaign,targetId,a,damage,profile.maximumRange,Array.from({length:count},()=>die(random,6)),b,strike,undefined,options.offhand,()=>die(random,4),thrown);
 }
 if(options.offhand)return attackWithOffhandWeapon(campaign,targetId,a,damage,b);
 if(thrown)return attackWithThrownEquippedWeapon(campaign,'nighthawk',targetId,a,damage,profile.damageType??'Piercing',profile.maximumRange,b);
 return attackCompanionWithVerifiedStats(campaign,'nighthawk',targetId,a,damage,profile.damageType??'Bludgeoning',profile.maximumRange,b,undefined,()=>die(random,4));
}
function profileActor(campaign:Campaign,id:string):ScenarioActor|undefined{
 return campaign.companionEncounter?.phaseThree?.scenario.actors.find(actor=>actor.id===id);
}
function npcAbility(campaign:Campaign,id:string,ability:'str'|'dex'|'con'):number{
 const profile=profileActor(campaign,id);
 return profile?TACTICAL_PROFILES[profile.profile][ability]:abilityModifier(statsWithTemporaryEffects(campaign)?.scores[ability]??10);
}

export function tacticalMove(campaign:Campaign,id:string,destination:Square,random=rollDie):Campaign{
 const {state}=requireTurn(campaign,id);
 if(!fitsBattlefield(destination,state.scenario.size))throw Error('Destination outside this battlefield.');
 const moved=moveCompanion(campaign,id,destination.x,destination.y,die(random,20)+npcAbility(campaign,id,'dex'),die(random,4));
 return markReadiedTrigger(campaign,moved,id);
}

function markReadiedTrigger(before:Campaign,after:Campaign,id:string):Campaign{
 const battle=after.companionEncounter,state=battle?.phaseThree,old=before.companionEncounter;
 if(!battle||!state?.readied||id==='nighthawk'||state.readied!=='*'&&state.readied!==id||sameSide(battle,'nighthawk',id)||battle.pendingOpportunity)return after;
 const player=battle.participants.nighthawk,target=battle.participants[id],previous=old?.participants[id];
 const weapon=ITEM_BY_ID[before.encounterLoadout?.weaponId??''];
 const reach=weapon?weaponAttackProfile(weapon).reach:5;
 if(!previous||!target||target.hp<=0||player.hp<=0||player.reactionUsed||
  distanceFeet(player,previous)<=reach||distanceFeet(player,target)>reach||!companionLineOfSight(battle,player,target))return after;
 return {...after,companionEncounter:{...battle,phaseThree:{...state,pendingReady:{target:id}}}};
}

export function resolveTacticalConcentration(campaign:Campaign,random=rollDie):Campaign{
 const {state}=combat(campaign),character=campaign.character;
 if(!state.concentrationCheck||!character)throw Error('No concentration save is pending.');
 const total=Math.max(0,die(random,20)+savingThrowModifier(character,'con')+magicProtectionBonus(campaign));
 const next=resolveCompanionConcentrationSave(campaign,'nighthawk',state.concentrationCheck,total);
 return {...next,companionEncounter:{...next.companionEncounter!,phaseThree:{...next.companionEncounter!.phaseThree!,concentrationCheck:undefined}}};
}

export function escapeTacticalGrapple(campaign:Campaign,id:string,acrobatics=false,random=rollDie):Campaign{
 const {state}=requireTurn(campaign,id),grapple=state.grapples?.[id];
 if(!grapple)throw Error('This creature is not grappled.');
 const used=useCompanionAction(campaign,id,'Utilize'),battle=used.companionEncounter!;
 const stats=statsWithTemporaryEffects(campaign);
 const modifier=id==='nighthawk'&&stats?skillModifier(stats,acrobatics?'Acrobatics':'Athletics'):npcAbility(campaign,id,acrobatics?'dex':'str');
 const total=die(random,20)+modifier;
 const grapples={...state.grapples};
 if(total>=grapple.dc)delete grapples[id];
 const actor=battle.participants[id];
 return {...used,companionEncounter:{...battle,phaseThree:{...state,grapples},
  participants:{...battle.participants,[id]:total>=grapple.dc?{...actor,conditions:actor.conditions.filter(condition=>condition!=='Grappled')}:actor},
  log:[...battle.log,id+(total>=grapple.dc?' escaped the grapple.':' remains grappled.')]}};
}

export type TacticalAction='Dash'|'Disengage'|'Dodge'|'Hide'|'Search'|'Study'|'Help'|'Utilize'|'Ready'|'Grapple'|'Shove'|'Steady Aim';
function useMonsterNimbleEscape(campaign:Campaign,id:string,action:'Hide'|'Disengage'):Campaign{
 const {battle}=requireTurn(campaign,id),actor=battle.participants[id];
 const profile=profileActor(campaign,id);
 if(!profile||!getMonster(profile.profile)?.bonusActions.some(ability=>ability.effect==='nimble-escape')||
    actor.hp<=0||actor.bonusActionUsed||actor.conditions.some(c=>['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious'].includes(c)))
  throw Error('This monster cannot use Nimble Escape now.');
 const next={...campaign,companionEncounter:{...battle,participants:{...battle.participants,
  [id]:{...actor,bonusActionUsed:true,...(action==='Disengage'?{disengaged:true}:{})}},
  log:[...battle.log,id+' uses Nimble Escape ('+action+').']}};
 return recordMonsterAbility(next,profile.profile,'nimble-escape');
}
export function tacticalAction(campaign:Campaign,id:string,action:TacticalAction,options:{bonus?:boolean;target?:string;detail?:string}={},random=rollDie):Campaign{
 const {battle,state}=requireTurn(campaign,id);
 const actor=battle.participants[id],target=options.target?battle.participants[options.target]:undefined;
 const player=id==='nighthawk';
 if(action==='Steady Aim')return importedRogueSteadyAim(campaign);
 if(options.bonus&&!player&&action==='Disengage')return useMonsterNimbleEscape(campaign,id,'Disengage');
 if(options.bonus&&player&&(action==='Dash'||action==='Disengage'))return importedRogueCunningAction(campaign,action);
 if(action==='Dash'||action==='Disengage'||action==='Dodge')return useCompanionAction(campaign,id,action);
 if(action==='Grapple'||action==='Shove'){
  if(!target||!options.target||sameSide(battle,id,options.target)||target.hp<=0||distanceFeet(actor,target)>5)throw Error('Choose a reachable hostile creature.');
  if(player&&(campaign.encounterLoadout?.offhandWeaponId||campaign.encounterLoadout?.shieldId&&campaign.encounterLoadout?.weaponId)&&action==='Grapple')throw Error('Grappling requires a free hand.');
  const dc=8+npcAbility(campaign,id,'str')+(player?campaign.character?.proficiencyBonus??2:2);
  const savingThrow=die(random,20)+Math.max(npcAbility(campaign,options.target,'str'),npcAbility(campaign,options.target,'dex'));
  if(action==='Grapple'&&target.conditions.includes('Grappled'))throw Error('The target is already grappled.');
  if(actor.actionUsed&&(!player||!actor.primaryAttacks||actor.primaryAttacks>=primaryAttackLimit(campaign)))throw Error('No Attack action remains.');
  const used=actor.actionUsed?campaign:useCompanionAction(campaign,id,'Utilize'),next=used.companionEncounter!;
  const condition=action==='Shove'?'Prone':'Grappled';
  const grapples=savingThrow<dc&&action==='Grapple'?{...state.grapples,[options.target]:{by:id,dc}}:state.grapples;
  return {...used,companionEncounter:{...next,phaseThree:{...state,grapples},participants:{...next.participants,[id]:{...next.participants[id],primaryAttacks:(actor.primaryAttacks??0)+1},[options.target]:{
   ...target,conditions:savingThrow<dc?[...new Set([...target.conditions,condition] as typeof target.conditions)]:target.conditions}},
   log:[...next.log,id+' '+action+(savingThrow<dc?' succeeded':' failed')]}};
 }
 if(action==='Hide'){
  if(Object.entries(battle.participants).some(([other,p])=>p.hp>0&&!sameSide(battle,id,other)&&companionLineOfSight(battle,p,actor)))throw Error('Hide requires breaking hostile line of sight.');
  const total=die(random,20)+(player&&campaign.character?skillModifier(statsWithTemporaryEffects(campaign)??campaign.character,'Stealth'):npcAbility(campaign,id,'dex'));
  const used=options.bonus?(player?useTacticalHideBonus(campaign,battle):useMonsterNimbleEscape(campaign,id,'Hide')):useCompanionAction(campaign,id,'Utilize'),next=used.companionEncounter!;
  return {...used,companionEncounter:{...next,phaseThree:{...state,actors:{...state.actors,[id]:{...state.actors[id],ammunition:state.actors[id]?.ammunition??0,hidden:total>=15?total:undefined}}},
   participants:{...next.participants,[id]:{...next.participants[id],rogueHidden:total>=15,rogueDetectedBy:[]}},log:[...next.log,id+(total>=15?' hid.':' failed to Hide.')]}};
 }
 if(action==='Search'){
  const used=useCompanionAction(campaign,id,'Search'),next=used.companionEncounter!;
  const total=die(random,20)+(player&&campaign.character?skillModifier(campaign.character,'Perception'):0);
  const found=Object.entries(state.actors).filter(([other,data])=>!sameSide(battle,id,other)&&data.hidden!==undefined&&total>=data.hidden).map(([other])=>other);
  return {...used,companionEncounter:{...next,participants:Object.fromEntries(Object.entries(next.participants).map(([other,p])=>[other,found.includes(other)?{...p,rogueDetectedBy:[...new Set([...(p.rogueDetectedBy??[]),id])]}:p])),log:[...next.log,found.length?'Search revealed a hidden combatant.':'Search found no hidden combatant.']}};
 }
 if(action==='Help'&&(!target||sameSide(battle,id,options.target!)||distanceFeet(actor,target)>5))throw Error('Choose a creature within reach for Help.');
 const used=useCompanionAction(campaign,id,action);
 const next=used.companionEncounter!;
 if(action==='Help')return {...used,companionEncounter:{...next,phaseThree:{...state,help:{by:id,target:options.target!},note:'Help is available to the next ally attacking the distracted target.'}}};
 if(action==='Ready'&&player)return {...used,companionEncounter:{...next,phaseThree:{...state,readied:'*',note:'You have readied a melee attack when a hostile ends a move within reach.'}}};
 // Contextual actions reserve their action here. Any additional effect must
 // be supplied by a supported DM transaction.
 return {...used,companionEncounter:{...next,phaseThree:{...state,note:options.detail?.trim().slice(0,120)||action+' recorded for DM adjudication.'}}};
}
function useTacticalHideBonus(campaign:Campaign,battle:CompanionEncounter):Campaign{
 const actor=battle.participants.nighthawk;
 if(campaign.characterIdentity?.classId!=='rogue'||(campaign.character?.level??1)<2||actor.bonusActionUsed||actor.hp<=0||
  actor.rogueDazeTurns!==undefined&&(actor.actionUsed||actor.movementSpentFeet>0)||actor.conditions.some(c=>['Incapacitated','Paralyzed','Petrified','Stunned','Unconscious'].includes(c)))throw Error('Cunning Action Hide is unavailable.');
 return {...campaign,companionEncounter:{...battle,participants:{...battle.participants,nighthawk:{...actor,bonusActionUsed:true}}}};
}

export function tacticalPlayerSpell(campaign:Campaign,spell:string,targetId:string,random=rollDie,origin?:Square):Campaign{
 const {battle}=requireTurn(campaign,'nighthawk');
 requireArmorSpellcasting(campaign);
 const c=campaign.character,actor=battle.participants.nighthawk,target=battle.participants[targetId];
 if(!c||!target||target.deathSaves?.dead)throw Error('Choose an eligible spell target.');
 const slots=c.spellSlots;
 if(spell==='Web'&&c.preparedSpells?.includes(spell)){
  if(!origin||!slots||!slots.level2||(slots.usedLevel2??0)>=slots.level2)throw Error('Web requires a level-two slot and a selected battlefield origin.');
  const next=castItemWeb(campaign,{...origin,anchored:true},8+c.proficiencyBonus+abilityModifier(c.scores.int));
  return {...next,character:{...next.character!,spellSlots:{...slots,usedLevel2:(slots.usedLevel2??0)+1}}};
 }
 if(spell==='Magic Missile'&&c.preparedSpells?.includes(spell)){
  if(!slots||slots.usedLevel1>=slots.level1)throw Error('A level-one spell slot is required.');
  const next=castItemMagicMissile(campaign,1,[targetId,targetId,targetId],[die(random,4),die(random,4),die(random,4)]);
  return {...next,character:{...next.character!,spellSlots:{...slots,usedLevel1:slots.usedLevel1+1}}};
 }
 if(spell==='Cure Wounds'&&c.preparedSpells?.includes(spell)){
  if(!slots||slots.usedLevel1>=slots.level1||distanceFeet(actor,target)>5)throw Error('Cure Wounds requires a level-one slot and a target within touch.');
  const ability=['cleric','druid','ranger'].includes(campaign.characterIdentity?.classId??'')?'wis':
   ['bard','paladin','sorcerer','warlock'].includes(campaign.characterIdentity?.classId??'')?'cha':'int';
  const cast=useCompanionAction(campaign,'nighthawk','Utilize');
  const next=healCompanion(cast,targetId,Math.max(1,die(random,8)+die(random,8)+abilityModifier(c.scores[ability])));
  return {...next,character:{...next.character!,spellSlots:{...slots,usedLevel1:slots.usedLevel1+1}}};
 }
 if(spell==='Fire Bolt'&&c.cantrips?.includes(spell)){
  const ability=['sorcerer','warlock','bard'].includes(campaign.characterIdentity?.classId??'')?'cha':'int';
  const mode=companionAttackRollMode(campaign,'nighthawk',targetId);
  const {a,b,kept}=d20Pair(random,!!mode.attackAdvantage,!!mode.attackDisadvantage);
  const count=(c.level??1)>=17?4:(c.level??1)>=11?3:(c.level??1)>=5?2:1;
  return attackCompanion(campaign,'nighthawk',targetId,a,c.proficiencyBonus+abilityModifier(c.scores[ability]),target.armorClass??10,
   rollDamage(count+'d10',kept===20,random),0,'Fire',120,b);
 }
 throw Error('This spell requires DM adjudication.');
}

export function resolveTacticalReaction(campaign:Campaign,accept:boolean|'shield',random=rollDie):Campaign{
 const {battle,state}=combat(campaign);
 if(state.pendingHit)return resolveTacticalIncomingHit(campaign,accept);
 const pending=battle.pendingOpportunity,readied=state.pendingReady;
 const id=readied?.target??pending?.moverId;
 if(!id||!readied&&!pending?.attackerIds.includes('nighthawk'))throw Error('No player reaction attack is available.');
 if(accept===false)return readied?{...campaign,companionEncounter:{...battle,phaseThree:{...state,pendingReady:undefined,readied:undefined}}}:declineTacticalOpportunity(campaign,'nighthawk');
 if(accept==='shield')throw Error('Shield requires an incoming hit.');
 const attack=nighthawkEquippedAttack(campaign),item=ITEM_BY_ID[attack?.weaponId??''],target=battle.participants[id];
 if(!target||target.armorClass===undefined)throw Error('No reaction target is available.');
 const melee=attack&&item&&!weaponAttackProfile(item).rangedWeapon;
 const mode=companionAttackRollMode(campaign,'nighthawk',id);
 const {kept}=d20Pair(random,!!mode.attackAdvantage,!!mode.attackDisadvantage);
 const strength=npcAbility(campaign,'nighthawk','str');
 return resolveCompanionOpportunityAttack(campaign,'nighthawk',id,kept,melee?attack.attackModifier:strength+(campaign.character?.proficiencyBonus??2),target.armorClass,
  melee?rollDamage(attack.damageDice,kept===20,random):1,melee?attack.damageModifier:strength,melee?weaponAttackProfile(item).damageType??'Bludgeoning':'Bludgeoning',!!readied);

}

export function tacticalEndTurn(campaign:Campaign,random=rollDie):Campaign{
 const {battle,state,active}=combat(campaign);
 if(state.pendingHit||state.pendingReady||state.concentrationCheck||battle.pendingOpportunity?.attackerIds.length||battle.pendingOpportunity?.destination)throw Error('Resolve and continue the interrupted action first.');
 let next=campaign;
 if(pendingWebSave(battle))next=resolveWebTurnSave(next,die(random,20)+npcAbility(next,active,'dex'));
 const actor=next.companionEncounter!.participants[active];
 if(actor.roguePoisonDC!==undefined&&!actor.roguePoisonSaveResolved)next=resolveRoguePoisonSave(next,active,die(random,20)+npcAbility(next,active,'con'));
 if(actor.rogueKnockoutDC!==undefined&&!actor.rogueKnockoutSaveResolved)next=resolveRogueKnockoutSave(next,active,die(random,20)+npcAbility(next,active,'con'));
 return endCompanionTurn(next,active,()=>die(random,4));
}
export function tacticalDeathSave(campaign:Campaign,random=rollDie):Campaign{
 requireTurn(campaign,'nighthawk');
 return resolveCompanionDeathSave(campaign,'nighthawk',die(random,20));
}
export function resumeTacticalMovement(campaign:Campaign):Campaign{
 const {battle,state}=combat(campaign);
 if(state.pendingHit||state.pendingReady||state.concentrationCheck||!battle.pendingOpportunity?.destination||battle.pendingOpportunity.attackerIds.length)throw Error('Resolve all opportunity reactions before moving.');
 return markReadiedTrigger(campaign,resumeEnemyInterruptedMovement(campaign,battle.pendingOpportunity.moverId),battle.pendingOpportunity.moverId);
}

export function finishTacticalEncounter(campaign:Campaign,outcome:EncounterOutcome,note=''):Campaign{
 const {battle,state}=combat(campaign),player=battle.participants.nighthawk;
 if(state.pendingHit||state.pendingReady||state.concentrationCheck||battle.pendingOpportunity?.attackerIds.length)throw Error('Resolve the interrupted action first.');
 if(outcome==='victory'&&Object.values(battle.participants).some(p=>p.faction==='enemies'&&p.hp>0))throw Error('Hostile combatants are still standing.');
 if(outcome==='defeat'&&player.hp>0)throw Error('The player is still standing.');
 if(outcome==='escape'&&!state.scenario.exits.some(exit=>distanceFeet(exit,player)===0))throw Error('Reach an exit before escaping.');
 const ended=finishCompanionEncounter(campaign);
 const battleResult={...ended.companionEncounter!,phaseThree:{...state,outcome,note}};
 const settled=settleEncounterRewards({...ended,companionEncounter:battleResult},{xp:0,gold:0,items:[]});
 const resumed=resumeAdventureExploration(settled);
 const now=new Date().toISOString();
 return {...resumed,journal:[...resumed.journal,{id:crypto.randomUUID(),kind:'system',createdAt:now,text:'Encounter ended by '+outcome+(note.trim()?'. '+note.slice(0,300):'.')}]};
}

function castTacticalNpcSpell(campaign:Campaign,id:string,name:unknown,destination:Square,random:RollDie):Campaign{
 const {battle,state}=requireTurn(campaign,id),caster=battle.participants[id],resources=state.actors[id];
 if(profileActor(campaign,id)?.profile!=='mage'||name!=='Fireball'&&name!=='Misty Step')throw Error('This actor cannot cast that supported spell.');
 const uses=resources.spellUses?.[name]??0;
 if(!uses)throw Error('No uses of this spell remain.');
 if(!fitsBattlefield(destination,state.scenario.size)||!companionCanSee(battle,caster,destination))throw Error('Choose a visible destination on the map.');
 let next=campaign;
 let participants=battle.participants;
 if(name==='Misty Step'){
  if(caster.bonusActionUsed||distanceFeet(caster,destination)>30||battle.obstacles?.some(cell=>distanceFeet(cell,destination)===0)||
    Object.values(participants).some(target=>target.hp>0&&distanceFeet(target,destination)===0))throw Error('Misty Step needs a Bonus Action and an unoccupied space within 30 feet.');
  participants={...participants,[id]:{...caster,...destination,bonusActionUsed:true}};
 }else{
  if(caster.actionUsed||distanceFeet(caster,destination)>150)throw Error('Fireball needs an Action and a point within 150 feet.');
  const damage=rollDamage('9d6',false,random);
  for(const [targetId,target] of Object.entries(participants)){
   if(target.hp<=0||Math.hypot(target.x-destination.x,target.y-destination.y)*5>20)continue;
   const player=targetId==='nighthawk'?statsWithTemporaryEffects(next):undefined;
   const modifier=player?savingThrowModifier(player,'dex')+magicProtectionBonus(next):npcAbility(campaign,targetId,'dex');
   const save=die(random,20)+modifier;
   const evasion=player?.classId==='rogue'&&(player.level??1)>=7;
   const amount=save>=14?(evasion?0:Math.floor(damage/2)):(evasion?Math.floor(damage/2):damage);
   if(amount)next=damageCompanion(next,targetId,amount,'Fire');
  }
  participants={...next.companionEncounter!.participants,[id]:{...next.companionEncounter!.participants[id],actionUsed:true}};
 }
 const applied=next.companionEncounter!;
 return {...next,companionEncounter:{...applied,participants,phaseThree:{...applied.phaseThree!,actors:{...state.actors,[id]:{...resources,spellUses:{...resources.spellUses,[name]:uses-1}}}},
  log:[...applied.log,id+' casts '+name+'.']}};
}

const outcomes=new Set<EncounterOutcome>(['victory','defeat','retreat','escape','surrender','negotiation','objective','abandoned']);
export function executeDmTactics(campaign:Campaign,value:unknown,random=rollDie):Campaign{
 if(!Array.isArray(value)||!value.length||value.length>8)throw Error('The DM did not provide a bounded tactical command list.');
 let next=campaign;
 for(const raw of value){
  if(!raw||typeof raw!=='object')throw Error('Malformed DM command.');
  const step=raw as Record<string,unknown>;
  const {battle,state,active}=combat(next);
  if(step.kind==='outcome'){
   if(typeof step.outcome!=='string'||!outcomes.has(step.outcome as EncounterOutcome))throw Error('Unknown encounter outcome.');
   return finishTacticalEncounter(next,step.outcome as EncounterOutcome,typeof step.note==='string'?step.note:'');
  }
  if(state.pendingHit||state.pendingReady||state.concentrationCheck||battle.pendingOpportunity?.attackerIds.includes('nighthawk'))return next;
  if(battle.pendingOpportunity?.attackerIds.length){
   if(step.kind!=='opportunity'||typeof step.actor!=='string'||!battle.pendingOpportunity.attackerIds.includes(step.actor))throw Error('Resolve the interrupted move’s pending opportunity reactions.');
   const source=profileActor(next,step.actor);
   if(!source)throw Error('Unknown reaction actor.');
   if(step.take===false)next=declineTacticalOpportunity(next,step.actor);
   else{
    const targetId=battle.pendingOpportunity.moverId,target=battle.participants[targetId],weapon=TACTICAL_PROFILES[source.profile].weapons[0];
    const roll=die(random,20);
    next=resolveCompanionOpportunityAttack(next,source.id,targetId,roll,weapon.bonus,target.armorClass??10,rollDamage(weapon.dice,roll===20,random),weapon.modifier,weapon.type);
   }
   continue;
  }
  if(step.kind==='resume'){next=resumeTacticalMovement(next);continue;}
  if(active==='nighthawk'||step.actor!==active)throw Error('The DM can issue tactical actions only for the active NPC.');
  const npc=profileActor(next,active);
  if(!npc)throw Error('Unverified DM actor.');
  if(battle.participants[active].hp<=0||step.kind==='end')return tacticalEndTurn(next,random);
  if(pendingWebSave(battle))next=resolveWebTurnSave(next,die(random,20)+npcAbility(next,active,'dex'));
  if(step.kind==='escape-grapple')next=escapeTacticalGrapple(next,active,step.acrobatics===true,random);
  else if(step.kind==='move')next=tacticalMove(next,active,{x:step.x as number,y:step.y as number},random);
  else if(step.kind==='cast')next=castTacticalNpcSpell(next,active,step.spell,{x:step.x as number,y:step.y as number},random);
  else if(step.kind==='attack'){
   if(typeof step.target!=='string'||sameSide(battle,active,step.target)||!battle.participants[step.target]||battle.participants[step.target].hp<=0)throw Error('Select an active opponent.');
   const weapon=TACTICAL_PROFILES[npc.profile].weapons[step.ranged===true?1:0];
   if(!weapon||weapon.ammunition!==undefined&&state.actors[active].ammunition<1)throw Error('The NPC lacks the requested weapon or ammunition.');
   const mode=companionAttackRollMode(next,active,step.target,undefined,false,weapon.normal);
   const target=battle.participants[step.target];
   const packTactics=Boolean(getMonster(npc.profile)?.traits.some(trait=>trait.effect==='pack-tactics'))&&
     Object.entries(battle.participants).some(([allyId,ally])=>allyId!==active&&ally.hp>0&&
       sameSide(battle,active,allyId)&&distanceFeet(ally,target)<=5);
   const {a,b,kept}=d20Pair(random,!!mode.attackAdvantage||packTactics,!!mode.attackDisadvantage);
   const ac=step.target==='nighthawk'?nighthawkEquippedDefense(next)?.armorClass:battle.participants[step.target].armorClass;
   if(ac===null||ac===undefined)throw Error('Target armor class unavailable.');
   next=attackCompanion(next,active,step.target,a,weapon.bonus,ac,rollDamage(weapon.dice,kept===20,random),weapon.modifier,weapon.type,weapon.reach,b,undefined,undefined,undefined,undefined,undefined,weapon.normal);
   const monster=getMonster(npc.profile);
   const observed=monster?.actions.find(action=>action.name===weapon.name);
   if(observed)next=recordMonsterAbility(next,npc.profile,observed.id);
   if(packTactics)next=recordMonsterAbility(next,npc.profile,'pack-tactics');
   if(weapon.ammunition!==undefined){const encounter=next.companionEncounter!,current=encounter.phaseThree!;next={...next,companionEncounter:{...encounter,phaseThree:{...current,actors:{...current.actors,[active]:{...current.actors[active],ammunition:current.actors[active].ammunition-1}}}}};}
  } else if(step.kind==='action'&&typeof step.action==='string'&&['Dash','Disengage','Dodge','Hide','Search','Study','Help','Utilize','Ready','Grapple','Shove'].includes(step.action))
   next=tacticalAction(next,active,step.action as TacticalAction,{target:typeof step.target==='string'?step.target:undefined,detail:typeof step.detail==='string'?step.detail:undefined,bonus:step.bonus===true},random);
  else throw Error('This tactical command requires explicit DM adjudication.');
 }
 return next;
}
