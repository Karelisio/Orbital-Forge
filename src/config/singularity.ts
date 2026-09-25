import type { Effect } from './types';

export interface SingularityDef {
  id: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  effects: Effect[];
}

export const SINGULARITY: readonly SingularityDef[] = [
  {
    id: 's_gravity',
    maxLevel: 20,
    baseCost: 1,
    costGrowth: 1.8,
    effects: [{ k: 'mul', stat: 'global', v: 2 }],
  },
  {
    id: 's_dust',
    maxLevel: 10,
    baseCost: 1,
    costGrowth: 2,
    effects: [{ k: 'mul', stat: 'stardust', v: 1.5 }],
  },
  {
    id: 's_keepTap',
    maxLevel: 1,
    baseCost: 1,
    costGrowth: 1,
    effects: [{ k: 'unlock', key: 'keepUpgradesTap' }],
  },
  { id: 's_start', maxLevel: 5, baseCost: 1, costGrowth: 2, effects: [{ k: 'add', stat: 'startOre', v: 3 }] },
  {
    id: 's_autoSN',
    maxLevel: 1,
    baseCost: 2,
    costGrowth: 1,
    effects: [{ k: 'unlock', key: 'autoSupernova' }],
  },
  {
    id: 's_research',
    maxLevel: 5,
    baseCost: 2,
    costGrowth: 2,
    effects: [{ k: 'mul', stat: 'research', v: 1.5 }],
  },
  {
    id: 's_events',
    maxLevel: 4,
    baseCost: 2,
    costGrowth: 2,
    effects: [{ k: 'add', stat: 'eventFreq', v: 0.25 }],
  },
  {
    id: 's_managers',
    maxLevel: 3,
    baseCost: 2,
    costGrowth: 2,
    effects: [{ k: 'add', stat: 'managerSpeed', v: 1 }],
  },
  {
    id: 's_keepPlanets',
    maxLevel: 1,
    baseCost: 3,
    costGrowth: 1,
    effects: [{ k: 'unlock', key: 'keepPlanets' }],
  },
  {
    id: 's_slots',
    maxLevel: 3,
    baseCost: 3,
    costGrowth: 2.5,
    effects: [{ k: 'add', stat: 'artifactSlots', v: 1 }],
  },
  { id: 's_echo', maxLevel: 1, baseCost: 3, costGrowth: 1, effects: [{ k: 'unlock', key: 'tapEcho' }] },
  {
    id: 's_offline',
    maxLevel: 3,
    baseCost: 3,
    costGrowth: 2,
    effects: [{ k: 'add', stat: 'offlineCap', v: 4 }],
  },
  {
    id: 's_ships',
    maxLevel: 1,
    baseCost: 4,
    costGrowth: 1,
    effects: [{ k: 'add', stat: 'shipSlots', v: 1 }],
  },
  { id: 's_flux', maxLevel: 1, baseCost: 4, costGrowth: 1, effects: [{ k: 'unlock', key: 'darkFlux' }] },
  {
    id: 's_challenges',
    maxLevel: 1,
    baseCost: 5,
    costGrowth: 1,
    effects: [{ k: 'unlock', key: 'challenges2' }],
  },
  {
    id: 's_keepResearch',
    maxLevel: 1,
    baseCost: 6,
    costGrowth: 1,
    effects: [{ k: 'unlock', key: 'keepResearch' }],
  },
];

export const SINGULARITY_BY_ID: Readonly<Record<string, SingularityDef>> = Object.fromEntries(
  SINGULARITY.map((s) => [s.id, s]),
);

export function singularityCost(def: SingularityDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level));
}
