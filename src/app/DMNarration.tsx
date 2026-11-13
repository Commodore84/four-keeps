import {useEffect,useRef,useState} from 'react';

export type NarrationSpeed='slow'|'normal'|'fast'|'instant';
const delay:Record<NarrationSpeed,number>={slow:850,normal:520,fast:260,instant:0};
export function narrationLines(text:string):string[]{
  return text.split(/(\n+)/).flatMap(part=>{
    if(/^\n+$/.test(part))return [''];
    const words=part.trim().split(/\s+/).filter(Boolean);
    const lines:string[]=[];let line='';
    for(const word of words){
      if(line && (line.length+word.length+1>70 || (/[.!?][”"']?$/.test(line)&&line.length>=30))){lines.push(line);line='';}
      line+=(line?' ':'')+word;
    }
    if(line)lines.push(line);
    return lines;
  });
}
export function DMNarration({id,text,speed,animate,onComplete}:{id:string;text:string;speed:NarrationSpeed;animate:boolean;onComplete:()=>void}){
 const lines=narrationLines(text);
 const [visible,setVisible]=useState(animate&&speed!=='instant'?1:lines.length);
 const end=useRef<HTMLSpanElement>(null);
 const complete=visible>=lines.length;
 useEffect(()=>{
   if(complete)return;
   if(speed==='instant'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisible(lines.length);onComplete();return;}
   const timer=window.setTimeout(()=>{
     setVisible(n=>Math.min(n+1,lines.length));
     if(visible+1>=lines.length)onComplete();
   },lines[visible-1]===''?delay[speed]*1.5:delay[speed]);
   return ()=>window.clearTimeout(timer);
 },[visible,speed,lines.length,complete,onComplete]);
 useEffect(()=>{if(!complete)end.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[visible,complete]);
 return <div aria-label="Dungeon Master narration" className="mt-2 whitespace-pre-wrap leading-7 text-parchment/90" onClick={()=>{setVisible(lines.length);onComplete();}} role={!complete?'button':undefined} tabIndex={!complete?0:undefined} onKeyDown={e=>{if(!complete&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setVisible(lines.length);onComplete();}}} title={!complete?'Tap to reveal all narration':undefined}>
   {lines.map((line,index)=>index<visible?<span key={id+'-'+index} className={animate&&speed!=='instant'?'dm-narration-line':''} style={{display:'block',minHeight:line?'auto':'0.75rem'}}>{line}{line?' ':''}</span>:null)}
   <span ref={end}/>
 </div>;
}
