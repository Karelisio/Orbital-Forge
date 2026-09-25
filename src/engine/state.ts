import { BUILDINGS } from '../config/buildings';
import type { BoostId } from '../config/boosts';
import { PLANET_IDS, RESOURCE_IDS, type PlanetId, type ResourceId } from '../config/types';
import { Decimal } from '../economy/decimal';

export type Notation = 'short' | 'scientific' | 'engineering';
export type Lang = 'fr' | 'en';
export type BuyAmount = 1 | 10 | 100 | 'next' | 'max';
export type ManagerMode = 'cheapest' | 'roi' | 'target';

export type ResMap = Record<ResourceId, Decimal>;
export type PlanetResMap = Record<PlanetId, Decimal>;

export interface ManagerConfig {
  enabled: boolean;
  mode: ManagerMode;
  target: string | null;
  /** Fraction of the currency kept in reserve (0..0.95). */
  reserve: number;
}

export interface ResearchSlot {
  id: string;
  /** Remaining seconds at speed 1. */
  remaining: number;
}

export interface ExpeditionSlot {
  dest: string;
  remaining: number;
  duration: number;
  seed: number;
}

export interface MissionState {
  id: string;
  baseline: number;
  claimed: boolean;
}

export type ActiveEvent =
  | { type: 'meteors'; remaining: number; spawned: number; caught: number }
  | { type: 'comet'; remaining: number }
  | { type: 'merchant'; remaining: number; offers: MerchantOffer[] }
  | { type: 'storm'; remaining: number; shielded: boolean };

export type MerchantOffer =
  | { kind: 'artifact'; res: ResourceId; amount: string; bought: boolean }
  | { kind: 'overdrive'; res: ResourceId; amount: string; bought: boolean }
  | { kind: 'swap'; from: ResourceId; to: ResourceId; amount: string; gain: string; bought: boolean };

export interface HistorySample {
  t: number;
  /** log10 of net production/s per tier. */
  rates: number[];
  stardust: number;
}

export interface PrestigeRecord {
  kind: 'supernova' | 'blackhole';
  at: number;
  duration: number;
  gain: string;
  challenge: string | null;
}

export interface Settings {
  lang: Lang;
  notation: Notation;
  musicVolume: number;
  sfxVolume: number;
  haptics: boolean;
  notifications: boolean;
  oled: boolean;
  textScale: number;
  reduceMotion: boolean;
  lowQuality: boolean;
  immersive: boolean;
  keepAwake: boolean;
  buyAmount: BuyAmount;
  autoSupernova: boolean;
  autoSupernovaMult: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  /** Wall-clock ms of the last simulated instant. */
  lastSeen: number;
  seed: number;

  resources: ResMap;
  planetRes: PlanetResMap;
  buildings: Record<string, number>;
  throttle: Record<ResourceId, number>;
  upgrades: Record<string, boolean>;
  planets: Record<PlanetId, number>;

  research: { done: Record<string, boolean>; active: ResearchSlot[]; queue: string[] };
  expeditions: { ships: (ExpeditionSlot | null)[]; pendingLoot: string[] };
  artifacts: { owned: Record<string, number>; equipped: string[]; newIds: string[] };
  achievements: Record<string, boolean>;
  challenges: { active: string | null; completions: Record<string, number> };

  prestige: {
    stardust: Decimal;
    /** Stardust earned since the last black hole (drives singularity gain). */
    stardustCycle: Decimal;
    stardustTotal: Decimal;
    talents: Record<string, number>;
    supernovas: number;
    singularities: Decimal;
    singularitiesTotal: Decimal;
    singUpgrades: Record<string, number>;
    blackHoles: number;
    history: PrestigeRecord[];
    bestStardustRate: number;
  };

  run: {
    time: number;
    produced: ResMap;
    sinceLastPurchase: number;
    longestNoPurchase: number;
  };

  events: { next: number; active: ActiveEvent | null; frenzy: number };
  boosts: Record<BoostId, { active: number; cooldown: number }>;
  boostTokens: number;

  missions: {
    day: string;
    week: string;
    daily: MissionState[];
    weekly: MissionState[];
    streak: number;
    lastLoginDay: string;
    streakClaimed: boolean;
  };

  managers: Record<ResourceId, ManagerConfig>;
  autoUpgrades: boolean;

