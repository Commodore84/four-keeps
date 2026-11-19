import {describe,it,expect} from 'vitest';
import {parseMerchantDiscountRequest,merchantPurchaseReply} from './merchantDialogue';

describe('natural merchant conversation parsing',()=>{
 it.each([
  ['Could you give me 10% off?',1000,10],
  ['How about a 5% discount?',1000,5],
  ['Could you knock 15% off the whole order?',1000,15],
  ['Would you take 9 GP for it?',1000,10],
  ['I offer 90 SP for everything.',1000,10],
  ['Could you accept 900 CP?',1000,10],
  ['I will pay 8 gold for the lot.',1000,20],
 ])('recognizes a concrete proposed discount in %s', (message,total,expected)=>{
  expect(parseMerchantDiscountRequest(message,total)).toBe(expected);
 });
 it.each(['What is your best price?','Could you do better?','What are your opening hours?','I will take it','I offer 20 GP for it'])('%s',message=>{
  // Price discussions without a valid lower numeric offer never authorize a discount.
  expect(parseMerchantDiscountRequest(message,1000)).toBeNull();
 });
 it.each(['Deal','Sounds good','You have a deal','I will take them','Confirm purchase','That works for me'])('%s',message=>{
  expect(merchantPurchaseReply(message)).toBe('accept');
 });
 it.each(['No thanks','Cancel order','Not today','Forget it'])('%s',message=>{
  expect(merchantPurchaseReply(message)).toBe('cancel');
 });
 it.each(['Could I have 10% off?','Maybe later','I would buy it for 8 GP'])('%s',message=>{
  expect(merchantPurchaseReply(message)).toBeNull();
 });
});
