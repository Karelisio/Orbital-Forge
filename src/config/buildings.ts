import { BALANCE, TIER_BALANCE } from './balance';
import { RESOURCE_IDS, type ResourceId } from './types';

export interface BuildingDef {
  id: string;
  tier: ResourceId;
  index: number;
  /** Resource spent to buy it: ore for tier 1, previous tier otherwise. */
  costRes: ResourceId;
  baseCost: number;
  growth: number;
  /** Output/s per unit (converters: output throughput before yield). */
  rate: number;
  /** Input per output unit (0 for producers). */
  ratio: number;
  /** Input resource for converters. */
  input: ResourceId | null;
}

function build(): BuildingDef[] {
  const out: BuildingDef[] = [];
  RESOURCE_IDS.forEach((tier, ti) => {
    const b = TIER_BALANCE[tier];
    const input = ti === 0 ? null : RESOURCE_IDS[ti - 1];
    for (let j = 0; j < BALANCE.buildingsPerTier; j++) {
      out.push({
        id: `${tier}_${j}`,
        tier,
        index: j,
        costRes: input ?? 'ore',
        baseCost: b.baseCost * Math.pow(b.costStep, j),
        growth: Math.round((b.growth + b.growthStep * j) * 10000) / 10000,
        rate: b.baseRate * Math.pow(b.rateStep, j),
        ratio: b.ratio,
        input,
      });
    }
  });
  return out;
}

export const BUILDINGS: readonly BuildingDef[] = build();
export const BUILDINGS_BY_ID: Readonly<Record<string, BuildingDef>> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);
export const BUILDINGS_BY_TIER: Readonly<Record<ResourceId, readonly BuildingDef[]>> = Object.fromEntries(
  RESOURCE_IDS.map((t) => [t, BUILDINGS.filter((b) => b.tier === t)]),
) as Record<ResourceId, BuildingDef[]>;
