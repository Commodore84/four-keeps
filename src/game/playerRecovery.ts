import {validPlayerState} from './playerState';
import type {Campaign} from './campaign';
import type {CharacterStats} from './checks';
import {abilityModifier} from './checks';
import {classSummary} from './creationClasses';
export type PlayerResource=NonNullable<CharacterStats['resources']>[string];
/** Level-one pools; shortRecovery is the number restored, not a full reset. */
export function initialPlayerResources(classId:string,charisma:number):NonNullable<CharacterStats['resources']>{
 const pool=(maximum:number,shortRecovery=0):PlayerResource=>({maximum,used:0,recovery:'long',...(shortRecovery?{shortRecovery}:{})});
 switch(classId){
 case 'barbarian':return {Rage:pool(2,1)};
 case 'bard':return {'Bardic Inspiration':pool(Math.max(1,abilityModifier(charisma)))};
 case 'fighter':return {'Second Wind':pool(2,1)};
 case 'ranger':return {'Favored Enemy':pool(2)};
 case 'sorcerer':return {'Innate Sorcery':pool(2)};
 case 'wizard':return {'Arcane Recovery':pool(1)};
 case 'paladin':return {'Lay on Hands':pool(5)};
 default:return {};
 }
}
function importedCharacter(campaign:Campaign){
 const c=campaign.character,cls=classSummary(campaign.characterIdentity?.classId??c?.classId??'');
 if(!c||!cls)throw Error('Imported class statistics are required; legacy Nighthawk uses its existing rest controls');
 if(!validPlayerState(c))throw Error('Invalid player resource state');
 if((c.level??1)!==1&&!(['warlock','wizard'].includes(cls.id)&&(c.level??1)<=4))throw Error('Player recovery currently supports level-one characters or Warlocks through level four');
 if(campaign.pendingCheck||campaign.companionEncounter?.status==='active'||campaign.combat&&campaign.combat.status!=='completed'||campaign.adventureSession?.status==='encounter')throw Error('Finish the encounter and resume exploration before resting');
 if(!Number.isInteger(c.maxHitPoints)||!Number.isInteger(c.currentHitPoints)||c.currentHitPoints!<1||c.currentHitPoints!>c.maxHitPoints!||c.deathSaves?.dead||c.exhaustionLevel===6)throw Error('Start a rest with at least 1 HP and valid living character statistics');
 return {c,cls};
}
/** 2024: wait sixteen hours after finishing a Long Rest before starting another. */
export function playerLongRestWaitMinutes(campaign:Campaign):number{
 return campaign.lastLongRestCompletedAt===undefined?0:Math.max(0,960-((campaign.elapsedMinutes??0)-campaign.lastLongRestCompletedAt));
}
export interface PlayerRestOptions {
 confirmedSafe:boolean;hitDieRolls?:number[];arcaneRecovery?:boolean;arcaneRecoveryLevel?:1|2;arcaneRecoveryCount?:1|2;portentRolls?:number[];waitMinutes?:number;useTrance?:boolean;
}
/** Record a DM-confirmed completed rest; never simulates safety, rolls or interruptions.
 * Rules: D&D Beyond 2024 Rules Glossary + Character Classes (see RULES_IMPLEMENTATION.md).
 */
