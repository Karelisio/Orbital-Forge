import { RESOURCE_IDS } from '../config/types';
import { Decimal } from '../economy/decimal';
import { productionOver, type Rates } from '../economy/production';
import type { GameState, ResMap } from '../engine/state';

export function grantResources(s: GameState, gains: ResMap): void {
  for (const r of RESOURCE_IDS) {
    const g = gains[r];
    if (g.lte(0)) continue;
    s.resources[r] = s.resources[r].add(g);
    s.run.produced[r] = s.run.produced[r].add(g);
    s.stats.produced[r] = s.stats.produced[r].add(g);
  }
}

/** Grants `seconds` of current net production (at least the tap base for ore). */
export function grantProduction(s: GameState, rates: Rates, seconds: number, mult = 1): ResMap {
  const gains = productionOver(rates, seconds * mult);
  if (gains.ore.lt(seconds)) gains.ore = new Decimal(seconds);
  grantResources(s, gains);
  return gains;
}
