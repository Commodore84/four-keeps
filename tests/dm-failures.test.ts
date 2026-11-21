import {describe,it,expect} from 'vitest';
import {classifyDmFailure,providerFailure} from '../api/dm-failures.js';
describe('DM opening failure diagnostics',()=>{
 it('distinguishes rate limiting and provider credential failures without leaking messages',()=>{
  expect(providerFailure(429,'sensitive').code).toBe('provider_rate_limit');
  expect(providerFailure(401,'sensitive').message).not.toContain('sensitive');
  expect(providerFailure(400,'invalid_request_error').code).toBe('provider_bad_request');
 });
 it('distinguishes timeout, malformed provider JSON and invalid narration',()=>{
  expect(classifyDmFailure({name:'TimeoutError'},'provider_request').status).toBe(504);
  expect(classifyDmFailure({dmCode:'provider_invalid_json'},'provider_response').code).toBe('provider_invalid_json');
  expect(classifyDmFailure(new Error('secret prompt'),'provider_validation').message).not.toContain('secret');
 });
 it('never exposes provider exception content',()=>expect(classifyDmFailure(new Error('secret'),'provider_request').message).not.toContain('secret'));
});
