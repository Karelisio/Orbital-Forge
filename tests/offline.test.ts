import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { Decimal } from '../src/economy/decimal';
import { computeModifiers } from '../src/economy/modifiers';
import { computeFlows } from '../src/economy/production';
import { createInitialState } from '../src/engine/state';
import { step } from '../src/engine/step';
import { simulateOffline } from '../src/systems/offline';

function chainState() {
  const s = createInitialState(0, 42);
  s.buildings['ore_0'] = 50;
  s.buildings['ore_1'] = 20;
  s.buildings['metal_0'] = 5;
  s.buildings['alloy_0'] = 2;
  s.resources.ore = new Decimal(0);
  return s;
}

describe('offline simulation', () => {
  it('applies the offline efficiency to a producer-only economy', () => {
    const s = createInitialState(0, 1);
    s.buildings['ore_0'] = 10;
    const mods = computeModifiers(s);
    const rate = computeFlows(s, mods)[0].out.toNumber();
    const res = simulateOffline(s, 3600);
    expect(res.simulated).toBe(3600);
    // Achievements unlocked along the way can only add production.
    const ratio = res.gains.ore.toNumber() / (rate * 3600 * BALANCE.offline.efficiency);
    expect(ratio).toBeGreaterThanOrEqual(0.999);
    expect(ratio).toBeLessThan(1.1);
  });

  it('simulates the whole chain, not just a product of rates', () => {
    const s = chainState();
    const res = simulateOffline(s, 2 * 3600);
    expect(s.run.produced.metal.gt(0)).toBe(true);
    expect(res.gains.alloy.gt(0)).toBe(true);
    // Alloys can only come from metal that was itself produced from ore during the absence.
    const reference = chainState();
    for (let t = 0; t < 2 * 3600; t++) step(reference, 1, { offline: true });
    const rel = res.gains.alloy.div(reference.resources.alloy).toNumber();
    expect(rel).toBeGreaterThan(0.97);
    expect(rel).toBeLessThan(1.03);
  });

  it('caps the simulated time', () => {
    const s = chainState();
    const res = simulateOffline(s, 48 * 3600);
    expect(res.capped).toBe(true);
    expect(res.simulated).toBe(BALANCE.offline.capHours * 3600);
    expect(s.stats.playTime).toBeCloseTo(BALANCE.offline.capHours * 3600, 3);
  });

  it('completes research and expeditions while away', () => {
    const s = chainState();
    s.research.active = [{ id: 'r_drills', remaining: 30 }];
    s.expeditions.ships = [{ dest: 'belt', remaining: 900, duration: 900, seed: 3 }];
    const res = simulateOffline(s, 3600);
    expect(res.research).toContain('r_drills');
    expect(s.research.done['r_drills']).toBe(true);
    expect(res.expeditions).toBe(1);
    expect(s.expeditions.ships[0]?.remaining).toBe(0);
  });

  it('never starts random events offline', () => {
    const s = chainState();
    s.events.next = 1;
    simulateOffline(s, 3600);
    expect(s.events.active).toBeNull();
  });
});

describe('step', () => {
  it('is deterministic for a given seed', () => {
    const a = chainState();
    const b = chainState();
    for (let i = 0; i < 2000; i++) {
      step(a, 0.1);
      step(b, 0.1);
    }
    expect(a.resources.alloy.eq(b.resources.alloy)).toBe(true);
    expect(a.seed).toBe(b.seed);
  });
});
