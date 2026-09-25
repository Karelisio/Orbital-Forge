import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './native';

export type HapticKind = 'tap' | 'crit' | 'buy' | 'upgrade' | 'prestige' | 'error' | 'event' | 'success';

let enabled = true;
let lastTap = 0;

export function setHapticsEnabled(v: boolean): void {
  enabled = v;
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

/** Differentiated haptics: light for taps, medium for purchases, heavy pattern for prestige. */
export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  if (kind === 'tap') {
    const now = performance.now();
    if (now - lastTap < 40) return;
    lastTap = now;
  }
  if (!isNative) {
    const web: Record<HapticKind, number | number[]> = {
      tap: 8,
      crit: [12, 30, 12],
      buy: 15,
      upgrade: [15, 40, 25],
      prestige: [60, 60, 120, 60, 200],
      error: [30, 40, 30],
      event: [20, 50, 20],
      success: [20, 40, 40],
    };
    vibrate(web[kind]);
    return;
  }
  const run = async () => {
    switch (kind) {
      case 'tap':
        return Haptics.impact({ style: ImpactStyle.Light });
      case 'crit':
        return Haptics.impact({ style: ImpactStyle.Heavy });
      case 'buy':
        return Haptics.impact({ style: ImpactStyle.Medium });
      case 'upgrade':
        return Haptics.notification({ type: NotificationType.Success });
      case 'success':
        return Haptics.notification({ type: NotificationType.Success });
      case 'event':
        return Haptics.notification({ type: NotificationType.Warning });
      case 'error':
        return Haptics.notification({ type: NotificationType.Error });
      case 'prestige':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(() => void Haptics.impact({ style: ImpactStyle.Heavy }), 120);
        setTimeout(() => void Haptics.vibrate({ duration: 400 }), 260);
        return;
    }
  };
  run().catch(() => undefined);
}
