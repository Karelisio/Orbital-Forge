import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { Sheet } from '../components/Sheet';
import { Seg } from '../components/common';
import { formatDuration } from '../../economy/format';

export function DebugPanel() {
  const { t } = useT();
  const s = useGame();
  return (
    <Sheet title={`🛠 ${t('debug.title')}`}>
      <div className="col" style={{ gap: 10 }}>
        <Seg
          options={[1, 10, 100].map((v) => ({ value: v, label: t('debug.speed', { v }) }))}
          value={s.debugSpeed}
          onChange={(v) => s.debugSetSpeed(v)}
        />
        <div className="grid3">
          {[3, 6, 12, 24, 50, 100].map((e) => (
            <button key={e} className="btn small" onClick={() => s.debugAddResources(e)}>
              {t('debug.addRes', { e })}
            </button>
          ))}
        </div>
        <div className="grid3">
          {[600, 3600, 8 * 3600].map((sec) => (
            <button key={sec} className="btn small" onClick={() => s.debugSkip(sec)}>
              {t('debug.skip', { t: formatDuration(sec) })}
            </button>
          ))}
        </div>
        <div className="grid2">
          <button className="btn small" onClick={() => s.debugAddStardust(1000)}>
            {t('debug.stardust')}
          </button>
          <button className="btn small" onClick={() => s.debugAddSingularities(10)}>
            {t('debug.sing')}
          </button>
        </div>
        <div className="grid2">
          {(['meteors', 'comet', 'merchant', 'storm'] as const).map((e) => (
            <button key={e} className="btn small" onClick={() => s.debugEvent(e)}>
              {t('debug.event', { e })}
            </button>
          ))}
        </div>
        <button className="btn small" onClick={() => s.debugUnlockResearch()}>
          {t('debug.unlockAll')}
        </button>
      </div>
    </Sheet>
  );
}
