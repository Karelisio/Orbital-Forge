import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, SEED_SWATCHES, materialCssVars, materialScheme } from '../src/ui/theme/material';
import { createInitialState } from '../src/engine/state';
import { deserializeState, serializeState } from '../src/save/serialize';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('Material You scheme', () => {
  it('produces valid hex colors for every seed', () => {
    for (const seed of [DEFAULT_SEED, ...SEED_SWATCHES, '#000000', '#ffffff', 'garbage']) {
      for (const v of Object.values(materialScheme(seed))) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('keeps text readable (WCAG AA) on surfaces and primary', () => {
    for (const seed of SEED_SWATCHES) {
      const m = materialScheme(seed);
      expect(contrast(m.onSurface, m.surface)).toBeGreaterThan(4.5);
      expect(contrast(m.onSurface, m.surfaceContainer)).toBeGreaterThan(4.5);
      expect(contrast(m.onPrimary, m.primary)).toBeGreaterThan(4.5);
      expect(contrast(m.onSecondaryContainer, m.secondaryContainer)).toBeGreaterThan(4.5);
    }
  });

  it('uses pure black background in OLED mode', () => {
    expect(materialCssVars(DEFAULT_SEED, true)['--bg']).toBe('#000000');
  });

  it('theme settings default to neon and survive a save round-trip', () => {
    const s = createInitialState(0);
    expect(s.settings.theme).toBe('neon');
    s.settings.theme = 'material';
    s.settings.materialSeed = '#0061a4';
    const back = deserializeState(serializeState(s));
    expect(back.settings.theme).toBe('material');
    expect(back.settings.materialSeed).toBe('#0061a4');
  });
});
