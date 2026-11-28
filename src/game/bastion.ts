/** 2024 DMG Chapter 8 Bastions: authoritative mechanics, independent of any map artwork.
 * A property is a persistent location, not a second combat or inventory system.
 * Orders without implemented printed resolutions remain pending DM adjudication.
 */
import type {Campaign} from './campaign';
import {walletCopper} from './frontierShop';
import {startingCurrency} from './characterImport';
import {emptyWorld,mergeWorld} from './world';

export const BASTION_TURN_MINUTES=7*24*60;
export const BASIC_TYPES=['Bedroom','Dining Room','Parlor','Courtyard','Kitchen','Storage'] as const;
export type BasicType=typeof BASIC_TYPES[number];
export const SIZES=['Cramped','Roomy','Vast'] as const;
export type FacilitySize=typeof SIZES[number];
export type BastionOrderType='Craft'|'Empower'|'Harvest'|'Recruit'|'Research'|'Trade';
export type BastionPrerequisite='arcane'|'divine'|'spell-focus'|'expertise'|'martial';
export interface SpecialDefinition{
 id:string;name:string;level:5|9|13|17;size:FacilitySize;order:BastionOrderType;
 hirelings:number;prerequisite?:BastionPrerequisite;upgradeToVast?:boolean;repeatable?:boolean;
}
const entry=(name:string,level:5|9|13|17,order:BastionOrderType,size:FacilitySize='Roomy',hirelings=1,prerequisite?:BastionPrerequisite,upgradeToVast=false,repeatable=false):SpecialDefinition=>({
 id:name.toLowerCase().replace(/ /g,'-'),name,level,size,order,hirelings,
 ...(prerequisite?{prerequisite}:{}),...(upgradeToVast?{upgradeToVast:true}:{}),...(repeatable?{repeatable:true}:{})
});
/** 29 core DMG facilities; eligibility uses conservative class rules. Feat-granted focus/feature exceptions remain to be audited. */
export const SPECIAL_FACILITIES:readonly SpecialDefinition[]=[
 entry('Arcane Study',5,'Craft','Roomy',1,'arcane'),
 entry('Armory',5,'Trade'),entry('Barrack',5,'Recruit','Roomy',1,undefined,true,true),
 entry('Garden',5,'Harvest','Roomy',1,undefined,true,true),entry('Library',5,'Research'),
 entry('Sanctuary',5,'Craft','Roomy',1,'divine'),entry('Smithy',5,'Craft','Roomy',2),
 entry('Storehouse',5,'Trade'),entry('Workshop',5,'Craft','Roomy',3,undefined,true),
 entry('Gaming Hall',9,'Trade','Vast',4),entry('Greenhouse',9,'Harvest'),
 entry('Laboratory',9,'Craft'),entry('Sacristy',9,'Craft','Roomy',1,'divine'),
 entry('Scriptorium',9,'Craft'),entry('Stable',9,'Trade','Roomy',1,undefined,true,true),
 entry('Teleportation Circle',9,'Recruit'),entry('Theater',9,'Empower','Vast',4),
 entry('Training Area',9,'Empower','Vast',4,undefined,false,true),entry('Trophy Room',9,'Research'),
 entry('Archive',13,'Research','Roomy',1,undefined,true),entry('Meditation Chamber',13,'Empower','Cramped'),
 entry('Menagerie',13,'Recruit','Vast',2),entry('Observatory',13,'Empower','Roomy',1,'spell-focus'),
 entry('Pub',13,'Research','Roomy',1,undefined,true),entry('Reliquary',13,'Harvest','Cramped',1,'divine'),
 entry('Demiplane',17,'Empower','Vast',1,'arcane'),
 entry('Guildhall',17,'Recruit','Vast',1,'expertise'),entry('Sanctum',17,'Empower','Roomy',4,'divine'),
 entry('War Room',17,'Recruit','Vast',2,'martial'),
];
export const BIOMES=['Temperate','Forest','Mountain','Coastal','Riverlands','Wetlands','Desert','Arctic','Urban'] as const;
export type BastionBiome=typeof BIOMES[number];
export const GARDEN_TYPES=['Decorative','Food','Herb','Poison'] as const;
export type GardenType=typeof GARDEN_TYPES[number];
export type BastionZone='Courtyard'|'Main Hall'|'West Wing'|'East Wing'|'Upper Floor'|'Outer Grounds';
export interface BastionFacility{
 id:string;kind:'basic'|'special';name:string;size:FacilitySize;zone:BastionZone;
 definitionId?:string;constructionId?:string;gardenTypes?:GardenType[];defendersAssigned?:number;/** A record of assigned hirelings, not purchasable staff. */ hirelingNames?:string[];
}
export interface BastionConstruction{
 id:string;kind:'new-basic'|'expand-basic'|'wall-section'|'replant-garden';facilityId?:string;plotIndex?:number;gardenType?:GardenType;
 startedAt:number;finishesAt:number;costGp:number;targetSize?:FacilitySize;section?:string;
}
export interface BastionOrder{
 id:string;facilityId:string;type:BastionOrderType;request:string;issuedTurn:number;
 issuedAt:number;completedAt:number;status:'active'|'awaiting-dm'|'resolved';
}
export interface BastionEvent{
 id:string;turn:number;roll:number;name:string;status:'awaiting-dm'; }
