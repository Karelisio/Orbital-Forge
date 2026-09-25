import { describe, expect, it } from 'vitest';
import { BUILDINGS, BUILDINGS_BY_ID, BUILDINGS_BY_TIER } from '../src/config/buildings';
import { UPGRADES } from '../src/config/upgrades';
import { BALANCE, TIER_BALANCE } from '../src/config/balance';
import { ACHIEVEMENTS } from '../src/config/achievements';
import { TALENTS } from '../src/config/talents';
import { RESEARCH, RESEARCH_BY_ID } from '../src/config/research';
import {
  bulkCost,
  maxAffordable,
  milestoneMult,
  nextMilestone,
  resolveQuantity,
  unitCost,
} from '../src/economy/cost';
import { Decimal } from '../src/economy/decimal';
import { formatNumber } from '../src/economy/format';
import { computeModifiers } from '../src/economy/modifiers';
import { applyProduction } from '../src/economy/production';
import { runScore, stardustForScore } from '../src/economy/prestige';
import { createInitialState } from '../src/engine/state';

const drill = BUILDINGS_BY_ID['ore_0'];

describe('content volume', () => {
  it('has 15 buildings per tier and 105 total', () => {
    expect(BUILDINGS).toHaveLength(105);
    for (const list of Object.values(BUILDINGS_BY_TIER)) expect(list).toHaveLength(15);
  });
  it('has 100+ upgrades, 150+ achievements, 50+ talents, 40 research', () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(100);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(150);
    expect(TALENTS.length).toBeGreaterThanOrEqual(50);
    expect(RESEARCH.length).toBe(40);
  });
  it('has unique ids and valid research prerequisites', () => {
    const ids = [...UPGRADES.map((u) => u.id), ...ACHIEVEMENTS.map((a) => a.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RESEARCH) for (const p of r.prereq) expect(RESEARCH_BY_ID[p]).toBeDefined();
  });
});

describe('cost formulas', () => {
  it('unit cost grows exponentially', () => {
    expect(unitCost(drill, 0).toNumber()).toBeCloseTo(15);
    expect(unitCost(drill, 10).toNumber()).toBeCloseTo(15 * Math.pow(drill.growth, 10), 6);
  });

  it('bulk cost equals the sum of unit costs', () => {
    let sum = new Decimal(0);
    for (let i = 5; i < 15; i++) sum = sum.add(unitCost(drill, i));
    expect(bulkCost(drill, 5, 10).toNumber()).toBeCloseTo(sum.toNumber(), 6);
  });

  it('bulk cost of 0 is 0 and cost multiplier applies', () => {
    expect(bulkCost(drill, 3, 0).toNumber()).toBe(0);
    expect(unitCost(drill, 3, 0.5).toNumber()).toBeCloseTo(unitCost(drill, 3).toNumber() / 2);
  });

  it('maxAffordable returns the largest affordable quantity', () => {
    const budget = new Decimal(10_000);
    const q = maxAffordable(drill, 7, budget);
    expect(bulkCost(drill, 7, q).lte(budget)).toBe(true);
    expect(bulkCost(drill, 7, q + 1).gt(budget)).toBe(true);
    expect(maxAffordable(drill, 0, new Decimal(1))).toBe(0);
  });

  it('maxAffordable handles huge budgets', () => {
    const q = maxAffordable(drill, 0, new Decimal('1e300'));
    expect(q).toBeGreaterThan(5000);
    expect(bulkCost(drill, 0, q).lte(new Decimal('1e300'))).toBe(true);
  });

  it('milestones double speed', () => {
    expect(milestoneMult(24)).toBe(1);
    expect(milestoneMult(25)).toBe(2);
    expect(milestoneMult(100)).toBe(8);
    expect(nextMilestone(0)).toBe(25);
    expect(nextMilestone(25)).toBe(50);
    expect(nextMilestone(5000)).toBeNull();
  });

  it('resolves buy quantities for every mode', () => {
    const s = createInitialState(0);
    const mods = computeModifiers(s);
    const budget = new Decimal(1e6);
    expect(resolveQuantity(drill, 3, 10, budget, mods)).toBe(10);
    expect(resolveQuantity(drill, 3, 'next', budget, mods)).toBe(22);
    expect(resolveQuantity(drill, 3, 'max', new Decimal(0), mods)).toBe(1);
    expect(resolveQuantity(drill, 3, 'max', budget, mods)).toBe(maxAffordable(drill, 3, budget));
    expect(resolveQuantity(drill, 20, 100, budget, { ...mods, rules: { maxBuildings: 25 } })).toBe(5);
  });
});

