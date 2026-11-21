import {describe,it,expect} from 'vitest';
import {parseDungeonMasterResponse as parse} from '../api/dm-response.js';
describe('DM live response contract',()=>{
 it('accepts explicit structured narration and confirmed combat identity',()=>expect(parse('\x60\x60\x60json\n{"narration":"A robber draws steel.","combatStart":{"enemyName":"Highway robber"}}\n\x60\x60\x60')).toMatchObject({narration:'A robber draws steel.',combatStart:{enemyName:'Highway robber'}}));
 it('rejects malformed JSON rather than saving raw JSON as narrative',()=>expect(()=>parse('{"narration":')).toThrow('invalid response'));
 it('rejects empty narration and malformed combat handoffs',()=>{
  for(const value of [{narration:' '},{narration:'Fight',combatStart:{}},{narration:'Fight',combatStart:{enemyName:' '}},{narration:'Fight',combatStart:{enemyName:3}},{narration:'Fight',combatStart:{enemyName:'X'.repeat(61)}}])expect(()=>parse(JSON.stringify(value))).toThrow();
 });
 it('accepts clarification questions and rejects empty clarification payloads',()=>{
  expect(parse(JSON.stringify({narration:'Before you move, one question.',clarificationRequest:{question:'Do you mean the north gate?'}})).clarificationRequest.question).toBe('Do you mean the north gate?');
  expect(()=>parse(JSON.stringify({narration:'Question',clarificationRequest:{question:' '}}))).toThrow('invalid clarification');
 });
 it('permits narration without an encounter',()=>expect(parse(JSON.stringify({narration:'You return to the crossroads.',combatStart:null})).narration).toBe('You return to the crossroads.'));
});
