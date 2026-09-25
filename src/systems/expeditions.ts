import { DESTINATIONS_BY_ID } from '../config/expeditions';
import { RESOURCE_IDS } from '../config/types';
import { Decimal } from '../economy/decimal';
import type { Modifiers } from '../economy/modifiers';
import type { Rates } from '../economy/production';
import { emit, type StepContext } from '../engine/events';
import { nextRandom, rand } from '../engine/rng';
import { resMap, type GameState, type ResMap } from '../engine/state';
import { dropRandomArtifact } from './artifacts';
import { grantResources } from './rewards';

export interface ExpeditionLoot {
  resources: ResMap;
  artifact: string | null;
  stardust: Decimal;
}

export function syncShips(s: GameState, mods: Modifiers): void {
  const want = Math.max(1, mods.shipSlots);
  while (s.expeditions.ships.length < want) s.expeditions.ships.push(null);
  while (s.expeditions.ships.length > want && s.expeditions.ships[s.expeditions.ships.length - 1] === null) {
    s.expeditions.ships.pop();
  }
}

export function canLaunch(s: GameState, mods: Modifiers, index: number, dest: string): boolean {
  const d = DESTINATIONS_BY_ID[dest];
  return (
    !!d &&
    mods.shipSlots > index &&
    s.expeditions.ships[index] === null &&
    s.prestige.supernovas >= d.requiredSupernovas
  );
}

export function launchExpedition(s: GameState, mods: Modifiers, index: number, dest: string): boolean {
  if (!canLaunch(s, mods, index, dest)) return false;
  const d = DESTINATIONS_BY_ID[dest];
  const duration = d.duration / mods.expSpeed;
  const seed = Math.floor(rand(s) * 2147483647);
  s.expeditions.ships[index] = { dest, remaining: duration, duration, seed };
  return true;
}

export function tickExpeditions(s: GameState, dt: number, ctx?: StepContext): void {
  s.expeditions.ships.forEach((ship, i) => {
    if (ship && ship.remaining > 0) {
      ship.remaining -= dt;
      if (ship.remaining <= 0) {
        ship.remaining = 0;
        emit(ctx, { type: 'expeditionDone', index: i });
      }
    }
  });
}

/** Collects a finished expedition. Loot is derived from the ship's seed and the current production. */
export function claimExpedition(
  s: GameState,
  mods: Modifiers,
  rates: Rates,
  index: number,
  ctx?: StepContext,
): ExpeditionLoot | null {
  const ship = s.expeditions.ships[index];
  if (!ship || ship.remaining > 0) return null;
  const d = DESTINATIONS_BY_ID[ship.dest];
  const rng = { seed: ship.seed };
  const roll = () => {
    const [v, next] = nextRandom(rng.seed);
    rng.seed = next;
    return v;
  };
  const unlocked = RESOURCE_IDS.filter((r) => rates.prod[r].gt(0));
  const loot: ExpeditionLoot = { resources: resMap(), artifact: null, stardust: new Decimal(0) };
  const pool = unlocked.length ? unlocked : (['ore'] as const);
  const rolls = 2;
  for (let i = 0; i < rolls; i++) {
    const r = pool[Math.floor(roll() * pool.length)];
    const net = rates.prod[r].sub(rates.cons[r]).max(rates.prod[r].mul(0.1));
    const amount = net.mul(d.lootMinutes * 60 * mods.expLoot * (0.6 + roll() * 0.8)).div(rolls);
    loot.resources[r] = loot.resources[r].add(amount.max(d.lootMinutes));
  }
  grantResources(s, loot.resources);
  if (mods.unlocks.artifacts && roll() < d.artifactChance * (1 + mods.artifactLuck)) {
    loot.artifact = dropRandomArtifact(s, mods, ctx);
  }
  if (s.prestige.supernovas > 0 && roll() < d.stardustChance) {
    loot.stardust = s.prestige.stardustTotal.mul(0.02).ceil().max(1);
    s.prestige.stardust = s.prestige.stardust.add(loot.stardust);
    s.prestige.stardustTotal = s.prestige.stardustTotal.add(loot.stardust);
    s.prestige.stardustCycle = s.prestige.stardustCycle.add(loot.stardust);
  }
  s.expeditions.ships[index] = null;
  s.stats.expeditionsDone++;
  return loot;
}
