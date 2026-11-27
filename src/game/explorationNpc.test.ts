import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign,type Campaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {mergeWorld} from './world';
import {applyDmSceneAction,normalizeExplorationScene,sceneCheckRequest,resolveSceneCheck} from './explorationScene';

const now='2026-11-27T21:00:00.000Z';
const name='Mara Vell';
const first=():Campaign=>beginAdventureSession({
 ...newCampaign('NPC integration test','npc-test',now),
 world:mergeWorld(undefined,{npcs:[{name,role:'Guide',location:'Frontier Village',
   relationship:'Cautious but cooperative',notes:['Knows the quarry']},
   {name:'Orin Thale',role:'Scout',location:'Frontier Village',relationship:'Distrustful',notes:[]}]}),
 characterIdentity:{name:'Scout',speciesId:'human',backgroundId:'guard',classId:'rogue',
  draftId:'npc-test',pronouns:'',appearance:'',personality:'',backstory:''}
},now);
const hall={type:'show',id:'old-quarry',title:'Old Quarry',
 battlefield:{width:9,height:6,objects:[
  {id:'quarry-block',kind:'cargo',x:3,y:2,width:1,height:1},
  {id:'sealed-gate',kind:'door',x:7,y:3,width:1,height:1,locked:true,lockDC:20}
 ]},
 features:[
  {id:'quarry-statue',kind:'mechanism',label:'North Statue',position:{x:3,y:3},
   dc:15,skill:'Investigation',rotation:{positions:4,current:0,target:2}},
  {id:'stone-effort',kind:'obstacle',label:'Stone Block',position:{x:3,y:2},
   dc:15,skill:'Athletics',targetObjectId:'quarry-block',obstacleMode:'shift',
   weightLb:340,helperNpcId:'mara-vell'}
 ],
 npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:12},
  {npcId:'orin-thale',position:{x:6,y:4},strength:11}]
};
const show=(c=first())=>applyDmSceneAction(c,hall,now);
const npc=(c:Campaign,id='mara-vell')=>c.explorationScene?.npcs?.find(n=>n.npcId===id);
const action=(c:Campaign,behavior:'move'|'follow'|'wait'|'operate'|'inspect',
 message:string,x?:number,y?:number,featureId?:string)=>
 applyDmSceneAction(c,{type:'npc',id:hall.id,npcId:'mara-vell',behavior,
  ...(x!==undefined?{x}:{}),...(y!==undefined?{y}:{}),...(featureId?{featureId}:{})},now,message);
const move=(c:Campaign,x:number,y:number)=>applyDmSceneAction(c,
 {type:'move',id:hall.id,x,y},now,'I walk to square '+(x+1)+', '+(y+1)+'.');
