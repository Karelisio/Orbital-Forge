import { AnimatePresence, motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { UPGRADES, UPGRADES_BY_ID } from '../../config/upgrades';
import type { ResourceId } from '../../config/types';
import { formatNumber } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { canBuyUpgrade, upgradeAvailable } from '../../systems/upgrades';
import { describeEffects, upgradeName } from '../../i18n/describe';
import { useT } from '../../i18n';
import { feedback } from '../sfx';
import { ResIcon, Section } from './common';

/** Horizontal carousel of available upgrades, cheapest first. `tiers` filters by cost resource. */
export function UpgradeStrip({ tiers }: { tiers: ResourceId[] }) {
  const { t } = useT();
  const ids = useGame(
    useShallow((s) =>
      UPGRADES.filter((u) => tiers.includes(u.cost.res) && upgradeAvailable(s.game, u))
        .sort((a, b) => a.cost.amount - b.cost.amount)
        .slice(0, 12)
        .map((u) => u.id),
    ),
  );
  const affordable = useGame(
    useShallow((s) => ids.map((id) => canBuyUpgrade(s.game, s.mods, UPGRADES_BY_ID[id]))),
  );
  const notation = useGame((s) => s.game.settings.notation);
  const disabled = useGame((s) => !!s.mods.rules.noUpgrades);
  const buy = useGame((s) => s.buyUpgrade);
  const buyAll = useGame((s) => s.buyAllUpgrades);
  const anyAffordable = affordable.some(Boolean);

  return (
    <Section
      title={`${t('upg.title')} (${ids.length})`}
      right={
        anyAffordable ? (
          <button
            className="btn small ghost"
            onClick={() => {
              if (buyAll() > 0) feedback('upgrade', 'upgrade');
            }}
          >
            {t('upg.buyAll')}
          </button>
        ) : null
      }
    >
      {disabled ? (
        <div className="card small muted">{t('upg.disabled')}</div>
      ) : ids.length === 0 ? (
        <div className="card small muted">{t('upg.none')}</div>
      ) : (
        <div
          className="row"
          style={{
            overflowX: 'auto',
            gap: 8,
            paddingBottom: 4,
            scrollbarWidth: 'none',
            alignItems: 'stretch',
          }}
        >
          <AnimatePresence initial={false}>
            {ids.map((id, i) => {
              const u = UPGRADES_BY_ID[id];
              return (
                <motion.button
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className={`card ${affordable[i] ? 'shine' : ''}`}
                  style={{
                    minWidth: 150,
                    maxWidth: 170,
                    textAlign: 'left',
                    marginBottom: 0,
                    borderColor: affordable[i] ? 'var(--border-strong)' : 'var(--border)',
                    opacity: affordable[i] ? 1 : 0.6,
                  }}
                  onClick={() => {
                    if (buy(id)) feedback('upgrade', 'upgrade');
                    else feedback('error', 'error');
                  }}
                >
                  <div className="bold small" style={{ marginBottom: 4 }}>
                    {upgradeName(u)}
                  </div>
                  <div className="tiny muted" style={{ minHeight: 30 }}>
                    {describeEffects(u.effects)}
                  </div>
                  <div className="row small num" style={{ gap: 4, marginTop: 6 }}>
                    <ResIcon res={u.cost.res} size={12} />
                    {formatNumber(u.cost.amount, notation)}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Section>
  );
}
