import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {OPENING_INTENT,prepareAdventureOpening,commitAdventureOpening,needsAdventureOpening,prepareAdventureAction,commitAdventureAction,adventureMemory} from './adventureOrchestrator';

describe('AI adventure opening orchestration',()=>{
 it('offers a shop without forcing an action or a scripted opening',()=>{expect(OPENING_INTENT).toContain('general-goods shop');expect(OPENING_INTENT).toContain('do not make the player move');expect(OPENING_INTENT).toContain('free-form exploration');});
  const make=()=>({...newCampaign('Journey','opening-test','2026-01-01T00:00:00Z'),characterIdentity:{name:'Aster',speciesId:'human',backgroundId:'sage',classId:'wizard',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''}});
  it('specifies an immersive grounded opening without commanding the player',()=>{
    expect(OPENING_INTENT).toContain('150–250 words');
    expect(OPENING_INTENT).toContain('sensory impressions');
    expect(OPENING_INTENT).toContain('authoritative saved starting location');
    expect(OPENING_INTENT).toContain('do not make the player move');
    expect(OPENING_INTENT).toContain('do not invent personal history');
    expect(OPENING_INTENT).toContain('Do not demand a choice');
  });
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
    const restored=JSON.parse(JSON.stringify(opened));
    expect(needsAdventureOpening(restored)).toBe(false);
    expect(commitAdventureOpening(restored,'A regenerated scene').journal).toEqual(restored.journal);
    expect(restored.journal.find((e:{id:string})=>e.id==='opening-test-dm-opening').text).toBe('A bell rings from the old road.');

    expect(needsAdventureOpening(opened)).toBe(false);
  });
  it('rejects an empty or unstarted opening',()=>{
    expect(()=>commitAdventureOpening(make(),'Hello')).toThrow();
    expect(()=>commitAdventureOpening(prepareAdventureOpening(make()),'  ')).toThrow();
  });
});

describe('persistent AI adventure actions',()=>{
  const campaign=()=>prepareAdventureOpening({...newCampaign('Journey','action-test','2026-01-01T00:00:00Z'),characterIdentity:{name:'Aster',speciesId:'human',backgroundId:'sage',classId:'wizard',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''}});
  it('persists pending intent and retries the same ID without duplicate turns',()=>{
    const pending=prepareAdventureAction(campaign(),'I ask the guard about the bell','turn-1');
    expect(prepareAdventureAction(pending,'I ask the guard about the bell','turn-1')).toBe(pending);
    expect(()=>prepareAdventureAction(pending,'Another action','turn-2')).toThrow();
    const committed=commitAdventureAction(pending,'turn-1','The guard lowers his voice.');
    expect(committed.pendingAdventureAction).toBeUndefined();
    expect(committed.journal.filter(e=>e.id.startsWith('turn-1'))).toHaveLength(2);
    expect(commitAdventureAction(committed,'turn-1','Duplicate')).toBe(committed);
    expect(()=>commitAdventureAction(pending,'other-id','Stale')).toThrow();
  });
  it('remembers structured NPCs and reported clues without upgrading their certainty',()=>{
    const pending=prepareAdventureAction(campaign(),'Who was here?','turn-3');
    const done=commitAdventureAction(pending,'turn-3','A witness saw a figure.',undefined,['A bell rang at dusk'],{
      npcs:[{name:'Mira',role:'Guard',location:'Frontier Village',relationship:'neutral',notes:['Knows the road']}],
      clues:[{text:'A hooded figure was seen',evidence:'reported',source:'Mira'}]
    });
    expect(adventureMemory(done).npcs[0].name).toBe('Mira');
    expect(adventureMemory(done).clues[0].evidence).toBe('reported');
    expect(adventureMemory(done).establishedFacts).toContain('A bell rang at dusk');
  });
});
