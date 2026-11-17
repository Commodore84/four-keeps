import {describe,it,expect} from 'vitest';
import {discoverAnchamidaSite} from './anchamidaDiscovery';
import {visibleAnchamidaLocations} from './anchamida';
import type {Campaign} from './campaign';
const campaign={id:'test-campaign',mapDiscovered:[],mapPoiIdentities:{}} as unknown as Campaign;
describe('campaign-scoped Anchamida discovery',()=>{
  it('does not mutate the source campaign and preserves unique discoveries',()=>{
    const one=discoverAnchamidaSite(campaign,'map-feature-005',{name:'Hidden Grove',description:'A quiet grove'});
    const twice=discoverAnchamidaSite(one,'map-feature-005',{name:'Hidden Grove',description:'A quiet grove'});
    expect(campaign.mapDiscovered).toEqual([]);
    expect(twice.mapDiscovered).toEqual(['map-feature-005']);
    expect(twice.mapPoiIdentities?.['map-feature-005']?.name).toBe('Hidden Grove');
    expect(visibleAnchamidaLocations(twice.mapDiscovered).map(x=>x.id)).toEqual(['city-dasahi','map-feature-005']);
    expect(visibleAnchamidaLocations(campaign.mapDiscovered).map(x=>x.id)).toEqual(['city-dasahi']);
    expect(JSON.parse(JSON.stringify(twice)).mapPoiIdentities['map-feature-005'].name).toBe('Hidden Grove');
  });
  it('rejects nonexistent sites and changed established identities',()=>{
    expect(()=>discoverAnchamidaSite(campaign,'map-feature-017')).toThrow();
    const saved=discoverAnchamidaSite(campaign,'map-feature-005',{name:'Grove',description:'A grove'});
    expect(()=>discoverAnchamidaSite(saved,'map-feature-005',{name:'Cave',description:'A cave'})).toThrow();
  });
  it('enforces approved names and terrain',()=>{
    expect(()=>discoverAnchamidaSite(campaign,'map-feature-033',{name:'Wrong Peak',description:'Active volcanic peak on the southeastern island, with a visible glowing summit.'})).toThrow();
    expect(()=>discoverAnchamidaSite(campaign,'map-feature-033',{name:'Mount Varkos',description:'Unrelated'})).toThrow();
  });
});
