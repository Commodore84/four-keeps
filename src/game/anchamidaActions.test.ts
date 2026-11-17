import {describe,it,expect} from 'vitest';
import {applyAnchamidaActions} from './anchamidaActions';
import type {Campaign} from './campaign';
const c={id:'campaign-a',mapDiscovered:[],mapDynamicSites:[]} as unknown as Campaign;
const site={id:'dm-camp-1',name:'Pine Camp',description:'Tents near the river',x:46,y:58,kind:'minor',createdAt:100,discovered:true};
describe('structured authoritative DM map actions',()=>{
 it('does not infer sites from narration or absent actions',()=>{expect(applyAnchamidaActions(c,null)).toBe(c);expect(c.mapDynamicSites).toEqual([]);});
 it('creates and reveals campaign-owned locations',()=>{
  const a=applyAnchamidaActions(c,[{type:'create',site}]);
  expect(a.mapDynamicSites?.[0].name).toBe('Pine Camp');
  expect(c.mapDynamicSites).toEqual([]);
  const b=applyAnchamidaActions(a,[{type:'update',id:'dm-camp-1',hidden:true}]);
  expect(b.mapDynamicSites?.[0].hidden).toBe(true);
  expect(a.mapDynamicSites?.[0].hidden).toBeUndefined();
 });
 it('discovers predefined locations without changing fixed geography',()=>{
  const a=applyAnchamidaActions(c,[{type:'discover',id:'map-feature-001'}]);
  expect(a.mapDiscovered).toContain('map-feature-001');
 });
 it('rejects duplicate, invalid and unknown actions without modifying input',()=>{
  expect(()=>applyAnchamidaActions(c,[{type:'create',site},{type:'create',site:{...site,id:'dm-camp-2',name:'Pine Camp'}}])).toThrow();
  expect(()=>applyAnchamidaActions(c,[{type:'update',id:'dm-nope',hidden:true}])).toThrow();
  expect(()=>applyAnchamidaActions(c,[{type:'discover',id:'map-feature-017'}])).toThrow();
  expect(()=>applyAnchamidaActions(c,[{type:'create',site:{...site,x:101}}])).toThrow();
  expect(c.mapDynamicSites).toEqual([]);
 });
});
