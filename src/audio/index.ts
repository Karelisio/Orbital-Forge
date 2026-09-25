import { Howl, Howler } from 'howler';
import { AmbientMusic } from './music';
import { SFX_RECIPES, toWavDataUri, type SfxId } from './synth';

const sounds = new Map<SfxId, Howl>();
let sfxVolume = 0.7;
let unlocked = false;
const music = new AmbientMusic(() => (Howler.ctx as AudioContext | undefined) ?? null);
const lastPlay = new Map<SfxId, number>();

function ensure(id: SfxId): Howl {
  let h = sounds.get(id);
  if (!h) {
    h = new Howl({
      src: [toWavDataUri(SFX_RECIPES[id]())],
      format: ['wav'],
      volume: 1,
      pool: id === 'tap' ? 8 : 3,
    });
    sounds.set(id, h);
  }
  return h;
}

/** Pre-renders every sound effect (call once after the first frame). */
export function preloadSounds(): void {
  for (const id of Object.keys(SFX_RECIPES) as SfxId[]) ensure(id);
}

export function playSfx(id: SfxId, opts: { rate?: number; volume?: number } = {}): void {
  if (sfxVolume <= 0) return;
  const now = performance.now();
  const minGap = id === 'tap' ? 30 : 60;
  if (now - (lastPlay.get(id) ?? 0) < minGap) return;
  lastPlay.set(id, now);
  const h = ensure(id);
  const sid = h.play();
  h.volume(sfxVolume * (opts.volume ?? 1), sid);
  if (opts.rate) h.rate(opts.rate, sid);
}

export function setSfxVolume(v: number): void {
  sfxVolume = v;
}

export function setMusicVolume(v: number): void {
  music.setVolume(v);
}

/** Browsers require a user gesture before audio can start. */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  const ctx = Howler.ctx as AudioContext | undefined;
  if (ctx && ctx.state === 'suspended') void ctx.resume();
  music.start();
}

export function pauseAudio(paused: boolean): void {
  const ctx = Howler.ctx as AudioContext | undefined;
  if (!ctx) return;
  if (paused) {
    music.stop();
    void ctx.suspend();
  } else {
    void ctx.resume().then(() => {
      if (unlocked) music.start();
    });
  }
}

export type { SfxId };
