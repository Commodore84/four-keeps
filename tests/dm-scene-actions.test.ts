import {afterEach,expect,it,vi} from 'vitest';
import handler from '../api/dm.js';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function response(){return {code:0,body:null as any,setHeader:vi.fn(),status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};}
const character={scores:{str:8,dex:16,con:14,int:14,wis:12,cha:10},proficiencyBonus:2,
 proficientSkills:['Investigation','Perception','Sleight of Hand'],currentHitPoints:10,maxHitPoints:10};
const scene={id:'hidden-cellar',title:'A cellar',visible:true,playerPosition:{x:1,y:1},
 features:[{id:'ledger',kind:'clue',label:'Forgotten ledger',position:{x:2,y:2},dc:15,skill:'Investigation',discovered:false},
  {id:'trap',kind:'trap',label:'Tripwire',position:{x:2,y:1},dc:15,skill:'Perception',discovered:true,disarmed:false}],
 objects:[{id:'door',kind:'door',open:false,locked:false}]};
const gameState={characterIdentity:{name:'Aster',classId:'rogue'},location:'Dasahi',
 adventureSession:{site:'frontier',status:'exploring'},scene,
 equipment:{owned:[{name:'Thieves’ Tools',quantity:1}],tools:['Thieves’ Tools'],toolProficiencies:['Thieves’ Tools']}};
const req=(message:string,state=gameState)=>({method:'POST',headers:{'x-four-keeps-access':'test-access-code-at-least-sixteen'},body:{message,character,gameState:state}});
function setup(output:any){
 vi.stubEnv('FOUR_KEEPS_ACCESS_CODE','test-access-code-at-least-sixteen');
 vi.stubEnv('OPENAI_API_KEY','test-key-not-a-credential');
 const fetch=vi.fn(async()=>({ok:true,json:async()=>({status:'completed',
  output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]})}));
 vi.stubGlobal('fetch',fetch);return fetch;
}
it('sends the saved scene to the DM and allows an explicit move only with player movement intent',async()=>{
 const fetch=setup({narration:'The shelves come into view.',sceneAction:{type:'move',id:'hidden-cellar',x:2,y:2}});
 const r=response();
 await handler(req('I walk toward the shelves.'),r);
 expect(r.code).toBe(200);expect(r.body.sceneAction).toEqual({type:'move',id:'hidden-cellar',x:2,y:2});
 const provider=JSON.parse(fetch.mock.calls[0][1].body);
 expect(provider.input[0].content).toContain('Forgotten ledger');
 const follow=response();
 await handler(req('I inspect the shelves.'),follow);
 expect(follow.body.sceneAction).toBeNull();
});
it('returns scene feature discovery attached to the existing sealed skill check and matching DC',async()=>{
 setup({narration:'Look carefully.',checkRequest:{skill:'Investigation',difficulty:'moderate',mode:'normal',
  reason:'Look under the table',sceneCheck:{sceneId:'hidden-cellar',featureId:'ledger',goal:'discover'}}});
 const result=response();
 await handler(req('I search the desk for evidence.'),result);
 expect(result.code).toBe(200);
 expect(result.body.checkRequest.skill).toBe('Investigation');
 expect(result.body.checkRequest.sceneCheck).toEqual({sceneId:'hidden-cellar',featureId:'ledger',goal:'discover'});
 expect(result.body.checkRequest.token).toMatch(/.+/);
});
it('rejects a mismatched scene DC and forged feature binding without offering a roll',async()=>{
 setup({narration:'The clue might be here.',checkRequest:{skill:'Investigation',difficulty:'easy',mode:'normal',
  sceneCheck:{sceneId:'hidden-cellar',featureId:'ledger',goal:'discover'}}});
 const r=response();await handler(req('I search the desk.'),r);
 expect(r.code).toBe(200);expect(r.body.checkRequest).toBeNull();
});
it('requires owned Thieves Tools for an established trap and binds disarm checks to its recorded DC',async()=>{
 setup({narration:'The tripwire can be disarmed.',checkRequest:{skill:'Sleight of Hand',tool:'Thieves’ Tools',
  difficulty:'moderate',mode:'normal',sceneCheck:{sceneId:'hidden-cellar',featureId:'trap',goal:'disarm'}}});
 const r=response();await handler(req('I disarm the trap.'),r);
 expect(r.body.checkRequest.sceneCheck).toEqual({sceneId:'hidden-cellar',featureId:'trap',goal:'disarm'});
 const unowned={...gameState,equipment:{owned:[],tools:[],toolProficiencies:[]}};
 const denied=response();await handler(req('I disarm the trap.',unowned),denied);
 expect(denied.body.checkRequest).toBeNull();
 expect(denied.body.narration).toContain('not in your inventory');
});

it('preserves a bounded DM-authored trap effect in the initial scene declaration',async()=>{
 const effect={saveAbility:'dex',saveDC:15,damageDice:'2d6',damageType:'piercing',onSave:'half'};
 setup({narration:'A narrow corridor lies ahead.',sceneAction:{type:'show',id:'hazard-corridor',
  title:'The Narrow Corridor',battlefield:{width:7,height:1,objects:[]},
  features:[{id:'floor-spikes',kind:'trap',label:'Floor spikes',position:{x:3,y:0},
   dc:15,skill:'Perception',trapEffect:effect}]}});
 const result=response();await handler(req('I enter the passage carefully.'),result);
 expect(result.code).toBe(200);
 expect(result.body.sceneAction?.features?.[0]?.trapEffect).toEqual(effect);
});