export interface BastionState{
 id:string;name:string;region:string;biome:BastionBiome;description:string;status:'prospective'|'established';
 createdAt:string;ownerId:string;
 facilities:BastionFacility[];construction:BastionConstruction[];wallSections:{id:string;section:string;completeAt:number}[];
 orders:BastionOrder[];events:BastionEvent[];defenders:number;maintainedTurns:number[];stores:{name:string;quantity:number}[];
 foundedAtMinutes?:number;lastProcessedTurn:number;lastReplacementLevel:number;
 visited:boolean;reports:string[];
}
export const BASIC_BUILD_COSTS={
 Cramped:{gp:500,days:20},Roomy:{gp:1000,days:45},Vast:{gp:3000,days:125},
} as const;
export const BASIC_EXPANSIONS={
 Cramped:{next:'Roomy' as const,gp:500,days:25},
 Roomy:{next:'Vast' as const,gp:2000,days:80},
} as const;
export const BASTION_EVENTS=[
 {max:50,name:'All Is Well'}, {max:55,name:'Attack'},{max:58,name:'Criminal Hireling'},
 {max:63,name:'Extraordinary Opportunity'},{max:72,name:'Friendly Visitors'},
 {max:76,name:'Guest'},{max:79,name:'Lost Hirelings'},{max:83,name:'Magical Discovery'},
 {max:91,name:'Refugees'},{max:98,name:'Request for Aid'},{max:100,name:'Treasure'},
] as const;
const nowMinute=(campaign:Campaign)=>campaign.elapsedMinutes??0;
export function bastionSlots(level:number):number{return level>=17?6:level>=13?5:level>=9?4:level>=5?2:0}
export function bastionLevel(c:Campaign):number{return c.character?.level??1}
export function validBastionState(value:unknown):value is BastionState{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const b=value as BastionState;
 return typeof b.id==='string'&&b.id.length<100&&typeof b.name==='string'&&b.name.length<=80&&
 typeof b.region==='string'&&b.region.length<=120&&BIOMES.includes(b.biome)&&
 typeof b.description==='string'&&b.description.length<=240&&['prospective','established'].includes(b.status)&&
 typeof b.ownerId==='string'&&typeof b.createdAt==='string'&&
 Array.isArray(b.facilities)&&b.facilities.length<=150&&b.facilities.every(f=>f&&typeof f.id==='string'&&typeof f.name==='string'&&f.name.length<=80&&
 ['basic','special'].includes(f.kind)&&SIZES.includes(f.size)&&
 ['Courtyard','Main Hall','West Wing','East Wing','Upper Floor','Outer Grounds'].includes(f.zone)&&
 (f.gardenTypes===undefined||Array.isArray(f.gardenTypes)&&f.gardenTypes.length>=1&&f.gardenTypes.length<=2&&f.gardenTypes.every(g=>GARDEN_TYPES.includes(g)))&&
 (f.defendersAssigned===undefined||Number.isInteger(f.defendersAssigned)&&f.defendersAssigned>=0&&f.defendersAssigned<=25)&&
 (f.hirelingNames===undefined||Array.isArray(f.hirelingNames)&&f.hirelingNames.length<=8&&f.hirelingNames.every(n=>typeof n==='string'&&n.length<=60&&n.trim().length>=2)))&&
 Array.isArray(b.construction)&&b.construction.length<=300&&b.construction.every(p=>p&&typeof p.id==='string'&&
 ['new-basic','expand-basic','wall-section','replant-garden'].includes(p.kind)&&
 (p.gardenType===undefined||GARDEN_TYPES.includes(p.gardenType))&&
 (p.plotIndex===undefined||Number.isInteger(p.plotIndex)&&p.plotIndex>=0&&p.plotIndex<=1)&&Number.isSafeInteger(p.startedAt)&&Number.isSafeInteger(p.finishesAt)&&
 Number.isSafeInteger(p.costGp)&&p.costGp>=0)&&
 Array.isArray(b.wallSections)&&b.wallSections.length<=1000&&b.wallSections.every(x=>x&&typeof x.id==='string'&&Number.isSafeInteger(x.completeAt))&&
 Array.isArray(b.orders)&&b.orders.length<=300&&b.orders.every(o=>o&&typeof o.id==='string'&&typeof o.request==='string'&&o.request.length<=160&&
 ['Craft','Empower','Harvest','Recruit','Research','Trade'].includes(o.type)&&
 ['active','awaiting-dm','resolved'].includes(o.status)&&Number.isSafeInteger(o.issuedAt)&&Number.isSafeInteger(o.completedAt)&&Number.isSafeInteger(o.issuedTurn))&&
 Array.isArray(b.stores)&&b.stores.length<=150&&b.stores.every(i=>i&&typeof i.name==='string'&&i.name.length<=80&&Number.isSafeInteger(i.quantity)&&i.quantity>=0)&&
 Array.isArray(b.maintainedTurns)&&b.maintainedTurns.length<=1000&&b.maintainedTurns.every(n=>Number.isInteger(n)&&n>=0)&&
 Array.isArray(b.events)&&b.events.length<=120&&b.events.every(e=>e&&typeof e.id==='string'&&Number.isInteger(e.roll)&&e.roll>=1&&e.roll<=100)&&
 Array.isArray(b.reports)&&b.reports.length<=80&&b.reports.every(s=>typeof s==='string'&&s.length<=250)&&
 Number.isInteger(b.defenders)&&b.defenders>=0&&b.defenders<=10000&&Number.isInteger(b.lastProcessedTurn)&&b.lastProcessedTurn>=0&&
 Number.isInteger(b.lastReplacementLevel)&&b.lastReplacementLevel>=0&&typeof b.visited==='boolean'&&
 (b.foundedAtMinutes===undefined||Number.isSafeInteger(b.foundedAtMinutes));
}
export function eligibleSpecial(c:Campaign,d:SpecialDefinition):boolean{
 const char=c.character,level=bastionLevel(c),classId=(c.characterIdentity?.classId||char?.classId||'').toLowerCase();
 if(level<d.level)return false;
 const sub=(char?.subclass??'').toLowerCase()+' '+(c.importedSubclassId??'').toLowerCase();
 const arcane=['wizard','sorcerer','warlock','artificer'].includes(classId)||
   (classId==='rogue'&&sub.includes('arcane trickster'));
 const divine=['cleric','druid','paladin','ranger'].includes(classId);
 switch(d.prerequisite){
 case 'arcane':return arcane;
 case 'divine':return divine;
 case 'spell-focus':return arcane||divine||classId==='bard';
 case 'expertise':return !!char?.expertiseSkills?.length;
 case 'martial':return ['fighter','paladin','ranger','monk','barbarian'].includes(classId);
 default:return true;
 }
}
const requireBastion=(c:Campaign):BastionState=>{
 if(!c.bastion||!validBastionState(c.bastion))throw Error('No valid Bastion has been established.');
 return c.bastion;
};
const requireActive=(c:Campaign):BastionState=>{
 const b=requireBastion(c);if(b.status!=='established')throw Error('Establish your Bastion at character level 5 first.');
 return b;
};
const id=()=>crypto.randomUUID();
const updated=(c:Campaign,b:BastionState):Campaign=>({...c,bastion:b,updatedAt:new Date().toISOString()});
const defined=(key:string)=>SPECIAL_FACILITIES.find(d=>d.id===key);
export function planBastion(c:Campaign,data:{name:string;region:string;biome:BastionBiome;description?:string}):Campaign{
 if(c.bastion?.status==='established')throw Error('This campaign already has an established Bastion.');
 const name=data.name.trim().slice(0,80),region=data.region.trim().slice(0,120);
 if(!name||!region||!BIOMES.includes(data.biome))throw Error('Specify a Bastion name, region, and biome.');
 const prior=c.bastion;
 const b:BastionState=prior?{...prior,name,region,biome:data.biome,description:(data.description??'').trim().slice(0,240)}:{
 id:id(),name,region,biome:data.biome,description:(data.description??'').trim().slice(0,240),status:'prospective',
 createdAt:new Date().toISOString(),ownerId:c.characterIdentity?.name??c.title,facilities:[],construction:[],wallSections:[],orders:[],events:[],defenders:0,maintainedTurns:[],stores:[],
 lastProcessedTurn:0,lastReplacementLevel:0,visited:false,reports:[],
 };
 return updated(c,b);
}
const zones:BastionZone[]=['Main Hall','West Wing','East Wing','Upper Floor','Outer Grounds','Courtyard'];
const nextZone=(count:number):BastionZone=>zones[count%zones.length];
function specialRoom(key:string,count:number,gardenType:GardenType='Food'):BastionFacility{
 const d=defined(key)!;
 return {id:id(),kind:'special',name:d.name,size:d.size,zone:nextZone(count),definitionId:d.id,...(key==='garden'?{gardenTypes:[gardenType]}:{}),...(key==='barrack'?{defendersAssigned:0}:{})};
}
export function establishBastion(c:Campaign,config:{cramped:BasicType;roomy:BasicType;specials:[string,string];gardenTypes?:[GardenType,GardenType]}):Campaign{
 const b=requireBastion(c);
 if(b.status==='established')throw Error('The Bastion is already established.');
 if(bastionLevel(c)<5)throw Error('Bastions become available at character level 5.');
 if(!BASIC_TYPES.includes(config.cramped)||!BASIC_TYPES.includes(config.roomy)||config.specials.length!==2)
   throw Error('Choose one Cramped, one Roomy, and two special facilities.');
 const entries=config.specials.map(defined);
 if(entries.some(d=>!d||!eligibleSpecial(c,d)))throw Error('A special facility is unavailable to this character.');
 if(config.specials[0]===config.specials[1]&&!entries[0]?.repeatable)throw Error('You cannot choose that facility twice.');
 const basics:BastionFacility[]=[
 {id:id(),kind:'basic',name:config.cramped,size:'Cramped',zone:config.cramped==='Courtyard'?'Courtyard':'Main Hall'},
 {id:id(),kind:'basic',name:config.roomy,size:'Roomy',zone:config.roomy==='Courtyard'?'Courtyard':'Main Hall'},
 ];
 const specials=config.specials.map((key,i)=>specialRoom(key,i+1,config.gardenTypes?.[i]));
 return updated(c,{...b,status:'established',facilities:[...basics,...specials],
 foundedAtMinutes:nowMinute(c),lastProcessedTurn:0,lastReplacementLevel:bastionLevel(c),reports:['Bastion established with two free basic and two free special facilities.']});
}
export function addSpecialFacility(c:Campaign,key:string,gardenType:GardenType='Food'):Campaign{
 const b=requireActive(c),d=defined(key);
 if(!d||!eligibleSpecial(c,d))throw Error('This character does not qualify for that special facility.');
 const special=b.facilities.filter(f=>f.kind==='special');
 if(special.length>=bastionSlots(bastionLevel(c)))throw Error('All available special-facility slots are occupied.');
 if(!d.repeatable&&special.some(f=>f.definitionId===key))throw Error('That special facility is already owned.');
 if(key==='garden'&&!GARDEN_TYPES.includes(gardenType))throw Error('Choose a legal Garden type.');
 return updated(c,{...b,facilities:[...b.facilities,specialRoom(key,b.facilities.length,gardenType)]});
}
export function replaceSpecialFacility(c:Campaign,facilityId:string,key:string,gardenType:GardenType='Food'):Campaign{
 const b=requireActive(c),level=bastionLevel(c),d=defined(key);
 const old=b.facilities.find(f=>f.id===facilityId&&f.kind==='special');
 if(!old||!d||!eligibleSpecial(c,d)||level<=b.lastReplacementLevel)throw Error('Replacement requires an unused character level-up and an eligible facility.');
 if(old.definitionId===key||!d.repeatable&&b.facilities.some(f=>f.kind==='special'&&f.definitionId===key))
  throw Error('Choose a different eligible special facility.');
 if(b.orders.some(o=>o.facilityId===facilityId&&o.status==='active'))throw Error('Resolve the current project before replacing this facility.');
 return updated(c,{...b,lastReplacementLevel:level,facilities:b.facilities.map(f=>f.id===facilityId?{...specialRoom(key,b.facilities.length,gardenType),id:facilityId,zone:f.zone}:f)});
}
function spendGold(c:Campaign,gp:number):Campaign{
 const ledger=c.inventoryLedger;
 if(!ledger||!Number.isSafeInteger(gp)||gp<0||!Number.isSafeInteger(walletCopper(ledger.currency)))
  throw Error('A valid wallet is required for construction.');
 const balance=walletCopper(ledger.currency);
 if(balance<gp*100)throw Error('Not enough gold for this construction.');
 // Use the same coin denominations as imported starting currency; preserves every copper.
 return {...c,inventoryLedger:{...ledger,currency:startingCurrency(balance-gp*100)}};
}
function schedule(c:Campaign,b:BastionState,project:Omit<BastionConstruction,'id'|'startedAt'|'finishesAt'>,days:number):Campaign{
 const paid=spendGold(c,project.costGp),startedAt=nowMinute(c),job:BastionConstruction={id:id(),...project,startedAt,finishesAt:startedAt+days*1440};
 return updated(paid,{...b,construction:[...b.construction,job]});
}
export function constructBasic(c:Campaign,type:BasicType,size:FacilitySize):Campaign{
 const b=requireActive(c);
 if(!BASIC_TYPES.includes(type)||!SIZES.includes(size)||b.facilities.length>=150)throw Error('Invalid basic facility or too many rooms.');
 const spec=BASIC_BUILD_COSTS[size],facility:BastionFacility={id:id(),kind:'basic',name:type,size,zone:type==='Courtyard'?'Courtyard':nextZone(b.facilities.length)};
 const paid=spendGold(c,spec.gp),start=nowMinute(c);
 return updated(paid,{...b,facilities:[...b.facilities,facility],
 construction:[...b.construction,{id:id(),kind:'new-basic',facilityId:facility.id,costGp:spec.gp,startedAt:start,finishesAt:start+spec.days*1440,targetSize:size}]});
}
export function expandBasic(c:Campaign,facilityId:string):Campaign{
 const b=requireActive(c),f=b.facilities.find(x=>x.id===facilityId&&x.kind==='basic');
 if(!f||f.size==='Vast')throw Error('Choose a Cramped or Roomy basic facility to enlarge.');
 if(b.construction.some(p=>p.facilityId===facilityId))throw Error('Construction is already underway in this room.');
 const spec=BASIC_EXPANSIONS[f.size];
 return schedule(c,b,{kind:'expand-basic',facilityId,costGp:spec.gp,targetSize:spec.next},spec.days);
}
export function upgradeSpecialFacility(c:Campaign,facilityId:string,secondGardenType:GardenType='Food'):Campaign{
 const b=requireActive(c),f=b.facilities.find(x=>x.id===facilityId&&x.kind==='special'),d=f?.definitionId?defined(f.definitionId):undefined;
 if(!f||!d?.upgradeToVast||f.size!=='Roomy')throw Error('This special facility has no applicable Vast upgrade.');
 if(d.id==='garden'&&!GARDEN_TYPES.includes(secondGardenType))throw Error('Invalid second Garden plot.');
 const paid=spendGold(c,2000);
 // The printed facility upgrades specify a gold cost, not a separate construction delay.
 return updated(paid,{...b,facilities:b.facilities.map(x=>x.id===facilityId?{...x,size:'Vast',...(d.id==='garden'?{gardenTypes:[...(x.gardenTypes??['Food']),secondGardenType]}:{})}:x)});
}
/** Garden type conversion requires 21 in-game days during which the Garden cannot work. */
export function changeGardenType(c:Campaign,facilityId:string,plotIndex:number,newType:GardenType):Campaign{
 const b=requireActive(c),garden=b.facilities.find(f=>f.id===facilityId&&f.definitionId==='garden');
 if(!garden||!GARDEN_TYPES.includes(newType)||!b.visited||c.location!==b.name)
  throw Error('Visit the Garden before changing its planting.');
 const plots=garden.gardenTypes??['Food'];
 if(!Number.isInteger(plotIndex)||plotIndex<0||plotIndex>=plots.length||plots[plotIndex]===newType)
  throw Error('Choose a different type for an existing Garden plot.');
 if(b.construction.some(p=>p.facilityId===facilityId)||b.orders.some(o=>o.facilityId===facilityId&&o.status==='active'))
  throw Error('Finish current Garden work before replanting.');
 const start=nowMinute(c);
 return updated(c,{...b,construction:[...b.construction,{id:id(),kind:'replant-garden',facilityId,startedAt:start,finishesAt:start+21*1440,costGp:0,plotIndex,gardenType:newType}]});
}
export function constructWallSection(c:Campaign,section:string):Campaign{
 const b=requireActive(c),name=section.trim().slice(0,70);
 if(!name)throw Error('Name the part of the perimeter receiving this wall section.');
 if(b.wallSections.length>=1000)throw Error('Maximum recorded wall sections reached.');
 const paid=spendGold(c,250),start=nowMinute(c),end=start+10*1440,wid=id();
 return updated(paid,{...b,wallSections:[...b.wallSections,{id:wid,section:name,completeAt:end}],
 construction:[...b.construction,{id:id(),kind:'wall-section',costGp:250,startedAt:start,finishesAt:end,section:name}]});
}
export function isFacilityReady(b:BastionState,f:BastionFacility,minutes:number):boolean{
 return !b.construction.some(p=>p.facilityId===f.id&&p.finishesAt>minutes);
}
export function currentBastionTurn(c:Campaign):number{
 const b=c.bastion;return b?.status==='established'&&b.foundedAtMinutes!==undefined
 ? Math.max(0,Math.floor((nowMinute(c)-b.foundedAtMinutes)/BASTION_TURN_MINUTES)):0;
}
export function nextBastionTurnMinutes(c:Campaign):number{
 const b=requireActive(c);return (b.foundedAtMinutes??nowMinute(c))+(currentBastionTurn(c)+1)*BASTION_TURN_MINUTES;
}
const GARDEN_OUTPUTS:Record<GardenType,readonly {id:string;name:string;quantity:number}[]>={
 Decorative:[{id:'Bouquets',name:'Exquisite Floral Bouquet',quantity:10},{id:'Perfume',name:'Perfume',quantity:10},{id:'Candles',name:'Candle',quantity:10}],
 Food:[{id:'Rations',name:'Rations',quantity:100}],
 Herb:[{id:'Healers',name:"Healer's Kit",quantity:10},{id:'Potion',name:'Potion of Healing',quantity:1}],
 Poison:[{id:'Antitoxin',name:'Antitoxin',quantity:2},{id:'Basic Poison',name:'Poison, Basic',quantity:1}],
};
export const gardenChoices=(type:GardenType)=>GARDEN_OUTPUTS[type];
export function gardenHarvestRequest(plots:GardenType[],choices:string[]):string{
 if(plots.length!==choices.length||plots.length<1||plots.length>2)throw Error('One valid harvest choice per Garden plot is required.');
 return plots.map((type,i)=>{
  if(!GARDEN_TYPES.includes(type)||!GARDEN_OUTPUTS[type].some(item=>item.id===choices[i]))throw Error('Invalid Garden harvest choice.');
  return type+':'+choices[i];
 }).join('|');
}
function gardenOutputs(plots:GardenType[],request:string):{name:string;quantity:number}[]{
 const parts=request.split('|');
 if(parts.length!==plots.length||!plots.length||plots.length>2)throw Error('Harvest choice mismatch.');
 return parts.map((part,i)=>{
  const [type,key,...extra]=part.split(':');
  if(extra.length||type!==plots[i])throw Error('Incorrect Garden harvest configuration.');
  const item=GARDEN_OUTPUTS[plots[i]].find(x=>x.id===key);
  if(!item)throw Error('Unknown Garden harvest type.');
  return {name:item.name,quantity:item.quantity};
 });
}
const addStored=(storage:BastionState['stores'],items:{name:string;quantity:number}[])=>{
 let out=[...storage];
 for(const item of items){
  const existing=out.find(s=>s.name===item.name);
  if(existing)out=out.map(s=>s.name===item.name?{...s,quantity:s.quantity+item.quantity}:s);
  else out.push(item);
 }
 return out;
};
/** Named hirelings share canonical world NPC identity; no parallel character registry. */
export function nameBastionHireling(c:Campaign,facilityId:string,name:string):Campaign{
 const b=requireActive(c),room=b.facilities.find(f=>f.id===facilityId&&f.kind==='special');
 const d=room?.definitionId?defined(room.definitionId):undefined;
 if(!room||!d||!b.visited||c.location!==b.name)throw Error('Visit a special facility to name its hirelings.');
 const clean=name.trim();
 const limit=d.hirelings+(room.size==='Vast'&&room.definitionId==='garden'?1:room.size==='Vast'&&room.definitionId==='workshop'?2:0);
 if(!clean||clean.length>60||clean.length<2||!/^[\p{L}\p{M} .'-]+$/u.test(clean))
  throw Error('Choose a valid hireling name, 2–60 characters.');
 if((room.hirelingNames??[]).length>=limit)throw Error('All hirelings of this facility already have names.');
 if(c.world?.npcs.some(n=>n.name.toLowerCase()===clean.toLowerCase())||
   b.facilities.some(f=>f.hirelingNames?.some(n=>n.toLowerCase()===clean.toLowerCase())))
  throw Error('An existing NPC already has that name.');
 const world=mergeWorld(c.world??emptyWorld(),{npcs:[{
  name:clean,role:d.name+' hireling',location:b.name,
  relationship:'Loyal employee',notes:['Works in '+d.name+' at '+b.name],
 }]});
 return updated({...c,world},{...b,facilities:b.facilities.map(f=>f.id===facilityId?
  {...f,hirelingNames:[...(f.hirelingNames??[]),clean]}:f)});
}
export function collectBastionSupply(c:Campaign,name:string,quantity:number):Campaign{
 const b=requireActive(c),available=b.stores.find(item=>item.name===name),ledger=c.inventoryLedger;
 if(!b.visited||c.location!==b.name||!ledger||!Number.isSafeInteger(quantity)||quantity<=0||!available||available.quantity<quantity)
  throw Error('Visit the Bastion to collect a valid quantity of stored supplies.');
 const gear=ledger.gear.map(g=>({...g})),existing=gear.find(g=>g.name===name);
 if(existing){const updatedQty=existing.quantity+quantity;if(!Number.isSafeInteger(updatedQty))throw Error('Inventory exceeds valid quantity.');existing.quantity=updatedQty;}
 else gear.push({name,quantity});
 return updated({...c,inventoryLedger:{...ledger,gear}},{...b,stores:b.stores.map(s=>s.name===name?{...s,quantity:s.quantity-quantity}:s).filter(s=>s.quantity>0)});
}
export function canIssueOrder(c:Campaign,facilityId:string):boolean{
 const b=c.bastion;
 if(!b||b.status!=='established'||!b.visited||c.location!==b.name||c.combat||
   c.companionEncounter||c.pendingCheck)return false;
 const f=b.facilities.find(x=>x.id===facilityId&&x.kind==='special');
 return !!f&&(f.definitionId!=='barrack'||(f.defendersAssigned??0)<(f.size==='Vast'?25:12))&&isFacilityReady(b,f,nowMinute(c))&&
  !b.maintainedTurns.includes(currentBastionTurn(c))&&
  !b.orders.some(o=>o.facilityId===facilityId&&(o.issuedTurn===currentBastionTurn(c)||o.status==='active'));
}
export function issueFacilityOrder(c:Campaign,facilityId:string,request:string):Campaign{
 const b=requireActive(c),f=b.facilities.find(x=>x.id===facilityId&&x.kind==='special');
 const d=f?.definitionId?defined(f.definitionId):undefined;
 if(!f||!d||!canIssueOrder(c,facilityId))throw Error('You must be at the Bastion with an available facility and an unused Bastion turn.');
 const task=d.id==='barrack'?'Recruit Bastion Defenders':request.trim().slice(0,160);
 if(d.id==='garden')gardenOutputs(f.gardenTypes??['Food'],task);
 if(!task||task.length<3)throw Error('Describe the intended order, project, or research subject.');
 const minute=nowMinute(c),turn=currentBastionTurn(c);
 const order:BastionOrder={id:id(),facilityId,type:d.order,request:task,issuedTurn:turn,issuedAt:minute,
 completedAt:minute+BASTION_TURN_MINUTES,status:'active'};
 return updated(c,{...b,orders:[...b.orders,order]});
}
export function issueMaintainOrder(c:Campaign,rollD100:()=>number=()=>Math.floor(Math.random()*100)+1):Campaign{
 const b=requireActive(c),turn=currentBastionTurn(c);
 if(!b.visited||c.location!==b.name||c.combat||c.pendingCheck||
   b.maintainedTurns.includes(turn)||b.orders.some(o=>o.issuedTurn===turn))
   throw Error('Maintain requires being at your Bastion without other orders this turn.');
 const roll=rollD100(),name=resolveBastionEventName(roll);
 return updated(c,{...b,maintainedTurns:[...b.maintainedTurns,turn],
  events:[...b.events,{id:id(),turn,roll,name,status:'awaiting-dm' as const}].slice(-120),
  reports:[...b.reports,'Bastion turn '+turn+': Maintain — '+name+'.'].slice(-80)});
}
export function enterBastion(c:Campaign):Campaign{
 const b=requireActive(c);
 if(c.combat||c.companionEncounter||c.pendingCheck||c.location!==b.region&&c.location!==b.name)
  throw Error('Travel to the Bastion’s region and finish any encounter before entering.');
 return {...updated(c,{...b,visited:true}),location:b.name};
}
export function leaveBastion(c:Campaign):Campaign{
 const b=requireActive(c);if(!b.visited||c.location!==b.name||c.combat)throw Error('You are not at the Bastion.');
 return {...updated(c,{...b,visited:false}),location:b.region};
}
export function resolveBastionEventName(roll:number):string{
 if(!Number.isInteger(roll)||roll<1||roll>100)throw Error('Invalid d100 event roll');
 return BASTION_EVENTS.find(e=>roll<=e.max)!.name;
}
/** Resolve elapsed construction and completed order deadlines without assuming unearned loot.
 * Offsite Bastion turns default to Maintain and record an event awaiting DM adjudication.
 * The client never invents its own DM reward or a successful social opportunity.
 */
export function advanceBastionClock(c:Campaign,rollD100:()=>number=()=>Math.floor(Math.random()*100)+1):Campaign{
 const b=c.bastion;
 if(!b||b.status!=='established')return c;
 const minute=nowMinute(c),due=currentBastionTurn(c);
 if(due<=b.lastProcessedTurn&&!b.construction.some(p=>p.finishesAt<=minute)&&
   !b.orders.some(o=>o.status==='active'&&o.completedAt<=minute))return c;
 const reports=[...b.reports];
 const complete=b.construction.filter(p=>p.finishesAt<=minute);
 let facilities=b.facilities.map(f=>{
  const expansion=complete.find(p=>p.kind==='expand-basic'&&p.facilityId===f.id);
  const replant=complete.find(p=>p.kind==='replant-garden'&&p.facilityId===f.id);
  if(replant&&replant.gardenType!==undefined&&replant.plotIndex!==undefined){
   const types=[...(f.gardenTypes??['Food'])];types[replant.plotIndex]=replant.gardenType;
   return {...f,gardenTypes:types};
  }
  return expansion?.targetSize?{...f,size:expansion.targetSize}:f;
 });
 let defenders=b.defenders,stores=[...b.stores];
 const orders=b.orders.map(o=>{
  if(o.status!=='active'||o.completedAt>minute)return o;
  const room=facilities.find(f=>f.id===o.facilityId);
  if(room?.definitionId==='garden'&&o.type==='Harvest'){
   const items=gardenOutputs(room.gardenTypes??['Food'],o.request);
   stores=addStored(stores,items);
   reports.push('Garden harvest secured in Bastion storage: '+items.map(i=>i.quantity+' '+i.name).join(', ')+'.');
   return {...o,status:'resolved' as const};
  }
  if(room?.definitionId==='barrack'&&o.type==='Recruit'){
   const cap=room.size==='Vast'?25:12;
   const recruited=Math.max(0,Math.min(4,cap-(room.defendersAssigned??0)));
   defenders+=recruited;
   facilities=facilities.map(f=>f.id===room.id?{...f,defendersAssigned:(f.defendersAssigned??0)+recruited}:f);
   reports.push('Barrack recruited '+recruited+' Bastion Defenders ('+((room.defendersAssigned??0)+recruited)+'/'+cap+' assigned).');
   return {...o,status:'resolved' as const};
  }
  return {...o,status:'awaiting-dm' as const};
 });
 const events=[...b.events];
 for(const p of complete)reports.push(p.kind==='wall-section'?'Defensive wall section completed.':
   p.kind==='replant-garden'?'Garden replanting completed.':
   (p.kind==='expand-basic'?'Expansion completed: ':'Construction completed: ')+(facilities.find(f=>f.id===p.facilityId)?.name??'Room'));
 for(const o of orders){if(o.status==='awaiting-dm'&&b.orders.find(x=>x.id===o.id)?.status==='active')
   reports.push((facilities.find(f=>f.id===o.facilityId)?.name??'Facility')+' '+o.type+' order finished; review with the DM for its printed outcome.');}
 // A time crossing while away is Maintain. A turn with any issued orders is not Maintain.
 for(let turn=b.lastProcessedTurn+1;turn<=due;turn++){
  if(b.maintainedTurns.includes(turn)||b.visited&&c.location===b.name||b.orders.some(o=>o.issuedTurn===turn))continue;
  const roll=rollD100();const name=resolveBastionEventName(roll);
  events.push({id:id(),turn,roll,name,status:'awaiting-dm'});
  reports.push('Bastion turn '+turn+': Maintain — '+name+'.');
 }
 return updated(c,{...b,facilities,orders,construction:b.construction.filter(p=>p.finishesAt>minute),
  events:events.slice(-120),reports:reports.slice(-80),defenders,stores,lastProcessedTurn:due});
}
export const roomOpportunity=(type:BasicType,biome:BastionBiome):string=>{
 const uses:Record<BasicType,string>={
 'Bedroom':'House guests or displaced travelers','Dining Room':'Host delegations, feasts, or local negotiations',
 'Parlor':'Meet informants or visiting dignitaries','Courtyard':'Receive caravans or organize community gatherings',
 'Kitchen':'Provide hospitality during an emergency','Storage':'Secure recovered cargo or expedition supplies',
 };
 const region:Record<BastionBiome,string>={
 Temperate:'regional travelers',Forest:'woodland residents',Mountain:'stranded mountain travelers',
 Coastal:'captains and port workers',Riverlands:'river traders',Wetlands:'marsh guides',
 Desert:'caravan visitors',Arctic:'cold-weather expeditions',Urban:'guild contacts',
 };
 return uses[type]+'; possible story contacts include '+region[biome]+'. No automatic bonus or payout.';
};
