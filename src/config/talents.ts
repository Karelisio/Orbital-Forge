import type { Effect } from './types';

export type TalentBranch = 'prod' | 'forge' | 'impact' | 'time' | 'fortune';

export interface TalentDef {
  id: string;
  branch: TalentBranch;
  /** Row inside the branch (for layout). */
  row: number;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  prereq: string[];
  effects: Effect[];
}

type Row = [maxLevel: number, baseCost: number, costGrowth: number, effects: Effect[]];

function branch(name: TalentBranch, rows: Row[]): TalentDef[] {
  return rows.map(([maxLevel, baseCost, costGrowth, effects], i) => ({
    id: `t_${name}_${i + 1}`,
    branch: name,
    row: i,
    maxLevel,
    baseCost,
    costGrowth,
    prereq: i === 0 ? [] : [`t_${name}_${i}`],
    effects,
  }));
}

export const TALENTS: readonly TalentDef[] = [
  ...branch('prod', [
    [10, 1, 1.6, [{ k: 'lin', stat: 'global', v: 0.25 }]],
    [5, 2, 1.8, [{ k: 'mul', stat: 'yield', tier: 'ore', v: 1.5 }]],
    [5, 3, 1.8, [{ k: 'mul', stat: 'yield', tier: 'metal', v: 1.5 }]],
    [5, 5, 1.8, [{ k: 'mul', stat: 'yield', tier: 'alloy', v: 1.5 }]],
    [5, 8, 1.8, [{ k: 'mul', stat: 'yield', tier: 'component', v: 1.5 }]],
    [5, 13, 1.8, [{ k: 'mul', stat: 'yield', tier: 'energy', v: 1.5 }]],
    [5, 21, 1.8, [{ k: 'mul', stat: 'yield', tier: 'crystal', v: 1.5 }]],
    [5, 34, 1.8, [{ k: 'mul', stat: 'yield', tier: 'darkMatter', v: 1.5 }]],
    [10, 55, 2, [{ k: 'mul', stat: 'global', v: 1.25 }]],
    [10, 100, 2.2, [{ k: 'add', stat: 'stardustUnspent', v: 0.005 }]],
  ]),
  ...branch('forge', [
    [10, 1, 1.6, [{ k: 'mul', stat: 'cost', v: 0.95 }]],
    [5, 2, 1.8, [{ k: 'mul', stat: 'speed', tier: 'ore', v: 1.5 }]],
    [10, 3, 1.7, [{ k: 'add', stat: 'startOre', v: 1 }]],
    [5, 5, 1.9, [{ k: 'mul', stat: 'ratio', v: 0.95 }]],
    [4, 8, 2, [{ k: 'add', stat: 'managerSpeed', v: 0.5 }]],
    [5, 13, 1.9, [{ k: 'mul', stat: 'speed', v: 1.2 }]],
    [1, 25, 1, [{ k: 'unlock', key: 'keepUpgradesTap' }]],
    [5, 34, 1.9, [{ k: 'mul', stat: 'ratio', tier: 'component', v: 0.9 }]],
    [5, 55, 2, [{ k: 'mul', stat: 'cost', v: 0.9 }]],
    [5, 89, 2.2, [{ k: 'mul', stat: 'speed', v: 1.3 }]],
  ]),
  ...branch('impact', [
    [10, 1, 1.5, [{ k: 'mul', stat: 'tap', v: 2 }]],
    [5, 2, 1.8, [{ k: 'add', stat: 'tapPct', v: 0.01 }]],
    [10, 3, 1.7, [{ k: 'add', stat: 'critChance', v: 0.01 }]],
    [5, 5, 1.8, [{ k: 'mul', stat: 'critMult', v: 1.5 }]],
    [4, 8, 2, [{ k: 'add', stat: 'comboMax', v: 0.25 }]],
    [10, 13, 1.8, [{ k: 'add', stat: 'autoTap', v: 1 }]],
    [5, 21, 1.9, [{ k: 'mul', stat: 'tap', v: 3 }]],
    [5, 34, 2, [{ k: 'add', stat: 'critChance', v: 0.02 }]],
    [5, 55, 2, [{ k: 'add', stat: 'tapPct', v: 0.02 }]],
    [5, 89, 2.2, [{ k: 'mul', stat: 'critMult', v: 2 }]],
  ]),
  ...branch('time', [
    [8, 1, 1.6, [{ k: 'add', stat: 'offlineCap', v: 1 }]],
    [5, 2, 1.8, [{ k: 'mul', stat: 'offlineEff', v: 1.1 }]],
    [10, 3, 1.6, [{ k: 'mul', stat: 'research', v: 1.15 }]],
    [5, 5, 1.8, [{ k: 'mul', stat: 'boostDuration', v: 1.2 }]],
    [5, 8, 1.8, [{ k: 'mul', stat: 'boostCooldown', v: 0.9 }]],
    [2, 13, 3, [{ k: 'add', stat: 'researchSlots', v: 1 }]],
    [5, 21, 1.9, [{ k: 'mul', stat: 'expSpeed', v: 1.15 }]],
    [5, 34, 1.9, [{ k: 'mul', stat: 'planet', v: 1.25 }]],
    [1, 55, 1, [{ k: 'add', stat: 'shipSlots', v: 1 }]],
    [5, 89, 2.2, [{ k: 'mul', stat: 'offlineEff', v: 1.1 }]],
  ]),
  ...branch('fortune', [
    [5, 1, 1.7, [{ k: 'add', stat: 'eventFreq', v: 0.1 }]],
    [5, 2, 1.8, [{ k: 'mul', stat: 'eventReward', v: 1.25 }]],
    [10, 3, 1.7, [{ k: 'add', stat: 'artifactLuck', v: 0.05 }]],
    [5, 5, 1.9, [{ k: 'mul', stat: 'expLoot', v: 1.2 }]],
    [2, 8, 3, [{ k: 'add', stat: 'artifactSlots', v: 1 }]],
    [10, 13, 1.8, [{ k: 'mul', stat: 'stardust', v: 1.1 }]],
    [5, 21, 1.9, [{ k: 'mul', stat: 'planet', v: 1.2 }]],
    [5, 34, 2, [{ k: 'mul', stat: 'eventReward', v: 1.3 }]],
    [5, 55, 2, [{ k: 'add', stat: 'eventFreq', v: 0.1 }]],
    [10, 89, 2.2, [{ k: 'mul', stat: 'stardust', v: 1.15 }]],
  ]),
];

export const TALENTS_BY_ID: Readonly<Record<string, TalentDef>> = Object.fromEntries(
  TALENTS.map((t) => [t.id, t]),
);

export function talentCost(def: TalentDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level));
}
