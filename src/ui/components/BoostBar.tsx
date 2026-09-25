import { useShallow } from 'zustand/react/shallow';
import { BOOSTS } from '../../config/boosts';
import { formatDuration } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { feedback } from '../sfx';
import { useUi } from '../../store/uiStore';

const ICON = { overdrive: '⚡', frenzy: '👊', warp: '⏩' } as const;

export function BoostBar({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const state = useGame(
    useShallow((s) =>
      BOOSTS.map((b) => {
        const st = s.game.boosts[b.id];
        return `${Math.ceil(st.active)}|${Math.ceil(st.cooldown)}`;
      }),
    ),
  );
  const tokens = useGame((s) => s.game.boostTokens);
  const activate = useGame((s) => s.activateBoost);
  const spendToken = useGame((s) => s.spendToken);
  const toast = useUi((s) => s.toast);

  return (
    <div className="grid3">
      {BOOSTS.map((b, i) => {
        const [active, cd] = state[i].split('|').map(Number);
        const ready = active <= 0 && cd <= 0;
        return (
          <button
            key={b.id}
            className={`btn ${ready ? 'primary' : ''} ${active > 0 ? 'pulse' : ''}`}
            style={{ flexDirection: 'column', gap: 0, minHeight: compact ? 48 : 64, padding: '6px 4px' }}
            onClick={() => {
              if (ready) {
                if (activate(b.id)) {
                  feedback('success', 'upgrade');
                  toast(t(`boost.${b.id}`), 'gold', ICON[b.id]);
                }
              } else if (active <= 0 && tokens > 0 && spendToken(b.id)) {
                feedback('buy', 'click');
              } else feedback('error', 'error');
            }}
          >
            <span style={{ fontSize: '1.2em' }}>{ICON[b.id]}</span>
            <span className="tiny bold">{t(`boost.${b.id}`)}</span>
            <span className="tiny num" style={{ opacity: 0.8 }}>
              {active > 0
                ? formatDuration(active)
                : cd > 0
                  ? tokens > 0
                    ? `🎟 ${formatDuration(cd)}`
                    : formatDuration(cd)
                  : t('common.ready')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
