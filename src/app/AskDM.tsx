import {useEffect,useState} from 'react';
import type {CharacterDraft} from './CharacterCreator';
type Message={role:'user'|'assistant';content:string};
export function AskDM({draft,initialQuestion}:{draft:CharacterDraft;initialQuestion?:string}){
 const [question,setQuestion]=useState('');
 const [messages,setMessages]=useState<Message[]>([]);
 const [pending,setPending]=useState(false);
 const [error,setError]=useState('');
 async function ask(value:string){
  const prompt=value.trim();if(!prompt||pending)return;
  const prior=messages;setQuestion('');setError('');setPending(true);setMessages([...prior,{role:'user',content:prompt}]);
  try{
   const response=await fetch('/api/ask-dm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:prompt,draft:{identity:draft.identity,selections:draft.selections,rules:draft.rules,step:draft.step},history:prior})});
   const data=await response.json() as {answer?:string;error?:string};
   if(!response.ok||!data.answer)throw Error(data.error??'The DM could not answer.');
   setMessages(current=>[...current,{role:'assistant',content:data.answer!}]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to reach Ask DM.');}
  finally{setPending(false);}
 }
 useEffect(()=>{if(initialQuestion)void ask(initialQuestion);},[initialQuestion]);
 return <section aria-label="Ask DM" className="space-y-3 rounded-xl border border-gold/40 bg-ink/50 p-3">
  <h4 className="font-serif text-lg">Ask DM</h4>
  <p className="text-xs text-parchment/70">Ask about spells, feats, equipment, tactics, or how your current choices work together. The DM sees this character's saved selections and this conversation, but cannot change your character.</p>

  {messages.length>0&&<div className="max-h-96 space-y-3 overflow-y-auto" aria-label="DM conversation">{messages.map((message,i)=><div key={i} className="rounded-lg border border-white/15 p-3 text-sm"><strong>{message.role==='assistant'?'DM':'You'}</strong><p className="mt-1 whitespace-pre-wrap">{message.content}</p></div>)}</div>}
  <form onSubmit={e=>{e.preventDefault();void ask(question)}} className="space-y-2"><label className="block text-sm" htmlFor="ask-dm-question">Your question</label><textarea id="ask-dm-question" value={question} onChange={e=>setQuestion(e.target.value)} rows={3} placeholder="How does this spell work at level 1, and is it a good choice for my character?" className="w-full rounded border border-white/30 bg-ink p-2 text-sm"/><button type="submit" disabled={pending||!question.trim()} className="rounded bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40">{pending?'DM is thinking…':'Ask DM'}</button></form>
  {error&&<p role="alert" className="text-sm text-amber-200">{error}</p>}
 </section>;
}
