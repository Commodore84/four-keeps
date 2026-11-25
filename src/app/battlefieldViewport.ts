/** The classic combat map owns full scroll geometry, but renders only
 * nearby interactive cells. At extreme Fit zoom a coarse sample bounds DOM cost.
 */
export type BattlefieldViewport={width:number;height:number;zoom:number;left:number;top:number;viewWidth:number;viewHeight:number};
export type BattlefieldWindow={minX:number;maxX:number;minY:number;maxY:number;stride:number;count:number;overview:boolean};
export function battlefieldWindow(view:BattlefieldViewport,overscan=3,maxCells=2200):BattlefieldWindow{
 const {width,height}=view;
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('Invalid viewport dimensions.');
 const cell=Math.max(.01,21*view.zoom);
 const spanX=Math.max(1,view.viewWidth),spanY=Math.max(1,view.viewHeight);
 const left=Math.max(0,view.left),top=Math.max(0,view.top);
 const minX=Math.min(width-1,Math.max(0,Math.floor(left/cell)-overscan));
 const minY=Math.min(height-1,Math.max(0,Math.floor(top/cell)-overscan));
 const maxX=Math.min(width-1,Math.max(minX,Math.ceil((left+spanX)/cell)+overscan));
 const maxY=Math.min(height-1,Math.max(minY,Math.ceil((top+spanY)/cell)+overscan));
 const area=(maxX-minX+1)*(maxY-minY+1);
 const stride=Math.max(1,Math.ceil(Math.sqrt(area/maxCells)));
 return {minX,maxX,minY,maxY,stride,count:Math.ceil((maxX-minX+1)/stride)*Math.ceil((maxY-minY+1)/stride),overview:stride>1};
}
export function battlefieldVisibleIndices(view:BattlefieldViewport,focus:{x:number;y:number}[]=[]):{window:BattlefieldWindow;indices:number[]}{
 const window=battlefieldWindow(view),{width,height}=view,indices:number[]=[];
 for(let y=window.minY;y<=window.maxY;y+=window.stride)
  for(let x=window.minX;x<=window.maxX;x+=window.stride)indices.push(y*width+x);
 for(const p of focus)if(p&&p.x>=window.minX&&p.x<=window.maxX&&p.y>=window.minY&&p.y<=window.maxY&&p.x>=0&&p.x<width&&p.y>=0&&p.y<height&&!indices.includes(p.y*width+p.x))indices.push(p.y*width+p.x);
 return {window,indices};
}
