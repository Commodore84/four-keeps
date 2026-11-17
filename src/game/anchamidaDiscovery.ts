import type {Campaign} from './campaign';
import {anchamidaLocation,anchamidaDMConstraints} from './anchamida';

/** A discovery is applied only after authoritative gameplay approval, never from map rendering. */
export function discoverAnchamidaSite(campaign:Campaign,id:string,identity?:{name:string;description:string}):Campaign {
  const location=anchamidaLocation(id);
  if(!location)throw new Error('Unknown Anchamida location');
  const constraints=anchamidaDMConstraints(location);
  if(identity) {
    if(constraints.name&&identity.name!==constraints.name)throw new Error('A fixed location name cannot be replaced');
    if(constraints.terrain&&!identity.description.includes(constraints.terrain))throw new Error('Location geography must be preserved');
  }
  const known=new Set(campaign.mapDiscovered??[]);
  known.add(id);
  const identities={...campaign.mapPoiIdentities};
  if(identity) {
    if(identities[id]&&(identities[id].name!==identity.name||identities[id].description!==identity.description))throw new Error('A campaign identity cannot be overwritten');
    identities[id]={...identity};
  }
  return {...campaign,mapDiscovered:[...known],mapPoiIdentities:identities};
}
