import { BOOSTS_BY_ID, type BoostId } from '../config/boosts';
import type { Modifiers } from '../economy/modifiers';
import type { Rates } from '../economy/production';
import type { GameState, ResMap } from '../engine/state';
import { grantProduction } from './rewards';

export function canActivateBoost(s: GameState, id: BoostId): boolean {
  const b = s.boosts[id];
  return b.active <= 0 && b.cooldown <= 0;
}

export function activateBoost(s: GameState, mods: Modifiers, rates: Rates, id: BoostId): ResMap | boolean {
  if (!canActivateBoost(s, id)) return false;
  const def = BOOSTS_BY_ID[id];
  s.boosts[id].cooldown = def.cooldown * mods.boostCooldown;
  if (id === 'warp') return grantProduction(s, rates, def.value);
  s.boosts[id].active = def.duration * mods.boostDuration;
  return true;
}

/** Spends a boost token to clear a cooldown. */
export function spendBoostToken(s: GameState, id: BoostId): boolean {
  if (s.boostTokens <= 0 || s.boosts[id].cooldown <= 0) return false;
  s.boostTokens--;
  s.boosts[id].cooldown = 0;
  return true;
}

export function tickBoosts(s: GameState, dt: number): void {
  for (const id of Object.keys(s.boosts) as BoostId[]) {
    const b = s.boosts[id];
    if (b.active > 0) b.active = Math.max(0, b.active - dt);
    if (b.cooldown > 0) b.cooldown = Math.max(0, b.cooldown - dt);
  }
}
