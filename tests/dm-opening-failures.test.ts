import {afterEach,describe,it,expect,vi} from 'vitest';
import handler from '../api/dm.js';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const request=()=>({method:'POST',headers:{'x-four-keeps-access':'test-access-code-at-least-sixteen'},body:{message:'Begin the adventure',opening:true,history:[],gameState:{location:'Dasahi',characterIdentity:{name:'Nighthawk'}}}});
function res(){return {statusCode:0,body:null as any,setHeader:vi.fn(),status(n:number){this.statusCode=n;return this;},json(v:any){this.body=v;return this;}};}
function setup(fetch:unknown){vi.stubEnv('FOUR_KEEPS_ACCESS_CODE','test-access-code-at-least-sixteen');vi.stubEnv('OPENAI_API_KEY','fake-key');vi.stubGlobal('fetch',fetch);}
describe('opening request safe diagnostics',()=>{
 it('returns a reference for a provider rejection without revealing provider details',async()=>{
  setup(vi.fn(async()=>({ok:false,status:400,json:async()=>({error:{code:'secret_provider_detail'}})})));
  const r=res();await handler(request(),r);
  expect(r.statusCode).toBe(502);expect(r.body.code).toBe('provider_bad_request');expect(r.body.requestId).toMatch(/^[a-f0-9]{12}$/);
  expect(JSON.stringify(r.body)).not.toContain('secret_provider_detail');
 });
 it('classifies timeout as retryable and keeps opening request intact',async()=>{
  setup(vi.fn(async()=>{throw Object.assign(new Error('sensitive'),{name:'TimeoutError'});}));
  const r=res();await handler(request(),r);
  expect(r.statusCode).toBe(504);expect(r.body.code).toBe('provider_timeout');expect(JSON.stringify(r.body)).not.toContain('sensitive');
 });
 it('classifies malformed provider response and permits a later retry',async()=>{
  let count=0;
  setup(vi.fn(async()=>{count++;return count===1?{ok:true,json:async()=>{throw new SyntaxError('bad');}}:{ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({narration:'Dasahi awakens at dawn.'})}]}]})};}));
  const first=res(),second=res();await handler(request(),first);await handler(request(),second);
  expect(first.body.code).toBe('provider_invalid_json');expect(second.statusCode).toBe(200);expect(second.body.narration).toContain('Dasahi');
 });
});
