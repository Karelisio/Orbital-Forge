import { BALANCE, TIER_BALANCE } from '../config/balance';
import { RESOURCE_IDS } from '../config/types';
import type { GameState } from '../engine/state';
import { Decimal } from './decimal';
import type { Modifiers } from './modifiers';

/** Run score, in ore equivalents. */
export function runScore(s: GameState): Decimal {
  let score = new Decimal(0);
  for (const r of RESOURCE_IDS) score = score.add(s.run.produced[r].mul(TIER_BALANCE[r].value));
  return score;
}

export function stardustForScore(score: Decimal, mult: number): Decimal {
  const p = BALANCE.prestige;
  if (score.lt(p.scoreDiv)) return new Decimal(0);
  return score.div(p.scoreDiv).pow(p.exponent).mul(mult).floor();
}

export function stardustGain(s: GameState, mods: Modifiers): Decimal {
  return stardustForScore(runScore(s), mods.stardust);
}

/** Score needed for the next whole stardust. */
export function scoreForStardust(amount: Decimal, mult: number): Decimal {
  const p = BALANCE.prestige;
  return amount
    .div(mult)
    .pow(1 / p.exponent)
    .mul(p.scoreDiv);
}

export function singularityGain(s: GameState, mods: Modifiers): Decimal {
  const p = BALANCE.prestige;
  const cycle = s.prestige.stardustCycle;
  if (cycle.lt(p.blackHoleMinStardust)) return new Decimal(0);
  return cycle.div(p.singularityDiv).pow(p.singularityExponent).mul(mods.singularity).floor();
}
