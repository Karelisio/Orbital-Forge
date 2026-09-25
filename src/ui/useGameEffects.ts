import { useEffect } from 'react';
import { ACHIEVEMENTS_BY_ID } from '../config/achievements';
import { ARTIFACTS_BY_ID, RARITY_COLOR } from '../config/artifacts';
import { PLANETS_BY_ID } from '../config/planets';
import { PLANET_IDS } from '../config/types';
import { setMusicVolume, setSfxVolume, playSfx, pauseAudio } from '../audio';
import { setDurationLocale } from '../economy/format';
import { setLang, t, tk } from '../i18n';
import { achievementText } from '../i18n/describe';
import { onPauseChange } from '../platform/lifecycle';
import { haptic, setHapticsEnabled } from '../platform/haptics';
import { setImmersive, setKeepAwake } from '../platform/device';
import { hexToNum, scene } from '../render/sceneInstance';
import { onGameEvent, useGame } from '../store/gameStore';
import { useUi } from '../store/uiStore';
import { totalBuildings } from '../systems/counters';
import type { GameLoop } from '../engine/loop';

/** Wires settings, game events, and scene state to side effects (audio, haptics, toasts, renderer). */
export function useGameEffects(loop: GameLoop | null): void {
  // Settings → platform.
  useEffect(() => {
    const apply = () => {
      const st = useGame.getState().game.settings;
      setLang(st.lang);
      setDurationLocale(st.lang);
      setSfxVolume(st.sfxVolume);
      setMusicVolume(st.musicVolume);
      setHapticsEnabled(st.haptics);
      const root = document.documentElement;
      root.dataset.oled = String(st.oled);
      root.dataset.reduceMotion = String(st.reduceMotion);
      root.style.setProperty('--scale', String(st.textScale));
      scene.setOptions({ lowQuality: st.lowQuality, reduceMotion: st.reduceMotion });
    };
    apply();
    let prev = useGame.getState().game.settings;
    void setKeepAwake(prev.keepAwake);
    if (prev.immersive) void setImmersive(true);
    return useGame.subscribe((s) => {
      const next = s.game.settings;
      if (next === prev) return;
      if (next.keepAwake !== prev.keepAwake) void setKeepAwake(next.keepAwake);
      if (next.immersive !== prev.immersive) void setImmersive(next.immersive);
      prev = next;
      apply();
    });
  }, []);

  // Game events → feedback.
  useEffect(() => {
    const toast = useUi.getState().toast;
    return onGameEvent((e) => {
      const notation = useGame.getState().game.settings.notation;
      switch (e.type) {
        case 'achievement': {
          const def = ACHIEVEMENTS_BY_ID[e.id];
          toast(t('ach.unlocked', { name: achievementText(def, notation).name }), 'gold', '🏆');
          playSfx('achievement');
          break;
        }
        case 'researchDone':
          toast(t('notif.research.body', { name: tk(e.id) }), 'good', '🧪');
          playSfx('research');
          haptic('success');
          break;
        case 'expeditionDone':
          toast(t('exp.arrived'), 'good', '🚀');
          playSfx('research');
          break;
        case 'artifact': {
          const def = ARTIFACTS_BY_ID[e.id];
          toast(t('artifacts.found', { name: tk(e.id), n: e.level }), 'gold', def?.icon);
          playSfx('artifact');
          haptic('success');
          if (def) {
            const { x, y } = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
            scene.burst(x, y, hexToNum(RARITY_COLOR[def.rarity]), 40, 350);
          }
          break;
        }
        case 'eventStart':
          toast(
            t(`event.${e.event}`),
            e.event === 'storm' ? 'warn' : 'gold',
            e.event === 'storm' ? '☀' : '✦',
          );
          playSfx('event');
          haptic('event');
          break;
        case 'challengeDone':
          toast(t('challenges.done', { name: tk(e.id) }), 'gold', '⚔');
          playSfx('achievement');
          scene.supernova(0x5dff8f);
          break;
        case 'challengeFailed':
          toast(t('challenges.failed', { name: tk(e.id) }), 'warn', '⚔');
          playSfx('error');
          break;
        case 'milestone':
          playSfx('upgrade', { volume: 0.6 });
          break;
        case 'autoSupernova':
          scene.supernova();
          playSfx('prestige');
          haptic('prestige');
          break;
        default:
          break;
      }
    });
  }, []);

  // Scene sync.
  useEffect(() => {
    let last = '';
    const sync = () => {
      const s = useGame.getState();
      const g = s.game;
      const planets = PLANET_IDS.filter((p) => g.planets[p] > 0).map((p) =>
        hexToNum(PLANETS_BY_ID[p].palette[1]),
      );
      const key = `${Math.floor(totalBuildings(g) / 10)}|${planets.join(',')}|${g.events.active?.type === 'storm' && !g.events.active.shielded}|${g.events.frenzy > 0}`;
      if (key === last) return;
      last = key;
      scene.setDrones(Math.floor(totalBuildings(g) / 10));
      scene.setPlanets(planets);
      scene.setStorm(g.events.active?.type === 'storm' && !g.events.active.shielded);
      scene.setFrenzy(g.events.frenzy > 0);
    };
    sync();
    const unsub = useGame.subscribe(sync);
    const unsubTab = useUi.subscribe((u) => scene.setMineVisible(u.tab === 'mine'));
    return () => {
      unsub();
      unsubTab();
    };
  }, []);

  // Background pause.
  useEffect(
    () =>
      onPauseChange((paused) => {
        loop?.setPaused(paused);
        scene.setPaused(paused);
        pauseAudio(paused);
      }),
    [loop],
  );
}
