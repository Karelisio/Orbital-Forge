import { describe, expect, it } from 'vitest';
import { Decimal } from '../src/economy/decimal';
import { computeModifiers } from '../src/economy/modifiers';
import { applyProduction } from '../src/economy/production';
import { runScore, stardustGain } from '../src/economy/prestige';
import { createInitialState } from '../src/engine/state';
import { step } from '../src/engine/step';
import { buyBuilding } from '../src/systems/buildings';
import { buyUpgrade } from '../src/systems/upgrades';
import {
  canSupernova,
  doBlackHole,
  doSupernova,
  buyTalent,
  respecTalents,
  startChallenge,
} from '../src/systems/prestige';
import { startResearch } from '../src/systems/research';
import { runManagers } from '../src/systems/managers';
import { claimMission, refreshMissions, missionComplete, dayKey } from '../src/systems/missions';
import { tap } from '../src/systems/tap';
import { activateBoost, useBoostToken } from '../src/systems/boosts';
import { launchExpedition, claimExpedition } from '../src/systems/expeditions';
import { catchComet, startEvent } from '../src/systems/events';

describe('purchases', () => {
  it('buys buildings and upgrades, spending resources', () => {
    const s = createInitialState(0, 7);
    s.resources.ore = new Decimal(1000);
    const mods = computeModifiers(s);
    expect(buyBuilding(s, mods, 'ore_0', 10)).toBe(10);
    expect(s.buildings['ore_0']).toBe(10);
    expect(s.resources.ore.lt(1000)).toBe(true);
    s.resources.ore = new Decimal(1e4);
    expect(buyUpgrade(s, mods, 'u_ore_0_1')).toBe(true);
    expect(buyUpgrade(s, mods, 'u_ore_0_1')).toBe(false);
    expect(computeModifiers(s).building['ore_0']).toBe(2);
  });

  it('taps give ore, combos and crits', () => {
    const s = createInitialState(0, 7);
    const mods = computeModifiers(s);
    let crits = 0;
    for (let i = 0; i < 200; i++) if (tap(s, mods, new Decimal(0))?.crit) crits++;
    expect(s.stats.taps).toBe(200);
    expect(crits).toBeGreaterThan(0);
    expect(s.resources.ore.gt(200)).toBe(true);
    const noTap = computeModifiers({ ...s, challenges: { active: 'c_notap', completions: {} } });
    expect(tap(s, noTap, new Decimal(0))).toBeNull();
  });
});

describe('prestige', () => {
  it('supernova grants stardust and resets the run but keeps research', () => {
    const s = createInitialState(0, 7);
    s.run.produced.ore = new Decimal(4e9);
    s.buildings['ore_0'] = 30;
    s.research.done['r_drills'] = true;
    const mods = computeModifiers(s);
    expect(canSupernova(s, mods)).toBe(true);
    expect(stardustGain(s, mods).toNumber()).toBe(2);
    doSupernova(s, mods, 0);
    expect(s.prestige.stardust.toNumber()).toBe(2);
    expect(s.prestige.supernovas).toBe(1);
    expect(s.buildings['ore_0']).toBe(0);
    expect(runScore(s).toNumber()).toBe(0);
    expect(s.research.done['r_drills']).toBe(true);
  });

  it('talents cost stardust, respec refunds', () => {
    const s = createInitialState(0, 7);
    s.prestige.stardust = new Decimal(10);
    expect(buyTalent(s, 't_prod_2')).toBe(false); // prereq
    expect(buyTalent(s, 't_prod_1')).toBe(true);
    expect(buyTalent(s, 't_prod_2')).toBe(true);
    expect(s.prestige.stardust.toNumber()).toBe(7);
    expect(respecTalents(s)).toBe(3);
    expect(s.prestige.stardust.toNumber()).toBe(10);
  });

  it('black hole converts stardust into singularities and resets talents', () => {
    const s = createInitialState(0, 7);
    s.prestige.stardustCycle = new Decimal(8e5);
    s.prestige.talents['t_prod_1'] = 3;
    doBlackHole(s, computeModifiers(s), 0);
    expect(s.prestige.singularities.toNumber()).toBe(2);
    expect(s.prestige.talents).toEqual({});
    expect(s.prestige.stardust.toNumber()).toBe(0);
  });

  it('challenges apply rules and complete on goal', () => {
    const s = createInitialState(0, 7);
    s.prestige.supernovas = 1;
    expect(startChallenge(s, computeModifiers(s), 'c_weak', 0)).toBe(true);
    expect(computeModifiers(s).globalSources.challenge).toBeCloseTo(0.1);
    s.run.produced.ore = new Decimal(2e9);
    step(s, 1);
    expect(s.challenges.active).toBeNull();
    expect(s.challenges.completions['c_weak']).toBe(1);
  });
});

