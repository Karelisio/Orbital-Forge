import { computeModifiers, type Modifiers } from '../economy/modifiers';
import { applyProduction, type Rates } from '../economy/production';
import { checkAchievements } from '../systems/achievements';
import { tickBoosts } from '../systems/boosts';
import { tickEvents } from '../systems/events';
import { syncShips, tickExpeditions } from '../systems/expeditions';
import { managerInterval, runManagers } from '../systems/managers';
import { checkAutoSupernova, checkChallenge } from '../systems/prestige';
import { tickResearch } from '../systems/research';
import { sampleStats } from '../systems/stats';
import { autoTap, tickCombo } from '../systems/tap';
import type { StepContext } from './events';
import type { GameState } from './state';

export interface StepResult {
  rates: Rates;
  mods: Modifiers;
}

/**
 * Advances the simulation by `dt` game seconds. Mutates `s` in place (works on plain objects and Immer drafts).
 * Pure with respect to the outside world: no wall clock, no I/O; randomness comes from `s.seed`.
 */
export function step(s: GameState, dt: number, ctx: StepContext = {}, now = s.lastSeen): StepResult {
  const mods = computeModifiers(s);
  const offlineMult = ctx.offline ? Math.min(1, mods.offlineEff) : 1;
  const rates = applyProduction(s, mods, dt, offlineMult);

  autoTap(s, mods, rates.flows[0].out, dt);
  tickCombo(s, dt);

  s.run.time += dt;
  s.stats.playTime += dt;
  s.run.sinceLastPurchase += dt;
  s.run.longestNoPurchase = Math.max(s.run.longestNoPurchase, s.run.sinceLastPurchase);

  tickResearch(s, mods, dt, ctx);
  syncShips(s, mods);
  tickExpeditions(s, dt, ctx);
  tickBoosts(s, dt);
  tickEvents(s, mods, rates, dt, ctx);

  s.timers.managers += dt;
  const interval = managerInterval(mods);
  if (s.timers.managers >= interval) {
    s.timers.managers = 0;
    runManagers(s, mods, ctx);
  }

  s.timers.achievements += dt;
  if (s.timers.achievements >= 1) {
    s.timers.achievements = 0;
    checkAchievements(s, ctx);
    checkChallenge(s, ctx);
    checkAutoSupernova(s, mods, now, ctx);
  }

  sampleStats(s, rates, dt);
  return { rates, mods };
}
