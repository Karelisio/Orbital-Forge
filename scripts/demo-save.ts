/**
 * Writes a mid-game demo save (used for README screenshots and manual QA):
 *   npx tsx scripts/demo-save.ts > /tmp/demo-save.txt
 */
import { BUILDINGS } from '../src/config/buildings';
import { RESEARCH } from '../src/config/research';
import { Decimal } from '../src/economy/decimal';
import { createInitialState } from '../src/engine/state';
import { checkAchievements } from '../src/systems/achievements';
import { refreshMissions } from '../src/systems/missions';
import { wrap } from '../src/save/serialize';

const now = Date.now();
const s = createInitialState(now, 4242);
const counts: Record<string, number> = { ore: 180, metal: 120, alloy: 70, component: 30, energy: 8 };
for (const b of BUILDINGS) {
  const base = counts[b.tier] ?? 0;
  s.buildings[b.id] = Math.max(0, Math.floor(base - b.index * (base / 10)));
}
const amounts = {
  ore: '4.2e21',
  metal: '3.1e19',
  alloy: '5.5e16',
  component: '2.4e14',
  energy: '8.1e11',
  crystal: '0',
  darkMatter: '0',
};
for (const [r, v] of Object.entries(amounts)) {
  const k = r as keyof typeof s.resources;
  s.resources[k] = new Decimal(v);
  s.run.produced[k] = new Decimal(v).mul(20);
  s.stats.produced[k] = new Decimal(v).mul(60);
}
RESEARCH.slice(0, 18).forEach((r) => (s.research.done[r.id] = true));
s.research.active = [{ id: RESEARCH[20].id, remaining: RESEARCH[20].duration * 0.4 }];
s.planets.cryon = 14;
s.planets.vulcara = 9;
s.planets.sylva = 6;
s.planets.aquor = 3;
s.prestige.supernovas = 3;
s.prestige.stardust = new Decimal(420);
s.prestige.stardustTotal = new Decimal(900);
s.prestige.stardustCycle = new Decimal(900);
s.prestige.talents = { t_prod_1: 4, t_prod_2: 2, t_forge_1: 3, t_impact_1: 3, t_time_1: 2, t_fortune_1: 1 };
s.prestige.history = [
  { kind: 'supernova', at: now - 9e6, duration: 3900, gain: '12', challenge: null },
  { kind: 'supernova', at: now - 5e6, duration: 7200, gain: '140', challenge: null },
  { kind: 'supernova', at: now - 2e6, duration: 9800, gain: '748', challenge: null },
];
s.artifacts.owned = { a_pick: 3, a_gear: 2, a_battery: 1, a_heart: 1, a_map: 1 };
s.artifacts.equipped = ['a_heart', 'a_pick', 'a_battery'];
s.expeditions.ships = [{ dest: 'nebula', remaining: 1200, duration: 3600, seed: 7 }, null];
s.stats.taps = 18_400;
s.stats.crits = 950;
s.stats.maxCombo = 64;
s.stats.playTime = 14 * 3600;
s.run.time = 2.5 * 3600;
s.stats.history = Array.from({ length: 120 }, (_, i) => ({
  t: i * 60,
  rates: [8 + i * 0.1, 6 + i * 0.1, 3 + i * 0.09, 1 + i * 0.08, i * 0.05, 0, 0],
  stardust: 2.9,
}));
s.tutorial = { step: 99, done: true };
s.managers.ore = { enabled: true, mode: 'roi', target: null, reserve: 0.2 };
refreshMissions(s, now);
checkAchievements(s);
if (process.env.THEME === 'material') {
  s.settings.theme = 'material';
  s.settings.materialSeed = process.env.SEED ?? 'dynamic';
}
s.lastSeen = now;
process.stdout.write(wrap(s, now));