describe('timed systems', () => {
  it('research completes over time and unlocks effects', () => {
    const s = createInitialState(0, 7);
    s.resources.metal = new Decimal(100);
    expect(startResearch(s, computeModifiers(s), 'r_drills')).toBe(true);
    for (let i = 0; i < 31; i++) step(s, 1);
    expect(s.research.done['r_drills']).toBe(true);
    expect(computeModifiers(s).yield.ore).toBeCloseTo(
      1.5 * computeModifiers(createInitialState(0)).yield.ore,
    );
  });

  it('expeditions return loot', () => {
    const s = createInitialState(0, 7);
    s.research.done['r_expeditions'] = true;
    s.buildings['ore_0'] = 10;
    const mods = computeModifiers(s);
    expect(launchExpedition(s, mods, 0, 'belt')).toBe(true);
    for (let i = 0; i < 901; i++) step(s, 1);
    const rates = applyProduction(s, mods, 1);
    const loot = claimExpedition(s, mods, rates, 0);
    expect(loot?.resources.ore.gt(0)).toBe(true);
    expect(s.expeditions.ships[0]).toBeNull();
    expect(s.stats.expeditionsDone).toBe(1);
  });

  it('boosts have cooldowns and tokens clear them', () => {
    const s = createInitialState(0, 7);
    const mods = computeModifiers(s);
    const rates = applyProduction(s, mods, 1);
    expect(activateBoost(s, mods, rates, 'overdrive')).toBe(true);
    expect(computeModifiers(s).globalSources.boost).toBe(2);
    expect(activateBoost(s, mods, rates, 'overdrive')).toBe(false);
    step(s, 31 * 60);
    expect(computeModifiers(s).globalSources.boost).toBeUndefined();
    expect(useBoostToken(s, 'overdrive')).toBe(false);
    s.boostTokens = 1;
    expect(useBoostToken(s, 'overdrive')).toBe(true);
    expect(activateBoost(s, mods, rates, 'overdrive')).toBe(true);
  });

  it('comet gives a reward', () => {
    const s = createInitialState(0, 7);
    const mods = computeModifiers(s);
    const rates = applyProduction(s, mods, 1);
    startEvent(s, rates, 'comet');
    expect(catchComet(s, mods, rates)).not.toBeNull();
    expect(s.events.active).toBeNull();
    expect(s.stats.eventsCaught).toBe(1);
  });
});

describe('automation & missions', () => {
  it('managers buy buildings within their reserve', () => {
    const s = createInitialState(0, 7);
    s.research.done['r_auto1'] = true;
    s.managers.ore = { enabled: true, mode: 'cheapest', target: null, reserve: 0.5 };
    s.resources.ore = new Decimal(1000);
    const bought = runManagers(s, computeModifiers(s));
    expect(bought).toBeGreaterThan(0);
    expect(s.resources.ore.gte(500)).toBe(true);
  });

  it('missions roll per day and track progress from a baseline', () => {
    const s = createInitialState(0, 7);
    const now = new Date(2026, 0, 5, 12).getTime();
    s.stats.taps = 1000;
    expect(refreshMissions(s, now)).toBe(true);
    expect(s.missions.daily).toHaveLength(3);
    expect(s.missions.weekly).toHaveLength(3);
    expect(s.missions.day).toBe(dayKey(now));
    expect(s.missions.streak).toBe(1);
    expect(refreshMissions(s, now + 1000)).toBe(false);
    refreshMissions(s, now + 86400000);
    expect(s.missions.streak).toBe(2);
    const mission = s.missions.daily[0];
    expect(missionComplete(s, mission)).toBe(false);
    s.stats.taps += 1e6;
    s.stats.crits += 1e6;
    s.stats.buildingsBought += 1e6;
    s.stats.upgradesBought += 1e6;
    s.stats.eventsCaught += 1e6;
    s.stats.meteors += 1e6;
    s.stats.expeditionsDone += 1e6;
    s.stats.researchDone += 1e6;
    expect(missionComplete(s, mission)).toBe(true);
    const mods = computeModifiers(s);
    expect(claimMission(s, mods, applyProduction(s, mods, 1), 'daily', 0)).toBe(true);
    expect(s.stats.missionsDone).toBe(1);
  });
});
