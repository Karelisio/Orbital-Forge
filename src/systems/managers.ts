import { BALANCE } from '../config/balance';
import { BUILDINGS_BY_TIER, type BuildingDef } from '../config/buildings';
import { UPGRADES } from '../config/upgrades';
import { TIER_BALANCE } from '../config/balance';
import { RESOURCE_IDS, type ResourceId } from '../config/types';
import { unitCost } from '../economy/cost';
import type { Modifiers } from '../economy/modifiers';
import { buildingOutput, isTierAllowed } from '../economy/production';
import type { StepContext } from '../engine/events';
import type { GameState } from '../engine/state';
import { buildingVisible, buyBuildingQty } from './buildings';
import { buyUpgrade, canBuyUpgrade } from './upgrades';

export function managerUnlocked(tier: ResourceId, mods: Modifiers): boolean {
  const i = RESOURCE_IDS.indexOf(tier);
  if (i <= 1) return mods.unlocks.managers1;
  if (i <= 3) return mods.unlocks.managers2;
  return mods.unlocks.managers3;
}

/** Output value gained per unit of cost when buying one more unit (higher is better). */
export function roiScore(s: GameState, mods: Modifiers, def: BuildingDef): number {
  const n = s.buildings[def.id] ?? 0;
  const throttle = def.tier === 'ore' ? 1 : s.throttle[def.tier];
  const gain = buildingOutput(def, n + 1, mods, throttle).sub(buildingOutput(def, n, mods, throttle));
  const value = gain.mul(TIER_BALANCE[def.tier].value);
  const cost = unitCost(def, n, mods.cost[def.tier]).mul(TIER_BALANCE[def.costRes].value);
  return value.div(cost.max(1e-9)).toNumber();
}

export function pickManagerTarget(s: GameState, mods: Modifiers, tier: ResourceId): BuildingDef | null {
  const cfg = s.managers[tier];
  const list = BUILDINGS_BY_TIER[tier].filter((b) => buildingVisible(s, b));
  if (!list.length) return null;
  if (cfg.mode === 'target') return list.find((b) => b.id === cfg.target) ?? null;
  if (cfg.mode === 'cheapest') {
    return list.reduce((best, b) =>
      unitCost(b, s.buildings[b.id], mods.cost[tier]).lt(
        unitCost(best, s.buildings[best.id], mods.cost[tier]),
      )
        ? b
        : best,
    );
  }
  return list.reduce((best, b) => (roiScore(s, mods, b) > roiScore(s, mods, best) ? b : best));
}

/** Runs one automation pass: each enabled manager buys what its policy selects within its budget. */
export function runManagers(s: GameState, mods: Modifiers, ctx?: StepContext): number {
  let bought = 0;
  for (const tier of RESOURCE_IDS) {
    const cfg = s.managers[tier];
    if (!cfg.enabled || !managerUnlocked(tier, mods) || !isTierAllowed(tier, mods)) continue;
    const currency = BUILDINGS_BY_TIER[tier][0].costRes;
    const floor = s.resources[currency].mul(cfg.reserve);
    for (let i = 0; i < 25; i++) {
      const def = pickManagerTarget(s, mods, tier);
      if (!def) break;
      const cost = unitCost(def, s.buildings[def.id], mods.cost[tier]);
      if (s.resources[currency].sub(cost).lt(floor)) break;
      if (!buyBuildingQty(s, mods, def.id, 1, ctx)) break;
      bought++;
    }
  }
  if (s.autoUpgrades && mods.unlocks.autoUpgrades && !mods.rules.noUpgrades) {
    for (const u of UPGRADES) {
      if (s.upgrades[u.id] || !canBuyUpgrade(s, mods, u)) continue;
      if (s.resources[u.cost.res].mul(0.5).gte(u.cost.amount)) {
        buyUpgrade(s, mods, u.id);
        bought++;
      }
    }
  }
  return bought;
}

export function managerInterval(mods: Modifiers): number {
  return BALANCE.managers.interval / Math.max(0.1, mods.managerSpeed);
}
