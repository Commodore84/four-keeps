import type {Campaign} from './campaign';
import {adjudicateSubclassActorCondition,adjudicateSubclassActorDamage} from './campaign';
import type {DamageType} from './subclassCombatRules';
import {abilityModifier} from './checks';
import {ITEMS} from './creationEquipment';

/** Isolated companion skirmish. Never mutates Campaign.combat (the Nighthawk training encounter). */
export interface CompanionEncounter {
 status:'active'|'completed';
 mode?:'companions'|'unified';
 /** Last character-sheet HP observed at encounter creation or explicit synchronization. */
 nighthawkSheetHpSnapshot?:number;
 round:number;
 turnIndex:number;
 order:string[];
 participants:Record<string,{x:number;y:number;hp:number;maxHp:number;initiative:number;conditions:('Charmed'|'Poisoned'|'Blinded'|'Deafened'|'Frightened'|'Grappled'|'Incapacitated'|'Invisible'|'Paralyzed'|'Petrified'|'Prone'|'Restrained'|'Stunned'|'Unconscious'|'Exhaustion')[];speedFeet:number;movementSpentFeet:number;actionUsed:boolean;bonusActionUsed:boolean;dashFeet:number;disengaged:boolean;dodging:boolean;reactionUsed?:boolean;concentratingOn?:string;consumables?:Record<string,number>;faction?:string;reachFeet?:number;actorKind?:'party'|'enemy';armorClass?:number;attackModifier?:number;constitutionSaveModifier?:number;damageModifier?:number;damageDice?:string;enemyTactic?:'hold'|'nearest'|'lowest-hp';deathSaves?:{successes:number;failures:number;stable:boolean;dead:boolean}}>;
 obstacles?:{x:number;y:number}[];
 cover?:{x:number;y:number}[];
 pendingOpportunity?:{moverId:string;attackerIds:string[];from:{x:number;y:number};to:{x:number;y:number}};
 /** Thrown weapons awaiting DM-confirmed post-encounter recovery. */
 thrownWeaponsPendingRecovery?:Record<string,number>;
 /** Ammunition expended from verified inventory, awaiting DM-confirmed recovery. */
 ammunitionPendingRecovery?:Record<string,number>;
 log:string[];
}
function encounter(campaign:Campaign):CompanionEncounter{
 if(!campaign.companionEncounter||campaign.companionEncounter.status!=='active')throw Error('No active companion encounter');
 return campaign.companionEncounter;
}
function activeActor(campaign:Campaign,actorId:string):CompanionEncounter{
 const battle=encounter(campaign);
 if(battle.order[battle.turnIndex]!==actorId)throw Error('Not this actor’s turn');
 if(!(actorId==='nighthawk'&&battle.mode==='unified')&&!campaign.subclassActors?.[actorId]&&battle.participants[actorId]?.actorKind!=='enemy')throw Error('Actor is not registered');
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
function pathRoute(battle:CompanionEncounter,from:Cell,to:Cell,actorId:string):Cell[]{
 const blocked=new Set((battle.obstacles??[]).map(key));
 for(const [id,p] of Object.entries(battle.participants))if(id!==actorId&&p.hp>0)blocked.add(key(p));
 const queue:Cell[]=[from],visited=new Set([key(from)]),previous=new Map<string,Cell>();
 for(let i=0;i<queue.length;i++){
  const current=queue[i];
  if(current.x===to.x&&current.y===to.y){const route=[current];let step=current;while(previous.has(key(step))){step=previous.get(key(step))!;route.unshift(step)}return route;}
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   if(!dx&&!dy)continue;
   const next={x:current.x+dx,y:current.y+dy};
   if(!valid(next)||blocked.has(key(next))||visited.has(key(next)))continue;
   // Prevent cutting a diagonal through a fully blocked corner.
   if(dx&&dy&&blocked.has(key({x:current.x+dx,y:current.y}))&&blocked.has(key({x:current.x,y:current.y+dy})))continue;
   visited.add(key(next));previous.set(key(next),current);queue.push(next);
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
 return save(campaign,{...battle,mode:'unified',nighthawkSheetHpSnapshot:hp!,participants,order,log:['Unified encounter started; Nighthawk prototype combat preserved.']});
}
/** Potential reach exits only: the DM confirms hostility, actual reach and trigger. */
export function companionOpportunityCandidates(battle:CompanionEncounter,moverId:string,from:Cell,to:Cell):string[]{
 const mover=battle.participants[moverId];
 if(!mover||mover.disengaged)return [];
 const within=(a:Cell,b:Cell,feet:number)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))*5<=feet;
 return Object.entries(battle.participants).filter(([id,actor])=>id!==moverId&&actor.hp>0&&!actor.reactionUsed&&(!mover.faction||!actor.faction||mover.faction!==actor.faction)&&within(actor,from,actor.reachFeet??5)&&!within(actor,to,actor.reachFeet??5)).map(([id])=>id);
}
/** Explicit faction and melee reach configuration. Unset factions remain unknown. */
/** Explicit DM-defined enemy. Statistics are required; no monster stat block is invented. */
export function addCompanionEnemy(campaign:Campaign,id:string,initiative:number,position:Cell,hp:number,armorClass:number,attackModifier:number,speedFeet=30,reachFeet=5,damageModifier=0,damageDice?:string):Campaign{
 const battle=encounter(campaign),name=id.trim();
 if(!/^[a-zA-Z][a-zA-Z0-9_-]{1,39}$/.test(name)||battle.participants[name]||campaign.subclassActors?.[name]||name==='nighthawk')throw Error('Invalid or duplicate enemy ID');
 if(!valid(position)||Object.values(battle.participants).some(p=>p.hp>0&&p.x===position.x&&p.y===position.y))throw Error('Invalid or occupied enemy position');
 if(![initiative,hp,armorClass,attackModifier,speedFeet,reachFeet,damageModifier].every(Number.isInteger)||initiative<1||initiative>40||hp<1||hp>500||armorClass<1||armorClass>40||attackModifier< -20||attackModifier>30||damageModifier< -20||damageModifier>30||!!damageDice&&!/^\d{1,2}d\d{1,3}(?:\s+[a-z]+)?$/i.test(damageDice)||speedFeet<0||speedFeet>120||speedFeet%5!==0||reachFeet<5||reachFeet>30||reachFeet%5!==0)throw Error('Invalid enemy statistics');
 const participants={...battle.participants,[name]:{...position,hp,maxHp:hp,initiative,armorClass,attackModifier,damageModifier,damageDice,speedFeet,reachFeet,actorKind:'enemy' as const,faction:'enemies',conditions:[] as CompanionCondition[],movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,reactionUsed:false}};
 const currentId=battle.order[battle.turnIndex];
 const order=Object.keys(participants).sort((a,b)=>participants[b].initiative-participants[a].initiative||a.localeCompare(b));
 return save(campaign,{...battle,participants,order,turnIndex:order.indexOf(currentId),log:[...battle.log,'Enemy '+name+' joined initiative with DM-supplied statistics']});
}
/** DM-approved enemy behavior: select a hostile target deterministically without
 * generating dice or taking actions. Ties break by actor ID.
 */
