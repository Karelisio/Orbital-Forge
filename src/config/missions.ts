import type { CounterStat } from './achievements';

export type MissionPeriod = 'daily' | 'weekly';
export type MissionStat = Extract<
  CounterStat,
  | 'taps'
  | 'crits'
  | 'buildingsBought'
  | 'upgradesBought'
  | 'eventsCaught'
  | 'expeditionsDone'
  | 'researchDone'
  | 'supernovas'
  | 'meteors'
>;

export type MissionReward =
  | { type: 'warp'; minutes: number }
  | { type: 'token'; amount: number }
  | { type: 'artifact' }
  | { type: 'stardust'; amount: number };

export interface MissionDef {
  id: string;
  period: MissionPeriod;
  stat: MissionStat;
  target: number;
  reward: MissionReward;
}

export const MISSIONS: readonly MissionDef[] = [
  { id: 'd_taps', period: 'daily', stat: 'taps', target: 500, reward: { type: 'warp', minutes: 15 } },
  { id: 'd_crits', period: 'daily', stat: 'crits', target: 30, reward: { type: 'warp', minutes: 15 } },
  {
    id: 'd_build',
    period: 'daily',
    stat: 'buildingsBought',
    target: 100,
    reward: { type: 'warp', minutes: 20 },
  },
  { id: 'd_upg', period: 'daily', stat: 'upgradesBought', target: 10, reward: { type: 'warp', minutes: 20 } },
  { id: 'd_events', period: 'daily', stat: 'eventsCaught', target: 3, reward: { type: 'token', amount: 1 } },
  { id: 'd_meteors', period: 'daily', stat: 'meteors', target: 15, reward: { type: 'warp', minutes: 15 } },
  { id: 'd_exp', period: 'daily', stat: 'expeditionsDone', target: 2, reward: { type: 'token', amount: 1 } },
  {
    id: 'd_research',
    period: 'daily',
    stat: 'researchDone',
    target: 2,
    reward: { type: 'warp', minutes: 30 },
  },
  { id: 'w_taps', period: 'weekly', stat: 'taps', target: 5000, reward: { type: 'artifact' } },
  {
    id: 'w_build',
    period: 'weekly',
    stat: 'buildingsBought',
    target: 1500,
    reward: { type: 'warp', minutes: 120 },
  },
  { id: 'w_events', period: 'weekly', stat: 'eventsCaught', target: 20, reward: { type: 'artifact' } },
  {
    id: 'w_exp',
    period: 'weekly',
    stat: 'expeditionsDone',
    target: 12,
    reward: { type: 'token', amount: 3 },
  },
  { id: 'w_sn', period: 'weekly', stat: 'supernovas', target: 2, reward: { type: 'stardust', amount: 0.1 } },
  {
    id: 'w_research',
    period: 'weekly',
    stat: 'researchDone',
    target: 8,
    reward: { type: 'warp', minutes: 180 },
  },
];

export const MISSIONS_BY_ID: Readonly<Record<string, MissionDef>> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
);

/** Login streak rewards, cycling every 7 days. */
export const STREAK_REWARDS: readonly MissionReward[] = [
  { type: 'warp', minutes: 10 },
  { type: 'warp', minutes: 20 },
  { type: 'token', amount: 1 },
  { type: 'warp', minutes: 40 },
  { type: 'warp', minutes: 60 },
  { type: 'token', amount: 2 },
  { type: 'artifact' },
];
