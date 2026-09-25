/** Shared types for data-driven game configuration. */

export const RESOURCE_IDS = [
  'ore',
  'metal',
  'alloy',
  'component',
  'energy',
  'crystal',
  'darkMatter',
] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export const PLANET_IDS = ['cryon', 'vulcara', 'sylva', 'aquor', 'zephyr', 'nyx', 'aurum', 'omega'] as const;
export type PlanetId = (typeof PLANET_IDS)[number];

/** Multiplicative stats: final value is the product of all contributions (1 = neutral). */
export type MulStat =
  | 'global' // all output
  | 'yield' // output of a tier (needs tier)
  | 'speed' // throughput of a tier (needs tier) — also increases input need
  | 'building' // output of one building (needs building)
  | 'ratio' // input needed per output for a tier (lower is better)
  | 'cost' // building cost for a tier (lower is better)
  | 'tap'
  | 'critMult'
  | 'offlineEff'
  | 'research' // research speed
  | 'expSpeed'
  | 'expLoot'
  | 'stardust'
  | 'singularity'
  | 'planet' // planet resource production
  | 'eventReward'
  | 'boostDuration'
  | 'boostCooldown'; // lower is better

/** Additive stats: final value is base + sum of contributions. */
export type AddStat =
  | 'tapPct'
  | 'critChance'
  | 'comboMax'
  | 'offlineCap' // hours
  | 'artifactSlots'
  | 'shipSlots'
  | 'researchSlots'
  | 'eventFreq' // +x => events x% more frequent (0.25 = +25%)
  | 'autoTap' // taps per second
  | 'artifactLuck'
  | 'startOre' // log10 of starting ore after a supernova
  | 'stardustUnspent' // extra % bonus per unspent stardust
  | 'managerSpeed';

export type UnlockKey =
  | 'managers1'
  | 'managers2'
  | 'managers3'
  | 'autoUpgrades'
  | 'expeditions'
  | 'artifacts'
  | 'autoSupernova'
  | 'keepPlanets'
  | 'keepUpgradesTap'
  | 'challenges2'
  | 'darkFlux'
  | 'tapEcho'
  | 'keepResearch';

/**
 * Effect applied with a level L (1 for one-shot sources):
 * - mul: value^L multiplier
 * - lin: (1 + value * L) multiplier
 * - add: value * L added
 * - unlock: feature flag
 */
export type Effect =
  | { k: 'mul'; stat: MulStat; v: number; tier?: ResourceId; building?: string }
  | { k: 'lin'; stat: MulStat; v: number; tier?: ResourceId; building?: string }
  | { k: 'add'; stat: AddStat; v: number }
  | { k: 'unlock'; key: UnlockKey };

export interface Cost {
  res: ResourceId;
  amount: number;
}
