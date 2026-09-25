import {
  MISSIONS,
  MISSIONS_BY_ID,
  STREAK_REWARDS,
  type MissionPeriod,
  type MissionReward,
} from '../config/missions';
import type { Modifiers } from '../economy/modifiers';
import type { Rates } from '../economy/production';
import { rand } from '../engine/rng';
import type { GameState, MissionState } from '../engine/state';
import { dropRandomArtifact } from './artifacts';
import { counterValue } from './counters';
import { grantProduction } from './rewards';

export const MISSIONS_PER_PERIOD = 3;

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO-like week key: year + week number, weeks starting on Monday. */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `W${dayKey(monday.getTime())}`;
}

function pick(s: GameState, period: MissionPeriod): MissionState[] {
  const pool = MISSIONS.filter((m) => m.period === period).slice();
  const out: MissionState[] = [];
  while (out.length < MISSIONS_PER_PERIOD && pool.length) {
    const i = Math.floor(rand(s) * pool.length);
    const def = pool.splice(i, 1)[0];
    out.push({ id: def.id, baseline: counterValue(s, def.stat), claimed: false });
  }
  return out;
}

/** Rolls new missions on day/week change and updates the login streak. */
export function refreshMissions(s: GameState, now: number): boolean {
  const day = dayKey(now);
  const week = weekKey(now);
  let changed = false;
  if (s.missions.day !== day) {
    s.missions.day = day;
    s.missions.daily = pick(s, 'daily');
    const yesterday = dayKey(now - 86400000);
    s.missions.streak = s.missions.lastLoginDay === yesterday ? s.missions.streak + 1 : 1;
    s.missions.lastLoginDay = day;
    s.missions.streakClaimed = false;
    s.stats.maxStreak = Math.max(s.stats.maxStreak, s.missions.streak);
    changed = true;
  }
  if (s.missions.week !== week) {
    s.missions.week = week;
    s.missions.weekly = pick(s, 'weekly');
    changed = true;
  }
  return changed;
}

export function missionProgress(s: GameState, m: MissionState): number {
  const def = MISSIONS_BY_ID[m.id];
  return Math.max(0, counterValue(s, def.stat) - m.baseline);
}

export function missionComplete(s: GameState, m: MissionState): boolean {
  return missionProgress(s, m) >= MISSIONS_BY_ID[m.id].target;
}

export function applyReward(s: GameState, mods: Modifiers, rates: Rates, reward: MissionReward): void {
  switch (reward.type) {
    case 'warp':
      grantProduction(s, rates, reward.minutes * 60);
      break;
    case 'token':
      s.boostTokens += reward.amount;
      break;
    case 'artifact':
      dropRandomArtifact(s, mods);
      break;
    case 'stardust': {
      const amount = s.prestige.stardustTotal.mul(reward.amount).ceil().max(1);
      s.prestige.stardust = s.prestige.stardust.add(amount);
      s.prestige.stardustTotal = s.prestige.stardustTotal.add(amount);
      s.prestige.stardustCycle = s.prestige.stardustCycle.add(amount);
      break;
    }
  }
}

export function claimMission(
  s: GameState,
  mods: Modifiers,
  rates: Rates,
  period: MissionPeriod,
  index: number,
): boolean {
  const list = period === 'daily' ? s.missions.daily : s.missions.weekly;
  const m = list[index];
  if (!m || m.claimed || !missionComplete(s, m)) return false;
  m.claimed = true;
  s.stats.missionsDone++;
  applyReward(s, mods, rates, MISSIONS_BY_ID[m.id].reward);
  return true;
}

export function streakReward(s: GameState): MissionReward {
  return STREAK_REWARDS[(Math.max(1, s.missions.streak) - 1) % STREAK_REWARDS.length];
}

export function claimStreak(s: GameState, mods: Modifiers, rates: Rates): boolean {
  if (s.missions.streakClaimed) return false;
  s.missions.streakClaimed = true;
  applyReward(s, mods, rates, streakReward(s));
  return true;
}
