/** Shared, serializable physical geometry. Coordinates are five-foot cells.
 * The renderer consumes this same data; images never determine rules. */
export type BattlefieldPoint={x:number;y:number};
export type BattlefieldObjectKind='wall'|'pillar'|'table'|'chair'|'crate'|'cargo'|'rock'|'tree'|'door'|'window'|'rubble'|'water'|'undergrowth';
export type BattlefieldObject={id:string;kind:BattlefieldObjectKind;x:number;y:number;width:number;height:number;asset?:string;open?:boolean;
 /** Optional 2024 DMG fixture stats. Undefined preserves historical saves and ordinary objects. */
 locked?:boolean;lockDC?:10|15|20;lockComplexity?:'simple'|'complex';lockProgress?:number;
 forceDC?:number;material?:'glass'|'wood'|'stone'|'iron';hp?:number;destroyed?:boolean};
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
export const battlefieldObjectBlocks=(o:BattlefieldObject)=>!o.destroyed&&properties[o.kind].blocked&&!((o.kind==='door'||o.kind==='window')&&o.open);
export const battlefieldBlocked=(map:Battlefield,p:BattlefieldPoint)=>!battlefieldContains(map,p)||objectAt(map,p).some(battlefieldObjectBlocks);
export function toggleBattlefieldOpening(map:Battlefield,id:string,occupied:BattlefieldPoint[]=[]):Battlefield{
 const opening=map.objects.find(o=>o.id===id);
 if(!opening||(opening.kind!=='door'&&opening.kind!=='window'))throw Error('That object is not an interactive door or window.');
 if(opening.destroyed)throw Error('This fixture is destroyed.');
 if(opening.locked&&!opening.open)throw Error('This fixture is locked.');
 if(opening.open&&occupied.some(point=>point.x>=opening.x&&point.x<opening.x+opening.width&&point.y>=opening.y&&point.y<opening.y+opening.height))throw Error('A creature is standing in the '+(opening.kind==='door'?'doorway':'window opening')+'.');
 return {...map,objects:map.objects.map(o=>o.id===id?{...o,open:!o.open}:o)};
}
/** Historical door-only API retained for compatibility. */
export function toggleBattlefieldDoor(map:Battlefield,id:string,occupied:BattlefieldPoint[]=[]):Battlefield{
 if(map.objects.find(o=>o.id===id)?.kind!=='door')throw Error('That object is not an interactive door.');
 return toggleBattlefieldOpening(map,id,occupied);
}
export function battlefieldOpeningWithinReach(opening:BattlefieldObject,point:BattlefieldPoint):boolean{
 return Math.max(opening.x-1-point.x,point.x-(opening.x+opening.width),opening.y-1-point.y,point.y-(opening.y+opening.height))<=0;
}
export const battlefieldDoorWithinReach=battlefieldOpeningWithinReach;
export const battlefieldDifficult=(map:Battlefield,p:BattlefieldPoint)=>objectAt(map,p).some(o=>properties[o.kind].difficult||(o.kind==='window'&&(o.open||o.destroyed)));
/** An object is transparent to sight when open or shattered. */
export const battlefieldObjectCover=(o:BattlefieldObject):0|2|5|'total'=>o.destroyed||((o.kind==='door'||o.kind==='window')&&o.open)?0:properties[o.kind].cover;
export function validateBattlefield(value:unknown):Battlefield{
 if(!value||typeof value!=='object')throw Error('Invalid battlefield geometry.');
 const m=value as Battlefield;
 if(!Number.isSafeInteger(m.width)||!Number.isSafeInteger(m.height)||m.width<1||m.height<1||!Number.isSafeInteger(m.width*m.height)||!Array.isArray(m.objects))throw Error('Invalid battlefield dimensions.');
 // Geometry/pathfinding budget while oversized procedural maps are assessed.
 // Viewport virtualization separately limits rendered DOM cells.
 if(m.width*m.height>65536)throw Error('Battlefield exceeds the current 65,536-cell rendering budget.');
 const ids=new Set<string>();
 const objects=m.objects.map(o=>{
  if(!o||
   ('open' in o&&(!['door','window'].includes(o.kind)||typeof o.open!=='boolean'))||
   ('locked' in o&&(!['door','window'].includes(o.kind)||typeof o.locked!=='boolean'))||
   ('lockDC' in o&&(!['door','window'].includes(o.kind)||![10,15,20].includes(o.lockDC!)))||
   ('lockComplexity' in o&&(!['door','window'].includes(o.kind)||!['simple','complex'].includes(o.lockComplexity!)))||
   ('lockProgress' in o&&(!o.locked||o.lockComplexity!=='complex'||!Number.isSafeInteger(o.lockProgress)||o.lockProgress!<0||o.lockProgress!>9))||
   ('forceDC' in o&&(!['door','window'].includes(o.kind)||!Number.isSafeInteger(o.forceDC)||o.forceDC!<5||o.forceDC!>30))||
   ('material' in o&&!['glass','wood','stone','iron'].includes(o.material!))||
   ('hp' in o&&(!Number.isSafeInteger(o.hp)||o.hp!<0||o.hp!>1000))||
   ('destroyed' in o&&(typeof o.destroyed!=='boolean'||o.destroyed&&o.hp!==0))||
   (o.open&&o.locked)||(o.destroyed&&o.locked)||typeof o.id!=='string'||!o.id||ids.has(o.id)||!Object.hasOwn(properties,o.kind)||!battlefieldContains(m,o)||!Number.isSafeInteger(o.width)||!Number.isSafeInteger(o.height)||o.width<1||o.height<1||!battlefieldContains(m,{x:o.x+o.width-1,y:o.y+o.height-1}))throw Error('Invalid battlefield object.');
  ids.add(o.id);return {id:o.id,kind:o.kind,x:o.x,y:o.y,width:o.width,height:o.height,...(typeof o.asset==='string'?{asset:o.asset}:{}),
   ...((o.kind==='door'||o.kind==='window')&&typeof o.open==='boolean'?{open:o.open}:{}),
   ...(typeof o.locked==='boolean'?{locked:o.locked}:{}),
   ...(o.lockDC!==undefined?{lockDC:o.lockDC}:{}),
   ...(o.lockComplexity!==undefined?{lockComplexity:o.lockComplexity}:{}),
   ...(o.lockProgress!==undefined?{lockProgress:o.lockProgress}:{}),
   ...(o.forceDC!==undefined?{forceDC:o.forceDC}:{}),
   ...(o.material!==undefined?{material:o.material}:{}),
   ...(o.hp!==undefined?{hp:o.hp}:{}),
   ...(o.destroyed!==undefined?{destroyed:o.destroyed}:{})};
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
   const c=battlefieldObjectCover(o);if(!c)continue;
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
