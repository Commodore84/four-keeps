import {describe,it,expect} from 'vitest';
import {newCampaign,isCampaign} from './campaign';
import {beginAdventureSession,travelAdventure,proposeAdventureEncounter} from './adventureSession';
import {adventureMemory,prepareAdventureAction,commitAdventureAction} from './adventureOrchestrator';
import {applyDmSceneAction,normalizeExplorationScene,syncSceneWithCombat} from './explorationScene';
import {battlefieldBlocked} from './battlefield';
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
});
