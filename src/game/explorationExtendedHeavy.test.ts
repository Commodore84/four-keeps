import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign,type Campaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {applyDmSceneAction,sceneCheckRequest,resolveSceneCheck,normalizeExplorationScene} from './explorationScene';
import {carryingCapacity} from './carryingCapacity';

const now='2026-11-27T20:00:00.000Z';
function make():Campaign {
 return beginAdventureSession({...newCampaign('Extended Heavy Test','extended-heavy',now),
  characterIdentity:{name:'Scout',speciesId:'human',backgroundId:'guard',classId:'rogue',draftId:'heavy',
   pronouns:'',appearance:'',personality:'',backstory:''}},now);
}
const hall={
 type:'show',id:'moving-wall-hall',title:'Moving wall hall',
 battlefield:{width:9,height:6,objects:[
  {id:'boulder-platform',kind:'cargo',x:2,y:1,width:2,height:2},
  {id:'forge-gate',kind:'door',x:7,y:2,width:1,height:1,locked:true,forceDC:15}]},
 features:[
  {id:'shift-platform',kind:'obstacle',label:'Stone Platform',position:{x:2,y:1},dc:15,skill:'Athletics',
   targetObjectId:'boulder-platform',obstacleMode:'shift',weightLb:400,leveragePoint:true,
   rig:{label:'Counterweight Winch',multiplier:2},
   helper:{label:'Mara Vell',strength:10,position:{x:1,y:2}}},
  {id:'lift-gate',kind:'obstacle',label:'Forge Gate',position:{x:7,y:2},dc:15,skill:'Athletics',
   targetObjectId:'forge-gate',obstacleMode:'lift',weightLb:340}
 ]};
const shown=(c:Campaign=make())=>applyDmSceneAction(c,hall,now);
const move=(c:Campaign,x:number,y:number)=>applyDmSceneAction(c,{type:'move',id:hall.id,x,y},now,'I walk to the object.');
const result=(c:Campaign,method?:'crowbar'|'rig'|'helper',message?:string)=>
 sceneCheckRequest(c,{sceneId:hall.id,featureId:'shift-platform',goal:'heavy-shift',x:3,y:1,...(method?{method}:{})},
  {skill:'Athletics',token:'bound-heavy'},message??'I push the Stone Platform one square east.');
