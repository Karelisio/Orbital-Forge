/**
 * Fixed-cadence game loop decoupled from rendering: an interval feeds wall-clock deltas to the simulation,
 * which subdivides them into fixed steps. Large gaps (app suspended) are handled as offline time by the store.
 */
export class GameLoop {
  private timer: number | null = null;
  private last = 0;
  private paused = false;

  constructor(
    private advance: (realSeconds: number) => void,
    private intervalMs = 100,
  ) {}

  start(): void {
    if (this.timer !== null) return;
    this.last = Date.now();
    this.timer = window.setInterval(() => this.frame(), this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  setPaused(p: boolean): void {
    if (this.paused === p) return;
    this.paused = p;
    // On resume the next frame sees the whole gap and the store turns it into offline progress.
    if (!p) this.frame();
  }

  private frame(): void {
    const now = Date.now();
    const dt = (now - this.last) / 1000;
    if (this.paused) return;
    this.last = now;
    if (dt > 0) this.advance(dt);
  }
}
