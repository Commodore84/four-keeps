import type {Campaign} from './campaign';
import {adjudicateSubclassActorCondition,adjudicateSubclassActorDamage} from './campaign';
import type {DamageType} from './subclassCombatRules';

/** Isolated companion skirmish. Never mutates Campaign.combat (the Nighthawk training encounter). */
export interface CompanionEncounter {
 status:'active'|'completed';
 round:number;
 turnIndex:number;
 order:string[];
 participants:Record<string,{x:number;y:number;hp:number;maxHp:number;initiative:number;conditions:('Charmed'|'Poisoned')[];speedFeet:number;movementSpentFeet:number;actionUsed:boolean;bonusActionUsed:boolean;dashFeet:number;disengaged:boolean;dodging:boolean}>;
 log:string[];
}
function encounter(campaign:Campaign):CompanionEncounter{
 if(!campaign.companionEncounter||campaign.companionEncounter.status!=='active')throw Error('No active companion encounter');
 return campaign.companionEncounter;
}
function activeActor(campaign:Campaign,actorId:string):CompanionEncounter{
 const battle=encounter(campaign);
 if(battle.order[battle.turnIndex]!==actorId)throw Error('Not this actor’s turn');
 if(!campaign.subclassActors?.[actorId])throw Error('Actor is not registered');
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
  participants[id]={...position,hp,maxHp:hp,initiative:roll,conditions:[],speedFeet:30,movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false};
 }
 const order=ids.sort((a,b)=>participants[b].initiative-participants[a].initiative||a.localeCompare(b));
 return save(campaign,{status:'active',round:1,turnIndex:0,order,participants,obstacles:[],log:['Companion encounter started.']});
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
export function companionOpportunityAttackEligible(campaign:Campaign,actorId:string):boolean{
 const battle=encounter(campaign),actor=battle.participants[actorId];
 if(!actor)throw Error('Unknown actor');
 return !actor.disengaged;
}
export function moveCompanion(campaign:Campaign,actorId:string,x:number,y:number):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(!valid({x,y}))throw Error('Destination outside 20×20 arena');
 const steps=pathSteps(battle,actor,{x,y},actorId);
 if(steps*5>actor.speedFeet+actor.dashFeet-actor.movementSpentFeet)throw Error('Move exceeds remaining movement');
 if(Object.entries(battle.participants).some(([id,p])=>id!==actorId&&p.hp>0&&p.x===x&&p.y===y))throw Error('Square occupied');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,x,y,movementSpentFeet:actor.movementSpentFeet+steps*5}},log:[...battle.log,actorId+' moved to '+x+','+y]});
}
export function endCompanionTurn(campaign:Campaign,actorId:string):Campaign{
 const battle=activeActor(campaign,actorId);
 const next=(battle.turnIndex+1)%battle.order.length;
 const nextId=battle.order[next];const participant=battle.participants[nextId];return save(campaign,{...battle,participants:{...battle.participants,[nextId]:{...participant,movementSpentFeet:0,actionUsed:false,bonusActionUsed:false,dashFeet:0,disengaged:false,dodging:false}},turnIndex:next,round:battle.round+(next===0?1:0),log:[...battle.log,actorId+' ended turn']});
}
export function damageCompanion(campaign:Campaign,targetId:string,amount:number,type:DamageType):Campaign{
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor||!Number.isInteger(amount)||amount<0||amount>1000)throw Error('Invalid damage target or amount');
 const taken=adjudicateSubclassActorDamage(campaign,targetId,amount,type);
 const hp=Math.max(0,actor.hp-taken);
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,hp}},log:[...battle.log,targetId+' took '+taken+' '+type+' damage'+(taken!==amount?' (resisted)':'')]});
}
export function conditionCompanion(campaign:Campaign,targetId:string,condition:'Charmed'|'Poisoned',auraSourceId?:string):Campaign{
 const battle=encounter(campaign),actor=battle.participants[targetId];
 if(!actor)throw Error('Unknown target');
 const aura=auraSourceId?battle.participants[auraSourceId]:undefined;
 const source=auraSourceId?campaign.subclassActors?.[auraSourceId]:undefined;
 const auraActive=!!source&&source.subclassId==='paladin-devotion'&&source.level>=7&&!!aura&&aura.hp>0;
 const withinDevotionAura=auraActive&&Math.max(Math.abs(aura!.x-actor.x),Math.abs(aura!.y-actor.y))<=2;
 const ownAura=campaign.subclassActors?.[targetId]?.subclassId==='paladin-devotion'&&campaign.subclassActors[targetId].level>=7&&actor.hp>0;
 const permitted=!(condition==='Charmed'&&(withinDevotionAura||ownAura))&&adjudicateSubclassActorCondition(campaign,targetId,condition,{auraActive:ownAura,withinDevotionAura:ownAura});
 if(!permitted)return save(campaign,{...battle,log:[...battle.log,targetId+' is immune to '+condition]});
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,conditions:[...new Set([...actor.conditions,condition])]}},log:[...battle.log,targetId+' gained '+condition]});
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
  dealt=adjudicateSubclassActorDamage(campaign,targetId,raw,damageType);
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
