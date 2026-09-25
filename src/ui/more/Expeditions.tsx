import { useShallow } from 'zustand/react/shallow';
import { DESTINATIONS } from '../../config/expeditions';
import { RESOURCES } from '../../config/resources';
import { formatDuration, formatNumber, formatPercent } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { useT } from '../../i18n';
import { feedback } from '../sfx';
import { Bar, Card } from '../components/common';

function ShipCard({ index }: { index: number }) {
  const { t, tk } = useT();
  const view = useGame(
    useShallow((s) => {
      const ship = s.game.expeditions.ships[index];
      return {
        dest: ship?.dest ?? null,
        remaining: ship?.remaining ?? 0,
        duration: ship?.duration ?? 1,
        supernovas: s.game.prestige.supernovas,
        expSpeed: s.mods.expSpeed,
        notation: s.game.settings.notation,
      };
    }),
  );
  const launch = useGame((s) => s.launchExpedition);
  const claim = useGame((s) => s.claimExpedition);
  const toast = useUi((s) => s.toast);

  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="bold">{t('exp.ship', { n: index + 1 })}</span>
        {view.dest === null && <span className="tiny muted">{t('exp.idle')}</span>}
      </div>

      {view.dest === null && (
        <div className="col" style={{ gap: 6 }}>
          {DESTINATIONS.map((d) => {
            const locked = view.supernovas < d.requiredSupernovas;
            return (
              <button
                key={d.id}
                className="btn"
                style={{ justifyContent: 'space-between' }}
                aria-disabled={locked}
                onClick={() => {
                  if (locked) {
                    feedback('error', 'error');
                    return;
                  }
                  if (launch(index, d.id)) {
                    feedback('success', 'buy');
                    toast(t('exp.launched'), 'good', '🚀');
                  }
                }}
              >
                <span>{tk(`dest.${d.id}`)}</span>
                <span className="tiny muted">
                  {locked
                    ? t('exp.needSn', { n: d.requiredSupernovas })
                    : `${formatDuration(d.duration / view.expSpeed)} · ${t('exp.chance', {
                        p: formatPercent(d.artifactChance),
                        q: formatPercent(d.stardustChance),
                      })}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {view.dest !== null && view.remaining > 0 && (
        <div className="col" style={{ gap: 6 }}>
          <Bar value={1 - view.remaining / view.duration} />
          <span className="tiny muted">{t('exp.returning', { t: formatDuration(view.remaining) })}</span>
        </div>
      )}

      {view.dest !== null && view.remaining <= 0 && (
        <button
          className="btn primary block"
          onClick={() => {
            const loot = claim(index);
            if (!loot) return;
            feedback('success', 'upgrade');
            const parts: string[] = [];
            for (const r of Object.keys(loot.resources) as (keyof typeof loot.resources)[]) {
              const v = loot.resources[r];
              if (v.gt(0)) parts.push(`${RESOURCES[r].icon} +${formatNumber(v, view.notation)}`);
            }
            if (loot.artifact) parts.push(`🏺 ${tk(loot.artifact)}`);
            if (loot.stardust.gt(0)) parts.push(`✦ +${formatNumber(loot.stardust, view.notation)}`);
            toast(parts.length ? parts.join(' · ') : t('exp.emptyLoot'), 'gold', '📦');
          }}
        >
          {t('exp.arrived')}
        </button>
      )}
    </Card>
  );
}

export function Expeditions() {
  const count = useGame((s) => s.game.expeditions.ships.length);
  return (
    <div className="col" style={{ gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <ShipCard key={i} index={i} />
      ))}
    </div>
  );
}
