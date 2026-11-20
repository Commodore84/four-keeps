import type {Campaign} from './campaign';

export function advanceProvisionsClock(previous:Campaign,next:Campaign):Campaign{
 const tracking=previous.provisionTracking;
 const character=next.character;
 const endDay=Math.floor((next.elapsedMinutes??0)/1440);
 if(!tracking||!character||tracking.nextDay>=endDay||character.deathSaves?.dead)return next;
 let missedFood=tracking.missedFood,foodLevels=tracking.foodLevels,waterLevels=tracking.waterLevels;
 let level=character.exhaustionLevel??0;
 for(let day=tracking.nextDay;day<endDay&&level<6;day++){
  const intake=previous.provisions?.day===day?previous.provisions:undefined;
  missedFood=intake?.rations?0:missedFood+1;
  if(missedFood>=5){foodLevels++;level++}
  if(level<6&&(intake?.waterPints??0)<4){waterLevels++;level++}
 }
 const conditions=level>0?[...new Set([...(character.conditions??[]),'Exhaustion'])]:character.conditions;
 const dead=level===6;
 return {...next,provisionTracking:{nextDay:endDay,missedFood,foodLevels,waterLevels},
  character:{...character,conditions,exhaustionLevel:level,
   ...(dead?{currentHitPoints:0,deathSaves:{successes:0,failures:0,stable:false,dead:true}}:{})}};
}

export function recoverProvisionExhaustion(campaign:Campaign,level:number):number{
 const tracking=campaign.provisionTracking;
 if(!tracking||level<=0)return Math.max(0,level-1);
 const intake=campaign.provisions?.day===Math.floor((campaign.elapsedMinutes??0)/1440)?campaign.provisions:undefined;
 const lockedFood=(intake?.rations??0)<1?tracking.foodLevels:0;
 const lockedWater=(intake?.waterPints??0)<8?tracking.waterLevels:0;
 return level>lockedFood+lockedWater?level-1:level;
}
