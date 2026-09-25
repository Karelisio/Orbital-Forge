import { ACHIEVEMENTS_BY_ID } from '../config/achievements';
import { ARTIFACTS_BY_ID } from '../config/artifacts';
import { BALANCE } from '../config/balance';
import { BOOSTS_BY_ID } from '../config/boosts';
import { CHALLENGES_BY_ID, type ChallengeRules } from '../config/challenges';
import { PLANETS } from '../config/planets';
import { RESEARCH_BY_ID } from '../config/research';
import { SINGULARITY_BY_ID } from '../config/singularity';
import { TALENTS_BY_ID } from '../config/talents';
import { RESOURCE_IDS, type AddStat, type Effect, type ResourceId, type UnlockKey } from '../config/types';
import { UPGRADES_BY_ID } from '../config/upgrades';
import type { GameState } from '../engine/state';
import { log10 } from './decimal';

type TierMap = Record<ResourceId, number>;

export interface Modifiers {
  global: number;
  yield: TierMap;
  speed: TierMap;
  ratio: TierMap;
  cost: TierMap;
  building: Record<string, number>;
  tap: number;
  critMult: number;
  offlineEff: number;
  research: number;
  expSpeed: number;
  expLoot: number;
  stardust: number;
  singularity: number;
  planet: number;
  eventReward: number;
  boostDuration: number;
  boostCooldown: number;

  tapPct: number;
  critChance: number;
  comboMax: number;
  offlineCap: number;
  artifactSlots: number;
  shipSlots: number;
  researchSlots: number;
  eventFreq: number;
  autoTap: number;
  artifactLuck: number;
  startOre: number;
  stardustUnspent: number;
  managerSpeed: number;

  unlocks: Record<UnlockKey, boolean>;
  rules: ChallengeRules;
  /** Breakdown of the global multiplier by source (for tooltips / stats). */
  globalSources: Record<string, number>;
}

const TIER_STATS = new Set(['yield', 'speed', 'ratio', 'cost']);

function tierMap(v: number): TierMap {
  return Object.fromEntries(RESOURCE_IDS.map((r) => [r, v])) as TierMap;
}

export function baseModifiers(): Modifiers {
  return {
    global: 1,
    yield: tierMap(1),
    speed: tierMap(1),
    ratio: tierMap(1),
    cost: tierMap(1),
    building: {},
    tap: 1,
    critMult: BALANCE.tap.critMult,
    offlineEff: BALANCE.offline.efficiency,
    research: 1,
    expSpeed: 1,
    expLoot: 1,
    stardust: 1,
    singularity: 1,
    planet: 1,
    eventReward: 1,
    boostDuration: 1,
    boostCooldown: 1,
    tapPct: BALANCE.tap.pctOfOre,
    critChance: BALANCE.tap.critChance,
    comboMax: BALANCE.tap.comboMax,
    offlineCap: BALANCE.offline.capHours,
    artifactSlots: BALANCE.artifacts.baseSlots,
    shipSlots: BALANCE.expeditions.baseShips,
    researchSlots: BALANCE.research.baseSlots,
    eventFreq: 1,
    autoTap: 0,
    artifactLuck: 0,
    startOre: 0,
    stardustUnspent: BALANCE.prestige.unspentBonus,
    managerSpeed: 1,
    unlocks: {
      managers1: false,
      managers2: false,
      managers3: false,
      autoUpgrades: false,
      expeditions: false,
      artifacts: false,
      autoSupernova: false,
      keepPlanets: false,
      keepUpgradesTap: false,
      challenges2: false,
      darkFlux: false,
      tapEcho: false,
      keepResearch: false,
    },
    rules: {},
    globalSources: {},
  };
}

function mulStat(m: Modifiers, e: Extract<Effect, { k: 'mul' | 'lin' }>, f: number, source: string): void {
  if (TIER_STATS.has(e.stat)) {
    const map = m[e.stat as 'yield' | 'speed' | 'ratio' | 'cost'];
    if (e.tier) map[e.tier] *= f;
    else for (const r of RESOURCE_IDS) map[r] *= f;
  } else if (e.stat === 'building') {
    if (e.building) m.building[e.building] = (m.building[e.building] ?? 1) * f;
  } else if (e.stat === 'global') {
    m.global *= f;
    m.globalSources[source] = (m.globalSources[source] ?? 1) * f;
  } else {
    (m[e.stat] as number) *= f;
  }
}

export function applyEffect(m: Modifiers, e: Effect, level: number, source = 'other'): void {
  if (level <= 0) return;
  switch (e.k) {
    case 'mul':
      mulStat(m, e, Math.pow(e.v, level), source);
      break;
    case 'lin':
      mulStat(m, e, 1 + e.v * level, source);
      break;
    case 'add':
      (m[e.stat as AddStat] as number) += e.v * level;
      break;
    case 'unlock':
      m.unlocks[e.key] = true;
      break;
  }
}

