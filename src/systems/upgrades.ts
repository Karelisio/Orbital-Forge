import { UPGRADES, UPGRADES_BY_ID, type UpgradeDef } from '../config/upgrades';
import { Decimal } from '../economy/decimal';
import type { Modifiers } from '../economy/modifiers';
import { isTierAllowed } from '../economy/production';
import type { GameState } from '../engine/state';

export function upgradeReqMet(s: GameState, def: UpgradeDef): boolean {
  const r = def.req;
  switch (r.type) {
    case 'none':
      return true;
    case 'building':
      return (s.buildings[r.id] ?? 0) >= r.count;
    case 'produced':
      return s.stats.produced[r.res].gte(r.amount);
  }
}

export function upgradeAvailable(s: GameState, def: UpgradeDef): boolean {
  return !s.upgrades[def.id] && upgradeReqMet(s, def);
}

export function canBuyUpgrade(s: GameState, mods: Modifiers, def: UpgradeDef): boolean {
  if (mods.rules.noUpgrades || s.upgrades[def.id]) return false;
  if (!isTierAllowed(def.cost.res, mods)) return false;
  return upgradeReqMet(s, def) && s.resources[def.cost.res].gte(def.cost.amount);
}

export function buyUpgrade(s: GameState, mods: Modifiers, id: string): boolean {
  const def = UPGRADES_BY_ID[id];
  if (!def || !canBuyUpgrade(s, mods, def)) return false;
  s.resources[def.cost.res] = s.resources[def.cost.res].sub(def.cost.amount).max(0);
  s.upgrades[id] = true;
  s.stats.upgradesBought++;
  s.run.sinceLastPurchase = 0;
  return true;
}

/** Available upgrades sorted by cost (value-weighted), cheapest first. */
export function availableUpgrades(s: GameState): UpgradeDef[] {
  return UPGRADES.filter((u) => upgradeAvailable(s, u)).sort((a, b) =>
    new Decimal(a.cost.amount)
      .div(s.resources[a.cost.res].add(1))
      .cmp(new Decimal(b.cost.amount).div(s.resources[b.cost.res].add(1))),
  );
}
