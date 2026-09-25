import { useShallow } from 'zustand/react/shallow';
import { BUILDINGS_BY_ID } from '../../config/buildings';
import { milestoneMult, nextMilestone } from '../../economy/cost';
import { formatDuration, formatNumber, formatPercent } from '../../economy/format';
import { buildingInput } from '../../economy/production';
import { useGame } from '../../store/gameStore';
import { quoteBuilding } from '../../systems/buildings';
import { buildingName, resName } from '../../i18n/describe';
import { useT } from '../../i18n';
import { Sheet } from '../components/Sheet';
import { ResIcon } from '../components/common';

export function BuildingInfo({ id }: { id: string }) {
  const def = BUILDINGS_BY_ID[id];
  const { t } = useT();
  const v = useGame(
    useShallow((s) => {
      const n = s.game.settings.notation;
      const owned = s.game.buildings[id] ?? 0;
      const flow = s.rates.flows.find((f) => f.tier === def.tier);
      const out = flow?.perBuilding[id];
      const share = out && flow && flow.out.gt(0) ? out.div(flow.out).toNumber() : 0;
      const q = quoteBuilding(s.game, s.mods, id, s.game.settings.buyAmount);
      const net = s.rates.prod[def.costRes].sub(s.rates.cons[def.costRes]);
      const missing = q.cost.sub(s.game.resources[def.costRes]);
      const eta = q.affordable ? 0 : net.gt(0) ? missing.div(net).toNumber() : Infinity;
      const throttle = def.tier === 'ore' ? 1 : s.game.throttle[def.tier];
      const input = buildingInput(def, owned, s.mods, throttle);
      return {
        owned,
        each: out && owned > 0 ? formatNumber(out.div(owned), n) : '0',
        total: out ? formatNumber(out, n) : '0',
        share,
        input: formatNumber(input, n),
        next: nextMilestone(owned),
        mult: milestoneMult(owned),
        eta:
          eta === 0
            ? t('build.affordable')
            : Number.isFinite(eta)
              ? t('build.timeToBuy', { t: formatDuration(eta) })
              : '∞',
        cost: formatNumber(q.cost, n),
        qty: q.qty,
      };
    }),
  );
  return (
    <Sheet title={buildingName(id)}>
      <div className="col" style={{ gap: 8 }}>
        <div className="row small">
          <ResIcon res={def.tier} />
          <span className="grow">{t('common.owned', { n: v.owned })}</span>
          <span className="chip">×{v.mult} ⚡</span>
        </div>
        <div className="card small col">
          <span>{t('build.tooltip.each', { v: v.each })}</span>
          <span>{t('build.tooltip.total', { v: v.total })}</span>
          <span className="cyan">{t('build.share', { p: formatPercent(v.share) })}</span>
          {def.input && (
            <span className="muted">
              {t('build.tooltip.input', { v: v.input, res: resName(def.input).toLowerCase() })}
            </span>
          )}
        </div>
        <div className="card small col">
          <span>{v.next ? t('build.nextMilestone', { n: v.next }) : t('build.allMilestones')}</span>
          <span className="row" style={{ gap: 4 }}>
            {t('common.cost')} ×{v.qty} : <ResIcon res={def.costRes} size={12} />{' '}
            <b className="num">{v.cost}</b>
          </span>
          <span className="muted">⏱ {v.eta}</span>
        </div>
      </div>
    </Sheet>
  );
}
