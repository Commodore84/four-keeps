import {forecastSummary} from '../game/creationForecastSummary';
import {FUTURE_FEATS,LEGACY_FEATS,ORIGIN_PLANNING_FEATS,EPIC_BOONS,futureFeat,featEligibility,featCompatibilityWarnings} from '../game/creationFutureFeats';
import {projectCharacterLevel,forecastImprovementLevels,applyAbilityIncrease} from '../game/creationProjection';
import {emptyForecast,updateLevelPlan,type AdvancementForecast} from '../game/creationForecast';
import {subclassesForClass} from '../game/creationSubclasses';
import {SPECIES_TRAITS,LINEAGE_DETAILS,ORIGIN_FEATS,CLASS_OVERVIEW,CLASS_FEATURE_DETAILS,SKILL_DETAILS,choiceExplanation} from '../game/creationRulesGuide';
import {INVOCATION_DETAILS} from '../game/creationInvocationInfo';
import {fullSpellInfo} from '../game/creationFullSpellInfo';
import {AskDM} from './AskDM';
import {spellInfo} from '../game/creationSpellInfo';
import {reviewCharacter,reviewErrors} from '../game/creationReview';
import {SPELL_COUNTS,INVOCATIONS,emptyMagic,spellOptions,toggleSpell,validateMagic,spellStats,type MagicDraft,SPELL_BY_ID,emptyOriginMagic,magicInitiateClass,innateOriginSpells,validateOriginMagic,type OriginMagicDraft} from '../game/creationMagic';
import { ITEM_BY_ID, CLASS_PACKAGES, BACKGROUND_PACKAGES, emptyEquipment, inventory, remainingCp, armorClass, attackBonus, weaponTrained, armorTrained, equipmentErrors, carryingWeight, carryingCapacity, type EquipmentDraft } from '../game/creationEquipment';
import { ABILITIES, STANDARD_ARRAY, POINT_COSTS, POINT_BUY¶»§q«^