import {battlefieldBlocked,battlefieldContains,type Battlefield,type BattlefieldObject,type BattlefieldObjectKind,type BattlefieldPoint} from './battlefield';

export type BattlefieldEnvironment='warehouse-vermin'|'roadside-bandit'|'ruins-goblin-scouts';
export type GeneratedBattlefield={battlefield:Battlefield;starts:BattlefieldPoint[];enemyStarts:BattlefieldPoint[];exits:BattlefieldPoint[]};
function random(seed:string){
 let state=2166136261;
 for(let i=0;i<seed.length;i++)state=Math.imul(state^seed.charCodeAt(i),16777619);
 return (min:number,max:number)=>{state=(Math.imul(state,1664525)+1013904223)|0;return min+((state>>>0)%(max-min+1));};
}
/** All designated starts and exits must belong to the same traversable region.
 * Four-direction flood fill deliberately requires at least cardinal access. */
export function validateBattlefieldAccess(map:Battlefield,points:BattlefieldPoint[]):boolean{
 if(!points.length||points.some(p=>battlefieldBlocked(map,p)))return false;
 const key=(p:BattlefieldPoint)=>p.x+','+p.y;
 const queue=[points[0]],visited=new Set([key(points[0])]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
   const n={x:p.x+dx,y:p.y+dy};if(!battlefieldContains(map,n)||battlefieldBlocked(map,n)||visited.has(key(n)))continue;
   visited.add(key(n));queue.push(n);
  }
 }
 return points.every(p=>visited.has(key(p)));
}
/** Conservative measure of immediate tactical routes from a spawn. */
export function battlefieldApproachCount(map:Battlefield,start:BattlefieldPoint):number{
 return [[0,1],[0,-1],[1,0],[-1,0]].filter(([dx,dy])=>!battlefieldBlocked(map,{x:start.x+dx,y:start.y+dy})).length;
}
export function validateGeneratedBattlefield(result:GeneratedBattlefield):boolean{
 const {battlefield,starts,enemyStarts,exits}=result;
 if(!validateBattlefieldAccess(battlefield,[...starts,...enemyStarts,...exits]))return false;
 if(new Set([...starts,...enemyStarts].map(p=>p.x+','+p.y)).size!==starts.length+enemyStarts.length)return false;
 if(starts.some(p=>enemyStarts.some(q=>Math.max(Math.abs(p.x-q.x),Math.abs(p.y-q.y))<2)))return false;
 return [...starts,...enemyStarts].every(p=>battlefieldApproachCount(battlefield,p)>=2);
}
export function generateBattlefield(environment:BattlefieldEnvironment,seed:string):GeneratedBattlefield{
 const pick=random(environment+':'+seed);
 const [width,height]=environment==='warehouse-vermin'?[40,32]:environment==='roadside-bandit'?[32,60]:[48,40];
 const objects:BattlefieldObject[]=[];
 const add=(kind:BattlefieldObjectKind,x:number,y:number,w=1,h=1)=>objects.push({id:kind+'-'+objects.length,kind,x,y,width:w,height:h,asset:kind});
 const mid=Math.floor(height/2);
 const starts=[{x:3,y:mid},{x:3,y:mid+1}];
 const enemyStarts=[{x:9,y:mid-2},{x:11,y:mid+3}];
 const exits=[{x:0,y:mid},{x:width-1,y:mid}];
 if(environment==='warehouse-vermin'){
  // Perimeter and two entrances; repeated cargo bays separated by generous aisles.
  add('wall',0,0,width,1);add('wall',0,height-1,width,1);
  for(const x of [0,width-1]){add('wall',x,1,1,mid-2);add('wall',x,mid+2,1,height-mid-3);}
  for(let x=7;x<width-5;x+=7){
   add('cargo',x,pick(3,5),3,4);add('cargo',x,pick(mid+7,mid+9),3,4);
   add('crate',x+1,mid-6,2,2);
  }
  add('table',7,mid+1,2,1);add('chair',6,mid+2);add('pillar',18,mid-1);
 }else if(environment==='roadside-bandit'){
  // A broad open road with scattered terrain to either side, not a sealed corridor.
  for(let y=4;y<height-4;y+=6){
   if(Math.abs(y-mid)<6)continue;
   add('tree',pick(3,9),y,2,2);add('rock',pick(20,27),y+1,2,1);
   add('undergrowth',pick(2,6),y+2,3,2);
  }
  add('rock',7,mid-3,2,1);add('tree',13,mid+4,2,2);add('undergrowth',5,mid+2,3,2);
 }else{
  // Broken walls deliberately leave multiple breaches; rubble adds movement tradeoffs.
  for(let x=13;x<width-4;x+=10){
   add('wall',x,5,1,pick(6,9));add('wall',x,mid+6,1,pick(5,9));
   add('rubble',x-2,mid-6,3,2);add('pillar',x+2,mid+1);
  }
  add('wall',7,mid-6,4,1);add('wall',14,mid-2,1,3);
  add('rubble',6,mid+1,2,2);add('rock',10,mid+5,2,1);
 }
 const battlefield={width,height,objects};
 const result={battlefield,starts,enemyStarts,exits};
 if(!validateGeneratedBattlefield(result))throw Error('Generated battlefield has inaccessible, overlapping or trapped starting positions.');
 return result;
}
