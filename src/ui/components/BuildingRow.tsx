import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BUILDINGS_BY_ID } from '../../config/buildings';
import { milestoneCount, nextMilestone } from '../../economy/cost';
import { formatDuration, formatNumber } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { buildingVisible, quoteBuilding } from '../../systems/buildings';
import { buildingName } from '../../i18n/describe';
import { useT } from '../../i18n';
import { feedback } from '../sfx';
import { Bar, ResIcon } from './common';
import { Icon } from './Icon';

export const BuildingRow = memo(function BuildingRow({ id }: { id: string }) {
  const def = BUILDINGS_BY_ID[id];
  const { t } = useT();
  const view = useGame(
    useShallow((s) => {
      const g = s.game;
      const n = g.settings.notation;
      const owned = g.buildings[id] ?? 0;
      const visible = buildingVisible(g, def);
      const q = quoteBuilding(g, s.mods, id, g.settings.buyAmount);
      const out = s.rates.flows.find((f) => f.tier === def.tier)?.perBuilding[id];
      const next = nextMilestone(owned);
      const prevM =
        [0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000][milestoneCount(owned)] ?? 0;
      const net = s.rates.prod[def.costRes].sub(s.rates.cons[def.costRes]);
      const missing = q.cost.sub(g.resources[def.costRes]);
      const eta = q.affordable ? 0 : net.gt(0) ? missing.div(net).toNumber() : Infinity;
      return {
        visible,
        owned,
        qty: q.qty,
        cost: formatNumber(q.cost, n),
        affordable: q.affordable,
        rate: out ? formatNumber(out, n) : '0',
        progress: next ? (owned - prevM) / (next - prevM) : 1,
        next,
        eta: eta > 0 && eta < 3600 * 24 * 30 ? formatDuration(eta) : '',
        capped: s.mods.rules.maxBuildings !== undefined && owned >= s.mods.rules.maxBuildings,
      };
    }),
  );
  const buy = useGame((s) => s.buyBuilding);
  const openModal = useUi((s) => s.openModal);

  if (!view.visible) {
    return (
      <div className="card row" style={{ opacity: 0.35 }}>
        <Icon name="lock" size={18} />
        <span className="muted">{t('build.unknown')}</span>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 10 }} data-tut={`building-${id}`}>
      <div className="row">
        <button
          className="grow col"
          style={{ textAlign: 'left', alignItems: 'stretch' }}
          onClick={() => openModal({ type: 'building', id })}
          aria-label={buildingName(id)}
        >
          <div className="row" style={{ gap: 6 }}>
            <span className="bold ellipsis">{buildingName(id)}</span>
            <span className="chip num">{view.owned}</span>
          </div>
          <span className="small muted num">
            {view.rate}
            {t('common.perSec')}
          </span>
          <div style={{ marginTop: 4 }}>
            <Bar value={view.progress} />
          </div>
        </button>
        <button
          className={`btn ${view.affordable ? 'primary' : ''}`}
          aria-disabled={!view.affordable}
          style={{ minWidth: 112, flexDirection: 'column', gap: 0, lineHeight: 1.15 }}
          onClick={() => {
            if (buy(id) > 0) feedback('buy', 'buy');
            else feedback('error', 'error');
          }}
        >
          <span className="tiny" style={{ opacity: 0.85 }}>
            {view.capped ? t('build.capped') : `×${view.qty}`}
          </span>
          <span className="row num" style={{ gap: 4 }}>
            <ResIcon res={def.costRes} size={12} />
            {view.cost}
          </span>
          {view.eta && (
            <span className="tiny" style={{ opacity: 0.7 }}>
              ⏱ {view.eta}
            </span>
          )}
        </button>
      </div>
    </div>
  );
});
