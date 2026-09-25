/**
 * Headless balancing bot. Plays Orbital Forge with a greedy strategy and writes a progression curve.
 *
 *   npm run simulate -- [--hours 72] [--out sim-output]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BALANCE, TIER_BALANCE } from '../src/config/balance';
import { BUILDINGS, BUILDINGS_BY_ID } from '../src/config/buildings';
import { PLANETS, planetLevelCost } from '../src/config/planets';
import { RESEARCH } from '../src/config/research';
import { SINGULARITY, singularityCost } from '../src/config/singularity';
import { TALENTS, talentCost } from '../src/config/talents';
import { RESOURCE_IDS, type ResourceId } from '../src/config/types';
import { UPGRADES } from '../src/config/upgrades';
import { bulkCost, unitCost } from '../src/economy/cost';
import { Decimal } from '../src/economy/decimal';
import { computeModifiers, type Modifiers } from '../src/economy/modifiers';
import { computeFlows, type Rates } from '../src/economy/production';
import { runScore, singularityGain, stardustGain } from '../src/economy/prestige';
import { createInitialState, type GameState } from '../src/engine/state';
import { step } from '../src/engine/step';
import { buildingVisible, buyBuildingQty } from '../src/systems/buildings';
import { claimExpedition, launchExpedition } from '../src/systems/expeditions';
import { simulateOffline } from '../src/systems/offline';
import { canColonize, colonize, levelPlanet } from '../src/systems/planets';
import {
  buySingularity,
  buyTalent,
  canBuySingularity,
  canBuyTalent,
  doBlackHole,
  doSupernova,
} from '../src/systems/prestige';
import { canStartResearch, startResearch } from '../src/systems/research';
import { tap } from '../src/systems/tap';
import { buyUpgrade, upgradeReqMet } from '../src/systems/upgrades';
import { catchComet, catchMeteor } from '../src/systems/events';

const args = process.argv.slice(2);
const arg = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const HOURS = Number(arg('hours', '72'));
const OUT = arg('out', 'sim-output');
const QUIET = args.includes('--quiet');
const NO_BH = args.includes('--no-bh');

const V = RESOURCE_IDS.map((r) => TIER_BALANCE[r].value);

/** Steady-state value/s of the chain (prestige score rate), accounting for bottlenecks. */
function scoreRate(s: GameState, mods: Modifiers): number {
  const flows = computeFlows(s, mods);
  let total = 0;
  let supply = 0;
  flows.forEach((f, i) => {
    const out = f.out.toNumber();
    const need = f.need.toNumber();
    let e = 1;
    if (i > 0 && need > 0) e = Math.min(1, supply / need);
    const produced = out * e;
    total += produced * V[i];
    supply = produced;
    if (i > 0) void 0;
  });
  return total;
}

interface Option {
  kind: 'building' | 'upgrade';
  id: string;
  res: ResourceId;
  cost: Decimal;
  gain: number;
}

function options(s: GameState, mods: Modifiers, base: number): Option[] {
  const out: Option[] = [];
  for (const b of BUILDINGS) {
    if (!buildingVisible(s, b)) continue;
    const n = s.buildings[b.id];
    if (mods.rules.maxBuildings && n >= mods.rules.maxBuildings) continue;
    s.buildings[b.id] = n + 1;
    const gain = scoreRate(s, mods) - base;
    s.buildings[b.id] = n;
    out.push({ kind: 'building', id: b.id, res: b.costRes, cost: unitCost(b, n, mods.cost[b.tier]), gain });
  }
  if (!mods.rules.noUpgrades) {
    for (const u of UPGRADES) {
      if (s.upgrades[u.id] || !upgradeReqMet(s, u)) continue;
      s.upgrades[u.id] = true;
      const gain = scoreRate(s, computeModifiers(s)) - base;
      delete s.upgrades[u.id];
      const tapBonus = u.kind === 'tap' || u.kind === 'crit' || u.kind === 'combo' ? base * 0.05 : 0;
      out.push({
        kind: 'upgrade',
        id: u.id,
        res: u.cost.res,
        cost: new Decimal(u.cost.amount),
        gain: Math.max(gain, tapBonus),
      });
    }
  }
  return out;
}

