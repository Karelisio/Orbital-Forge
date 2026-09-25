import type { GameState } from '../engine/state';
import { unwrap, wrap } from './serialize';

const PREFIX = 'OF1:';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function exportSave(s: GameState, now = Date.now()): string {
  return PREFIX + toBase64(wrap(s, now));
}

export function importSave(text: string, now = Date.now()): GameState {
  const clean = text.trim().replace(/\s+/g, '');
  const body = clean.startsWith(PREFIX) ? clean.slice(PREFIX.length) : clean;
  let json: string;
  try {
    json = fromBase64(body);
  } catch {
    throw new Error('invalid-base64');
  }
  return unwrap(json, now);
}

export function exportFileName(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `orbital-forge-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.ofsave`;
}
