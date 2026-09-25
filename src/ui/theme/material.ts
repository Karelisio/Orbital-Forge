/**
 * Material You (Material 3) dark color scheme generated from a seed color.
 * Tonal palettes are approximated in HSL: tone T maps to lightness T %, with chroma reduced for secondary and
 * neutral palettes, which is close enough to M3 for UI surfaces and accents.
 */

export const DEFAULT_SEED = '#6750a4';
export const SEED_SWATCHES = ['#6750a4', '#0061a4', '#006a60', '#386a20', '#8f4c00', '#b3261e', '#984061'];

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : parseInt(DEFAULT_SEED.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hh < 60
      ? [c, x, 0]
      : hh < 120
        ? [x, c, 0]
        : hh < 180
          ? [0, c, x]
          : hh < 240
            ? [0, x, c]
            : hh < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Returns a tone (0–100) of a palette with the given hue and saturation. */
function tone(h: number, s: number, t: number): string {
  return hslToHex(h, s, t / 100);
}

export interface MaterialScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  surface: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
}

export function materialScheme(seed: string): MaterialScheme {
  const { h, s } = hexToHsl(seed);
  const ps = Math.max(0.35, Math.min(0.75, s));
  const ss = ps * 0.3;
  const ns = 0.06;
  const nvs = 0.12;
  return {
    primary: tone(h, ps, 80),
    onPrimary: tone(h, ps, 20),
    primaryContainer: tone(h, ps, 30),
    onPrimaryContainer: tone(h, ps, 90),
    secondary: tone(h, ss, 80),
    secondaryContainer: tone(h, ss, 30),
    onSecondaryContainer: tone(h, ss, 90),
    tertiary: tone(h + 60, ps * 0.8, 80),
    surface: tone(h, ns, 6),
    surfaceContainerLow: tone(h, ns, 10),
    surfaceContainer: tone(h, ns, 12),
    surfaceContainerHigh: tone(h, ns, 17),
    surfaceContainerHighest: tone(h, ns, 22),
    onSurface: tone(h, ns, 90),
    onSurfaceVariant: tone(h, nvs, 80),
    outline: tone(h, nvs, 60),
    outlineVariant: tone(h, nvs, 30),
    error: '#ffb4ab',
  };
}

/** CSS custom properties consumed by theme.css (shared names with the neon theme where possible). */
export function materialCssVars(seed: string, oled: boolean): Record<string, string> {
  const m = materialScheme(seed);
  return {
    '--bg': oled ? '#000000' : m.surface,
    '--bg2': oled ? '#000000' : m.surface,
    '--panel': m.surfaceContainer,
    '--panel-solid': m.surfaceContainerLow,
    '--panel-hi': m.surfaceContainerHigh,
    '--border': m.outlineVariant,
    '--border-strong': m.outline,
    '--text': m.onSurface,
    '--muted': m.onSurfaceVariant,
    '--cyan': m.primary,
    '--magenta': m.tertiary,
    '--violet': m.secondary,
    '--danger': m.error,
    '--on-primary': m.onPrimary,
    '--primary-container': m.primaryContainer,
    '--on-primary-container': m.onPrimaryContainer,
    '--secondary-container': m.secondaryContainer,
    '--on-secondary-container': m.onSecondaryContainer,
    '--surface-highest': m.surfaceContainerHighest,
  };
}

export const MATERIAL_VAR_NAMES = Object.keys(materialCssVars(DEFAULT_SEED, false));