function applyGlobal(m: Modifiers, f: number, source: string): void {
  m.global *= f;
  m.globalSources[source] = (m.globalSources[source] ?? 1) * f;
}

/** Aggregates every permanent and temporary modifier source of the state. */
export function computeModifiers(s: GameState): Modifiers {
  const m = baseModifiers();
  const challenge = s.challenges.active ? CHALLENGES_BY_ID[s.challenges.active] : undefined;
  const rules = challenge?.rules ?? {};
  m.rules = rules;

  for (const id in s.upgrades) {
    const def = UPGRADES_BY_ID[id];
    if (def && s.upgrades[id]) for (const e of def.effects) applyEffect(m, e, 1, 'upgrades');
  }
  if (!rules.noResearch) {
    for (const id in s.research.done) {
      const def = RESEARCH_BY_ID[id];
      if (def && s.research.done[id]) for (const e of def.effects) applyEffect(m, e, 1, 'research');
    }
    for (const p of PLANETS) {
      const lvl = s.planets[p.id];
      if (lvl > 0) for (const e of p.effects) applyEffect(m, e, lvl, 'planets');
    }
  } else {
    // Research still grants feature unlocks, just not bonuses.
    for (const id in s.research.done) {
      const def = RESEARCH_BY_ID[id];
      if (def) for (const e of def.effects) if (e.k === 'unlock') applyEffect(m, e, 1);
    }
  }
  for (const id in s.prestige.talents) {
    const def = TALENTS_BY_ID[id];
    if (def) for (const e of def.effects) applyEffect(m, e, s.prestige.talents[id], 'talents');
  }
  for (const id in s.prestige.singUpgrades) {
    const def = SINGULARITY_BY_ID[id];
    if (def) for (const e of def.effects) applyEffect(m, e, s.prestige.singUpgrades[id], 'singularity');
  }
  for (const id in s.challenges.completions) {
    const def = CHALLENGES_BY_ID[id];
    if (def) for (const e of def.reward) applyEffect(m, e, s.challenges.completions[id], 'challenges');
  }
  const slots = Math.floor(m.artifactSlots);
  s.artifacts.equipped.slice(0, slots).forEach((id) => {
    const def = ARTIFACTS_BY_ID[id];
    const lvl = s.artifacts.owned[id] ?? 0;
    if (def) for (const e of def.effects) applyEffect(m, e, lvl, 'artifacts');
  });

  let achBonus = 0;
  for (const id in s.achievements) {
    const def = ACHIEVEMENTS_BY_ID[id];
    if (def && s.achievements[id]) achBonus += def.bonus;
  }
  if (achBonus > 0) applyGlobal(m, 1 + achBonus, 'achievements');

  const unspent = s.prestige.stardust.toNumber();
  if (unspent > 0) applyGlobal(m, 1 + unspent * m.stardustUnspent, 'stardust');
  const sing = s.prestige.singularities.toNumber();
  if (sing > 0)
    applyGlobal(m, 1 + sing * BALANCE.prestige.singularityGlobal * m.singularity, 'singularities');

  if (m.unlocks.darkFlux) {
    applyGlobal(m, 1 + 0.1 * log10(s.resources.darkMatter.add(1)), 'darkFlux');
  }

  // Temporary effects.
  if (s.boosts.overdrive.active > 0) applyGlobal(m, BOOSTS_BY_ID.overdrive.value, 'boost');
  if (s.boosts.frenzy.active > 0) {
    m.tap *= BOOSTS_BY_ID.frenzy.value;
    m.autoTap += BOOSTS_BY_ID.frenzy.autoTap ?? 0;
  }
  if (s.events.frenzy > 0) applyGlobal(m, BALANCE.events.cometFrenzyMult, 'event');
  const ev = s.events.active;
  if (ev && ev.type === 'storm' && !ev.shielded) applyGlobal(m, BALANCE.events.stormMult, 'event');

  // Challenge constraints.
  if (rules.globalMult) applyGlobal(m, rules.globalMult, 'challenge');
  if (rules.ratioMult) for (const r of RESOURCE_IDS) m.ratio[r] *= rules.ratioMult;
  if (rules.costMult) for (const r of RESOURCE_IDS) m.cost[r] *= rules.costMult;
  if (rules.noTap) m.autoTap = 0;

  if (!m.unlocks.expeditions) m.shipSlots = 0;
  m.shipSlots = Math.min(4, Math.floor(m.shipSlots));
  m.researchSlots = Math.floor(m.researchSlots);
  m.artifactSlots = slots;
  return m;
}
