import {describe,expect,it} from 'vitest';
import {NAVIGATION_TAB_IDS,moveNavigationItem,sanitizeNavigationOrder} from './navigationPreferences';

describe('hamburger navigation preferences',()=>{
 it('defaults to a complete stable order',()=>{
   expect(sanitizeNavigationOrder(undefined)).toEqual(NAVIGATION_TAB_IDS);
   expect(sanitizeNavigationOrder('invalid')).toEqual(NAVIGATION_TAB_IDS);
 });
 it('preserves valid custom order and adds newly introduced tabs',()=>{
   const order=sanitizeNavigationOrder(['bastion','home','bastion','nonexistent','party']);
   expect(order.slice(0,3)).toEqual(['bastion','home','party']);
   expect(order).toHaveLength(NAVIGATION_TAB_IDS.length);
   expect(new Set(order).size).toBe(NAVIGATION_TAB_IDS.length);
   expect(order).toContain('settings');
   expect(order).toContain('development');
 });
 it('moves any tab, including Home, without losing entries',()=>{
   const first=moveNavigationItem(undefined,'home',1);
   expect(first.slice(0,2)).toEqual(['adventure','home']);
   const next=moveNavigationItem(first,'bastion',-1);
   expect(next.indexOf('bastion')).toBe(first.indexOf('bastion')-1);
   expect(moveNavigationItem(next,next[0],-1)).toEqual(next);
   expect(moveNavigationItem(next,next.at(-1)!,1)).toEqual(next);
 });
});
