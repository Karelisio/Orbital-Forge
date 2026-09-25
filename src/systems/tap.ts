import { BALANCE } from '../config/balance';
import { Decimal } from '../economy/decimal';
import type { Modifiers } from '../economy/modifiers';
import { comboMultiplier, tapBaseValue } from '../economy/production';
import type { StepContext } from '../engine/events';
import { rand } from '../engine/rng';
import type { GameState } from '../engine/state';
import { dropRandomArtifact } from './artifacts';

export interface TapResult {
  value: Decimal;
  crit: boolean;
  combo: number;
  artifact: string | null;
}

function addOre(s: GameState, mods: Modifiers, v: Decimal): void {
  s.resources.ore = s.resources.ore.add(v);
  s.run.produced.ore = s.run.produced.ore.add(v);
  s.stats.produced.ore = s.stats.produced.ore.add(v);
  s.stats.tapProduced = s.stats.tapProduced.add(v);
  if (mods.unlocks.tapEcho) {
    const echo = v.div(200);
    s.resources.metal = s.resources.metal.add(echo);
    s.run.produced.metal = s.run.produced.metal.add(echo);
    s.stats.produced.metal = s.stats.produced.metal.add(echo);
  }
}

export function tap(s: GameState, mods: Modifiers, oreRate: Decimal, ctx?: StepContext): TapResult | null {
  if (mods.rules.noTap) return null;
  s.combo.count++;
  s.combo.timer = BALANCE.tap.comboWindow;
  s.stats.maxCombo = Math.max(s.stats.maxCombo, s.combo.count);
  const combo = comboMultiplier(s.combo.count, mods.comboMax);
  const crit = rand(s) < Math.min(1, mods.critChance);
  let value = tapBaseValue(mods, oreRate).mul(combo);
  if (crit) {
    value = value.mul(mods.critMult);
    s.stats.crits++;
  }
  s.stats.taps++;
  addOre(s, mods, value);
  let artifact: string | null = null;
  if (mods.unlocks.artifacts && rand(s) < (1 / 4000) * (1 + mods.artifactLuck)) {
    artifact = dropRandomArtifact(s, mods, ctx);
  }
  return { value, crit, combo, artifact };
}

/** Automatic taps: expected value, no combo, no drops. */
export function autoTap(s: GameState, mods: Modifiers, oreRate: Decimal, dt: number): void {
  if (mods.autoTap <= 0 || mods.rules.noTap) return;
  const expectedCrit = 1 + Math.min(1, mods.critChance) * (mods.critMult - 1);
  addOre(s, mods, tapBaseValue(mods, oreRate).mul(mods.autoTap * dt * expectedCrit));
}

export function tickCombo(s: GameState, dt: number): void {
  if (s.combo.timer > 0) {
    s.combo.timer -= dt;
    if (s.combo.timer <= 0) {
      s.combo.timer = 0;
      s.combo.count = 0;
    }
  }
}
