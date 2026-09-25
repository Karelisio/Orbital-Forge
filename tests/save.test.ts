import { describe, expect, it } from 'vitest';
import { Decimal } from '../src/economy/decimal';
import { createInitialState, SAVE_VERSION } from '../src/engine/state';
import { migrate } from '../src/save/migrations';
import { checksum, deserializeState, serializeState, unwrap, wrap } from '../src/save/serialize';
import { BACKUP_KEY, MAIN_KEY, MemoryBackend, SaveManager } from '../src/save/storage';
import { exportSave, importSave } from '../src/save/transfer';

function sample() {
  const s = createInitialState(1000);
  s.resources.ore = new Decimal('1.5e300');
  s.resources.darkMatter = new Decimal('3e12');
  s.buildings['ore_3'] = 42;
  s.upgrades['u_tap_0'] = true;
  s.prestige.stardust = new Decimal(123);
  s.expeditions.ships = [{ dest: 'belt', remaining: 10, duration: 900, seed: 5 }, null];
  s.settings.buyAmount = 'max';
  s.settings.lang = 'en';
  return s;
}

describe('serialization', () => {
  it('round-trips the full state including Decimals', () => {
    const s = sample();
    const back = deserializeState(serializeState(s));
    expect(back.resources.ore.eq(s.resources.ore)).toBe(true);
    expect(back.resources.ore).toBeInstanceOf(Decimal);
    expect(back.resources.darkMatter.toNumber()).toBe(3e12);
    expect(back.buildings['ore_3']).toBe(42);
    expect(back.upgrades['u_tap_0']).toBe(true);
    expect(back.prestige.stardust.toNumber()).toBe(123);
    expect(back.expeditions.ships).toEqual(s.expeditions.ships);
    expect(back.settings.buyAmount).toBe('max');
    expect(back.settings.lang).toBe('en');
  });

  it('fills missing fields with defaults', () => {
    const partial = JSON.stringify({ version: SAVE_VERSION, resources: { ore: { __d: '50' } } });
    const s = deserializeState(partial);
    expect(s.resources.ore.toNumber()).toBe(50);
    expect(s.resources.metal.toNumber()).toBe(0);
    expect(s.settings.notation).toBe('short');
    expect(s.buildings['metal_14']).toBe(0);
  });

  it('rejects invalid types and falls back to defaults', () => {
    const bad = JSON.stringify({
      version: SAVE_VERSION,
      stats: { taps: 'lots' },
      settings: { buyAmount: 7 },
    });
    const s = deserializeState(bad);
    expect(s.stats.taps).toBe(0);
    expect(s.settings.buyAmount).toBe(1);
  });

  it('detects corruption with the checksum', () => {
    const text = wrap(sample());
    expect(() => unwrap(text)).not.toThrow();
    const env = JSON.parse(text) as { data: string };
    env.data = env.data.replace('"ore_3":42', '"ore_3":43');
    const tampered = JSON.stringify(env);
    expect(tampered).not.toBe(text);
    expect(() => unwrap(tampered)).toThrow('checksum');
    expect(checksum('abc')).toBe(checksum('abc'));
    expect(checksum('abc')).not.toBe(checksum('abd'));
  });
});

describe('migrations', () => {
  it('migrates a v0 prototype save', () => {
    const v0 = { ore: 1234, metal: '5e10', stardust: 7 };
    const m = migrate(v0) as Record<string, unknown>;
    expect(m.version).toBe(SAVE_VERSION);
    const s = deserializeState(JSON.stringify(v0));
    expect(s.resources.ore.toNumber()).toBe(1234);
    expect(s.resources.metal.toNumber()).toBe(5e10);
    expect(s.prestige.stardust.toNumber()).toBe(7);
    expect(s.prestige.stardustTotal.toNumber()).toBe(7);
  });

  it('refuses saves from a newer version', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow('save-from-future');
  });
});

describe('dual-slot storage', () => {
  it('saves and loads from the main slot', async () => {
    const backend = new MemoryBackend();
    const mgr = new SaveManager(backend);
    await mgr.save(sample());
    const res = await mgr.load();
    expect(res.source).toBe('main');
    expect(res.state?.buildings['ore_3']).toBe(42);
  });

  it('falls back to the backup slot when main is corrupted', async () => {
    const backend = new MemoryBackend();
    const mgr = new SaveManager(backend, 1);
    const s = sample();
    await mgr.save(s);
    s.buildings['ore_3'] = 50;
    await mgr.save(s);
    await backend.set(MAIN_KEY, backend.data.get(MAIN_KEY)!.slice(0, 40));
    const res = await mgr.load();
    expect(res.source).toBe('backup');
    expect(res.state?.buildings['ore_3']).toBe(42);
    expect(res.error).toBeDefined();
  });

  it('returns a new game when both slots are unusable', async () => {
    const backend = new MemoryBackend();
    await backend.set(MAIN_KEY, 'garbage');
    await backend.set(BACKUP_KEY, '{}');
    const res = await new SaveManager(backend).load();
    expect(res.source).toBe('new');
    expect(res.state).toBeNull();
  });
});

describe('export / import', () => {
  it('round-trips through the base64 string', () => {
    const s = sample();
    const code = exportSave(s);
    expect(code.startsWith('OF1:')).toBe(true);
    const back = importSave(`  ${code}\n`);
    expect(back.resources.ore.eq(s.resources.ore)).toBe(true);
  });

  it('rejects garbage', () => {
    expect(() => importSave('OF1:!!!')).toThrow();
    expect(() => importSave('OF1:' + btoa('{"app":"x"}'))).toThrow();
  });
});
