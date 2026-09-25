import { useGameJson } from '../hooks/useGameJson';
import { useShallow } from 'zustand/react/shallow';
import { BUILDINGS_BY_TIER } from '../../config/buildings';
import { RESOURCE_IDS, type ResourceId } from '../../config/types';
import { managerUnlocked } from '../../systems/managers';
import { buildingName, resName } from '../../i18n/describe';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { Card, Seg, Toggle } from '../components/common';

function ManagerCard({ tier }: { tier: ResourceId }) {
  const { t } = useT();
  const cfg = useGame(useShallow((s) => s.game.managers[tier]));
  const setManager = useGame((s) => s.setManager);
  const buildings = BUILDINGS_BY_TIER[tier];

  return (
    <Card className="col" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="bold">{resName(tier)}</span>
        <Toggle on={cfg.enabled} onChange={(v) => setManager(tier, { enabled: v })} />
      </div>
      <Seg
        options={[
          { value: 'cheapest', label: t('managers.mode.cheapest') },
          { value: 'roi', label: t('managers.mode.roi') },
          { value: 'target', label: t('managers.mode.target') },
        ]}
        value={cfg.mode}
        onChange={(mode) => setManager(tier, { mode })}
      />
      {cfg.mode === 'target' && (
        <select
          value={cfg.target ?? ''}
          onChange={(e) => setManager(tier, { target: e.target.value || null })}
          style={{
            padding: 8,
            borderRadius: 10,
            background: '#0005',
            border: '1px solid var(--border)',
            color: 'inherit',
          }}
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {buildingName(b.id)}
            </option>
          ))}
        </select>
      )}
      <div className="row" style={{ gap: 8 }}>
        <span className="tiny muted grow">
          {t('managers.reserve', { p: `${Math.round(cfg.reserve * 100)}%` })}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={90}
        step={5}
        value={Math.round(cfg.reserve * 100)}
        onChange={(e) => setManager(tier, { reserve: Number(e.target.value) / 100 })}
      />
    </Card>
  );
}

export function Managers() {
  const { t } = useT();
  const tiers = useGameJson((s) =>
    RESOURCE_IDS.map((tier) => ({ tier, unlocked: managerUnlocked(tier, s.mods) })),
  );
  const autoUpgradesUnlocked = useGame((s) => s.mods.unlocks.autoUpgrades);
  const autoUpgrades = useGame((s) => s.game.autoUpgrades);
  const setAutoUpgrades = useGame((s) => s.setAutoUpgrades);

  return (
    <div className="col" style={{ gap: 10 }}>
      <p className="muted small">{t('managers.desc')}</p>
      {tiers.map(({ tier, unlocked }) =>
        unlocked ? (
          <ManagerCard key={tier} tier={tier} />
        ) : (
          <Card key={tier} className="row" style={{ justifyContent: 'space-between', opacity: 0.5 }}>
            <span className="bold">{resName(tier)}</span>
            <span className="tiny muted">{t('managers.locked')}</span>
          </Card>
        ),
      )}
      {autoUpgradesUnlocked && (
        <Card className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small">{t('managers.autoUpgrades')}</span>
          <Toggle on={autoUpgrades} onChange={setAutoUpgrades} />
        </Card>
      )}
    </div>
  );
}
