import type {Campaign} from './campaign';
import {startUnifiedEncounter,addCompanionEnemy} from './companionEncounter';
export type AdventureSite='frontier'|'crossroads'|'watchtower';
export interface AdventureSession {
 status:'exploring'|'encounter';site:AdventureSite;characterSource:'campaign-character';
 visited:AdventureSite[];interactions:{site:AdventureSite;choice:string;response:string}[];encounterActorId?:string;pendingEncounter?:{enemyName:string;actionId:string};
}
export const ADVENTURE_SITES:Record<AdventureSite,{name:string;description:string;neighbors:AdventureSite[];options:{id:string;label:string;response:string}[]}>={
 frontier:{name:'Frontier Village',description:'Lanterns glow above the village square. A watchkeeper studies travelers arriving from the eastern road.',neighbors:['crossroads'],options:[
 {id:'speak-watchkeeper',label:'Speak with the watchkeeper',response:'The watchkeeper reports travelers near the old watchtower. No threat has been confirmed.'},
 {id:'inspect-square',label:'Inspect the square',response:'Wagon tracks lead toward the crossroads, but their origin is unknown.'}]},
 crossroads:{name:'Old Crossroads',description:'Two muddy tracks meet beside a weathered marker. The eastern path leads toward a ruined watchtower.',neighbors:['frontier','watchtower'],options:[
 {id:'inspect-marker',label:'Inspect the road marker',response:'The marker points toward the watchtower. Its inscription is too worn to read.'},
 {id:'listen-road',label:'Listen for activity',response:'Wind stirs the roadside grass. Whether anyone is nearby remains uncertain.'}]},
 watchtower:{name:'Old Watchtower',description:'Broken stone walls rise above the road. The interior is not yet mapped.',neighbors:['crossroads'],options:[
 {id:'inspect-ruins',label:'Inspect the ruins',response:'Footprints cross the dust. Their age and origin remain uncertain.'},
 {id:'call-out',label:'Call into the tower',response:'Your voice echoes through the stone. There is no immediate answer.'}]}
};
export function beginAdventureSession(campaign:Campaign,now=new Date().toISOString()):Campaign{
 if(!campaign.character||!Number.isInteger(campaign.character.maxHitPoints)||!(campaign.character.maxHitPoints!>0))throw Error('A campaign character is required');
 if(campaign.adventureSession)throw Error('Adventure session already exists');
 const session:AdventureSession={status:'exploring',site:'frontier',characterSource:'campaign-character',visited:['frontier'],interactions:[]};
 return {...campaign,adventureSession:session,location:ADVENTURE_SITES.frontier.name,updatedAt:now,journal:[...campaign.journal,{id:campaign.id+'-adventure-start',kind:'system',text:'Adventure session started with the saved campaign character.',createdAt:now}]};
}
export function travelAdventure(campaign:Campaign,destination:AdventureSite,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='exploring')throw Error('Adventure exploration is not active');
 if(!ADVENTURE_SITES[session.site].neighbors.includes(destination))throw Error('Destination is not adjacent');
 return {...campaign,adventureSession:{...session,site:destination,visited:session.visited.includes(destination)?session.visited:[...session.visited,destination]},location:ADVENTURE_SITES[destination].name,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'Travelled to '+ADVENTURE_SITES[destination].name+'. '+ADVENTURE_SITES[destination].description,createdAt:now}]};
}
export function interactAdventure(campaign:Campaign,choiceId:string,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='exploring')throw Error('Adventure exploration is not active');
 const choice=ADVENTURE_SITES[session.site].options.find(o=>o.id===choiceId);
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
 return {...campaign,adventureSession:{...session,status:'exploring'},updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',text:'The encounter ended. Exploration resumes at '+ADVENTURE_SITES[session.site].name+'.',createdAt:now}]};
}

/** Persist an AI-proposed encounter; never invent combat statistics or initiative. */
export function proposeAdventureEncounter(campaign:Campaign,enemyName:unknown,actionId:string,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!campaign.characterIdentity||!session||session.status!=='exploring'||campaign.companionEncounter?.status==='active')return campaign;
 if(session.pendingEncounter)return campaign;
 if(typeof enemyName!=='string'||!enemyName.trim()||enemyName.trim().length>80||!actionId.trim())return campaign;
 return {...campaign,updatedAt:now,adventureSession:{...session,pendingEncounter:{enemyName:enemyName.trim(),actionId}}};
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
