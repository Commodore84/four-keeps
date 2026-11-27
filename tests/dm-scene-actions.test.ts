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

it('binds locked-door tool checks to the saved fixture DC, rather than a fabricated scene feature',async()=>{
 const state={...gameState,scene:{...scene,objects:[{id:'bronze-door',kind:'door',locked:true,lockDC:10,open:false}]}};
 setup({narration:'The lock requires fine tools.',checkRequest:{
   skill:'Sleight of Hand',tool:'Thieves’ Tools',difficulty:'easy',mode:'normal',
   sceneCheck:{sceneId:'hidden-cellar',featureId:'bronze-door',goal:'unlock'}}});
 const approved=response();await handler(req('I pick the lock using my Thieves’ Tools.',state),approved);
 expect(approved.body.checkRequest?.sceneCheck).toEqual({sceneId:'hidden-cellar',featureId:'bronze-door',goal:'unlock'});
 expect(approved.body.checkRequest?.token).toBeTruthy();
 const denied=response();await handler(req('I pick the lock.',{...state,scene:{...state.scene,objects:[{id:'bronze-door',kind:'door',locked:true,lockDC:20}]}}),denied);
 expect(denied.body.checkRequest).toBeNull();
});
it('preserves the explicit mechanism operation only for matching player intent',async()=>{
 setup({narration:'The brass wheel clicks.',sceneAction:{type:'activate',id:'hidden-cellar',featureId:'brass-wheel'}});
 const active=response();await handler(req('I turn the brass wheel.'),active);
 expect(active.body.sceneAction).toEqual({type:'activate',id:'hidden-cellar',featureId:'brass-wheel'});
 const passive=response();await handler(req('I study the brass wheel.'),passive);
 expect(passive.body.sceneAction).toBeNull();
});

it('requires a player request before returning a one-cell object shift',async()=>{
 setup({narration:'The crate scrapes.',sceneAction:{type:'shift',id:'hidden-cellar',
  objectId:'small-crate',x:3,y:2}});
 const active=response();await handler(req('I push the crate east.'),active);
 expect(active.body.sceneAction).toEqual({type:'shift',id:'hidden-cellar',objectId:'small-crate',x:3,y:2});
 const passive=response();await handler(req('I inspect the crate.'),passive);
 expect(passive.body.sceneAction).toBeNull();
});

it('passes scene-local key and rotating mechanism state to the DM without allowing free pickup',async()=>{
 const state={...gameState,scene:{...scene,features:[
  {id:'sun-key',kind:'key',label:'Copper Sun Key',position:{x:2,y:1},dc:10,skill:'Investigation',discovered:true,collected:false},
  {id:'north-statue',kind:'mechanism',label:'North statue',position:{x:1,y:1},dc:10,skill:'Investigation',
   discovered:true,activated:false,rotation:{positions:4,current:1,target:2},requiresKeyId:'sun-key'}
 ]}};
 setup({narration:'You take the copper key.',sceneAction:{type:'take',id:'hidden-cellar',featureId:'sun-key'}});
 const r=response();
 await handler(req('I pick up the Copper Sun Key.',state),r);
 expect(r.code).toBe(200);
 expect(r.body.sceneAction).toEqual({type:'take',id:'hidden-cellar',featureId:'sun-key'});
 const passive=response();
 await handler(req('I look around the chamber.',state),passive);
 expect(passive.body.sceneAction).toBeNull();
});

it('binds discovering a scene-local key to the same sealed check pipeline',async()=>{
 const state={...gameState,scene:{...scene,features:[
  {id:'sun-key',kind:'key',label:'Copper Sun Key',position:{x:2,y:1},dc:10,skill:'Investigation',discovered:false}
 ]}};
 setup({narration:'You find a copper key beneath the statue.',checkRequest:{
  skill:'Investigation',difficulty:'easy',reason:'Search the statue',sceneCheck:{sceneId:'hidden-cellar',featureId:'sun-key',goal:'discover'}
 }});
 const r=response();
 await handler(req('I investigate the base of the statue.',state),r);
 expect(r.code).toBe(200);
 expect(r.body.checkRequest?.sceneCheck).toEqual({sceneId:'hidden-cellar',featureId:'sun-key',goal:'discover'});
 expect(typeof r.body.checkRequest?.token).toBe('string');
});

