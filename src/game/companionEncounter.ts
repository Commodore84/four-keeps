import type {Campaign} from './campaign';
import {adjudicateSubclassActorCondition,adjudicateSubclassActorDamage} from './campaign';
import type {DamageType} from './subclassCombatRules';

/** Isolated companion skirmish. Never mutates Campaign.combat (the Nighthawk training encounter). */
export interface CompanionEncounter {
 status:'active'|'completed';
 round:number;
 turnIndex:number;
 order:string[];
 participants:Record<string,{x:number;y:number;hp:number;maxHp:number;initiative:number;conditions:('Charmed'|'Poisoned')[]}>;
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
  participants[id]={...position,hp,maxHp:hp,initiative:roll,conditions:[]};
 }
 const order=ids.sort((a,b)=>participants[b].initiative-participants[a].initiative||a.localeCompare(b));
 return save(campaign,{status:'active',round:1,turnIndex:0,order,participants,log:['Companion encounter started.']});
}
export function moveCompanion(campaign:Campaign,actorId:string,x:number,y:number):Campaign{
 const battle=activeActor(campaign,actorId),actor=battle.participants[actorId];
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>19||y>19||Math.abs(x-actor.x)+Math.abs(y-actor.y)>6)throw Error('Move must be within six squares and the 20×20 arena');
 if(Object.entries(battle.participants).some(([id,p])=>id!==actorId&&p.hp>0&&p.x===x&&p.y===y))throw Error('Square occupied');
 return save(campaign,{...battle,participants:{...battle.participants,[actorId]:{...actor,x,y}},log:[...battle.log,actorId+' moved to '+x+','+y]});
}
export function endCompanionTurn(campaign:Campaign,actorId:string):Campaign{
 const battle=activeActor(campaign,actorId);
 const next=(battle.turnIndex+1)%battle.order.length;
 return save(campaign,{...battle,turnIndex:next,round:battle.round+(next===0?1:0),log:[...battle.log,actorId+' ended turn']});
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
 const permitted=adjudicateSubclassActorCondition(campaign,targetId,condition,{auraActive:auraActive||ownAura,withinDevotionAura:withinDevotionAura||ownAura});
 if(!permitted)return save(campaign,{...battle,log:[...battle.log,targetId+' is immune to '+condition]});
 return save(campaign,{...battle,participants:{...battle.participants,[targetId]:{...actor,conditions:[...new Set([...actor.conditions,condition])]}},log:[...battle.log,targetId+' gained '+condition]});
}
export function finishCompanionEncounter(campaign:Campaign):Campaign{
 const battle=encounter(campaign);
 return save(campaign,{...battle,status:'completed',log:[...battle.log,'Companion encounter completed']});
}