export function configureEnemyTactic(campaign:Campaign,enemyId:string,tactic:'hold'|'nearest'|'lowest-hp'):Campaign{
 const battle=encounter(campaign),actor=battle.participants[enemyId];
 if(actor?.actorKind!=='enemy')throw Error('Enemy actor required');
 return save(campaign,{...battle,participants:{...battle.participants,[enemyId]:{...actor,enemyTactic:tactic}},log:[...battle.log,enemyId+' tactic set to '+tactic]});
}
export function previewEnemyTurn(campaign:Campaign,enemyId:string):{tactic:'hold'|'nearest'|'lowest-hp';targetId:string|null;distanceFeet:number|null;inReach:boolean}{
 const battle=activeActor(campaign,enemyId),actor=battle.participants[enemyId];
 if(actor.actorKind!=='enemy')throw Error('Enemy actor required');
 const tactic=actor.enemyTactic??'hold';
 if(tactic==='hold'||actor.hp===0||cannotAct(actor))return {tactic,targetId:null,distanceFeet:null,inReach:false};
 const hostile=Object.entries(battle.participants).filter(([id,p])=>id!==enemyId&&p.hp>0&&p.faction!==actor.faction);
 const distance=(p:typeof actor)=>Math.max(Math.abs(actor.x-p.x),Math.abs(actor.y-p.y))*5;
 hostile.sort(([idA,a],[idB,b])=>tactic==='lowest-hp'?(a.hp-b.hp||distance(a)-distance(b)||idA.localeCompare(idB)):(distance(a)-distance(b)||a.hp-b.hp||idA.localeCompare(idB)));
 const chosen=hostile[0];
 return {tactic,targetId:chosen?.[0]??null,distanceFeet:chosen?distance(chosen[1]):null,inReach:!!chosen&&distance(chosen[1])<=(actor.reachFeet??5)};
}
/** DM-authorized enemy turn: reuse validated grid movement, stop within reach,
 * and end the turn. No attack rolls, damage or reactions are invented.
 */
function executeEnemyMovement(campaign:Campaign,enemyId:string,finishTurn:boolean):Campaign{
 const battle=activeActor(campaign,enemyId),actor=battle.participants[enemyId];
 if(actor.actorKind!=='enemy')throw Error('Enemy actor required');
 const preview=previewEnemyTurn(campaign,enemyId);
 if(preview.targetId===null||preview.inReach)return finishTurn?endCompanionTurn(campaign,enemyId):campaign;
 const target=battle.participants[preview.targetId];
 const candidates: {x:number;y:number;distance:number;steps:number}[]=[];
 const maxSteps=Math.floor((actor.speedFeet+actor.dashFeet-actor.movementSpentFeet)/(actor.conditions.includes('Prone')?10:5));
 if(actor.hp<=0||actor.conditions.some(c=>IMMOBILE.includes(c))||maxSteps<=0)return finishTurn?endCompanionTurn(campaign,enemyId):campaign;
 for(let x=0;x<20;x++)for(let y=0;y<20;y++){
  if(Object.entries(battle.participants).some(([id,p])=>id!==enemyId&&p.hp>0&&p.x===x&&p.y===y))continue;
  try{
   const steps=pathRoute(battle,actor,{x,y},enemyId).length-1;
   if(steps>maxSteps)continue;
   const distance=Math.max(Math.abs(x-target.x),Math.abs(y-target.y))*5;
   candidates.push({x,y,distance,steps});
  }catch{/* blocked destination */}
 }
 candidates.sort((a,b)=>a.distance-b.distance||a.steps-b.steps||a.y-b.y||a.x-b.x);
 const best=candidates[0];
 if(!best||best.steps===0)return finishTurn?endCompanionTurn(campaign,enemyId):campaign;
 const moved=moveCompanion(campaign,enemyId,best.x,best.y);
 // Preserve the mover's turn while leaving-reach reactions await DM resolution.
 if(moved.companionEncounter?.pendingOpportunity)return moved;
 return finishTurn?endCompanionTurn(moved,enemyId):moved;
}
export function executeEnemyMovementTurn(campaign:Campaign,enemyId:string):Campaign{
 return executeEnemyMovement(campaign,enemyId,true);
}
/** DM explicitly declines all outstanding opportunity reactions and continues
 * the enemy's turn. No attack is silently forfeited by automated movement.
 */
export function dismissEnemyOpportunityReactions(campaign:Campaign,enemyId:string):Campaign{
 const battle=activeActor(campaign,enemyId);
 if(battle.participants[enemyId]?.actorKind!=='enemy'||battle.pendingOpportunity?.moverId!==enemyId)throw Error('No pending enemy movement reactions');
 return save(campaign,{...battle,pendingOpportunity:undefined,log:[...battle.log,'DM declined pending reactions against '+enemyId]});
}
/** Resolves the DM-supplied enemy attack from its current square, then ends
 * the turn. Movement and reactions must already be adjudicated.
 */
export function executeEnemyAttackTurn(campaign:Campaign,enemyId:string,roll:number,damageRoll:number,damageType:DamageType,secondD20?:number):Campaign{
 const battle=activeActor(campaign,enemyId),enemy=battle.participants[enemyId];
 if(enemy.actorKind!=='enemy')throw Error('Enemy actor required');
 if(battle.pendingOpportunity?.moverId===enemyId)throw Error('Pending opportunity reactions require DM adjudication');
 const plan=previewEnemyTurn(campaign,enemyId);
 if(!plan.targetId||!plan.inReach)throw Error('No hostile target within enemy reach');
 const attacked=attackCompanionWithVerifiedStats(campaign,enemyId,plan.targetId,roll,damageRoll,damageType,enemy.reachFeet??5,secondD20);
 return endCompanionTurn(attacked,enemyId);
}
/** Moves toward the selected hostile and attacks if in reach.
 * Pending opportunity reactions suspend the turn before any attack is made.
 */
