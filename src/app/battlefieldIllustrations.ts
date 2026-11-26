import type {CSSProperties} from 'react';
import type {Battlefield,BattlefieldObject} from '../game/battlefield';

/** Stable presentation keys; the game rules and persisted objects never depend on art.
 * CSS owns the bundled vectors once rather than duplicating large image data
 * inside every cell's inline style on multi-thousand-square battlefields. */
export function battlefieldTileName(map:Battlefield,object?:BattlefieldObject,x?:number,y?:number):string{
 if(object){
  if(object.destroyed)return object.kind==='door'?'door-broken':object.kind==='window'?'window-shattered':'rubble';
  if(object.kind==='door'&&object.locked)return 'door-locked';
  if((object.kind==='door'||object.kind==='window')&&object.open)return object.kind+'-open';
  // A single multi-square prop uses one stable sprite across all its cells.
  const variant=x===undefined||y===undefined?-1:battlefieldTileVariant(object.x,object.y,object.kind);
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
/** Present one contiguous illustration for a multi-square prop while leaving
 * the actual interactive grid, obstacles and pathfinding entirely unchanged.
 * Walls deliberately repeat as modular masonry, not stretched along their run.
 */
export function battlefieldObjectArtworkStyle(object:BattlefieldObject|undefined,x:number,y:number,zoom:number):CSSProperties|undefined{
 if(!object||(object.width===1&&object.height===1)||object.kind==='wall')return undefined;
 const cell=21*zoom;
 return {backgroundSize:(object.width*cell)+'px '+(object.height*cell)+'px',
  backgroundPosition:((object.x-x)*cell)+'px '+((object.y-y)*cell)+'px',
  backgroundRepeat:'no-repeat'};
}
/** Stable coordinate variation keeps a generated scene consistent across
 * saves and reloads without persisting decorative state. */
export function battlefieldTileVariant(x:number,y:number,kind:string):0|1|2|3{
 let seed=Math.imul(x+101,374761393)^Math.imul(y+71,668265263);
 for(let i=0;i<kind.length;i++)seed=Math.imul(seed^kind.charCodeAt(i),16777619);
 seed=Math.imul(seed^(seed>>>13),1274126177);
 return ((seed^(seed>>>16))&3) as 0|1|2|3;
}
