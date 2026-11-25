import type {Item} from './creationEquipment';
import type {DamageType} from './subclassCombatRules';

export function weaponAttackProfile(item:Item,thrown=false) {
 const properties=item.properties??[];
 const ammunition=properties.find(property=>property.startsWith('Ammunition '));
 const throwing=properties.find(property=>property.startsWith('Thrown '));
 const rangedWeapon=!!ammunition||item.id==='dart'||item.id==='net';
 const reach=properties.includes('Reach')?10:5;
 const rangeProperty=ammunition??(thrown||rangedWeapon?throwing:undefined);
 const range=rangeProperty?.match(/ (\d+)\/(\d+)/);
 const damage=item.damage?.match(/\b(bludgeoning|piercing|slashing)$/i)?.[1];
 return {
  ranged:!!range,
  versatileDamage:properties.find(property=>property.startsWith('Versatile '))?.slice(10),
  rangedWeapon,
  reach,
  normalRange:range?Number(range[1]):reach,
  maximumRange:range?Number(range[2]):reach,
  heavy:properties.includes('Heavy'),
  needsFreeHand:properties.includes('Two-Handed')||!!ammunition,
  damageType:damage?(damage[0].toUpperCase()+damage.slice(1)) as DamageType:undefined,
 };
}

export type AmmunitionName='Arrows'|'Bolts'|'Crossbow Bolts'|'Needles'|'Bullets, Sling (20)'|'Sling Bullets'|'Bullets, Firearm';

export function ammunitionNamesForWeapon(item:Item):AmmunitionName[] {
 const kind=item.properties?.find(property=>property.startsWith('Ammunition '))?.split(';')[1];
 if(kind==='Arrow')return ['Arrows'];
 if(kind==='Bolt')return ['Bolts','Crossbow Bolts'];
 if(kind==='Needle')return ['Needles'];
 if(kind==='Bullet')return item.id==='sling'?['Bullets, Sling (20)','Sling Bullets']:['Bullets, Firearm'];
 return [];
}
