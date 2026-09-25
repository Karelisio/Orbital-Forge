import { BOOSTS } from '../../config/boosts';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { BoostBar } from '../components/BoostBar';
import { Card } from '../components/common';

const ICON = { overdrive: '⚡', frenzy: '👊', warp: '⏩' } as const;

export function Boosts() {
  const { t } = useT();
  const tokens = useGame((s) => s.game.boostTokens);

  return (
    <div className="col" style={{ gap: 12 }}>
      <BoostBar />
      <div className="chip gold" style={{ alignSelf: 'flex-start' }}>
        🎟 {t('boosts.tokens', { n: tokens })}
      </div>
      <div className="col" style={{ gap: 8 }}>
        {BOOSTS.map((b) => (
          <Card key={b.id} className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 20 }}>{ICON[b.id]}</span>
            <div className="col" style={{ gap: 2 }}>
              <span className="bold small">{t(`boost.${b.id}`)}</span>
              <span className="tiny muted">{t(`boost.${b.id}.desc`)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