it('seals a player-directed Athletics shift with a bounded destination, not a free DM map mutation',async()=>{
 const heavyScene={...scene,playerPosition:{x:1,y:1},
  features:[{id:'stone-effort',kind:'obstacle',label:'Stone Sentinel',position:{x:2,y:1},dc:15,
   skill:'Athletics',targetObjectId:'statue-one',obstacleMode:'shift',weightLb:210,discovered:true}],
  objects:[{id:'statue-one',kind:'statue',x:2,y:1,width:1,height:1}]};
 const payload={narration:'You brace your shoulder and push.',checkRequest:{
   skill:'Athletics',difficulty:'moderate',reason:'Shift the sentinel',
   sceneCheck:{sceneId:'hidden-cellar',featureId:'stone-effort',goal:'heavy-shift',x:3,y:1}
 }};
 setup(payload);
 const r=response();await handler(req('I push the Stone Sentinel one square east.',{...gameState,scene:heavyScene}),r);
 expect(r.code).toBe(200);
 expect(r.body.checkRequest?.sceneCheck).toEqual(payload.checkRequest.sceneCheck);
 expect(r.body.sceneAction).toBeNull();
 const wrong=response();await handler(req('I push the Stone Sentinel west.',{...gameState,scene:heavyScene}),wrong);
 expect(wrong.body.checkRequest?.sceneCheck).toBeUndefined();
 const tooHeavy=response();await handler(req('I push the Stone Sentinel one square east.',{
  ...gameState,scene:{...heavyScene,features:[{...heavyScene.features[0],weightLb:400}]} }),tooHeavy);
 expect(tooHeavy.body.checkRequest?.sceneCheck).toBeUndefined();
});

it('binds a visible heavy gate lift to Athletics and the authored force DC',async()=>{
 const gateScene={...scene,playerPosition:{x:1,y:1},
  features:[{id:'gate-effort',kind:'obstacle',label:'Iron Portcullis',position:{x:2,y:1},
   dc:20,skill:'Athletics',targetObjectId:'gate-one',obstacleMode:'lift',weightLb:210,discovered:true}],
  objects:[{id:'gate-one',kind:'door',x:2,y:1,width:1,height:1,locked:true,forceDC:20}]};
 setup({narration:'The gate strains against the frame.',checkRequest:{
  skill:'Athletics',difficulty:'hard',reason:'Lift the gate',sceneCheck:{
   sceneId:'hidden-cellar',featureId:'gate-effort',goal:'heavy-lift'}
 }});
 const r=response();await handler(req('I heave and lift the Iron Portcullis.',{...gameState,scene:gateScene}),r);
 expect(r.code).toBe(200);
 expect(r.body.checkRequest?.sceneCheck).toEqual({sceneId:'hidden-cellar',featureId:'gate-effort',goal:'heavy-lift'});
});

