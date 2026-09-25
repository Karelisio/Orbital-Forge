import type { GameState } from '../engine/state';
import { unwrap, wrap } from './serialize';

export interface KVBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const MAIN_KEY = 'of_save_main';
export const BACKUP_KEY = 'of_save_backup';

export class MemoryBackend implements KVBackend {
  data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
  async remove(key: string) {
    this.data.delete(key);
  }
}

export type LoadSource = 'main' | 'backup' | 'new';

export interface LoadResult {
  state: GameState | null;
  source: LoadSource;
  error?: string;
}

/**
 * Two-slot save: the main slot is written every autosave; the previous valid main slot is copied into the
 * backup slot periodically. Loading falls back to the backup when the main slot is corrupted.
 */
export class SaveManager {
  private writes = 0;
  constructor(
    private backend: KVBackend,
    private backupEvery = 6,
  ) {}

  async save(s: GameState, now = Date.now()): Promise<void> {
    const text = wrap(s, now);
    if (this.writes % this.backupEvery === 0) {
      const prev = await this.backend.get(MAIN_KEY);
      if (prev && this.isValid(prev)) await this.backend.set(BACKUP_KEY, prev);
      else await this.backend.set(BACKUP_KEY, text);
    }
    this.writes++;
    await this.backend.set(MAIN_KEY, text);
  }

  private isValid(text: string): boolean {
    try {
      unwrap(text);
      return true;
    } catch {
      return false;
    }
  }

  async load(now = Date.now()): Promise<LoadResult> {
    let error: string | undefined;
    for (const [key, source] of [
      [MAIN_KEY, 'main'],
      [BACKUP_KEY, 'backup'],
    ] as const) {
      const text = await this.backend.get(key);
      if (!text) continue;
      try {
        return { state: unwrap(text, now), source, error };
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    }
    return { state: null, source: 'new', error };
  }

  async wipe(): Promise<void> {
    await this.backend.remove(MAIN_KEY);
    await this.backend.remove(BACKUP_KEY);
    this.writes = 0;
  }
}