export function executeEnemyMoveAndAttackTurn(campaign:Campaign,enemyId:string,roll:number,damageRoll:number,damageType:DamageType,secondD20?:number):Campaign{
 const moved=executeEnemyMovement(campaign,enemyId,false);
 if(moved.companionEncounter?.pendingOpportunity?.moverId===enemyId)return moved;
 const plan=previewEnemyTurn(moved,enemyId);
 if(!plan.targetId||!plan.inReach)return endCompanionTurn(moved,enemyId);
 return executeEnemyAttackTurn(moved,enemyId,roll,damageRoll,damageType,secondD20);
}
/** One explicit DM command for an enemy already within melee reach.
 * Movement is a separate step when distance or reaction decisions matter.
 */
export function executeEnemyMeleeTurn(campaign:Campaign,enemyId:string,roll:number,damageRoll:number,damageType:DamageType,secondD20?:number):Campaign{
 return executeEnemyAttackTurn(campaign,enemyId,roll,damageRoll,damageType,secondD20);
}
export function setCompanionTactics(campaign:Campaign,actorId:string,faction:string,reachFeet:number):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||!faction.trim()||faction.length>40||!Number.isInteger(reachFeet)||reachFeet<5||reachFeet>30||reachFeet%5!==0)throw Error('Invalid actor faction or reach');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,faction:faction.trim(),reachFeet}},log:[...battle.log,actorId+' faction/reach configured']});
}
const INCAPACITATING:CompanionCondition[]=['Incapacitated','Paralyzed','Stunned','Unconscious'];
const IMMOBILE:CompanionCondition[]=['Grappled','Restrained','Paralyzed','Petrified','Stunned','Unconscious'];
function cannotAct(actor:CompanionEncounter['participants'][string]):boolean{return actor.conditions.some(c=>INCAPACITATING.includes(c))}
/** Deterministic condition effects supported without inventing rolls or monster features. */
/** Explicit saving throw outcome; the caller provides roll totals and any modifiers.
 * Restrained imposes disadvantage on Dexterity saves; incapacitating conditions
 * can automatically fail Strength and Dexterity saves.
 */
export function resolveCompanionSavingThrow(campaign:Campaign,actorId:string,ability:'Strength'|'Dexterity'|'Constitution'|'Intelligence'|'Wisdom'|'Charisma',rollTotal:number,dc:number,secondTotal?:number):{campaign:Campaign;success:boolean;effectiveTotal:number|null}{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||![rollTotal,dc].every(Number.isInteger)||rollTotal<0||rollTotal>100||dc<1||dc>40||secondTotal!==undefined&&(!Number.isInteger(secondTotal)||secondTotal<0||secondTotal>100))throw Error('Invalid saving throw');
 const autoFail=(ability==='Strength'||ability==='Dexterity')&&actor.conditions.some(c=>['Paralyzed','Stunned','Unconscious'].includes(c));
 const disadvantage=ability==='Dexterity'&&actor.conditions.includes('Restrained');
 if(disadvantage&&secondTotal===undefined)throw Error('Restrained Dexterity save requires second total');
 const total=autoFail?null:disadvantage?Math.min(rollTotal,secondTotal!):rollTotal;
 const success=total!==null&&total>=dc;
 return {campaign:save(campaign,{...battle,log:[...battle.log,actorId+' '+ability+' save vs DC '+dc+': '+(autoFail?'automatic failure':(success?'success':'failure')+' ('+total+')')]}),success,effectiveTotal:total};
}
export function companionConditionEffects(campaign:Campaign,actorId:string){
 const actor=encounter(campaign).participants[actorId];
 if(!actor)throw Error('Unknown actor');
 return {canAct:actor.hp>0&&!cannotAct(actor),canMove:actor.hp>0&&!actor.conditions.some(c=>IMMOBILE.includes(c)),attackDisadvantage:actor.conditions.includes('Poisoned')||actor.conditions.includes('Blinded')||actor.conditions.includes('Restrained'),attacksAgainstAdvantage:actor.conditions.some(c=>['Paralyzed','Stunned','Unconscious','Restrained','Blinded'].includes(c)),strengthDexSaveDisadvantage:actor.conditions.includes('Restrained'),automaticStrengthDexSaveFailure:actor.conditions.some(c=>['Paralyzed','Stunned','Unconscious'].includes(c))};
}
/** Standing from Prone costs half speed (rounded down to 5-foot grid units).
 * It is unavailable at speed zero or while another condition prevents movement.
 */
export function standCompanionFromProne(campaign:Campaign,actorId:string):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(!actor.conditions.includes('Prone'))throw Error('Actor is not prone');
 if(actor.hp<=0||actor.conditions.some(c=>IMMOBILE.includes(c))||actor.speedFeet===0)throw Error('Condition prevents standing');
 const cost=Math.floor(actor.speedFeet/10)*5;
 if(actor.speedFeet+actor.dashFeet-actor.movementSpentFeet<cost)throw Error('Insufficient movement to stand');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,conditions:actor.conditions.filter(c=>c!=='Prone'),movementSpentFeet:actor.movementSpentFeet+cost}},log:[...battle.log,actorId+' stood from Prone using '+cost+' ft of movement']});
}
export function moveCompanion(campaign:Campaign,actorId:string,x:number,y:number):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(actor.hp<=0)throw Error('Actor at zero HP cannot move');
 if(actor.conditions.some(c=>IMMOBILE.includes(c)))throw Error('Condition prevents movement');
 if(!valid({x,y}))throw Error('Destination outside 20×20 arena');
 if(Object.entries(battle.participants).some(([id,p])=>id!==actorId&&p.hp>0&&p.x===x&&p.y===y))throw Error('Square occupied');
 const route=pathRoute(battle,actor,{x,y},actorId);
 const steps=route.length-1;
 const candidates=[...new Set(route.slice(1).flatMap((step,i)=>companionOpportunityCandidates(battle,actorId,route[i],step)))];
 const movementCost=steps*5*(actor.conditions.includes('Prone')?2:1);
 if(movementCost>actor.speedFeet+actor.dashFeet-actor.movementSpentFeet)throw Error('Move exceeds remaining movement');
 if(Object.entries(battle.participants).some(([id,p])=>id!==actorId&&p.hp>0&&p.x===x&&p.y===y))throw Error('Square occupied');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,x,y,movementSpentFeet:actor.movementSpentFeet+movementCost}},pendingOpportunity:candidates.length?{moverId:actorId,attackerIds:candidates,from:{x:actor.x,y:actor.y},to:{x,y}}:undefined,log:[...battle.log,actorId+' moved to '+x+','+y+(candidates.length?' · potential opportunity attackers: '+candidates.join(', '):'')]});
}
export function endCompanionTurn(campaign:Campaign,actorId:string):Campaign{
 const battle=activeActor(campaign,actorId);
 if(battle.pendingOpportunity?.moverId===actorId&&battle.pendingOpportunity.attackerIds.length)throw Error('Pending opportunity reactions require DM adjudication');
 const next=(battle.turnIndex+1)%battle.order.length;
 const nextId=battle.order[next];const outgoing=battle.participants[actorId];const participants={...battle.participants,[actorId]:{...outgoing,disengaged:false}};participants[nextId]={...participants[nextId],movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false,reactionUsed:false};return save(campaign,{...battle,participants,turnIndex:next,round:battle.round+(next===0?1:0),log:[...battle.log,actorId+' ended turn']});
}
/** 2024 death saves are tracked independently of campaign.character and legacy combat.
 * Natural 20 restores 1 HP; natural 1 causes two failures; other rolls use DC 10.
 */