it('binds authored rig and helper methods to sealed Strength (Athletics) checks',async()=>{
 const feature={id:'shift-dais',kind:'obstacle',label:'Stone Dais',position:{x:2,y:1},dc:15,
  skill:'Athletics',targetObjectId:'dais',obstacleMode:'shift',weightLb:400,discovered:true,
  leveragePoint:true,rig:{label:'Counterweight Winch',multiplier:2},
  helper:{label:'Mara Vell',strength:10,position:{x:1,y:2}}};
 const state={...gameState,scene:{...scene,features:[feature],
  objects:[{id:'dais',kind:'cargo',x:2,y:1,width:2,height:2}],
  playerPosition:{x:1,y:1}}};
 const base={skill:'Athletics',difficulty:'moderate',reason:'Move the dais'};
 const intent=(method:'rig'|'helper'|'crowbar')=>({sceneId:'hidden-cellar',featureId:'shift-dais',
  goal:'heavy-shift',x:3,y:1,method});
 setup({narration:'You brace for the effort.',checkRequest:{...base,sceneCheck:intent('rig')}});
 const rig=response();await handler(req('I push the Stone Dais one square east using the Counterweight Winch.',state),rig);
 expect(rig.code).toBe(200);
 expect(rig.body.checkRequest?.sceneCheck).toEqual(intent('rig'));
 const noRigName=response();await handler(req('I push the Stone Dais east.',state),noRigName);
 expect(noRigName.body.checkRequest?.sceneCheck).toBeUndefined();
 setup({narration:'Mara helps with the stone.',checkRequest:{...base,sceneCheck:intent('helper')}});
 const helper=response();await handler(req('I push the Stone Dais one square east with help from Mara Vell.',state),helper);
 expect(helper.body.checkRequest?.sceneCheck).toEqual(intent('helper'));
 expect(helper.body.checkRequest?.mode).toBe('advantage');
 const noHelper=response();await handler(req('I push the Stone Dais one square east with help from Mara Vell.',
  {...state,scene:{...state.scene,features:[{...feature,helper:null}]} }),noHelper);
 expect(noHelper.body.checkRequest?.sceneCheck).toBeUndefined();
 setup({narration:'You pry with a bar.',checkRequest:{...base,sceneCheck:intent('crowbar')}});
 const goliathState={...state,characterIdentity:{name:'Scout',classId:'rogue',speciesId:'goliath'},
  equipment:{...gameState.equipment,owned:[{name:'Crowbar',quantity:1}]}};
 const crowbar=response();await handler(req('I push the Stone Dais east using my crowbar.',goliathState),crowbar);
 expect(crowbar.body.checkRequest?.sceneCheck).toEqual(intent('crowbar'));
 expect(crowbar.body.checkRequest?.mode).toBe('advantage');
 const withoutCrowbar=response();await handler(req('I push the Stone Dais east using my crowbar.',state),withoutCrowbar);
 expect(withoutCrowbar.body.checkRequest?.sceneCheck).toBeUndefined();
});

it('only passes mapped NPC actions for established world people who were explicitly asked',async()=>{
 const npcWorld={npcs:[{id:'mara-vell',name:'Mara Vell',role:'Guide',location:'Dasahi',relationship:'Cautious',notes:[]}]};
 const state={...gameState,scene:{...scene,npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:12}]}};
 const makeReq=(message:string,overrides=state)=>({...req(message,overrides),body:{...req(message,overrides).body,world:npcWorld}});
 setup({narration:'Mara considers the request.',sceneAction:{type:'npc',id:'hidden-cellar',npcId:'mara-vell',behavior:'follow'}});
 const yes=response();await handler(makeReq('I ask Mara Vell to follow me.'),yes);
 expect(yes.code).toBe(200);
 expect(yes.body.sceneAction).toEqual({type:'npc',id:'hidden-cellar',npcId:'mara-vell',behavior:'follow'});
 const wrong=response();await handler(makeReq('I keep walking.'),wrong);
 expect(wrong.body.sceneAction).toBeNull();
 const absent=response();await handler(makeReq('I ask Mara Vell to follow me.',{...state,scene:{...scene,npcs:[]}}),absent);
 expect(absent.body.sceneAction).toBeNull();
 setup({narration:'Mara refuses to accompany you.',sceneAction:null});
 const refused=response();await handler(makeReq('I ask Mara Vell to follow me.'),refused);
 expect(refused.body.sceneAction).toBeNull();
});
it('binds dynamic heavy assistance to the same mapped NPC and world name',async()=>{
 const npcWorld={npcs:[{id:'mara-vell',name:'Mara Vell',role:'Guide',location:'Dasahi',relationship:'Helpful',notes:[]}]};
 const state={...gameState,scene:{...scene,
  playerPosition:{x:2,y:1},npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:12}],
  features:[{id:'stone-effort',kind:'obstacle',label:'Stone Block',position:{x:3,y:2},
   dc:15,skill:'Athletics',targetObjectId:'stone-one',obstacleMode:'shift',weightLb:340,
   helperNpcId:'mara-vell',discovered:true}],
  objects:[{id:'stone-one',kind:'cargo',x:3,y:2,width:1,height:1}]}};
 const makeReq=(message:string,overrides=state)=>({...req(message,overrides),body:{...req(message,overrides).body,world:npcWorld}});
 setup({narration:'Mara helps brace the stone.',checkRequest:{skill:'Athletics',difficulty:'moderate',
  reason:'Move Stone Block',sceneCheck:{sceneId:'hidden-cellar',featureId:'stone-effort',
   goal:'heavy-shift',x:4,y:2,method:'helper'}}});
 const accepted=response();await handler(makeReq('I push the Stone Block one square east with help from Mara Vell.'),accepted);
 expect(accepted.body.checkRequest?.sceneCheck).toMatchObject({method:'helper',featureId:'stone-effort'});
 expect(accepted.body.checkRequest?.mode).toBe('advantage');
 const absent=response();await handler(makeReq('I push the Stone Block one square east with help from Mara Vell.',
  {...state,scene:{...state.scene,npcs:[]}}),absent);
 expect(absent.body.checkRequest?.sceneCheck).toBeUndefined();
});

