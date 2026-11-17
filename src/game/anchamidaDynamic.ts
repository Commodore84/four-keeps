import type {Campaign} from './campaign';
import {anchamidaLocations} from './anchamida';

export type DynamicSiteKind='permanent'|'minor'|'temporary';
export type DynamicSite={
  id:string; name:string; description:string; x:number;y:number;
  kind:DynamicSiteKind; discovered:boolean; archived?:boolean; hidden?:boolean;
  expiresAt?:number; createdAt:number;
};
export const MAX_VISIBLE_DYNAMIC_SITES=30;
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const normalize=(s:string)=>s.trim().toLocaleLowerCase().replace(/\s+/g,' ');

/** Deterministic, campaign-owned changes. No narrative text alone can mutate the map. */
export function addDynamicSite(campaign:Campaign,site:DynamicSite):Campaign {
  if(!/^dm-[a-z0-9-]{3,80}$/.test(site.id))throw new Error('Invalid dynamic site ID');
  if(!site.name.trim()||!site.description.trim())throw new Error('Location identity is required');
  if(!Number.isFinite(site.x)||!Number.isFinite(site.y)||site.x<0||site.x>100||site.y<0||site.y>100)throw new Error('Location outside map');
  if(!Number.isFinite(site.createdAt)||site.createdAt<0)throw new Error('Invalid creation time');
  if(site.expiresAt!==undefined&&(!Number.isFinite(site.expiresAt)||site.expiresAt<0))throw new Error('Invalid expiry');
  if(!['permanent','minor','temporary'].includes(site.kind))throw new Error('Invalid location kind');
  const current=campaign.mapDynamicSites??[];
  const prior=current.find(x=>x.id===site.id);
  if(prior) {
    if(JSON.stringify(prior)!==JSON.stringify(site))throw new Error('Location ID already assigned');
    return campaign;
  }
  if(current.some(x=>!x.archived&&normalize(x.name)===normalize(site.name)&&distance(x,site)<2))throw new Error('Duplicate nearby location');
  if(anchamidaLocations.some(x=>normalize(x.name)&&normalize(x.name)===normalize(site.name)&&distance(x,site)<2))throw new Error('Duplicate predefined location');
  return {...campaign,mapDynamicSites:[...current,{...site}]};
}
export function updateDynamicSite(campaign:Campaign,id:string,change:Partial<Pick<DynamicSite,'discovered'|'hidden'|'archived'>>):Campaign {
  if(!campaign.mapDynamicSites?.some(s=>s.id===id))throw new Error('Unknown dynamic location');
  return {...campaign,mapDynamicSites:campaign.mapDynamicSites.map(s=>s.id===id?{...s,...change}:s)};
}
export function visibleDynamicSites(campaign:Campaign|null,now:number,limit=MAX_VISIBLE_DYNAMIC_SITES):DynamicSite[] {
  if(!Number.isFinite(now))throw new Error('Invalid time');
  return (campaign?.mapDynamicSites??[])
    .filter(s=>s.discovered&&!s.archived&&!s.hidden&&(s.kind!=='temporary'||s.expiresAt===undefined||s.expiresAt>now))
    .sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))
    .slice(0,Math.max(0,Math.floor(limit)));
}
/** Clusters nearby pins at low zoom without modifying persisted locations. */
export function clusterDynamicSites(sites:readonly DynamicSite[],zoom:number):{x:number;y:number;sites:DynamicSite[]}[] {
  const threshold=zoom<1.5?4:zoom<2.5?2:0;
  const clusters:{x:number;y:number;sites:DynamicSite[]}[]=[];
  for(const site of sites) {
    const group=threshold?clusters.find(c=>distance(c,site)<threshold):undefined;
    if(group){group.sites.push(site);group.x=group.sites.reduce((v,s)=>v+s.x,0)/group.sites.length;group.y=group.sites.reduce((v,s)=>v+s.y,0)/group.sites.length;}
    else clusters.push({x:site.x,y:site.y,sites:[site]});
  }
  return clusters;
}
