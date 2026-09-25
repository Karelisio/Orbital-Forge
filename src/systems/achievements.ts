import { ACHIEVEMENTS, type AchievementDef } from '../config/achievements';
import { BUILDINGS_BY_TIER } from '../config/buildings';
import { emit, type StepContext } from '../engine/events';
import type { GameState } from '../engine/state';
import { counterValue } from './counters';

export function achievementMet(s: GameState, def: AchievementDef): boolean {
  const c = def.cond;
  switch (c.type) {
    case 'produced':
      return s.stats.produced[c.res].gte(c.amount);
    case 'counter':
      return counterValue(s, c.stat) >= c.value;
    case 'tierAll':
      return BUILDINGS_BY_TIER[c.res].every((b) => (s.buildings[b.id] ?? 0) >= c.count);
  }
}

export function checkAchievements(s: GameState, ctx?: StepContext): number {
  let n = 0;
  for (const def of ACHIEVEMENTS) {
    if (s.achievements[def.id]) continue;
    if (achievementMet(s, def)) {
      s.achievements[def.id] = true;
      n++;
      emit(ctx, { type: 'achievement', id: def.id });
    }
  }
  return n;
}

export function achievementProgress(s: GameState, def: AchievementDef): number {
  const c = def.cond;
  switch (c.type) {
    case 'produced': {
      const v = s.stats.produced[c.res];
      if (v.lte(0)) return 0;
      return Math.min(1, v.log10() / Math.log10(c.amount));
    }
    case 'counter':
      return Math.min(1, counterValue(s, c.stat) / c.value);
    case 'tierAll': {
      const list = BUILDINGS_BY_TIER[c.res];
      return list.reduce((a, b) => a + Math.min(1, (s.buildings[b.id] ?? 0) / c.count), 0) / list.length;
    }
  }
}
