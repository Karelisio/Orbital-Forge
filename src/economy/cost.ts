import { BALANCE } from '../config/balance';
import type { BuildingDef } from '../config/buildings';
import type { BuyAmount } from '../engine/state';
import { Decimal } from './decimal';
import type { Modifiers } from './modifiers';

/** Cost of the next unit when `owned` units are already owned. */
export function unitCost(def: BuildingDef, owned: number, costMult = 1): Decimal {
  return new Decimal(def.baseCost * costMult).mul(Decimal.pow(def.growth, owned));
}

/** Total cost of buying `qty` units starting from `owned` (geometric series). */
export function bulkCost(def: BuildingDef, owned: number, qty: number, costMult = 1): Decimal {
  if (qty <= 0) return new Decimal(0);
  const r = def.growth;
  const first = unitCost(def, owned, costMult);
  return first.mul(Decimal.pow(r, qty).sub(1)).div(r - 1);
}

/** Largest quantity whose total cost is <= budget. */
export function maxAffordable(def: BuildingDef, owned: number, budget: Decimal, costMult = 1): number {
  const first = unitCost(def, owned, costMult);
  if (budget.lt(first)) return 0;
  const r = def.growth;
  // qty = floor(log_r(1 + budget * (r - 1) / first))
  const x = budget
    .mul(r - 1)
    .div(first)
    .add(1);
  let qty = Math.floor(x.log10() / Math.log10(r));
  // Guard against floating point drift.
  while (qty > 0 && bulkCost(def, owned, qty, costMult).gt(budget)) qty--;
  while (bulkCost(def, owned, qty + 1, costMult).lte(budget)) qty++;
  return qty;
}

export function milestoneCount(owned: number): number {
  let n = 0;
  for (const m of BALANCE.milestones) if (owned >= m) n++;
  return n;
}

export function milestoneMult(owned: number): number {
  return Math.pow(BALANCE.milestoneMult, milestoneCount(owned));
}

/** Next milestone threshold strictly above `owned`, or null when all are reached. */
export function nextMilestone(owned: number): number | null {
  for (const m of BALANCE.milestones) if (owned < m) return m;
  return null;
}

/**
 * Resolves the quantity to purchase for a buy mode.
 * For 'max' returns at least 1 (so the UI can display the price of one unit).
 */
export function resolveQuantity(
  def: BuildingDef,
  owned: number,
  mode: BuyAmount,
  budget: Decimal,
  mods: Pick<Modifiers, 'cost' | 'rules'>,
): number {
  const cap = mods.rules.maxBuildings ?? Infinity;
  const room = Math.max(0, cap - owned);
  let q: number;
  if (mode === 'max') q = Math.max(1, maxAffordable(def, owned, budget, mods.cost[def.tier]));
  else if (mode === 'next') q = (nextMilestone(owned) ?? owned + 1) - owned;
  else q = mode;
  return Math.min(q, room);
}