/** Zero-HP damage follows 2024 death-save failures and massive-damage rules.
 * Damage totals are DM-rolled; a critical hit at zero HP causes two failed saves.
 */
function damagedActor(actor:CompanionEncounter['participants'][string],taken:number,critical=false):CompanionEncounter['participants'][string]{
 const hp=Math.max(0,actor.hp-taken);
 if(hp>0||actor.actorKind==='enemy')return {...actor,hp,concentratingOn:hp===0?undefined:actor.concentratingOn};
 const previous=actor.deathSaves;
 const excess=Math.max(0,taken-actor.hp);
 const instantDeath=taken>0&&excess>=actor.maxHp;
 const failures=Math.min(3,(previous?.failures??0)+(actor.hp===0&&taken>0?(critical?2:1):0));
 const dead=previous?.dead===true||instantDeath||failures>=3;
 return {...actor,hp,concentratingOn:undefined,conditions:[...new Set([...actor.conditions,'Unconscious' as const])],deathSaves:{successes:previous?.successes??0,failures,stable:!dead&&taken===0&&(previous?.stable??false),dead}};
}
export function resolveCompanionDeathSave(campaign:Campaign,actorId:string,roll:number):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(!Number.isInteger(roll)||roll<1||roll>20||actor.hp!==0||actor.actorKind==='enemy')throw Error('Death saving throw unavailable');
 const current=actor.deathSaves??{successes:0,failures:0,stable:false,dead:false};
 if(current.stable||current.dead)throw Error('Death saves already resolved');
 let successes=current.successes,failures=current.failures,hp=0,stable=false,dead=false;
 if(roll===20){hp=1;successes=0;failures=0;}
 else {if(roll===1)failures+=2;else if(roll>=10)successes++;else failures++;stable=successes>=3;dead=failures>=3;}
 const deathSaves={successes:Math.min(3,successes),failures:Math.min(3,failures),stable,dead};
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,hp,deathSaves:hp>0?undefined:deathSaves,conditions:hp>0?actor.conditions.filter(c=>c!=='Unconscious'):actor.conditions}},log:[...battle.log,actorId+' death save '+roll+': '+(hp>0?'regained 1 HP':dead?'dead':stable?'stable':deathSaves.successes+' successes, '+deathSaves.failures+' failures')]});
}
/** DM-recorded healing resets death saves on regaining HP, never writes to legacy combat. */
/** 2024 stabilize: a creature at zero HP becomes stable without healing.
 * Damage breaks stability; healing restores consciousness as normal.
 */
export function stabilizeCompanion(campaign:Campaign,actorId:string):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||actor.actorKind==='enemy'||actor.hp!==0||actor.deathSaves?.dead)throw Error('Cannot stabilize this actor');
 if(actor.deathSaves?.stable)throw Error('Actor is already stable');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,deathSaves:{successes:0,failures:0,stable:true,dead:false},conditions:[...new Set([...actor.conditions,'Unconscious' as const])]}},log:[...battle.log,actorId+' stabilized at 0 HP']});
}
/** A stable creature can regain 1 HP after 1d4 hours; the DM supplies the
 * elapsed hours and actual 1d4 result rather than an invented roll.
 */
export function recoverStableCompanion(campaign:Campaign,actorId:string,elapsedHours:number,recoveryD4:number):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||actor.hp!==0||!actor.deathSaves?.stable||actor.deathSaves.dead||!Number.isInteger(recoveryD4)||recoveryD4<1||recoveryD4>4||!Number.isFinite(elapsedHours)||elapsedHours<recoveryD4)throw Error('Stable recovery requirements not met');
 return healCompanion(campaign,actorId,1);
}
export function healCompanion(campaign:Campaign,actorId:string,amount:number):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||!Number.isInteger(amount)||amount<1||amount>1000||actor.deathSaves?.dead)throw Error('Invalid healing');
 const hp=Math.min(actor.maxHp,actor.hp+amount);
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,hp,deathSaves:hp>0?undefined:actor.deathSaves,conditions:hp>0?actor.conditions.filter(c=>c!=='Unconscious'):actor.conditions}},log:[...battle.log,actorId+' healed '+(hp-actor.hp)+' HP']});
}
export function damageCompanion(campaign:Campaign,targetId:string,amount:number,type:DamageType):Campaign{
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor||!Number.isInteger(amount)||amount<0||amount>1000)throw Error('Invalid damage target or amount');
 const taken=(targetId==='nighthawk'&&battle.mode==='unified')||actor.actorKind==='enemy'?amount:adjudicateSubclassActorDamage(campaign,targetId,amount,type);
 const hp=Math.max(0,actor.hp-taken);

 const updated=damagedActor(actor,taken);
 const concentrationNote=actor.concentratingOn&&taken>0?' Concentration save required (DC '+companionConcentrationSaveDC(taken)+')'+(hp===0?'; concentration ends at 0 HP':''):'';
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:updated},log:[...battle.log,targetId+' took '+taken+' '+type+' damage'+(taken!==amount?' (resisted)':'')+concentrationNote]});
}
export function conditionCompanion(campaign:Campaign,targetId:string,condition:'Charmed'|'Poisoned',auraSourceId?:string):Campaign{
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor)throw Error('Unknown target');
 const aura=auraSourceId?battle.participants[auraSourceId]:undefined;
 const source=auraSourceId?campaign.subclassActors?.[auraSourceId]:undefined;
 const auraActive=!!source&&source.subclassId==='paladin-devotion'&&source.level>=7&&!!aura&&aura.hp>0;
 const withinDevotionAura=auraActive&&Math.max(Math.abs(aura!.x-actor.x),Math.abs(aura!.y-actor.y))<=2;
 const ownAura=campaign.subclassActors?.[targetId]?.subclassId==='paladin-devotion'&&campaign.subclassActors[targetId].level>=7&&actor.hp>0;
 const permitted=!(condition==='Charmed'&&(withinDevotionAura||ownAura))&&((targetId==='nighthawk'&&battle.mode==='unified')||actor.actorKind==='enemy'?true:adjudicateSubclassActorCondition(campaign,targetId,condition,{auraActive:ownAura,withinDevotionAura:ownAura}));
 if(!permitted)return save(campaign,{...battle,log:[...battle.log,targetId+' is immune to '+condition]});
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,conditions:[...new Set([...actor.conditions,condition])]}},log:[...battle.log,targetId+' gained '+condition]});
}
/** Explicitly reconcile Nighthawk encounter HP to the character sheet.
 * This is opt-in to prevent overwriting changes made by the legacy combat prototype.
 */
