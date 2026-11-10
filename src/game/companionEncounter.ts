import type {Campaign} from './campaign';
import {adjudicateSubclassActorCondition,adjudicateSubclassActorDamage} from './campaign';
import type {DamageType} from './subclassCombatRules';
import {abilityModifier} from './checks';

/** Isolated companion skirmish. Never mutates Campaign.combat (the Nighthawk training encounter). */
export interface CompanionEncounter {
 status:'active'|'completed';
 mode?:'companions'|'unified';
 round:number;
 turnIndex:number;
 order:string[];
 participants:Record<string,{x:number;y:number;hp:number;maxHp:number;initiative:number;conditions:('Charmed'|'Poisoned')[];speedFeet:number;movementSpentFeet:number;actionUsed:boolean;bonusActionUsed:boolean;dashFeet:number;disengaged:boolean;dodging:boolean;reactionUsed?:boolean;concentratingOn?:string;consumables?:Record<string,number>}>;
 obstacles?:{x:number;y:number}[];
 cover?:{x:number;y:number}[];
 pendingOpportunity?:{moverId:string;attackerIds:string[];from:{x:number;y:number};to:{x:number;y:number}};
 log:string[];
}
function encounter(campaign:Campaign):CompanionEncounter{
 if(!campaign.companionEncounter||campaign.companionEncounter.status!=='active')throw Error('No active companion encounter');
 return campaign.companionEncounter;
}
function activeActor(campaign:Campaign,actorId:string):CompanionEncounter{
 const battle=encounter(campaign);
 if(battle.order[battle.turnIndex]!==actorId)throw Error('Not this actor’s turn');
 if(!(actorId==='nighthawk'&&battle.mode==='unified')&&!campaign.subclassActors?.[actorId])throw Error('Actor is not registered');
 return battle;
}
function save(campaign:Campaign,battle:CompanionEncounter):Campaign{
 return {...campaign,companionEncounter:battle,updatedAt:new Date().toISOString()};
}
export function startCompanionEncounter(campaign:Campaign,initiative:Record<string,number>,positions:Record<string,{x:number;y:number}>,hitPoints:Record<string,number>):Campaign{
 if(campaign.companionEncounter?.status==='active')throw Error('Finish the existing companion encounter first');
 const ids=Object.keys(initiative);
 if(!ids.length||ids.some(id=>!campaign.subclassActors?.[id]))throw Error('All participants must be registered subclass actors');
 const participants:CompanionEncounter['participants']={};
 for(const id of ids){
  const roll=initiative[id],position=positions[id],hp=hitPoints[id];
  if(!Number.isInteger(roll)||roll<1||roll>40||!position||!Number.isInteger(position.x)||!Number.isInteger(position.y)||position.x<0||position.y<0||position.x>19||position.y>19||!Number.isInteger(hp)||hp<1||hp>500)throw Error('Invalid initiative, position or hit points');
  if(Object.values(participants).some(p=>p.x===position.x&&p.y===position.y))throw Error('Actors cannot share a starting square');
  participants[id]={...position,hp,maxHp:hp,initiative:roll,conditions:[],speedFeet:30,movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,reactionUsed:false};
 }
 const order=ids.sort((a,b)=>participants[b].initiative-participants[a].initiative||a.localeCompare(b));
 return save(campaign,{status:'active',mode:'companions',round:1,turnIndex:0,order,participants,obstacles:[],cover:[],log:['Companion encounter started.']});
}
type Cell={x:number;y:number};
const key=(p:Cell)=>p.x+','+p.y;
const valid=(p:Cell)=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<20&&p.y<20;
function pathSteps(battle:CompanionEncounter,from:Cell,to:Cell,actorId:string):number{
 const blocked=new Set((battle.obstacles??[]).map(key));
 for(const [id,p] of Object.entries(battle.participants))if(id!==actorId&&p.hp>0)blocked.add(key(p));
 const queue:[Cell,number][]=[[from,0]],visited=new Set([key(from)]);
 for(let i=0;i<queue.length;i++){
  const [current,steps]=queue[i];
  if(current.x===to.x&&current.y===to.y)return steps;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   if(!dx&&!dy)continue;
   const next={x:current.x+dx,y:current.y+dy};
   if(!valid(next)||blocked.has(key(next))||visited.has(key(next)))continue;
   // Prevent cutting a diagonal through a fully blocked corner.
   if(dx&&dy&&blocked.has(key({x:current.x+dx,y:current.y}))&&blocked.has(key({x:current.x,y:current.y+dy})))continue;
   visited.add(key(next));queue.push([next,steps+1]);
  }
 }
 throw Error('No unobstructed path to destination');
}
export function setCompanionObstacles(campaign:Campaign,obstacles:Cell[]):Campaign{
 const battle=encounter(campaign);
 if(obstacles.length>120||obstacles.some(p=>!valid(p))||new Set(obstacles.map(key)).size!==obstacles.length)throw Error('Invalid obstacle coordinates');
 if(obstacles.some(p=>Object.values(battle.participants).some(actor=>actor.x===p.x&&actor.y===p.y)))throw Error('Obstacle overlaps an actor');
 if(obstacles.some(p=>(battle.cover??[]).some(c=>c.x===p.x&&c.y===p.y)))throw Error('Obstacle overlaps cover annotation');
 return save(campaign,{...battle,obstacles:obstacles.map(p=>({...p})),log:[...battle.log,'Map obstacles updated: '+obstacles.length]});
}
/** Solid occupied squares block sight. Other terrain and partial cover require DM judgment. */
export function companionLineOfSight(battle:CompanionEncounter,from:Cell,to:Cell):boolean{
 const blocked=new Set((battle.obstacles??[]).map(key));
 const steps=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y))*4;
 if(!steps)return true;
 for(let i=1;i<steps;i++){
  const x=from.x+(to.x-from.x)*i/steps,y=from.y+(to.y-from.y)*i/steps;
  // Conservative: only block when the ray passes through a square's interior,
  // not when it merely grazes a grid corner.
  if(blocked.has(key({x:Math.round(x),y:Math.round(y)}))&&Math.abs(x-Math.round(x))<0.49&&Math.abs(y-Math.round(y))<0.49)return false;
 }
 return true;
}
/** Partial cover is a DM-supplied map annotation, not an automatic AC bonus. */
export function setCompanionCover(campaign:Campaign,cells:{x:number;y:number}[]):Campaign{
 const battle=encounter(campaign);
 if(cells.length>120||cells.some(p=>!valid(p))||new Set(cells.map(key)).size!==cells.length)throw Error('Invalid cover coordinates');
 if(cells.some(p=>(battle.obstacles??[]).some(o=>o.x===p.x&&o.y===p.y)))throw Error('Cover cannot overlap solid obstacles');
 return save(campaign,{...battle,cover:cells.map(p=>({...p})),log:[...battle.log,'Cover annotations updated: '+cells.length]});
}
export function companionCoverStatus(campaign:Campaign,targetId:string):'annotated'|'none'{
 const battle=encounter(campaign),target=battle.participants[targetId];
 if(!target)throw Error('Unknown cover target');
 return (battle.cover??[]).some(p=>p.x===target.x&&p.y===target.y)?'annotated':'none';
}
/** Read-only bridge for planning a unified party encounter. Never writes to Nighthawk combat. */
export function companionPartySnapshot(campaign:Campaign){
 const battle=campaign.companionEncounter;
 return {nighthawk:{id:'nighthawk',prototypeCombatStatus:campaign.combat?.status??'not-started',includedInCompanionEncounter:false},
  companions:battle?battle.order.map(id=>({id,hp:battle.participants[id].hp,initiative:battle.participants[id].initiative,active:battle.status==='active'&&battle.order[battle.turnIndex]===id})):[],
  readyForUnifiedCombat:false};
}
export function companionOpportunityAttackEligible(campaign:Campaign,actorId:string):boolean{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor)throw Error('Unknown actor');
 return !actor.disengaged;
}
/** Opt-in unified skirmish. Nighthawk's existing Campaign.combat remains untouched. */
export function startUnifiedEncounter(campaign:Campaign,initiative:Record<string,number>,positions:Record<string,{x:number;y:number}>,hitPoints:Record<string,number>):Campaign{
 if(!campaign.character)throw Error('Nighthawk character statistics unavailable');
 if(!Object.keys(initiative).some(id=>id!=='nighthawk'))throw Error('Unified encounter requires at least one registered companion');
 if(!Object.hasOwn(initiative,'nighthawk'))throw Error('Unified encounter requires Nighthawk');
 const companionIds=Object.keys(initiative).filter(id=>id!=='nighthawk');
 if(companionIds.some(id=>!Object.hasOwn(campaign.subclassActors??{},id)))throw Error('Unregistered companion');
 const base=startCompanionEncounter(campaign,Object.fromEntries(companionIds.map(id=>[id,initiative[id]])),Object.fromEntries(companionIds.map(id=>[id,positions[id]])),Object.fromEntries(companionIds.map(id=>[id,hitPoints[id]])));
 const battle=base.companionEncounter!;
 const position=positions.nighthawk,roll=initiative.nighthawk;
 const character=campaign.character;
 const hp=character.currentHitPoints??character.maxHitPoints;
 const maxHp=character.maxHitPoints,speed=character.speed;
 if(!position||!valid(position)||Object.values(battle.participants).some(p=>p.x===position.x&&p.y===position.y))throw Error('Invalid Nighthawk position');
 if(!Number.isInteger(roll)||roll<1||roll>40||!Number.isInteger(hp)||!Number.isInteger(maxHp)||hp!<1||maxHp!<1||hp!>maxHp!||!Number.isInteger(speed)||speed!<0||speed!>120||speed!%5!==0)throw Error('Invalid Nighthawk character statistics');
 const participants:CompanionEncounter['participants']={...battle.participants,nighthawk:{...position,hp:hp!,maxHp:maxHp!,initiative:roll,conditions:[] as ('Charmed'|'Poisoned')[],speedFeet:speed!,movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,reactionUsed:false}};
 const order=Object.keys(participants).sort((a,b)=>participants[b].initiative-participants[a].initiative||a.localeCompare(b));
 return save(campaign,{...battle,mode:'unified',participants,order,log:['Unified encounter started; Nighthawk prototype combat preserved.']});
}
/** Potential reach exits only: the DM confirms hostility, actual reach and trigger. */
export function companionOpportunityCandidates(battle:CompanionEncounter,moverId:string,from:Cell,to:Cell):string[]{
 const mover=battle.participants[moverId];
 if(!mover||mover.disengaged)return [];
 const adjacent=(a:Cell,b:Cell)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))<=1;
 return Object.entries(battle.participants).filter(([id,actor])=>id!==moverId&&actor.hp>0&&!actor.reactionUsed&&adjacent(actor,from)&&!adjacent(actor,to)).map(([id])=>id);
}
export function moveCompanion(campaign:Campaign,actorId:string,x:number,y:number):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(actor.hp<=0)throw Error('Actor at zero HP cannot move');
 if(!valid({x,y}))throw Error('Destination outside 20×20 arena');
 if(Object.entries(battle.participants).some(([id,p])=>id!==actorId&&p.hp>0&&p.x===x&&p.y===y))throw Error('Square occupied');
 const steps=pathSteps(battle,actor,{x,y},actorId);
 const candidates=companionOpportunityCandidates(battle,actorId,actor,{x,y});
 if(steps*5>actor.speedFeet+actor.dashFeet-actor.movementSpentFeet)throw Error('Move exceeds remaining movement');
 if(Object.entries(battle.participants).some(([id,p])=>id!==actorId&&p.hp>0&&p.x===x&&p.y===y))throw Error('Square occupied');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,x,y,movementSpentFeet:actor.movementSpentFeet+steps*5}},pendingOpportunity:candidates.length?{moverId:actorId,attackerIds:candidates,from:{x:actor.x,y:actor.y},to:{x,y}}:undefined,log:[...battle.log,actorId+' moved to '+x+','+y+(candidates.length?' · potential opportunity attackers: '+candidates.join(', '):'')]});
}
export function endCompanionTurn(campaign:Campaign,actorId:string):Campaign{
 const battle=activeActor(campaign,actorId);
 const next=(battle.turnIndex+1)%battle.order.length;
 const nextId=battle.order[next];const outgoing=battle.participants[actorId];const participants={...battle.participants,[actorId]:{...outgoing,disengaged:false}};participants[nextId]={...participants[nextId],movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,reactionUsed:false};return save(campaign,{...battle,participants,turnIndex:next,round:battle.round+(next===0?1:0),log:[...battle.log,actorId+' ended turn']});
}
export function damageCompanion(campaign:Campaign,targetId:string,amount:number,type:DamageType):Campaign{
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor||!Number.isInteger(amount)||amount<0||amount>1000)throw Error('Invalid damage target or amount');
 const taken=targetId==='nighthawk'&&battle.mode==='unified'?amount:adjudicateSubclassActorDamage(campaign,targetId,amount,type);
 const hp=Math.max(0,actor.hp-taken);
 const concentrationNote=actor.concentratingOn&&taken>0?' Concentration save required (DC '+companionConcentrationSaveDC(taken)+')'+(hp===0?'; concentration ends at 0 HP':''):'';
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,hp,concentratingOn:hp===0?undefined:actor.concentratingOn}},log:[...battle.log,targetId+' took '+taken+' '+type+' damage'+(taken!==amount?' (resisted)':'')+concentrationNote]});
}
export function conditionCompanion(campaign:Campaign,targetId:string,condition:'Charmed'|'Poisoned',auraSourceId?:string):Campaign{
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor)throw Error('Unknown target');
 const aura=auraSourceId?battle.participants[auraSourceId]:undefined;
 const source=auraSourceId?campaign.subclassActors?.[auraSourceId]:undefined;
 const auraActive=!!source&&source.subclassId==='paladin-devotion'&&source.level>=7&&!!aura&&aura.hp>0;
 const withinDevotionAura=auraActive&&Math.max(Math.abs(aura!.x-actor.x),Math.abs(aura!.y-actor.y))<=2;
 const ownAura=campaign.subclassActors?.[targetId]?.subclassId==='paladin-devotion'&&campaign.subclassActors[targetId].level>=7&&actor.hp>0;
 const permitted=!(condition==='Charmed'&&(withinDevotionAura||ownAura))&&(targetId==='nighthawk'&&battle.mode==='unified'?true:adjudicateSubclassActorCondition(campaign,targetId,condition,{auraActive:ownAura,withinDevotionAura:ownAura}));
 if(!permitted)return save(campaign,{...battle,log:[...battle.log,targetId+' is immune to '+condition]});
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,conditions:[...new Set([...actor.conditions,condition])]}},log:[...battle.log,targetId+' gained '+condition]});
}
/** Explicitly reconcile Nighthawk encounter HP to the character sheet.
 * This is opt-in to prevent overwriting changes made by the legacy combat prototype.
 */
