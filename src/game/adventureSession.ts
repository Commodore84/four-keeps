import type {CombatScenario} from './combatScenario';
import {resolveDmBattlefield} from './encounterDirector';
import type {Campaign} from './campaign';
import {startUnifiedEncounter,addCompanionEnemy} from './companionEncounter';
import {resupplyTravelingMerchant} from './merchantSupply';
import {settlementTier} from './frontierShop';
export type AdventureSite='frontier'|'crossroads'|'watchtower';
export interface AdventureSession {
 status:'exploring'|'encounter';site:AdventureSite;characterSource:'campaign-character';
 visited:AdventureSite[];interactions:{site:AdventureSite;choice:string;response:string}[];encounterActorId?:string;pendingEncounter?:{enemyName:string;actionId:string;scenario?:CombatScenario};
}
export const ADVENTURE_SITES:Record<AdventureSite,{name:string;description:string;neighbors:AdventureSite[];options:{id:string;label:string;response:string}[]}>={
 frontier:{name:'Frontier Village',description:'Lanterns glow above the village square. A general-goods shop is open beside the road; a watchkeeper studies arriving travelers.',neighbors:['crossroads'],options:[
 {id:'speak-watchkeeper',label:'Speak with the watchkeeper',response:'The watchkeeper reports travelers near the old watchtower. No threat has been confirmed.'},
 {id:'inspect-square',label:'Inspect the square',response:'Wagon tracks lead toward the crossroads, but their origin is unknown.'}]},
 crossroads:{name:'Old Crossroads',description:'Two muddy tracks meet beside a weathered marker. The eastern path leads toward a ruined watchtower.',neighbors:['frontier','watchtower'],options:[
 {id:'inspect-marker',label:'Inspect the road marker',response:'The marker points toward the watchtower. Its inscription is too worn to read.'},
 {id:'listen-road',label:'Listen for activity',response:'Wind stirs the roadside grass. Whether anyone is nearby remains uncertain.'}]},
 watchtower:{name:'Old Watchtower',description:'Broken stone walls rise above the road. The interior is not yet mapped.',neighbors:['crossroads'],options:[
 {id:'inspect-ruins',label:'Inspect the ruins',response:'Footprints cross the dust. Their age and origin remain uncertain.'},
 {id:'call-out',label:'Call into the tower',response:'Your voice echoes through the stone. There is no immediate answer.'}]}
};
/** Local starter-adventure labels; never mutate the approved regional map. */
const ANCHAMIDA_STARTER_SITES:typeof ADVENTURE_SITES={
 frontier:{...ADVENTURE_SITES.frontier,name:'Dasahi',description:'A busy street in Dasahi leads past a general-goods shop and the city watch. The player may investigate the road without leaving the city.',options:[
  {id:'speak-watchkeeper',label:'Speak with the city watchkeeper',response:'The watchkeeper mentions travelers along the road beyond Dasahi. No threat has been confirmed.'},
  {id:'inspect-square',label:'Inspect the street',response:'Wagon tracks lead toward the road outside Dasahi; their origin is unknown.'}]},
 crossroads:{...ADVENTURE_SITES.crossroads,name:'Road outside Dasahi',description:'A local road junction outside Dasahi, not a separate marked regional landmark.',options:[
  {id:'inspect-marker',label:'Inspect the road marker',response:'A weathered marker points farther along the local road.'},
  {id:'listen-road',label:'Listen for activity',response:'Wind stirs the grass along the road. Whether anyone is nearby remains uncertain.'}]},
 watchtower:{...ADVENTURE_SITES.watchtower,name:'Roadside ruins',description:'A small ruined structure near the road outside Dasahi, not a named regional landmark.'}
};
export function adventureSiteForCampaign(campaign:Campaign,site:AdventureSite) {
 return campaign.characterBuild ? ANCHAMIDA_STARTER_SITES[site] : ADVENTURE_SITES[site];
}
export function beginAdventureSession(campaign:Campaign,now=new Date().toISOString()):Campaign{
 if(!campaign.character||!Number.isInteger(campaign.character.maxHitPoints)||!(campaign.character.maxHitPoints!>0))throw Error('A campaign character is required');
 if(campaign.adventureSession)throw Error('Adventure session already exists');
 const session:AdventureSession={status:'exploring',site:'frontier',characterSource:'campaign-character',visited:['frontier'],interactions:[]};
 return {...campaign,adventureSession:session,location:campaign.characterBuild?'Dasahi':ADVENTURE_SITES.frontier.name,updatedAt:now,journal:[...campaign.journal,{id:campaign.id+'-adventure-start',kind:'system',text:'Adventure session started with the saved campaign character.',createdAt:now}]};
}
/** Register an explicit route before travel. A DM narration cannot create or complete a leg. */
export function beginTravelingMerchantRoute(campaign:Campaign,routeId:string,stops:AdventureSite[]):Campaign{
 const session=campaign.adventureSession;
 if(settlementTier(campaign)!=='traveling'||!session||session.status!=='exploring')throw Error('A traveling merchant must be exploring to begin a route.');
 if(!/^[a-z0-9][a-z0-9-]{2,63}$/i.test(routeId)||stops.length<2||stops.length>12||stops[0]!==session.site)throw Error('Invalid merchant route manifest.');
 if(stops.some((site,i)=>i>0&&!ADVENTURE_SITES[stops[i-1]]?.neighbors.includes(site)))throw Error('Merchant route must follow adjacent verified sites.');
 if(campaign.merchantTraderRoute&&campaign.merchantTraderRoute.nextStopIndex<campaign.merchantTraderRoute.stops.length)throw Error('Complete the current merchant route first.');
 if((campaign.merchantTraderResupply&&Object.keys(campaign.merchantTraderResupply).some(k=>k.startsWith(routeId+':')))||campaign.merchantTraderRoute?.id===routeId)throw Error('Route ID already used.');
 return {...campaign,merchantTraderRoute:{id:routeId,stops:[...stops],nextStopIndex:1,completedArrivalIds:[]}};
}
export function travelAdventure(campaign:Campaign,destination:AdventureSite,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='exploring')throw Error('Adventure exploration is not active');
 if(!ADVENTURE_SITES[session.site].neighbors.includes(destination))throw Error('Destination is not adjacent');
 const route=campaign.merchantTraderRoute;
 if(route&&route.nextStopIndex<route.stops.length&&(settlementTier(campaign)!=='traveling'||route.stops[route.nextStopIndex]!==destination||route.stops[route.nextStopIndex-1]!==session.site))throw Error('Travel must follow the verified merchant route.');
 const traveled={...campaign,adventureSession:{...session,site:destination,visited:session.visited.includes(destination)?session.visited:[...session.visited,destination]},location:adventureSiteForCampaign(campaign,destination).name,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system' as const,text:'Travelled to '+adventureSiteForCampaign(campaign,destination).name+'. '+adventureSiteForCampaign(campaign,destination).description,createdAt:now}]};
 if(!route||route.nextStopIndex>=route.stops.length)return traveled;
 const arrivalId='leg-'+route.nextStopIndex+'-'+destination;
 if(route.completedArrivalIds.includes(arrivalId))throw Error('Merchant route arrival already processed.');
 const arrived={...traveled,merchantTraderRoute:{...route,nextStopIndex:route.nextStopIndex+1,completedArrivalIds:[...route.completedArrivalIds,arrivalId]}};
 return resupplyTravelingMerchant(arrived,route.id,arrivalId);
}
export function interactAdventure(campaign:Campaign,choiceId:string,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='exploring')throw Error('Adventure exploration is not active');
 const choice=adventureSiteForCampaign(campaign,session.site).options.find(o=>o.id===choiceId);
 if(!choice)throw Error('Interaction is unavailable at this location');
 return {...campaign,adventureSession:{...session,interactions:[...session.interactions,{site:session.site,choice:choiceId,response:choice.response}]},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:choice.label+': '+choice.response,createdAt:now}]};
}
/** Explicit DM-authorized encounter bridge. No hostile, statistics or dice are invented. */
export function enterAdventureEncounter(campaign:Campaign,companionId:string,initiative:{nighthawk:number;companion:number},companionHp:number,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='exploring'||session.site!=='watchtower')throw Error('Reach the watchtower before entering an encounter');
 if(!campaign.subclassActors?.[companionId])throw Error('Select a registered companion');
 if(!Number.isInteger(companionHp)||companionHp<1||companionHp>500)throw Error('Enter verified companion HP');
 if(campaign.companionEncounter?.status==='active')throw Error('Finish the active encounter first');
 const next=startUnifiedEncounter(campaign,{nighthawk:initiative.nighthawk,[companionId]:initiative.companion},{nighthawk:{x:1,y:1},[companionId]:{x:1,y:2}},{[companionId]:companionHp});
 return {...next,adventureSession:{...session,status:'encounter',encounterActorId:companionId},updatedAt:now,journal:[...next.journal,{id:crypto.randomUUID(),kind:'system',text:'DM-authorized encounter entered at the watchtower. Enemy statistics and rolls require explicit input.',createdAt:now}]};
}
export function resumeAdventureExploration(campaign:Campaign,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='encounter'||campaign.companionEncounter?.status!=='completed')throw Error('Finish the linked encounter before exploring');
 if(campaign.characterIdentity&&!campaign.companionEncounter?.settlement)throw Error('Record encounter rewards, including zero rewards, before exploring');
 return {...campaign,adventureSession:{...session,status:'exploring'},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'The encounter ended. Exploration resumes at '+adventureSiteForCampaign(campaign,session.site).name+'.',createdAt:now}]};
}

