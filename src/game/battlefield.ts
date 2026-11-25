/** Shared, serializable physical geometry. Coordinates are five-foot cells.
 * The renderer consumes this same data; images never determine rules. */
export type BattlefieldPoint={x:number;y:number};
export type BattlefieldObjectKind='wall'|'pillar'|'table'|'chair'|'crate'|'cargo'|'rock'|'tree'|'door'|'window'|'rubble'|'water'|'undergrowth';
export type BattlefieldObject={id:string;kind:BattlefieldObjectKind;x:number;y:number;width:number;height:number;asset?:string;open?:boolean};
export type Battlefield={width:number;height:number;objects:BattlefieldObject[];theme?:'warehouse'|'roadside'|'ruins'};
const properties:Record<BattlefieldObjectKind,{blocked:boolean;difficult:boolean;cover:0|2|5|'total'}>={
 wall:{blocked:true,difficult:false,cover:'total'},pillar:{blocked:true,difficult:false,cover:'total'},
 table:{blocked:true,difficult:false,cover:2},chair:{blocked:false,difficult:true,cover:2},
 crate:{blocked:true,difficult:false,cover:2},cargo:{blocked:true,difficult:false,cover:5},
 rock:{blocked:true,difficult:false,cover:5},tree:{blocked:true,difficult:false,cover:'total'},
 door:{blocked:true,difficult:false,cover:'total'},window:{blocked:true,difficult:false,cover:5},
 rubble:{blocked:false,difficult:true,cover:0},water:{blocked:false,difficult:true,cover:0},
 undergrowth:{blocked:false,difficult:true,cover:0}
};
export const battlefieldContains=(map:Pick<Battlefield,'width'|'height'>,p:BattlefieldPoint)=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<map.width&&p.y<map.height;
export const objectAt=(map:Battlefield,p:BattlefieldPoint)=>map.objects.filter(o=>p.x>=o.x&&p.x<o.x+o.width&&p.y>=o.y&&p.y<o.y+o.height);
/** Opened doors have no physical footprint for movement or cover.
 * The source map itself remains immutable for save/replay determinism. */
export const battlefieldObjectBlocks=(o:BattlefieldObject)=>properties[o.kind].blocked&&!(o.kind==='door'&&o.open);
export const battlefieldBlocked=(map:Battlefield,p:BattlefieldPoint)=>!battlefieldContains(map,p)||objectAt(map,p).some(battlefieldObjectBlocks);
export function toggleBattlefieldDoor(map:Battlefield,id:string,occupied:BattlefieldPoint[]=[]):Battlefield{
 const door=map.objects.find(o=>o.id===id);
 if(!door||door.kind!=='door')throw Error('That object is not an interactive door.');
 if(door.open&&occupied.some(point=>point.x>=door.x&&point.x<door.x+door.width&&point.y>=door.y&&point.y<door.y+door.height))throw Error('A creature is standing in the doorway.');
 return {...map,objects:map.objects.map(o=>o.id===id?{...o,open:!o.open}:o)};
}
export function battlefieldDoorWithinReach(door:BattlefieldObject,point:BattlefieldPoint):boolean{
 return Math.max(door.x-1-point.x,point.x-(door.x+door.width),door.y-1-point.y,point.y-(door.y+door.height))<=0;
}
export const battlefieldDifficult=(map:Battlefield,p:BattlefieldPoint)=>objectAt(map,p).some(o=>properties[o.kind].difficult);
export function validateBattlefield(value:unknown):Battlefield{
 if(!value||typeof value!=='object')throw Error('Invalid battlefield geometry.');
 const m=value as Battlefield;
 if(!Number.isSafeInteger(m.width)||!Number.isSafeInteger(m.height)||m.width<1||m.height<1||!Number.isSafeInteger(m.width*m.height)||!Array.isArray(m.objects))throw Error('Invalid battlefield dimensions.');
 // Current DOM renderer draws every cell; keep malformed/generated input bounded.
 // This is a rendering budget, not a square dimension or long-term geometry cap.
 if(m.width*m.height>65536)throw Error('Battlefield exceeds the current 65,536-cell rendering budget.');
 const ids=new Set<string>();
 const objects=m.objects.map(o=>{
  if(!o||('open' in o&&(o.kind!=='door'||typeof o.open!=='boolean'))||typeof o.id!=='string'||!o.id||ids.has(o.id)||!Object.hasOwn(properties,o.kind)||!battlefieldContains(m,o)||!Number.isSafeInteger(o.width)||!Number.isSafeInteger(o.height)||o.width<1||o.height<1||!battlefieldContains(m,{x:o.x+o.width-1,y:o.y+o.height-1}))throw Error('Invalid battlefield object.');
  ids.add(o.id);return {id:o.id,kind:o.kind,x:o.x,y:o.y,width:o.width,height:o.height,...(typeof o.asset==='string'?{asset:o.asset}:{}),...(o.kind==='door'&&typeof o.open==='boolean'?{open:o.open}:{})};
 });
 if(m.theme!==undefined&&!['warehouse','roadside','ruins'].includes(m.theme))throw Error('Invalid battlefield environment.');
 return {width:m.width,height:m.height,objects,...(m.theme?{theme:m.theme}:{})};
}
/** Ray/rectangle intersection (open interior, so a grazing corner is clear).
 * Partial cover is evaluated from the attack origin, not the target square. */
export function battlefieldCover(map:Battlefield,from:BattlefieldPoint,to:BattlefieldPoint):0|2|5|'total'{
 if(from.x===to.x&&from.y===to.y)return 0;
 const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
 // Sample across the target's silhouette in the plane perpendicular to the
 // attack. Physical cover heights use the object's profile until 3-D rules exist.
 const rays=[-.4,-.2,0,.2,.4].map(offset=>{
  const tx=to.x-dy/length*offset,ty=to.y+dx/length*offset;
  let fraction=0;
  for(const o of map.objects){
   const c=o.kind==='door'&&o.open?0:properties[o.kind].cover;if(!c)continue;
   let lo=0,hi=1;
   for(const [start,delta,min,max] of [[from.x,tx-from.x,o.x-.5,o.x+o.width-.5],[from.y,ty-from.y,o.y-.5,o.y+o.height-.5]]){
    if(!delta){if(start<=min||start>=max){hi=-1;break;}continue;}
    const a=(min-start)/delta,b=(max-start)/delta;
    lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
   }
   if(hi-lo<=1e-8||hi<=0||lo>=1)continue;
   fraction=Math.max(fraction,c==='total'?1:c===5?.75:.5);
   if(fraction===1)break;
  }
  return fraction;
 });
 if(rays.every(value=>value===1))return 'total';
 const coverage=rays.reduce((sum,value)=>sum+value,0)/rays.length;
 return coverage>=.75?5:coverage>=.5?2:0;
}