export function synchronizeNighthawkHitPoints(campaign:Campaign):Campaign{
 const battle=encounter(campaign),actor=battle.participants.nighthawk;
 if(battle.mode!=='unified'||!actor||!campaign.character)throw Error('No unified Nighthawk to synchronize');
 if(!Number.isInteger(actor.hp)||actor.hp<0||actor.hp>actor.maxHp)throw Error('Invalid encounter hit points');
 return {...campaign,character:{...campaign.character,currentHitPoints:actor.hp},companionEncounter:{...battle,log:[...battle.log,'Nighthawk HP synchronized to character sheet']},updatedAt:new Date().toISOString()};
}
/** Manually recorded reactions are actor-scoped; the DM adjudicates triggers and effects. */
export function recordCompanionReaction(campaign:Campaign,actorId:string,description:string):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||actor.hp<=0)throw Error('Invalid reaction actor');
 if(actor.reactionUsed)throw Error('Reaction already used');
 if(!description.trim()||description.length>160)throw Error('Reaction requires a short DM description');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,reactionUsed:true}},log:[...battle.log,actorId+' reaction: '+description.trim()+' (DM adjudicated)']});
}
export function removeCompanionCondition(campaign:Campaign,targetId:string,condition:'Charmed'|'Poisoned'):Campaign{
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor)throw Error('Unknown condition target');
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,conditions:actor.conditions.filter(c=>c!==condition)}},log:[...battle.log,targetId+' ended '+condition+' (DM adjudicated)']});
}
/** Derive only statistics explicitly present on the character sheet; weapon proficiency remains unverified. */
export function nighthawkEncounterStatistics(campaign:Campaign){
 const c=campaign.character;
 if(!c)throw Error('Nighthawk character unavailable');
 return {armorClass:c.armorClass??null,speedFeet:c.speed??null,proficiencyBonus:c.proficiencyBonus,dexterityModifier:abilityModifier(c.scores.dex),strengthModifier:abilityModifier(c.scores.str),spellSlots:c.spellSlots?{...c.spellSlots}:null,weaponAttackModifier:null as number|null};
}
/** Uses an explicitly granted bonus action; never assumes all actors have a bonus-action feature. */
export function useCompanionBonusAction(campaign:Campaign,actorId:string,description:string,eligible:boolean):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(!eligible)throw Error('Bonus action requires verified feature eligibility');
 if(actor.hp<=0||actor.bonusActionUsed)throw Error('Bonus action unavailable');
 if(!description.trim()||description.length>160)throw Error('Bonus action requires a description');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,bonusActionUsed:true}},log:[...battle.log,actorId+' bonus action: '+description.trim()+' (feature eligibility supplied; effect DM adjudicated)']});
}
/** Concentration is actor-scoped. Damage triggers a manual Constitution save, not an invented roll. */
export function setCompanionConcentration(campaign:Campaign,actorId:string,spell:string|null):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor)throw Error('Unknown concentration actor');
 if(spell!==null&&(!spell.trim()||spell.length>100||actor.hp<=0))throw Error('Invalid concentration spell');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,concentratingOn:spell?.trim()??undefined}},log:[...battle.log,actorId+(spell?' concentrating on '+spell:' ended concentration')]});
}
/** A caller-supplied Constitution saving throw total determines concentration outcome.
 * The DM supplies the actual roll and applicable modifiers; no dice are generated.
 */