  combo: { count: number; timer: number };

  stats: {
    taps: number;
    crits: number;
    maxCombo: number;
    playTime: number;
    buildingsBought: number;
    upgradesBought: number;
    eventsCaught: number;
    meteors: number;
    expeditionsDone: number;
    researchDone: number;
    artifactsFound: number;
    missionsDone: number;
    challengesDone: number;
    maxStreak: number;
    produced: ResMap;
    tapProduced: Decimal;
    history: HistorySample[];
    sampleTimer: number;
  };

  timers: { achievements: number; managers: number };
  tutorial: { step: number; done: boolean };
  settings: Settings;
}

export function resMap(v: number | Decimal = 0): ResMap {
  const d = v instanceof Decimal ? v : new Decimal(v);
  return Object.fromEntries(RESOURCE_IDS.map((r) => [r, d])) as ResMap;
}

export function planetResMap(): PlanetResMap {
  return Object.fromEntries(PLANET_IDS.map((p) => [p, new Decimal(0)])) as PlanetResMap;
}

export function defaultSettings(): Settings {
  return {
    lang: 'fr',
    notation: 'short',
    musicVolume: 0.4,
    sfxVolume: 0.7,
    haptics: true,
    notifications: true,
    oled: false,
    textScale: 1,
    reduceMotion: false,
    lowQuality: false,
    immersive: false,
    keepAwake: false,
    buyAmount: 1,
    autoSupernova: false,
    autoSupernovaMult: 2,
  };
}

function defaultManagers(): Record<ResourceId, ManagerConfig> {
  return Object.fromEntries(
    RESOURCE_IDS.map((r) => [r, { enabled: false, mode: 'roi', target: null, reserve: 0 }]),
  ) as Record<ResourceId, ManagerConfig>;
}

export const SAVE_VERSION = 1;

export function createInitialState(
  now: number = Date.now(),
  seed: number = (now % 2147483647) | 0,
): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeen: now,
    seed: seed || 1,
    resources: resMap(),
    planetRes: planetResMap(),
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])),
    throttle: Object.fromEntries(RESOURCE_IDS.map((r) => [r, 1])) as Record<ResourceId, number>,
    upgrades: {},
    planets: Object.fromEntries(PLANET_IDS.map((p) => [p, 0])) as Record<PlanetId, number>,
    research: { done: {}, active: [], queue: [] },
    expeditions: { ships: [null], pendingLoot: [] },
    artifacts: { owned: {}, equipped: [], newIds: [] },
    achievements: {},
    challenges: { active: null, completions: {} },
    prestige: {
      stardust: new Decimal(0),
      stardustCycle: new Decimal(0),
      stardustTotal: new Decimal(0),
      talents: {},
      supernovas: 0,
      singularities: new Decimal(0),
      singularitiesTotal: new Decimal(0),
      singUpgrades: {},
      blackHoles: 0,
      history: [],
      bestStardustRate: 0,
    },
    run: { time: 0, produced: resMap(), sinceLastPurchase: 0, longestNoPurchase: 0 },
    events: { next: 90, active: null, frenzy: 0 },
    boosts: {
      overdrive: { active: 0, cooldown: 0 },
      frenzy: { active: 0, cooldown: 0 },
      warp: { active: 0, cooldown: 0 },
    },
    boostTokens: 0,
    missions: {
      day: '',
      week: '',
      daily: [],
      weekly: [],
      streak: 0,
      lastLoginDay: '',
      streakClaimed: true,
    },
    managers: defaultManagers(),
    autoUpgrades: false,
    combo: { count: 0, timer: 0 },
    stats: {
      taps: 0,
      crits: 0,
      maxCombo: 0,
      playTime: 0,
      buildingsBought: 0,
      upgradesBought: 0,
      eventsCaught: 0,
      meteors: 0,
      expeditionsDone: 0,
      researchDone: 0,
      artifactsFound: 0,
      missionsDone: 0,
      challengesDone: 0,
      maxStreak: 0,
      produced: resMap(),
      tapProduced: new Decimal(0),
      history: [],
      sampleTimer: 0,
    },
    timers: { achievements: 0, managers: 0 },
    tutorial: { step: 0, done: false },
    settings: defaultSettings(),
  };
}
