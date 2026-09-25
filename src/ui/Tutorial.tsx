import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { GameState } from '../engine/state';
import { useGame } from '../store/gameStore';
import { useUi } from '../store/uiStore';
import { tabUnlocked } from '../systems/unlocks';
import { useT } from '../i18n';

interface Step {
  target: string | null;
  /** Condition to move past this step. */
  done: (s: GameState, tab: string) => boolean;
  manual?: boolean;
}

const STEPS: Step[] = [
  { target: 'asteroid', done: (s) => s.stats.taps >= 5 },
  { target: 'building-ore_0', done: (s) => s.buildings['ore_0'] >= 1 },
  { target: 'building-ore_0', done: (s) => s.buildings['ore_0'] >= 10 || s.buildings['ore_1'] >= 1 },
  { target: 'tab-factory', done: (s, tab) => tab === 'factory' || s.buildings['metal_0'] >= 1 },
  { target: 'building-metal_0', done: (s) => s.buildings['metal_0'] >= 1 },
  {
    target: 'tab-research',
    done: (s) => s.research.active.length > 0 || Object.keys(s.research.done).length > 0,
  },
  { target: null, done: () => false, manual: true },
];

/** Waiting conditions before a step is shown (e.g. the factory tab must be unlocked). */
function stepReady(i: number, s: GameState): boolean {
  if (i === 3) return tabUnlocked(s, 'factory');
  if (i === 5) return tabUnlocked(s, 'research');
  return true;
}

export function Tutorial() {
  const { t } = useT();
  const step = useGame((s) => s.game.tutorial.step);
  const doneAll = useGame((s) => s.game.tutorial.done);
  const ready = useGame((s) => !s.game.tutorial.done && stepReady(s.game.tutorial.step, s.game));
  const setTutorial = useGame((s) => s.setTutorial);
  const tab = useUi((s) => s.tab);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Advance automatically when the step's condition is met.
  useEffect(() => {
    if (doneAll) return;
    return useGame.subscribe((s) => {
      const i = s.game.tutorial.step;
      const def = STEPS[i];
      if (def && !def.manual && stepReady(i, s.game) && def.done(s.game, useUi.getState().tab)) {
        s.setTutorial(i + 1, i + 1 >= STEPS.length);
      }
    });
  }, [doneAll]);

  useEffect(() => {
    const def = STEPS[step];
    if (!def?.done || doneAll) return;
    if (def.done(useGame.getState().game, tab) && !def.manual) setTutorial(step + 1);
  }, [tab, step, doneAll, setTutorial]);

  // Track the highlighted element.
  useEffect(() => {
    const target = STEPS[step]?.target;
    if (!target || doneAll || !ready) {
      setRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(`[data-tut="${target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const timer = window.setInterval(update, 300);
    return () => window.clearInterval(timer);
  }, [step, doneAll, ready, tab]);

  if (doneAll || !ready || step >= STEPS.length) return null;
  const last = STEPS[step].manual;
  // Place the bubble next to the highlighted element, on the side with more room.
  const placement: React.CSSProperties = !rect
    ? { bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 12px)' }
    : rect.top > window.innerHeight / 2
      ? { bottom: Math.max(12, window.innerHeight - rect.top + 12) }
      : { top: Math.min(window.innerHeight - 160, rect.bottom + 12) };

  return (
    <>
      <AnimatePresence>
        {rect && (
          <motion.div
            key={`ring-${step}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
            style={{
              position: 'fixed',
              left: rect.left - 4,
              top: rect.top - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              borderRadius: 18,
              border: '2px solid var(--cyan)',
              boxShadow: '0 0 24px var(--cyan)',
              pointerEvents: 'none',
              zIndex: 45,
            }}
          />
        )}
      </AnimatePresence>
      <motion.div
        key={`bubble-${step}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          position: 'fixed',
          left: 12,
          right: 12,
          zIndex: 46,
          ...placement,
          padding: 10,
          background: 'var(--panel-solid)',
          borderColor: 'var(--border-strong)',
          boxShadow: '0 0 30px rgba(57,243,255,0.25)',
        }}
      >
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span style={{ fontSize: 26 }}>🤖</span>
          <div className="grow small">{t(`tut.${step}` as 'tut.0')}</div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4, gap: 8 }}>
          {!last && (
            <button className="btn small ghost" onClick={() => setTutorial(STEPS.length, true)}>
              {t('tut.skip')}
            </button>
          )}
          {last && (
            <button className="btn small primary" onClick={() => setTutorial(STEPS.length, true)}>
              {t('common.ok')}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
