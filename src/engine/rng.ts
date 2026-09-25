/** Mulberry32: tiny deterministic PRNG. Returns [value in [0,1), next seed]. */
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Draws a random number from state.seed and advances it. */
export function rand(holder: { seed: number }): number {
  const [v, s] = nextRandom(holder.seed);
  holder.seed = s;
  return v;
}

export function randInt(holder: { seed: number }, min: number, max: number): number {
  return min + Math.floor(rand(holder) * (max - min + 1));
}

export function pickWeighted<T>(holder: { seed: number }, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((s, it) => s + weight(it), 0);
  let r = rand(holder) * total;
  for (const it of items) {
    r -= weight(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
