import { registerPlugin } from '@capacitor/core';
import { isNative } from './native';

interface MaterialColorsPlugin {
  getAccent(): Promise<{ color?: string }>;
}
const MaterialColors = registerPlugin<MaterialColorsPlugin>('MaterialColors');

let cached: string | null | undefined;

/** Android 12+ dynamic color (wallpaper accent), or null when unavailable. */
export async function getSystemAccent(): Promise<string | null> {
  if (cached !== undefined) return cached;
  cached = null;
  if (isNative) {
    try {
      const { color } = await MaterialColors.getAccent();
      if (color && /^#[0-9a-f]{6}$/i.test(color)) cached = color;
    } catch {
      // Older Android or plugin missing.
    }
  }
  return cached;
}
