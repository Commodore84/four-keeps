import {afterEach,it,expect,vi} from 'vitest';
import handler from '../api/dm.js';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function response(){return {code:0,body:null as any,setHeader:vi.fn(),status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};}
function setup(output:any){
 vi.stubEnv('FOUR_KEEPS_ACCESS_CODE','test-access-code-at-least-sixteen');vi.stubEnv('OPENAI_API_KEY','test-key-not-a-credential');
 const fetch=vi.fn(async()=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]})}));vi.stubGlobal('fetch',fetch);return fetch;
}
const character={scores:{str:8,dex:16,con:14,int:14,wis:12,cha:10},proficiencyBonus:2,proficientSkills:['Stealth'],expertiseSkills:['Stealth'],resources:{'Second Wind':{maximum:2,used:1}},currentHitPoints:7,maxHitPoints:12};
const req=(body:any)=>({method:'POST',headers:{'x-four-keeps-access':'test-access-code-at-least-sixteen'},body});
it('passes imported identity, class choices, counters and scene evidence to the provider while preventing legacy auto-combat',async()=>{
 const fetch=setup({narration:'The tower remains quiet.',combatStart:{enemyName:'Invented opponent'}}),res=response();
 await handler(req({message:'What is here?',character,gameState:{characterIdentity:{name:'Aster',classId:'fighter'},adventureSession:{site:'watchtower',status:'exploring',visited:['frontier','crossroads','watchtower'],interactions:[{response:'The watchkeeper reported travelers.'}]},playerBuild:{classChoices:{'fighting-style':['Defense']},spellbook:[],invocations:[]}}}),res);
 expect(res.code).toBe(200);expect(res.body.combatStart).toBeNull();const body=JSON.parse(fetch.mock.calls[0][1].body);expect(body.input[0].content).toContain('Second Wind');expect(body.input[0].content).toContain('Defense');expect(body.input[0].content).toContain('The watchkeeper reported travelers.');
});
it('preserves imported Rogue expertise across signed check request and dice adjudication',async()=>{
 setup({narration:'The tracks are uncertain.',checkRequest:{skill:'Stealth',difficulty:'moderate',mode:'normal',reason:'Stay hidden'}});const first=response();await handler(req({message:'I hide.',character}),first);expect(first.body.checkRequest.token).toBeTruthy();
 setup({narration:'You move quietly.'});const second=response();await handler(req({checkToken:first.body.checkRequest.token,dice:[10],character}),second);expect(second.body.checkResult.modifier).toBe(7);expect(second.body.checkResult.total).toBe(17);
});
it('reports unavailable AI configuration without calling a provider',async()=>{
 vi.stubEnv('FOUR_KEEPS_ACCESS_CODE','');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const res=response();await handler(req({message:'Hello'}),res);expect(res.code).toBe(503);expect(fetch).not.toHaveBeenCalled();
});