/** Explicit refresh of verified character speed and maximum HP.
 * Never overwrites encounter damage, action economy or legacy Nighthawk combat.
 */
export function refreshNighthawkEncounterStatistics(campaign:Campaign):Campaign{
 const battle=encounter(campaign),actor=battle.participants.nighthawk,character=campaign.character;
 if(battle.mode!=='unified'||!actor||!character)throw Error('Unified Nighthawk encounter required');
 const speed=character.speed,maxHp=character.maxHitPoints;
 if(!Number.isInteger(speed)||speed!<0||speed!>120||speed!%5!==0||!Number.isInteger(maxHp)||maxHp!<1||maxHp!>500)throw Error('Invalid verified character statistics');
 if(actor.hp>maxHp!)throw Error('Encounter HP exceeds updated character maximum; reconcile manually');
 return save(campaign,{...battle,participants:{...battle.participants,nighthawk:{...actor,speedFeet:speed!,maxHp:maxHp!}},log:[...battle.log,'Nighthawk refreshed verified speed and maximum HP from character sheet']});
}
export function synchronizeNighthawkHitPoints(campaign:Campaign):Campaign{
 const battle=encounter(campaign),actor=battle.participants.nighthawk;
 if(battle.mode!=='unified'||!actor||!campaign.character)throw Error('No unified Nighthawk to synchronize');
 if(!Number.isInteger(actor.hp)||actor.hp<0||actor.hp>actor.maxHp)throw Error('Invalid encounter hit points');
 if(battle.nighthawkSheetHpSnapshot!==undefined&&campaign.character.currentHitPoints!==undefined&&campaign.character.currentHitPoints!==battle.nighthawkSheetHpSnapshot)throw Error('Character-sheet HP changed since encounter snapshot; reconcile manually');
 return {...campaign,character:{...campaign.character,currentHitPoints:actor.hp},companionEncounter:{...battle,nighthawkSheetHpSnapshot:actor.hp,log:[...battle.log,'Nighthawk HP synchronized to character sheet']},updatedAt:new Date().toISOString()};
}
/** Manually recorded reactions are actor-scoped; the DM adjudicates triggers and effects. */
export function recordCompanionReaction(campaign:Campaign,actorId:string,description:string):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||actor.hp<=0)throw Error('Invalid reaction actor');
 if(actor.reactionUsed)throw Error('Reaction already used');
 if(!description.trim()||description.length>160)throw Error('Reaction requires a short DM description');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,reactionUsed:true}},log:[...battle.log,actorId+' reaction: '+description.trim()+' (DM adjudicated)']});
}
export type CompanionCondition=CompanionEncounter['participants'][string]['conditions'][number];
/** DM-confirmed condition assignment; automatic immunity is enforced for existing Charmed/Poisoned rules. */
export function applyCompanionCondition(campaign:Campaign,targetId:string,condition:CompanionCondition):Campaign{
 if(condition==='Charmed'||condition==='Poisoned')return conditionCompanion(campaign,targetId,condition);
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor)throw Error('Unknown condition target');
 const conditions=[...new Set([...actor.conditions,condition])];
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,conditions,concentratingOn:condition==='Incapacitated'||condition==='Unconscious'||condition==='Stunned'||condition==='Paralyzed'?undefined:actor.concentratingOn}},log:[...battle.log,targetId+' gained '+condition+' (DM adjudicated)']});
}
export function removeCompanionCondition(campaign:Campaign,targetId:string,condition:CompanionCondition):Campaign{
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
/** Display authoritative catalog weapon and armor references only when recorded in campaign inventory.
 * A carried weapon is not necessarily equipped; no attack proficiency or AC is inferred.
 */
/** Equip only items verified as owned in the campaign and present in the builder catalog.
 * Never assumes a carried weapon is equipped; legacy character AC remains authoritative.
 */
export function setNighthawkEncounterLoadout(campaign:Campaign,slot:'weaponId'|'armorId'|'shieldId',itemId:string):Campaign{
 const battle=encounter(campaign);
 if(battle.mode!=='unified'||!battle.participants.nighthawk)throw Error('Unified Nighthawk encounter required');
 const item=ITEMS.find(entry=>entry.id===itemId);
 const category=slot==='weaponId'?'weapon':slot==='armorId'?'armor':'shield';
 if(!item||item.category!==category)throw Error('Invalid equipment category');
 const owned=(campaign.inventoryLedger?.gear??[]).some(entry=>entry.name.toLowerCase()===item.name.toLowerCase()&&entry.quantity>0)||(item.id==='dagger'&&(campaign.equipment?.daggers??0)>0);
 if(!owned)throw Error('Item is not verified in campaign inventory');
 return {...save(campaign,{...battle,log:[...battle.log,'Nighthawk equipped verified '+item.name+' for encounter reference']}),encounterLoadout:{...campaign.encounterLoadout,[slot]:itemId}};
}
/** Derived only from a verified equipped item and the Rogue character sheet.
 * Dice are never rolled here. Rogue weapon proficiency follows the builder's catalog.
 */
export function nighthawkEquippedAttack(campaign:Campaign){
 const character=campaign.character, id=campaign.encounterLoadout?.weaponId;
 const item=ITEMS.find(entry=>entry.id===id&&entry.category==='weapon');
 if(!character||!item||!item.damage)return null;
 const owned=(campaign.inventoryLedger?.gear??[]).some(entry=>entry.quantity>0&&entry.name.toLowerCase()===item.name.toLowerCase())||(item.id==='dagger'&&(campaign.equipment?.daggers??0)>0);
 if(!owned)return null;
 const finesse=item.properties?.includes('Finesse');
 const ranged=item.properties?.some(p=>p==='Ammunition'||p.startsWith('Range '))||['shortbow','longbow','light-crossbow','heavy-crossbow','hand-crossbow'].includes(item.id);
 const dex=abilityModifier(character.scores.dex),str=abilityModifier(character.scores.str);
 const abilityModifierUsed=ranged?dex:finesse?Math.max(str,dex):str;
 // Only the Rogue's explicitly verified simple, finesse and light proficiencies.
 const trained=item.weaponGroup==='simple'||!!item.properties?.some(p=>p==='Finesse'||p==='Light');
 return {weaponId:item.id,name:item.name,damageDice:item.damage,attackModifier:abilityModifierUsed+(trained?character.proficiencyBonus:0),damageModifier:abilityModifierUsed,proficient:trained,ability:ranged?'Dexterity':finesse&&dex>=str?'Dexterity':'Strength'};
}
/** Armor class is computed from explicitly equipped, owned and catalogued gear.
 * If no verified armor is equipped, preserve the character sheet AC as the source.
 */
export function nighthawkEquippedDefense(campaign:Campaign){
 const character=campaign.character;
 if(!character)return null;
 const armor=ITEMS.find(item=>item.id===campaign.encounterLoadout?.armorId&&item.category==='armor');
 const shield=ITEMS.find(item=>item.id===campaign.encounterLoadout?.shieldId&&item.category==='shield');
 const owned=(name:string)=>(campaign.inventoryLedger?.gear??[]).some(g=>g.quantity>0&&g.name.toLowerCase()===name.toLowerCase());
 const validArmor=armor&&owned(armor.name)?armor:null;
 const validShield=shield&&owned(shield.name)?shield:null;
 if(!validArmor)return {armorClass:character.armorClass??null,source:'character-sheet' as const};
 const dex=abilityModifier(character.scores.dex);
 const armorClass=validArmor.baseAC!+(validArmor.armorGroup==='Heavy'?0:Math.min(dex,validArmor.dexCap??99))+(validShield?2:0);
 return {armorClass,source:'verified-loadout' as const};
}
export function nighthawkEquipmentReferences(campaign:Campaign){
 const names=new Set((campaign.inventoryLedger?.gear??[]).filter(g=>g.quantity>0).map(g=>g.name.toLowerCase()));
 if((campaign.equipment?.daggers??0)>0)names.add('dagger');
 return {armorClass:campaign.character?.armorClass??null,items:ITEMS.filter(item=>(item.category==='weapon'||item.category==='armor'||item.category==='shield')&&names.has(item.name.toLowerCase())).map(item=>({id:item.id,name:item.name,category:item.category,damage:item.damage??null,properties:item.properties??[],baseAC:item.baseAC??null})),equippedWeapon:campaign.encounterLoadout?.weaponId??null,equippedArmor:campaign.encounterLoadout?.armorId??null,equippedShield:campaign.encounterLoadout?.shieldId??null};
}
export function nighthawkEncounterInventory(campaign:Campaign){
 const gear=(campaign.inventoryLedger?.gear??[]).filter(item=>Number.isInteger(item.quantity)&&item.quantity>=0).map(item=>({name:item.name,quantity:item.quantity}));
 return {gear,ammunition:{arrows:campaign.equipment?.arrows??null},weapons:{daggers:campaign.equipment?.daggers??null},supplies:{caltrops:campaign.equipment?.caltrops??null,ballBearings:campaign.equipment?.ballBearings??null},authoritativeSource:'campaign' as const};
}
/** Explicit campaign-authoritative inventory expenditure. Never touches prototype combat.
 * This records consumption only; any attack or item action must be adjudicated separately.
 */
export function spendUnifiedNighthawkInventory(campaign:Campaign,item:string,quantity=1):Campaign{
 const battle=encounter(campaign);
 if(battle.mode!=='unified'||!battle.participants.nighthawk)throw Error('Unified Nighthawk encounter required');
 if(!Number.isInteger(quantity)||quantity<1||quantity>100||!item.trim())throw Error('Invalid inventory expenditure');
 const name=item.trim();
 const equipmentKey=({arrows:'arrows',daggers:'daggers',caltrops:'caltrops',ballBearings:'ballBearings'} as Record<string,'arrows'|'daggers'|'caltrops'|'ballBearings'>)[name];
 if(equipmentKey){
  const available=campaign.equipment?.[equipmentKey];
  if(available===undefined||available<quantity)throw Error('Insufficient campaign equipment');
  return {...save(campaign,{...battle,log:[...battle.log,'Nighthawk spent '+quantity+' '+name+' from campaign equipment']}),equipment:{...campaign.equipment!,[equipmentKey]:available-quantity}};
 }
 const gear=campaign.inventoryLedger?.gear;
 const index=gear?.findIndex(entry=>entry.name===name);
 if(index===undefined||index<0||!gear||gear[index].quantity<quantity)throw Error('Insufficient campaign inventory');
 return {...save(campaign,{...battle,log:[...battle.log,'Nighthawk spent '+quantity+' '+name+' from campaign inventory']}),inventoryLedger:{...campaign.inventoryLedger!,gear:gear.map((entry,i)=>i===index?{...entry,quantity:entry.quantity-quantity}:entry)}};
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
 if(!attacker||!target||attackerId===targetId||attacker.hp<=0||target.hp<=0||attacker.reactionUsed||cannotAct(attacker))throw Error('Opportunity reaction unavailable');
 if(!Number.isInteger(roll)||roll<1||roll>20||![modifier,targetAC,damage,damageModifier].every(Number.isInteger)||targetAC<1||damage<0)throw Error('Invalid opportunity attack adjudication');
 if(target.disengaged)throw Error('Disengage prevents opportunity attack');
 if(battle.pendingOpportunity&&(!battle.pendingOpportunity.attackerIds.includes(attackerId)||battle.pendingOpportunity.moverId!==targetId))throw Error('Attacker not in pending opportunity candidates');
 if(!companionLineOfSight(battle,attacker,target)&&!battle.pendingOpportunity)throw Error('Opportunity target not visible');
 const hit=roll===20||(roll!==1&&roll+modifier>=targetAC);
 const raw=hit?Math.max(0,damage+damageModifier):0;
 const taken=(targetId==='nighthawk'&&battle.mode==='unified')||target.actorKind==='enemy'?raw:adjudicateSubclassActorDamage(campaign,targetId,raw,damageType);
 return save(campaign,{...battle,pendingOpportunity:battle.pendingOpportunity&&battle.pendingOpportunity.attackerIds.some(id=>id!==attackerId)?{...battle.pendingOpportunity,attackerIds:battle.pendingOpportunity.attackerIds.filter(id=>id!==attackerId)}:undefined,participants:{...battle.participants,[attackerId]:{...attacker,reactionUsed:true},[targetId]:damagedActor(target,taken)},log:[...battle.log,attackerId+' opportunity attack vs '+targetId+': '+(hit?'hit for '+taken:'miss')+' (DM verified reach trigger)']});
}
export function finishCompanionEncounter(campaign:Campaign):Campaign{
 const battle=encounter(campaign);
 return save(campaign,{...battle,status:'completed',log:[...battle.log,'Companion encounter completed']});
}

/** Manual d20 and damage dice inputs; no automatic attack modifiers or dice invented. */
export function attackCompanion(campaign:Campaign,attackerId:string,targetId:string,roll:number,attackModifier:number,targetAC:number,damageRoll:number,damageModifier:number,damageType:DamageType,rangeFeet?:number,secondD20?:number):Campaign{
 const battle=activeActor(campaign,attackerId);
 const attacker=battle.participants[attackerId],target=battle.participants[targetId];
 if(!target||attackerId===targetId||attacker.hp<=0||(target.hp<=0&&(!target.conditions.includes('Unconscious')||target.deathSaves?.dead)))throw Error('Invalid attacker or target');
 if(attacker.actionUsed)throw Error('Action already used this turn');
 if(cannotAct(attacker))throw Error('Condition prevents action');
 if((battle.cover??[]).some(p=>p.x===target.x&&p.y===target.y))throw Error('Target has annotated cover: DM must supply adjusted AC and clear cover annotation before attack');
 if(!companionLineOfSight(battle,attacker,target))throw Error('Line of sight blocked by map obstacle');
 const distanceFeet=Math.max(Math.abs(attacker.x-target.x),Math.abs(attacker.y-target.y))*5;
 const attackAdvantage=attacker.conditions.includes('Invisible')||target.conditions.some(c=>['Blinded','Paralyzed','Restrained','Stunned','Unconscious'].includes(c))||(target.conditions.includes('Prone')&&distanceFeet<=5);
 const attackDisadvantage=target.dodging||target.conditions.includes('Invisible')||attacker.conditions.some(c=>['Poisoned','Blinded','Restrained'].includes(c))||(target.conditions.includes('Prone')&&distanceFeet>5);
 if(attackAdvantage!==attackDisadvantage&&secondD20===undefined)throw Error(target.dodging?'Dodge requires a second d20 for disadvantage':'Advantage or disadvantage requires a second d20');
 if(secondD20!==undefined&&(!Number.isInteger(secondD20)||secondD20<1||secondD20>20))throw Error('Invalid second d20');
 if(rangeFeet!==undefined){if(!Number.isInteger(rangeFeet)||rangeFeet<5||rangeFeet>1000||rangeFeet%5!==0)throw Error('Invalid attack range');const distance=Math.max(Math.abs(attacker.x-target.x),Math.abs(attacker.y-target.y))*5;if(distance>rangeFeet)throw Error('Target outside declared attack range');}
 if(!Number.isInteger(roll)||roll<1||roll>20||!Number.isInteger(attackModifier)||attackModifier< -20||attackModifier>30||!Number.isInteger(targetAC)||targetAC<1||targetAC>40||!Number.isInteger(damageRoll)||damageRoll<0||damageRoll>1000||!Number.isInteger(damageModifier)||damageModifier< -20||damageModifier>30)throw Error('Invalid attack inputs');
 const effectiveRoll=attackAdvantage&&attackDisadvantage?roll:attackDisadvantage?Math.min(roll,secondD20!):attackAdvantage?Math.max(roll,secondD20!):roll;
 const critical=effectiveRoll===20;
 const hit=critical||(effectiveRoll!==1&&effectiveRoll+attackModifier>=targetAC);
 const criticalHit=hit&&(critical||(target.conditions.includes('Unconscious')&&distanceFeet<=5));
 const used={...attacker,actionUsed:true};
 const participants={...battle.participants,[attackerId]:used};
 let dealt=0;
 if(hit){
  // Caller supplies total rolled damage dice, including doubled dice on a critical hit.
  const raw=Math.max(0,damageRoll+damageModifier);
  dealt=(targetId==='nighthawk'&&battle.mode==='unified')||target.actorKind==='enemy'?raw:adjudicateSubclassActorDamage(campaign,targetId,raw,damageType);
  participants[targetId]=damagedActor(target,dealt,criticalHit);
 }
 return save(campaign,{...battle,participants,log:[...battle.log,attackerId+' attack d20 '+effectiveRoll+(target.dodging?' (Dodge disadvantage)':'')+(criticalHit?' critical hit':hit?' hit':' miss')+' vs '+targetId+' AC '+targetAC+(hit?'; '+dealt+' '+damageType+' damage':'')]});
}
export function setCompanionSpeed(campaign:Campaign,actorId:string,speedFeet:number):Campaign{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor||!Number.isInteger(speedFeet)||speedFeet<0||speedFeet>120||speedFeet%5!==0)throw Error('Invalid speed');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,speedFeet}},log:[...battle.log,actorId+' speed set to '+speedFeet+' ft (manual character statistic)']});
}

