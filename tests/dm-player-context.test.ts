import {afterEach,it,expect,vi} from 'vitest';
import handler from '../api/dm.js';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function response(){return {code:0,body:null as any,setHeader:vi.fn(),status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};}
function setup(output:any,status='completed',partType='output_text'){
 vi.stubEnv('FOUR_KEEPS_ACCESS_CODE','test-access-code-at-least-sixteen');vi.stubEnv('OPENAI_API_KEY','test-key-not-a-credential');
 const fetch=vi.fn(async()=>({ok:true,json:async()=>({status,output:[{type:'message',content:[{type:partType,text:JSON.stringify(output)}]}]})}));vi.stubGlobal('fetch',fetch);return fetch;
}
const character={scores:{str:8,dex:16,con:14,int:14,wis:12,cha:10},proficiencyBonus:2,proficientSkills:['Stealth'],expertiseSkills:['Stealth'],resources:{'Second Wind':{maximum:2,used:1}},currentHitPoints:7,maxHitPoints:12};
const req=(body:any)=>({method:'POST',headers:{'x-four-keeps-access':'test-access-code-at-least-sixteen'},body});
it('passes imported identity, class choices, counters and scene evidence to the provider while proposing verified encounter handoff',async()=>{
 const fetch=setup({narration:'The tower remains quiet.',combatStart:{enemyName:'Invented opponent'}}),res=response();
 await handler(req({message:'What is here?',character,gameState:{characterIdentity:{name:'Aster',classId:'fighter'},adventureSession:{site:'watchtower',status:'exploring',visited:['frontier','crossroads','watchtower'],interactions:[{response:'The watchkeeper reported travelers.'}]},playerBuild:{classChoices:{'fighting-style':['Defense']},spellbook:[],invocations:[]}}}),res);
 expect(res.code).toBe(200);expect(res.body.combatStart).toEqual({enemyName:'Invented opponent'});const body=JSON.parse(fetch.mock.calls[0][1].body);expect(body.input[0].content).toContain('Second Wind');expect(body.input[0].content).toContain('Defense');expect(body.input[0].content).toContain('The watchkeeper reported travelers.');
});
it('preserves imported Rogue expertise across signed check request and dice adjudication',async()=>{
 setup({narration:'The tracks are uncertain.',checkRequest:{skill:'Stealth',difficulty:'moderate',mode:'normal',reason:'Stay hidden'}});const first=response();await handler(req({message:'I hide.',character}),first);expect(first.body.checkRequest.token).toBeTruthy();
 setup({narration:'You move quietly.'});const second=response();await handler(req({checkToken:first.body.checkRequest.token,dice:[10],character}),second);expect(second.body.checkResult.modifier).toBe(7);expect(second.body.checkResult.total).toBe(17);
});
it('reports unavailable AI configuration without calling a provider',async()=>{
 vi.stubEnv('FOUR_KEEPS_ACCESS_CODE','');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const res=response();await handler(req({message:'Hello'}),res);expect(res.code).toBe(503);expect(fetch).not.toHaveBeenCalled();
});

it('returns a clarification without applying proposed world changes, combat, or checks',async()=>{
 const fetch=setup({narration:'Which gate?',clarificationRequest:{question:'Do you mean the north gate?'},combatStart:{enemyName:'Guard'},newFacts:['Gate opened'],travelDestination:'crossroads',checkRequest:{skill:'Stealth',difficulty:'easy',mode:'normal',reason:'Gate'},worldUpdates:{quests:[{title:'Open gate',status:'completed',objective:'Enter'}]}}),res=response();
 await handler(req({message:'Go through the gate',character,gameState:{characterIdentity:{name:'Aster',classId:'fighter'},adventureSession:{site:'frontier',status:'exploring'}}}),res);
 expect(res.code).toBe(200);
 expect(res.body.clarificationRequest.question).toBe('Do you mean the north gate?');
 expect(res.body.combatStart).toBeNull();expect(res.body.checkRequest).toBeNull();
 expect(res.body.newFacts).toEqual([]);expect(res.body.worldUpdates).toEqual({});expect(res.body.travelDestination).toBeNull();
 const body=JSON.parse(fetch.mock.calls[0][1].body);
 expect(body.instructions).toContain('clarificationRequest (null or {question: string})');
});
it('fails safely when the provider repeats a question already answered',async()=>{
 const fetch=setup({narration:'Are you sure?',clarificationRequest:{question:'Are you sure?'}}),res=response();
 await handler(req({message:'Attack dragon',clarification:{question:'Are you sure?',answer:'Yes, I attack.'},character,gameState:{characterIdentity:{name:'Aster',classId:'fighter'},adventureSession:{site:'frontier',status:'exploring'}}}),res);
 expect(res.code).toBe(502);expect(res.body.error).toContain('repeated an answered clarification');
 const body=JSON.parse(fetch.mock.calls[0][1].body);
 expect(body.input[0].content).toContain('Yes, I attack.');
});

it.each(['incomplete','failed','in_progress'])('rejects a %s provider response even when its partial text is valid JSON',async status=>{
 setup({narration:'The encounter begins.',combatStart:{enemyName:'Guard'},newFacts:['The gate opened']},status);
 const res=response();
 await handler(req({message:'Open the gate',character}),res);
 expect(res.code).toBe(502);
 expect(res.body).toEqual({error:'The Dungeon Master response was incomplete. Retry your action.'});
});

it('rejects a provider refusal without exposing its text as narration',async()=>{
 setup('provider refusal','completed','refusal');
 const res=response();
 await handler(req({message:'Open the gate',character}),res);
 expect(res.code).toBe(502);
 expect(res.body).toEqual({error:'The Dungeon Master could not answer this action. Retry your action.'});
});

const exploration = {
 characterIdentity:{name:'Aster',classId:'fighter'},
 adventureSession:{site:'frontier',status:'exploring'},
 sharedEncounter:{status:'completed',round:2}
};

it.each([
 ['combatStart',{enemyName:'A second guard'}],
 ['travelDestination','crossroads'],
 ['clarificationRequest',{question:'Which guard do you mean?'}],
])('allows %s after a completed fight while preserving its context',async (field,value)=>{
 const fetch=setup({narration:'A new scene unfolds.',[field]:value});
 const res=response();
 await handler(req({message:'I continue',character,gameState:exploration}),res);
 expect(res.code).toBe(200);
 expect(res.body[field]).toEqual(value);
 expect(JSON.parse(fetch.mock.calls[0][1].body).input[0].content).toContain('"sharedEncounter":{"status":"completed"');
});

it.each([
 {sharedEncounter:{status:'active',round:2}},
 {adventureSession:{site:'frontier',status:'exploring',pendingEncounter:{enemyName:'Guard'}}}
])('suppresses a second encounter proposal while an encounter is active or pending',async state=>{
 setup({narration:'A new enemy approaches.',combatStart:{enemyName:'Another guard'}});
 const res=response();
 await handler(req({message:'I continue',character,gameState:{...exploration,...state}}),res);
 expect(res.code).toBe(200);
 expect(res.body.combatStart).toBeNull();
});
