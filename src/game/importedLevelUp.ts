import {SPELLS,SPELL_BY_ID,WIZARD_LEVEL2_SPELLS} from './creationMagic';
import type {Campaign} from './campaign';
import type {Skill} from './checks';
import {skillAbility} from './checks';
import {xpThresholds} from './campaign';
import {classSummary} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
import {futureFeat,featEligibility,eligibleFeatAbility,EPIC_BOONS} from './creationFutureFeats';
import {ABILITIES,type Ability,type Scores,modifier} from './creationAbilities';
import {forecastImprovementLevels} from './creationProjection';
import type {FeatContext} from './creationFutureFeats';
export interface ImportedLevelChoice {hpGain:number;subclassId?:string;featPlan?:string;featAbility?:Ability;abilityIncreases?:Partial<Record<Ability,number>>;confirm:boolean;legacyApproved?:boolean;skillProficiency?:Skill;skillExpertise?:Skill;arcaneCantrips?:string[];arcaneSpells?:string[];warlockInvocations?:string[];warlockSpells?:string[];wizardBookSpells?:string[];wizardPrepared?:string[];wizardPortents?:number[];rogueExpertise?:Skill[]}
export function importedLevelUpIssues(c:Campaign,choice:ImportedLevelChoice):string[]{
 const issues:string[]=[];const ch=c.character,identity=c.characterIdentity,build=c.characterBuild;
 if(!ch||!identity||!build)return ['Only imported characters can use this level-up workflow.'];
 const level=(ch.level??1)+1;
 if(level<2||level>(identity.classId==='rogue'?20:4))return ['Imported level-up supports Rogue levels 2–20 and other classes levels 2–4 only.'];
 if((c.xp??0)<xpThresholds[level-1])issues.push(`Requires ${xpThresholds[level-1]} XP for level ${level}.`);
 const cls=classSummary(identity.classId);if(!cls)return ['Unknown class.'];
 const min=1+modifier(ch.scores.con),max=cls.hitDie+modifier(ch.scores.con);
 if(!Number.isInteger(choice.hpGain)||choice.hpGain<Math.max(1,min)||choice.hpGain>Math.max(1,max))issues.push(`Hit point gain must be ${Math.max(1,min)}–${Math.max(1,max)}.`);
 if(identity.classId==='wizard'){
  const prior=c.importedWizardSpellbook??c.characterBuild?.selections?.magic?.spellbook?.map(id=>SPELL_BY_ID[id]?.name??id)??[];
  const added=choice.wizardBookSpells??[],book=[...prior,...added];
  if(added.length!==2||new Set(added).size!==2||added.some(name=>prior.includes(name)||!(SPELLS.some(sp=>sp.name===name&&sp.classes.includes('wizard')&&sp.level===1)||level>=3&&(WIZARD_LEVEL2_SPELLS as readonly string[]).includes(name))))issues.push('Choose two distinct new Wizard spellbook spells of an available spell level.');
  const prepared=choice.wizardPrepared??[];
  if(prepared.length!==level+3||new Set(prepared).size!==prepared.length||prepared.some(name=>!book.includes(name)||!(SPELLS.some(sp=>sp.name===name&&sp.classes.includes('wizard')&&sp.level===1)||level>=3&&(WIZARD_LEVEL2_SPELLS as readonly string[]).includes(name))))issues.push(`Prepare exactly ${level+3} distinct Wizard spells from your spellbook.`);
  if(level===3){
   if(choice.subclassId!=='wizard-diviner')issues.push('Only Diviner Wizard subclass mechanics are currently supported.');
   if(choice.wizardPortents?.length!==2||choice.wizardPortents.some(n=>!Number.isInteger(n)||n<1||n>20))issues.push('Record two verified Portent d20 rolls made after the long rest.');
  }else if(choice.wizardPortents?.length)issues.push('Portent rolls can only be entered at level 3.');
 }
 if(identity.classId==='warlock'){
  const chosen=choice.warlockInvocations??[],prior=c.importedWarlockInvocations??c.characterBuild?.selections?.magic?.invocations??[];
  if(level===2){
   if(chosen.length!==2||new Set(chosen).size!==2||chosen.some(i=>prior.includes(i)||!['Armor of Shadows','Mask of Many Faces','Agonizing Blast'].includes(i)))issues.push('Choose two distinct supported new invocations; previously selected invocations cannot be repeated.');
   if(chosen.includes('Agonizing Blast')&&!ch.cantrips?.includes('Eldritch Blast'))issues.push('Agonizing Blast requires the Eldritch Blast cantrip.');
  }else if(chosen.length)issues.push('Invocation choices are made at level 2, not this level.');
  if(level===3&&choice.subclassId!=='warlock-celestial')issues.push('Only Celestial Warlock subclass mechanics are currently supported.');
  const spells=choice.warlockSpells??[];
  if(spells.length!==1||!SPELLS.some(sp=>sp.name===spells[0]&&sp.level===1&&sp.classes.includes('warlock'))||ch.preparedSpells?.includes(spells[0]))issues.push('Choose one new supported level-1 Warlock spell.');
 }
 if(level===3){
  if(!subclassesForClass(identity.classId).some(s=>s.id===choice.subclassId))issues.push('Choose a valid subclass.');
  else if(identity.classId==='rogue'){
   if(choice.subclassId!=='rogue-arcane-trickster')issues.push('This Rogue subclass has unsupported mechanics and cannot yet be applied.');
   else{
    const cantrips=choice.arcaneCantrips??[],spells=choice.arcaneSpells??[];
    if(cantrips.length!==2||new Set(cantrips).size!==2||cantrips.some(name=>name==='Mage Hand'||!SPELLS.some(sp=>sp.name===name&&sp.level===0&&sp.classes.includes('wizard'))))issues.push('Choose two distinct Wizard cantrips other than the automatically granted Mage Hand.');
    if(spells.length!==3||new Set(spells).size!==3||spells.some(name=>!SPELLS.some(sp=>sp.name===name&&sp.level===1&&sp.classes.includes('wizard'))))issues.push('Choose three distinct level-1 Wizard spells.');
   }
  }else if(identity.classId!=='warlock'&&identity.classId!=='wizard')issues.push('This class subclass requires mechanics not yet supported by imported level-up.');
 }
 if((level===4||identity.classId==='rogue'&&(level===8||level===10||level===12||level===16))&&forecastImprovementLevels(identity.classId).includes(level)){
  const before=Object.fromEntries(ABILITIES.map(a=>[a,ch.scores[a.toLowerCase() as keyof typeof ch.scores]])) as Scores;
  if(choice.featPlan==='Ability Score Improvement'){
   const inc=choice.abilityIncreases??{};
   if(ABILITIES.reduce((sum,a)=>sum+(inc[a]??0),0)!==2)issues.push('Allocate exactly two ASI points.');
   for(const a of ABILITIES){const n=inc[a]??0;if(!Number.isInteger(n)||n<0||n>2||before[a]+n>20)issues.push(`Invalid ${a} increase.`)}
  }else{
   const feat=futureFeat(choice.featPlan??'');
   if(!feat)issues.push('Choose a valid feat or ASI.');
   else{
    const context:FeatContext={classId:identity.classId,speciesId:identity.speciesId,lineageId:identity.lineageId,allowCompatibleLegacy:build.rules.allowCompatibleLegacy,spellcasting:['bard','cleric','druid','sorcerer','wizard','paladin','ranger','warlock'].includes(identity.classId)||ch.subclass==='Arcane Trickster',mediumArmor:['fighter','paladin','ranger','cleric','druid','barbarian'].includes(identity.classId),heavyArmor:['fighter','paladin'].includes(identity.classId),shield:['fighter','paladin','ranger','cleric','druid','barbarian'].includes(identity.classId)};
    issues.push(...featEligibility(feat,before,context));
    if(feat.abilityBonus!==0&&(!choice.featAbility||!eligibleFeatAbility(feat,choice.featAbility,before)))issues.push('Choose an eligible feat ability increase.');
    if(feat.source==='2017'&&!choice.legacyApproved)issues.push('Explicit DM approval required for legacy feats.');
    if(feat.name==='Skill Expert'){
     const known=[...ch.proficientSkills];
     if(!choice.skillProficiency||!Object.hasOwn(skillAbility,choice.skillProficiency)||known.includes(choice.skillProficiency))issues.push('Choose one new skill proficiency.');
     if(!choice.skillExpertise||!Object.hasOwn(skillAbility,choice.skillExpertise)||!(known.includes(choice.skillExpertise)||choice.skillExpertise===choice.skillProficiency)||(ch.expertiseSkills??[]).includes(choice.skillExpertise))issues.push('Choose one proficient skill without existing expertise.');
    }else if(feat.name!=='Elven Accuracy')issues.push('This feat requires additional feature choices or mechanics not yet implemented for level-up.');
   }
  }
 }
 if(identity.classId==='rogue'&&level===19){
  if(!EPIC_BOONS.some(feat=>feat.name===choice.featPlan))issues.push('Choose a valid level-19 Epic Boon. Other feats require separately implemented choices.');
 }
 if(identity.classId==='rogue'&&level>=9&&level<=10&&c.importedSubclassId==='rogue-arcane-trickster'){
  const spells=choice.arcaneSpells??[],prior=ch.preparedSpells??[],needed=level===9?Math.max(0,6-prior.length):Math.max(0,7-prior.length);
  if(spells.length!==needed||new Set(spells).size!==spells.length||spells.some(name=>prior.includes(name)||!([...SPELLS.filter(sp=>sp.level===1).filter(sp=>sp.classes.includes('wizard')).map(sp=>sp.name),...WIZARD_LEVEL2_SPELLS].includes(name))))issues.push('Choose distinct supported Wizard spells to reach the Arcane Trickster prepared-spell progression.');
 }
 if(identity.classId==='rogue'&&level===6){
  const selected=choice.rogueExpertise??[],known=ch.proficientSkills,existing=ch.expertiseSkills??[];
  if(selected.length!==2||new Set(selected).size!==2||selected.some(skill=>!known.includes(skill)||existing.includes(skill)))issues.push('Choose two distinct proficient Rogue skills without existing Expertise.');
 }
 if(!choice.confirm)issues.push('Explicit confirmation required.');
 return issues;
}
export function applyImportedLevelUp(c:Campaign,choice:ImportedLevelChoice):Campaign{
 const issues=importedLevelUpIssues(c,choice);if(issues.length)throw Error(issues.join(' '));
 const ch=c.character!,level=(ch.level??1)+1;const scores={...ch.scores};
 if(level===4||c.characterIdentity?.classId==='rogue'&&(level===8||level===10||level===12||level===16)){
  if(choice.featPlan==='Ability Score Improvement')for(const a of ABILITIES){const increase=choice.abilityIncreases?.[a]??0;scores[a.toLowerCase() as keyof typeof scores]+=increase;}
  else if(choice.featAbility)scores[choice.featAbility.toLowerCase() as keyof typeof scores]+=1;
 }
 const maxHitPoints=(ch.maxHitPoints??1)+choice.hpGain;
 const conChange=modifier(scores.con)-modifier(ch.scores.con);
 const adjustedMax=maxHitPoints+conChange*level;
 const warlock=c.characterIdentity?.classId==='warlock',wizard=c.characterIdentity?.classId==='wizard';
 const priorInvocations=c.importedWarlockInvocations??c.characterBuild?.selections?.magic?.invocations??[];
 const next={...ch,level,savingThrowProficiencies:c.characterIdentity?.classId==='rogue'&&level>=15?[...new Set([...(ch.savingThrowProficiencies??[]),'wis' as const,'cha' as const])]:ch.savingThrowProficiencies,maxHitPoints:adjustedMax,currentHitPoints:Math.min(adjustedMax,(ch.currentHitPoints??1)+choice.hpGain+conChange*level),scores,proficiencyBonus:Math.ceil(level/4)+1,
  proficientSkills:(level===4||c.characterIdentity?.classId==='rogue'&&(level===8||level===10||level===12||level===16))&&choice.featPlan==='Skill Expert'?[...ch.proficientSkills,choice.skillProficiency!]:ch.proficientSkills,
  expertiseSkills:level===6&&c.characterIdentity?.classId==='rogue'?[...(ch.expertiseSkills??[]),...(choice.rogueExpertise??[])]:(level===4||c.characterIdentity?.classId==='rogue'&&(level===8||level===10||level===12||level===16))&&choice.featPlan==='Skill Expert'?[...(ch.expertiseSkills??[]),choice.skillExpertise!]:ch.expertiseSkills,
  ...(wizard?{preparedSpells:[...(choice.wizardPrepared??[])],spellSlots:{level1:level===2?3:4,usedLevel1:Math.min(ch.spellSlots?.usedLevel1??0,level===2?3:4),...(level>=3?{level2:level===3?2:3,usedLevel2:Math.min(ch.spellSlots?.usedLevel2??0,level===3?2:3)}:{})},resources:{...ch.resources,'Arcane Recovery':{maximum:1,used:ch.resources?.['Arcane Recovery']?.used??0,recovery:'long' as const},...(level===3?{'Portent':{maximum:2,used:0,recovery:'long' as const}}:{})}}:{}),
  ...(warlock?{preparedSpells:[...new Set([...(ch.preparedSpells??[]),...(choice.warlockSpells??[])])],spellSlots:{level1:level>=2?2:1,usedLevel1:Math.min(ch.spellSlots?.usedLevel1??0,level>=2?2:1)},resources:{...ch.resources,...(level===2?{'Magical Cunning':{maximum:1,used:0,recovery:'long' as const}}:{}),...(level===3?{'Healing Light':{maximum:4,used:0,recovery:'long' as const}}:{}),...(level===4?{'Healing Light':{maximum:5,used:ch.resources?.['Healing Light']?.used??0,recovery:'long' as const}}:{})}}:{}),
  ...(c.characterIdentity?.classId==='rogue'&&level>=5&&c.importedSubclassId==='rogue-arcane-trickster'?{spellSlots:{...ch.spellSlots!,level1:level>=7?4:3,usedLevel1:Math.min(ch.spellSlots?.usedLevel1??0,level>=7?4:3),...(level>=7?{level2:level>=10?3:2,usedLevel2:Math.min(ch.spellSlots?.usedLevel2??0,level>=10?3:2)}:{})}}:{}),
  ...(c.characterIdentity?.classId==='rogue'&&level>=9&&level<=10&&c.importedSubclassId==='rogue-arcane-trickster'?{preparedSpells:[...new Set([...(ch.preparedSpells??[]),...(choice.arcaneSpells??[])])]}:{}),
  ...(level===3&&choice.subclassId==='rogue-arcane-trickster'?{subclass:'Arcane Trickster' as const,cantrips:[...new Set([...(ch.cantrips??[]),'Mage Hand',...(choice.arcaneCantrips??[])])],preparedSpells:[...new Set([...(ch.preparedSpells??[]),...(choice.arcaneSpells??[])])],spellSlots:{level1:2,usedLevel1:0}}:{})};
 // Keep the selected subclass separately; legacy character.subclass is Arcane Trickster-specific.
 return {...c,character:next,...(c.characterIdentity?.classId==='rogue'?{hitDiceRemaining:Math.min(level,(c.hitDiceRemaining??(level-1))+1)}:{}),...((choice.featPlan==='Elven Accuracy'||c.characterIdentity?.classId==='rogue'&&level===19)?{importedEarnedFeats:[...(c.importedEarnedFeats??[]),{level,name:choice.featPlan!,legacyApproved:choice.featPlan==='Elven Accuracy'&&choice.legacyApproved===true,...(choice.featPlan==='Elven Accuracy'?{ability:choice.featAbility}:{})}]}:{}),...(wizard?{hitDiceRemaining:Math.min(level,(c.hitDiceRemaining??(level-1))+1),importedWizardSpellbook:[...(c.importedWizardSpellbook??c.characterBuild?.selections?.magic?.spellbook?.map(id=>SPELL_BY_ID[id]?.name??id)??[]),...(choice.wizardBookSpells??[])],...(level===3?{importedWizardPortents:[...(choice.wizardPortents??[])]}:{})}:{}),...(warlock?{hitDiceRemaining:Math.min(level,(c.hitDiceRemaining??(level-1))+1)}:{}),...(warlock?{importedWarlockPactSlotLevel:level>=3?2:1,importedWarlockInvocations:level===2?[...priorInvocations,...(choice.warlockInvocations??[])]:priorInvocations}:{}),importedSubclassId:level===3?choice.subclassId:c.importedSubclassId,updatedAt:new Date().toISOString(),journal:[...c.journal,{id:crypto.randomUUID(),kind:'system',text:`${c.characterIdentity!.name} confirmed level ${level}: +${choice.hpGain} HP${level===3?`; subclass ${choice.subclassId}`:''}${level===4?'; '+choice.featPlan:''}.`,createdAt:new Date().toISOString()}]};
}
