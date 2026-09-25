import { RESEARCH_BY_ID, type ResearchDef } from '../config/research';
import type { Modifiers } from '../economy/modifiers';
import { emit, type StepContext } from '../engine/events';
import type { GameState } from '../engine/state';

export const MAX_QUEUE = 3;

export type ResearchStatus = 'done' | 'active' | 'queued' | 'available' | 'locked';

export function researchStatus(s: GameState, id: string): ResearchStatus {
  if (s.research.done[id]) return 'done';
  if (s.research.active.some((a) => a.id === id)) return 'active';
  if (s.research.queue.includes(id)) return 'queued';
  const def = RESEARCH_BY_ID[id];
  return def.prereq.every((p) => s.research.done[p]) ? 'available' : 'locked';
}

export function researchDuration(def: ResearchDef, mods: Modifiers): number {
  return def.duration / mods.research;
}

export function canStartResearch(s: GameState, mods: Modifiers, id: string): boolean {
  const def = RESEARCH_BY_ID[id];
  if (!def || researchStatus(s, id) !== 'available') return false;
  const hasSlot = s.research.active.length < mods.researchSlots || s.research.queue.length < MAX_QUEUE;
  return hasSlot && s.resources[def.cost.res].gte(def.cost.amount);
}

export function startResearch(s: GameState, mods: Modifiers, id: string): boolean {
  if (!canStartResearch(s, mods, id)) return false;
  const def = RESEARCH_BY_ID[id];
  s.resources[def.cost.res] = s.resources[def.cost.res].sub(def.cost.amount).max(0);
  if (s.research.active.length < mods.researchSlots) s.research.active.push({ id, remaining: def.duration });
  else s.research.queue.push(id);
  s.run.sinceLastPurchase = 0;
  return true;
}

export function cancelQueued(s: GameState, id: string): void {
  const def = RESEARCH_BY_ID[id];
  if (!s.research.queue.includes(id)) return;
  s.research.queue = s.research.queue.filter((q) => q !== id);
  s.resources[def.cost.res] = s.resources[def.cost.res].add(def.cost.amount);
}

export function tickResearch(s: GameState, mods: Modifiers, dt: number, ctx?: StepContext): void {
  const progress = dt * mods.research;
  let changed = false;
  for (const slot of s.research.active) {
    slot.remaining -= progress;
    if (slot.remaining <= 0) {
      s.research.done[slot.id] = true;
      s.stats.researchDone++;
      changed = true;
      emit(ctx, { type: 'researchDone', id: slot.id });
    }
  }
  if (changed) s.research.active = s.research.active.filter((a) => a.remaining > 0);
  while (s.research.active.length < mods.researchSlots && s.research.queue.length > 0) {
    const id = s.research.queue.shift()!;
    s.research.active.push({ id, remaining: RESEARCH_BY_ID[id].duration });
  }
}
