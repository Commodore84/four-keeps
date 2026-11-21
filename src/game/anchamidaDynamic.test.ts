import {describe,it,expect} from 'vitest';
import type {Campaign} from './campaign';
import {addDynamicSite,updateDynamicSite,visibleDynamicSites,clusterDynamicSites,type DynamicSite} from './anchamidaDynamic';
const campaign={id:'one'} as Campaign;
const site=(id:string,x=40,y=40,kind:DynamicSite['kind']='minor'):DynamicSite=>({id,name:id,description:'A roadside campsite',x,y,kind,createdAt:100,discovered:true});
describe('Anchamida campaign-owned DM locations',()=>{
 it('persists new sites only in their campaign and rejects collisions',()=>{
  const a=addDynamicSite(campaign,site('dm-camp-1'));
  expect(campaign.mapDynamicSites).toBeUndefined();
  expect(visibleDynamicSites(a,200)).toHaveLength(1);
  expect(visibleDynamicSites(campaign,200)).toHaveLength(0);
  expect(addDynamicSite(a,site('dm-camp-1'))).toBe(a);
  expect(()=>addDynamicSite(a,{...site('dm-camp-1'),x:50})).toThrow();
  expect(()=>addDynamicSite(a,{...site('dm-camp-2'),name:'dm-camp-1',x:40.5})).toThrow();
  expect(JSON.parse(JSON.stringify(a)).mapDynamicSites[0].name).toBe('dm-camp-1');
 });
 it('rejects invalid geography and protected predefined site duplicates',()=>{
  expect(()=>addDynamicSite(campaign,site('dm-camp-1',101))).toThrow();
  expect(()=>addDynamicSite(campaign,{...site('dm-camp-1',61.42,70.87),name:'Dasahi'})).toThrow();
 });
 it('hides expired temporary sites without deleting records',()=>{
  const c=addDynamicSite(campaign,{...site('dm-temp-1',50,50,'temporary'),expiresAt:200});
  expect(visibleDynamicSites(c,199)).toHaveLength(1);
  expect(visibleDynamicSites(c,200)).toHaveLength(0);
  expect(c.mapDynamicSites).toHaveLength(1);
  const archived=updateDynamicSite(c,'dm-temp-1',{archived:true});
  expect(visibleDynamicSites(archived,100)).toHaveLength(0);
  expect(archived.mapDynamicSites?.[0].archived).toBe(true);
 });
 it('caps rendered pins but preserves every discovered location',()=>{
  let c=campaign;
  for(let i=0;i<35;i++)c=addDynamicSite(c,site('dm-place-'+i,(i%7)*12+5,Math.floor(i/7)*12+5));
  expect(c.mapDynamicSites).toHaveLength(35);
  expect(visibleDynamicSites(c,200)).toHaveLength(30);
  expect(clusterDynamicSites([site('dm-a',40,40),site('dm-b',41,41)],1)).toHaveLength(1);
  expect(clusterDynamicSites([site('dm-a',40,40),site('dm-b',41,41)],3)).toHaveLength(2);
 });
});
