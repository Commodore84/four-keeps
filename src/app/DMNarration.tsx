import {useEffect,useMemo,useRef,useState} from 'react';

export type NarrationSpeed='slow'|'normal'|'fast'|'instant';
export const narrationDelay:Record<NarrationSpeed,number>={slow:1020,normal:624,fast:312,instant:0};
export type NarrationBlock={kind:'narration'|'dialogue';text:string;speaker?:string};

/** A single newline is a soft wrap; blank lines establish paragraph boundaries.
 * Only explicit speaker attributions are presented as named dialogue. */
/** Keep lengthy DM paragraphs readable on narrow phones without changing their wording. */
export function readableNarrationParagraphs(text:string,maxWords=65):string[]{
 const result:string[]=[];
 for(const paragraph of text.replace(/\r\n?/g,'\n').trim().split(/\n\s*\n+/).filter(Boolean)){
  const normalized=paragraph.replace(/\s*\n\s*/g,' ').replace(/[ \t]+/g,' ').trim();
  const sentences=normalized.match(/[^.!?]+(?:[.!?]+[”"']?|$)/g)?.map(s=>s.trim()).filter(Boolean)??[normalized];
  let current='';let count=0;
  for(const sentence of sentences){
   const words=sentence.split(/\s+/).length;
   if(current&&count+words>maxWords){result.push(current);current='';count=0;}
   current+=(current?' ':'')+sentence;count+=words;
  }
  if(current)result.push(current);
 }
 return result;
}

export function narrationBlocks(text:string):NarrationBlock[]{
 const paragraphs=readableNarrationParagraphs(text);
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

/** Soft-wrap lines are measured against the rendered width; source text is never modified. */
export function visualNarrationLines(text:string,maxWidth:number,measure:(value:string)=>number):string[]{
 if(maxWidth<=0)return [text];
 const words=text.match(/\S+(?:\s+|$)/g)??[];
 const lines:string[]=[];let current='';
 for(const word of words){
  const candidate=current+word;
  if(current && measure(candidate.trimEnd())>maxWidth){
   lines.push(current.trimEnd());current=word.trimStart();
  }else current=candidate;
 }
 if(current.trim())lines.push(current.trimEnd());
 return lines;
}
export function narrationLines(text:string):string[]{
 return narrationBlocks(text).flatMap(block=>block.text.match(/\S+(?:\s+|$)/g)??[]);
}

export function DMNarration({id,text,speed,animate,onComplete}:{id:string;text:string;speed:NarrationSpeed;animate:boolean;onComplete:()=>void}){
 const blocks=useMemo(()=>narrationBlocks(text),[text]);
 const container=useRef<HTMLDivElement>(null);
 const [layout,setLayout]=useState({width:0,font:'16px sans-serif'});
 const [visible,setVisible]=useState(animate&&speed!=='instant'?1:Number.POSITIVE_INFINITY);
 const end=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const element=container.current;if(!element)return;
  const update=()=>{
   const style=getComputedStyle(element);
   setLayout(old=>{
    const next={width:element.clientWidth,font:style.font};
    return old.width===next.width&&old.font===next.font?old:next;
   });
  };
  update();
  const observer=new ResizeObserver(update);observer.observe(element);
  return ()=>observer.disconnect();
 },[]);
 const lines=useMemo(()=>{
  if(!layout.width)return blocks.map(block=>[block.text]);
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  if(!ctx)return blocks.map(block=>[block.text]);
  ctx.font=layout.font;
  return blocks.map(block=>visualNarrationLines(block.text,layout.width-(block.kind==='dialogue'?18:0),value=>ctx.measureText(value).width));
 },[blocks,layout]);
 const total=lines.reduce((sum,group)=>sum+group.length,0);
 const complete=visible>=total;
 useEffect(()=>{
  if(complete||!layout.width)return;
  if(speed==='instant'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisible(Number.POSITIVE_INFINITY);onComplete();return;}
  const timer=window.setTimeout(()=>{
   setVisible(n=>Math.min(n+1,total));
   if(visible+1>=total)onComplete();
  },narrationDelay[speed]);
  return ()=>window.clearTimeout(timer);
 },[visible,speed,total,complete,onComplete,layout.width]);
 useEffect(()=>{if(!complete)end.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[visible,complete]);
 let consumed=0;
 return <div ref={container} aria-label="Dungeon Master narration" className="mt-2 space-y-5 leading-7 text-parchment/90" onClick={()=>{if(!complete){setVisible(Number.POSITIVE_INFINITY);onComplete();}}} role={!complete?'button':undefined} tabIndex={!complete?0:undefined} onKeyDown={e=>{if(!complete&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setVisible(Number.POSITIVE_INFINITY);onComplete();}}} title={!complete?'Tap to reveal all narration':undefined}>
  {blocks.map((block,index)=>{
   const start=consumed;consumed+=lines[index].length;
   if(visible<=start)return null;
   const shown=lines[index].slice(0,Math.min(lines[index].length,visible-start));
   const content=shown.map((line,lineIndex)=><span key={lineIndex} className="dm-narration-line block">{line}{' '} </span>);
   return block.kind==='dialogue'
    ?<blockquote key={id+'-'+index} className="border-l-2 border-gold/70 pl-4">
      {block.speaker&&<div className="mb-1 text-sm font-semibold text-gold">{block.speaker}</div>}
      <p className="italic">{content}</p>
     </blockquote>
    :<p key={id+'-'+index}>{content}</p>;
  })}
  <span ref={end}/>
 </div>;
}