/** Explicit 2024 action choices; only effects we can enforce are automated. */
/** Uses authoritative combat modifiers/AC for verified equipped Nighthawk or DM-stat enemies.
 * Damage dice are still supplied explicitly; attack actions remain subject to the usual rules.
 */
export function attackCompanionWithVerifiedStats(campaign:Campaign,attackerId:string,targetId:string,roll:number,damageRoll:number,damageType:DamageType,rangeFeet?:number,secondD20?:number):Campaign{
 const battle=encounter(campaign),attacker=battle.participants[attackerId],target=battle.participants[targetId];
 if(!attacker||!target)throw Error('Unknown attack participant');
 const equipped=attackerId==='nighthawk'&&battle.mode==='unified'?nighthawkEquippedAttack(campaign):null;
 const attackModifier=equipped?.attackModifier??(attacker.actorKind==='enemy'?attacker.attackModifier:undefined);
 const damageModifier=equipped?.damageModifier??(attacker.actorKind==='enemy'?attacker.damageModifier??0:undefined);
 const targetAC=targetId==='nighthawk'&&battle.mode==='unified'?nighthawkEquippedDefense(campaign)?.armorClass:target.armorClass;
 if(attackModifier===undefined||damageModifier===undefined||targetAC===undefined||targetAC===null)throw Error('Verified attack or defense statistics unavailable');
 const weapon=equipped?ITEMS.find(item=>item.id===equipped.weaponId):undefined;
 const ammunitionWeapon=!!weapon?.properties?.some(p=>p.startsWith('Ammunition'));
 const ammoName=equipped?.weaponId==='shortbow'||equipped?.weaponId==='longbow'?'Arrows':
  ['light-crossbow','heavy-crossbow','hand-crossbow'].includes(equipped?.weaponId??'')?'Crossbow Bolts':
  equipped?.weaponId==='sling'?'Sling Bullets':null;
 if(ammunitionWeapon&&!ammoName)throw Error('Equipped ammunition weapon has no verified ammunition mapping');
 const ammoKey=ammoName==='Arrows'?'arrows':null;
 const equipmentAvailable=ammoKey?(campaign.equipment?.arrows??0):0;
 const ledgerAvailable=ammoName?(campaign.inventoryLedger?.gear.find(g=>g.name===ammoName)?.quantity??0):0;
 if(ammoName&&equipmentAvailable+ledgerAvailable<1)throw Error('Insufficient campaign ammunition');
 const result=attackCompanion(campaign,attackerId,targetId,roll,attackModifier,targetAC,damageRoll,damageModifier,damageType,rangeFeet,secondD20);
 if(!ammoName)return result;
 const source=equipmentAvailable>0?'arrows':ammoName;
 const spent=spendUnifiedNighthawkInventory(result,source,1);
 const current=spent.companionEncounter!;
 return save(spent,{...current,ammunitionPendingRecovery:{...current.ammunitionPendingRecovery,[source]:(current.ammunitionPendingRecovery?.[source]??0)+1},log:[...current.log,'Spent '+source+' awaiting DM ammunition reconciliation']});
}
/** Reconcile DM-confirmed recoverable ammunition. Never restores more
 * than the quantity expended by verified attacks in this encounter.
 */
