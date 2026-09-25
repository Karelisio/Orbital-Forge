import { BUILDINGS } from '../config/buildings';
import { CHALLENGES_BY_ID } from '../config/challenges';
import { SINGULARITY_BY_ID, singularityCost } from '../config/singularity';
import { TALENTS_BY_ID, talentCost } from '../config/talents';
import { PLANET_IDS, RESOURCE_IDS, type ResourceId } from '../config/types';
import { UPGRADES_BY_ID } from '../config/upgrades';
import { Decimal } from '../economy/decimal';
import { computeModifiers, type Modifiers } from '../economy/modifiers';
import { runScore, singularityGain, stardustGain } from '../economy/prestige';
import { emit, type StepContext } from '../engine/events';
import { planetResMap, resMap, type GameState } from '../engine/state';

/** Resets the current run (resources, buildings, upgrades, planets…). */
export function resetRun(s: GameState, mods: Modifiers): void {
  s.resources = resMap();
  const start = mods.startOre > 0 ? Decimal.pow(10, mods.startOre) : new Decimal(0);
  s.resources.ore = start;
  for (const b of BUILDINGS) s.buildings[b.id] = 0;
  const kept: Record<string, boolean> = {};
  if (mods.unlocks.keepUpgradesTap) {
    for (const id in s.upgrades) {
      const kind = UPGRADES_BY_ID[id]?.kind;
      if (kind === 'tap' || kind === 'crit' || kind === 'combo') kept[id] = true;
    }
  }
  s.upgrades = kept;
  if (!mods.unlocks.keepPlanets) {
    for (const p of PLANET_IDS) s.planets[p] = 0;
    s.planetRes = planetResMap();
  }
  for (const r of RESOURCE_IDS) s.throttle[r] = 1;
  s.run = { time: 0, produced: resMap(), sinceLastPurchase: 0, longestNoPurchase: 0 };
  s.combo = { count: 0, timer: 0 };
  s.events.frenzy = 0;
}

export function canSupernova(s: GameState, mods: Modifiers): boolean {
  return stardustGain(s, mods).gte(1);
}

export function doSupernova(s: GameState, mods: Modifiers, now: number, force = false): Decimal {
  const gain = stardustGain(s, mods);
  if (gain.lt(1) && !force) return new Decimal(0);
  s.prestige.stardust = s.prestige.stardust.add(gain);
  s.prestige.stardustCycle = s.prestige.stardustCycle.add(gain);
  s.prestige.stardustTotal = s.prestige.stardustTotal.add(gain);
  if (gain.gte(1)) s.prestige.supernovas++;
  if (s.run.time > 0) {
    s.prestige.bestStardustRate = Math.max(
      s.prestige.bestStardustRate,
      gain.toNumber() / (s.run.time / 3600),
    );
  }
  s.prestige.history.push({
    kind: 'supernova',
    at: now,
    duration: s.run.time,
    gain: gain.toString(),
    challenge: s.challenges.active,
  });
  if (s.prestige.history.length > 100) s.prestige.history.shift();
  s.challenges.active = null;
  resetRun(s, computeModifiers(s));
  return gain;
}

export function canBlackHole(s: GameState, mods: Modifiers): boolean {
  return singularityGain(s, mods).gte(1);
}

export function doBlackHole(s: GameState, mods: Modifiers, now: number): Decimal {
  const gain = singularityGain(s, mods);
  if (gain.lt(1)) return new Decimal(0);
  s.prestige.singularities = s.prestige.singularities.add(gain);
  s.prestige.singularitiesTotal = s.prestige.singularitiesTotal.add(gain);
  s.prestige.blackHoles++;
  s.prestige.history.push({
    kind: 'blackhole',
    at: now,
    duration: s.run.time,
    gain: gain.toString(),
    challenge: null,
  });
  s.prestige.stardust = new Decimal(0);
  s.prestige.stardustCycle = new Decimal(0);
  s.prestige.talents = {};
  if (!mods.unlocks.keepResearch) {
    s.research = { done: {}, active: [], queue: [] };
  }
  s.challenges.active = null;
  const after = computeModifiers(s);
  // Planets never survive a black hole.
  for (const p of PLANET_IDS) s.planets[p] = 0;
  s.planetRes = planetResMap();
  resetRun(s, after);
  return gain;
}

