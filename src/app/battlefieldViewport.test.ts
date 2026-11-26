import {describe,it,expect} from 'vitest';
import {battlefieldVisibleIndices,battlefieldWindow} from './battlefieldViewport';
describe('viewport-efficient classic battlefield',()=>{
 it('renders a small overscanned window rather than thousands of off-screen cells',()=>{
  const view={width:256,height:256,zoom:1.5,left:3500,top:2600,viewWidth:360,viewHeight:480};
  const result=battlefieldVisibleIndices(view,[{x:115,y:86}]);
  expect(result.indices.length).toBeLessThan(500);
  expect(result.window.minX).toBeGreaterThan(100);
  expect(result.window.maxX).toBeLessThan(150);
  expect(result.indices.every(i=>i>=0&&i<256*256)).toBe(true);
  expect(result.indices).toContain(86*256+115);
 });
 it('supports rectangular shapes and clamps bounds for edge panning',()=>{
  const a=battlefieldWindow({width:32,height:60,zoom:1,left:-900,top:-500,viewWidth:400,viewHeight:390});
  expect(a.minX).toBe(0);expect(a.minY).toBe(0);
  const b=battlefieldWindow({width:32,height:60,zoom:1,left:10000,top:10000,viewWidth:400,viewHeight:390});
  expect(b.maxX).toBe(31);expect(b.maxY).toBe(59);
 });
 it('limits very large Fit views, retaining important creature squares',()=>{
  const view={width:256,height:256,zoom:.05,left:0,top:0,viewWidth:430,viewHeight:430};
  const r=battlefieldVisibleIndices(view,[{x:128,y:128},{x:250,y:248}]);
  expect(r.window.overview).toBe(true);
  expect(r.window.stride).toBeGreaterThan(1);
  expect(r.indices.length).toBeLessThan(2500);
  expect(r.indices).toContain(128*256+128);
  expect(r.indices).toContain(248*256+250);
 });
 it('renders all cells in small Fit maps, preserving precise selection',()=>{
  const view={width:40,height:32,zoom:.32,left:0,top:0,viewWidth:400,viewHeight:350};
  const r=battlefieldVisibleIndices(view);
  expect(r.window.stride).toBe(1);
  expect(r.indices).toHaveLength(1280);
 });
});

import {battlefieldTileVariant,battlefieldTileName,battlefieldObjectArtworkStyle} from './battlefieldIllustrations';
describe('stable decorative terrain variation',()=>{
 it('uses coordinates and the kind without mutating rules or campaign state',()=>{
  const m={width:12,height:15,objects:[],theme:'ruins' as const};
  const v=battlefieldTileVariant(4,8,'window');
  expect(battlefieldTileVariant(4,8,'window')).toBe(v);
  expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(3);
  expect(battlefieldTileName(m)).toBe('floor-ruins');
  expect(battlefieldTileName(m,{id:'win',kind:'window',x:4,y:8,width:1,height:1,open:true})).toBe('window-open');
  expect(battlefieldTileName(m,{id:'win',kind:'window',x:4,y:8,width:1,height:1})).toBe('window');
  const prop={id:'stack',kind:'cargo' as const,x:5,y:7,width:3,height:2};
  expect(battlefieldTileName(m,prop,5,7)).toBe(battlefieldTileName(m,prop,7,8));
  expect(battlefieldObjectArtworkStyle(prop,5,7,2)).toMatchObject({
   backgroundSize:'126px 84px',backgroundPosition:'0px 0px'});
  expect(battlefieldObjectArtworkStyle(prop,7,8,2)).toMatchObject({
   backgroundSize:'126px 84px',backgroundPosition:'-84px -42px'});
  expect(battlefieldObjectArtworkStyle({...prop,kind:'wall'},7,8,2)).toBeUndefined();
  expect(battlefieldObjectArtworkStyle(undefined,5,7,2)).toBeUndefined();

 });
});
