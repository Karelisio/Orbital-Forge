import { setAutoFreeze } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BoostId } from '../config/boosts';
import type { MissionPeriod } from '../config/missions';
import { RESEARCH } from '../config/research';
import { RESOURCE_IDS, type PlanetId, type ResourceId } from '../config/types';
import { UPGRADES } from '../config/upgrades';
import { Decimal } from '../economy/decimal';
import { computeModifiers, type Modifiers } from '../economy/modifiers';
import { applyProduction, type Rates } from '../economy/production';
import type { GameEvent, StepContext } from '../engine/events';
import {
  createInitialState,
  type BuyAmount,
  type GameState,
  type ManagerConfig,
  type Settings,
} from '../engine/state';
import { step } from '../engine/step';
import { equipArtifact, unequipArtifact } from '../systems/artifacts';
import { activateBoost, spendBoostToken } from '../systems/boosts';
import { buyBuilding } from '../systems/buildings';
import {
  buyOffer,
  catchComet,
  catchMeteor,
  shieldStorm,
  startEvent,
  type CometReward,
} from '../systems/events';
import { claimExpedition, launchExpedition, syncShips, type ExpeditionLoot } from '../systems/expeditions';
import { claimMission, claimStreak, refreshMissions } from '../systems/missions';
import { simulateOffline, type OfflineSummary } from '../systems/offline';
import { colonize, levelPlanet } from '../systems/planets';
import {
  abandonChallenge,
  buySingularity,
  buyTalent,
  doBlackHole,
  doSupernova,
  respecTalents,
  startChallenge,
} from '../systems/prestige';
import { cancelQueued, startResearch } from '../systems/research';
import { tap, type TapResult } from '../systems/tap';
import { buyUpgrade, canBuyUpgrade } from '../systems/upgrades';

setAutoFreeze(false);

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();
export function onGameEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function dispatch(events: GameEvent[]): void {
  for (const e of events) for (const l of listeners) l(e);
}

function emptyRates(s: GameState, mods: Modifiers): Rates {
  // Production preview without mutating: run on a throwaway copy of resources.
  const copy = {
    ...s,
    resources: { ...s.resources },
    run: { ...s.run, produced: { ...s.run.produced } },
    stats: { ...s.stats, produced: { ...s.stats.produced } },
    planetRes: { ...s.planetRes },
  };
  return applyProduction(copy, mods, 1);
}

export interface GameStore {
  game: GameState;
  rates: Rates;
  mods: Modifiers;
  ready: boolean;
  debugSpeed: number;
  offline: OfflineSummary | null;

  hydrate(state: GameState, offlineSeconds: number): void;
  advance(realSeconds: number): void;

