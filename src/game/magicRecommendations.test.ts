import {describe,it,expect} from 'vitest';
import {newCampaign} from './campaign';
import {prototypeNighthawk} from './checks';
import {MAGIC_ITEMS} from './magicWishlist';
import {magicItemRecommendation} from './magicRecommendations';

function character(cls='rogue',gear=['Shortbow']){
 const campaign=newCampaign('Recommendation build');
 campaign.character={...structuredClone(prototypeNighthawk),classId:cls};
 campaign.characterIdentity={name:'Scout',speciesId:'human',backgroundId:'criminal',classId:cls,draftId:'test',pronouns:'they',appearance:'',personality:'',backstory:''};
 campaign.character.proficientSkills=['Stealth','Sleight of Hand','Perception'];
 campaign.inventoryLedger={currency:{CP:0,SP:0,EP:0,GP:50,PP:0},gear:gear.map(name=>({name,quantity:1}))};
 campaign.encounterLoadout={weaponId:gear.includes('Shortbow')?'shortbow':undefined};
 return campaign;
}
function pick(campaign:ReturnType<typeof character>,name:string){
 const magic=MAGIC_ITEMS.find(item=>item.name===name);
 if(!magic)throw Error('Missing catalog item '+name);
 return magicItemRecommendation(campaign,magic);
}
describe('personalized magic item recommendation engine',()=>{
 it('strongly favors stealth and bow items for a shortbow Rogue',()=>{
  const scout=character();
  for(const item of ['Bracers of Archery','Oathbow','Boots of Elvenkind','Cloak of Elvenkind','Gloves of Thievery','Manual of Quickness of Action'])
   expect(pick(scout,item)?.stars,item).toBe(3);
  expect(pick(scout,'Efficient Quiver')?.stars).toBe(2);
  expect(pick(scout,'Weapon +1')?.stars).toBe(2);
  expect(pick(scout,'Armor +1')?.stars).toBe(1);
 });
 it('does not confuse a crossbow with a bow and withholds incompatible or unknown items',()=>{
  const crossbow=character('rogue',['Hand Crossbow']);
  crossbow.encounterLoadout={weaponId:'hand-crossbow'};
  expect(pick(crossbow,'Bracers of Archery')?.stars).toBe(1);
  expect(pick(crossbow,'Oathbow')).toBeNull();
  expect(pick(crossbow,'Efficient Quiver')).toBeNull();
  expect(pick(crossbow,'Bracers of Archery')?.stars).not.toBe(3);
  const wizard=character('wizard',[]);
  wizard.character!.proficientSkills=['Arcana'];
  wizard.character!.expertiseSkills=[];
  expect(pick(wizard,'Bracers of Archery')).toBeNull();
  expect(pick(wizard,'Gloves of Thievery')).toBeNull();
  expect(pick(wizard,'Boots of Elvenkind')).toBeNull();
 });
 it('restricts class-specific magic to a matching class and trained combat style',()=>{
  const warlock=character('warlock',[]);
  expect(pick(warlock,'+1 Rod of the Pact Keeper')?.stars).toBe(3);
  expect(pick(warlock,'Staff of the Woodlands')).toBeNull();
  const paladin=character('paladin',[]);
  expect(pick(paladin,'Holy Avenger')?.stars).toBe(3);
  expect(pick(paladin,'Bracers of Archery')).toBeNull();
  const druid=character('druid',[]);
  expect(pick(druid,'Staff of the Woodlands')?.stars).toBe(3);
  const monk=character('monk',[]);
  expect(pick(monk,'+1 Wraps of Unarmed Power')?.stars).toBe(3);
  expect(pick(character(),'Holy Avenger')).toBeNull();
 });
 it('does not recommend already-owned items, variants without concrete effects or characters without build context',()=>{
  const scout=character('rogue',['Shortbow','Boots of Elvenkind']);
  expect(pick(scout,'Boots of Elvenkind')).toBeNull();
  const generic=MAGIC_ITEMS.find(item=>item.rarity.includes('Varies'));
  expect(generic&&magicItemRecommendation(scout,generic)).toBeNull();
  const missing=newCampaign('no player');
  const bracers=MAGIC_ITEMS.find(item=>item.name==='Bracers of Archery')!;
  expect(magicItemRecommendation(missing,bracers)).toBeNull();
 });
 it('never mutates saved inventory, wish lists, or the character',()=>{
  const scout=character();
  const before=JSON.stringify(scout);
  pick(scout,'Bracers of Archery');
  pick(scout,'Cloak of Elvenkind');
  expect(JSON.stringify(scout)).toBe(before);
 });
});
