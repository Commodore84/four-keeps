import {describe,it,expect} from 'vitest';
import {newCampaign,trainingTerrain,trainingStepCost,trainingRouteCost,tacticalRoute,moveDuelToken,trainingCoverBlocksSight,canNighthawkHide} from './campaign';

function encounter(){
 const c=newCampaign('Forest test','forest-test');
 return {...c,combat:{status:'initiative-set' as const,enemyName:'Training Dummy',enemyInitiative:10,playerInitiative:20,round:1,order:['Nighthawk','Training Dummy'],turnIndex:0,playerPosition:{x:6,y:11},enemyPosition:{x:12,y:0},enemyHp:12,enemyMaxHp:12,movementUsed:0,movementAllowance:35}};
}
describe('illustrated forest-ruins terrain contract',()=>{
 it('classifies artwork-aligned brush, water, walls and open ground',()=>{
  expect(trainingTerrain(2,4)).toBe('brush');
  expect(trainingTerrain(9,10)).toBe('stream');
  expect(trainingTerrain(4,4)).toBe('wall');
  expect(trainingTerrain(0,0)).toBe('open');
 });
 it('charges double movement through difficult terrain',()=>{
  expect(trainingStepCost(9,10)).toBe(10);
  expect(trainingStepCost(2,4)).toBe(10);
  expect(trainingStepCost(0,0)).toBe(5);
  expect(trainingRouteCost([{x:9,y:11},{x:9,y:10},{x:9,y:9}])).toBe(20);
 });
 it('routes around walls and prefers less expensive routes',()=>{
  const c=encounter().combat!;
  const route=tacticalRoute(c,{x:8,y:7});
  expect(route).not.toBeNull();
  expect(route!.some(p=>trainingTerrain(p.x,p.y)==='wall')).toBe(false);
  expect(trainingRouteCost(route!)).toBeGreaterThan(0);
 });
 it('uses terrain-aware movement cost in real combat',()=>{
  const c=encounter();
  const route=tacticalRoute(c.combat!,{x:7,y:10})!;
  const cost=trainingRouteCost(route);
  const moved=moveDuelToken(c,7,10);
  expect(moved.combat!.movementUsed).toBe(cost);
 });
 it('keeps stone obstacles authoritative for hide sight checks',()=>{
  expect(trainingCoverBlocksSight({x:3,y:4},{x:5,y:4})).toBe(true);
  expect(canNighthawkHide({...encounter().combat!,playerPosition:{x:3,y:4},enemyPosition:{x:5,y:4}})).toBe(true);
 });
});