describe('v29 persistent NPC scene actors and agency',()=>{
 it('links a scene actor to the real world person and preserves their world relationship across reload and returning',()=>{
  let c=show();
  expect(npc(c)).toMatchObject({npcId:'mara-vell',position:{x:2,y:2},strength:12});
  expect(c.world?.npcs.find(n=>n.id==='mara-vell')?.relationship).toBe('Cautious but cooperative');
  expect(isCampaign(c)).toBe(true);
  expect(normalizeExplorationScene(JSON.parse(JSON.stringify(c.explorationScene)))).toEqual(JSON.parse(JSON.stringify(c.explorationScene)));
  c=action(c,'move','I ask Mara Vell to move to square 3, 4.',2,3);
  expect(npc(c)?.position).toEqual({x:2,y:3});
  c=applyDmSceneAction(c,{type:'hide'},now);
  c=applyDmSceneAction(c,{type:'show',id:hall.id,title:'Old Quarry'},now);
  expect(npc(c)?.position).toEqual({x:2,y:3});
  expect(c.world?.npcs.find(n=>n.id==='mara-vell')?.notes).toContain('Knows the quarry');
  expect(isCampaign(c)).toBe(true);
 });
 it('requires a named request and explicit DM approval; a refused request leaves the NPC unchanged',()=>{
  let c=show();
  const before=JSON.stringify(c.explorationScene);
  expect(()=>action(c,'move','I ask a stranger to move to square 3, 4.',2,3)).toThrow('named NPC');
  expect(()=>action(c,'move','Mara Vell spontaneously moves to square 3, 4.',2,3)).toThrow('player must make a request');
  expect(()=>action(c,'move','I ask Mara Vell to move somewhere else.',2,3)).toThrow('requested square');
  expect(()=>action(c,'move','I ask Mara Vell to move to square 1, 1.',0,0)).toThrow('unreachable');
  expect(()=>action(c,'move','I ask Mara Vell to move to square 4, 3.',3,2)).toThrow('unreachable');
  expect(JSON.stringify(c.explorationScene)).toBe(before);
  c=action(c,'follow','I ask Mara Vell to follow me.');
  expect(npc(c)?.following).toBe(true);
  c=action(c,'wait','I ask Mara Vell to wait here.');
  expect(npc(c)?.following).not.toBe(true);
  expect(isCampaign(c)).toBe(true);
 });
 it('following is persisted, bounded to 30 feet per player move, and cannot collide with another NPC',()=>{
  let c=action(show(),'follow','I ask Mara Vell to follow me.');
  c=move(c,5,0);
  const n=npc(c)!;
  expect(n.following).toBe(true);
  expect(n.position).not.toEqual(c.explorationScene?.playerPosition);
  expect(Math.abs(n.position.x-2)+Math.abs(n.position.y-2)).toBeLessThanOrEqual(6);
  expect(n.position).not.toEqual(npc(c,'orin-thale')?.position);
  expect(isCampaign(c)).toBe(true);
  c=action(c,'wait','I ask Mara Vell to wait here.');
  const frozen={...npc(c)!.position};
  c=move(c,0,5);
  expect(npc(c)?.position).toEqual(frozen);
 });
 it('NPCs operate the same saved mechanism and do not bypass prerequisite checks',()=>{
  let c=show();
  c=action(c,'operate','I ask Mara Vell to rotate the North Statue one step clockwise.',undefined,undefined,'quarry-statue');
  expect(c.explorationScene?.features?.find(f=>f.id==='quarry-statue')?.rotation?.current).toBe(1);
  expect(c.explorationScene?.playerPosition).toEqual({x:0,y:0});
  expect(c.journal.at(-1)?.text).toMatch(/Mara Vell/);
  c=action(c,'operate','I ask Mara Vell to rotate the North Statue one step clockwise.',undefined,undefined,'quarry-statue');
  expect(c.explorationScene?.features?.find(f=>f.id==='quarry-statue')?.activated).toBe(true);
  expect(()=>action(c,'operate','I ask Mara Vell to rotate the North Statue.',undefined,undefined,'quarry-statue')).toThrow('accessible');
 });
 it('NPC inspection cannot reveal hidden clues by narration alone',()=>{
  let c=show();
  c=action(c,'inspect','I ask Mara Vell to investigate the North Statue.',undefined,undefined,'quarry-statue');
  expect(c.journal.at(-1)?.text).toContain('Any discoveries require separate adjudication');
  expect(c.explorationScene?.features?.find(f=>f.id==='quarry-statue')?.rotation?.current).toBe(0);
  expect(isCampaign(c)).toBe(true);
 });
 it('a dynamic helper uses actual NPC position, ability, and existing world name',()=>{
  let c=move(show(),2,1);
  const request={sceneId:hall.id,featureId:'stone-effort',goal:'heavy-shift',x:4,y:2,method:'helper'};
  const message='I push the Stone Block one square east with help from Mara Vell.';
  const pending=sceneCheckRequest(c,request,{skill:'Athletics',token:'npc-help-token'},message);
  expect(pending).toMatchObject({featureId:'stone-effort',method:'helper'});
  const resolved=resolveSceneCheck({...c,pendingSceneCheck:pending!},'npc-help-token',true);
  expect(resolved.explorationScene?.battlefield.objects[0]).toMatchObject({x:4,y:2});
  expect(isCampaign(resolved)).toBe(true);
  c=action(c,'move','I ask Mara Vell to move to square 3, 5.',2,4);
  expect(sceneCheckRequest(c,request,{skill:'Athletics',token:'stale'},message)).toBeUndefined();
 });
 it('invalid NPC identities, overlapping positions and undeclared helpers are rejected',()=>{
  const invalid=(patch:object)=>()=>applyDmSceneAction(first(),{...hall,...patch},now);
  expect(invalid({npcs:[{npcId:'unknown-person',position:{x:2,y:2},strength:10}]})).toThrow('established world');
  expect(invalid({npcs:[{npcId:'mara-vell',position:{x:0,y:0},strength:12}]})).toThrow('NPC placement');
  expect(invalid({npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:12},
   {npcId:'mara-vell',position:{x:2,y:3},strength:12}]})).toThrow('NPC placement');
  expect(invalid({npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:45}]})).toThrow('NPC placement');
  expect(invalid({npcs:[{npcId:'mara-vell',position:{x:2,y:2},strength:12,following:true}]})).toThrow('cannot assume');
  expect(invalid({npcs:[{npcId:'orin-thale',position:{x:6,y:4},strength:10}]})).toThrow('mapped NPC');
 });
});
