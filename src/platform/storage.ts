import { Preferences } from '@capacitor/preferences';
import type { KVBackend } from '../save/storage';

/** SharedPreferences on Android, localStorage on the web. */
export class PreferencesBackend implements KVBackend {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
