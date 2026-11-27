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
/** A generated doorway or window must belong to a continuous architectural
 * wall, never be a stand-alone obstruction in the middle of an open floor.
 * This intentionally applies only to generated scenes, not custom DM maps
 * or historical saved campaigns, which retain their original geometry. */
export function validateGeneratedArchitecture(map:Battlefield):boolean {
 const wallAt=(x:number,y:number)=>map.objects.some(o=>o.kind==='wall'&&x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height);
 for(const opening of map.objects.filter(o=>o.kind==='door'||o.kind==='window')){
  // The opening occupies one cell. Larger authored openings require an
  // explicitly designed multi-cell jamb validator rather than a loophole.
  if(opening.width!==1||opening.height!==1)return false;
  const {x,y}=opening;
  const vertical=wallAt(x,y-1)&&wallAt(x,y+1);
  const horizontal=wallAt(x-1,y)&&wallAt(x+1,y);
  if(!vertical&&!horizontal)return false;
  // A pair of tiny freestanding wall stubs with a door between them still
  // isn't architecture. The connected supporting wall must reach the
  // perimeter, or form a substantial enclosure/partition with two bends.
  const key=(px:number,py:number)=>px+','+py;
  const structural=(px:number,py:number)=>map.objects.some(o=>
    (o.kind==='wall'||o===opening)&&px>=o.x&&px<o.x+o.width&&py>=o.y&&py<o.y+o.height);
  const seen=new Set<string>([key(x,y)]),queue=[{x,y}];
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
    const nx=queue[i].x+dx,ny=queue[i].y+dy,k=key(nx,ny);
    if(nx<0||ny<0||nx>=map.width||ny>=map.height||seen.has(k)||!structural(nx,ny))continue;
    seen.add(k);queue.push({x:nx,y:ny});
  }
  const reachesBoundary=queue.some(p=>p.x===0||p.y===0||p.x===map.width-1||p.y===map.height-1);
  const bends=queue.filter(p=>
    (structural(p.x-1,p.y)||structural(p.x+1,p.y))&&
    (structural(p.x,p.y-1)||structural(p.x,p.y+1))).length;
  if(!reachesBoundary&&(queue.length<8||bends<2))return false;
  if(map.objects.some(other=>other!==opening&&
    x>=other.x&&x<other.x+other.width&&y>=other.y&&y<other.y+other.height))return false;
  // Interior openings must be approachable from both sides once opened.
  // Perimeter loading doors can legitimately face outside the map.
  if(x>0&&x<map.width-1&&y>0&&y<map.height-1){
   const clear=(px:number,py:number)=>!battlefieldBlocked(map,{x:px,y:py});
   if(!((vertical&&clear(x-1,y)&&clear(x+1,y))||
         (horizontal&&clear(x,y-1)&&clear(x,y+1))))return false;
  }
 }
 return true;
}
export function validateGeneratedBattlefield(result:GeneratedBattlefield):boolean{
 const {battlefield,starts,enemyStarts,exits}=result;
 if(!validateGeneratedArchitecture(battlefield))return false;
 if(!validateBattlefieldAccess(battlefield,[...starts,...enemyStarts,...exits]))return false;
 if(new Set([...starts,...enemyStarts].map(p=>p.x+','+p.y)).size!==starts.length+enemyStarts.length)return false;
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
 // The central entry preserves existing initial positioning and nearby-door
 // tests. Warehouse and ruins also have two distinct accessible approaches.
 // Roadside ambushes remain a fixed entry by design.
 const starts=environment==='roadside-bandit'?[{x:3,y:mid}]:
   [{x:3,y:mid},{x:3,y:5},{x:3,y:height-6}];
 // Temporary positions are used while seeded physical clutter is validated.
 // Final enemies are selected in separated tactical zones after scenery.
 const enemyStarts=[{x:9,y:mid-2},{x:11,y:mid+3}];
 const exits=[{x:0,y:environment==='warehouse-vermin'?mid+1:mid},{x:width-1,y:mid}];
 if(environment==='warehouse-vermin'){
  // Perimeter and two entrances; repeated cargo bays separated by generous aisles.
  add('wall',0,0,width,1);add('wall',0,height-1,width,1);
  for(const x of [0,width-1]){add('wall',x,1,1,mid-2);add('wall',x,mid+2,1,height-mid-3);}
  for(let x=7;x<width-5;x+=7){
   add('cargo',x,pick(3,5),3,4);add('cargo',x,pick(mid+7,mid+9),3,4);
   add('crate',x+1,mid-6,2,2);
  }
  // The original freestanding door, two-wall stub, and freestanding window
  // formed no room or corridor. Put the loading door in the actual outer wall.
  // The adjacent open west loading lane (y=mid+1) remains a traversable exit.
  add('door',0,mid-1);add('wall',0,mid);
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
  add('wall',7,mid-6,4,1);
  add('rubble',6,mid+1,2,2);add('rock',10,mid+5,2,1);
  // A small ruined storeroom: connected perimeter walls, one real doorway
  // and a window in the north wall. Both openings have structural jambs.
  // Unlike the previous wall stub these fixtures enclose a meaningful space.
  add('wall',7,3,2,1);add('window',9,3);Object.assign(objects[objects.length-1],{hp:4,material:'glass'});
  add('wall',10,3,2,1);add('wall',7,4,1,3);
  add('door',7,7);Object.assign(objects[objects.length-1],{locked:true,lockDC:15,forceDC:15,material:'wood',hp:18});
  add('wall',7,8,1,3);add('wall',11,4,1,7);add('wall',8,10,3,1);
 }
 const battlefield:Battlefield={width,height,objects,theme:environment==='warehouse-vermin'?'warehouse':environment==='roadside-bandit'?'roadside':'ruins'};
 // Seeded clutter is authored through the same physical object schema as
 // production DM encounters, not painted into the map as decorative pixels.
 // Try a few small props; only retain additions that preserve actual routes.
 const extras:BattlefieldObjectKind[]=environment==='warehouse-vermin'?['crate','cargo','chair']:
    environment==='roadside-bandit'?['rock','tree','undergrowth']:['rubble','rock','pillar'];
 const goal=pick(2,5);
 let added=0;
 for(let attempt=0;attempt<20&&added<goal;attempt++){
  const kind=extras[pick(0,extras.length-1)],x=pick(15,width-6),y=pick(4,height-5);
  if(objects.some(o=>x<o.x+o.width&&x+1>o.x&&y<o.y+o.height&&y+1>o.y))continue;
  add(kind,x,y);
  // Cheap connectivity preflight for scenery iterations. The complete
  // tactical approach/spacing gate runs once on each final spawn candidate.
  if(validateBattlefieldAccess(battlefield,[...starts,...enemyStarts,...exits])&&
     [...starts,...enemyStarts].every(point=>battlefieldApproachCount(battlefield,point)>=2))added++;
  else objects.pop();
 }
 // Most encounters begin with foes roughly 60 feet or more from the default
 // entry. Seeded ambushes put a foe as close as a few squares away. There is
 // no universal minimum player/foe or foe/foe distance.
 const ambush=pick(0,99)<20;
 const near={x0:5,x1:10,y0:mid-5,y1:mid+5};
 const regions=environment==='warehouse-vermin'
   ?[{x0:15,x1:22,y0:6,y1:14},{x0:19,x1:27,y0:20,y1:29}]
   :environment==='roadside-bandit'
   ?[{x0:11,x1:26,y0:7,y1:23},{x0:12,x1:27,y0:38,y1:53}]
   :[{x0:17,x1:29,y0:7,y1:17},{x0:31,x1:43,y0:24,y1:35}];
 if(ambush)regions[0]=near;
 const candidates=regions.map(zone=>{
  const choices:BattlefieldPoint[]=[];
  const seen=new Set<string>();
  for(let i=0;i<140&&choices.length<24;i++){
   const point={x:pick(zone.x0,zone.x1),y:pick(zone.y0,zone.y1)};
   const key=point.x+','+point.y;
   if(seen.has(key))continue;seen.add(key);
   if(battlefieldBlocked(battlefield,point)||battlefieldApproachCount(battlefield,point)<2)continue;
   if(starts.some(start=>start.x===point.x&&start.y===point.y))continue;
   choices.push(point);
  }
  return choices;
 });
 let located=false;
 for(const first of candidates[0]){
  for(const second of candidates[1]){
   if(first.x===second.x&&first.y===second.y)continue;
   // Close enough for advancing rats to contribute within roughly two turns
   // of mutual approach, without clustering two foes into the same lane.
   if(environment==='warehouse-vermin'&&Math.max(Math.abs(first.x-second.x),Math.abs(first.y-second.y))<8)continue;
   const trial={battlefield,starts,enemyStarts:[first,second],exits};
   if(!validateGeneratedBattlefield(trial))continue;
   enemyStarts.splice(0,2,first,second);
   located=true;break;
  }
  if(located)break;
 }
 if(!located)throw Error('Generated encounter cannot place enemies on valid tactical routes.');
 const result={battlefield,starts,enemyStarts,exits};
 return result;
}
