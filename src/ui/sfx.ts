import { playSfx, type SfxId } from '../audio';
import { haptic, type HapticKind } from '../platform/haptics';

/** Plays the sound and haptic feedback associated with a UI action. */
export function feedback(kind: HapticKind, sfx?: SfxId): void {
  haptic(kind);
  if (sfx) playSfx(sfx);
}
