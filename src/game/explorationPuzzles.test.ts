import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign,type Campaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {applyDmSceneAction,sceneCheckRequest,resolveSceneCheck,normalizeExplorationScene} from './explorationScene';

const now='2026-11-27T21:00:00.000Z';
const make=():Campaign=>beginAdventureSession({...newCampaign('Puzzle test','puzzle-test',now),
 characterIdentity:{name:'Scout',speciesId:'human',backgroundId:'guard',classId:'rogue',draftId:'test',
 pronouns:'',appearance:'',personality:'',backstory:''}},now);
const temple={
 type:'show',id:'sun-temple',title:'Sun temple',
 battlefield:{width:7,height:4,objects:[{id:'sun-door',kind:'door',x:5,y:1,width:1,height:1,locked:true,lockDC:20}]},
 features:[
  {id:'star-inscription',kind:'clue',label:'Star inscription',position:{x:1,y:1},dc:10,skill:'Investigation'},
  {id:'copper-key',kind:'key',label:'Copper Sun Key',position:{x:1,y:0},dc:10,skill:'Perception'},
  {id:'north-statue',kind:'mechanism',label:'North statue',position:{x:2,y:1},dc:10,skill:'Investigation',
   requiresFeatureId:'star-inscription',rotation:{positions:4,current:0,target:2}},
  {id:'south-statue',kind:'mechanism',label:'South statue',position:{x:3,y:1},dc:10,skill:'Investigation',
   requiresFeatureId:'star-inscription',rotation:{positions:4,current:0,target:3}},
  {id:'sun-latch',kind:'mechanism',label:'Sun latch',position:{x:4,y:1},dc:10,skill:'Investigation',
   linkedObjectId:'sun-door',requiresMechanismIds:['north-statue','south-statue'],requiresKeyId:'copper-key'}
 ]} as const;
const sceneAction=(c:Campaign,a:Record<string,unknown>,say:string)=>
 applyDmSceneAction(c,a,now,say);
const feature=(c:Campaign,id:string)=>c.explorationScene?.features?.find(f=>f.id===id);
const act=(c:Campaign,id:string,message:string)=>sceneAction(c,{type:'activate',id:temple.id,featureId:id},message);
const move=(c:Campaign,x:number,y:number)=>sceneAction(c,{type:'move',id:temple.id,x,y},'I walk toward the '+x+','+y+' square.');
function discover(c:Campaign,id:string,skill:'Investigation'|'Perception',token:string){
 const bound=sceneCheckRequest(c,{sceneId:temple.id,featureId:id,goal:'discover'},{skill,token});
 expect(bound).toMatchObject({sceneId:temple.id,featureId:id,goal:'discover'});
 return resolveSceneCheck({...c,pendingSceneCheck:bound},token,true);
}

