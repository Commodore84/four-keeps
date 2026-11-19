import {describe,it,expect} from 'vitest';
import {narrationLines,narrationDelay,narrationBlocks} from './DMNarration';
describe('DM narration line segmentation',()=>{
 it('preserves paragraph pauses and all words',()=>{
  const text='The market wakes as bells ring. A cart rattles down the lane.\n\nA watchman raises one eyebrow.';
  const lines=narrationLines(text);
  expect(lines.length).toBeGreaterThan(1);
  expect(narrationBlocks(text)).toHaveLength(2);
  expect(narrationBlocks(text).map(block=>block.text).join(' ')).toBe(text.replace(/\s+/g,' ').trim());
 });
 it('breaks long narration into short readable lines',()=>{
  const lines=narrationLines('The village square is bustling with merchants and travelers who have come from distant roads to trade strange wares and tell improbable stories.');
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.every(line=>line.length<=90)).toBe(true);
 });
});

describe('narration pacing',()=>{it('slows progressive options 20 percent and preserves instant',()=>{expect(narrationDelay).toEqual({slow:1020,normal:624,fast:312,instant:0});});});

describe('paragraph and dialogue structure',()=>{
 it('normalizes soft wraps but preserves paragraph boundaries',()=>{
  expect(narrationBlocks('Morning settles over\nDasahi.\n\nA cart rattles by.')).toEqual([
   {kind:'narration',text:'Morning settles over Dasahi.'},
   {kind:'narration',text:'A cart rattles by.'}
  ]);
 });
 it('renders explicitly attributed dialogue and alternating speakers without inventing labels',()=>{
  expect(narrationBlocks('The market is busy.\n\nMara: "Fresh figs!"\n\nA guard looks over.\n\nGuard: "Move along."')).toEqual([
   {kind:'narration',text:'The market is busy.'},
   {kind:'dialogue',speaker:'Mara',text:'"Fresh figs!"'},
   {kind:'narration',text:'A guard looks over.'},
   {kind:'dialogue',speaker:'Guard',text:'"Move along."'}
  ]);
 });
 it('retains unattributed speech as narration and does not invent a speaker',()=>{
  expect(narrationBlocks('Someone calls, "Wait!"')).toEqual([{kind:'narration',text:'Someone calls, "Wait!"'}]);
 });
 it('retains attribution wording while styling quoted speech',()=>{
  expect(narrationBlocks('Mara says, "Hello."')).toEqual([
   {kind:'narration',text:'Mara says,'},
   {kind:'dialogue',speaker:'Mara',text:'"Hello."'}
  ]);
 });
});
