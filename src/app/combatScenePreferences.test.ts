import {describe,it,expect} from 'vitest';
import {defaultSceneFavorites,sanitizeScenePreferences,scenePreferencesKey,visibleSceneFavorites} from './combatScenePreferences';
describe('scene action preferences',()=>{
 it('uses a safe default and keeps all available actions accessible',()=>{
  const p=sanitizeScenePreferences(undefined);
  expect(p.favorites).toEqual(defaultSceneFavorites);
  expect(p.order).toContain('ready');
  expect(p.order).toContain('utilize');
 });
 it('rejects stale and duplicate settings',()=>{
  const p=sanitizeScenePreferences({order:['magic','magic','unknown','attack'],favorites:['magic','bad','magic']});
  expect(p.order.slice(0,2)).toEqual(['magic','attack']);
  expect(p.favorites).toEqual(['magic']);
 });
 it('reserves space for More and End Turn on narrow phones',()=>{
  const p=sanitizeScenePreferences(undefined);
  expect(visibleSceneFavorites(p,p.order,320).length).toBeLessThanOrEqual(3);
  expect(visibleSceneFavorites(p,p.order,430).length).toBeGreaterThan(2);
 });
 it('separates two character settings',()=>{
  expect(scenePreferencesKey('Aria')).not.toBe(scenePreferencesKey('Baron'));
 });
});
