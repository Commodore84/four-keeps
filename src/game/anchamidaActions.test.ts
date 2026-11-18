import {describe,it,expect} from 'vitest';
import {applyAnchamidaActions} from './anchamidaActions';
import {visibleDynamicSites} from './anchamidaDynamic';
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

describe('DM map actions persistence and isolation',()=>{
 it('applies multi-step discovery, visibility and archive changes only to the chosen campaign',()=>{
  const other={...c,id:'campaign-b'};
  const created=applyAnchamidaActions(c,[{type:'create',site}]);
  const hidden=applyAnchamidaActions(created,[{type:'update',id:site.id,hidden:true}]);
  expect(hidden.mapDynamicSites?.[0].hidden).toBe(true);
  const shown=applyAnchamidaActions(hidden,[{type:'update',id:site.id,hidden:false,discovered:true}]);
  expect(shown.mapDynamicSites?.[0].hidden).toBe(false);
  const archived=applyAnchamidaActions(shown,[{type:'update',id:site.id,archived:true}]);
  expect(archived.mapDynamicSites?.[0].archived).toBe(true);
  expect(JSON.parse(JSON.stringify(archived)).mapDynamicSites[0].archived).toBe(true);
  expect(other.mapDynamicSites).toHaveLength(0);
  expect(c.mapDynamicSites).toHaveLength(0);
 });
 it('does not partially modify the input on an invalid action batch',()=>{
  const first={type:'create',site};
  expect(()=>applyAnchamidaActions(c,[first,{type:'update',id:'dm-not-created',archived:true}])).toThrow();
  expect(c.mapDynamicSites).toHaveLength(0);
 });
 it('validates fixed site names and geography',()=>{
  expect(()=>applyAnchamidaActions(c,[{type:'discover',id:'city-dasahi',identity:{name:'New Capital',description:'A city'}}])).toThrow();
  expect(()=>applyAnchamidaActions(c,[{type:'discover',id:'map-feature-016',identity:{name:'Stoneveil Falls',description:'A flat plain'}}])).toThrow();
 });
 it('rejects invalid visibility fields and malformed create payloads',()=>{
  const created=applyAnchamidaActions(c,[{type:'create',site}]);
  expect(()=>applyAnchamidaActions(created,[{type:'update',id:site.id,hidden:'yes'}])).toThrow();
  expect(()=>applyAnchamidaActions(c,[{type:'create',site:{...site,createdAt:'yesterday'}}])).toThrow();
  expect(()=>applyAnchamidaActions(c,[{type:'create',site:{...site,x:Infinity}}])).toThrow();
 });
});

describe('provider map-action contract hardening',()=>{
 it('rejects contradictory and unexpected payloads atomically',()=>{
  for(const invalid of [
   [{type:'create',site},{type:'update',id:'dm-camp-1',archived:'yes'}],
   [{type:'create',site:{...site,hidden:'false'}}],
   [{type:'create',site:{...site,unknown:'surprise'}}],
   [{type:'discover',id:'map-feature-001',unknown:true}],
   [{type:'create',site:{...site,kind:'temporary'}}],
   [{type:'create',site:{...site,kind:'temporary',expiresAt:99}}],
   [{type:'create',site:{...site,kind:'minor',expiresAt:200}}],
  ])expect(()=>applyAnchamidaActions(c,invalid)).toThrow();
  expect(c.mapDynamicSites).toEqual([]);
 });
 it('accepts idempotent replay with reordered JSON fields, rejects changed identity',()=>{
  const first=applyAnchamidaActions(c,[{type:'create',site}]);
  const reordered=Object.fromEntries(Object.entries(site).reverse());
  expect(applyAnchamidaActions(first,[{type:'create',site:reordered}])).toBe(first);
  expect(()=>applyAnchamidaActions(first,[{type:'create',site:{...site,name:'Different camp'}}])).toThrow('Location ID already assigned');
 });
 it('temporary sites expire from visibility without deleting campaign history',()=>{
  const temp={...site,id:'dm-temp-1',kind:'temporary',createdAt:100,expiresAt:200};
  const created=applyAnchamidaActions(c,[{type:'create',site:temp}]);
  expect(created.mapDynamicSites).toHaveLength(1);
  expect(created.mapDynamicSites?.[0].expiresAt).toBe(200);
  expect(visibleDynamicSites(created,199)).toHaveLength(1);
  expect(visibleDynamicSites(created,200)).toHaveLength(0);
  expect(created.mapDynamicSites).toHaveLength(1);
 });
});
