import { Application, Container, Graphics, Sprite, Text, Texture, type Renderer } from 'pixi.js';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  active: boolean;
}

interface Floater {
  text: Text;
  vy: number;
  life: number;
  active: boolean;
}

interface Star {
  sprite: Sprite;
  speed: number;
  twinkle: number;
  phase: number;
}

interface Drone {
  sprite: Sprite;
  angle: number;
  radius: number;
  speed: number;
  tilt: number;
}

interface PlanetDot {
  sprite: Sprite;
  angle: number;
  radius: number;
  speed: number;
}

export interface SceneOptions {
  lowQuality: boolean;
  reduceMotion: boolean;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * PixiJS scene: parallax starfield, the rotating asteroid with its neon ring, orbiting drones and colonized
 * planets, pooled particles and floating numbers. Rendering is independent from the fixed-step game loop.
 */
export class OrbitalScene {
  private app: Application<Renderer> | null = null;
  private root = new Container();
  private starLayer = new Container();
  private nebulaLayer = new Container();
  private mineLayer = new Container();
  private fxLayer = new Container();
  private textLayer = new Container();
  private asteroid!: Sprite;
  private ringBack!: Graphics;
  private ringFront!: Graphics;
  private glow!: Sprite;
  private flash!: Graphics;
  private stars: Star[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private drones: Drone[] = [];
  private planets: PlanetDot[] = [];
  private dotTex!: Texture;
  private droneTex!: Texture;
  private center = { x: 0, y: 0, r: 80 };
  private bounce = 0;
  private flashAlpha = 0;
  private storm = false;
  private frenzy = false;
  private stormOverlay!: Graphics;
  private time = 0;
  private opts: SceneOptions = { lowQuality: false, reduceMotion: false };
  private destroyed = false;

  private initializing = false;

  async init(container: HTMLElement, opts: SceneOptions): Promise<void> {
    this.opts = opts;
    if (this.app || this.initializing) return;
    this.initializing = true;
    const app = new Application();
    await app.init({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: !opts.lowQuality,
      resolution: Math.min(window.devicePixelRatio || 1, opts.lowQuality ? 1 : 2),
      autoDensity: true,
      powerPreference: 'low-power',
      preference: 'webgl',
    });
    if (this.destroyed) {
      app.destroy(true);
      return;
    }
    this.app = app;
    app.canvas.style.position = 'fixed';
    app.canvas.style.inset = '0';
    app.canvas.style.pointerEvents = 'none';
    app.canvas.style.zIndex = '0';
    container.appendChild(app.canvas);
    app.ticker.maxFPS = 60;
    app.stage.addChild(this.root);
    this.root.addChild(this.nebulaLayer, this.starLayer, this.mineLayer, this.fxLayer, this.textLayer);

    this.makeTextures(app);
    this.buildStars();
    this.buildNebula();
    this.buildAsteroid(app);
    this.buildPools();

    this.flash = new Graphics();
    this.stormOverlay = new Graphics();
    this.root.addChild(this.stormOverlay, this.flash);
    this.onResize();
    if (this.lastRect) this.setAsteroidRect(...this.lastRect);
    this.setDrones(this.pendingDrones);
    this.setPlanets(this.pendingPlanets);
    window.addEventListener('resize', this.onResize);
    app.ticker.add((t) => this.update(Math.min(0.05, t.deltaMS / 1000)));
  }

  private makeTextures(app: Application<Renderer>): void {
    const dot = new Graphics();
    for (let i = 8; i >= 1; i--)
      dot.circle(0, 0, i * 2).fill({ color: 0xffffff, alpha: 0.12 + (8 - i) * 0.02 });
    dot.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 1 });
    this.dotTex = app.renderer.generateTexture(dot);
    const drone = new Graphics();
    drone.poly([0, -7, 5, 5, 0, 2, -5, 5]).fill({ color: 0xe6f1ff });
    drone.circle(0, 4, 2).fill({ color: 0x39f3ff });
    this.droneTex = app.renderer.generateTexture(drone);
  }

  private buildStars(): void {
    const r = rng(7);
    const counts = this.opts.lowQuality ? [40, 20, 10] : [90, 45, 20];
    counts.forEach((n, layer) => {
      for (let i = 0; i < n; i++) {
        const s = new Sprite(this.dotTex);
        s.anchor.set(0.5);
        const size = (0.05 + layer * 0.05 + r() * 0.05) * (layer === 2 ? 1.6 : 1);
        s.scale.set(size);
        s.x = r() * window.innerWidth;
        s.y = r() * window.innerHeight;
        s.tint = r() < 0.15 ? 0x9be7ff : r() < 0.1 ? 0xffd29b : 0xffffff;
        s.alpha = 0.4 + r() * 0.6;
        this.starLayer.addChild(s);
        this.stars.push({ sprite: s, speed: 3 + layer * 7, twinkle: 0.5 + r() * 2, phase: r() * 6 });
      }
    });
  }