const prop=(c:Campaign,id:string)=>c.explorationScene?.battlefield.objects.find(o=>o.id===id);
describe('v29 expanded multi-tile heavy interaction',()=>{
 it('moves every occupied cell of a 2x2 object, saves position, and blocks a collision on its far edge',()=>{
  let c=move(shown(),1,1);
  expect(result(c)).toBeUndefined(); // 400 lb exceeds human STR 8 x 30 = 240
  c={...c,characterIdentity:{...c.characterIdentity!,speciesId:'goliath'}};
  expect(carryingCapacity(c)).toBe(240);
  const issued=result(c)!;
  expect(issued).toMatchObject({goal:'heavy-shift',x:3,y:1});
  const missed=resolveSceneCheck({...c,pendingSceneCheck:issued},issued.token,false);
  expect(prop(missed,'boulder-platform')).toMatchObject({x:2,y:1,width:2,height:2});
  c=resolveSceneCheck({...missed,pendingSceneCheck:issued},issued.token,true);
  expect(prop(c,'boulder-platform')).toMatchObject({x:3,y:1,width:2,height:2});
  expect(c.explorationScene?.features?.find(f=>f.id==='shift-platform')?.position).toEqual({x:3,y:1});
  expect(isCampaign(c)).toBe(true);
  expect(normalizeExplorationScene(JSON.parse(JSON.stringify(c.explorationScene)))).toEqual(JSON.parse(JSON.stringify(c.explorationScene)));
  const blocked={...shown(),characterIdentity:{...make().characterIdentity!,speciesId:'goliath'}};
  const positioned=move(blocked,1,1);
  const withWall={...positioned,explorationScene:{...positioned.explorationScene!,
   battlefield:{...positioned.explorationScene!.battlefield,objects:[
    ...positioned.explorationScene!.battlefield.objects,{id:'far-edge-wall',kind:'wall' as const,x:4,y:2,width:1,height:1}]}}};
  expect(result(withWall)).toBeUndefined(); // collision exists only at far corner of target rectangle
  expect(isCampaign(withWall)).toBe(true);
 });
 it('a scene-authored counterweight rig doubles capacity only when requested by its full name',()=>{
  const c=move(shown(),1,1);
  expect(result(c,'rig','I push the Stone Platform one square east using the Counterweight Winch.')).toMatchObject({method:'rig'});
  expect(result(c,'rig','I push the Stone Platform one square east.')).toBeUndefined();
  const issued=result(c,'rig','I push the Stone Platform one square east using the Counterweight Winch.')!;
  const settled=resolveSceneCheck({...c,pendingSceneCheck:issued},issued.token,true);
  expect(prop(settled,'boulder-platform')).toMatchObject({x:3,y:1});
  expect(isCampaign(settled)).toBe(true);
 });
 it('only an already-established, adjacent helper contributes strength and requires explicit naming',()=>{
  const c=move(shown(),1,1);
  expect(result(c,'helper','I push the Stone Platform one square east with help from Mara Vell.')).toMatchObject({method:'helper'});
  expect(result(c,'helper','I push the Stone Platform one square east by myself.')).toBeUndefined();
  const noHelper={...c,explorationScene:{...c.explorationScene!,features:c.explorationScene!.features!.map(f=>
   f.id==='shift-platform'?{...f,helper:undefined}:f)}};
  expect(result(noHelper,'helper','I push the Stone Platform one square east with help from Mara Vell.')).toBeUndefined();
 });
 it('crowbar offers leverage but cannot increase lifting capacity, and must be owned',()=>{
  let c=move(shown(),1,1);
  expect(result(c,'crowbar','I push the Stone Platform one square east using a crowbar.')).toBeUndefined();
  c={...c,inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Crowbar',quantity:1}]}};
  expect(result(c,'crowbar','I push the Stone Platform one square east using my crowbar.')).toBeUndefined();
  c={...c,characterIdentity:{...c.characterIdentity!,speciesId:'goliath'}};
  expect(result(c,'crowbar','I push the Stone Platform one square east using my crowbar.')).toMatchObject({method:'crowbar'});
  expect(result(c,'crowbar','I push the Stone Platform one square east.')).toBeUndefined();
 });
 it('temporary Strength effects update the same capacity used by inventory, and expired effects do not',()=>{
  let c=move(shown(),1,1);
  c={...c,temporaryEffects:[{kind:'potion-strength',targetId:'nighthawk',strength:21,expiresAt:3600}]};
  expect(carryingCapacity(c)).toBe(315);
  expect(result(c)).toBeDefined(); // 21 x 30 = 630
  const expired={...c,elapsedMinutes:61};
  expect(result(expired)).toBeUndefined();
 });
 it('no scene method can be added after a check is issued to bypass the capacity limit',()=>{
  const c=move(shown(),1,1);
  const issued=result(c,'rig','I push the Stone Platform one square east using the Counterweight Winch.')!;
  const weakened={...c,explorationScene:{...c.explorationScene!,features:c.explorationScene!.features!.map(f=>
    f.id==='shift-platform'?{...f,rig:undefined}:f)}};
  const settled=resolveSceneCheck({...weakened,pendingSceneCheck:issued},issued.token,true);
  expect(prop(settled,'boulder-platform')?.x).toBe(2);
 });
 it('rejects implausible helper locations, multipliers, empty labels, and oversized object moves',()=>{
  const invalid=(mod:Record<string,unknown>)=>()=>applyDmSceneAction(make(),{
   ...hall,features:[{...hall.features[0],...mod},hall.features[1]]},now);
  expect(invalid({rig:{label:'cheat',multiplier:4}})).toThrow('Invalid scene feature');
  expect(invalid({helper:{label:'Help',strength:42,position:{x:1,y:2}}})).toThrow('Invalid scene feature');
  expect(invalid({helper:{label:'Help',strength:10,position:{x:2,y:1}}})).toThrow('Invalid scene feature');
  expect(invalid({weightLb:6001})).toThrow('Invalid scene feature');
  const oversized={...hall,battlefield:{...hall.battlefield,objects:hall.battlefield.objects.map(o=>
    o.id==='boulder-platform'?{...o,width:4}:o)}};
  expect(()=>applyDmSceneAction(make(),oversized,now)).toThrow('Invalid scene feature');
 });
});
