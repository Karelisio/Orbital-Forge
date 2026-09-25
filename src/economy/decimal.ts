import Decimal from 'break_infinity.js';
import type { DecimalSource } from 'break_infinity.js';

export { Decimal };
export type { DecimalSource };

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function D(v: DecimalSource): Decimal {
  return v instanceof Decimal ? v : new Decimal(v);
}

export function dmax(a: Decimal, b: Decimal): Decimal {
  return a.gte(b) ? a : b;
}

export function dmin(a: Decimal, b: Decimal): Decimal {
  return a.lte(b) ? a : b;
}

/** Converts to a JS number, saturating at ±Number.MAX_VALUE. */
export function toNum(d: Decimal): number {
  const n = d.toNumber();
  if (Number.isFinite(n)) return n;
  return d.sign() < 0 ? -Number.MAX_VALUE : Number.MAX_VALUE;
}

/** log10 safe for zero/negative values (returns 0). */
export function log10(d: Decimal): number {
  return d.gt(0) ? d.log10() : 0;
}
