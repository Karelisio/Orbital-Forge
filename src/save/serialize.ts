import { Decimal } from '../economy/decimal';
import { createInitialState, type GameState } from '../engine/state';
import { migrate } from './migrations';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const DEC = '__d';

/** Converts the state to plain JSON, tagging Decimals. */
export function toPlain(v: unknown): Json {
  if (v instanceof Decimal) return { [DEC]: v.toString() };
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === 'object') {
    const out: Record<string, Json> = {};
    for (const [k, val] of Object.entries(v)) if (val !== undefined) out[k] = toPlain(val);
    return out;
  }
  if (typeof v === 'number' && !Number.isFinite(v)) return 0;
  return v as Json;
}

export function fromPlain(v: Json): unknown {
  if (Array.isArray(v)) return v.map(fromPlain);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === DEC) return new Decimal(v[DEC] as string);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = fromPlain(val);
    return out;
  }
  return v;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Decimal);
}

/**
 * Deep-merges loaded data onto defaults: missing keys get default values, type mismatches are ignored.
 * Maps whose defaults are empty (e.g. upgrades) accept any key.
 */
export function mergeDefaults<T>(defaults: T, loaded: unknown): T {
  if (defaults instanceof Decimal) {
    if (loaded instanceof Decimal && Number.isFinite(loaded.mantissa)) return loaded as T;
    if (typeof loaded === 'number' || typeof loaded === 'string') {
      const d = new Decimal(loaded);
      return (Number.isFinite(d.mantissa) ? d : defaults) as T;
    }
    return defaults;
  }
  if (Array.isArray(defaults)) return (Array.isArray(loaded) ? loaded : defaults) as T;
  if (isPlainObject(defaults)) {
    if (!isPlainObject(loaded)) return defaults;
    const out: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(defaults), ...Object.keys(loaded)]);
    const open = Object.keys(defaults).length === 0;
    for (const k of keys) {
      if (k in defaults) out[k] = mergeDefaults((defaults as Record<string, unknown>)[k], loaded[k]);
      else if (open) out[k] = loaded[k];
    }
    return out as T;
  }
  if (loaded === undefined || loaded === null) return defaults;
  if (typeof defaults === 'number')
    return (typeof loaded === 'number' && Number.isFinite(loaded) ? loaded : defaults) as T;
  if (defaults === null) return loaded as T;
  return (typeof loaded === typeof defaults ? loaded : defaults) as T;
}

export function serializeState(s: GameState): string {
  return JSON.stringify(toPlain(s));
}

export function deserializeState(json: string, now = Date.now()): GameState {
  const raw = JSON.parse(json) as Json;
  const migrated = migrate(raw);
  const revived = fromPlain(migrated);
  const state = mergeDefaults(createInitialState(now), revived);
  // buyAmount is a number | string union: restore string modes the numeric default rejected.
  const buy =
    isPlainObject(revived) && isPlainObject(revived.settings) ? revived.settings.buyAmount : undefined;
  if (buy === 'next' || buy === 'max') state.settings.buyAmount = buy;
  else if (buy !== 1 && buy !== 10 && buy !== 100) state.settings.buyAmount = 1;
  if (state.settings.theme !== 'neon' && state.settings.theme !== 'material') state.settings.theme = 'neon';
  if (state.settings.materialSeed !== 'dynamic' && !/^#[0-9a-f]{6}$/i.test(state.settings.materialSeed)) {
    state.settings.materialSeed = 'dynamic';
  }
  return state;
}

/** FNV-1a 32-bit hash, used as a corruption check. */
export function checksum(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface SaveEnvelope {
  app: 'orbital-forge';
  v: number;
  at: number;
  sum: string;
  data: string;
}

export function wrap(s: GameState, now = Date.now()): string {
  const data = serializeState(s);
  const env: SaveEnvelope = { app: 'orbital-forge', v: s.version, at: now, sum: checksum(data), data };
  return JSON.stringify(env);
}

export class SaveError extends Error {}

export function unwrap(text: string, now = Date.now()): GameState {
  let env: SaveEnvelope;
  try {
    env = JSON.parse(text) as SaveEnvelope;
  } catch {
    throw new SaveError('invalid-json');
  }
  if (!env || env.app !== 'orbital-forge' || typeof env.data !== 'string')
    throw new SaveError('invalid-format');
  if (checksum(env.data) !== env.sum) throw new SaveError('checksum');
  return deserializeState(env.data, now);
}
