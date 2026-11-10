import type {CharacterDraft} from '../app/CharacterCreator';
import {reviewCharacter,reviewErrors} from './creationReview';
import {newCampaign,type Campaign} from './campaign';
import type {CharacterStats,Skill} from './checks';
import {ITEM_BY_ID} from './creationEquipment';
import {SPELL_BY_ID} from './creationMagic';
const skillNames=new Set<Skill>(['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival']);
const lower=(value:string)=>value.toLowerCase() as keyof CharacterStats['scores'];
export function campaignFromCharacterDraft(draft:CharacterDraft,title:string,id:string=crypto.randomUUID(),now=new Date().toISOString()):Campaign{
 if(draft.schemaVersion!==1||draft.status!=='draft'||draft.rules.edition!=='2024')throw Error('Unsupported character draft');
 const errors=reviewErrors(draft);
 if(errors.length)throw Error('Character is incomplete: '+errors.join(' '));
 const review=reviewCharacter(draft);
 if(!review.hitPoints||review.hitPoints<1||!Number.isFinite(review.armorClass)||!review.origins.speed)throw Error('Invalid level-one character statistics');
 const scores=Object.fromEntries(review.scores.map(({ability,score})=>[lower(ability),score])) as CharacterStats['scores'];
 const character:CharacterStats={scores,proficiencyBonus:2,proficientSkills:review.skills.filter((skill):skill is Skill=>skillNames.has(skill as Skill)),level:1,maxHitPoints:review.hitPoints,currentHitPoints:review.hitPoints,armorClass:review.armorClass,speed:review.origins.speed,
 cantrips:[...new Set([...review.spells.cantrips,...review.spells.originCantrips,...review.spells.innate])],
 preparedSpells:[...new Set([...review.spells.prepared,...(review.spells.originSpell?[review.spells.originSpell]:[])])]};
 const eq=draft.selections.equipment!;
 const items=review.equipment;
 const gear=items.map(item=>({name:item.name,quantity:item.quantity}));
 const ledger={currency:{CP:Math.round(review.remainingGold*100),SP:0,EP:0,GP:0,PP:0},gear};
 const counted=(id:string)=>items.find(item=>item.name===ITEM_BY_ID[id]?.name)?.quantity??0;
 const base=newCampaign(title,id,now);
 return {...base,character,characterIdentity:{name:draft.identity.name.trim(),speciesId:draft.selections.speciesId!,lineageId:draft.selections.lineageId,backgroundId:draft.selections.backgroundId!,classId:draft.selections.classId!,draftId:draft.id,pronouns:draft.identity.pronouns,appearance:draft.identity.appearance,personality:draft.identity.personality,backstory:draft.identity.backstory},
 inventoryLedger:ledger,equipment:{daggers:counted('dagger'),arrows:counted('arrows'),caltrops:counted('caltrops'),ballBearings:counted('ball-bearings')},
 encounterLoadout:{weaponId:eq.equipped.weapons[0],armorId:eq.equipped.armor,shieldId:eq.equipped.shield},
 journal:[{id:id+'-intro',kind:'system',text:draft.identity.name.trim()+' begins a new adventure at Frontier Village.',createdAt:now}]};
}
export function characterDraftImportOptions(drafts:CharacterDraft[]):{id:string;name:string;classId:string;valid:boolean;errors:string[]}[]{
 return drafts.filter(d=>d?.schemaVersion===1&&d.status==='draft').map(d=>{try{const errors=reviewErrors(d);return {id:d.id,name:d.identity.name||'Unnamed character',classId:d.selections.classId??'unselected',valid:errors.length===0,errors};}catch{return {id:d.id,name:d.identity?.name||'Unnamed character',classId:'unselected',valid:false,errors:['Draft could not be validated']};}});
}
export function preparedSpellNamesFromDraft(draft:CharacterDraft):string[]{
 return (draft.selections.magic?.prepared??[]).map(id=>SPELL_BY_ID[id]?.name??id);
}
