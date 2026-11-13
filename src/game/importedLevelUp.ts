import {SPELLS} from './creationMagic';
import type {Campaign} from './campaign';
import type {Skill} from './checks';
import {skillAbility} from './checks';
import {xpThresholds} from './campaign';
import {classSummary} from './creationClasses';
import {subclassesForClass} from './creationSubclasses';
import {futureFeat,featEligibility,eligibleFeatAbility} from './creationFutureFeats';
import {ABILITIES,type Ability,type Scores,modifier} from './creationAbilities';
import {forecastImprovementLevels} from './creationProjection';
import type {FeatContext} from './creationFutureFeats';
export interface ImportedLevelChoice {hpGain:number;subclassId?:string;featPlan?:string;featAbility?:Ability;abilityIncreases?:Partial<Record<Ability,number>>;confirm:boolean;legacyApproved?:boolean;skillProficiency?:Skill;skillExpertise?:Skill;arcaneCantrips?:string[];arcaneSpells?:string[]}
export function importedLevelUpIssues(c:Campaign,choice:ImportedLevelChoice):string[]{
 const issues:string[]=[];const ch=c.character,identity=c.characterIdentity,build=c.characterBuild;
 if(!ch||!identity||!build)return ['Only imported characters can use this level-up workflow.'];
 const level=(ch.level??1)+1;
 if(level<2||level>4)return ['Imported level-up currently supports levels 2–4 only.'];
 if((c.xp??0)<xpThresholds[level-1])issues.push(`Requires ${xpThresholds[level-1]} XP for level ${level}.`);
 const cls=classSummary(identity.classId);if(!cls)return ['Unknown class.'];
 const min=1+modifier(ch.scores.con),max=cls.hitDie+modifier(ch.scores.con);
 if(!Number.isInteger(choice.hpGain)||choice.hpGain<Math.max(1,min)||choice.hpGain>Math.max(1,max))issues.push(`Hit point gain must be ${Math.max(1,min)}–${Math.max(1,max)}.`);
 if(level===3){
  if(!subclassesForClass(identity.classId).some(s=>s.id===choice.subclassId))issues.push('Choose a valid subclass.');
  else if(identity.classId==='rogue'){
   if(choice.subclassId!=='rogue-arcane-trickster')issues.push('This Rogue subclass has unsupported mechanics and cannot yet be applied.');
   else{
    const cantrips=choice.arcaneCantrips??[],spells=choice.arcaneSpells??[];
    if(cantrips.length!==2||new Set(cantrips).size!==2||cantrips.some(name=>name==='Mage Hand'||!SPELLS.some(sp=>sp.name===name&&sp.level===0&&sp.classes.includes('wizard'))))issues.push('Choose two distinct Wizard cantrips other than the automatically granted Mage Hand.');
    if(spells.length!==3||new Set(spells).size!==3||spells.some(name=>!SPELLS.some(sp=>sp.name===name&&sp.level===1&&sp.classes.includes('wizard'))))issues.push('Choose three distinct level-1 Wizard spells.');
   }
  }else issues.push('This class subclass requires mechanics not yet supported by imported level-up.');
 }
 if(level===4&&forecastImprovementLevels(identity.classId).includes(4)){
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
    }else issues.push('This feat requires additional feature choices or mechanics not yet implemented for level-up.');
   }
  }
 }
 if(!choice.confirm)issues.push('Explicit confirmation required.');
 return issues;
}
export function applyImportedLevelUp(c:Campaign,choice:ImportedLevelChoice):Campaign{
 const issues=importedLevelUpIssues(c,choice);if(issues.length)throw Error(issues.join(' '));
 const ch=c.character!,level=(ch.level??1)+1;const scores={...ch.scores};
 if(level===4){
  if(choice.featPlan==='Ability Score Improvement')for(const a of ABILITIES){const increase=choice.abilityIncreases?.[a]??0;scores[a.toLowerCase() as keyof typeof scores]+=increase;}
  else if(choice.featAbility)scores[choice.featAbility.toLowerCase() as keyof typeof scores]+=1;
 }
 const maxHitPoints=(ch.maxHitPoints??1)+choice.hpGain;
 const conChange=modifier(scores.con)-modifier(ch.scores.con);
 const adjustedMax=maxHitPoints+conChange*level;
 const next={...ch,level,maxHitPoints:adjustedMax,currentHitPoints:Math.min(adjustedMax,(ch.currentHitPoints??1)+choice.hpGain+conChange*level),scores,proficiencyBonus:Math.ceil(level/4)+1,
  proficientSkills:choice.featPlan==='Skill Expert'?[...ch.proficientSkills,choice.skillProficiency!]:ch.proficientSkills,
  expertiseSkills:choice.featPlan==='Skill Expert'?[...(ch.expertiseSkills??[]),choice.skillExpertise!]:ch.expertiseSkills,
  ...(level===3&&choice.subclassId==='rogue-arcane-trickster'?{subclass:'Arcane Trickster' as const,cantrips:[...new Set([...(ch.cantrips??[]),'Mage Hand',...(choice.arcaneCantrips??[])])],preparedSpells:[...new Set([...(ch.preparedSpells??[]),...(choice.arcaneSpells??[])])],spellSlots:{level1:2,usedLevel1:0}}:{})};
 // Keep the selected subclass separately; legacy character.subclass is Arcane Trickster-specific.
 return {...c,character:next,importedSubclassId:level===3?choice.subclassId:c.importedSubclassId,updatedAt:new Date().toISOString(),journal:[...c.journal,{id:crypto.randomUUID(),kind:'system',text:`${c.characterIdentity!.name} confirmed level ${level}: +${choice.hpGain} HP${level===3?`; subclass ${choice.subclassId}`:''}${level===4?'; '+choice.featPlan:''}.`,createdAt:new Date().toISOString()}]};
}
