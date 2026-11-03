// Deterministic D&D 2024 ability-check calculations. The DM never rolls or changes these results.
export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export const abilities: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export type Skill = 'Acrobatics' | 'Animal Handling' | 'Arcana' | 'Athletics' | 'Deception' | 'History' | 'Insight' | 'Intimidation' | 'Investigation' | 'Medicine' | 'Nature' | 'Perception' | 'Performance' | 'Persuasion' | 'Religion' | 'Sleight of Hand' | 'Stealth' | 'Survival';
export const skillAbility: Record<Skill, Ability> = {
  Acrobatics:'dex', 'Animal Handling':'wis', Arcana:'int', Athletics:'str', Deception:'cha', History:'int', Insight:'wis', Intimidation:'cha', Investigation:'int', Medicine:'wis', Nature:'int', Perception:'wis', Performance:'cha', Persuasion:'cha', Religion:'int', 'Sleight of Hand':'dex', Stealth:'dex', Survival:'wis',
};
export interface CharacterStats { scores: Record<Ability, number>; proficiencyBonus: number; proficientSkills: Skill[] }
export const prototypeNighthawk: CharacterStats = {
  // Temporary playtest values, not a finalized character build.
  scores: { str: 8, dex: 16, con: 14, int: 14, wis: 12, cha: 10 },
  proficiencyBonus: 2,
  proficientSkills: ['Stealth', 'Sleight of Hand', 'Investigation', 'Perception'],
};
export type RollMode = 'normal' | 'advantage' | 'disadvantage';
export interface CheckResult { skill: Skill; ability: Ability; dice: number[]; selected: number; modifier: number; total: number; mode: RollMode }
export const abilityModifier = (score: number) => Math.floor((score - 10) / 2);
export const skillModifier = (stats: CharacterStats, skill: Skill) => abilityModifier(stats.scores[skillAbility[skill]]) + (stats.proficientSkills.includes(skill) ? stats.proficiencyBonus : 0);
export function resolveCheck(stats: CharacterStats, skill: Skill, mode: RollMode, dice: number[]): CheckResult {
  if (dice.length !== (mode === 'normal' ? 1 : 2) || dice.some(d => !Number.isInteger(d) || d < 1 || d > 20)) throw new Error('Invalid d20 results');
  const selected = mode === 'advantage' ? Math.max(...dice) : mode === 'disadvantage' ? Math.min(...dice) : dice[0];
  const modifier = skillModifier(stats, skill);
  return { skill, ability: skillAbility[skill], dice, selected, modifier, total: selected + modifier, mode };
}
export function rollCheck(stats: CharacterStats, skill: Skill, mode: RollMode, random: () => number = Math.random): CheckResult {
  const count = mode === 'normal' ? 1 : 2;
  const dice = Array.from({ length: count }, () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid random value');
    return Math.floor(value * 20) + 1;
  });
  return resolveCheck(stats, skill, mode, dice);
}
export function describeCheck(result: CheckResult): string {
  const sign = result.modifier >= 0 ? '+' : '';
  const diceText = result.mode === 'normal' ? `${result.dice[0]}` : `${result.dice.join(' / ')} (${result.mode}: ${result.selected})`;
  return `Nighthawk · ${result.skill}: ${diceText} ${sign}${result.modifier} = ${result.total}. Outcome awaits DM adjudication.`;
}
