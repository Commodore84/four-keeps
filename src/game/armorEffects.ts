import type {Campaign} from './campaign';
import type {Ability, RollMode} from './checks';
import {armorTrained, ITEM_BY_ID} from './creationEquipment';

export function armorEffects(campaign:Campaign) {
 const classId=campaign.characterIdentity?.classId??campaign.character?.classId;
 const armor=ITEM_BY_ID[campaign.encounterLoadout?.armorId??''];
 const shield=ITEM_BY_ID[campaign.encounterLoadout?.shieldId??''];
 const owns=(name:string)=>campaign.inventoryLedger?.gear.some(row=>row.name===name&&row.quantity>0);
 const wornArmor=armor?.category==='armor'&&owns(armor.name)?armor:undefined;
 const wornShield=shield?.category==='shield'&&owns(shield.name)?shield:undefined;
 const untrainedArmor=!!(classId&&wornArmor&&!armorTrained(classId,wornArmor));
 const speedPenalty=(wornArmor?.strength??0)>(campaign.character?.scores?.str??0)?10:0;
 return {
  speedPenalty, untrainedArmor,
  untrainedShield:!!(classId&&wornShield&&!armorTrained(classId,wornShield)),
  stealthDisadvantage:!!wornArmor?.stealthDisadvantage,
 };
}

export function equipmentRollMode(campaign:Campaign, mode:RollMode, ability:Ability, stealth=false):RollMode {
 const effects=armorEffects(campaign);
 if(!(stealth&&effects.stealthDisadvantage)&&!(effects.untrainedArmor&&(ability==='str'||ability==='dex')))return mode;
 return mode==='advantage'?'normal':'disadvantage';
}

export function requireArmorSpellcasting(campaign:Campaign):void {
 if(armorEffects(campaign).untrainedArmor)throw Error('You cannot cast spells while wearing armor without training.');
}

export function effectiveEquipmentSpeed(campaign:Campaign):number|undefined {
 const speed=campaign.character?.speed;
 return speed===undefined?undefined:Math.max(0,speed-armorEffects(campaign).speedPenalty);
}
