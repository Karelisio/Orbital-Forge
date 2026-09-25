import type { Cost, Effect, PlanetId } from './types';

export interface PlanetDef {
  id: PlanetId;
  colonize: Cost;
  /** Unique resource produced per second per level. */
  baseProd: number;
  /** Level-up cost in the planet's own resource: levelBase * levelGrowth^level. */
  levelBase: number;
  levelGrowth: number;
  /** Effects applied with L = planet level. */
  effects: Effect[];
  /** Visual biome palette [core, highlight, atmosphere]. */
  palette: [string, string, string];
  orbit: number;
}

export const PLANETS: readonly PlanetDef[] = [
  {
    id: 'cryon',
    colonize: { res: 'metal', amount: 2e3 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [{ k: 'lin', stat: 'yield', tier: 'ore', v: 0.25 }],
    palette: ['#2a6f97', '#bde0fe', '#9be7ff'],
    orbit: 1,
  },
  {
    id: 'vulcara',
    colonize: { res: 'alloy', amount: 800 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [{ k: 'lin', stat: 'yield', tier: 'metal', v: 0.25 }],
    palette: ['#6a040f', '#ff7b00', '#ff5a36'],
    orbit: 2,
  },
  {
    id: 'sylva',
    colonize: { res: 'alloy', amount: 2e4 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [
      { k: 'lin', stat: 'tap', v: 0.5 },
      { k: 'add', stat: 'autoTap', v: 0.1 },
    ],
    palette: ['#1b4332', '#74c69d', '#5dff8f'],
    orbit: 3,
  },
  {
    id: 'aquor',
    colonize: { res: 'component', amount: 5e3 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [
      { k: 'lin', stat: 'yield', tier: 'alloy', v: 0.25 },
      { k: 'lin', stat: 'yield', tier: 'component', v: 0.15 },
    ],
    palette: ['#03045e', '#48cae4', '#3d8bff'],
    orbit: 4,
  },
  {
    id: 'zephyr',
    colonize: { res: 'energy', amount: 2e3 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [
      { k: 'lin', stat: 'yield', tier: 'energy', v: 0.25 },
      { k: 'lin', stat: 'offlineEff', v: 0.03 },
    ],
    palette: ['#7f5539', '#ede0d4', '#ffd29b'],
    orbit: 5,
  },
  {
    id: 'nyx',
    colonize: { res: 'crystal', amount: 1e3 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [
      { k: 'lin', stat: 'yield', tier: 'crystal', v: 0.25 },
      { k: 'lin', stat: 'research', v: 0.05 },
    ],
    palette: ['#10002b', '#9d4edd', '#8a5cff'],
    orbit: 6,
  },
  {
    id: 'aurum',
    colonize: { res: 'crystal', amount: 5e4 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [
      { k: 'lin', stat: 'eventReward', v: 0.2 },
      { k: 'add', stat: 'artifactLuck', v: 0.02 },
    ],
    palette: ['#7c4a03', '#ffd166', '#ffd23f'],
    orbit: 7,
  },
  {
    id: 'omega',
    colonize: { res: 'darkMatter', amount: 1e3 },
    baseProd: 1,
    levelBase: 20,
    levelGrowth: 1.6,
    effects: [
      { k: 'lin', stat: 'global', v: 0.1 },
      { k: 'lin', stat: 'yield', tier: 'darkMatter', v: 0.25 },
    ],
    palette: ['#240046', '#ff3df0', '#ff3df0'],
    orbit: 8,
  },
];

export const PLANETS_BY_ID: Readonly<Record<PlanetId, PlanetDef>> = Object.fromEntries(
  PLANETS.map((p) => [p.id, p]),
) as Record<PlanetId, PlanetDef>;

export function planetLevelCost(def: PlanetDef, level: number): number {
  return Math.ceil(def.levelBase * Math.pow(def.levelGrowth, level));
}
