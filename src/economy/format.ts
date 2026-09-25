import type { Notation } from '../engine/state';
import { Decimal } from './decimal';

const SHORT = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'UDc',
  'DDc',
  'TDc',
  'QaDc',
  'QiDc',
  'SxDc',
  'SpDc',
  'OcDc',
  'NoDc',
  'Vg',
];

function letterSuffix(group: number): string {
  // After "Vg" (1e63) use aa, ab, ... az, ba, ...
  const i = group - SHORT.length;
  const a = Math.floor(i / 26);
  const b = i % 26;
  return String.fromCharCode(97 + (a % 26)) + String.fromCharCode(97 + b);
}

function trimFixed(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.?0+$/, '');
}

export function formatNumber(value: Decimal | number, notation: Notation = 'short', digits = 2): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (!Number.isFinite(d.mantissa) || Number.isNaN(d.mantissa)) return '∞';
  const sign = d.sign() < 0 ? '-' : '';
  const a = d.abs();
  if (a.lt(1000)) {
    const n = a.toNumber();
    if (n === 0) return '0';
    if (n < 10 && !Number.isInteger(n)) return sign + trimFixed(n, digits);
    if (n < 100 && !Number.isInteger(n)) return sign + trimFixed(n, 1);
    return sign + Math.floor(n).toString();
  }
  const e = a.exponent;
  const m = a.mantissa;
  if (notation === 'scientific') return `${sign}${m.toFixed(digits)}e${e}`;
  const group = Math.floor(e / 3);
  const mant = m * Math.pow(10, e - group * 3);
  const rounded = Number(mant.toFixed(digits));
  // Handle 999.995 -> 1000 rollover.
  if (rounded >= 1000) return formatNumber(a.mul(1.0001), notation, digits).replace(/^/, sign);
  if (notation === 'engineering') return `${sign}${mant.toFixed(digits)}e${group * 3}`;
  const suffix = group < SHORT.length ? SHORT[group] : letterSuffix(group);
  return `${sign}${mant.toFixed(digits)}${suffix}`;
}

let dayUnit = 'j';
export function setDurationLocale(lang: 'fr' | 'en'): void {
  dayUnit = lang === 'fr' ? 'j' : 'd';
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '∞';
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}${dayUnit} ${h}h`;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}

export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
}
