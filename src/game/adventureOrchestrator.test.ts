import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {prepareAdventureOpening,commitAdventureOpening,needsAdventureOpening} from './adventureOrchestrator';

describe('AI adventure opening orchestration',()=>{
  const make=()=>({...newCampaign('Journey','opening-test','2026-01-01T00:00:00Z'),characterIdentity:{name:'Aster',speciesId:'human',backgroundId:'sage',classId:'wizard',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''}});
  it('starts a compatible authored session without modifying the player character',()=>{
    const c=make(),next=prepareAdventureOpening(c);
    expect(next.character).toEqual(c.character);
    expect(next.adventureSession?.site).toBe('frontier');
    expect(needsAdventureOpening(next)).toBe(true);
    expect(prepareAdventureOpening(next)).toBe(next);
  });
  it('commits exactly one DM opening and supports resume',()=>{
    const c=prepareAdventureOpening(make());
    const opened=commitAdventureOpening(c,'A bell rings from the old road.');
    expect(opened.journal.filter(e=>e.id==='opening-test-dm-opening')).toHaveLength(1);
    expect(commitAdventureOpening(opened,'A different opening')).toBe(opened);
    expect(needsAdventureOpening(opened)).toBe(false);
  });
  it('rejects an empty or unstarted opening',()=>{
    expect(()=>commitAdventureOpening(make(),'Hello')).toThrow();
    expect(()=>commitAdventureOpening(prepareAdventureOpening(make()),'  ')).toThrow();
  });
});