/** Persist an AI-proposed encounter; never invent combat statistics or initiative. */
export function proposeAdventureEncounter(campaign:Campaign,enemyName:unknown,actionId:string,now=new Date().toISOString(),battlefield?:unknown,templateId?:unknown):Campaign{
 const session=campaign.adventureSession;
 if(!campaign.characterIdentity||!session||session.status!=='exploring'||campaign.companionEncounter?.status==='active')return campaign;
 if(session.pendingEncounter)return campaign;
 if(typeof enemyName!=='string'||!enemyName.trim()||enemyName.trim().length>80||!actionId.trim())return campaign;
 const locationKey=(campaign.location??session.site).trim().toLowerCase();
 const scenario=templateId!==undefined||battlefield!==undefined?resolveDmBattlefield(templateId!==undefined?{templateId}: {battlefield},locationKey,campaign.id+":"+actionId):undefined;
 if(scenario&&!scenario.artwork&&campaign.tacticalArtwork?.[locationKey])scenario.artwork=campaign.tacticalArtwork[locationKey];
 return {...campaign,updatedAt:now,adventureSession:{...session,pendingEncounter:{enemyName:enemyName.trim(),actionId,...(scenario?{scenario}:{})}}};
}

/** Recover the named Dasahi warehouse-rat job from a legacy DM combatStart that
 * omitted its already-verified tactical template. Never infer generic fights. */
