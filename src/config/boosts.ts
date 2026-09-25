export type BoostId = 'overdrive' | 'frenzy' | 'warp';

export interface BoostDef {
  id: BoostId;
  /** Active duration in seconds (0 = instant). */
  duration: number;
  cooldown: number;
  /** overdrive: global mult; frenzy: tap mult; warp: seconds of production. */
  value: number;
  autoTap?: number;
}

export const BOOSTS: readonly BoostDef[] = [
  { id: 'overdrive', duration: 30 * 60, cooldown: 2 * 3600, value: 2 },
  { id: 'frenzy', duration: 60, cooldown: 15 * 60, value: 5, autoTap: 10 },
  { id: 'warp', duration: 0, cooldown: 8 * 3600, value: 3600 },
];

export const BOOSTS_BY_ID: Readonly<Record<BoostId, BoostDef>> = Object.fromEntries(
  BOOSTS.map((b) => [b.id, b]),
) as Record<BoostId, BoostDef>;
