import {armorEffects} from './armorEffects';
import {playerToolTraining} from './playerSheetSummary';
import {ITEM_BY_ID} from './creationEquipment';
import {ownedMagicWearables} from './magicEquipment';
import type {Campaign} from './campaign';
/** Compact saved evidence for AI narration; the AI never performs state mutations. */
export function campaignPlayerContext(c:Campaign){
 const b=c.characterBuild?.selections,battle=c.companionEncounter;
 const owned=(c.inventoryLedger?.gear??[]).filter(item=>item.quantity>0);
 const equipped=Object.values(c.encounterLoadout??{}).flatMap(id=>{
  const item=ITEM_BY_ID[id??''];
  return item&&owned.some(row=>row.name===item.name)?[item.name]:[];
 });
 const magic=ownedMagicWearables(c);
 return {characterIdentity:c.characterIdentity??null,adventureSession:c.adventureSession??null,location:c.location,
 playerBuild:b?{classChoices:b.classChoices??{},spellbook:b.magic?.spellbook??[],invocations:b.magic?.invocations??[],originMagic:b.originMagic??null,equipped:b.equipment?.equipped??null}:null,
 equipment:{owned,tools:Object.values(ITEM_BY_ID).filter(item=>item.category==='tool'&&owned.some(row=>row.name===item.name)).map(item=>item.name),toolProficiencies:playerToolTraining(c).toolNames,armor:armorEffects(c),equipped:[...equipped,...magic.filter(item=>item.worn).map(item=>item.name)],attuned:magic.filter(item=>item.attuned).map(item=>item.name)},
 recovery:{hitDiceRemaining:c.hitDiceRemaining??1,lastLongRestCompletedAt:c.lastLongRestCompletedAt??null},
 sharedEncounter:battle?{status:battle.status,round:battle.round,activeActor:battle.order[battle.turnIndex],participants:Object.entries(battle.participants).map(([id,p])=>({id,hp:p.hp,maxHp:p.maxHp,conditions:p.conditions,actorKind:p.actorKind,actionUsed:p.actionUsed}))}:null};
}
