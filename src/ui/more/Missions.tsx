import { useGameJson } from '../hooks/useGameJson';
import { MISSIONS_BY_ID, type MissionPeriod } from '../../config/missions';
import { missionComplete, missionProgress, streakReward } from '../../systems/missions';
import { rewardText } from '../../i18n/describe';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { feedback } from '../sfx';
import { Bar, Card, Section } from '../components/common';

interface Row {
  id: string;
  label: string;
  progress: number;
  reward: string;
  complete: boolean;
  claimed: boolean;
}

function useMissionRows(period: MissionPeriod): Row[] {
  const { t } = useT();
  return useGameJson((s) => {
    const list = period === 'daily' ? s.game.missions.daily : s.game.missions.weekly;
    return list.map((m) => {
      const def = MISSIONS_BY_ID[m.id];
      const progress = Math.min(1, missionProgress(s.game, m) / def.target);
      return {
        id: m.id,
        label: t(`missions.stat.${def.stat}`, { n: def.target }),
        progress: Math.round(progress * 1000) / 1000,
        reward: rewardText(def.reward),
        complete: missionComplete(s.game, m),
        claimed: m.claimed,
      };
    });
  });
}

function MissionList({ period }: { period: MissionPeriod }) {
  const { t } = useT();
  const rows = useMissionRows(period);
  const claim = useGame((s) => s.claimMission);
  return (
    <Section title={t(period === 'daily' ? 'missions.daily' : 'missions.weekly')}>
      <div className="col" style={{ gap: 8 }}>
        {rows.map((row, i) => (
          <Card key={row.id}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <div className="grow col" style={{ gap: 4 }}>
                <span className="small bold">{row.label}</span>
                <Bar value={row.progress} />
                <span className="tiny muted">{row.reward}</span>
              </div>
              {row.claimed ? (
                <span className="good bold">✓</span>
              ) : (
                <button
                  className={`btn small ${row.complete ? 'primary' : ''}`}
                  aria-disabled={!row.complete}
                  onClick={() => {
                    if (row.complete && claim(period, i)) feedback('success', 'upgrade');
                    else feedback('error', 'error');
                  }}
                >
                  {t('common.claim')}
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function StreakCard() {
  const { t } = useT();
  const streak = useGame((s) => s.game.missions.streak);
  const claimed = useGame((s) => s.game.missions.streakClaimed);
  const reward = useGame((s) => rewardText(streakReward(s.game)));
  const claimStreak = useGame((s) => s.claimStreak);
  return (
    <Card className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
      <div className="col" style={{ gap: 4 }}>
        <span className="bold">{t('missions.streak', { n: streak })}</span>
        <span className="tiny muted">{reward}</span>
      </div>
      {claimed ? (
        <span className="good bold">✓</span>
      ) : (
        <button
          className="btn primary small"
          onClick={() => {
            if (claimStreak()) feedback('success', 'upgrade');
          }}
        >
          {t('missions.streakClaim')}
        </button>
      )}
    </Card>
  );
}

export function Missions() {
  return (
    <div className="col" style={{ gap: 14 }}>
      <StreakCard />
      <MissionList period="daily" />
      <MissionList period="weekly" />
    </div>
  );
}