  tap(): TapResult | null;
  buyBuilding(id: string): number;
  buyUpgrade(id: string): boolean;
  buyAllUpgrades(): number;
  setBuyAmount(m: BuyAmount): void;
  setThrottle(tier: ResourceId, v: number): void;
  startResearch(id: string): boolean;
  cancelResearch(id: string): void;
  colonize(p: PlanetId): boolean;
  levelPlanet(p: PlanetId, max?: boolean): boolean;
  supernova(): Decimal;
  blackHole(): Decimal;
  buyTalent(id: string): boolean;
  respecTalents(): number;
  buySingularity(id: string): boolean;
  startChallenge(id: string): boolean;
  abandonChallenge(): void;
  equip(id: string): boolean;
  unequip(id: string): void;
  clearNewArtifacts(): void;
  launchExpedition(index: number, dest: string): boolean;
  claimExpedition(index: number): ExpeditionLoot | null;
  activateBoost(id: BoostId): boolean;
  spendToken(id: BoostId): boolean;
  claimMission(period: MissionPeriod, index: number): boolean;
  claimStreak(): boolean;
  catchMeteor(): Decimal | null;
  catchComet(): CometReward | null;
  buyOffer(index: number): boolean;
  shieldStorm(): boolean;
  setManager(tier: ResourceId, patch: Partial<ManagerConfig>): void;
  setAutoUpgrades(v: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  setTutorial(step: number, done?: boolean): void;
  dismissOffline(): void;
  replaceState(state: GameState): void;
  resetAll(): void;

  debugSetSpeed(v: number): void;
  debugAddResources(exp: number): void;
  debugSkip(seconds: number): void;
  debugAddStardust(n: number): void;
  debugAddSingularities(n: number): void;
  debugEvent(type: 'meteors' | 'comet' | 'merchant' | 'storm'): void;
  debugUnlockResearch(): void;
}

const initial = createInitialState();
const initialMods = computeModifiers(initial);

export const useGame = create<GameStore>()(
  immer((set, get) => {
    /** Runs a mutation with an event context, then dispatches collected events. */
    function mutate<T>(fn: (s: GameState, ctx: StepContext) => T): T {
      const events: GameEvent[] = [];
      let out!: T;
      set((st) => {
        out = fn(st.game, { emit: (e) => events.push(e) });
        st.mods = computeModifiers(st.game);
      });
      if (events.length) dispatch(events);
      return out;
    }

    let missionCheck = 0;

    return {
      game: initial,
      rates: emptyRates(initial, initialMods),
      mods: initialMods,
      ready: false,
      debugSpeed: 1,
      offline: null,

      hydrate(state, offlineSeconds) {
        let summary: OfflineSummary | null = null;
        if (offlineSeconds >= 60) summary = simulateOffline(state, offlineSeconds);
        state.lastSeen = Date.now();
        refreshMissions(state, Date.now());
        const mods = computeModifiers(state);
        syncShips(state, mods);
        set((st) => {
          st.game = state;
          st.mods = mods;
          st.rates = emptyRates(state, mods);
          st.ready = true;
          st.offline = summary && summary.simulated >= 60 ? summary : null;
        });
      },

      advance(realSeconds) {
        if (realSeconds <= 0) return;
        if (realSeconds > 60) {
          // The app was suspended: catch up with the offline simulation.
          let summary: OfflineSummary | null = null;
          set((st) => {
            summary = simulateOffline(st.game, realSeconds);
            st.game.lastSeen = Date.now();
            st.mods = computeModifiers(st.game);
            st.offline = summary;
          });
          return;
        }
        const gameSeconds = realSeconds * get().debugSpeed;
        const n = Math.min(50, Math.max(1, Math.round(gameSeconds / 0.1)));
        const dt = gameSeconds / n;
        const events: GameEvent[] = [];
        const ctx: StepContext = { emit: (e) => events.push(e) };
        set((st) => {
          let res = null;
          for (let i = 0; i < n; i++) res = step(st.game, dt, ctx, Date.now());
          if (res) {
            st.rates = res.rates;
            st.mods = computeModifiers(st.game);
          }
          st.game.lastSeen = Date.now();
          missionCheck += realSeconds;
          if (missionCheck > 5) {
            missionCheck = 0;
            refreshMissions(st.game, Date.now());
          }
        });
        if (events.length) dispatch(events);
      },

      tap: () => mutate((s, ctx) => tap(s, computeModifiers(s), get().rates.flows[0].out, ctx)),
      buyBuilding: (id) =>
        mutate((s, ctx) => buyBuilding(s, computeModifiers(s), id, s.settings.buyAmount, ctx)),
      buyUpgrade: (id) => mutate((s) => buyUpgrade(s, computeModifiers(s), id)),
      buyAllUpgrades: () =>
        mutate((s) => {
          let n = 0;
          const list = UPGRADES.filter((u) => !s.upgrades[u.id]).sort(
            (a, b) => a.cost.amount - b.cost.amount,
          );
          for (const u of list) {
            const mods = computeModifiers(s);
            if (canBuyUpgrade(s, mods, u) && buyUpgrade(s, mods, u.id)) n++;
          }
          return n;
        }),
      setBuyAmount: (m) => mutate((s) => void (s.settings.buyAmount = m)),
      setThrottle: (tier, v) => mutate((s) => void (s.throttle[tier] = Math.max(0, Math.min(1, v)))),
      startResearch: (id) => mutate((s) => startResearch(s, computeModifiers(s), id)),
      cancelResearch: (id) => mutate((s) => cancelQueued(s, id)),
      colonize: (p) => mutate((s) => colonize(s, computeModifiers(s), p)),
      levelPlanet: (p, max) =>
        mutate((s) => {
          let ok = levelPlanet(s, p);
          if (ok && max) while (levelPlanet(s, p)) ok = true;
          return ok;
        }),
      supernova: () => mutate((s) => doSupernova(s, computeModifiers(s), Date.now())),
      blackHole: () => mutate((s) => doBlackHole(s, computeModifiers(s), Date.now())),
      buyTalent: (id) => mutate((s) => buyTalent(s, id)),
      respecTalents: () => mutate((s) => respecTalents(s)),
      buySingularity: (id) => mutate((s) => buySingularity(s, id)),
      startChallenge: (id) => mutate((s) => startChallenge(s, computeModifiers(s), id, Date.now())),
      abandonChallenge: () => mutate((s) => abandonChallenge(s)),
      equip: (id) => mutate((s) => equipArtifact(s, computeModifiers(s), id)),
      unequip: (id) => mutate((s) => unequipArtifact(s, id)),
      clearNewArtifacts: () => mutate((s) => void (s.artifacts.newIds = [])),
      launchExpedition: (i, dest) => mutate((s) => launchExpedition(s, computeModifiers(s), i, dest)),
      claimExpedition: (i) =>
        mutate((s, ctx) => claimExpedition(s, computeModifiers(s), get().rates, i, ctx)),
      activateBoost: (id) => mutate((s) => activateBoost(s, computeModifiers(s), get().rates, id) !== false),
      spendToken: (id) => mutate((s) => spendBoostToken(s, id)),
      claimMission: (period, i) =>
        mutate((s) => claimMission(s, computeModifiers(s), get().rates, period, i)),
      claimStreak: () => mutate((s) => claimStreak(s, computeModifiers(s), get().rates)),
      catchMeteor: () => mutate((s, ctx) => catchMeteor(s, computeModifiers(s), get().rates, ctx)),
      catchComet: () => mutate((s) => catchComet(s, computeModifiers(s), get().rates)),
      buyOffer: (i) => mutate((s, ctx) => buyOffer(s, computeModifiers(s), i, ctx)),
      shieldStorm: () => mutate((s) => shieldStorm(s)),
      setManager: (tier, patch) => mutate((s) => void Object.assign(s.managers[tier], patch)),
      setAutoUpgrades: (v) => mutate((s) => void (s.autoUpgrades = v)),
      updateSettings: (patch) => mutate((s) => void Object.assign(s.settings, patch)),
      setTutorial: (stepN, done) =>
        mutate((s) => {
          s.tutorial.step = stepN;
          if (done !== undefined) s.tutorial.done = done;
        }),
      dismissOffline: () => set((st) => void (st.offline = null)),
      replaceState: (state) => {
        const mods = computeModifiers(state);
        set((st) => {
          st.game = state;
          st.mods = mods;
          st.rates = emptyRates(state, mods);
        });
      },
      resetAll: () => {
        const settings = get().game.settings;
        const fresh = createInitialState();
        fresh.settings = { ...settings };
        refreshMissions(fresh, Date.now());
        get().replaceState(fresh);
      },

      debugSetSpeed: (v) => set((st) => void (st.debugSpeed = v)),
      debugAddResources: (exp) =>
        mutate((s) => {
          for (const r of RESOURCE_IDS) {
            const v = Decimal.pow(10, exp);
            s.resources[r] = s.resources[r].add(v);
            s.run.produced[r] = s.run.produced[r].add(v);
            s.stats.produced[r] = s.stats.produced[r].add(v);
          }
        }),
      debugSkip: (seconds) => {
        set((st) => {
          st.offline = simulateOffline(st.game, seconds);
          st.mods = computeModifiers(st.game);
        });
      },
      debugAddStardust: (n) =>
        mutate((s) => {
          s.prestige.stardust = s.prestige.stardust.add(n);
          s.prestige.stardustTotal = s.prestige.stardustTotal.add(n);
          s.prestige.stardustCycle = s.prestige.stardustCycle.add(n);
        }),
      debugAddSingularities: (n) =>
        mutate((s) => {
          s.prestige.singularities = s.prestige.singularities.add(n);
          s.prestige.singularitiesTotal = s.prestige.singularitiesTotal.add(n);
        }),
      debugEvent: (type) => mutate((s, ctx) => startEvent(s, get().rates, type, ctx)),
      debugUnlockResearch: () =>
        mutate((s) => {
          for (const r of RESEARCH) s.research.done[r.id] = true;
          s.research.active = [];
          s.research.queue = [];
        }),
    };
  }),
);
