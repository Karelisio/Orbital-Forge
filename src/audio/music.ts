/** Procedural ambient space music built from Web Audio nodes: slow pads, a sub drone and sparse pentatonic plucks. */

const CHORDS = [
  [0, 7, 12, 16],
  [-3, 4, 9, 12],
  [-7, 0, 5, 9],
  [-5, 2, 7, 11],
];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19];

export class AmbientMusic {
  private master: GainNode | null = null;
  private delay: DelayNode | null = null;
  private timer: number | null = null;
  private chordIndex = 0;
  private volume = 0.4;
  private running = false;

  constructor(private getCtx: () => AudioContext | null) {}

  private setup(ctx: AudioContext): void {
    if (this.master) return;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.45;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.42;
    this.delay.connect(feedback).connect(this.delay);
    this.delay.connect(filter);
    this.master.connect(filter).connect(ctx.destination);
    this.master.connect(this.delay);
  }

  setVolume(v: number): void {
    this.volume = v;
    const ctx = this.getCtx();
    if (this.master && ctx)
      this.master.gain.setTargetAtTime(this.running ? v * 0.35 : 0, ctx.currentTime, 0.5);
    if (v <= 0) this.stop();
    else if (!this.running) this.start();
  }

  start(): void {
    const ctx = this.getCtx();
    if (!ctx || this.running || this.volume <= 0) return;
    this.setup(ctx);
    this.running = true;
    this.master!.gain.setTargetAtTime(this.volume * 0.35, ctx.currentTime, 2);
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 8000);
  }

  stop(): void {
    const ctx = this.getCtx();
    this.running = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (this.master && ctx) this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
  }

  private note(
    ctx: AudioContext,
    semi: number,
    start: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = 220 * Math.pow(2, semi / 12);
    o.detune.value = (Math.random() - 0.5) * 12;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + Math.min(2.5, dur / 3));
    g.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(g).connect(this.master!);
    o.start(start);
    o.stop(start + dur + 0.1);
  }

  private tick(): void {
    const ctx = this.getCtx();
    if (!ctx || !this.master || !this.running || ctx.state !== 'running') return;
    const now = ctx.currentTime + 0.05;
    const chord = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex++;
    for (const s of chord) {
      this.note(ctx, s - 12, now, 9, 'triangle', 0.05);
      this.note(ctx, s, now + 0.2, 8.5, 'sine', 0.03);
    }
    this.note(ctx, chord[0] - 24, now, 9, 'sine', 0.08);
    const plucks = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < plucks; i++) {
      const semi = PENTA[Math.floor(Math.random() * PENTA.length)] + chord[0];
      this.note(ctx, semi + 12, now + 0.5 + Math.random() * 7, 1.2, 'sine', 0.04);
    }
  }
}
