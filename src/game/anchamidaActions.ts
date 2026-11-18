import type {Campaign} from './campaign';
import {anchamidaLocation} from './anchamida';
import {discoverAnchamidaSite} from './anchamidaDiscovery';
import {addDynamicSite,updateDynamicSite,type DynamicSite} from './anchamidaDynamic';

type MapAction=
 | {type:'discover';id:string;identity?:{name:string;description:string}}
 | {type:'create';site:DynamicSite}
 | {type:'update';id:string;discovered?:boolean;hidden?:boolean;archived?:boolean};

/** Apply only explicit structured DM map actions. Never parse narrative for map mutations. */
export function applyAnchamidaActions(campaign:Campaign,raw:unknown):Campaign {
 if(raw==null)return campaign;
 if(!Array.isArray(raw)||raw.length>8)throw Error('Invalid DM map actions');
 let next=campaign;
 const keys=(value:object,allowed:readonly string[])=>Object.keys(value).every(key=>allowed.includes(key));
 for(const item of raw){
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid DM map action');
  const action=item as MapAction;
  if(action.type==='discover'){
   if(!keys(action,['type','id','identity'])||typeof action.id!=='string'||!anchamidaLocation(action.id))throw Error('Unknown predefined site');
   if(action.identity!==undefined&&(!action.identity||typeof action.identity.name!=='string'||typeof action.identity.description!=='string'||!keys(action.identity,['name','description'])))throw Error('Invalid site identity');
   next=discoverAnchamidaSite(next,action.id,action.identity);
  }else if(action.type==='create'){
   if(!keys(action,['type','site']))throw Error('Unexpected map action fields');
   const s=action.site;
   if(!s||typeof s!=='object'||typeof s.id!=='string'||typeof s.name!=='string'||typeof s.description!=='string'||typeof s.kind!=='string'||typeof s.discovered!=='boolean')throw Error('Invalid created location');
   if(!keys(s,['id','name','description','x','y','kind','createdAt','discovered','archived','hidden','expiresAt']))throw Error('Unexpected location fields');
   if(typeof s.archived!=='undefined'&&typeof s.archived!=='boolean'||typeof s.hidden!=='undefined'&&typeof s.hidden!=='boolean')throw Error('Invalid location visibility');
   next=addDynamicSite(next,s);
  }else if(action.type==='update'){
   if(!keys(action,['type','id','discovered','hidden','archived']))throw Error('Unexpected map action fields');
   if(typeof action.id!=='string'||!next.mapDynamicSites?.some(s=>s.id===action.id))throw Error('Unknown dynamic site');
   const change:Partial<Pick<DynamicSite,'discovered'|'hidden'|'archived'>>={};
   for(const key of ['discovered','hidden','archived'] as const){
    if(action[key]!==undefined){if(typeof action[key]!=='boolean')throw Error('Invalid map visibility');change[key]=action[key];}
   }
   next=updateDynamicSite(next,action.id,change);
  }else throw Error('Unsupported DM map action');
 }
 return next;
}