function netRate(rates: Rates | null, r: ResourceId): number {
  if (!rates) return 0;
  return rates.prod[r].sub(rates.cons[r]).toNumber();
}

interface Sample {
  t: number;
  score: number;
  stardust: number;
  sing: number;
  top: number;
}

const s = createInitialState(0, 12345);
let rates: Rates | null = null;
let t = 0;
let lastDecision = -999;
let runBestRate = 0;
const samples: Sample[] = [];
const milestones: Record<string, number> = {};
const gapsEarly: number[] = [];
let lastPurchase = 0;
const log = (msg: string) => {
  if (!QUIET) console.log(`[${(t / 3600).toFixed(2)}h] ${msg}`);
};

function mark(key: string) {
  if (milestones[key] === undefined) {
    milestones[key] = t;
    log(key);
  }
}

function purchased() {
  if (t < 2 * 3600 && s.prestige.supernovas === 0) gapsEarly.push(t - lastPurchase);
  lastPurchase = t;
}

function decide(mods: Modifiers) {
  // Research: cheapest available first.
  for (const r of RESEARCH) {
    if (canStartResearch(s, mods, r.id) && s.resources[r.cost.res].mul(0.5).gte(r.cost.amount)) {
      startResearch(s, mods, r.id);
      purchased();
    }
  }
  // Planets.
  for (const p of PLANETS) {
    if (canColonize(s, mods, p.id) && s.resources[p.colonize.res].mul(0.5).gte(p.colonize.amount)) {
      colonize(s, mods, p.id);
      purchased();
      mark(`planet:${p.id}`);
    }
    while (s.planets[p.id] > 0 && s.planetRes[p.id].gte(planetLevelCost(p, s.planets[p.id])))
      levelPlanet(s, p.id);
  }
  // Expeditions.
  s.expeditions.ships.forEach((ship, i) => {
    if (ship && ship.remaining <= 0 && rates) claimExpedition(s, mods, rates, i);
    if (!s.expeditions.ships[i]) launchExpedition(s, mods, i, s.prestige.supernovas >= 1 ? 'rift' : 'nebula');
  });

  // Exploration: humans always try the newest building as soon as it is affordable.
  for (const b of BUILDINGS) {
    if (s.buildings[b.id] === 0 && buildingVisible(s, b) && buyBuildingQty(s, mods, b.id, 1) > 0) purchased();
  }
  // Buildings/upgrades: greedy on payback time.
  for (let k = 0; k < 40; k++) {
    const base = scoreRate(s, mods);
    const opts = options(s, mods, base).filter((o) => o.gain > 0);
    if (!opts.length) break;
    let best: Option | null = null;
    let bestScore = Infinity;
    for (const o of opts) {
      const stock = s.resources[o.res];
      const income = Math.max(1e-9, netRate(rates, o.res) + (o.res === 'ore' ? 3 : 0));
      const wait = stock.gte(o.cost) ? 0 : o.cost.sub(stock).toNumber() / income;
      const payback = (o.cost.toNumber() * V[RESOURCE_IDS.indexOf(o.res)]) / o.gain;
      const score = wait + payback;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
    if (!best) break;
    if (s.resources[best.res].gte(best.cost)) {
      const ok =
        best.kind === 'building' ? buyBuildingQty(s, mods, best.id, 1) > 0 : buyUpgrade(s, mods, best.id);
      if (!ok) break;
      if (best.kind === 'upgrade') mods = computeModifiers(s);
      purchased();
      for (const r of RESOURCE_IDS) s.throttle[r] = 1;
    } else {
      // If the currency is fully consumed downstream, pause the consumer tier to save up.
      const i = RESOURCE_IDS.indexOf(best.res);
      if (i < RESOURCE_IDS.length - 1 && netRate(rates, best.res) <= 0) s.throttle[RESOURCE_IDS[i + 1]] = 0;
      break;
    }
  }
}

function spendStardust() {
  let bought = true;
  while (bought) {
    bought = false;
    const list = TALENTS.filter((tl) => canBuyTalent(s, tl.id)).sort(
      (a, b) => talentCost(a, s.prestige.talents[a.id] ?? 0) - talentCost(b, s.prestige.talents[b.id] ?? 0),
    );
    if (list.length && s.prestige.stardust.gte(talentCost(list[0], s.prestige.talents[list[0].id] ?? 0))) {
      bought = buyTalent(s, list[0].id);
    }
  }
  bought = true;
  while (bought) {
    bought = false;
    const list = SINGULARITY.filter((x) => canBuySingularity(s, x.id)).sort(
      (a, b) =>
        singularityCost(a, s.prestige.singUpgrades[a.id] ?? 0) -
        singularityCost(b, s.prestige.singUpgrades[b.id] ?? 0),
    );
    if (list.length) bought = buySingularity(s, list[0].id);
  }
}

const DAY = 86400;
const AWAKE = 16 * 3600;
const end = HOURS * 3600;
while (t < end) {
  const dayT = t % DAY;
  if (dayT >= AWAKE) {
    // Sleep: offline catch-up.
    const sleep = DAY - dayT;
    s.lastSeen = t * 1000;
    simulateOffline(s, sleep);
    t += sleep;
    continue;
  }
  const dt = 1;
  const res = step(s, dt, {}, t * 1000);
  rates = res.rates;
  let mods = res.mods;
  t += dt;

  // Active tapping during the first session hour of each day, 4 taps/s.
  if (dayT < 3600) {
    for (let i = 0; i < 4; i++) tap(s, mods, rates.flows[0].out);
  }
  // Catch half of the events.
  const ev = s.events.active;
  if (ev && ev.type === 'comet' && Math.floor(t) % 2 === 0) catchComet(s, mods, rates);
  if (ev && ev.type === 'meteors' && ev.caught < 5) catchMeteor(s, mods, rates);

  const interval = t < 3600 ? 5 : t < 6 * 3600 ? 20 : 60;
  if (t - lastDecision >= interval) {
    lastDecision = t;
    decide(mods);
    mods = computeModifiers(s);

    // Tier unlock milestones.
    for (const r of RESOURCE_IDS) if (s.run.produced[r].gt(0)) mark(`tier:${r}`);

    // Prestige: supernova when stardust/hour starts dropping.
    const gain = stardustGain(s, mods);
    const rate = gain.toNumber() / Math.max(1, s.run.time);
    runBestRate = Math.max(runBestRate, rate);
    // Player model: first Supernova as soon as it is worth ~10 stardust, then whenever it at least doubles
    // the lifetime stardust and the stardust/hour rate stops improving.
    const total = s.prestige.stardustTotal.toNumber();
    const first = total === 0 && gain.gte(10);
    const later =
      total > 0 && gain.gte(Math.max(10, total)) && (rate < runBestRate * 0.98 || s.run.time > 4 * 3600);
    if ((first || later) && s.run.time > 900) {
      mark(`supernova#${s.prestige.supernovas + 1}`);
      doSupernova(s, mods, t * 1000);
      runBestRate = 0;
      spendStardust();
    }
    const sing = singularityGain(s, computeModifiers(s));
    if (sing.gte(1) && !NO_BH) {
      mark(`blackhole#${s.prestige.blackHoles + 1}`);
      doSupernova(s, computeModifiers(s), t * 1000);
      doBlackHole(s, computeModifiers(s), t * 1000);
      spendStardust();
    }
  }

  if (process.env.PROBE && Math.floor(t) % 600 === 0) {
    const m = computeModifiers(s);
    const owned = BUILDINGS.filter((b) => s.buildings[b.id] > 0)
      .map((b) => `${b.id}:${s.buildings[b.id]}`)
      .join(' ');
    console.log(
      `[${(t / 3600).toFixed(2)}h] ore/s=${rates.prod.ore.toExponential(2)} metal/s=${rates.prod.metal.toExponential(2)} alloy/s=${rates.prod.alloy.toExponential(2)} score=${runScore(s).toExponential(2)} global=${m.global.toExponential(2)} yieldOre=${m.yield.ore} upg=${Object.keys(s.upgrades).length} taps=${s.stats.taps} tapOre=${s.stats.tapProduced.toExponential(2)}\n   ${owned}`,
    );
  }
  if (Math.floor(t) % 300 === 0) {
    let top = 0;
    RESOURCE_IDS.forEach((r, i) => {
      if (s.run.produced[r].gt(0)) top = i;
    });
    samples.push({
      t,
      score: Math.max(0, runScore(s).add(1).log10()),
      stardust: s.prestige.stardustTotal.add(1).log10(),
      sing: s.prestige.singularitiesTotal.toNumber(),
      top,
    });
  }
}

// ---- Report ----
mkdirSync(OUT, { recursive: true });
const csv = ['hours,log10_run_score,log10_stardust_total,singularities,top_tier']
  .concat(
    samples.map(
      (x) => `${(x.t / 3600).toFixed(3)},${x.score.toFixed(3)},${x.stardust.toFixed(3)},${x.sing},${x.top}`,
    ),
  )
  .join('\n');
writeFileSync(join(OUT, 'progression.csv'), csv);

const W = 900;
const H = 420;
const P = 50;
const maxY = Math.max(1, ...samples.map((x) => x.score), ...samples.map((x) => x.stardust * 3));
const x = (tt: number) => P + (tt / end) * (W - 2 * P);
const y = (v: number) => H - P - (v / maxY) * (H - 2 * P);
const path = (f: (s: Sample) => number) =>
  samples.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(f(p)).toFixed(1)}`).join('');
const marks = Object.entries(milestones)
  .filter(([k]) => k.startsWith('supernova') || k.startsWith('blackhole'))
  .map(
    ([k, tt]) =>
      `<line x1="${x(tt)}" x2="${x(tt)}" y1="${P}" y2="${H - P}" stroke="${k.startsWith('black') ? '#ff4fd8' : '#ffe14d33'}"/>`,
  )
  .join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" fill="#05060f"/>
<text x="${P}" y="30" fill="#e6f1ff" font-family="sans-serif" font-size="16">Orbital Forge — progression simulée (${HOURS} h)</text>
${marks}
<path d="${path((p) => p.score)}" stroke="#39f3ff" fill="none" stroke-width="2"/>
<path d="${path((p) => p.stardust * 3)}" stroke="#ffe14d" fill="none" stroke-width="2"/>
<line x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}" stroke="#445"/>
${Array.from({ length: Math.ceil(HOURS / 12) + 1 }, (_, i) => `<text x="${x(i * 12 * 3600)}" y="${H - P + 18}" fill="#889" font-size="11" font-family="sans-serif" text-anchor="middle">${i * 12}h</text>`).join('')}
<text x="${W - P}" y="${P}" fill="#39f3ff" font-size="12" font-family="sans-serif" text-anchor="end">log10(score du run)</text>
<text x="${W - P}" y="${P + 16}" fill="#ffe14d" font-size="12" font-family="sans-serif" text-anchor="end">3×log10(poussière totale)</text>
</svg>`;
writeFileSync(join(OUT, 'progression.svg'), svg);

const fmtH = (v: number | undefined) => (v === undefined ? 'jamais' : `${(v / 3600).toFixed(2)} h`);
const report = {
  hours: HOURS,
  firstSupernova: fmtH(milestones['supernova#1']),
  firstBlackHole: fmtH(milestones['blackhole#1']),
  supernovas: s.prestige.supernovas,
  blackHoles: s.prestige.blackHoles,
  longestGapFirstRunMin: +(Math.max(0, ...gapsEarly) / 60).toFixed(2),
  tiers: Object.fromEntries(RESOURCE_IDS.map((r) => [r, fmtH(milestones[`tier:${r}`])])),
  researchDone: Object.keys(s.research.done).length,
  achievements: Object.keys(s.achievements).length,
  stardustTotal: s.prestige.stardustTotal.toString(),
  singularities: s.prestige.singularitiesTotal.toString(),
};
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
void BUILDINGS_BY_ID;
void bulkCost;
void BALANCE;
