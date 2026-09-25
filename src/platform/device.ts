import { KeepAwake } from '@capacitor-community/keep-awake';
import { registerPlugin } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative } from './native';

interface ImmersivePlugin {
  setImmersive(options: { enabled: boolean }): Promise<void>;
}
const Immersive = registerPlugin<ImmersivePlugin>('Immersive');

export async function setupStatusBar(): Promise<void> {
  if (!isNative) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
  } catch {
    // ignore
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // ignore
  }
}

export async function setKeepAwake(on: boolean): Promise<void> {
  if (!isNative) return;
  try {
    if (on) await KeepAwake.keepAwake();
    else await KeepAwake.allowSleep();
  } catch {
    // ignore
  }
}

/** Optional immersive full screen (hides status and navigation bars). */
export async function setImmersive(on: boolean): Promise<void> {
  if (!isNative) {
    try {
      if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!on && document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // ignore
    }
    return;
  }
  try {
    await Immersive.setImmersive({ enabled: on });
  } catch {
    try {
      if (on) await StatusBar.hide();
      else await StatusBar.show();
    } catch {
      // ignore
    }
  }
}
