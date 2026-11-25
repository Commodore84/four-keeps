import {battlefieldBlocked,battlefieldContains,battlefieldObjectBlocks,type Battlefield,type BattlefieldObject,type BattlefieldObjectKind,type BattlefieldPoint} from './battlefield';

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
/** Tactical route diversity: how many different initial cardinal lanes can
 * actually reach a target *without returning through the starting square*.
 * This rules out dead-end spurs falsely counted as separate routes. */
export function battlefieldAlternativeApproaches(map:Battlefield,start:BattlefieldPoint,target:BattlefieldPoint):number{
 if(!battlefieldContains(map,start)||!battlefieldContains(map,target))return 0;
 const {width,height}=map,size=width*height,blocked=new Uint8Array(size);
 for(const o of map.objects)if(battlefieldObjectBlocks(o))
  for(let y=o.y;y<o.y+o.height;y++)for(let x=o.x;x<o.x+o.width;x++)blocked[y*width+x]=1;
 const first=start.y*width+start.x,last=target.y*width+target.x;
 if(blocked[first]||blocked[last])return 0;
 // The start is excluded from the flood fill so a branch requiring a U-turn
 // through the player cannot be counted as a distinct tactical approach.
 const visited=new Uint8Array(size),queue=new Int32Array(size),directions=[[0,1],[0,-1],[1,0],[-1,0]];
 let head=0,tail=1;queue[0]=last;visited[first]=1;visited[last]=1;
 while(head<tail){
  const index=queue[head++],x=index%width,y=Math.floor(index/width);
  for(const [dx,dy] of directions){
   const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
   const n=ny*width+nx;if(visited[n]||blocked[n])continue;
   visited[n]=1;queue[tail++]=n;
  }
 }
 return directions.filter(([dx,dy])=>{
  const nx=start.x+dx,ny=start.y+dy;
  return nx>=0&&nx<width&&ny>=0&&ny<height&&visited[ny*width+nx]===1;
 }).length;
}
/** Conservative tactical quality metrics, not a substitute for DM judgment. */
export function battlefieldTacticalProfile(result:GeneratedBattlefield){
 const {battlefield,starts,enemyStarts}=result;
 const coverKinds=new Set(battlefield.objects.filter(o=>['wall','pillar','table','chair','crate','cargo','rock','tree','door','window'].includes(o.kind)).map(o=>o.kind));
 const roughTiles=battlefield.objects.filter(o=>['chair','rubble','water','undergrowth'].includes(o.kind)).reduce((n,o)=>n+o.width*o.height,0);
 return {coverKinds:coverKinds.size,roughTiles,alternativeApproaches:Math.min(...starts.flatMap(start=>enemyStarts.map(enemy=>battlefieldAlternativeApproaches(battlefield,start,enemy))))};
}
export function validateGeneratedBattlefield(result:GeneratedBattlefield):boolean{
 const {battlefield,starts,enemyStarts,exits}=result;
 if(!validateBattlefieldAccess(battlefield,[...starts,...enemyStarts,...exits]))return false;
 if(new Set([...starts,...enemyStarts].map(p=>p.x+','+p.y)).size!==starts.length+enemyStarts.length)return false;
 if(starts.some(p=>enemyStarts.some(q=>Math.max(Math.abs(p.x-q.x),Math.abs(p.y-q.y))<2)))return false;
 if(![...starts,...enemyStarts].every(p=>battlefieldApproachCount(battlefield,p)>=2))return false;
 const profile=battlefieldTacticalProfile(result);
 return profile.coverKinds>=2&&profile.roughTiles>=1&&profile.alternativeApproaches>=2;
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
  // A closable storage partition near the entrance, including an exterior-view window.
  add('door',4,mid+1);add('wall',4,mid+2);add('wall',4,mid+3);
  add('window',22,mid-7,2,1);
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
  add('rubble',6,mid+1,2,2);add('rock',10,mid+5,2,1);add('door',14,mid+1);add('window',24,mid-1);
 }
 const battlefield:Battlefield={width,height,objects,theme:environment==='warehouse-vermin'?'warehouse':environment==='roadside-bandit'?'roadside':'ruins'};
 const result={battlefield,starts,enemyStarts,exits};
 if(!validateGeneratedBattlefield(result))throw Error('Generated battlefield has inaccessible, overlapping or trapped starting positions.');
 return result;
}
