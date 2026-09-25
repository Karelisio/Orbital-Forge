import { BUILDINGS_BY_ID, BUILDINGS_BY_TIER, type BuildingDef } from '../config/buildings';
import { RESOURCES } from '../config/resources';
import { TIER_BALANCE } from '../config/balance';
import { RESOURCE_IDS, type ResourceId } from '../config/types';
import { bulkCost, milestoneCount, resolveQuantity } from '../economy/cost';
import type { Modifiers } from '../economy/modifiers';
import { isTierAllowed } from '../economy/production';
import { emit, type StepContext } from '../engine/events';
import type { BuyAmount, GameState } from '../engine/state';

/** A tier is revealed once its first building is almost affordable, or once anything was built there. */
export function tierVisible(s: GameState, tier: ResourceId): boolean {
  if (tier === 'ore') return true;
  const i = RESOURCES[tier].tier;
  const input = RESOURCE_IDS[i - 1];
  if (BUILDINGS_BY_TIER[tier].some((b) => s.buildings[b.id] > 0)) return true;
  return s.stats.produced[input].gte(TIER_BALANCE[tier].baseCost * 0.5);
}

/** Building j is shown when building j-1 is owned (plus the first of each visible tier). */
export function buildingVisible(s: GameState, def: BuildingDef): boolean {
  if (!tierVisible(s, def.tier)) return false;
  if (def.index === 0 || s.buildings[def.id] > 0) return true;
  return (s.buildings[`${def.tier}_${def.index - 1}`] ?? 0) > 0;
}

export interface BuyQuote {
  qty: number;
  cost: ReturnType<typeof bulkCost>;
  affordable: boolean;
}

export function quoteBuilding(s: GameState, mods: Modifiers, id: string, mode: BuyAmount): BuyQuote {
  const def = BUILDINGS_BY_ID[id];
  const owned = s.buildings[id] ?? 0;
  const budget = s.resources[def.costRes];
  const qty = resolveQuantity(def, owned, mode, budget, mods);
  const cost = bulkCost(def, owned, qty, mods.cost[def.tier]);
  return { qty, cost, affordable: qty > 0 && cost.lte(budget) && isTierAllowed(def.tier, mods) };
}

export function buyBuilding(
  s: GameState,
  mods: Modifiers,
  id: string,
  mode: BuyAmount,
  ctx?: StepContext,
): number {
  const def = BUILDINGS_BY_ID[id];
  if (!def) return 0;
  const qty = resolveQuantity(def, s.buildings[id] ?? 0, mode, s.resources[def.costRes], mods);
  return buyBuildingQty(s, mods, id, qty, ctx);
}

/** Buys exactly `qty` units if affordable. Returns the quantity bought (0 or qty). */
export function buyBuildingQty(
  s: GameState,
  mods: Modifiers,
  id: string,
  qty: number,
  ctx?: StepContext,
): number {
  const def = BUILDINGS_BY_ID[id];
  if (!def || qty <= 0 || !isTierAllowed(def.tier, mods)) return 0;
  const owned = s.buildings[id] ?? 0;
  const cap = mods.rules.maxBuildings ?? Infinity;
  if (owned + qty > cap) return 0;
  const budget = s.resources[def.costRes];
  const cost = bulkCost(def, owned, qty, mods.cost[def.tier]);
  if (cost.gt(budget)) return 0;
  s.resources[def.costRes] = budget.sub(cost).max(0);
  const before = milestoneCount(owned);
  s.buildings[id] = owned + qty;
  s.stats.buildingsBought += qty;
  s.run.sinceLastPurchase = 0;
  if (milestoneCount(owned + qty) > before)
    emit(ctx, { type: 'milestone', building: id, count: owned + qty });
  return qty;
}
