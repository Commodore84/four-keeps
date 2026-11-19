import {useEffect,useMemo,useRef,useState} from 'react';

export type NarrationSpeed='slow'|'normal'|'fast'|'instant';
export const narrationDelay:Record<NarrationSpeed,number>={slow:1020,normal:624,fast:312,instant:0};
export type NarrationBlock={kind:'narration'|'dialogue';text:string;speaker?:string};

/** A single newline is a soft wrap; blank lines establish paragraph boundaries.
 * Only explicit speaker attributions are presented as named dialogue. */
export function narrationBlocks(text:string):NarrationBlock[]{
 const paragraphs=text.replace(/\r\n?/g,'\n').trim().split(/\n\s*\n+/).filter(Boolean);
 return paragraphs.flatMap(paragraph=>{
  const normalized=paragraph.replace(/\s*\n\s*/g,' ').replace(/[ \t]+/g,' ').trim();
  const named=normalized.match(/^([A-Z][\p{L}'’-]*(?:\s+[A-Z][\p{L}'’-]*){0,3}):\s*([“"].+[”"])$/u);
  if(named)return [{kind:'dialogue' as const,speaker:named[1],text:named[2]}];
  // Dialogue embedded in narration is split only when a speaker is explicitly attributed.
  const attributed=/\b([A-Z][\p{L}'’-]*(?:\s+[A-Z][\p{L}'’-]*){0,2})\s+(?:says|asks|replies|shouts|whispers|calls|murmurs),?\s*([“"][^”"]+[”"])/gu;
  const blocks:NarrationBlock[]=[];let offset=0;
  for(const match of normalized.matchAll(attributed)){
   const at=match.index??0;
   if(/^(?:Someone|Somebody|Nobody|Everyone|Anybody|Voice|A|The)$/i.test(match[1]))continue;
   if(at>offset&&normalized.slice(offset,at).trim())blocks.push({kind:'narration',text:normalized.slice(offset,at).trim()});
   blocks.push({kind:'narration',text:match[0].slice(0,match[0].length-match[2].length).trim()});
   blocks.push({kind:'dialogue',speaker:match[1],text:match[2]});
   offset=at+match[0].length;
  }
  if(offset<normalized.length)blocks.push({kind:'narration',text:normalized.slice(offset).trim()});
  return blocks.length?blocks:[{kind:'narration' as const,text:normalized}];
 });
}

/** Animation units never create visual line breaks. */
export function narrationLines(text:string):string[]{
 return narrationBlocks(text).flatMap(block=>block.text.match(/\S+(?:\s+|$)/g)??[]);
}

export function DMNarration({id,text,speed,animate,onComplete}:{id:string;text:string;speed:NarrationSpeed;animate:boolean;onComplete:()=>void}){
 const blocks=useMemo(()=>narrationBlocks(text),[text]);
 const lengths=blocks.map(block=>(block.text.match(/\S+(?:\s+|$)/g)??[]).length);
 const total=lengths.reduce((a,b)=>a+b,0);
 const [visible,setVisible]=useState(animate&&speed!=='instant'?1:total);
 const end=useRef<HTMLSpanElement>(null);
 const complete=visible>=total;
 useEffect(()=>{
  if(complete)return;
  if(speed==='instant'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisible(total);onComplete();return;}
  const timer=window.setTimeout(()=>{
   setVisible(n=>Math.min(n+1,total));
   if(visible+1>=total)onComplete();
  },narrationDelay[speed]/6);
  return ()=>window.clearTimeout(timer);
 },[visible,speed,total,complete,onComplete]);
 useEffect(()=>{if(!complete)end.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[visible,complete]);
 let consumed=0;
 return <div aria-label="Dungeon Master narration" className="mt-2 space-y-5 leading-7 text-parchment/90" onClick={()=>{if(!complete){setVisible(total);onComplete();}}} role={!complete?'button':undefined} tabIndex={!complete?0:undefined} onKeyDown={e=>{if(!complete&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setVisible(total);onComplete();}}} title={!complete?'Tap to reveal all narration':undefined}>
  {blocks.map((block,index)=>{
   const start=consumed;consumed+=lengths[index];
   if(visible<=start)return null;
   const words=block.text.match(/\S+(?:\s+|$)/g)??[];
   const shown=words.slice(0,Math.min(words.length,visible-start)).join('').trimEnd();
   return block.kind==='dialogue'
    ?<blockquote key={id+'-'+index} className="border-l-2 border-gold/70 pl-4">
      {block.speaker&&<div className="mb-1 text-sm font-semibold text-gold">{block.speaker}</div>}
      <p className="italic whitespace-normal">{shown}</p>
     </blockquote>
    :<p key={id+'-'+index} className="whitespace-normal">{shown}</p>;
  })}
  <span ref={end}/>
 </div>;
}
