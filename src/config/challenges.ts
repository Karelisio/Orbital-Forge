import type { Effect, ResourceId } from './types';

export interface ChallengeRules {
  noTap?: boolean;
  globalMult?: number;
  noUpgrades?: boolean;
  ratioMult?: number;
  maxBuildings?: number;
  maxTier?: ResourceId;
  noResearch?: boolean;
  timeLimit?: number;
  costMult?: number;
}

export interface ChallengeDef {
  id: string;
  rules: ChallengeRules;
  /** Prestige score to reach, per completion level (index = completions). */
  goals: number[];
  /** Permanent reward applied with L = completions. */
  reward: Effect[];
  /** Supernovas required before it shows. */
  unlockSupernovas: number;
}

export const CHALLENGES: readonly ChallengeDef[] = [
  {
    id: 'c_notap',
    rules: { noTap: true },
    goals: [1e9, 1e14],
    reward: [{ k: 'mul', stat: 'tap', v: 3 }],
    unlockSupernovas: 1,
  },
  {
    id: 'c_weak',
    rules: { globalMult: 0.1 },
    goals: [1e9, 1e14],
    reward: [{ k: 'mul', stat: 'global', v: 1.5 }],
    unlockSupernovas: 1,
  },
  {
    id: 'c_noupg',
    rules: { noUpgrades: true },
    goals: [1e9, 1e14],
    reward: [{ k: 'mul', stat: 'cost', v: 0.9 }],
    unlockSupernovas: 2,
  },
  {
    id: 'c_ratio',
    rules: { ratioMult: 3 },
    goals: [3e9, 3e14],
    reward: [{ k: 'mul', stat: 'ratio', v: 0.85 }],
    unlockSupernovas: 2,
  },
  {
    id: 'c_limited',
    rules: { maxBuildings: 25 },
    goals: [1e9, 1e13],
    reward: [{ k: 'mul', stat: 'speed', v: 1.5 }],
    unlockSupernovas: 3,
  },
  {
    id: 'c_short',
    rules: { maxTier: 'alloy' },
    goals: [5e8, 5e12],
    reward: [
      { k: 'mul', stat: 'yield', tier: 'ore', v: 2 },
      { k: 'mul', stat: 'yield', tier: 'metal', v: 2 },
    ],
    unlockSupernovas: 3,
  },
  {
    id: 'c_blackout',
    rules: { noResearch: true },
    goals: [1e10, 1e15],
    reward: [{ k: 'mul', stat: 'research', v: 1.5 }],
    unlockSupernovas: 4,
  },
  {
    id: 'c_rush',
    rules: { timeLimit: 1800 },
    goals: [1e9, 1e14],
    reward: [{ k: 'mul', stat: 'stardust', v: 1.5 }],
    unlockSupernovas: 5,
  },
];

export const CHALLENGES_BY_ID: Readonly<Record<string, ChallengeDef>> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);