export function completePlayerRest(campaign:Campaign,kind:'short'|'long',options:PlayerRestOptions,now=new Date().toISOString()):Campaign{
 const {c,cls}=importedCharacter(campaign);
 if(!['short','long'].includes(kind)||options.confirmedSafe!==true)throw Error('Confirm a safe, uninterrupted completed rest');
 const level=c.level??1;const available=campaign.hitDiceRemaining??level,rolls=options.hitDieRolls??[];
 if(!Number.isInteger(available)||available<0||available>level||!Array.isArray(rolls)||rolls.length>available||rolls.some(d=>!Number.isInteger(d)||d<1||d>cls.hitDie)||kind==='long'&&rolls.length)throw Error('Invalid Hit Dice expenditure or die result');
 const wait=options.waitMinutes??0,required=kind==='long'?playerLongRestWaitMinutes(campaign):0;
 if(!Number.isSafeInteger(wait)||wait<0||wait!==required)throw Error('Long Rest requires '+required+' minutes of approved waiting before it starts');
 if(options.useTrance&&(kind!=='long'||campaign.characterIdentity?.speciesId!=='elf'))throw Error('Trance is available only to an Elf taking a Long Rest');
 const elapsed=campaign.elapsedMinutes??0;
 if(!Number.isSafeInteger(elapsed)||elapsed<0||campaign.lastLongRestCompletedAt!==undefined&&(!Number.isSafeInteger(campaign.lastLongRestCompletedAt)||campaign.lastLongRestCompletedAt<0||campaign.lastLongRestCompletedAt>elapsed))throw Error('Invalid in-game rest clock');
 if(cls.id==='wizard'&&campaign.importedSubclassId==='wizard-diviner'&&kind==='long'&&(options.portentRolls?.length!==2||options.portentRolls.some(n=>!Number.isInteger(n)||n<1||n>20)))throw Error('Diviner long rest requires two verified Portent d20 rolls');
 const defaults=initialPlayerResources(cls.id,c.scores.cha);
 // Old saves retain spent counts. Recovery policy comes from the class, not saved labels.
 const resources=Object.fromEntries(Object.entries(c.resources??{}).map(([name,p])=>[name,{...p,used:kind==='long'?0:Math.max(0,p.used-(defaults[name]?.shortRecovery??(p.recovery==='short'?p.maximum:0)))}]));
 if(kind==='long')for(const [name,p] of Object.entries(defaults))if(!Object.hasOwn(resources,name))resources[name]=p;
 let slots=c.spellSlots?{...c.spellSlots}:undefined;
 if(slots&&(!Number.isInteger(slots.level1)||!Number.isInteger(slots.usedLevel1)||slots.usedLevel1<0||slots.usedLevel1>slots.level1))throw Error('Invalid spell-slot state');
 if(slots&&(slots.level2!==undefined||slots.usedLevel2!==undefined)&&(!Number.isInteger(slots.level2)||!Number.isInteger(slots.usedLevel2)||slots.level2!<0||slots.usedLevel2!<0||slots.usedLevel2!>slots.level2!))throw Error('Invalid second-level spell slots');
 if(options.arcaneRecovery){
  const pool=resources['Arcane Recovery'];
  if(kind!=='short'||cls.id!=='wizard'||!pool||pool.used>=pool.maximum||!slots||slots.usedLevel1<1&&(slots.usedLevel2??0)<1)throw Error('Arcane Recovery unavailable');
  // At Wizard 1, recover one expended level-one slot, once per Long Rest.
  const rank=options.arcaneRecoveryLevel??1,count=options.arcaneRecoveryCount??1,budget=Math.ceil((c.level??1)/2);
  const available=rank===1?slots.usedLevel1:slots.usedLevel2??0;
  if(![1,2].includes(rank)||!Number.isInteger(count)||count<1||count>2||rank*count>budget||count>available)throw Error('Arcane Recovery exceeds level-based slot budget or spent slots');
  if(rank===1)slots.usedLevel1-=count;else slots.usedLevel2=(slots.usedLevel2??0)-count;
  resources['Arcane Recovery']={...pool,used:pool.used+1};
 }
 if(slots&&(kind==='long'||cls.id==='warlock'))slots.usedLevel1=0;
 if(slots&&kind==='long'&&slots.level2!==undefined)slots.usedLevel2=0;
 const healing=rolls.reduce((total,die)=>total+Math.max(1,die+abilityModifier(c.scores.con)),0);
 const hp=kind==='long'?c.maxHitPoints!:Math.min(c.maxHitPoints!,c.currentHitPoints!+healing);
 const duration=kind==='short'?60:options.useTrance?240:480;
 const end=elapsed+wait+duration;
 if(!Number.isSafeInteger(end))throw Error('In-game clock exceeds safe range');
 const exhaustion=kind==='long'&&c.exhaustionLevel!==undefined?Math.max(0,c.exhaustionLevel-1):c.exhaustionLevel;
 const conditions=kind==='long'&&exhaustion===0?c.conditions?.filter(s=>s!=='Exhaustion'):c.conditions;
 const character={...c,currentHitPoints:hp,spellSlots:slots,resources,conditions,exhaustionLevel:exhaustion};
 return {...campaign,...(cls.id==='wizard'&&campaign.importedSubclassId==='wizard-diviner'&&kind==='long'?{importedWizardPortents:[...(options.portentRolls??[])]}:{}),character,hitDiceRemaining:kind==='long'?Math.min(level,available+Math.max(1,Math.ceil(level/2))):available-rolls.length,elapsedMinutes:end,lastLongRestCompletedAt:kind==='long'?end:campaign.lastLongRestCompletedAt,concentration:kind==='long'&&!options.useTrance?undefined:campaign.concentration,updatedAt:now,journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',createdAt:now,text:(campaign.characterIdentity?.name??'Player')+' completes a '+kind+' rest ('+duration+' minutes'+(wait?', after '+wait+' minutes approved waiting':'')+'). HP '+c.currentHitPoints+' → '+hp+'. Hit Dice '+(kind==='long'?Math.min(level,available+Math.max(1,Math.ceil(level/2))):available-rolls.length)+'/'+level+'.'+(options.arcaneRecovery?' Arcane Recovery restored '+(options.arcaneRecoveryCount??1)+' level-'+(options.arcaneRecoveryLevel??1)+' slot(s).':'')}]};
}
/** Magical Cunning: 1-minute ritual, once per long rest, recover half Pact slots (rounded up). */
export function performWarlockMagicalCunning(campaign:Campaign):Campaign{
 const ch=campaign.character,pool=ch?.resources?.['Magical Cunning'],slots=ch?.spellSlots;
 if(campaign.characterIdentity?.classId!=='warlock'||(ch?.level??0)<2||!ch||!pool||!slots||pool.used>=pool.maximum||slots.usedLevel1<1)throw Error('Magical Cunning is unavailable');
 if(campaign.pendingCheck||campaign.companionEncounter?.status==='active'||campaign.adventureSession?.status==='encounter'||campaign.combat&&campaign.combat.status!=='completed')throw Error('Magical Cunning requires exploration outside combat');
 const recovered=Math.min(slots.usedLevel1,Math.ceil(slots.level1/2));
 return {...campaign,character:{...ch,spellSlots:{...slots,usedLevel1:slots.usedLevel1-recovered},resources:{...ch.resources,'Magical Cunning':{...pool,used:pool.used+1}}},elapsedMinutes:(campaign.elapsedMinutes??0)+1,updatedAt:new Date().toISOString(),journal:[...campaign.journal,{id:crypto.randomUUID(),kind:'system',createdAt:new Date().toISOString(),text:`Magical Cunning: 1 minute spent; ${recovered} Pact Magic slot restored.`}]};
}