export function recoverWarehouseRatEncounter(campaign:Campaign):Campaign{
 const session=campaign.adventureSession,pending=session?.pendingEncounter;
 if(!session||!pending||pending.scenario||!campaign.characterIdentity||session.status!=='exploring')return campaign;
 const recent=campaign.journal.slice(-12).filter(entry=>entry.kind==='dm'||entry.kind==='player')
  .map(entry=>entry.text).join(' ').toLowerCase();
 const warehouse=/(warehouse|pallet stack|cargo|dockside)/.test(recent);
 const rats=/\brats?\b/.test(pending.enemyName.toLowerCase());
 const city=/(dasahi)/i.test(campaign.location??'')||session.site==='frontier';
 if(!warehouse||!rats||!city)return campaign;
 const locationKey=(campaign.location??session.site).trim().toLowerCase();
 const scenario=resolveDmBattlefield({templateId:'warehouse-vermin'},locationKey,campaign.id+':'+pending.actionId);
 return {...campaign,adventureSession:{...session,pendingEncounter:{...pending,scenario}}};
}

/** A player may reject a proposed fight without rewriting the DM's saved narration. */
export function declineAdventureEncounter(campaign:Campaign,actionId:string,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!campaign.characterIdentity||!session||session.status!=='exploring'||!session.pendingEncounter||session.pendingEncounter.actionId!==actionId)throw Error('The encounter proposal is no longer pending');
 return {...campaign,updatedAt:now,adventureSession:{...session,pendingEncounter:undefined},journal:[...campaign.journal,{id:'declined-encounter-'+actionId,kind:'system',createdAt:now,text:'Player declined the proposed combat encounter; exploration continues.'}]};
}

export function proposedEnemyActorId(name:string):string{
 const slug=name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30).replace(/-+$/,'');
 return 'enemy-'+(slug||'opponent');
}

export interface AdventureEncounterSetup {playerInitiative:number;enemyInitiative:number;enemyId:string;hitPoints:number;armorClass:number;attackModifier:number;damageModifier:number;damageDice:string}
/** One handoff, using only the existing encounter engine and DM-confirmed inputs. */
export function enterSoloAdventureEncounter(campaign:Campaign,setup:AdventureEncounterSetup,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='exploring'||(!session.pendingEncounter&&session.site!=='watchtower'))throw Error('A confirmed hostile encounter or watchtower setup is required');
 if(session.pendingEncounter&&setup.enemyId!==proposedEnemyActorId(session.pendingEncounter.enemyName))throw Error('Encounter opponent must match the DM proposal');
 if(campaign.companionEncounter?.status==='active')throw Error('Finish the active encounter first');
 if(!Number.isInteger(setup.playerInitiative)||setup.playerInitiative<1||setup.playerInitiative>40||!Number.isInteger(setup.enemyInitiative)||setup.enemyInitiative<1||setup.enemyInitiative>40)throw Error('Enter initiative totals between 1 and 40');
 if(!setup.enemyId.trim()||!Number.isInteger(setup.hitPoints)||setup.hitPoints<1||setup.hitPoints>500||!Number.isInteger(setup.armorClass)||setup.armorClass<1||setup.armorClass>40||!Number.isInteger(setup.attackModifier)||setup.attackModifier< -20||setup.attackModifier>30||!Number.isInteger(setup.damageModifier)||setup.damageModifier< -20||setup.damageModifier>30||!/^\d{1,2}d\d{1,3}(?:\s+[a-z]+)?$/i.test(setup.damageDice.trim()))throw Error('Enter verified enemy statistics and damage dice (for example, 1d6)');
 const started=startUnifiedEncounter(campaign,{nighthawk:setup.playerInitiative},{nighthawk:{x:1,y:1}},{});
 const next=addCompanionEnemy(started,setup.enemyId,setup.enemyInitiative,{x:2,y:1},setup.hitPoints,setup.armorClass,setup.attackModifier,30,5,setup.damageModifier,setup.damageDice);
 return {...next,updatedAt:now,adventureSession:{...session,status:'encounter',pendingEncounter:undefined,encounterActorId:setup.enemyId},journal:[...next.journal,{id:crypto.randomUUID(),kind:'system',createdAt:now,text:'DM-confirmed encounter started with the saved player and '+setup.enemyId+'.'}]};
}