export function resolveCompanionConcentrationSave(campaign:Campaign,actorId:string,damage:number,saveTotal:number):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||!actor.concentratingOn)throw Error('Actor is not concentrating');
 if(!Number.isInteger(saveTotal)||saveTotal<0||saveTotal>100)throw Error('Invalid Constitution save total');
 const dc=companionConcentrationSaveDC(damage);
 const passed=saveTotal>=dc;
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,concentratingOn:passed?actor.concentratingOn:undefined}},log:[...battle.log,actorId+' concentration save '+saveTotal+' vs DC '+dc+(passed?' succeeded':' failed; concentration ended')]});
}
export function companionConcentrationSaveDC(damage:number):number{
 if(!Number.isInteger(damage)||damage<0||damage>1000)throw Error('Invalid concentration damage');
 return Math.max(10,Math.floor(damage/2));
}
/** Explicitly recorded inventory quantities, never inferred from class or level. */
export function setCompanionConsumable(campaign:Campaign,actorId:string,item:string,quantity:number):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||!item.trim()||item.length>80||!Number.isInteger(quantity)||quantity<0||quantity>999)throw Error('Invalid consumable inventory');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,consumables:{...actor.consumables,[item.trim()]:quantity}}},log:[...battle.log,actorId+' inventory: '+item.trim()+' = '+quantity]});
}
export function spendCompanionConsumable(campaign:Campaign,actorId:string,item:string):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(!Object.hasOwn(actor.consumables??{},item)||(actor.consumables?.[item]??0)<1)throw Error('Consumable unavailable');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,consumables:{...actor.consumables,[item]:(actor.consumables?.[item]??0)-1}}},log:[...battle.log,actorId+' consumed '+item+' (item effect DM adjudicated)']});
}
/** Character-sheet level-one slots are authoritative. Spending is opt-in and does not touch legacy combat. */
/** Read-only inventory bridge. Campaign inventory is never duplicated or consumed implicitly. */
export function nighthawkEncounterInventory(campaign:Campaign){
 const gear=(campaign.inventoryLedger?.gear??[]).filter(item=>Number.isInteger(item.quantity)&&item.quantity>=0).map(item=>({name:item.name,quantity:item.quantity}));
 return {gear,ammunition:{arrows:campaign.equipment?.arrows??null},weapons:{daggers:campaign.equipment?.daggers??null},supplies:{caltrops:campaign.equipment?.caltrops??null,ballBearings:campaign.equipment?.ballBearings??null},authoritativeSource:'campaign' as const};
}
export function spendUnifiedNighthawkSpellSlot(campaign:Campaign,spell:string):Campaign{
 const battle=activeActor(campaign,'nighthawk'),actor=battle.participants.nighthawk;
 const character=campaign.character,slots=character?.spellSlots;
 if(battle.mode!=='unified'||!character||!slots)throw Error('Nighthawk has no verified level-one spell slots');
 if(!spell.trim()||spell.length>100||!character.preparedSpells?.includes(spell.trim()))throw Error('Spell is not prepared');
 if(actor.hp<=0||actor.actionUsed)throw Error('Spell action unavailable');
 if(!Number.isInteger(slots.level1)||!Number.isInteger(slots.usedLevel1)||slots.usedLevel1>=slots.level1||slots.usedLevel1<0)throw Error('No level-one spell slots remaining');
 return {...save(campaign,{...battle,participants:{...battle.participants,nighthawk:{...actor,actionUsed:true}},log:[...battle.log,'Nighthawk expended level-one slot for '+spell.trim()+' (spell effect DM adjudicated)']}),character:{...character,spellSlots:{...slots,usedLevel1:slots.usedLevel1+1}}};
}
/** Deterministic opportunity attack from an explicitly verified leaving-reach event.
 * Melee range, target AC and damage are supplied by the DM. No dice are generated.
 */
