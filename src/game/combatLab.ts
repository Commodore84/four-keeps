import {newCampaign,type Campaign} from './campaign';
import {reviewCharacter} from './creationReview';
import {ITEMS} from './creationEquipment';
import {isHealingPotion} from './healingPotions';
import {isStrengthPotion} from './temporaryEffects';
import type {CharacterStats} from './checks';
import {buildSoloEncounter,SOLO_ROGUE_ENCOUNTERS,type SoloEncounterId} from './encounterDirector';
import {restorePracticeEncounter} from './practiceEncounterBridge';
import {validateGeneratedBattlefield,generateBattlefield} from './battlefieldGenerator';

/** A disposable campaign built through precisely the same encounter director,
 * generated geometry, and classic-combat handoff as normal DM play.
 * No production combat engine is forked or simulated by the lab.
 */
export const COMBAT_LAB_SCENARIOS=['warehouse-vermin','roadside-bandit','ruins-goblin-scouts'] as const;
export type CombatLabRecord={environment:SoloEncounterId;seed:string;originCampaignId?:string;createdAt:string};

export function isCombatLab(campaign:Campaign|null|undefined):boolean{
 return !!campaign?.combatLab;
}
/** One encounter = one clean-room loadout. This is NOT a long rest or a
 * campaign transaction: only the disposable lab clone is replenished. */
const trainingSupplyNames=new Set([
 'Acid','Alchemist’s Fire',"Alchemist's Fire",'Antitoxin','Ball Bearings','Caltrops',
 'Candle','Holy Water','Oil','Poison, Basic','Rations','Torch',
 "Healer's Kit",'Healer’s Kit','Hunting Trap'
]);
const trainingAmmoNames=new Set(ITEMS.filter(item=>item.category==='ammunition').map(item=>item.name));
function isPracticeConsumable(name:string):boolean{
 return trainingAmmoNames.has(name)||trainingSupplyNames.has(name)||isHealingPotion(name)||
   isStrengthPotion(name)||name.startsWith('Potion of ');
}
function maxSupply(name:string,now:number,baseline:number):number{
 if(name==='Arrows'||trainingAmmoNames.has(name))return Math.max(20,now,baseline);
 if(name==='Dagger')return Math.max(2,now,baseline);
 return Math.max(1,now,baseline);
}
function refreshedCharacter(character:CharacterStats):CharacterStats{
 const slots=character.spellSlots;
 const newSlots=slots?{...slots}:undefined;
 if(newSlots)for(let level=1;level<=9;level++){
  const key=('usedLevel'+level) as keyof typeof newSlots;
  if(newSlots[key]!==undefined)(newSlots as unknown as Record<string,number>)[key]=0;
 }
 return {...character,
  currentHitPoints:character.maxHitPoints??10,
  temporaryHitPoints:0,
  deathSaves:{successes:0,failures:0,stable:false,dead:false},
  conditions:[],exhaustionLevel:0,
  ...(newSlots?{spellSlots:newSlots}:{}),
  ...(character.resources?{resources:Object.fromEntries(Object.entries(character.resources).map(([name,pool])=>
    [name,{...pool,used:0}]))}:{}),
 };
}
function freshTrainingGear(source:Campaign|null,ready:Campaign){
 const starting=new Map<string,number>();
 if(source?.characterBuild)try{
  // Baseline includes the original pack contents, even if the real character
  // has consumed the last potion or arrow since character creation.
  for(const row of reviewCharacter(source.characterBuild).equipment)
   starting.set(row.name,(starting.get(row.name)??0)+row.quantity);
 }catch{ /* Imported older/custom drafts may not be reviewable. */ }
 const sourceRows=source?.inventoryLedger?.gear??[];
 const rows=sourceRows.map(row=>({...row}));
 for(const [name,qty] of starting){
  if(!isPracticeConsumable(name)&&name!=='Dagger')continue;
  if(!rows.some(row=>row.name===name))rows.push({name,quantity:qty});
 }
 for(const row of rows){
  if(isPracticeConsumable(row.name)||row.name==='Dagger')
   row.quantity=maxSupply(row.name,row.quantity,starting.get(row.name)??0);
 }
 // The original classic Rogue engine consumes these four counters rather
 // than the inventory ledger. Keep both views of each supply synchronized.
 const count=(name:string)=>rows.find(row=>row.name===name)?.quantity??0;
 const stored=source?.equipment??ready.equipment;
 const labEquipment={
  daggers:Math.max(2,stored?.daggers??0,count('Dagger')),
  arrows:Math.max(20,stored?.arrows??0,count('Arrows')),
  caltrops:Math.max(stored?.caltrops??0,count('Caltrops')),
  ballBearings:Math.max(stored?.ballBearings??0,count('Ball Bearings')),
 };
 if(source?.inventoryLedger){
  // If an item was on the sheet (even at zero), the test copy receives a
  // usable amount; no unrelated consumable is invented.
  if(sourceRows.some(row=>row.name==='Caltrops'))labEquipment.caltrops=Math.max(1,labEquipment.caltrops);
  if(sourceRows.some(row=>row.name==='Ball Bearings'))labEquipment.ballBearings=Math.max(1,labEquipment.ballBearings);
 }
 for(const [name,amount] of [['Arrows',labEquipment.arrows],['Dagger',labEquipment.daggers],
  ['Caltrops',labEquipment.caltrops],['Ball Bearings',labEquipment.ballBearings]] as const){
  const row=rows.find(item=>item.name===name);
  if(row)row.quantity=Math.max(row.quantity,amount);
 }
 return {equipment:labEquipment,
  ...(source?.inventoryLedger?{inventoryLedger:{currency:{...source.inventoryLedger.currency},gear:rows}}:{})};
}