export function recoverEncounterAmmunition(campaign:Campaign,item:string,quantity:number):Campaign{
 const battle=encounter(campaign);
 if(battle.mode!=='unified'||!Number.isInteger(quantity)||quantity<1||quantity>(battle.ammunitionPendingRecovery?.[item]??0))throw Error('Invalid ammunition recovery');
 const updated=save(campaign,{...battle,ammunitionPendingRecovery:{...battle.ammunitionPendingRecovery,[item]:battle.ammunitionPendingRecovery![item]-quantity},log:[...battle.log,'DM recovered '+quantity+' '+item]});
 if(item==='arrows'){
  if(!updated.equipment)throw Error('Missing arrow inventory');
  return {...updated,equipment:{...updated.equipment,arrows:updated.equipment.arrows+quantity}};
 }
 const ledger=updated.inventoryLedger;
 if(!ledger)throw Error('Missing ammunition inventory ledger');
 const index=ledger.gear.findIndex(g=>g.name===item);
 const gear=[...ledger.gear];
 if(index>=0)gear[index]={...gear[index],quantity:gear[index].quantity+quantity};
 else gear.push({name:item,quantity});
 return {...updated,inventoryLedger:{...ledger,gear}};
}
/** An explicitly declared thrown attack removes the verified weapon from inventory.
 * Ordinary melee attacks do not spend a weapon; recovered weapons must be
 * returned through a separate DM inventory action.
 */
