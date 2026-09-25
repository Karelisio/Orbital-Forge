import { useShallow } from 'zustand/react/shallow';
import { RESOURCE_IDS } from '../../config/types';
import { RESOURCES } from '../../config/resources';
import { formatDuration, formatNumber } from '../../economy/format';
import { resName } from '../../i18n/describe';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { Card, Section } from '../components/common';

function KeyStats() {
  const { t } = useT();
  const v = useGame(
    useShallow((s) => {
      const st = s.game.stats;
      const n = s.game.settings.notation;
      return {
        playTime: formatDuration(st.playTime),
        runTime: formatDuration(s.game.run.time),
        taps: st.taps.toLocaleString(),
        crits: st.crits.toLocaleString(),
        maxCombo: st.maxCombo.toLocaleString(),
        tapProduced: formatNumber(st.tapProduced, n),
        buildingsBought: st.buildingsBought.toLocaleString(),
        upgradesBought: st.upgradesBought.toLocaleString(),
        supernovas: s.game.prestige.supernovas.toLocaleString(),
        blackHoles: s.game.prestige.blackHoles.toLocaleString(),
        eventsCaught: st.eventsCaught.toLocaleString(),
        expeditions: st.expeditionsDone.toLocaleString(),
        artifacts: st.artifactsFound.toLocaleString(),
      };
    }),
  );
  const rows: [string, string][] = [
    [t('stats.playTime'), v.playTime],
    [t('stats.runTime'), v.runTime],
    [t('stats.taps'), v.taps],
    [t('stats.crits'), v.crits],
    [t('stats.maxCombo'), v.maxCombo],
    [t('stats.tapProduced'), v.tapProduced],
    [t('stats.buildingsBought'), v.buildingsBought],
    [t('stats.upgradesBought'), v.upgradesBought],
    [t('stats.supernovas'), v.supernovas],
    [t('stats.blackHoles'), v.blackHoles],
    [t('stats.eventsCaught'), v.eventsCaught],
    [t('stats.expeditions'), v.expeditions],
    [t('stats.artifacts'), v.artifacts],
  ];
  return (
    <div className="grid2">
      {rows.map(([label, value]) => (
        <Card key={label} className="col" style={{ gap: 2, padding: 10 }}>
          <span className="tiny muted">{label}</span>
          <span className="bold num">{value}</span>
        </Card>
      ))}
    </div>
  );
}

function Produced() {
  const { t } = useT();
  const values = useGame(
    useShallow((s) =>
      RESOURCE_IDS.map((r) => formatNumber(s.game.stats.produced[r], s.game.settings.notation)),
    ),
  );
  return (
    <div className="col" style={{ gap: 4 }}>
      {RESOURCE_IDS.map((r, i) => (
        <div key={r} className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">{t('stats.produced', { res: resName(r) })}</span>
          <span className="num">{values[i]}</span>
        </div>
      ))}
    </div>
  );
}

const CHART_W = 300;
const CHART_H = 160;

function Chart() {
  const { t } = useT();
  const history = useGame((s) => s.game.stats.history);

  if (history.length < 2) return <div className="empty small">{t('stats.noHistory')}</div>;

  const t0 = history[0].t;
  const tN = history[history.length - 1].t;
  const span = Math.max(1, tN - t0);
  let min = Infinity;
  let max = -Infinity;
  for (const sample of history) {
    for (const v of sample.rates) {
      if (Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (max - min < 1e-6) max = min + 1;

  const x = (t: number) => ((t - t0) / span) * CHART_W;
  const y = (v: number) => CHART_H - ((v - min) / (max - min)) * (CHART_H - 12) - 6;

  return (
    <div className="col" style={{ gap: 6 }}>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        height={180}
        preserveAspectRatio="none"
        role="img"
        aria-label={t('stats.chart')}
      >
        <line x1={0} y1={CHART_H - 6} x2={CHART_W} y2={CHART_H - 6} stroke="var(--border)" strokeWidth={1} />
        {RESOURCE_IDS.map((r, i) => {
          const points = history.map((s) => `${x(s.t)},${y(s.rates[i] ?? min)}`).join(' ');
          return (
            <polyline
              key={r}
              points={points}
              fill="none"
              stroke={RESOURCES[r].color}
              strokeWidth={1.5}
              opacity={0.9}
            />
          );
        })}
      </svg>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {RESOURCE_IDS.map((r) => (
          <span key={r} className="chip tiny" style={{ color: RESOURCES[r].color }}>
            ● {resName(r)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Multipliers() {
  const { tk } = useT();
  const sources = useGame((s) => s.mods.globalSources);
  const entries = Object.entries(sources).filter(([, f]) => Math.abs(f - 1) > 1e-4);
  if (!entries.length) return null;
  return (
    <div className="col" style={{ gap: 4 }}>
      {entries.map(([key, factor]) => (
        <div key={key} className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">{tk(`stats.src.${key}`)}</span>
          <span className="num">×{factor.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

function PrestigeHistory() {
  const { t, tk } = useT();
  const history = useGame(useShallow((s) => s.game.prestige.history));
  if (!history.length) return <div className="empty">{t('stats.noHistory')}</div>;
  const reversed = [...history].reverse();
  return (
    <div className="col" style={{ gap: 6 }}>
      {reversed.map((r, i) => (
        <Card key={i} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="bold small">
              {t(r.kind === 'supernova' ? 'prestige.supernova' : 'prestige.blackhole')}
            </span>
            {r.challenge && <span className="tiny muted">{tk(r.challenge)}</span>}
            <span className="tiny muted">{formatDuration(r.duration)}</span>
          </div>
          <span className="gold num">+{r.gain}</span>
        </Card>
      ))}
    </div>
  );
}

export function Stats() {
  const { t } = useT();
  return (
    <div className="col" style={{ gap: 16 }}>
      <KeyStats />
      <Section title={t('stats.producedTitle')}>
        <Produced />
      </Section>
      <Section title={t('stats.chart')}>
        <Chart />
      </Section>
      <Section title={t('stats.multipliers')}>
        <Multipliers />
      </Section>
      <Section title={t('stats.history')}>
        <PrestigeHistory />
      </Section>
    </div>
  );
}
