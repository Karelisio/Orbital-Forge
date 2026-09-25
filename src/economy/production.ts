import { BALANCE } from '../config/balance';
import { BUILDINGS_BY_TIER, type BuildingDef } from '../config/buildings';
import { PLANETS } from '../config/planets';
import { RESOURCES } from '../config/resources';
import { RESOURCE_IDS, type ResourceId } from '../config/types';
import type { GameState, ResMap } from '../engine/state';
import { resMap } from '../engine/state';
import { milestoneMult } from './cost';
import { Decimal } from './decimal';
import type { Modifiers } from './modifiers';

export interface TierFlow {
  tier: ResourceId;
  /** Output/s at full efficiency. */
  out: Decimal;
  /** Input/s needed at full efficiency (0 for producers). */
  need: Decimal;
  /** Output/s per building at full efficiency. */
  perBuilding: Record<string, Decimal>;
  active: boolean;
}

export interface Rates {
  prod: ResMap;
  cons: ResMap;
  /** Converter efficiency per tier (1 = fully supplied). */
  eff: Record<ResourceId, number>;
  flows: TierFlow[];
}

export function isTierAllowed(tier: ResourceId, mods: Pick<Modifiers, 'rules'>): boolean {
  const max = mods.rules.maxTier;
  return !max || RESOURCES[tier].tier <= RESOURCES[max].tier;
}

/** Output/s of one building type at full efficiency. */
export function buildingOutput(def: BuildingDef, count: number, mods: Modifiers, throttle = 1): Decimal {
  if (count <= 0) return new Decimal(0);
  const f =
    def.rate *
    milestoneMult(count) *
    mods.speed[def.tier] *
    throttle *
    (mods.building[def.id] ?? 1) *
    mods.yield[def.tier] *
    mods.global;
  return new Decimal(count).mul(f);
}

/** Input/s needed by one converter type at full efficiency. */
export function buildingInput(def: BuildingDef, count: number, mods: Modifiers, throttle = 1): Decimal {
  if (count <= 0 || !def.input) return new Decimal(0);
  const f =
    def.rate * milestoneMult(count) * mods.speed[def.tier] * throttle * def.ratio * mods.ratio[def.tier];
  return new Decimal(count).mul(f);
}

export function computeFlows(s: GameState, mods: Modifiers, mult = 1): TierFlow[] {
  return RESOURCE_IDS.map((tier) => {
    const active = isTierAllowed(tier, mods);
    const throttle = tier === 'ore' ? 1 : s.throttle[tier];
    let out = new Decimal(0);
    let need = new Decimal(0);
    const perBuilding: Record<string, Decimal> = {};
    if (active) {
      for (const def of BUILDINGS_BY_TIER[tier]) {
        const n = s.buildings[def.id] ?? 0;
        if (n <= 0) continue;
        const o = buildingOutput(def, n, mods, throttle * mult);
        perBuilding[def.id] = o;
        out = out.add(o);
        if (def.input) need = need.add(o.mul(def.ratio * mods.ratio[def.tier]));
      }
    }
    return { tier, out, need, perBuilding, active };
  });
}

/**
 * Runs the resource chain for `dt` seconds. Tiers are processed in order so a converter can use what the
 * previous tier produced during the same step; when input is short, the converter runs at reduced
 * efficiency (the bottleneck).
 */
export function applyProduction(s: GameState, mods: Modifiers, dt: number, extraMult = 1): Rates {
  const flows = computeFlows(s, mods, extraMult);
  const prod = resMap();
  const cons = resMap();
  const eff = Object.fromEntries(RESOURCE_IDS.map((r) => [r, 1])) as Record<ResourceId, number>;

  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i];
    if (!flow.active || flow.out.lte(0)) continue;
    const tier = flow.tier;
    let e = 1;
    if (i > 0) {
      const input = RESOURCE_IDS[i - 1];
      const need = flow.need.mul(dt);
      const avail = s.resources[input];
      if (need.gt(0)) {
        e = need.lte(avail) ? 1 : Math.max(0, avail.div(need).toNumber());
        const used = e >= 1 ? need : avail;
        s.resources[input] = s.resources[input].sub(used).max(0);
        cons[input] = cons[input].add(used.div(dt));
      }
    }
    eff[tier] = e;
    const gain = flow.out.mul(dt * e);
    s.resources[tier] = s.resources[tier].add(gain);
    s.run.produced[tier] = s.run.produced[tier].add(gain);
    s.stats.produced[tier] = s.stats.produced[tier].add(gain);
    prod[tier] = gain.div(dt);
  }

  for (const p of PLANETS) {
    const lvl = s.planets[p.id];
    if (lvl > 0) {
      s.planetRes[p.id] = s.planetRes[p.id].add(p.baseProd * lvl * mods.planet * dt);
    }
  }
  return { prod, cons, eff, flows };
}

/** Value of one tap before crit/combo. */
/**
 * Value of one tap before crit/combo: a flat part scaled by tap multipliers, plus a share of the ore
 * production (tapPct) that is not multiplied again, so tapping cannot feed back into itself.
 */
export function tapBaseValue(mods: Modifiers, oreRate: Decimal): Decimal {
  return oreRate.mul(mods.tapPct).add(BALANCE.tap.base * Math.max(1, mods.global) * mods.tap);
}

export function comboMultiplier(count: number, comboMax: number): number {
  return Math.min(comboMax, 1 + count * BALANCE.tap.comboStep);
}

/** Seconds of production equivalent for rewards: sum over tiers of rate * seconds. */
export function productionOver(rates: Rates, seconds: number): ResMap {
  const out = resMap();
  for (const r of RESOURCE_IDS) out[r] = rates.prod[r].sub(rates.cons[r]).max(0).mul(seconds);
  return out;
}