describe('v29 conversation-driven multi-stage environmental puzzles',()=>{
 it('persists all staged state and only releases the door after key, clue and two correct alignments',()=>{
  let c=applyDmSceneAction(make(),temple,now);
  expect(c.explorationScene?.features?.map(f=>f.discovered)).toEqual([false,false,true,true,true]);
  expect(c.explorationScene?.battlefield.objects[0].locked).toBe(true);
  c=move(c,1,1);
  expect(()=>act(c,'north-statue','I rotate the North statue one step clockwise.')).toThrow('prerequisite');
  expect(()=>sceneAction(c,{type:'take',id:temple.id,featureId:'copper-key'},'I pick up the Copper Sun Key.')).toThrow('unknown');
  c=discover(c,'star-inscription','Investigation','inscription-check');
  c=discover(c,'copper-key','Perception','key-check');
  expect(()=>sceneAction(c,{type:'take',id:temple.id,featureId:'copper-key'},'I take a different key.')).toThrow('requested');
  c=sceneAction(c,{type:'take',id:temple.id,featureId:'copper-key'},'I pick up the Copper Sun Key.');
  expect(feature(c,'copper-key')?.collected).toBe(true);
  expect(()=>sceneAction(c,{type:'take',id:temple.id,featureId:'copper-key'},'I pick up the Copper Sun Key.')).toThrow('already collected');
  c=move(c,2,1);
  expect(()=>act(c,'north-statue','The statue is magically aligned.')).toThrow('explicit');
  expect(()=>act(c,'south-statue','I rotate the North statue clockwise.')).toThrow('does not match');
  c=act(c,'north-statue','I rotate the North statue one step clockwise.');
  expect(feature(c,'north-statue')?.rotation?.current).toBe(1);
  expect(normalizeExplorationScene(JSON.parse(JSON.stringify(c.explorationScene)))).toEqual(JSON.parse(JSON.stringify(c.explorationScene)));
  expect(isCampaign(c)).toBe(true);
  expect(feature(c,'north-statue')?.activated).not.toBe(true);
  c=act(c,'north-statue','I rotate the North statue one step clockwise.');
  expect(feature(c,'north-statue')?.activated).toBe(true);
  expect(c.explorationScene?.battlefield.objects[0].locked).toBe(true);
  c=act(c,'south-statue','I rotate the South statue one step counterclockwise.');
  expect(feature(c,'south-statue')?.rotation).toMatchObject({current:3,target:3});
  expect(feature(c,'south-statue')?.activated).toBe(true);
  c=move(c,3,1);
  c=act(c,'sun-latch','I pull the Sun latch.');
  expect(feature(c,'sun-latch')?.activated).toBe(true);
  expect(c.explorationScene?.battlefield.objects[0]).toMatchObject({locked:false});
  expect(c.explorationScene?.battlefield.objects[0].open).not.toBe(true);
  expect(()=>act(c,'sun-latch','I pull the Sun latch.')).toThrow('accessible');
  c=move(c,4,1);
  c=sceneAction(c,{type:'open',id:temple.id,objectId:'sun-door'},'I open the sun door.');
  expect(c.explorationScene?.battlefield.objects[0].open).toBe(true);
  expect(normalizeExplorationScene(JSON.parse(JSON.stringify(c.explorationScene)))).toEqual(c.explorationScene);
  expect(isCampaign(c)).toBe(true);
  expect(c.journal.filter(j=>j.id==='key-sun-temple-copper-key')).toHaveLength(1);
  expect(c.journal.filter(j=>j.id==='mechanism-sun-temple-sun-latch')).toHaveLength(1);
  expect(()=>applyDmSceneAction(c,{type:'show',id:temple.id,title:temple.title,features:[]})).toThrow('rewrite');
 });
 it('rejects missing references, duplicate requirements, cycles, invalid rotations and fake collected keys',()=>{
  const original=make();
  const bad=(features:unknown[])=>()=>applyDmSceneAction(original,{...temple,features},now);
  expect(bad([{...temple.features[4],requiresKeyId:'phantom-key'}])).toThrow('prerequisites');
  expect(bad([{...temple.features[2],requiresMechanismIds:['south-statue','south-statue']}])).toThrow('feature');
  const cycle=[temple.features[0],temple.features[1],
    {...temple.features[2],requiresMechanismIds:['south-statue']},
    {...temple.features[3],requiresMechanismIds:['north-statue']},temple.features[4]];
  expect(bad(cycle)).toThrow('Cyclic');
  expect(bad([{...temple.features[2],rotation:{positions:4,current:4,target:2}}])).toThrow('feature');
  expect(bad([{...temple.features[1],collected:true,discovered:false}])).toThrow('feature');
  expect(bad([{...temple.features[2],linkedObjectId:'nonexistent'}])).toThrow('feature');
  let c=applyDmSceneAction(original,temple,now);
  c=move(c,1,1);
  expect(()=>act(c,'sun-latch','I pull the Sun latch.')).toThrow('accessible');
  expect(()=>sceneAction(c,{type:'take',id:temple.id,featureId:'copper-key',bonus:true},'I take the Copper Sun Key.')).toThrow('explicit player intent');
 });
 it('does not treat failed sealed discovery as discovered, and does not share keys with a different scene',()=>{
  let c=move(applyDmSceneAction(make(),temple,now),1,1);
  const pending=sceneCheckRequest(c,{sceneId:temple.id,featureId:'copper-key',goal:'discover'},
    {skill:'Perception',token:'key-failure'})!;
  expect(pending).toBeTruthy();
  c=resolveSceneCheck({...c,pendingSceneCheck:pending},'key-failure',false);
  expect(feature(c,'copper-key')?.discovered).toBe(false);
  expect(feature(c,'copper-key')?.collected).not.toBe(true);
  expect(sceneCheckRequest(c,{sceneId:temple.id,featureId:'copper-key',goal:'discover'},
    {skill:'Investigation',token:'wrong-skill'})).toBeUndefined();
 });
});
