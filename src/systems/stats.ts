import { BALANCE } from '../config/balance';
import { RESOURCE_IDS } from '../config/types';
import { log10 } from '../economy/decimal';
import type { Rates } from '../economy/production';
import type { GameState, HistorySample } from '../engine/state';

export function sampleStats(s: GameState, rates: Rates, dt: number): void {
  s.stats.sampleTimer += dt;
  if (s.stats.sampleTimer < BALANCE.stats.sampleEvery) return;
  s.stats.sampleTimer = 0;
  const sample: HistorySample = {
    t: Math.round(s.stats.playTime),
    rates: RESOURCE_IDS.map((r) => Math.round(log10(rates.prod[r].sub(rates.cons[r]).max(0)) * 100) / 100),
    stardust: Math.round(log10(s.prestige.stardustTotal) * 100) / 100,
  };
  s.stats.history.push(sample);
  if (s.stats.history.length > BALANCE.stats.maxSamples) {
    // Keep a long span: halve resolution of the older half.
    const h = s.stats.history;
    const half = Math.floor(h.length / 2);
    const merged: HistorySample[] = [];
    for (let i = 0; i < half; i += 2) merged.push(h[i]);
    s.stats.history = merged.concat(h.slice(half));
  }
}
