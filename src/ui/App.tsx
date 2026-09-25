import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GameLoop } from '../engine/loop';
import { createInitialState } from '../engine/state';
import { preloadSounds, unlockAudio } from '../audio';
import { hideSplash, setupStatusBar } from '../platform/device';
import { installLifecycle, saveManager } from '../platform/lifecycle';
import { scene } from '../render/sceneInstance';
import { useGame } from '../store/gameStore';
import { useUi } from '../store/uiStore';
import { t, setLang } from '../i18n';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { Toasts } from './Toasts';
import { Modals } from './modals/Modals';
import { OfflineModal } from './modals/OfflineModal';
import { EventLayer } from './EventLayer';
import { Tutorial } from './Tutorial';
import { useGameEffects } from './useGameEffects';
import { MineTab } from './tabs/MineTab';
import { FactoryTab } from './tabs/FactoryTab';
import { PlanetsTab } from './tabs/PlanetsTab';
import { ResearchTab } from './tabs/ResearchTab';
import { PrestigeTab } from './tabs/PrestigeTab';
import { MoreTab } from './tabs/MoreTab';

const TABS = {
  mine: MineTab,
  factory: FactoryTab,
  planets: PlanetsTab,
  research: ResearchTab,
  prestige: PrestigeTab,
  more: MoreTab,
};

export function App() {
  const ready = useGame((s) => s.ready);
  const tab = useUi((s) => s.tab);
  const reduceMotion = useGame((s) => s.game.settings.reduceMotion);
  const [loop, setLoop] = useState<GameLoop | null>(null);
  useGameEffects(loop);

  useEffect(() => {
    let disposed = false;
    const gameLoop = new GameLoop((dt) => useGame.getState().advance(dt));
    let uninstall: (() => void) | null = null;
    (async () => {
      await setupStatusBar();
      const res = await saveManager.load();
      const state = res.state ?? createInitialState();
      if (!res.state) {
        state.settings.lang = navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
      }
      setLang(state.settings.lang);
      const offline = res.state ? Math.max(0, (Date.now() - state.lastSeen) / 1000) : 0;
      useGame.getState().hydrate(state, offline);
      if (res.source === 'backup') useUi.getState().toast(t('settings.loadedBackup'), 'warn', '⚠');
      if (disposed) return;
      await scene.init(document.body, {
        lowQuality: state.settings.lowQuality,
        reduceMotion: state.settings.reduceMotion,
      });
      scene.setMineVisible(useUi.getState().tab === 'mine');
      gameLoop.start();
      setLoop(gameLoop);
      uninstall = installLifecycle();
      await hideSplash();
      setTimeout(preloadSounds, 500);
    })();
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      disposed = true;
      gameLoop.stop();
      uninstall?.();
    };
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div className="h1">ORBITAL FORGE</div>
        <div className="muted small pulse">{t('app.loading')}</div>
      </div>
    );
  }

  const Tab = TABS[tab];
  return (
    <div className="app">
      <TopBar />
      <main className="content" id="content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: 0.16 }}
          >
            <Tab />
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar />
      <EventLayer />
      <Tutorial />
      <Modals />
      <OfflineModal />
      <Toasts />
    </div>
  );
}
