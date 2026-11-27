import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign,type Campaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {applyDmSceneAction,sceneCheckRequest,resolveSceneCheck,normalizeExplorationScene,pendingTrapRoll,resolvePendingTrap} from './explorationScene';

const now='2026-11-27T19:00:00.000Z';
const make=():Campaign=>beginAdventureSession({...newCampaign('Heavy fixtures','heavy-test',now),
 characterIdentity:{name:'Scout',speciesId:'human',backgroundId:'guard',classId:'rogue',draftId:'heavy',
 pronouns:'',appearance:'',personality:'',backstory:''}},now);
const room={
 type:'show',id:'iron-chamber',title:'Iron chamber',
 battlefield:{width:8,height:4,objects:[
  {id:'sentinel-statue',kind:'statue',x:2,y:1,width:1,height:1,material:'stone'},
  {id:'heavy-gate',kind:'door',x:5,y:1,width:1,height:1,locked:true,forceDC:15,lockDC:15,material:'iron'}
 ]},
 features:[
  {id:'move-sentinel',kind:'obstacle',label:'Stone Sentinel',position:{x:2,y:1},dc:15,
   skill:'Athletics',targetObjectId:'sentinel-statue',obstacleMode:'shift',weightLb:210},
  {id:'lift-portcullis',kind:'obstacle',label:'Iron Portcullis',position:{x:5,y:1},dc:15,
   skill:'Athletics',targetObjectId:'heavy-gate',obstacleMode:'lift',weightLb:200}
 ]} as const;
const visible=()=>applyDmSceneAction(make(),room,now);
const approach=(c:Campaign,x:number,y:number)=>applyDmSceneAction(c,{type:'move',id:room.id,x,y},now,'I walk across the room.');
const shift=(c:Campaign,x:number,y:number,message='I push the Stone Sentinel one square east using Athletics.')=>
 sceneCheckRequest(c,{sceneId:room.id,featureId:'move-sentinel',goal:'heavy-shift',x,y},
   {skill:'Athletics',token:'sealed-shift'},message);
const lift=(c:Campaign,message='I lift the Iron Portcullis.')=>
 sceneCheckRequest(c,{sceneId:room.id,featureId:'lift-portcullis',goal:'heavy-lift'},
   {skill:'Athletics',token:'sealed-lift'},message);
const obj=(c:Campaign,id:string)=>c.explorationScene?.battlefield.objects.find(o=>o.id===id);
const obstacle=(c:Campaign,id:string)=>c.explorationScene?.features?.find(f=>f.id===id);

