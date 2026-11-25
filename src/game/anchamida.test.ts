import { describe, expect, it } from 'vitest';
import { anchamidaLocations, anchamidaPixelPosition, anchamidaDMConstraints, visibleAnchamidaLocations } from './anchamida';
describe('Anchamida approved regional data', () => {
  it('contains four cities and 32 confirmed secondary sites with unique IDs and valid coordinates', () => {
    expect(anchamidaLocations).toHaveLength(36);
    expect(anchamidaLocations.filter(x=>x.type==='city')).toHaveLength(4);
    expect(anchamidaLocations.filter(x=>x.type==='discovery'&&x.confirmed)).toHaveLength(32);
    expect(new Set(anchamidaLocations.map(x=>x.id)).size).toBe(36);
    for(const site of anchamidaLocations) {
      expect(site.x).toBeGreaterThanOrEqual(0);expect(site.x).toBeLessThanOrEqual(100);
      expect(site.y).toBeGreaterThanOrEqual(0);expect(site.y).toBeLessThanOrEqual(100);
    }
  });
  it('reveals only Dasahi initially and keeps discoveries campaign-scoped', () => {
    expect(visibleAnchamidaLocations().map(x=>x.id)).toEqual(['city-dasahi']);
    expect(visibleAnchamidaLocations(['map-feature-005']).map(x=>x.id)).toEqual(['city-dasahi','map-feature-005']);
    expect(visibleAnchamidaLocations().map(x=>x.id)).toEqual(['city-dasahi']);
  });
  it('respects blank fields independently of marker identifiers', () => {
    const site=anchamidaLocations.find(x=>x.id==='map-feature-005')!;
    expect(anchamidaDMConstraints(site)).toEqual({name:null,terrain:null});
    expect(anchamidaDMConstraints(anchamidaLocations.find(x=>x.id==='map-feature-032')!)).toEqual({name:null,terrain:'Hidden entrance to an underground lair'});
  });
  it('scales marker coordinates without moving their relative positions',()=>{
    const site=anchamidaLocations.find(x=>x.id==='city-dasahi')!;
    expect(anchamidaPixelPosition(site)).toEqual({x:8192*.6142,y:12288*.7087});
    expect(anchamidaPixelPosition(site,2048,3072)).toEqual({x:2048*.6142,y:3072*.7087});
  });
});
