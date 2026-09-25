import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TIER_BALANCE } from '../../config/balance';
import { RESOURCES, prevResource } from '../../config/resources';
import { RESOURCE_IDS, type ResourceId } from '../../config/types';
import { formatNumber, formatPercent } from '../../economy/format';
import { isTierAllowed } from '../../economy/production';
import { useGame } from '../../store/gameStore';
import { tierVisible } from '../../systems/buildings';
import { resName } from '../../i18n/describe';
import { useT } from '../../i18n';
import { BuildingList } from '../components/BuildingList';
import { BuyAmountToggle } from '../components/BuyAmount';
import { Bar, Card, ResIcon } from '../components/common';
import { UpgradeStrip } from '../components/UpgradeStrip';

const CONVERTERS = RESOURCE_IDS.filter((r) => r !== 'ore');

function ChainDiagram() {
  const data = useGame(
    useShallow((s) =>
      RESOURCE_IDS.map(
        (r) => `${s.game.stats.produced[r].gt(0) ? 1 : 0}|${r === 'ore' ? 1 : s.rates.eff[r].toFixed(2)}`,
      ),
    ),
  );
  return (
    <div
      className="card row"
      style={{ justifyContent: 'space-between', gap: 2, overflowX: 'auto', padding: '10px 8px' }}
    >
      {RESOURCE_IDS.map((r, i) => {
        const [known, eff] = data[i].split('|');
        const e = Number(eff);
        const color = e >= 0.98 ? 'var(--good)' : e >= 0.5 ? 'var(--warn)' : 'var(--danger)';
        return (
          <div key={r} className="row" style={{ gap: 2, opacity: known === '1' ? 1 : 0.25 }}>
            {i > 0 && <span style={{ color: known === '1' ? color : 'var(--muted)', fontSize: 12 }}>➜</span>}
            <ResIcon res={r} size={16} />
          </div>
        );
      })}
    </div>
  );
}

function TierCard({ tier }: { tier: ResourceId }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const input = prevResource(tier)!;
  const v = useGame(
    useShallow((s) => {
      const n = s.game.settings.notation;
      const flow = s.rates.flows.find((f) => f.tier === tier);
      return {
        visible: tierVisible(s.game, tier),
        allowed: isTierAllowed(tier, s.mods),
        prod: formatNumber(s.rates.prod[tier], n),
        cons: formatNumber(flow ? flow.need.mul(s.rates.eff[tier]) : 0, n),
        net: formatNumber(s.rates.prod[tier].sub(s.rates.cons[tier]), n),
        eff: s.rates.eff[tier],
        running: !!flow && flow.out.gt(0),
        throttle: s.game.throttle[tier],
        needed: formatNumber(TIER_BALANCE[tier].baseCost * 0.5, n),
        amount: formatNumber(s.game.resources[tier], n),
      };
    }),
  );
  const setThrottle = useGame((s) => s.setThrottle);

  if (!v.visible) {
    return (
      <Card className="row" style={{ opacity: 0.5 }}>
        <ResIcon res={tier} />
        <span className="small muted">
          {t('factory.lockedTier', { v: v.needed, res: resName(input).toLowerCase() })}
        </span>
      </Card>
    );
  }
  const bottleneck = v.running && v.eff < 0.98;
  const color = RESOURCES[tier].color;
  return (
    <Card style={{ borderColor: bottleneck ? 'var(--warn)' : `${color}55` }}>
      <button className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(!open)}>
        <ResIcon res={tier} size={22} />
        <div className="grow col">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="bold">{resName(tier)}</span>
            <span className="num bold">{v.amount}</span>
          </div>
          <span className="tiny muted num">
            {t('factory.produces', { v: v.prod, res: resName(tier).toLowerCase() })} ·{' '}
            {t('factory.consumes', { v: v.cons, res: resName(input).toLowerCase() })}
          </span>
        </div>
        <span style={{ transform: `rotate(${open ? 90 : 0}deg)`, transition: 'transform .2s' }}>›</span>
      </button>
      <div style={{ marginTop: 8 }}>
        <div className="row tiny" style={{ justifyContent: 'space-between', marginBottom: 3 }}>
          <span className="muted">{t('factory.efficiency')}</span>
          <span className={bottleneck ? 'warn bold' : 'good'}>{v.running ? formatPercent(v.eff) : '—'}</span>
        </div>
        <Bar value={v.running ? v.eff : 0} color={bottleneck ? 'var(--warn)' : 'var(--good)'} />
        {bottleneck && (
          <div className="tiny warn" style={{ marginTop: 4 }}>
            ⚠ {t('factory.bottleneck', { res: resName(input) })}
          </div>
        )}
        {!v.allowed && (
          <div className="tiny danger" style={{ marginTop: 4 }}>
            ✕
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="tiny muted" style={{ width: 52 }}>
          {t('factory.throttle')}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(v.throttle * 100)}
          onChange={(e) => setThrottle(tier, Number(e.target.value) / 100)}
          aria-label={t('factory.throttle')}
        />
        <span className="tiny num" style={{ width: 38, textAlign: 'right' }}>
          {Math.round(v.throttle * 100)}%
        </span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <UpgradeStrip tiers={[tier]} />
            <div style={{ marginTop: 8 }}>
              <BuildingList tier={tier} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function FactoryTab() {
  const { t } = useT();
  const shown = useGame((s) => {
    let n = 0;
    for (const r of CONVERTERS) {
      n++;
      if (!tierVisible(s.game, r)) break;
    }
    return n;
  });
  return (
    <div>
      <div className="h1">{t('factory.title')}</div>
      <ChainDiagram />
      <div style={{ margin: '8px 0' }} data-tut="buy-amount">
        <BuyAmountToggle />
      </div>
      {CONVERTERS.slice(0, shown).map((r) => (
        <TierCard key={r} tier={r} />
      ))}
    </div>
  );
}
