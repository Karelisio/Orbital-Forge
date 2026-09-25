import { memo } from 'react';
import { RESOURCE_IDS, type ResourceId } from '../config/types';
import { formatNumber } from '../economy/format';
import { useGame } from '../store/gameStore';
import { useT } from '../i18n';
import { ResIcon } from './components/common';

const ResourceChip = memo(function ResourceChip({ res }: { res: ResourceId }) {
  const amount = useGame((s) => formatNumber(s.game.resources[res], s.game.settings.notation));
  const net = useGame((s) => {
    const n = s.rates.prod[res].sub(s.rates.cons[res]);
    return (n.sign() < 0 ? '-' : '+') + formatNumber(n.abs(), s.game.settings.notation);
  });
  const bottleneck = useGame((s) => res !== 'ore' && s.rates.eff[res] < 0.98 && s.rates.prod[res].gt(0));
  return (
    <div
      className="row"
      style={{
        gap: 6,
        padding: '4px 10px 4px 4px',
        borderRadius: 999,
        background: 'var(--panel)',
        border: `1px solid ${bottleneck ? 'var(--warn)' : 'var(--border)'}`,
        flexShrink: 0,
      }}
    >
      <ResIcon res={res} size={16} />
      <div className="col" style={{ gap: 0, lineHeight: 1.1 }}>
        <span className="bold num" style={{ fontSize: '0.92em' }}>
          {amount}
        </span>
        <span className={`tiny num ${net.startsWith('-') ? 'danger' : 'muted'}`}>{net}/s</span>
      </div>
    </div>
  );
});

export function TopBar() {
  const visible = useGame((s) =>
    RESOURCE_IDS.filter((r) => r === 'ore' || s.game.stats.produced[r].gt(0)).join(','),
  );
  const stardust = useGame((s) =>
    s.game.prestige.stardustTotal.gt(0)
      ? formatNumber(s.game.prestige.stardust, s.game.settings.notation)
      : null,
  );
  const challenge = useGame((s) => s.game.challenges.active);
  const { t, tk } = useT();
  return (
    <header style={{ padding: '6px 10px 4px' }}>
      <div className="row" style={{ gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {visible.split(',').map((r) => (
          <ResourceChip key={r} res={r as ResourceId} />
        ))}
        {stardust !== null && (
          <div className="chip gold" style={{ flexShrink: 0, padding: '6px 10px' }} title={t('res.stardust')}>
            ✧ <span className="num bold">{stardust}</span>
          </div>
        )}
      </div>
      {challenge && (
        <div className="chip warn" style={{ marginTop: 4 }}>
          ⚔ {t('challenges.active')} : {tk(challenge)}
        </div>
      )}
    </header>
  );
}
