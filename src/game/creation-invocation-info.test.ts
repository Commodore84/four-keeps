import {describe,it,expect} from 'vitest';
import {INVOCATIONS} from './creationMagic';
import {INVOCATION_DETAILS} from './creationInvocationInfo';
describe('inline Eldritch Invocation rules',()=>{
 it('has substantive readable descriptions for all listed invocations',()=>{for(const name of INVOCATIONS){const detail=INVOCATION_DETAILS[name];expect(detail,name).toBeDefined();expect(detail.description.length,name).toBeGreaterThan(160);expect(detail.prerequisite.length).toBeGreaterThan(6);expect(detail.category.length).toBeGreaterThan(5)}});
 it('describes the three level-one pact boons and their tradeoffs',()=>{for(const name of ['Pact of the Blade','Pact of the Chain','Pact of the Tome'])expect(INVOCATION_DETAILS[name].prerequisite).toContain('level 1')});
});
