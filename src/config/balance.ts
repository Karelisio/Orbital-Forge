import type { ResourceId } from './types';

/** Per-tier building generation parameters. */
export interface TierBalance {
  /** Cost of the first building of the tier, paid in `costRes`. */
  baseCost: number;
  /** Cost multiplier between building j and j+1. */
  costStep: number;
  /** Output/s of one unit of the first building (converters: output throughput). */
  baseRate: number;
  /** Rate multiplier between building j and j+1. */
  rateStep: number;
  /** Cost growth per owned unit for building 0, +growthStep per building index. */
  growth: number;
  growthStep: number;
  /** Units of the previous tier consumed per unit produced (0 for tier 1). */
  ratio: number;
  /** Prestige value of one unit (in ore equivalents). */
  value: number;
}

export const TIER_BALANCE: Record<ResourceId, TierBalance> = {
  ore: {
    baseCost: 15,
    costStep: 12,
    baseRate: 0.2,
    rateStep: 6.5,
    growth: 1.07,
    growthStep: 0.005,
    ratio: 0,
    value: 1,
  },
  metal: {
    baseCost: 300,
    costStep: 12,
    baseRate: 0.1,
    rateStep: 6.5,
    growth: 1.08,
    growthStep: 0.005,
    ratio: 10,
    value: 20,
  },
  alloy: {
    baseCost: 1.5e4,
    costStep: 12,
    baseRate: 1,
    rateStep: 6.5,
    growth: 1.09,
    growthStep: 0.005,
    ratio: 12,
    value: 480,
  },
  component: {
    baseCost: 2e9,
    costStep: 12,
    baseRate: 3.3e4,
    rateStep: 6.5,
    growth: 1.1,
    growthStep: 0.005,
    ratio: 15,
    value: 14400,
  },
  energy: {
    baseCost: 7e13,
    costStep: 12,
    baseRate: 2.9e8,
    rateStep: 6.5,
    growth: 1.1,
    growthStep: 0.005,
    ratio: 20,
    value: 576000,
  },
  crystal: {
    baseCost: 1.7e18,
    costStep: 12,
    baseRate: 2.3e12,
    rateStep: 6.5,
    growth: 1.11,
    growthStep: 0.005,
    ratio: 25,
    value: 2.88e7,
  },
  darkMatter: {
    baseCost: 3.5e23,
    costStep: 12,
    baseRate: 1.5e17,
    rateStep: 6.5,
    growth: 1.12,
    growthStep: 0.005,
    ratio: 30,
    value: 1.728e9,
  },
};

/**
 * Cost unit per resource: hand-written costs (research, planets, some upgrades) are multiplied by it so they
 * follow each tier's scale. Low tiers use raw amounts; high tiers use ~1 minute of their first converter / 100.
 */
export const COST_UNIT: Record<ResourceId, number> = {
  ore: 1,
  metal: 1,
  alloy: 1,
  component: TIER_BALANCE.component.baseRate * 0.6,
  energy: TIER_BALANCE.energy.baseRate * 0.6,
  crystal: TIER_BALANCE.crystal.baseRate * 0.6,
  darkMatter: TIER_BALANCE.darkMatter.baseRate * 0.6,
};

export function scaledCost<T extends { res: ResourceId; amount: number }>(c: T): T {
  return { ...c, amount: c.amount * COST_UNIT[c.res] };
}

export const BALANCE = {
  tickSeconds: 0.1,
  buildingsPerTier: 15,
  /** Owned-count thresholds; each reached one doubles the building's speed. */
  milestones: [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
  milestoneMult: 2,

  tap: {
    base: 1,
    pctOfOre: 0.05,
    critChance: 0.05,
    critMult: 10,
    comboWindow: 1.5,
    comboStep: 0.02,
    comboMax: 2,
  },

  offline: {
    capHours: 8,
    efficiency: 0.6,
    minSeconds: 60,
    maxIterations: 3000,
  },

  prestige: {
    /** stardust = floor(mult * (score / scoreDiv) ^ exponent) */
    scoreDiv: 2.5e11,
    exponent: 0.25,
    unspentBonus: 0.01,
    /** singularities = floor((stardustEarnedThisCycle / div) ^ exponent) */
    singularityDiv: 2e5,
    singularityExponent: 1 / 3,
    singularityGlobal: 0.25,
    blackHoleMinStardust: 2e5,
  },

  events: {
    minInterval: 150,
    maxInterval: 360,
    meteorDuration: 15,
    meteorCount: 10,
    meteorRewardSeconds: 20,
    cometDuration: 12,
    cometFrenzyMult: 7,
    cometFrenzyDuration: 60,
    cometLumpSeconds: 900,
    merchantDuration: 60,
    stormDuration: 90,
    stormMult: 0.5,
  },

  research: {
    baseSlots: 1,
  },

  expeditions: {
    baseShips: 1,
  },

  artifacts: {
    baseSlots: 3,
    maxLevel: 10,
  },

  managers: {
    interval: 2,
  },

  stats: {
    sampleEvery: 60,
    maxSamples: 360,
  },

  autosaveSeconds: 10,
} as const;
