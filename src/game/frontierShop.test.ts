import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {buyFrontierItem,frontierShopStock,frontierMerchantContext,formatFrontierPrice} from './frontierShop';
function fixture(){const c=newCampaign('Shop','shop-test');return beginAdventureSession({...c,characterIdentity:{name:'Test',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},inventoryLedger:{currency:{GP:10,SP:0,CP:0,EP:0,PP:0},gear:[]}})}
describe('first visit shop',()=>{
 it('shows standard prices in gold, silver and copper',()=>{expect(formatFrontierPrice(200)).toBe('2 GP');expect(formatFrontierPrice(125)).toBe('1 GP 2 SP 5 CP');expect(formatFrontierPrice(5)).toBe('5 CP');expect(formatFrontierPrice(0)).toBe('0 CP')});
 it('uses the canonical item catalog and deducts exact copper pieces',()=>{const item=frontierShopStock.find(i=>i.id==='dagger')!;expect(item.costCp).toBe(200);const c=buyFrontierItem(fixture(),'dagger',2);expect(c.inventoryLedger?.currency.GP).toBe(6);expect(c.inventoryLedger?.gear).toContainEqual({name:'Dagger',quantity:2});expect(JSON.parse(JSON.stringify(c)).inventoryLedger.gear[0].quantity).toBe(2)});
 it('does not mutate a campaign on invalid, unavailable or unaffordable purchases',()=>{const c=fixture();for(const [id,q] of [['dagger',21],['greatsword',1],['dagger',6]] as const)expect(()=>buyFrontierItem(c,id,q)).toThrow();expect(c.inventoryLedger?.currency.GP).toBe(10)});
 it('exposes authoritative shop prices and wallet to merchant conversation without transactions',()=>{const c=fixture();const ctx=frontierMerchantContext(c)!;expect(ctx.items).toContainEqual({id:'potion-of-healing',name:'Potion of Healing',costCp:5000});expect(ctx.walletCp).toBe(1000);expect(ctx.purchaseRule).toContain('Only the Buy item control');expect(c.inventoryLedger?.gear).toEqual([])});
 it('requires a started imported character in Frontier Village',()=>{const c=fixture();expect(()=>buyFrontierItem({...c,adventureSession:{...c.adventureSession!,site:'crossroads'}},'dagger')).toThrow('not available')});
});