export function resolveCompanionOpportunityAttack(campaign:Campaign,attackerId:string,targetId:string,roll:number,modifier:number,targetAC:number,damage:number,damageModifier:number,damageType:DamageType):Campaign{
 const battle=encounter(campaign),attacker=battle.participants[attackerId],target=battle.participants[targetId];
 if(!attacker||!target||attackerId===targetId||attacker.hp<=0||target.hp<=0||attacker.reactionUsed)throw Error('Opportunity reaction unavailable');
 if(!Number.isInteger(roll)||roll<1||roll>20||![modifier,targetAC,damage,damageModifier].every(Number.isInteger)||targetAC<1||damage<0)throw Error('Invalid opportunity attack adjudication');
 if(target.disengaged)throw Error('Disengage prevents opportunity attack');
 if(battle.pendingOpportunity&&(!battle.pendingOpportunity.attackerIds.includes(attackerId)||battle.pendingOpportunity.moverId!==targetId))throw Error('Attacker not in pending opportunity candidates');
 if(!companionLineOfSight(battle,attacker,target))throw Error('Opportunity target not visible');
 const hit=roll===20||(roll!==1&&roll+modifier>=targetAC);
 const raw=hit?Math.max(0,damage+damageModifier):0;
 const taken=targetId==='nighthawk'&&battle.mode==='unified'?raw:adjudicateSubclassActorDamage(campaign,targetId,raw,damageType);
 return save(campaign,{...battle,participants:{...battle.participants,[attackerId]:{...attacker,reactionUsed:true},[targetId]:{...target,hp:Math.max(0,target.hp-taken),concentratingOn:target.hp<=taken?undefined:target.concentratingOn}},log:[...battle.log,attackerId+' opportunity attack vs '+targetId+': '+(hit?'hit for '+taken:'miss')+' (DM verified reach trigger)']});
}
export function finishCompanionEncounter(campaign:Campaign):Campaign{
 const battle=encounter(campaign);
 return save(campaign,{...battle,status:'completed',log:[...battle.log,'Companion encounter completed']});
}