it('issues an independent sealed NPC Investigation check with the persistent world modifier, never the player modifier',async()=>{
 const skillWorld={npcs:[{id:'mara-vell',name:'Mara Vell',role:'Guide',location:'Dasahi',
  relationship:'Cooperative',notes:[],skillBonuses:{Investigation:6,Perception:3}}]};
 const state={...gameState,scene:{...scene,playerPosition:{x:0,y:0},
  npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:12}],
  features:[{id:'hidden-ledger',kind:'clue',label:'Hidden Ledger',position:{x:3,y:2},
   dc:15,skill:'Investigation',discovered:false}]}};
 const make=(message:string,override=state)=>({...req(message,override),body:{...req(message,override).body,world:skillWorld}});
 setup({narration:'Mara agrees to examine the shelves.',checkRequest:{skill:'Investigation',
  difficulty:'moderate',reason:'Mara searches the quarry',sceneCheck:{
   sceneId:'hidden-cellar',featureId:'hidden-ledger',goal:'discover',npcId:'mara-vell'}}});
 const initial=response();
 await handler(make('I ask Mara Vell to investigate this area for clues.'),initial);
 expect(initial.code).toBe(200);
 expect(initial.body.checkRequest.sceneCheck).toMatchObject({npcId:'mara-vell',goal:'discover',featureId:'hidden-ledger'});
 expect(initial.body.checkRequest.mode).toBe('normal');
 const token=initial.body.checkRequest.token;
 setup({narration:'Mara studies the evidence.',newFacts:[],worldUpdates:{}});
 const passed=response();await handler({...make(''),body:{...make('').body,checkToken:token,dice:[12]}},passed);
 expect(passed.code).toBe(200);
 expect(passed.body.checkResult).toMatchObject({
  skill:'Investigation',npcId:'mara-vell',kept:12,modifier:6,total:18,success:true});
 const failed=response();await handler({...make(''),body:{...make('').body,checkToken:token,dice:[4]}},failed);
 expect(failed.body.checkResult).toMatchObject({npcId:'mara-vell',modifier:6,total:10,success:false});
 const wrongText=response();await handler(make('I investigate the area alone.'),wrongText);
 expect(wrongText.body.checkRequest).toBeNull();
 const noAbility=response();await handler(make('I ask Mara Vell to investigate the area.',
  {...state,scene:{...state.scene,npcs:[]}}),noAbility);
 expect(noAbility.body.checkRequest).toBeNull();
});

it('will not issue discovery checks by assigning late NPC bonuses or an unlisted skill',async()=>{
 const state={...gameState,scene:{...scene,npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:12}],
  features:[{id:'hidden-ledger',kind:'clue',label:'Hidden Ledger',position:{x:3,y:2},
   dc:15,skill:'Investigation',discovered:false}]}};
 setup({narration:'Mara watches but has no established search skill.',checkRequest:{skill:'Investigation',
  difficulty:'moderate',reason:'Check for hidden things',sceneCheck:{sceneId:'hidden-cellar',featureId:'hidden-ledger',goal:'discover',npcId:'mara-vell'}},
  worldUpdates:{npcs:[{name:'Mara Vell',skillBonuses:{Investigation:12}}]}});
 const request={...req('I ask Mara Vell to investigate the area.',state),body:{
  ...req('I ask Mara Vell to investigate the area.',state).body,
  world:{npcs:[{id:'mara-vell',name:'Mara Vell',role:'Guide',notes:[]}]} }};
 const noSkills=response();await handler(request,noSkills);
 expect(noSkills.body.checkRequest).toBeNull();
});