export function canBuyTalent(s: GameState, id: string): boolean {
  const def = TALENTS_BY_ID[id];
  if (!def) return false;
  const lvl = s.prestige.talents[id] ?? 0;
  if (lvl >= def.maxLevel) return false;
  if (!def.prereq.every((p) => (s.prestige.talents[p] ?? 0) > 0)) return false;
  return s.prestige.stardust.gte(talentCost(def, lvl));
}

export function buyTalent(s: GameState, id: string): boolean {
  if (!canBuyTalent(s, id)) return false;
  const def = TALENTS_BY_ID[id];
  const lvl = s.prestige.talents[id] ?? 0;
  s.prestige.stardust = s.prestige.stardust.sub(talentCost(def, lvl));
  s.prestige.talents[id] = lvl + 1;
  return true;
}

export function talentsSpent(s: GameState): number {
  let total = 0;
  for (const id in s.prestige.talents) {
    const def = TALENTS_BY_ID[id];
    for (let l = 0; l < s.prestige.talents[id]; l++) total += talentCost(def, l);
  }
  return total;
}

export function respecTalents(s: GameState): number {
  const refund = talentsSpent(s);
  s.prestige.stardust = s.prestige.stardust.add(refund);
  s.prestige.talents = {};
  return refund;
}

export function canBuySingularity(s: GameState, id: string): boolean {
  const def = SINGULARITY_BY_ID[id];
  if (!def) return false;
  const lvl = s.prestige.singUpgrades[id] ?? 0;
  return lvl < def.maxLevel && s.prestige.singularities.gte(singularityCost(def, lvl));
}

export function buySingularity(s: GameState, id: string): boolean {
  if (!canBuySingularity(s, id)) return false;
  const def = SINGULARITY_BY_ID[id];
  const lvl = s.prestige.singUpgrades[id] ?? 0;
  s.prestige.singularities = s.prestige.singularities.sub(singularityCost(def, lvl));
  s.prestige.singUpgrades[id] = lvl + 1;
  return true;
}

export function challengeAvailable(s: GameState, mods: Modifiers, id: string): boolean {
  const def = CHALLENGES_BY_ID[id];
  if (!def || s.prestige.supernovas < def.unlockSupernovas) return false;
  const done = s.challenges.completions[id] ?? 0;
  const maxLevel = mods.unlocks.challenges2 ? def.goals.length : 1;
  return done < maxLevel;
}

export function startChallenge(s: GameState, mods: Modifiers, id: string, now: number): boolean {
  if (s.challenges.active || !challengeAvailable(s, mods, id)) return false;
  doSupernova(s, mods, now, true);
  s.challenges.active = id;
  return true;
}

export function abandonChallenge(s: GameState): void {
  s.challenges.active = null;
}

export function challengeGoal(s: GameState, id: string): number {
  const def = CHALLENGES_BY_ID[id];
  const done = s.challenges.completions[id] ?? 0;
  return def.goals[Math.min(done, def.goals.length - 1)];
}

export function checkChallenge(s: GameState, ctx?: StepContext): void {
  const id = s.challenges.active;
  if (!id) return;
  const def = CHALLENGES_BY_ID[id];
  if (runScore(s).gte(challengeGoal(s, id))) {
    s.challenges.completions[id] = (s.challenges.completions[id] ?? 0) + 1;
    s.stats.challengesDone++;
    s.challenges.active = null;
    emit(ctx, { type: 'challengeDone', id });
  } else if (def.rules.timeLimit && s.run.time > def.rules.timeLimit) {
    s.challenges.active = null;
    emit(ctx, { type: 'challengeFailed', id });
  }
}

export function checkAutoSupernova(s: GameState, mods: Modifiers, now: number, ctx?: StepContext): void {
  if (!mods.unlocks.autoSupernova || !s.settings.autoSupernova || s.challenges.active) return;
  const gain = stardustGain(s, mods);
  const threshold = Decimal.max(1, s.prestige.stardustTotal.mul(s.settings.autoSupernovaMult));
  if (gain.gte(threshold)) {
    doSupernova(s, mods, now);
    emit(ctx, { type: 'autoSupernova', gain: gain.toString() });
  }
}

export function tierUnlockedTiers(s: GameState): ResourceId[] {
  return RESOURCE_IDS.filter((r) => s.stats.produced[r].gt(0));
}
