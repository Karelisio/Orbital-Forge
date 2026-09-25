import type { Cost, Effect } from './types';

export interface ResearchDef {
  id: string;
  cost: Cost;
  /** Duration in seconds at research speed 1. */
  duration: number;
  prereq: string[];
  effects: Effect[];
}

const H = 3600;
const M = 60;

export const RESEARCH: readonly ResearchDef[] = [
  {
    id: 'r_drills',
    cost: { res: 'metal', amount: 50 },
    duration: 30,
    prereq: [],
    effects: [{ k: 'mul', stat: 'yield', tier: 'ore', v: 1.5 }],
  },
  {
    id: 'r_tap1',
    cost: { res: 'metal', amount: 200 },
    duration: M,
    prereq: [],
    effects: [
      { k: 'mul', stat: 'tap', v: 2 },
      { k: 'add', stat: 'tapPct', v: 0.01 },
    ],
  },
  {
    id: 'r_smelt',
    cost: { res: 'metal', amount: 150 },
    duration: M,
    prereq: ['r_drills'],
    effects: [{ k: 'mul', stat: 'yield', tier: 'metal', v: 1.5 }],
  },
  {
    id: 'r_auto1',
    cost: { res: 'metal', amount: 800 },
    duration: 3 * M,
    prereq: ['r_drills'],
    effects: [{ k: 'unlock', key: 'managers1' }],
  },
  {
    id: 'r_logistics',
    cost: { res: 'alloy', amount: 50 },
    duration: 5 * M,
    prereq: ['r_smelt'],
    effects: [
      { k: 'mul', stat: 'ratio', tier: 'metal', v: 0.9 },
      { k: 'mul', stat: 'ratio', tier: 'alloy', v: 0.9 },
    ],
  },
  {
    id: 'r_expeditions',
    cost: { res: 'alloy', amount: 200 },
    duration: 10 * M,
    prereq: ['r_logistics'],
    effects: [{ k: 'unlock', key: 'expeditions' }],
  },
  {
    id: 'r_offline1',
    cost: { res: 'alloy', amount: 300 },
    duration: 15 * M,
    prereq: [],
    effects: [{ k: 'add', stat: 'offlineCap', v: 2 }],
  },
  {
    id: 'r_artifacts',
    cost: { res: 'alloy', amount: 500 },
    duration: 15 * M,
    prereq: ['r_expeditions'],
    effects: [
      { k: 'unlock', key: 'artifacts' },
      { k: 'add', stat: 'artifactLuck', v: 0.1 },
    ],
  },
  {
    id: 'r_yield_alloy',
    cost: { res: 'alloy', amount: 1e3 },
    duration: 20 * M,
    prereq: ['r_smelt'],
    effects: [{ k: 'mul', stat: 'yield', tier: 'alloy', v: 2 }],
  },
  {
    id: 'r_parallel',
    cost: { res: 'component', amount: 100 },
    duration: 30 * M,
    prereq: ['r_auto1'],
    effects: [{ k: 'add', stat: 'researchSlots', v: 1 }],
  },
  {
    id: 'r_auto2',
    cost: { res: 'component', amount: 500 },
    duration: H,
    prereq: ['r_auto1'],
    effects: [{ k: 'unlock', key: 'managers2' }],
  },
  {
    id: 'r_ships2',
    cost: { res: 'component', amount: 1e3 },
    duration: 1.5 * H,
    prereq: ['r_expeditions'],
    effects: [{ k: 'add', stat: 'shipSlots', v: 1 }],
  },
  {
    id: 'r_speed_ore',
    cost: { res: 'component', amount: 2e3 },
    duration: 2 * H,
    prereq: ['r_drills'],
    effects: [{ k: 'mul', stat: 'speed', tier: 'ore', v: 1.5 }],
  },
  {
    id: 'r_autoUpg',
    cost: { res: 'component', amount: 2e3 },
    duration: H,
    prereq: ['r_auto2'],
    effects: [{ k: 'unlock', key: 'autoUpgrades' }],
  },
  {
    id: 'r_crit1',
    cost: { res: 'component', amount: 2e3 },
    duration: H,
    prereq: ['r_tap1'],
    effects: [
      { k: 'add', stat: 'critChance', v: 0.03 },
      { k: 'mul', stat: 'critMult', v: 1.5 },
    ],
  },
  {
    id: 'r_events1',
    cost: { res: 'component', amount: 3e3 },
    duration: H,
    prereq: [],
    effects: [
      { k: 'add', stat: 'eventFreq', v: 0.2 },
      { k: 'mul', stat: 'eventReward', v: 1.25 },
    ],
  },
  {
    id: 'r_speed_metal',
    cost: { res: 'component', amount: 4e3 },
    duration: 2 * H,
    prereq: ['r_speed_ore'],
    effects: [{ k: 'mul', stat: 'speed', tier: 'metal', v: 1.5 }],
  },
  {
    id: 'r_comp',
    cost: { res: 'component', amount: 5e3 },
    duration: 2 * H,
    prereq: ['r_yield_alloy'],
    effects: [{ k: 'mul', stat: 'yield', tier: 'component', v: 2 }],
  },
  {
    id: 'r_autotap',
    cost: { res: 'component', amount: 1e4 },
    duration: 3 * H,
    prereq: ['r_crit1'],
    effects: [{ k: 'add', stat: 'autoTap', v: 2 }],
  },
  {
    id: 'r_energy',
    cost: { res: 'energy', amount: 100 },
    duration: 2 * H,
    prereq: ['r_comp'],
    effects: [{ k: 'mul', stat: 'yield', tier: 'energy', v: 2 }],
  },
  {
    id: 'r_offline2',
    cost: { res: 'energy', amount: 1e3 },
    duration: 3 * H,
    prereq: ['r_offline1'],
    effects: [
      { k: 'add', stat: 'offlineCap', v: 2 },
      { k: 'mul', stat: 'offlineEff', v: 1.2 },
    ],
  },
  {
    id: 'r_auto3',
    cost: { res: 'energy', amount: 500 },
    duration: 4 * H,
    prereq: ['r_auto2'],
    effects: [{ k: 'unlock', key: 'managers3' }],
  },
  {
    id: 'r_research2',
    cost: { res: 'energy', amount: 2e3 },
    duration: 3 * H,
    prereq: ['r_parallel'],
    effects: [{ k: 'mul', stat: 'research', v: 1.5 }],
  },
  {
    id: 'r_tap2',
    cost: { res: 'energy', amount: 5e3 },
    duration: 3 * H,
    prereq: ['r_crit1'],
    effects: [
      { k: 'mul', stat: 'tap', v: 3 },
      { k: 'add', stat: 'tapPct', v: 0.02 },
    ],
  },
  {
    id: 'r_ratio2',
    cost: { res: 'energy', amount: 5e3 },
    duration: 4 * H,
    prereq: ['r_logistics'],
    effects: [
      { k: 'mul', stat: 'ratio', tier: 'component', v: 0.85 },
      { k: 'mul', stat: 'ratio', tier: 'energy', v: 0.85 },
    ],
  },
  {
    id: 'r_global1',
    cost: { res: 'energy', amount: 1e4 },
    duration: 4 * H,
    prereq: ['r_energy'],
    effects: [{ k: 'mul', stat: 'global', v: 1.5 }],
  },
  {
    id: 'r_crystal',
    cost: { res: 'crystal', amount: 100 },
    duration: 5 * H,
    prereq: ['r_energy'],
    effects: [{ k: 'mul', stat: 'yield', tier: 'crystal', v: 2 }],
  },
  {
    id: 'r_ships3',
    cost: { res: 'crystal', amount: 500 },
    duration: 6 * H,
    prereq: ['r_ships2'],
    effects: [
      { k: 'add', stat: 'shipSlots', v: 1 },
      { k: 'mul', stat: 'expSpeed', v: 1.25 },
    ],
  },
  {
    id: 'r_expLoot',
    cost: { res: 'crystal', amount: 1e3 },
    duration: 5 * H,
    prereq: ['r_ships2'],
    effects: [{ k: 'mul', stat: 'expLoot', v: 1.5 }],
  },
  {
    id: 'r_planets',
    cost: { res: 'crystal', amount: 2e3 },
    duration: 6 * H,
    prereq: [],
    effects: [{ k: 'mul', stat: 'planet', v: 1.5 }],
  },
  {
    id: 'r_dm',
    cost: { res: 'crystal', amount: 5e3 },
    duration: 8 * H,
    prereq: ['r_crystal'],
    effects: [{ k: 'mul', stat: 'yield', tier: 'darkMatter', v: 2 }],
  },
  {
    id: 'r_autotap2',
    cost: { res: 'crystal', amount: 5e3 },
    duration: 8 * H,
    prereq: ['r_autotap'],
    effects: [{ k: 'add', stat: 'autoTap', v: 5 }],
  },
  {
    id: 'r_boost',
    cost: { res: 'crystal', amount: 1e4 },
    duration: 6 * H,
    prereq: [],
    effects: [{ k: 'mul', stat: 'boostDuration', v: 1.5 }],
  },
  {
    id: 'r_events2',
    cost: { res: 'crystal', amount: 2e4 },
    duration: 8 * H,
    prereq: ['r_events1'],
    effects: [{ k: 'add', stat: 'eventFreq', v: 0.25 }],
  },
  {
    id: 'r_global2',
    cost: { res: 'darkMatter', amount: 100 },
    duration: 10 * H,
    prereq: ['r_global1'],
    effects: [{ k: 'mul', stat: 'global', v: 2 }],
  },
  {
    id: 'r_ratio3',
    cost: { res: 'darkMatter', amount: 500 },
    duration: 10 * H,
    prereq: ['r_ratio2'],
    effects: [
      { k: 'mul', stat: 'ratio', tier: 'crystal', v: 0.8 },
      { k: 'mul', stat: 'ratio', tier: 'darkMatter', v: 0.8 },
    ],
  },
  {
    id: 'r_research3',
    cost: { res: 'darkMatter', amount: 1e3 },
    duration: 12 * H,
    prereq: ['r_research2'],
    effects: [
      { k: 'mul', stat: 'research', v: 1.5 },
      { k: 'add', stat: 'researchSlots', v: 1 },
    ],
  },
  {
    id: 'r_stardust',
    cost: { res: 'darkMatter', amount: 2e3 },
    duration: 12 * H,
    prereq: ['r_dm'],
    effects: [{ k: 'mul', stat: 'stardust', v: 1.25 }],
  },
  {
    id: 'r_offline3',
    cost: { res: 'darkMatter', amount: 5e3 },
    duration: 12 * H,
    prereq: ['r_offline2'],
    effects: [{ k: 'add', stat: 'offlineCap', v: 4 }],
  },
  {
    id: 'r_global3',
    cost: { res: 'darkMatter', amount: 1e5 },
    duration: 12 * H,
    prereq: ['r_global2'],
    effects: [{ k: 'mul', stat: 'global', v: 3 }],
  },
];

export const RESEARCH_BY_ID: Readonly<Record<string, ResearchDef>> = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r]),
);
