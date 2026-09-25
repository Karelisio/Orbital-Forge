import { LocalNotifications } from '@capacitor/local-notifications';
import { RESEARCH_BY_ID } from '../config/research';
import { computeModifiers } from '../economy/modifiers';
import type { GameState } from '../engine/state';
import { t, tk } from '../i18n';
import { isNative } from './native';

const ID_FULL = 1000;
const ID_EXP = 2000;
const ID_RESEARCH = 3000;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === 'granted') return true;
    const r = await LocalNotifications.requestPermissions();
    return r.display === 'granted';
  } catch {
    return false;
  }
}

export async function cancelScheduled(): Promise<void> {
  if (!isNative) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length)
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  } catch {
    // ignore
  }
}

/** Schedules "storage full", "expedition done" and "research done" notifications for when the app is closed. */
export async function scheduleAwayNotifications(s: GameState): Promise<void> {
  if (!isNative || !s.settings.notifications) return;
  await cancelScheduled();
  const now = Date.now();
  const mods = computeModifiers(s);
  const list: { id: number; title: string; body: string; at: number }[] = [];
  list.push({
    id: ID_FULL,
    title: t('notif.full.title'),
    body: t('notif.full.body'),
    at: now + mods.offlineCap * 3600 * 1000,
  });
  s.expeditions.ships.forEach((ship, i) => {
    if (ship && ship.remaining > 0) {
      list.push({
        id: ID_EXP + i,
        title: t('notif.exp.title'),
        body: t('notif.exp.body'),
        at: now + ship.remaining * 1000,
      });
    }
  });
  s.research.active.forEach((r, i) => {
    if (RESEARCH_BY_ID[r.id]) {
      list.push({
        id: ID_RESEARCH + i,
        title: t('notif.research.title'),
        body: t('notif.research.body', { name: tk(r.id) }),
        at: now + (r.remaining / mods.research) * 1000,
      });
    }
  });
  try {
    await LocalNotifications.schedule({
      notifications: list
        .filter((n) => n.at > now + 30_000)
        .map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          schedule: { at: new Date(n.at), allowWhileIdle: true },
        })),
    });
  } catch {
    // Permission denied or unsupported.
  }
}
