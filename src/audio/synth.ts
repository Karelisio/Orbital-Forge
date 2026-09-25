/** Procedural sound synthesis: renders short PCM buffers and encodes them as WAV data URIs for Howler. */

const RATE = 22050;

type Wave = 'sine' | 'square' | 'saw' | 'triangle' | 'noise';

interface Voice {
  wave: Wave;
  /** Start / end frequency in Hz (exponential glide). */
  f0: number;
  f1?: number;
  start?: number;
  dur: number;
  gain?: number;
  attack?: number;
  /** Exponential decay speed (higher = shorter tail). */
  decay?: number;
}

function osc(wave: Wave, phase: number, seed: { v: number }): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'saw':
      return 2 * p - 1;
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'noise':
      seed.v = (seed.v * 1103515245 + 12345) & 0x7fffffff;
      return (seed.v / 0x7fffffff) * 2 - 1;
  }
}

export function render(voices: Voice[], length?: number): Float32Array {
  const total = length ?? Math.max(...voices.map((v) => (v.start ?? 0) + v.dur));
  const out = new Float32Array(Math.ceil(total * RATE));
  const seed = { v: 12345 };
  for (const v of voices) {
    const start = Math.floor((v.start ?? 0) * RATE);
    const n = Math.floor(v.dur * RATE);
    const f1 = v.f1 ?? v.f0;
    const attack = Math.max(1, Math.floor((v.attack ?? 0.005) * RATE));
    const decay = v.decay ?? 6;
    const gain = v.gain ?? 0.5;
    let phase = 0;
    for (let i = 0; i < n && start + i < out.length; i++) {
      const t = i / n;
      const f = v.f0 * Math.pow(f1 / v.f0, t);
      phase += f / RATE;
      const env = (i < attack ? i / attack : 1) * Math.exp(-decay * t);
      out[start + i] += osc(v.wave, phase, seed) * env * gain;
    }
  }
  // Soft clip.
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i]);
  return out;
}

export function toWavDataUri(samples: Float32Array): string {
  const bytes = 44 + samples.length * 2;
  const buf = new ArrayBuffer(bytes);
  const dv = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  dv.setUint32(4, bytes - 8, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, RATE, true);
  dv.setUint32(28, RATE * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  w(36, 'data');
  dv.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  }
  const u8 = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export type SfxId =
  | 'tap'
  | 'crit'
  | 'buy'
  | 'upgrade'
  | 'error'
  | 'achievement'
  | 'prestige'
  | 'blackhole'
  | 'event'
  | 'meteor'
  | 'comet'
  | 'research'
  | 'artifact'
  | 'click';

const NOTE = (semi: number) => 440 * Math.pow(2, semi / 12);

export const SFX_RECIPES: Record<SfxId, () => Float32Array> = {
  tap: () =>
    render([
      { wave: 'noise', f0: 1, dur: 0.05, gain: 0.25, decay: 20 },
      { wave: 'sine', f0: 320, f1: 140, dur: 0.09, gain: 0.6, decay: 10 },
    ]),
  crit: () =>
    render([
      { wave: 'noise', f0: 1, dur: 0.12, gain: 0.35, decay: 12 },
      { wave: 'square', f0: 880, f1: 1760, dur: 0.12, gain: 0.18, decay: 6 },
      { wave: 'sine', f0: 220, f1: 90, dur: 0.25, gain: 0.7, decay: 8 },
    ]),
  buy: () =>
    render([
      { wave: 'triangle', f0: NOTE(3), dur: 0.07, gain: 0.45, decay: 5 },
      { wave: 'triangle', f0: NOTE(10), dur: 0.1, start: 0.05, gain: 0.45, decay: 6 },
    ]),
  upgrade: () =>
    render(
      [0, 4, 7, 12].map((s, i) => ({
        wave: 'triangle' as const,
        f0: NOTE(s + 3),
        dur: 0.14,
        start: i * 0.05,
        gain: 0.35,
        decay: 5,
      })),
    ),
  error: () => render([{ wave: 'square', f0: 140, f1: 110, dur: 0.18, gain: 0.25, decay: 4 }]),
  achievement: () =>
    render(
      [0, 7, 12, 16, 19].map((s, i) => ({
        wave: 'sine' as const,
        f0: NOTE(s + 8),
        dur: 0.5,
        start: i * 0.07,
        gain: 0.3,
        decay: 4,
      })),
    ),
  prestige: () =>
    render([
      { wave: 'noise', f0: 1, dur: 1.6, gain: 0.35, attack: 0.6, decay: 3 },
      { wave: 'saw', f0: 55, f1: 440, dur: 1.4, gain: 0.25, attack: 0.3, decay: 2 },
      { wave: 'sine', f0: NOTE(-9), dur: 1.8, start: 0.6, gain: 0.5, decay: 2 },
      { wave: 'sine', f0: NOTE(-2), dur: 1.8, start: 0.6, gain: 0.35, decay: 2 },
      { wave: 'sine', f0: NOTE(3), dur: 1.8, start: 0.6, gain: 0.3, decay: 2 },
    ]),
  blackhole: () =>
    render([
      { wave: 'sine', f0: 400, f1: 30, dur: 2.2, gain: 0.8, attack: 0.1, decay: 1.5 },
      { wave: 'noise', f0: 1, dur: 2, gain: 0.25, attack: 0.8, decay: 2 },
      { wave: 'saw', f0: 60, f1: 30, dur: 2, gain: 0.2, decay: 1.2 },
    ]),
  event: () =>
    render([
      { wave: 'square', f0: NOTE(12), dur: 0.12, gain: 0.15, decay: 3 },
      { wave: 'square', f0: NOTE(7), dur: 0.12, start: 0.14, gain: 0.15, decay: 3 },
      { wave: 'square', f0: NOTE(12), dur: 0.2, start: 0.28, gain: 0.15, decay: 3 },
    ]),
  meteor: () =>
    render([
      { wave: 'noise', f0: 1, dur: 0.18, gain: 0.4, decay: 9 },
      { wave: 'sine', f0: 600, f1: 1200, dur: 0.12, gain: 0.3, decay: 6 },
    ]),
  comet: () =>
    render(
      [0, 4, 7, 11, 14, 19].map((s, i) => ({
        wave: 'sine' as const,
        f0: NOTE(s + 12),
        dur: 0.35,
        start: i * 0.04,
        gain: 0.25,
        decay: 5,
      })),
    ),
  research: () =>
    render([
      { wave: 'sine', f0: NOTE(0), dur: 0.3, gain: 0.35, decay: 4 },
      { wave: 'sine', f0: NOTE(7), dur: 0.4, start: 0.1, gain: 0.35, decay: 4 },
    ]),
  artifact: () =>
    render(
      [0, 3, 7, 10, 15].map((s, i) => ({
        wave: 'triangle' as const,
        f0: NOTE(s + 5),
        dur: 0.6,
        start: i * 0.09,
        gain: 0.3,
        decay: 3,
      })),
    ),
  click: () => render([{ wave: 'sine', f0: 900, f1: 700, dur: 0.03, gain: 0.25, decay: 10 }]),
};
