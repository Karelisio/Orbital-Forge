import { RESOURCE_IDS, type ResourceId } from './types';

/** Numeric counters an achievement / mission can track. */
export type CounterStat =
  | 'taps'
  | 'crits'
  | 'maxCombo'
  | 'buildingsOwned'
  | 'buildingsBought'
  | 'upgradesBought'
  | 'supernovas'
  | 'blackHoles'
  | 'planetsColonized'
  | 'planetMaxLevel'
  | 'researchDone'
  | 'artifactsDistinct'
  | 'expeditionsDone'
  | 'challengesDone'
  | 'eventsCaught'
  | 'meteors'
  | 'playHours'
  | 'missionsDone'
  | 'streak'
  | 'stardustTotal';

export type AchievementCond =
  | { type: 'produced'; res: ResourceId; amount: number }
  | { type: 'counter'; stat: CounterStat; value: number }
  | { type: 'tierAll'; res: ResourceId; count: number };

export interface AchievementDef {
  id: string;
  cond: AchievementCond;
  /** Global production bonus (fraction). */
  bonus: number;
  /** Category key for naming. */
  cat: string;
  rank: number;
}

const list: AchievementDef[] = [];

const producedSteps = [1e2, 1e4, 1e6, 1e9, 1e12, 1e15, 1e20, 1e25, 1e30];
const producedStepsHigh = [10, 1e3, 1e5, 1e8, 1e11, 1e14, 1e18, 1e22, 1e26];
for (const res of RESOURCE_IDS) {
  (res === 'ore' ? producedSteps : producedStepsHigh).forEach((amount, i) => {
    list.push({
      id: `ach_prod_${res}_${i}`,
      cond: { type: 'produced', res, amount },
      bonus: 0.01,
      cat: `prod_${res}`,
      rank: i,
    });
  });
}
for (const res of RESOURCE_IDS) {
  list.push({
    id: `ach_all_${res}_1`,
    cond: { type: 'tierAll', res, count: 1 },
    bonus: 0.02,
    cat: 'tierAll1',
    rank: 0,
  });
  list.push({
    id: `ach_all_${res}_100`,
    cond: { type: 'tierAll', res, count: 100 },
    bonus: 0.05,
    cat: 'tierAll100',
    rank: 0,
  });
}

const counters: [CounterStat, number[], number][] = [
  ['buildingsOwned', [1, 10, 50, 100, 250, 500, 1000, 2000, 3000, 5000], 0.01],
  ['taps', [100, 1e3, 1e4, 5e4, 1e5, 5e5], 0.01],
  ['crits', [10, 100, 1e3, 1e4], 0.01],
  ['maxCombo', [25, 50, 100], 0.01],
  ['supernovas', [1, 3, 5, 10, 25, 50, 100], 0.03],
  ['blackHoles', [1, 2, 5, 10], 0.05],
  ['planetsColonized', [1, 2, 3, 4, 5, 6, 7, 8], 0.02],
  ['planetMaxLevel', [5, 10, 25, 50], 0.02],
  ['researchDone', [1, 5, 10, 20, 30, 40], 0.02],
  ['artifactsDistinct', [1, 5, 10, 20, 30], 0.02],
  ['expeditionsDone', [1, 10, 50, 100, 250], 0.01],
  ['challengesDone', [1, 3, 5, 8, 12, 16], 0.03],
  ['eventsCaught', [1, 10, 50, 100, 500], 0.01],
  ['meteors', [10, 100, 1000], 0.01],
  ['playHours', [1, 5, 24, 72, 168, 500], 0.01],
  ['missionsDone', [1, 10, 50, 200], 0.01],
  ['streak', [3, 7, 30], 0.02],
  ['upgradesBought', [1, 10, 50, 100, 200], 0.01],
  ['stardustTotal', [1, 100, 1e4, 1e6, 1e9], 0.02],
];
for (const [stat, values, bonus] of counters) {
  values.forEach((value, i) => {
    list.push({ id: `ach_${stat}_${i}`, cond: { type: 'counter', stat, value }, bonus, cat: stat, rank: i });
  });
}

export const ACHIEVEMENTS: readonly AchievementDef[] = list;
export const ACHIEVEMENTS_BY_ID: Readonly<Record<string, AchievementDef>> = Object.fromEntries(
  list.map((a) => [a.id, a]),
);