/** Manual d20 and damage dice inputs; no automatic attack modifiers or dice invented. */
export function attackCompanion(campaign:Campaign,attackerId:string,targetId:string,roll:number,attackModifier:number,targetAC:number,damageRoll:number,damageModifier:number,damageType:DamageType,rangeFeet?:number,secondD20?:number):Campaign{
 const battle=activeActor(campaign,attackerId);
 const attacker=battle.participants[attackerId],target=battle.participants[targetId];
 if(!target||attackerId===targetId||attacker.hp<=0||target.hp<=0)throw Error('Invalid attacker or target');
 if(attacker.actionUsed)throw Error('Action already used this turn');
 if((battle.cover??[]).some(p=>p.x===target.x&&p.y===target.y))throw Error('Target has annotated cover: DM must supply adjusted AC and clear cover annotation before attack');
 if(!companionLineOfSight(battle,attacker,target))throw Error('Line of sight blocked by map obstacle');
 if(target.dodging&&secondD20===undefined)throw Error('Dodge requires a second d20 for disadvantage');
 if(secondD20!==undefined&&(!Number.isInteger(secondD20)||secondD20<1||secondD20>20))throw Error('Invalid second d20');
 if(rangeFeet!==undefined){if(!Number.isInteger(rangeFeet)||rangeFeet<5||rangeFeet>1000||rangeFeet%5!==0)throw Error('Invalid attack range');const distance=Math.max(Math.abs(attacker.x-target.x),Math.abs(attacker.y-target.y))*5;if(distance>rangeFeet)throw Error('Target outside declared attack range');}
 if(!Number.isInteger(roll)||roll<1||roll>20||!Number.isInteger(attackModifier)||attackModifier< -20||attackModifier>30||!Number.isInteger(targetAC)||targetAC<1||targetAC>40||!Number.isInteger(damageRoll)||damageRoll<0||damageRoll>1000||!Number.isInteger(damageModifier)||damageModifier< -20||damageModifier>30)throw Error('Invalid attack inputs');
 const effectiveRoll=target.dodging?Math.min(roll,secondD20!):roll;
 const critical=effectiveRoll===20;
 const hit=critical||(effectiveRoll!==1&&effectiveRoll+attackModifier>=targetAC);
 const used={...attacker,actionUsed:true};
 const participants={...battle.participants,[attackerId]:used};
 let dealt=0;
 if(hit){
  // Caller supplies total rolled damage dice, including doubled dice on a critical hit.
  const raw=Math.max(0,damageRoll+damageModifier);
  dealt=targetId==='nighthawk'&&battle.mode==='unified'?raw:adjudicateSubclassActorDamage(campaign,targetId,raw,damageType);
  participants[targetId]={...target,hp:Math.max(0,target.hp-dealt)};
 }
 return save(campaign,{...battle,participants,log:[...battle.log,attackerId+' attack d20 '+effectiveRoll+(target.dodging?' (Dodge disadvantage)':'')+(critical?' critical hit':hit?' hit':' miss')+' vs '+targetId+' AC '+targetAC+(hit?'; '+dealt+' '+damageType+' damage':'')]});
}
export function setCompanionSpeed(campaign:Campaign,actorId:string,speedFeet:number):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||!Number.isInteger(speedFeet)||speedFeet<0||speedFeet>120||speedFeet%5!==0)throw Error('Invalid speed');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,speedFeet}},log:[...battle.log,actorId+' speed set to '+speedFeet+' ft (manual character statistic)']});
}

/** Explicit 2024 action choices; only effects we can enforce are automated. */
export function useCompanionAction(campaign:Campaign,actorId:string,choice:'Dash'|'Disengage'|'Dodge'|'Help'|'Search'|'Study'|'Influence'|'Ready'|'Utilize'):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(actor.actionUsed)throw Error('Action already used this turn');
 const updated={...actor,actionUsed:true,dashFeet:choice==='Dash'?actor.dashFeet+actor.speedFeet:actor.dashFeet,disengaged:choice==='Disengage'||actor.disengaged,dodging:choice==='Dodge'||actor.dodging};
 const note=['Help','Search','Study','Influence','Ready','Utilize'].includes(choice)?' (requires DM adjudication; no mechanical benefit assumed)':'';
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:updated},log:[...battle.log,actorId+' used '+choice+note]});
}
