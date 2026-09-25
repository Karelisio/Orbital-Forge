import {
  ARTIFACTS,
  ARTIFACTS_BY_ID,
  RARITY_WEIGHT,
  type ArtifactDef,
  type Rarity,
} from '../config/artifacts';
import { BALANCE } from '../config/balance';
import type { Modifiers } from '../economy/modifiers';
import { emit, type StepContext } from '../engine/events';
import { pickWeighted } from '../engine/rng';
import type { GameState } from '../engine/state';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Luck shifts weight toward higher rarities. */
export function rarityWeights(luck: number): Record<Rarity, number> {
  return {
    common: RARITY_WEIGHT.common,
    rare: RARITY_WEIGHT.rare * (1 + luck * 2),
    epic: RARITY_WEIGHT.epic * (1 + luck * 4),
    legendary: RARITY_WEIGHT.legendary * (1 + luck * 8),
  };
}

export function rollArtifact(s: GameState, luck: number): ArtifactDef {
  const w = rarityWeights(luck);
  const rarity = pickWeighted(s, RARITIES, (r) => w[r]);
  const pool = ARTIFACTS.filter((a) => a.rarity === rarity);
  return pickWeighted(s, pool, () => 1);
}

export function grantArtifact(s: GameState, mods: Modifiers, id: string, ctx?: StepContext): number {
  const prev = s.artifacts.owned[id] ?? 0;
  const level = Math.min(BALANCE.artifacts.maxLevel, prev + 1);
  s.artifacts.owned[id] = level;
  s.stats.artifactsFound++;
  if (!s.artifacts.newIds.includes(id)) s.artifacts.newIds.push(id);
  if (prev === 0 && s.artifacts.equipped.length < mods.artifactSlots) s.artifacts.equipped.push(id);
  emit(ctx, { type: 'artifact', id, level });
  return level;
}

export function dropRandomArtifact(s: GameState, mods: Modifiers, ctx?: StepContext): string {
  const def = rollArtifact(s, mods.artifactLuck);
  grantArtifact(s, mods, def.id, ctx);
  return def.id;
}

export function equipArtifact(s: GameState, mods: Modifiers, id: string): boolean {
  if (!ARTIFACTS_BY_ID[id] || !s.artifacts.owned[id]) return false;
  if (s.artifacts.equipped.includes(id)) return true;
  if (s.artifacts.equipped.length >= mods.artifactSlots) return false;
  s.artifacts.equipped.push(id);
  return true;
}

export function unequipArtifact(s: GameState, id: string): void {
  s.artifacts.equipped = s.artifacts.equipped.filter((a) => a !== id);
}
