import { useGameJson } from '../hooks/useGameJson';
import type { ComponentType } from 'react';
import type { GameState } from '../../engine/state';
import type { MoreSection } from '../../systems/unlocks';
import { sectionUnlocked } from '../../systems/unlocks';
import { missionComplete } from '../../systems/missions';
import { useUi } from '../../store/uiStore';
import { useT } from '../../i18n';
import { Icon } from '../components/Icon';
import { Missions } from '../more/Missions';
import { Achievements } from '../more/Achievements';
import { Artifacts } from '../more/Artifacts';
import { Expeditions } from '../more/Expeditions';
import { Managers } from '../more/Managers';
import { Boosts } from '../more/Boosts';
import { Stats } from '../more/Stats';
import { Settings } from '../more/Settings';

const SECTIONS: { id: MoreSection; icon: string }[] = [
  { id: 'missions', icon: '🎯' },
  { id: 'achievements', icon: '🏆' },
  { id: 'artifacts', icon: '🏺' },
  { id: 'expeditions', icon: '🚀' },
  { id: 'managers', icon: '🤖' },
  { id: 'boosts', icon: '⚡' },
  { id: 'stats', icon: '📊' },
  { id: 'settings', icon: '⚙️' },
];

const SECTION_COMPONENTS: Record<MoreSection, ComponentType> = {
  missions: Missions,
  achievements: Achievements,
  artifacts: Artifacts,
  expeditions: Expeditions,
  managers: Managers,
  challenges: () => null,
  boosts: Boosts,
  stats: Stats,
  settings: Settings,
};

function missionsBadge(g: GameState): number {
  const daily = g.missions.daily.filter((m) => !m.claimed && missionComplete(g, m)).length;
  const weekly = g.missions.weekly.filter((m) => !m.claimed && missionComplete(g, m)).length;
  return daily + weekly + (g.missions.streakClaimed ? 0 : 1);
}

function badgeFor(section: MoreSection, g: GameState): number {
  switch (section) {
    case 'missions':
      return missionsBadge(g);
    case 'artifacts':
      return g.artifacts.newIds.length;
    case 'expeditions':
      return g.expeditions.ships.filter((sh) => sh && sh.remaining <= 0).length;
    default:
      return 0;
  }
}

function SectionGrid() {
  const { t } = useT();
  const setMoreSection = useUi((s) => s.setMoreSection);
  const rows = useGameJson((s) =>
    SECTIONS.filter((sec) => sectionUnlocked(s.game, s.mods, sec.id)).map((sec) => ({
      id: sec.id,
      icon: sec.icon,
      badge: badgeFor(sec.id, s.game),
    })),
  );

  return (
    <div className="grid2">
      {rows.map((row) => (
        <button
          key={row.id}
          className="card col"
          style={{ alignItems: 'center', gap: 6, padding: '18px 8px', position: 'relative' }}
          onClick={() => setMoreSection(row.id)}
        >
          {row.badge > 0 && (
            <span className="badge" style={{ position: 'absolute', top: 8, right: 8 }}>
              {row.badge}
            </span>
          )}
          <span style={{ fontSize: 28 }}>{row.icon}</span>
          <span className="bold small">{t(`more.section.${row.id}`)}</span>
        </button>
      ))}
    </div>
  );
}

export function MoreTab() {
  const { t } = useT();
  const moreSection = useUi((s) => s.moreSection);
  const setMoreSection = useUi((s) => s.setMoreSection);

  if (!moreSection) return <SectionGrid />;

  const Section = SECTION_COMPONENTS[moreSection];
  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <button
          className="btn ghost small"
          aria-label={t('common.close')}
          onClick={() => setMoreSection(null)}
        >
          <Icon name="back" size={18} />
        </button>
        <span className="title">{t(`more.section.${moreSection}`)}</span>
      </div>
      <Section />
    </div>
  );
}
