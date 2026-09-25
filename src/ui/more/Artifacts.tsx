import { useGameJson } from '../hooks/useGameJson';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ARTIFACTS, RARITY_COLOR } from '../../config/artifacts';
import { describeEffects } from '../../i18n/describe';
import { useGame } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { useT } from '../../i18n';
import { feedback } from '../sfx';

export function Artifacts() {
  const { t, tk } = useT();
  const clearNewArtifacts = useGame((s) => s.clearNewArtifacts);
  useEffect(() => {
    clearNewArtifacts();
  }, [clearNewArtifacts]);

  const slots = useGame((s) => s.mods.artifactSlots);
  const equipped = useGame(useShallow((s) => s.game.artifacts.equipped));
  const rows = useGameJson((s) =>
    ARTIFACTS.map((a) => ({
      id: a.id,
      level: s.game.artifacts.owned[a.id] ?? 0,
      equipped: s.game.artifacts.equipped.includes(a.id),
    })),
  );
  const equip = useGame((s) => s.equip);
  const unequip = useGame((s) => s.unequip);
  const toast = useUi((s) => s.toast);

  const hasAny = rows.some((r) => r.level > 0);

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="title">{t('artifacts.slots', { a: equipped.length, b: slots })}</div>

      {equipped.length > 0 && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {equipped.map((id) => {
            const def = ARTIFACTS.find((a) => a.id === id);
            if (!def) return null;
            return (
              <button
                key={id}
                className="chip"
                style={{ borderColor: RARITY_COLOR[def.rarity], fontSize: 18 }}
                onClick={() => {
                  unequip(id);
                  feedback('tap', 'click');
                }}
              >
                {def.icon}
              </button>
            );
          })}
        </div>
      )}

      {!hasAny ? (
        <div className="empty">{t('artifacts.empty')}</div>
      ) : (
        <div className="grid2">
          {rows.map((row) => {
            const def = ARTIFACTS.find((a) => a.id === row.id);
            if (!def) return null;
            const owned = row.level > 0;
            return (
              <div
                key={row.id}
                className="card col"
                style={{
                  gap: 4,
                  padding: 10,
                  opacity: owned ? 1 : 0.45,
                  border: row.equipped ? `1px solid ${RARITY_COLOR[def.rarity]}` : undefined,
                  cursor: owned ? 'pointer' : 'default',
                }}
                role="button"
                tabIndex={0}
                aria-disabled={!owned}
                onKeyDown={(e) => {
                  if (owned && (e.key === 'Enter' || e.key === ' ')) e.currentTarget.click();
                }}
                onClick={() => {
                  if (!owned) return;
                  if (row.equipped) {
                    unequip(def.id);
                    feedback('tap', 'click');
                  } else {
                    if (equip(def.id)) feedback('success', 'upgrade');
                    else {
                      feedback('error', 'error');
                      toast(t('artifacts.full'), 'warn');
                    }
                  }
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 22 }}>{owned ? def.icon : '❔'}</span>
                  {owned && <span className="tiny num">{t('common.level', { n: row.level })}</span>}
                </div>
                <span className="small bold ellipsis">{owned ? tk(def.id) : '???'}</span>
                <span className="tiny" style={{ color: RARITY_COLOR[def.rarity] }}>
                  {tk(`rarity.${def.rarity}`)}
                </span>
                {owned && <span className="tiny muted">{describeEffects(def.effects, row.level)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
