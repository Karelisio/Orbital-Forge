import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { RESOURCE_IDS } from '../../config/types';
import { Decimal } from '../../economy/decimal';
import { formatDuration, formatNumber, formatPercent } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { resName } from '../../i18n/describe';
import { ResIcon } from '../components/common';
import { feedback } from '../sfx';
import { scene } from '../../render/sceneInstance';

/** Counts up from 0 to the target value for a satisfying reveal. */
function CountUp({ value, delay }: { value: Decimal; delay: number }) {
  const notation = useGame((s) => s.game.settings.notation);
  const reduce = useGame((s) => s.game.settings.reduceMotion);
  const [p, setP] = useState(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / 1200));
      setP(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [delay, reduce]);
  const shown = value.gt(0)
    ? Decimal.pow(10, value.add(1).log10() * p)
        .sub(1)
        .max(0)
    : value;
  return <span className="num bold">+{formatNumber(p >= 1 ? value : shown, notation)}</span>;
}

export function OfflineModal() {
  const summary = useGame((s) => s.offline);
  const dismiss = useGame((s) => s.dismissOffline);
  const eff = useGame((s) => Math.min(1, s.mods.offlineEff));
  const { t } = useT();
  if (!summary) return null;
  const rows = RESOURCE_IDS.filter((r) => summary.gains[r].gt(0));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(2,3,10,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--panel-solid)',
          borderColor: 'var(--border-strong)',
          padding: 20,
          boxShadow: '0 0 40px rgba(57,243,255,0.2)',
        }}
      >
        <div className="h1" style={{ textAlign: 'center' }}>
          {t('offline.title')}
        </div>
        <div className="muted small" style={{ textAlign: 'center' }}>
          {t('offline.away', { t: formatDuration(summary.elapsed) })}
        </div>
        {summary.capped && (
          <div className="warn tiny" style={{ textAlign: 'center' }}>
            {t('offline.capped', { t: formatDuration(summary.simulated) })}
          </div>
        )}
        <div className="tiny muted" style={{ textAlign: 'center', marginBottom: 12 }}>
          {t('offline.efficiency', { p: formatPercent(eff, 0) })}
        </div>
        <div className="col" style={{ gap: 6 }}>
          {rows.map((r, i) => (
            <motion.div
              key={r}
              className="row card"
              style={{ marginBottom: 0, padding: 8 }}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.12 }}
            >
              <ResIcon res={r} />
              <span className="grow">{resName(r)}</span>
              <CountUp value={summary.gains[r]} delay={0.2 + i * 0.12} />
            </motion.div>
          ))}
        </div>
        <div className="col small" style={{ marginTop: 10, gap: 2 }}>
          {summary.research.length > 0 && (
            <span className="good">🧪 {t('offline.research', { n: summary.research.length })}</span>
          )}
          {summary.expeditions > 0 && (
            <span className="good">🚀 {t('offline.expeditions', { n: summary.expeditions })}</span>
          )}
          {summary.achievements.length > 0 && <span className="gold">🏆 +{summary.achievements.length}</span>}
        </div>
        <button
          className="btn primary block"
          style={{ marginTop: 16 }}
          onClick={() => {
            feedback('success', 'upgrade');
            scene.burst(window.innerWidth / 2, window.innerHeight / 2, 0x39f3ff, 50, 400);
            dismiss();
          }}
        >
          {t('offline.collect')}
        </button>
      </motion.div>
    </motion.div>
  );
}
