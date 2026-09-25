import { App } from '@capacitor/app';
import { BALANCE } from '../config/balance';
import { SaveManager } from '../save/storage';
import { useGame } from '../store/gameStore';
import { useUi } from '../store/uiStore';
import { isNative } from './native';
import { cancelScheduled, scheduleAwayNotifications } from './notifications';
import { PreferencesBackend } from './storage';

export const saveManager = new SaveManager(new PreferencesBackend());

type PauseListener = (paused: boolean) => void;
const pauseListeners = new Set<PauseListener>();
export function onPauseChange(fn: PauseListener): () => void {
  pauseListeners.add(fn);
  return () => pauseListeners.delete(fn);
}

let paused = false;
let saving = false;

export async function saveNow(): Promise<void> {
  if (saving) return;
  saving = true;
  try {
    const s = useGame.getState();
    if (s.ready) await saveManager.save(s.game);
  } finally {
    saving = false;
  }
}

async function goBackground(): Promise<void> {
  if (paused) return;
  paused = true;
  pauseListeners.forEach((l) => l(true));
  await saveNow();
  await scheduleAwayNotifications(useGame.getState().game);
}

async function goForeground(): Promise<void> {
  if (!paused) return;
  paused = false;
  await cancelScheduled();
  pauseListeners.forEach((l) => l(false));
}

export function isPaused(): boolean {
  return paused;
}

/** Autosave every 10 s, save on background, Android back button handling. */
export function installLifecycle(): () => void {
  const timer = window.setInterval(() => void saveNow(), BALANCE.autosaveSeconds * 1000);
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void goBackground();
    else void goForeground();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => void saveNow());

  const handles: Promise<{ remove: () => Promise<void> }>[] = [];
  if (isNative) {
    handles.push(
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void goForeground();
        else void goBackground();
      }),
    );
    handles.push(
      App.addListener('backButton', () => {
        const res = useUi.getState().back();
        if (res === 'exit') {
          void saveNow().then(() => App.exitApp());
        }
      }),
    );
  }
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    handles.forEach((h) => void h.then((x) => x.remove()));
  };
}

export async function exitApp(): Promise<void> {
  await saveNow();
  if (isNative) await App.exitApp();
}