describe('v30 sealed Strength/Athletics environmental interactions',()=>{
 it('one successful sealed Athletics check shifts a heavy statue one legal square, saves geometry and preserves combat physics',()=>{
  let c=approach(visible(),1,1);
  expect(obstacle(c,'move-sentinel')).toMatchObject({discovered:true,weightLb:210,obstacleMode:'shift'});
  expect(shift(c,3,1)).toMatchObject({goal:'heavy-shift',x:3,y:1,featureId:'move-sentinel'});
  expect(isCampaign({...c,pendingSceneCheck:shift(c,3,1)!})).toBe(true);
  expect(shift(c,3,1,'I move the cargo west.')).toBeUndefined();
  expect(shift(c,4,1)).toBeUndefined(); // no teleporting two cells
  expect(shift(c,2,2)).toBeUndefined(); // no diagonal shifts
  expect(shift(c,1,1,'I push the Stone Sentinel one square west.')).toBeUndefined(); // player occupies destination
  const p=shift(c,3,1)!;
  const failed=resolveSceneCheck({...c,pendingSceneCheck:p},p.token,false);
  expect(obj(failed,'sentinel-statue')).toMatchObject({x:2,y:1});
  expect(failed.pendingSceneCheck).toBeUndefined();
  c=resolveSceneCheck({...failed,pendingSceneCheck:p},p.token,true);
  expect(obj(c,'sentinel-statue')).toMatchObject({x:3,y:1,kind:'statue'});
  expect(obstacle(c,'move-sentinel')?.position).toEqual({x:3,y:1});
  expect(c.pendingSceneCheck).toBeUndefined();
  expect(isCampaign(c)).toBe(true);
  expect(normalizeExplorationScene(JSON.parse(JSON.stringify(c.explorationScene)))).toEqual(JSON.parse(JSON.stringify(c.explorationScene)));
  expect(()=>applyDmSceneAction(c,{...room,features:[]},now)).toThrow();
 });
 it('does not permit a heavy check above the 2024 Strength push/drag/lift capacity',()=>{
  let c=approach(visible(),1,1);
  c={...c,character:{...c.character!,scores:{...c.character!.scores,str:6}}};
  expect(shift(c,3,1)).toBeUndefined(); // 6 * 30 = 180 lb, below 210 lb
  const stronger={...c,character:{...c.character!,scores:{...c.character!.scores,str:8}}};
  expect(shift(stronger,3,1)).toBeDefined();
  expect(sceneCheckRequest(stronger,{sceneId:room.id,featureId:'move-sentinel',goal:'heavy-shift',x:3,y:1},
    {skill:'Investigation',token:'wrong'},'I push the Stone Sentinel one square east.')).toBeUndefined();
 });
 it('raises a heavy iron gate only after a valid sealed success, not on narration or failed checks',()=>{
  let c=approach(visible(),4,1);
  const check=lift(c)!;expect(check).toMatchObject({goal:'heavy-lift',featureId:'lift-portcullis'});
  expect(lift(c,'I look at the Iron Portcullis.')).toBeUndefined();
  const failed=resolveSceneCheck({...c,pendingSceneCheck:check},check.token,false);
  expect(obj(failed,'heavy-gate')).toMatchObject({locked:true});
  c=resolveSceneCheck({...failed,pendingSceneCheck:check},check.token,true);
  expect(obj(c,'heavy-gate')).toMatchObject({locked:false,open:true});
  expect(obstacle(c,'lift-portcullis')?.completed).toBe(true);
  expect(lift(c)).toBeUndefined();
  expect(isCampaign(c)).toBe(true);
 });
 it('an armed trapped gate interrupts the successful lift and invokes the existing one-time saving-throw pipeline',()=>{
  const danger={saveAbility:'dex',saveDC:10,damageDice:'1d4',damageType:'piercing',onSave:'half'};
  const trapped={...room,features:[...room.features,
    {id:'spring-needle',kind:'trap',label:'Spring needle',position:{x:5,y:1},dc:10,
     skill:'Perception',targetObjectId:'heavy-gate',trapEffect:danger}]};
  let c=approach(applyDmSceneAction(make(),trapped,now),4,1);
  const req=lift(c)!;
  c=resolveSceneCheck({...c,pendingSceneCheck:req},req.token,true);
  expect(c.pendingTrapSave).toMatchObject({featureId:'spring-needle',stage:'hazard'});
  expect(obj(c,'heavy-gate')).toMatchObject({locked:false});
  expect(obj(c,'heavy-gate')?.open).not.toBe(true);
  expect(lift(c)).toBeUndefined();
  const resolved=resolvePendingTrap(pendingTrapRoll(c,20,[2]),3,now);
  expect(resolved.pendingTrapSave).toBeUndefined();
  const opened=applyDmSceneAction(resolved,{type:'open',id:room.id,objectId:'heavy-gate'},now,'I open the heavy gate.');
  expect(obj(opened,'heavy-gate')?.open).toBe(true);
  expect(isCampaign(opened)).toBe(true);
 });
 it('refuses invalid heavy obstacle payloads, ambiguous objects, wrong skills and blocked geometry',()=>{
  const invalid=(feature:unknown,object=room.battlefield.objects[0])=>
    ()=>applyDmSceneAction(make(),{...room,battlefield:{...room.battlefield,objects:[object]},features:[feature]},now);
  expect(invalid({...room.features[0],targetObjectId:'missing'})).toThrow('feature');
  expect(invalid({...room.features[0],weightLb:901})).toThrow('feature');
  expect(invalid({...room.features[0],skill:'Investigation'})).toThrow('feature');
  expect(invalid({...room.features[0],obstacleMode:'lift'})).toThrow('feature');
  const near=approach(visible(),1,1);
  const blocked={...near,explorationScene:{...near.explorationScene!,battlefield:{
    ...near.explorationScene!.battlefield,objects:[...near.explorationScene!.battlefield.objects,
      {id:'stone-wall',kind:'wall' as const,x:3,y:1,width:1,height:1}]}}};
  expect(shift(blocked,3,1)).toBeUndefined();
 });
});
