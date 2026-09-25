import { COST_UNIT, scaledCost } from './balance';
import { BUILDINGS } from './buildings';
import { RESOURCE_IDS, type Cost, type Effect, type ResourceId } from './types';

export type UpgradeReq =
  | { type: 'building'; id: string; count: number }
  | { type: 'produced'; res: ResourceId; amount: number }
  | { type: 'none' };

export type UpgradeKind =
  'building' | 'tap' | 'crit' | 'combo' | 'tier' | 'ratio' | 'offline' | 'global' | 'event';

export interface UpgradeLabel {
  key: string;
  building?: string;
  tier?: ResourceId;
  n?: number;
}

export interface UpgradeDef {
  id: string;
  kind: UpgradeKind;
  cost: Cost;
  effects: Effect[];
  req: UpgradeReq;
  label: UpgradeLabel;
}

const list: UpgradeDef[] = [];

// Two overclocks per building.
for (const b of BUILDINGS) {
  list.push({
    id: `u_${b.id}_1`,
    kind: 'building',
    cost: { res: b.costRes, amount: b.baseCost * 100 },
    effects: [{ k: 'mul', stat: 'building', building: b.id, v: 2 }],
    req: { type: 'building', id: b.id, count: 10 },
    label: { key: 'upg.building1', building: b.id },
  });
  list.push({
    id: `u_${b.id}_2`,
    kind: 'building',
    cost: { res: b.costRes, amount: b.baseCost * Math.pow(b.growth, 75) * 40 },
    effects: [{ k: 'mul', stat: 'building', building: b.id, v: 3 }],
    req: { type: 'building', id: b.id, count: 75 },
    label: { key: 'upg.building2', building: b.id },
  });
}

// Tap power.
const tapCosts = [50, 1e3, 2e4, 5e5, 1e7, 5e8, 2e10, 1e12, 1e14, 1e16, 1e19, 1e22];
tapCosts.forEach((amount, i) => {
  const effects: Effect[] = [{ k: 'mul', stat: 'tap', v: 2 }];
  if (i % 3 === 2) effects.push({ k: 'add', stat: 'tapPct', v: 0.01 });
  list.push({
    id: `u_tap_${i}`,
    kind: 'tap',
    cost: { res: 'ore', amount },
    effects,
    req: { type: 'produced', res: 'ore', amount: amount * 0.3 },
    label: { key: 'upg.tap', n: i + 1 },
  });
});

// Critical hits.
[50, 5e3, 5e5, 5e7, 5e9].forEach((amount, i) => {
  list.push({
    id: `u_crit_${i}`,
    kind: 'crit',
    cost: { res: 'metal', amount },
    effects: [
      { k: 'add', stat: 'critChance', v: 0.02 },
      { k: 'mul', stat: 'critMult', v: 1.25 },
    ],
    req: { type: 'produced', res: 'metal', amount: amount * 0.3 },
    label: { key: 'upg.crit', n: i + 1 },
  });
});

// Combo.
[100, 1e5, 1e8].forEach((amount, i) => {
  list.push({
    id: `u_combo_${i}`,
    kind: 'combo',
    cost: { res: 'alloy', amount },
    effects: [{ k: 'add', stat: 'comboMax', v: 0.5 }],
    req: { type: 'produced', res: 'alloy', amount: amount * 0.3 },
    label: { key: 'upg.combo', n: i + 1 },
  });
});

// Tier-wide yield and efficiency.
const yieldSteps = [1, 1e4, 1e9, 1e15, 1e22];
for (const tier of RESOURCE_IDS) {
  // Typical stock scale of the resource when its tier opens.
  const base = tier === 'ore' ? 1e4 : 100 * COST_UNIT[tier];
  yieldSteps.forEach((m, i) => {
    const amount = base * m;
    list.push({
      id: `u_yield_${tier}_${i}`,
      kind: 'tier',
      cost: { res: tier, amount },
      effects: [{ k: 'mul', stat: 'yield', tier, v: 2 }],
      req: { type: 'produced', res: tier, amount: amount * 0.25 },
      label: { key: 'upg.yield', tier, n: i + 1 },
    });
  });
  if (tier !== 'ore') {
    [50, 5e5].forEach((m, i) => {
      const amount = base * m;
      list.push({
        id: `u_ratio_${tier}_${i}`,
        kind: 'ratio',
        cost: { res: tier, amount },
        effects: [{ k: 'mul', stat: 'ratio', tier, v: 0.85 }],
        req: { type: 'produced', res: tier, amount: amount * 0.25 },
        label: { key: 'upg.ratio', tier, n: i + 1 },
      });
    });
  }
}

// Offline efficiency.
const offline: Cost[] = [
  { res: 'metal', amount: 1e4 },
  { res: 'alloy', amount: 1e5 },
  { res: 'energy', amount: 1e4 },
];
offline.map(scaledCost).forEach((cost, i) => {
  list.push({
    id: `u_offline_${i}`,
    kind: 'offline',
    cost,
    effects: [{ k: 'mul', stat: 'offlineEff', v: 1.15 }],
    req: { type: 'produced', res: cost.res, amount: cost.amount * 0.2 },
    label: { key: 'upg.offline', n: i + 1 },
  });
});

// Global multipliers.
const globals: Cost[] = [
  { res: 'component', amount: 5e3 },
  { res: 'energy', amount: 5e3 },
  { res: 'energy', amount: 5e6 },
  { res: 'crystal', amount: 5e4 },
  { res: 'darkMatter', amount: 5e3 },
  { res: 'darkMatter', amount: 5e7 },
];
globals.map(scaledCost).forEach((cost, i) => {
  list.push({
    id: `u_global_${i}`,
    kind: 'global',
    cost,
    effects: [{ k: 'mul', stat: 'global', v: 1.5 }],
    req: { type: 'produced', res: cost.res, amount: cost.amount * 0.2 },
    label: { key: 'upg.global', n: i + 1 },
  });
});

// Events.
const events: Cost[] = [
  { res: 'metal', amount: 2e3 },
  { res: 'component', amount: 1e4 },
  { res: 'crystal', amount: 1e5 },
];
events.map(scaledCost).forEach((cost, i) => {
  list.push({
    id: `u_event_${i}`,
    kind: 'event',
    cost,
    effects: [
      { k: 'mul', stat: 'eventReward', v: 1.5 },
      { k: 'add', stat: 'eventFreq', v: 0.15 },
    ],
    req: { type: 'produced', res: cost.res, amount: cost.amount * 0.2 },
    label: { key: 'upg.event', n: i + 1 },
  });
});

export const UPGRADES: readonly UpgradeDef[] = list;
export const UPGRADES_BY_ID: Readonly<Record<string, UpgradeDef>> = Object.fromEntries(
  list.map((u) => [u.id, u]),
);
