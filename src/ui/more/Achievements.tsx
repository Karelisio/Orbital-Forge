import { useMemo, useState } from 'react';
import { ACHIEVEMENTS, type AchievementDef } from '../../config/achievements';
import { achievementProgress } from '../../systems/achievements';
import { achievementText } from '../../i18n/describe';
import { formatPercent } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { Bar, Card, Seg } from '../components/common';

type Filter = 'all' | 'unlocked' | 'locked';

function AchievementCard({ def, unlocked }: { def: AchievementDef; unlocked: boolean }) {
  const { t } = useT();
  const notation = useGame((s) => s.game.settings.notation);
  const progress = useGame((s) => (unlocked ? 1 : achievementProgress(s.game, def)));
  const { name, desc } = achievementText(def, notation);
  return (
    <Card
      className="col"
      style={{
        gap: 4,
        padding: 10,
        border: unlocked ? '1px solid var(--gold, #ffd23f)' : undefined,
        opacity: unlocked ? 1 : 0.75,
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
        <span className="small bold ellipsis">{name}</span>
        {unlocked && <span className="gold">★</span>}
      </div>
      <span className="tiny muted">{desc}</span>
      <span className="tiny gold">{t('ach.bonus', { p: formatPercent(def.bonus) })}</span>
      {!unlocked && (
        <div style={{ marginTop: 2 }}>
          <Bar value={progress} />
        </div>
      )}
    </Card>
  );
}

export function Achievements() {
  const { t } = useT();
  const [filter, setFilter] = useState<Filter>('all');
  const unlockedKey = useGame((s) =>
    Object.keys(s.game.achievements)
      .filter((id) => s.game.achievements[id])
      .join('|'),
  );
  const unlockedSet = useMemo(() => new Set(unlockedKey ? unlockedKey.split('|') : []), [unlockedKey]);
  const bonusPct = useMemo(
    () => ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).reduce((sum, a) => sum + a.bonus, 0),
    [unlockedSet],
  );
  const list = useMemo(() => {
    if (filter === 'unlocked') return ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id));
    if (filter === 'locked') return ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id));
    return ACHIEVEMENTS;
  }, [filter, unlockedSet]);

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="title">
        {t('ach.progress', {
          a: unlockedSet.size,
          b: ACHIEVEMENTS.length,
          p: formatPercent(bonusPct),
        })}
      </div>
      <Seg
        options={[
          { value: 'all', label: t('ach.filter.all') },
          { value: 'unlocked', label: t('ach.filter.unlocked') },
          { value: 'locked', label: t('ach.filter.locked') },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <div className="grid2">
        {list.map((def) => (
          <AchievementCard key={def.id} def={def} unlocked={unlockedSet.has(def.id)} />
        ))}
      </div>
    </div>
  );
}