export function makeCombatLabEncounter(environment:SoloEncounterId,seed:string,origin?:Campaign|null,now=new Date().toISOString()):Campaign{
 if(!COMBAT_LAB_SCENARIOS.includes(environment)||!/^[-a-zA-Z0-9_]{4,90}$/.test(seed))throw Error('Invalid reproducible encounter seed or environment.');
 const id='combat-lab-'+crypto.randomUUID();
 const originCampaignId=origin?.combatLab?.originCampaignId??(origin&&!origin.combatLab?origin.id:undefined);
 const scenario=buildSoloEncounter(environment,'combat-lab',seed).scenario;
 const title='Combat Lab · '+SOLO_ROGUE_ENCOUNTERS[environment].name;
 const starting=newCampaign(title,id,now);
 const lab:CombatLabRecord={environment,seed,createdAt:now,...(originCampaignId?{originCampaignId}:{})};
 // Use the same classic combat handoff as real DM-confirmed tactical encounters.
 // Clone a Rogue's sheet/gear into a distinct lab campaign only; do not persist
 // anything back to the source adventure.
 const source=origin&&!origin.combatLab?origin:null;
 const canUseSheet=source?.characterIdentity?.classId==='rogue'&&!!source?.character;
 const staged:Campaign={
   ...starting,combatLab:lab,location:'Combat Lab',
   ...(source?.familiar?{familiar:{...structuredClone(source.familiar),status:'active' as const,hp:1}}:{ }),
   ...(source?.magicEquipment?{magicEquipment:Object.fromEntries(Object.entries(source.magicEquipment).map(([id,item])=>[
    id,{...structuredClone(item),...(id.startsWith('wand-')?{charges:7,copies:item.copies?.map(copy=>({...copy,charges:7}))}:{})}
   ])) as Campaign['magicEquipment']}:{}),
   ...(canUseSheet?{
     character:refreshedCharacter(structuredClone(source!.character!)),
     hitDiceRemaining:source!.character!.level??1,
     characterIdentity:structuredClone(source.characterIdentity),
     ...(source.characterBuild?{characterBuild:structuredClone(source.characterBuild)}:{}),
     ...(source.equipment?{equipment:structuredClone(source.equipment)}:{}),
     ...(source.inventoryLedger?{inventoryLedger:structuredClone(source.inventoryLedger)}:{})
   }:{}),
   adventureSession:{status:'exploring',site:'frontier',characterSource:'campaign-character',
     visited:['frontier'],interactions:[],
     pendingEncounter:{enemyName:SOLO_ROGUE_ENCOUNTERS[environment].name,actionId:id,scenario}
   }
 };
 const ready=restorePracticeEncounter(staged);
 // Refill at creation only; actions in this encounter still spend real
 // ammunition, charges and consumables through the existing rules engine.
 const supplies=freshTrainingGear(source,ready);
 const supplied:Campaign={...ready,...supplies,
   ...(source?.inventoryLedger?.gear.some(item=>item.name==="Healer's Kit"||item.name==='Healer’s Kit')
    ?{healerKitUsesRemaining:10}:{}),
   ...(source?.inventoryLedger?.gear.some(item=>item.name==='Waterskin')?{waterskinPints:4}:{}),
   combat:ready.combat?{...ready.combat,arrowsRemaining:supplies.equipment.arrows,
     daggersAvailable:supplies.equipment.daggers,daggersThrown:0}:undefined};
 if(!supplied.combat?.battlefield||supplied.combat.classicAdventure?.origin!=='dm'||supplied.combat.status!=='awaiting-initiative')
   throw Error('The shared encounter engine could not start this generated scenario.');
 return supplied;
}

export function sampleRandomCombatLab(nextUint32:()=>number):{environment:SoloEncounterId;seed:string}{
 const n=nextUint32();
 if(!Number.isSafeInteger(n)||n<0||n>0xffffffff)throw Error('Invalid random encounter sample.');
 const environment=COMBAT_LAB_SCENARIOS[n%COMBAT_LAB_SCENARIOS.length];
 // The full random value becomes the reproducible seed, not just the index.
 return {environment,seed:'lab-'+n.toString(16).padStart(8,'0')};
}
/** Replay scenario geometry in tests/debugging without consulting generated art. */
export function replayCombatLabGeometry(record:CombatLabRecord){
 const generated=generateBattlefield(record.environment,record.seed);
 if(!validateGeneratedBattlefield(generated))throw Error('Saved test seed no longer generates a valid battlefield.');
 return generated;
}
