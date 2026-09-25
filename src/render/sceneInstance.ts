import { OrbitalScene } from './OrbitalScene';

/** Single scene shared by the UI (created once at boot). */
export const scene = new OrbitalScene();

export function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
