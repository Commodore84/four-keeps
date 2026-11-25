import type {Battlefield,BattlefieldObject} from '../game/battlefield';

/** Stable presentation keys; the game rules and persisted objects never depend on art.
 * CSS owns the 17 bundled vectors once rather than duplicating large image data
 * inside every cell's inline style on multi-thousand-square battlefields. */
export function battlefieldTileName(map:Battlefield,object?:BattlefieldObject):string{
 if(object)return object.kind==='door'&&object.open?'door-open':object.kind;
 return map.theme==='warehouse'?'floor-warehouse':map.theme==='roadside'?'floor-roadside':'floor-ruins';
}
