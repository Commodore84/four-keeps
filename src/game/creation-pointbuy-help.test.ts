import {describe,it,expect} from 'vitest';
import {emptyAbilityDraft,POINT_BUY_START,changePointBuy,type AbilityDraft,pointCost,validateAbilityDraft} from './creationAbilities';
import {SPELLS,INVOCATIONS} from './creationMagic';
import {spellInfo,INVOCATION_INFO} from './creationSpellInfo';
describe('point buy increment controls',()=>{
 it('starts all abilities at eight for zero points',()=>{expect(pointCost(POINT_BUY_START)).toBe(0);expect(Object.values(POINT_BUY_START)).toEqual([8,8,8,8,8,8])});
 it('blocks exceeding 27 points and 15 maximum',()=>{let d:AbilityDraft={...emptyAbilityDraft(),method:'point-buy' as const,base:{...POINT_BUY_START}};for(let i=0;i<20;i++)d=changePointBuy(d,'Str',1);expect(d.base.Str).toBe(15);expect(pointCost(d.base)).toBe(9);for(const key of ['Dex','Con'] as const)for(let i=0;i<7;i++)d=changePointBuy(d,key,1);expect(pointCost(d.base)).toBe(27);expect(changePointBuy(d,'Int',1)).toEqual(d);expect(changePointBuy(d,'Str',1)).toEqual(d)});
 it('refunds the exact point cost when decreasing',()=>{let d:AbilityDraft={...emptyAbilityDraft(),method:'point-buy' as const,base:{...POINT_BUY_START,Str:15}};expect(pointCost(changePointBuy(d,'Str',-1).base)).toBe(7);expect(changePointBuy(d,'Wis',-1)).toEqual(d)});
 it('rejects legacy overbudget point-buy drafts',()=>{const d={...emptyAbilityDraft(),method:'point-buy' as const,base:{Str:15,Dex:15,Con:15,Int:15,Wis:15,Cha:15},bonuses:{Str:2,Dex:1}};expect(validateAbilityDraft(d,['Str','Dex','Con']).some(x=>x.includes('27'))).toBe(true)});
});
describe('compact spell and invocation help',()=>{
 it('provides a description and resolution for every catalog spell',()=>{for(const s of SPELLS){const info=spellInfo(s);expect(info.summary).not.toContain('Consult spell details');expect(info.summary.length).toBeGreaterThan(8);expect(info.resolution).not.toBe('See rules');expect(info.damage).not.toBe('See rules')}});
 it('provides concise descriptions for every invocation',()=>{for(const name of INVOCATIONS)expect(INVOCATION_INFO[name]?.length).toBeGreaterThan(12)});
});
