import type {Campaign} from './campaign';
import {ITEMS} from './creationEquipment';
import {classSummary} from './creationClasses';
import {resolveBackground} from './creationOrigins';
import {abilityModifier} from './checks';
import {playerEquippedAttack,playerEquippedDefense} from './companionEncounter';

/** Read-only derived sheet data. Never mutate or infer unconfirmed equipment or proficiencies. */
export function playerSheetSummary(campaign:Campaign){
 const c=campaign.character, identity=campaign.characterIdentity;
 if(!c||!identity)return null;
 const cls=classSummary(identity.classId);
 const background=campaign.characterBuild?resolveBackground(campaign.characterBuild.selections,campaign.characterBuild.rules.allowCompatibleLegacy):undefined;
 const toolReplacement=campaign.characterBuild?.selections.toolReplacement;
 const classTools=cls?.tools??[];
 const toolNames=[...new Set([...classTools,...(background?.tool?[toolReplacement||background.tool]:[])])];
 const owned=(campaign.inventoryLedger?.gear??[]).filter(g=>g.quantity>0);
 const weapons=owned.flatMap(g=>ITEMS.filter(i=>i.category==='weapon'&&i.name.toLowerCase()===g.name.toLowerCase()).map(i=>({item:i,quantity:g.quantity})));
 const equipped=playerEquippedAttack(campaign);
 const proficiencies=c.weaponProficiencies??cls?.weapons??[];
 const attacks=weapons.map(({item,quantity})=>{
  const ranged=item.properties?.some(p=>p.startsWith('Ammunition')||p.startsWith('Range '))||['shortbow','longbow','light-crossbow','heavy-crossbow','hand-crossbow'].includes(item.id);
  const finesse=item.properties?.includes('Finesse');
  const dex=abilityModifier(c.scores.dex),str=abilityModifier(c.scores.str);
  const modifier=ranged?dex:finesse?Math.max(str,dex):str;
  const proficient=proficiencies.includes(item.name)||proficiencies.includes(item.weaponGroup==='simple'?'Simple':'Martial')||(item.weaponGroup==='martial'&&((proficiencies.includes('Martial Light')&&!!item.properties?.includes('Light'))||(proficiencies.includes('Martial (Finesse or Light)')&&!!item.properties?.some(p=>p==='Finesse'||p==='Light'))));
  const selected=campaign.characterBuild?.selections.classChoices?.['weapon-mastery']??[];
  return {name:item.name,quantity,damage:item.damage??'—',attackModifier:modifier+(proficient?c.proficiencyBonus:0),damageModifier:modifier,proficient,mastery:item.mastery??null,masteryTrained:selected.some(x=>x.toLowerCase()===item.name.toLowerCase()),equipped:equipped?.weaponId===item.id};
 });
 const totalWeight=owned.reduce((sum,g)=>sum+g.quantity*(ITEMS.find(i=>i.name.toLowerCase()===g.name.toLowerCase())?.weight??0),0);
 const unverifiedWeight=owned.filter(g=>!ITEMS.some(i=>i.name.toLowerCase()===g.name.toLowerCase())).map(g=>g.name);
 return {armorClass:playerEquippedDefense(campaign)?.armorClass??null,initiative:abilityModifier(c.scores.dex),speed:c.speed,proficiencyBonus:c.proficiencyBonus,tools:toolNames,backgroundTool:background?.tool??null,attacks,totalKnownWeight:totalWeight,unverifiedWeight,inventory:owned};
}
