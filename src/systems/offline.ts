import { BALANCE } from '../config/balance';
import { RESOURCE_IDS } from '../config/types';
import { Decimal } from '../economy/decimal';
import { computeModifiers } from '../economy/modifiers';
import type { GameEvent } from '../engine/events';
import { resMap, type GameState, type ResMap } from '../engine/state';
import { step, type StepResult } from '../engine/step';

export interface OfflineSummary {
  elapsed: number;
  simulated: number;
  capped: boolean;
  gains: ResMap;
  research: string[];
  expeditions: number;
  achievements: string[];
  artifacts: string[];
}

/**
 * Simulates `seconds` of absence with the real engine (full resource chain, timers, managers), using
 * adaptive step sizes: fine steps first, then coarser ones so the whole run stays under the iteration budget.
 */
export function simulateOffline(s: GameState, seconds: number): OfflineSummary & { last: StepResult | null } {
  const mods = computeModifiers(s);
  const cap = mods.offlineCap * 3600;
  const simulated = Math.max(0, Math.min(seconds, cap));
  const before = RESOURCE_IDS.map((r) => s.resources[r]);
  const events: GameEvent[] = [];
  const ctx = { offline: true, emit: (e: GameEvent) => events.push(e) };

  const budget = BALANCE.offline.maxIterations;
  const fine = Math.min(simulated, 60);
  let done = 0;
  let last: StepResult | null = null;
  let iterations = 0;
  while (done < simulated - 1e-9 && iterations < budget + 100) {
    const remaining = simulated - done;
    const left = Math.max(1, budget - iterations);
    const dt = done < fine ? Math.min(1, remaining) : Math.min(remaining, Math.max(1, remaining / left));
    last = step(s, dt, ctx, s.lastSeen + done * 1000);
    done += dt;
    iterations++;
  }

  const gains = resMap();
  RESOURCE_IDS.forEach((r, i) => {
    gains[r] = Decimal.max(0, s.resources[r].sub(before[i]));
  });
  return {
    elapsed: seconds,
    simulated,
    capped: seconds > cap,
    gains,
    research: events.flatMap((e) => (e.type === 'researchDone' ? [e.id] : [])),
    expeditions: events.filter((e) => e.type === 'expeditionDone').length,
    achievements: events.flatMap((e) => (e.type === 'achievement' ? [e.id] : [])),
    artifacts: events.flatMap((e) => (e.type === 'artifact' ? [e.id] : [])),
    last,
  };
}