export function attackWithThrownEquippedWeapon(campaign:Campaign,attackerId:string,targetId:string,roll:number,damageRoll:number,damageType:DamageType,rangeFeet:number,secondD20?:number):Campaign{
 const equipped=attackerId==='nighthawk'?nighthawkEquippedAttack(campaign):null;
 const weapon=equipped?ITEMS.find(item=>item.id===equipped.weaponId):undefined;
 if(!weapon?.properties?.some(p=>p.startsWith('Thrown ')))throw Error('Verified equipped thrown weapon required');
 const [normal,maximum]=(weapon.properties.find(p=>p.startsWith('Thrown '))?.replace('Thrown ','').split('/').map(Number)??[]);
 if(!Number.isInteger(rangeFeet)||rangeFeet<5||rangeFeet>maximum||rangeFeet>normal)throw Error('Thrown weapon range requires DM disadvantage adjudication');
 const available=(weapon.id==='dagger'?campaign.equipment?.daggers??0:0)+(campaign.inventoryLedger?.gear.find(g=>g.name===weapon.name)?.quantity??0);
 if(available<1)throw Error('Insufficient thrown weapons');
 const resolved=attackCompanionWithVerifiedStats(campaign,attackerId,targetId,roll,damageRoll,damageType,rangeFeet,secondD20);
 const source=weapon.id==='dagger'&&(campaign.equipment?.daggers??0)>0?'daggers':weapon.name;
 const spent=spendUnifiedNighthawkInventory(resolved,source,1);
 const current=spent.companionEncounter!;
 return save(spent,{...current,thrownWeaponsPendingRecovery:{...current.thrownWeaponsPendingRecovery,[source]:(current.thrownWeaponsPendingRecovery?.[source]??0)+1},log:[...current.log,'Thrown '+source+' awaiting DM recovery']});
}
/** Return only thrown weapons explicitly recorded as expended in this encounter.
 * The DM confirms how many were actually recovered; unrecovered items remain spent.
 */
export function recoverEncounterThrownWeapons(campaign:Campaign,item:string,quantity:number):Campaign{
 const battle=encounter(campaign);
 if(battle.mode!=='unified'||!Number.isInteger(quantity)||quantity<1||quantity>(battle.thrownWeaponsPendingRecovery?.[item]??0))throw Error('Invalid thrown-weapon recovery');
 const remaining=(battle.thrownWeaponsPendingRecovery?.[item]??0)-quantity;
 const updated=save(campaign,{...battle,thrownWeaponsPendingRecovery:{...battle.thrownWeaponsPendingRecovery,[item]:remaining},log:[...battle.log,'DM recovered '+quantity+' thrown '+item]});
 if(item==='daggers'){
  if(!updated.equipment)throw Error('Missing dagger inventory');
  return {...updated,equipment:{...updated.equipment,daggers:updated.equipment.daggers+quantity}};
 }
 const ledger=updated.inventoryLedger;
 if(!ledger)throw Error('Missing recovery inventory ledger');
 const index=ledger.gear.findIndex(g=>g.name===item);
 const gear=[...ledger.gear];
 if(index>=0)gear[index]={...gear[index],quantity:gear[index].quantity+quantity};
 else gear.push({name:item,quantity});
 return {...updated,inventoryLedger:{...ledger,gear}};
}
export function useCompanionAction(campaign:Campaign,actorId:string,choice:'Dash'|'Disengage'|'Dodge'|'Help'|'Search'|'Study'|'Influence'|'Ready'|'Utilize'):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(actor.actionUsed)throw Error('Action already used this turn');
 if(cannotAct(actor))throw Error('Condition prevents action');
 const updated={...actor,actionUsed:true,dashFeet:choice==='Dash'?actor.dashFeet+actor.speedFeet:actor.dashFeet,disengaged:choice==='Disengage'||actor.disengaged,dodging:choice==='Dodge'||actor.dodging};
 const note=['Help','Search','Study','Influence','Ready','Utilize'].includes(choice)?' (requires DM adjudication; no mechanical benefit assumed)':'';
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:updated},log:[...battle.log,actorId+' used '+choice+note]});
}
