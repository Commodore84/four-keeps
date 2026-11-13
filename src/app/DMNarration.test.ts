import {describe,it,expect} from 'vitest';
import {narrationLines} from './DMNarration';
describe('DM narration line segmentation',()=>{
 it('preserves paragraph pauses and all words',()=>{
  const text='The market wakes as bells ring. A cart rattles down the lane.\n\nA watchman raises one eyebrow.';
  const lines=narrationLines(text);
  expect(lines).toContain('');
  expect(lines.filter(Boolean).join(' ')).toBe(text.replace(/\s+/g,' ').trim());
 });
 it('breaks long narration into short readable lines',()=>{
  const lines=narrationLines('The village square is bustling with merchants and travelers who have come from distant roads to trade strange wares and tell improbable stories.');
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.every(line=>line.length<=90)).toBe(true);
 });
});
