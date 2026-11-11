import {it,expect} from 'vitest';
import {createCharacterDraft} from '../app/CharacterCreator';
import {campaignFromCharacterDraft} from './characterImport';
import {createBackup,parseBackup} from './backup';
import {isCampaign,newCampaign} from './campaign';
import {campaignPlayerContext} from './campaignContext';
import {completePlayerRest} from './playerRecovery';
function draft(){
 const d=createCharacterDraft();d.identity={name:'Aster',pronouns:'they/them',appearance:'Travel cloak',personality:'Curious',backstory:'Border scholar',portrait:'data:image/svg+xml;base64,test'};
 d.selections={classId:'wizard',speciesId:'elf',lineageId:'wood-elf',backgroundId:'criminal',classChoices:{'class-skills':['Arcana','History']},abilities:{method:'standard',base:{Str:8,Dex:14,Con:13,Int:15,Wis:12,Cha:10},bonusMode:'two-one',bonuses:{Int:2,Con:1},rolls:[],rollDice:[]},equipment:{classPackage:0,backgroundPackage:0,purchases:{},equipped:{weapons:['dagger','quarterstaff']}},magic:{cantrips:['fire-bolt','mage-hand','minor-illusion'],spellbook:['alarm','burning-hands','charm-person','detect-magic','find-familiar','magic-missile'],prepared:['alarm','burning-hands','charm-person','magic-missile'],invocations:[]}};
 return d;
}
it('keeps an independent exact build snapshot including the second weapon, spellbook, portrait and abilities',()=>{
 const d=draft(),original=structuredClone(d),c=campaignFromCharacterDraft(d,'Wizard');d.selections.magic!.spellbook.pop();d.identity.name='Changed draft';
 const restored=parseBackup(JSON.stringify(createBackup(c)));expect(restored.characterBuild).toEqual(original);expect(restored.characterIdentity?.name).toBe('Aster');expect(isCampaign(restored)).toBe(true);
 const rested=completePlayerRest(restored,'long',{confirmedSafe:true});expect(rested.characterBuild).toEqual(original);expect(rested.encounterLoadout?.weaponId).toBe('dagger');
});
it('rejects corrupted snapshots but accepts older campaigns with no snapshot',()=>{
 const c=campaignFromCharacterDraft(draft(),'Wizard');expect(isCampaign({...c,characterBuild:{...c.characterBuild!,selections:{...c.characterBuild!.selections,classId:'fighter'}}})).toBe(false);
 expect(()=>parseBackup(JSON.stringify({...createBackup(c),campaign:{...c,characterBuild:{...c.characterBuild!,selections:{}}}}))).toThrow();expect(isCampaign(newCampaign('Legacy'))).toBe(true);
});
it('sends compact class choices and spellbook evidence to the DM without portraits or future plans',()=>{
 const c=campaignFromCharacterDraft(draft(),'Wizard'),context=campaignPlayerContext(c);expect(context.playerBuild?.spellbook).toHaveLength(6);expect(context.playerBuild?.equipped?.weapons).toEqual(['dagger','quarterstaff']);expect(JSON.stringify(context)).not.toContain('data:image');
});
