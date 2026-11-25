import {describe,it,expect} from 'vitest';
import type {Campaign} from './campaign';
import {queuePostCombatFollowUp,recoverPostCombatFollowUp,commitPostCombatFollowUp} from './postCombatFollowUp';
const marker='The encounter is won. Exploration resumes; the DM may adjudicate recovered loot and rewards.';
const base=():Campaign=>({
 id:'campaign-after-warehouse',schemaVersion:1,characterIdentity:{classId:'rogue',name:'Nighthawk'},
 adventureSession:{status:'exploring',site:'frontier',characterSource:'campaign-character',visited:[],interactions:[]},
 journal:[{id:'combat-summary',kind:'system',text:'A giant rat drops after the final shortbow attack.',createdAt:'2026-11-25T10:00:00Z'},
   {id:'completed-old',kind:'system',text:marker,createdAt:'2026-11-25T10:00:01Z'}]
} as unknown as Campaign);

describe('post-combat DM follow-up',()=>{
 it('queues a saved follow-up, without inserting a fake player message',()=>{
  const saved=base();
  const queued=queuePostCombatFollowUp(saved,'Giant rat',false,'3 rounds, victory');
  expect(queued.journal).toEqual(saved.journal);
  expect(queued.postCombatFollowUp?.opponent).toBe('Giant rat');
  expect(queued.postCombatFollowUp?.outcome).toBe('victory');
  const replied=commitPostCombatFollowUp(queued,queued.postCombatFollowUp!.id,'The warehouse grows quiet. What do you do next?');
  expect(replied.postCombatFollowUp).toBeUndefined();
  expect(replied.journal.at(-1)).toMatchObject({kind:'dm',text:'The warehouse grows quiet. What do you do next?'});
  expect(commitPostCombatFollowUp(replied,queued.postCombatFollowUp!.id,'Duplicate')).toEqual(replied);
  expect(replied.journal.filter(entry=>entry.kind==='player')).toHaveLength(0);
 });
 it('recovers an already completed real encounter from an older saved campaign',()=>{
  const recovered=recoverPostCombatFollowUp(base());
  expect(recovered.postCombatFollowUp?.id).toBe('legacy-completed-old');
  expect(recovered.postCombatFollowUp?.recap).toContain('giant rat');
  const reply=commitPostCombatFollowUp(recovered,'legacy-completed-old','The fighting has ended.');
  expect(recoverPostCombatFollowUp(reply)).toBe(reply);
 });
 it('never repeats the follow-up after a newer DM or player turn',()=>{
  const old=base();
  const conversation={...old,journal:[...old.journal,{id:'dm-next',kind:'dm' as const,text:'A witness waves from the pier.',createdAt:'2026-11-25T10:00:02Z'}]};
  expect(recoverPostCombatFollowUp(conversation)).toBe(conversation);
 });
 it('does not migrate an ongoing encounter or a training session',()=>{
  const old=base();
  const active={...old,combat:{status:'initiative-set',round:1,enemyName:'Training Dummy',enemyInitiative:15}};
  expect(recoverPostCombatFollowUp(active as Campaign)).toBe(active);
  const withoutMarker={...old,journal:old.journal.slice(0,1)};
  expect(recoverPostCombatFollowUp(withoutMarker)).toBe(withoutMarker);
 });
 it('preserves a pending retry if DM response is empty or tied to a stale id',()=>{
  const queued=queuePostCombatFollowUp(base(),'Rat',true,'Defeat');
  expect(()=>commitPostCombatFollowUp(queued,'stale','Text')).toThrow();
  expect(()=>commitPostCombatFollowUp(queued,queued.postCombatFollowUp!.id,'   ')).toThrow();
  expect(queued.postCombatFollowUp?.outcome).toBe('defeat');
 });
});
