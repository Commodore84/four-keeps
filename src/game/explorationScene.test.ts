import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign} from './campaign';
import {beginAdventureSession,travelAdventure,proposeAdventureEncounter} from './adventureSession';
import {adventureMemory,prepareAdventureAction,commitAdventureAction} from './adventureOrchestrator';
import {applyDmSceneAction,explorationRoute,sceneCheckRequest,resolveSceneCheck,normalizeExplorationScene,syncSceneWithCombat} from './explorationScene';
import {battlefieldBlocked,type Battlefield} from './battlefield';
import type {Campaign} from './campaign';

const now='2026-11-26T21:00:00.000Z';
const campaign=():Campaign=>beginAdventureSession({...newCampaign('Scene game','scene-campaign',now),
 characterIdentity:{name:'Hero',speciesId:'human',backgroundId:'guard',classId:'rogue',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''}},now);
const show={type:'show',id:'dockside-warehouse',title:'The Dockside Warehouse',templateId:'warehouse-vermin'};
describe('conversation-primary scene authority',()=>{
 it('requires an explicit DM command; ordinary narration never displays a map',()=>{
  const c=campaign();
  const pending=prepareAdventureAction(c,'I enter the warehouse.','turn-a',now);
  const narrated=commitAdventureAction(pending,'turn-a','You step into a cold warehouse.',now);
  expect(narrated.explorationScene).toBeUndefined();
  expect(applyDmSceneAction(narrated,null)).toBe(narrated);
 });
 it('persists a single seeded physical map, no encounter tokens, and reuses it across narration',()=>{
  const c=campaign();
  const mapped=applyDmSceneAction(c,show,now),scene=mapped.explorationScene!;
  expect(scene.visible).toBe(true);
  expect(scene.title).toBe('The Dockside Warehouse');
  expect(scene.battlefield.width).toBe(40);
  expect(scene.battlefield.objects.length).toBeGreaterThan(0);
  expect(battlefieldBlocked(scene.battlefield,scene.playerPosition)).toBe(false);
  expect(normalizeExplorationScene(scene)).toEqual(scene);
  expect(isCampaign(mapped)).toBe(true);
  const persisted=JSON.parse(JSON.stringify(mapped)) as Campaign;
  const repeated=applyDmSceneAction(persisted,show,now);
  expect(repeated.explorationScene?.battlefield).toEqual(scene.battlefield);
  expect(adventureMemory(repeated).scene).toMatchObject({id:show.id,visible:true,playerPosition:scene.playerPosition});
  expect('actors' in scene.battlefield).toBe(false);
 });
 it('preserves geometry through a matching DM combat handoff, without starting initiative from a map',()=>{
  const c=applyDmSceneAction(campaign(),show,now),scene=c.explorationScene!;
  expect(c.combat).toBeUndefined();
  expect(c.adventureSession?.pendingEncounter).toBeUndefined();
  const proposed=proposeAdventureEncounter(c,'Giant Rat','fight-a',now,undefined,'warehouse-vermin');
  expect(proposed.adventureSession?.pendingEncounter?.scenario?.battlefield).toEqual(scene.battlefield);
  expect(proposed.adventureSession?.pendingEncounter?.scenario?.starts[0]).toEqual(scene.playerPosition);
  const started={...c,combat:{status:'awaiting-initiative' as const,enemyName:'Giant Rat',
   enemyInitiative:0,round:0,turnIndex:0,battlefield:{...scene.battlefield,objects:scene.battlefield.objects.map(o=>
    o.kind==='door'?{...o,open:true}:o)},classicAdventure:{
     origin:'dm' as const,scenarioLocation:c.location,first:{id:'rat',name:'Giant Rat',hp:7,maxHp:7,speed:30,attackBonus:4,damageDice:'1d4',damageModifier:2,ac:12}
    }}};
  expect(syncSceneWithCombat(started).explorationScene?.battlefield).toEqual(started.combat.battlefield);
 });
 it('unlocked openings update saved map; locked doors and fabricated object actions cannot bypass checks',()=>{
  const c=campaign();
  const map={width:12,height:10,objects:[
   {id:'gate',kind:'door',x:4,y:4,width:1,height:1},
   {id:'sealed',kind:'door',x:6,y:4,width:1,height:1,locked:true,lockDC:15},
   {id:'wall',kind:'wall',x:8,y:2,width:1,height:5}]};
  const shown=applyDmSceneAction(c,{type:'show',id:'tower-room',title:'Tower Room',battlefield:map},now);
  expect(()=>applyDmSceneAction(shown,{type:'open',id:'tower-room',objectId:'gate'})).toThrow('reach');
  const nearby={...shown,explorationScene:{...shown.explorationScene!,playerPosition:{x:3,y:4}}};
  const opened=applyDmSceneAction(nearby,{type:'open',id:'tower-room',objectId:'gate'},now);
  expect(opened.explorationScene?.battlefield.objects.find(o=>o.id==='gate')?.open).toBe(true);
  expect(shown.explorationScene?.battlefield.objects.find(o=>o.id==='gate')?.open).toBeUndefined();
  expect(()=>applyDmSceneAction(shown,{type:'open',id:'tower-room',objectId:'sealed'})).toThrow();
  expect(()=>applyDmSceneAction(shown,{type:'open',id:'other-room',objectId:'gate'})).toThrow();
  expect(()=>applyDmSceneAction(shown,{type:'open',id:'tower-room',objectId:'wall'})).toThrow();
  expect(()=>applyDmSceneAction(opened,{type:'show',id:'tower-room',title:'Tower Room',battlefield:map})).toThrow();
 });
 it('hides when the DM dismisses a scene or a verified travel changes locations',()=>{
  const shown=applyDmSceneAction(campaign(),show,now);
  const hidden=applyDmSceneAction(shown,{type:'hide'},now);
  expect(hidden.explorationScene?.visible).toBe(false);
  expect(hidden.explorationScene?.battlefield).toEqual(shown.explorationScene?.battlefield);
  const travelled=travelAdventure(shown,'crossroads',now);
  expect(travelled.explorationScene?.visible).toBe(false);
  expect(travelled.location).not.toBe(shown.explorationScene?.location);
  expect(isCampaign(travelled)).toBe(true);
 });
 it('rejects maps beyond the mobile budget and never mutates a pending fight',()=>{
  const c=campaign();
  expect(()=>applyDmSceneAction(c,{type:'show',id:'oversize-scene',title:'Oversized',battlefield:{width:100,height:100,objects:[]}})).toThrow('budget');
  const fighting=proposeAdventureEncounter(c,'Giant Rat','battle');
  expect(fighting.adventureSession?.pendingEncounter).toBeDefined();
  expect(()=>applyDmSceneAction({...c,adventureSession:{...c.adventureSession!,status:'encounter'}},show)).toThrow('exploration');
 });

 it('routes over five-foot squares using difficult terrain and refuses corner-cutting or closed walls',()=>{
  const water:Battlefield={width:3,height:1,objects:[{id:'pool',kind:'water',x:1,y:0,width:1,height:1}]};
  expect(explorationRoute(water,{x:0,y:0},{x:2,y:0})?.distanceFeet).toBe(15);
  const sealed:Battlefield={width:3,height:3,objects:[
   {id:'right',kind:'wall',x:1,y:0,width:1,height:1},
   {id:'below',kind:'wall',x:0,y:1,width:1,height:1}
  ]};
  expect(explorationRoute(sealed,{x:0,y:0},{x:1,y:1})).toBeUndefined();
  expect(explorationRoute(sealed,{x:0,y:0},{x:2,y:2})).toBeUndefined();
  const corridor:Battlefield={width:3,height:1,objects:[{id:'door',kind:'door',x:1,y:0,width:1,height:1,locked:true}]};
  expect(explorationRoute(corridor,{x:0,y:0},{x:2,y:0})).toBeUndefined();
  expect(explorationRoute({...corridor,objects:[{...corridor.objects[0],locked:false,open:true}]},{x:0,y:0},{x:2,y:0})?.distanceFeet).toBe(10);
 });
 it('moves only in response to explicit player movement intent, and saves the authoritative square',()=>{
  const shown=applyDmSceneAction(campaign(),{type:'show',id:'small-room',title:'Room',battlefield:{
   width:4,height:3,objects:[{id:'seam',kind:'door',x:2,y:1,width:1,height:1,locked:true}]}},now);
  expect(()=>applyDmSceneAction(shown,{type:'move',id:'small-room',x:1,y:1},now)).toThrow('player');
  expect(()=>applyDmSceneAction(shown,{type:'move',id:'small-room',x:8,y:1},now,'I move there.')).toThrow('route');
  expect(()=>applyDmSceneAction(shown,{type:'move',id:'small-room',x:2,y:1},now,'I move there.')).toThrow('route');
  const moved=applyDmSceneAction(shown,{type:'move',id:'small-room',x:1,y:1},now,'I carefully walk toward the crates.');
  expect(moved.explorationScene?.playerPosition).toEqual({x:1,y:1});
  expect(shown.explorationScene?.playerPosition).toEqual({x:0,y:0});
  expect(isCampaign(moved)).toBe(true);
 });
 it('preserves discovered features and never accepts a DM rewrite on revisiting a map',()=>{
  const shown=applyDmSceneAction(campaign(),{type:'show',id:'puzzle-room',title:'Puzzle Room',battlefield:{
   width:6,height:5,objects:[]},features:[
   {id:'hidden-note',kind:'clue',label:'Hidden note',position:{x:2,y:2},dc:15,skill:'Investigation'},
   {id:'needle',kind:'trap',label:'Needle mechanism',position:{x:3,y:3},dc:10,skill:'Perception'}
  ]},now);
  expect(shown.explorationScene?.features?.every(f=>!f.discovered)).toBe(true);
  expect(isCampaign(shown)).toBe(true);
  expect(normalizeExplorationScene(JSON.parse(JSON.stringify(shown.explorationScene)))).toEqual(shown.explorationScene);
  expect(()=>applyDmSceneAction(shown,{type:'show',id:'puzzle-room',title:'Puzzle Room',features:[]})).toThrow('rewrite');
  expect(()=>applyDmSceneAction(campaign(),{type:'show',id:'bad-puzzle',title:'Puzzle',battlefield:{width:3,height:3,objects:[]},
   features:[{id:'wrong',kind:'trap',label:'Hidden',position:{x:99,y:1},dc:15,skill:'Perception'}]})).toThrow('feature');
 });
 it('binds discoveries to a verified check token, revealing nothing on failure',()=>{
  let shown=applyDmSceneAction(campaign(),{type:'show',id:'study',title:'Study',battlefield:{
   width:5,height:5,objects:[]},features:[{id:'ledger',kind:'clue',label:'Smuggler ledger',
   position:{x:1,y:2},dc:15,skill:'Investigation'}]},now);
  const check={token:'sealed-token',skill:'Investigation'};
  const intent={sceneId:'study',featureId:'ledger',goal:'discover'};
  expect(sceneCheckRequest(shown,intent,check)).toEqual({...intent,token:'sealed-token'});
  expect(sceneCheckRequest(shown,intent,{...check,skill:'Perception'})).toBeUndefined();
  expect(sceneCheckRequest(shown,{...intent,featureId:'ghost'},check)).toBeUndefined();
  const bound={...shown,pendingSceneCheck:sceneCheckRequest(shown,intent,check)};
  expect(resolveSceneCheck(bound,'other-token',true)).toBe(bound);
  const failed=resolveSceneCheck(bound,'sealed-token',false);
  expect(failed.explorationScene?.features?.[0].discovered).toBe(false);
  expect(failed.pendingSceneCheck).toBeUndefined();
  const revealed=resolveSceneCheck(bound,'sealed-token',true);
  expect(revealed.explorationScene?.features?.[0].discovered).toBe(true);
  expect(revealed.pendingSceneCheck).toBeUndefined();
  expect(resolveSceneCheck(revealed,'sealed-token',true)).toBe(revealed);
  expect(isCampaign(revealed)).toBe(true);
  shown=revealed;
  expect(sceneCheckRequest(shown,intent,check)).toBeUndefined();
 });
 it('disarming traps requires a discovered adjacent feature and owned Thieves Tools',()=>{
  const shown=applyDmSceneAction(campaign(),{type:'show',id:'cellar',title:'Cellar',
   battlefield:{width:6,height:4,objects:[]},features:[{id:'snare',kind:'trap',label:'Snare',
   position:{x:1,y:1},dc:15,skill:'Perception'}]},now);
  const detection={sceneId:'cellar',featureId:'snare',goal:'discover'};
  const detected=resolveSceneCheck({...shown,pendingSceneCheck:sceneCheckRequest(shown,detection,{skill:'Perception',token:'detect'})},'detect',true);
  const disarm={sceneId:'cellar',featureId:'snare',goal:'disarm'};
  const check={skill:'Sleight of Hand',tool:'Thieves’ Tools',token:'disarm'};
  expect(sceneCheckRequest(detected,disarm,check)).toBeUndefined();
  const equipped={...detected,inventoryLedger:{currency:{CP:0,SP:0,EP:0,GP:0,PP:0},gear:[{name:'Thieves’ Tools',quantity:1}]}};
  const bound=sceneCheckRequest(equipped,disarm,check)!;
  expect(bound).toMatchObject(disarm);
  const safe=resolveSceneCheck({...equipped,pendingSceneCheck:bound},'disarm',true);
  expect(safe.explorationScene?.features?.[0].disarmed).toBe(true);
  expect(sceneCheckRequest(safe,disarm,check)).toBeUndefined();
  const far={...equipped,explorationScene:{...equipped.explorationScene!,playerPosition:{x:5,y:3}}};
  expect(sceneCheckRequest(far,disarm,check)).toBeUndefined();
 });
 it('carries the explored player position into the verified combat entry',()=>{
  const shown=applyDmSceneAction(campaign(),show,now);
  const position={x:1,y:15};
  const map=shown.explorationScene!.battlefield;
  expect(explorationRoute(map,shown.explorationScene!.playerPosition,position)).toBeTruthy();
  const moved=applyDmSceneAction(shown,{type:'move',id:show.id,...position},now,'I walk through the warehouse.');
  const fight=proposeAdventureEncounter(moved,'Giant Rat','battle-2',now,undefined,'warehouse-vermin');
  const scenario=fight.adventureSession?.pendingEncounter?.scenario;
  expect(scenario?.starts[0]).toEqual(position);
  expect(scenario?.entryOptions?.[0].square).toEqual(position);
  expect(scenario?.battlefield).toEqual(moved.explorationScene?.battlefield);
 });

});
