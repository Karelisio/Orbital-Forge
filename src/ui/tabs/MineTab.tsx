import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { formatNumber } from '../../economy/format';
import { comboMultiplier, tapBaseValue } from '../../economy/production';
import { scene } from '../../render/sceneInstance';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { playSfx, unlockAudio } from '../../audio';
import { haptic } from '../../platform/haptics';
import { BuildingList } from '../components/BuildingList';
import { BuyAmountToggle } from '../components/BuyAmount';
import { UpgradeStrip } from '../components/UpgradeStrip';
import { BoostBar } from '../components/BoostBar';
import { Section } from '../components/common';

function AsteroidZone() {
  const ref = useRef<HTMLDivElement>(null);
  const tap = useGame((s) => s.tap);
  const noTap = useGame((s) => !!s.mods.rules.noTap);
  const { t } = useT();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      scene.setAsteroidRect(r.left, r.top, r.width, r.height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const content = el.closest('.content');
    content?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      content?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-tut="asteroid"
      onPointerDown={(e) => {
        unlockAudio();
        const res = tap();
        if (!res) {
          haptic('error');
          return;
        }
        const notation = useGame.getState().game.settings.notation;
        scene.tapFx(e.clientX, e.clientY, `+${formatNumber(res.value, notation)}`, res.crit);
        haptic(res.crit ? 'crit' : 'tap');
        playSfx(res.crit ? 'crit' : 'tap', { rate: 0.9 + Math.min(0.5, res.combo - 1) });
      }}
      style={{
        height: 'min(40vh, 340px)',
        minHeight: 220,
        position: 'relative',
        touchAction: 'none',
        cursor: 'pointer',
      }}
    >
      {noTap && (
        <div
          className="chip warn"
          style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)' }}
        >
          {t('mine.noTap')}
        </div>
      )}
    </div>
  );
}

function TapInfo() {
  const { t } = useT();
  const perTap = useGame((s) =>
    formatNumber(tapBaseValue(s.mods, s.rates.flows[0].out), s.game.settings.notation),
  );
  const combo = useGame((s) => comboMultiplier(s.game.combo.count, s.mods.comboMax));
  const frenzy = useGame((s) => s.game.events.frenzy > 0);
  const firstTaps = useGame((s) => s.game.stats.taps < 3);
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: -8, minHeight: 28 }}>
      {firstTaps ? (
        <motion.span
          className="bold cyan"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          {t('mine.tapHint')}
        </motion.span>
      ) : (
        <>
          <span className="chip num">{t('mine.perTap', { v: perTap })}</span>
          {combo > 1.01 && (
            <motion.span
              key={Math.floor(combo * 10)}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="chip gold num"
            >
              {t('mine.combo', { v: combo.toFixed(2) })}
            </motion.span>
          )}
          {frenzy && <span className="chip gold pulse">✦ {t('event.frenzy', { v: 7 })}</span>}
        </>
      )}
    </div>
  );
}

export function MineTab() {
  const { t } = useT();
  const showBoosts = useGame((s) => s.game.stats.produced.metal.gt(0) || s.game.prestige.supernovas > 0);
  return (
    <div>
      <AsteroidZone />
      <TapInfo />
      {showBoosts && (
        <div style={{ marginTop: 10 }}>
          <BoostBar compact />
        </div>
      )}
      <UpgradeStrip tiers={['ore']} />
      <Section title={t('res.ore')}>
        <div style={{ marginBottom: 8 }}>
          <BuyAmountToggle />
        </div>
        <BuildingList tier="ore" />
      </Section>
    </div>
  );
}
