import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {beginAdventureSession} from './adventureSession';
import {buyFrontierItem,frontierShopStock} from './frontierShop';
function fixture(){const c=newCampaign('Shop','shop-test');return beginAdventureSession({...c,characterIdentity:{name:'Test',speciesId:'elf',backgroundId:'sage',classId:'rogue',draftId:'draft',pronouns:'',appearance:'',personality:'',backstory:''},inventoryLedger:{currency:{GP:10,SP:0,CP:0,EP:0,PP:0},gear:[]}})}
describe('first visit shop',()=>{
 it('uses the canonical item catalog and deducts exact copper pieces',()=>{const item=frontierShopStock.find(i=>i.id==='dagger')!;expect(item.costCp).toBe(200);const c=buyFrontierItem(fixture(),'dagger',2);expect(c.inventoryLedger?.currency.GP).toBe(6);expect(c.inventoryLedger?.gear).toContainEqual({name:'Dagger',quantity:2});expect(JSON.parse(JSON.stringify(c)).inventoryLedger.gear[0].quantity).toBe(2)});
 it('does not mutate a campaign on invalid, unavailable or unaffordable purchases',()=>{const c=fixture();for(const [id,q] of [['dagger',21],['greatsword',1],['dagger',6]] as const)expect(()=>buyFrontierItem(c,id,q)).toThrow();expect(c.inventoryLedger?.currency.GP).toBe(10)});
 it('requires a started imported character in Frontier Village',()=>{const c=fixture();expect(()=>buyFrontierItem({...c,adventureSession:{...c.adventureSession!,site:'crossroads'}},'dagger')).toThrow('not available')});
});