describe('resource chain', () => {
  it('producers add ore over time', () => {
    const s = createInitialState(0);
    s.buildings['ore_0'] = 10;
    const mods = computeModifiers(s);
    applyProduction(s, mods, 1);
    expect(s.resources.ore.toNumber()).toBeCloseTo(10 * drill.rate, 6);
    expect(s.run.produced.ore.toNumber()).toBeCloseTo(10 * drill.rate, 6);
  });

  it('converters consume input and are limited by it (bottleneck)', () => {
    const s = createInitialState(0);
    const smelter = BUILDINGS_BY_ID['metal_0'];
    s.buildings['metal_0'] = 10;
    s.resources.ore = new Decimal(5);
    const mods = computeModifiers(s);
    const need = 10 * smelter.rate * smelter.ratio; // ore / s
    const rates = applyProduction(s, mods, 1);
    expect(need).toBeGreaterThan(5);
    expect(rates.eff.metal).toBeCloseTo(5 / need, 6);
    expect(s.resources.ore.toNumber()).toBeCloseTo(0, 6);
    expect(s.resources.metal.toNumber()).toBeCloseTo(10 * smelter.rate * (5 / need), 6);
  });

  it('full supply runs at 100% and respects throttle', () => {
    const s = createInitialState(0);
    s.buildings['metal_0'] = 1;
    s.resources.ore = new Decimal(1e6);
    s.throttle.metal = 0.5;
    const mods = computeModifiers(s);
    const rates = applyProduction(s, mods, 2);
    expect(rates.eff.metal).toBe(1);
    const smelter = BUILDINGS_BY_ID['metal_0'];
    expect(s.resources.metal.toNumber()).toBeCloseTo(smelter.rate * 0.5 * 2, 6);
    expect(s.resources.ore.toNumber()).toBeCloseTo(1e6 - smelter.rate * 0.5 * 2 * smelter.ratio, 4);
  });

  it('same-step chaining lets ore produced this step feed smelters', () => {
    const s = createInitialState(0);
    s.buildings['ore_1'] = 10;
    s.buildings['metal_0'] = 1;
    const rates = applyProduction(s, computeModifiers(s), 1);
    expect(rates.eff.metal).toBe(1);
    expect(s.resources.metal.gt(0)).toBe(true);
  });
});

describe('prestige', () => {
  it('stardust follows the power law', () => {
    const { scoreDiv, exponent } = BALANCE.prestige;
    expect(stardustForScore(new Decimal(scoreDiv / 2), 1).toNumber()).toBe(0);
    expect(stardustForScore(new Decimal(scoreDiv), 1).toNumber()).toBe(1);
    const big = new Decimal(scoreDiv).mul(1e8);
    expect(stardustForScore(big, 1).toNumber()).toBe(Math.floor(Math.pow(1e8, exponent)));
    expect(stardustForScore(big, 2).toNumber()).toBe(Math.floor(2 * Math.pow(1e8, exponent)));
  });
  it('score weights higher tiers', () => {
    const s = createInitialState(0);
    s.run.produced.ore = new Decimal(100);
    s.run.produced.metal = new Decimal(1);
    expect(runScore(s).toNumber()).toBe(100 + TIER_BALANCE.metal.value);
  });
});

describe('number formatting', () => {
  it('formats short notation', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1.5)).toBe('1.5');
    expect(formatNumber(1234)).toBe('1.23K');
    expect(formatNumber(1.2e6)).toBe('1.20M');
    expect(formatNumber(new Decimal('1e66'))).toBe('1.00aa');
  });
  it('formats scientific and engineering', () => {
    expect(formatNumber(12345, 'scientific')).toBe('1.23e4');
    expect(formatNumber(12345, 'engineering')).toBe('12.34e3');
    expect(formatNumber(new Decimal('1e1000'), 'scientific')).toBe('1.00e1000');
  });
});
