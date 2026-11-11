import type {Campaign} from './campaign';
import {startUnifiedEncounter,addCompanionEnemy} from './companionEncounter';
export type AdventureSite='frontier'|'crossroads'|'watchtower';
export interface AdventureSession {
 status:'exploring'|'encounter';site:AdventureSite;characterSource:'campaign-character';
 visited:AdventureSite[];interactions:{site:AdventureSite;choice:string;response:string}[];encounterActorId?:string;
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

export interface AdventureEncounterSetup {playerInitiative:number;enemyInitiative:number;enemyId:string;hitPoints:number;armorClass:number;attackModifier:number;damageModifier:number;damageDice:string}
/** One handoff, using only the existing encounter engine and DM-confirmed inputs. */
export function enterSoloAdventureEncounter(campaign:Campaign,setup:AdventureEncounterSetup,now=new Date().toISOString()):Campaign{
 const session=campaign.adventureSession;
 if(!session||session.status!=='exploring'||session.site!=='watchtower')throw Error('Reach the watchtower before entering an encounter');
 const started=startUnifiedEncounter(campaign,{nighthawk:setup.playerInitiative},{nighthawk:{x:1,y:1}},{});
 const next=addCompanionEnemy(started,setup.enemyId,setup.enemyInitiative,{x:2,y:1},setup.hitPoints,setup.armorClass,setup.attackModifier,30,5,setup.damageModifier,setup.damageDice);
 return {...next,updatedAt:now,adventureSession:{...session,status:'encounter',encounterActorId:setup.enemyId},journal:[...next.journal,{id:crypto.randomUUID(),kind:'system',createdAt:now,text:'DM-confirmed watchtower encounter started with the saved player and '+setup.enemyId+'.'}]};
}
