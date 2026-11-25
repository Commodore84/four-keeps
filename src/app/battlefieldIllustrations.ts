import type {Battlefield,BattlefieldObject} from '../game/battlefield';

/** Stable presentation keys; the game rules and persisted objects never depend on art.
 * CSS owns the bundled vectors once rather than duplicating large image data
 * inside every cell's inline style on multi-thousand-square battlefields. */
export function battlefieldTileName(map:Battlefield,object?:BattlefieldObject,x?:number,y?:number):string{
 if(object){
  if((object.kind==='door'||object.kind==='window')&&object.open)return object.kind+'-open';
  const variant=x===undefined||y===undefined?-1:battlefieldTileVariant(x,y,object.kind);
  if(variant===3&&object.kind==='tree')return 'tree-deep';
  if(variant===2&&object.kind==='rock')return 'rock-moss';
  if(variant===1&&object.kind==='crate')return 'crate-weathered';
  if(variant===3&&object.kind==='cargo')return 'cargo-rusted';
  return object.kind;
 }
 const floor=map.theme==='warehouse'?'floor-warehouse':map.theme==='roadside'?'floor-roadside':'floor-ruins';
 if(x===undefined||y===undefined)return floor;
 const variant=battlefieldTileVariant(x,y,floor);
 return floor==='floor-roadside'&&variant===1?'floor-roadside-mud':
        floor==='floor-ruins'&&variant===2?'floor-ruins-cracked':floor;
}
/** Stable coordinate variation keeps a generated scene consistent across
 * saves and reloads without persisting decorative state. */
export function battlefieldTileVariant(x:number,y:number,kind:string):0|1|2|3{
 let seed=Math.imul(x+101,374761393)^Math.imul(y+71,668265263);
 for(let i=0;i<kind.length;i++)seed=Math.imul(seed^kind.charCodeAt(i),16777619);
 seed=Math.imul(seed^(seed>>>13),1274126177);
 return ((seed^(seed>>>16))&3) as 0|1|2|3;
}