  private buildNebula(): void {
    const r = rng(99);
    const colors = [0x6a00ff, 0x00b4d8, 0xff3df0];
    const n = this.opts.lowQuality ? 2 : 4;
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.dotTex);
      s.anchor.set(0.5);
      s.scale.set(6 + r() * 6);
      s.alpha = 0.06;
      s.tint = colors[i % colors.length];
      s.blendMode = 'add';
      s.x = r() * window.innerWidth;
      s.y = r() * window.innerHeight;
      this.nebulaLayer.addChild(s);
    }
  }

  private buildAsteroid(app: Application<Renderer>): void {
    const g = new Graphics();
    const r = rng(1234);
    const pts: number[] = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rad = 100 * (0.82 + r() * 0.22);
      pts.push(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.poly(pts).fill({ color: 0x4a3829 });
    // Shading: concentric lit layers shifted toward the light (top-left), always inside the silhouette.
    for (let k = 1; k <= 4; k++) {
      const f = 1 - k * 0.14;
      const off = -k * 5;
      g.poly(pts.map((v) => v * f + off)).fill({
        color: [0x5b4636, 0x6e5440, 0x80634b, 0x94765a][k - 1],
        alpha: 0.9,
      });
    }
    for (let i = 0; i < 9; i++) {
      const cx = (r() - 0.5) * 120;
      const cy = (r() - 0.5) * 120;
      const cr = 6 + r() * 14;
      g.circle(cx, cy, cr).fill({ color: 0x3a2c21, alpha: 0.8 });
      g.circle(cx - cr * 0.25, cy - cr * 0.25, cr * 0.7).fill({ color: 0x4a3a2c, alpha: 0.8 });
    }
    // Ore veins.
    for (let i = 0; i < 7; i++) {
      const cx = (r() - 0.5) * 130;
      const cy = (r() - 0.5) * 130;
      g.circle(cx, cy, 3 + r() * 3).fill({ color: 0x39f3ff, alpha: 0.9 });
    }
    const tex = app.renderer.generateTexture(g);
    this.asteroid = new Sprite(tex);
    this.asteroid.anchor.set(0.5);

    this.glow = new Sprite(this.dotTex);
    this.glow.anchor.set(0.5);
    this.glow.tint = 0x39f3ff;
    this.glow.alpha = 0.18;
    this.glow.blendMode = 'add';

    this.ringBack = new Graphics();
    this.ringFront = new Graphics();
    this.mineLayer.sortableChildren = true;
    this.glow.zIndex = 1;
    this.ringBack.zIndex = 2;
    this.asteroid.zIndex = 5;
    this.ringFront.zIndex = 8;
    this.mineLayer.addChild(this.glow, this.ringBack, this.asteroid, this.ringFront);
  }

  private ringColors: [number, number] = [0x39f3ff, 0xff3df0];

  /** Ring/glow colors (neon by default, Material You accent when that theme is active). */
  setAccent(primary: number | null, secondary: number | null): void {
    this.ringColors = [primary ?? 0x39f3ff, secondary ?? 0xff3df0];
    if (this.glow && !this.frenzy) this.glow.tint = this.ringColors[0];
    if (this.app) this.drawRing();
  }

  private drawRing(): void {
    const { r } = this.center;
    const rx = r * 1.55;
    const ry = r * 0.42;
    for (const [g, from, to] of [
      [this.ringBack, Math.PI, Math.PI * 2],
      [this.ringFront, 0, Math.PI],
    ] as const) {
      g.clear();
      const steps = 40;
      const pts: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        pts.push(Math.cos(a) * rx, Math.sin(a) * ry);
      }
      g.poly(pts, false).stroke({ width: 7, color: this.ringColors[1], alpha: 0.18 });
      g.poly(pts, false).stroke({ width: 2.5, color: this.ringColors[0], alpha: 0.95 });
      g.rotation = -0.3;
    }
  }

  private buildPools(): void {
    const pCount = this.opts.lowQuality ? 120 : 320;
    for (let i = 0; i < pCount; i++) {
      const s = new Sprite(this.dotTex);
      s.anchor.set(0.5);
      s.visible = false;
      s.blendMode = 'add';
      this.fxLayer.addChild(s);
      this.particles.push({ sprite: s, vx: 0, vy: 0, life: 0, maxLife: 1, active: false });
    }
    for (let i = 0; i < 24; i++) {
      const t = new Text({
        text: '',
        style: {
          fontFamily: 'Orbitron, system-ui, sans-serif',
          fontSize: 22,
          fontWeight: '700',
          fill: 0xffffff,
          stroke: { color: 0x05060f, width: 4 },
        },
      });
      t.anchor.set(0.5);
      t.visible = false;
      this.textLayer.addChild(t);
      this.floaters.push({ text: t, vy: 0, life: 0, active: false });
    }
  }

  private onResize = (): void => {
    this.drawRing();
  };

  /** Position of the asteroid (client coordinates), provided by the UI layout. */
  private lastRect: [number, number, number, number] | null = null;

  setAsteroidRect(x: number, y: number, w: number, h: number): void {
    this.lastRect = [x, y, w, h];
    const r = Math.max(50, Math.min(w, h) * 0.3);
    this.center = { x: x + w / 2, y: y + h / 2, r };
    if (!this.asteroid) return;
    this.asteroid.position.set(this.center.x, this.center.y);
    this.asteroid.scale.set(r / 100);
    this.glow.position.set(this.center.x, this.center.y);
    this.glow.scale.set(r / 9);
    this.ringBack.position.set(this.center.x, this.center.y);
    this.ringFront.position.set(this.center.x, this.center.y);
    this.drawRing();
  }

  setMineVisible(v: boolean): void {
    this.mineLayer.visible = v;
    for (const d of this.drones) d.sprite.visible = v;
    if (this.app) this.app.ticker.maxFPS = v ? 60 : 30;
  }

  setOptions(opts: SceneOptions): void {
    this.opts = opts;
  }

  setPaused(paused: boolean): void {
    if (!this.app) return;
    if (paused) this.app.ticker.stop();
    else this.app.ticker.start();
  }

  private pendingDrones = 0;
  private pendingPlanets: number[] = [];

  setDrones(n: number): void {
    this.pendingDrones = n;
    if (!this.app) return;
    const want = Math.min(this.opts.lowQuality ? 8 : 20, n);
    while (this.drones.length < want) {
      const s = new Sprite(this.droneTex);
      s.anchor.set(0.5);
      s.scale.set(0.9);
      this.mineLayer.addChild(s);
      const i = this.drones.length;
      this.drones.push({
        sprite: s,
        angle: i * 2.39,
        radius: 1.25 + (i % 5) * 0.14,
        speed: 0.35 + (i % 3) * 0.12,
        tilt: 0.35 + (i % 4) * 0.08,
      });
    }
    while (this.drones.length > want) this.drones.pop()?.sprite.destroy();
  }

  setPlanets(colors: number[]): void {
    this.pendingPlanets = colors;
    if (!this.app) return;
    while (this.planets.length > colors.length) this.planets.pop()?.sprite.destroy();
    colors.forEach((c, i) => {
      let p = this.planets[i];
      if (!p) {
        const s = new Sprite(this.dotTex);
        s.anchor.set(0.5);
        this.nebulaLayer.addChild(s);
        p = { sprite: s, angle: i * 1.7, radius: 1.9 + i * 0.35, speed: 0.05 / (1 + i * 0.4) };
        this.planets[i] = p;
      }
      p.sprite.tint = c;
      p.sprite.scale.set(0.35 + (i % 3) * 0.08);
    });
  }

  setStorm(on: boolean): void {
    this.storm = on;
  }

  setFrenzy(on: boolean): void {
    this.frenzy = on;
  }

  private spawnParticle(
    x: number,
    y: number,
    color: number,
    speed: number,
    life: number,
    size: number,
  ): void {
    const p = this.particles.find((q) => !q.active);
    if (!p) return;
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    p.active = true;
    p.vx = Math.cos(a) * v;
    p.vy = Math.sin(a) * v;
    p.life = p.maxLife = life * (0.6 + Math.random() * 0.6);
    p.sprite.visible = true;
    p.sprite.position.set(x, y);
    p.sprite.tint = color;
    p.sprite.scale.set(size);
    p.sprite.alpha = 1;
  }

  burst(x: number, y: number, color: number, count: number, speed = 220): void {
    const n = this.opts.lowQuality ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) this.spawnParticle(x, y, color, speed, 0.7, 0.12 + Math.random() * 0.12);
  }

  floatText(x: number, y: number, text: string, color: number, big = false): void {
    const f = this.floaters.find((q) => !q.active) ?? this.floaters[0];
    f.active = true;
    f.life = big ? 1.3 : 0.9;
    f.vy = big ? -55 : -80;
    f.text.text = text;
    f.text.style.fill = color;
    f.text.style.fontSize = big ? 30 : 20;
    f.text.position.set(x + (Math.random() - 0.5) * 30, y);
    f.text.visible = true;
    f.text.alpha = 1;
    f.text.scale.set(big ? 0.6 : 0.8);
  }

  tapFx(x: number, y: number, label: string, crit: boolean): void {
    this.bounce = crit ? 1 : Math.max(this.bounce, 0.5);
    this.burst(x, y, crit ? 0xffe14d : 0xc9a27a, crit ? 26 : 8, crit ? 320 : 180);
    if (crit) this.burst(x, y, 0xffffff, 10, 420);
    this.floatText(x, y - 20, label, crit ? 0xffe14d : 0xe6f1ff, crit);
  }

  supernova(color = 0xffe14d): void {
    this.flashAlpha = 1;
    this.flashColor = color;
    const { x, y } = this.center;
    for (let i = 0; i < 3; i++)
      this.burst(x, y, i === 0 ? color : i === 1 ? 0xff3df0 : 0x39f3ff, 60, 500 + i * 150);
  }

  private flashColor = 0xffffff;

  private update(dt: number): void {
    const app = this.app;
    if (!app) return;
    this.time += dt;
    const w = app.screen.width;
    const h = app.screen.height;
    const motion = this.opts.reduceMotion ? 0.2 : 1;

    for (const s of this.stars) {
      s.sprite.y += s.speed * dt * motion;
      s.sprite.x -= s.speed * 0.3 * dt * motion;
      if (s.sprite.y > h + 5) s.sprite.y = -5;
      if (s.sprite.x < -5) s.sprite.x = w + 5;
      if (!this.opts.reduceMotion) s.sprite.alpha = 0.55 + 0.45 * Math.sin(this.time * s.twinkle + s.phase);
    }

    const { x: cx, y: cy, r } = this.center;
    if (this.mineLayer.visible && this.asteroid) {
      this.asteroid.rotation += dt * 0.08 * motion;
      this.bounce = Math.max(0, this.bounce - dt * 4);
      const k = (r / 100) * (1 + this.bounce * 0.06);
      this.asteroid.scale.set(k);
      this.glow.alpha = 0.16 + this.bounce * 0.15 + (this.frenzy ? 0.2 + 0.1 * Math.sin(this.time * 8) : 0);
      this.glow.tint = this.frenzy ? 0xffd23f : this.ringColors[0];
      for (const d of this.drones) {
        d.angle += d.speed * dt * motion;
        const rx = r * d.radius * 1.3;
        const ry = r * d.radius * d.tilt;
        d.sprite.x = cx + Math.cos(d.angle) * rx;
        d.sprite.y = cy + Math.sin(d.angle) * ry;
        d.sprite.rotation = d.angle + Math.PI;
        const behind = Math.sin(d.angle) < 0;
        d.sprite.alpha = behind ? 0.5 : 1;
        d.sprite.zIndex = behind ? 0 : 10;
      }
    }
    for (const p of this.planets) {
      p.angle += p.speed * dt * motion;
      p.sprite.x = cx + Math.cos(p.angle) * r * p.radius * 1.4;
      p.sprite.y = cy + Math.sin(p.angle) * r * p.radius * 0.5;
      p.sprite.alpha = this.mineLayer.visible ? 0.9 : 0.35;
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vx *= 1 - dt * 2.2;
      p.vy = p.vy * (1 - dt * 2.2) + 60 * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.alpha = p.life / p.maxLife;
    }
    for (const f of this.floaters) {
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.active = false;
        f.text.visible = false;
        continue;
      }
      f.text.y += f.vy * dt;
      f.text.alpha = Math.min(1, f.life * 2);
      const s = f.text.scale.x;
      if (s < 1) f.text.scale.set(Math.min(1, s + dt * 4));
    }

    this.flash.clear();
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 0.8);
      this.flash.rect(0, 0, w, h).fill({ color: this.flashColor, alpha: this.flashAlpha * 0.8 });
    }
    this.stormOverlay.clear();
    if (this.storm) {
      const a = 0.08 + 0.05 * Math.sin(this.time * 3);
      this.stormOverlay.rect(0, 0, w, h).fill({ color: 0xff5a36, alpha: a });
    }
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener('resize', this.onResize);
    this.app?.destroy(true, { children: true, texture: true });
    this.app = null;
  }
}
