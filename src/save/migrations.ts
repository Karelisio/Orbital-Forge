import { SAVE_VERSION } from '../engine/state';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

function obj(v: Json | undefined): Obj {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/**
 * Migration from version N to N+1, operating on the raw JSON (Decimals are still tagged objects).
 * Add a new entry for each schema change and bump SAVE_VERSION.
 */
export const MIGRATIONS: Record<number, (d: Obj) => Obj> = {
  // v0 = prototype format: flat `ore`/`metal` numbers and `stardust` at the root.
  0: (d) => {
    const resources = obj(d.resources);
    for (const key of ['ore', 'metal', 'alloy'] as const) {
      const v = d[key];
      if (typeof v === 'number' || typeof v === 'string') {
        resources[key] = { __d: String(v) };
        delete d[key];
      }
    }
    d.resources = resources;
    const prestige = obj(d.prestige);
    if (d.stardust !== undefined) {
      prestige.stardust = { __d: String(d.stardust) };
      prestige.stardustTotal = { __d: String(d.stardust) };
      delete d.stardust;
    }
    d.prestige = prestige;
    d.version = 1;
    return d;
  },
};

export function migrate(raw: Json): Json {
  let d = obj(raw);
  let v = typeof d.version === 'number' ? d.version : 0;
  if (v > SAVE_VERSION) throw new Error(`save-from-future:${v}`);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`missing-migration:${v}`);
    d = m(d);
    v++;
    d.version = v;
  }
  return d;
}
