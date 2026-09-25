import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BALANCE } from '../../config/balance';
import { CHALLENGES } from '../../config/challenges';
import { SINGULARITY, SINGULARITY_BY_ID, singularityCost } from '../../config/singularity';
import { TALENTS, TALENTS_BY_ID, talentCost, type TalentBranch } from '../../config/talents';
import { Decimal } from '../../economy/decimal';
import { formatDuration, formatNumber, formatPercent } from '../../economy/format';
import { runScore, scoreForStardust, singularityGain, stardustGain } from '../../economy/prestige';
import { useGame } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import {
  canBlackHole,
  canBuySingularity,
  canBuyTalent,
  canSupernova,
  challengeAvailable,
  challengeGoal,
  talentsSpent,
} from '../../systems/prestige';
import { describeEffects } from '../../i18n/describe';
import { useT } from '../../i18n';
import { scene } from '../../render/sceneInstance';
import { feedback } from '../sfx';
import { ActionButton, Bar, Card, Seg, Toggle } from '../components/common';

type Panel = 'supernova' | 'talents' | 'blackhole' | 'challenges';
const BRANCHES: TalentBranch[] = ['prod', 'forge', 'impact', 'time', 'fortune'];

function SupernovaPanel() {
  const { t } = useT();
  const v = useGame(
    useShallow((s) => {
      const n = s.game.settings.notation;
      const gain = stardustGain(s.game, s.mods);
      const nextAt = scoreForStardust(gain.add(1), s.mods.stardust);
      return {
        score: formatNumber(runScore(s.game), n),
        gain: formatNumber(gain, n),
        canGo: canSupernova(s.game, s.mods),
        nextAt: formatNumber(nextAt, n),
        unspent: formatNumber(s.game.prestige.stardust, n),
        unspentBonusPct: formatPercent(s.mods.stardustUnspent),
        snDescPct: formatPercent(s.mods.stardustUnspent),
        auto: s.game.settings.autoSupernova,
        autoMult: s.game.settings.autoSupernovaMult,
        hasAuto: !!s.mods.unlocks.autoSupernova,
        // Serialized so the shallow comparison stays stable between renders.
        historyJson: JSON.stringify(
          s.game.prestige.history
            .slice(-5)
            .reverse()
            .map((h) => ({
              at: h.at,
              duration: formatDuration(h.duration),
              gain: formatNumber(new Decimal(h.gain), n),
              kind: h.kind,
            })),
        ),
      };
    }),
  );
  const history = JSON.parse(v.historyJson) as { at: number; duration: string; gain: string; kind: string }[];
  const supernova = useGame((s) => s.supernova);
  const updateSettings = useGame((s) => s.updateSettings);
  const openModal = useUi((s) => s.openModal);
  const setTab = useUi((s) => s.setTab);

  const trigger = () => {
    openModal({
      type: 'confirm',
      title: t('prestige.confirmSn'),
      body: t('prestige.confirmBody'),
      confirmLabel: t('prestige.go'),
      danger: false,
      onConfirm: () => {
        const gain = supernova();
        if (gain.gte(1)) {
          scene.supernova();
          feedback('prestige', 'prestige');
          setTab('mine');
        } else {
          feedback('error', 'error');
        }
      },
    });
  };

  return (
    <div>
      <Card>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted small">{t('prestige.score', { v: v.score })}</span>
        </div>
        <div className="h1 gold" style={{ margin: '6px 0' }}>
          {t('prestige.gain', { v: v.gain })}
        </div>
        <div className="tiny muted">{t('prestige.nextAt', { v: v.nextAt })}</div>
        <p className="small muted" style={{ marginTop: 8 }}>
          {t('prestige.snDesc', { p: v.snDescPct })}
        </p>
        <ActionButton
          className="block"
          variant={v.canGo ? 'gold' : ''}
          disabled={!v.canGo}
          onClick={trigger}
          sound={null}
        >
          {v.canGo ? t('prestige.go') : t('prestige.notYet')}
        </ActionButton>
      </Card>

      <Card>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">{t('prestige.unspent', { v: v.unspent, p: v.unspentBonusPct })}</span>
        </div>
      </Card>

      {v.hasAuto && (
        <Card>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small">{t('prestige.auto')}</span>
            <Toggle on={v.auto} onChange={(on) => updateSettings({ autoSupernova: on })} />
          </div>
          {v.auto && (
            <div style={{ marginTop: 8 }}>
              <Seg
                options={[0.25, 0.5, 1, 2].map((m) => ({
                  value: m,
                  label: t('prestige.autoThreshold', { p: formatPercent(m) }),
                }))}
                value={v.autoMult}
                onChange={(m) => updateSettings({ autoSupernovaMult: m })}
              />
            </div>
          )}
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          {history.map((h, i) => (
            <div key={i} className="row small muted" style={{ justifyContent: 'space-between' }}>
              <span>
                {h.kind === 'supernova' ? '✦' : '◉'} {h.duration}
              </span>
              <span className="num">+{h.gain}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function TalentNode({ id }: { id: string }) {
  const def = TALENTS_BY_ID[id];
  const v = useGame(
    useShallow((s) => {
      const lvl = s.game.prestige.talents[id] ?? 0;
      const prereqOk = def.prereq.every((p) => (s.game.prestige.talents[p] ?? 0) > 0);
      return {
        lvl,
        maxed: lvl >= def.maxLevel,
        locked: !prereqOk,
        canBuy: canBuyTalent(s.game, id),
        cost: talentCost(def, lvl),
        effect: describeEffects(def.effects, Math.max(1, lvl)),
      };
    }),
  );
  const buy = useGame((s) => s.buyTalent);

  return (
    <div className="card" style={{ padding: 8, opacity: v.locked ? 0.4 : 1 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small bold">{v.effect}</span>
        <span className="tiny chip num">
          {v.lvl}/{def.maxLevel}
        </span>
      </div>
      {!v.maxed && !v.locked && (
        <button
          className={`btn small ${v.canBuy ? 'primary' : ''}`}
          style={{ marginTop: 6 }}
          aria-disabled={!v.canBuy}
          onClick={() => {
            if (buy(id)) feedback('buy', 'buy');
            else feedback('error', 'error');
          }}
        >
          ✧ {v.cost}
        </button>
      )}
    </div>
  );
}

function TalentsPanel() {
  const { t } = useT();
  const [branch, setBranch] = useState<TalentBranch>('prod');
  const ids = TALENTS.filter((tal) => tal.branch === branch)
    .sort((a, b) => a.row - b.row)
    .map((tal) => tal.id);
  const unspent = useGame((s) => formatNumber(s.game.prestige.stardust, s.game.settings.notation));
  const spent = useGame((s) => talentsSpent(s.game));
  const respec = useGame((s) => s.respecTalents);
  const openModal = useUi((s) => s.openModal);

  return (
    <div>
      <Card>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">✧ {unspent}</span>
          {spent > 0 && (
            <button
              className="btn small ghost"
              onClick={() =>
                openModal({
                  type: 'confirm',
                  title: t('prestige.respec'),
                  body: t('prestige.respecBody', { v: spent }),
                  danger: true,
                  onConfirm: () => {
                    respec();
                    feedback('tap', 'click');
                  },
                })
              }
            >
              {t('prestige.respec')}
            </button>
          )}
        </div>
      </Card>
      <Seg
        options={BRANCHES.map((b) => ({ value: b, label: t(`branch.${b}`) }))}
        value={branch}
        onChange={setBranch}
      />
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ids.map((id) => (
          <TalentNode key={id} id={id} />
        ))}
      </div>
    </div>
  );
}

function SingularityRow({ id }: { id: string }) {
  const def = SINGULARITY_BY_ID[id];
  const { tk } = useT();
  const v = useGame(
    useShallow((s) => {
      const lvl = s.game.prestige.singUpgrades[id] ?? 0;
      return {
        lvl,
        maxed: lvl >= def.maxLevel,
        canBuy: canBuySingularity(s.game, id),
        cost: singularityCost(def, lvl),
        effect: describeEffects(def.effects, Math.max(1, lvl)),
      };
    }),
  );
  const buy = useGame((s) => s.buySingularity);
  return (
    <div className="card row" style={{ padding: 8 }}>
      <div className="grow col">
        <span className="small bold">{tk(id)}</span>
        <span className="tiny muted">{v.effect}</span>
      </div>
      <span className="tiny chip num">
        {v.lvl}/{def.maxLevel}
      </span>
      {!v.maxed && (
        <button
          className={`btn small ${v.canBuy ? 'primary' : ''}`}
          aria-disabled={!v.canBuy}
          onClick={() => {
            if (buy(id)) feedback('buy', 'buy');
            else feedback('error', 'error');
          }}
        >
          ◉ {v.cost}
        </button>
      )}
    </div>
  );
}

function BlackHolePanel() {
  const { t } = useT();
  const v = useGame(
    useShallow((s) => {
      const n = s.game.settings.notation;
      const min = BALANCE.prestige.blackHoleMinStardust;
      return {
        gain: formatNumber(singularityGain(s.game, s.mods), n),
        canGo: canBlackHole(s.game, s.mods),
        progress: Math.min(1, s.game.prestige.stardustCycle.div(min).toNumber()),
        need: formatNumber(min, n),
        singularityBonusPct: formatPercent(BALANCE.prestige.singularityGlobal),
      };
    }),
  );
  const blackHole = useGame((s) => s.blackHole);
  const openModal = useUi((s) => s.openModal);

  return (
    <div>
      <Card>
        <div className="h1 magenta" style={{ margin: '4px 0' }}>
          {t('prestige.gain', { v: v.gain })}
        </div>
        <p className="small muted">{t('prestige.bhDesc', { p: v.singularityBonusPct })}</p>
        <div className="tiny muted" style={{ marginTop: 6 }}>
          {t('prestige.bhRequires', { v: v.need })}
        </div>
        <div style={{ marginTop: 6 }}>
          <Bar value={v.progress} color="var(--magenta)" />
        </div>
        <div style={{ marginTop: 10 }}>
          <ActionButton
            className="block"
            variant={v.canGo ? 'danger' : ''}
            disabled={!v.canGo}
            sound={null}
            onClick={() =>
              openModal({
                type: 'confirm',
                title: t('prestige.confirmBh'),
                body: t('prestige.confirmBody'),
                danger: true,
                onConfirm: () => {
                  const gain = blackHole();
                  if (gain.gte(1)) {
                    scene.supernova(0xff3df0);
                    feedback('prestige', 'blackhole');
                  } else {
                    feedback('error', 'error');
                  }
                },
              })
            }
          >
            {v.canGo ? t('prestige.go') : t('prestige.notYet')}
          </ActionButton>
        </div>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SINGULARITY.map((s) => (
          <SingularityRow key={s.id} id={s.id} />
        ))}
      </div>
    </div>
  );
}

function ChallengeCard({ id }: { id: string }) {
  const { t, tk } = useT();
  const def = CHALLENGES.find((c) => c.id === id)!;
  const v = useGame(
    useShallow((s) => {
      const active = s.game.challenges.active === id;
      const completions = s.game.challenges.completions[id] ?? 0;
      const total = s.mods.unlocks.challenges2 ? def.goals.length : 1;
      return {
        active,
        available: challengeAvailable(s.game, s.mods, id),
        completions,
        total,
        goal: formatNumber(challengeGoal(s.game, id)),
        progress: active ? Math.min(1, runScore(s.game).div(challengeGoal(s.game, id)).toNumber()) : 0,
        unlockAt: def.unlockSupernovas,
        reached: s.game.prestige.supernovas >= def.unlockSupernovas,
      };
    }),
  );
  const start = useGame((s) => s.startChallenge);
  const abandon = useGame((s) => s.abandonChallenge);
  const openModal = useUi((s) => s.openModal);

  if (!v.reached) {
    return (
      <Card style={{ opacity: 0.35 }}>
        <span className="bold small">{tk(id)}</span>
        <div className="tiny muted">{t('challenges.unlockAt', { n: v.unlockAt })}</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="bold small">{tk(id)}</span>
        <span className="tiny chip num">{t('challenges.completions', { a: v.completions, b: v.total })}</span>
      </div>
      <div className="tiny muted" style={{ marginTop: 2 }}>
        {tk(`${id}.desc`)}
      </div>
      <div className="tiny" style={{ marginTop: 4 }}>
        {t('challenges.goal', { v: v.goal })}
      </div>
      <div className="tiny cyan" style={{ marginTop: 2 }}>
        {t('challenges.reward')}: {describeEffects(def.reward)}
      </div>
      {v.active ? (
        <>
          <div style={{ marginTop: 8 }}>
            <Bar value={v.progress} color="var(--gold)" />
          </div>
          <button
            className="btn danger small block"
            style={{ marginTop: 6 }}
            onClick={() => {
              abandon();
              feedback('tap', 'click');
            }}
          >
            {t('challenges.abandon')}
          </button>
        </>
      ) : (
        v.completions < v.total && (
          <button
            className="btn primary small block"
            style={{ marginTop: 8 }}
            onClick={() =>
              openModal({
                type: 'confirm',
                title: t('challenges.start'),
                body: t('challenges.startBody'),
                onConfirm: () => {
                  if (start(id)) feedback('prestige', 'prestige');
                  else feedback('error', 'error');
                },
              })
            }
          >
            {t('challenges.start')}
          </button>
        )
      )}
    </Card>
  );
}

function ChallengesPanel() {
  const { t } = useT();
  return (
    <div>
      <p className="small muted">{t('challenges.startBody')}</p>
      {CHALLENGES.map((c) => (
        <ChallengeCard key={c.id} id={c.id} />
      ))}
    </div>
  );
}

export function PrestigeTab() {
  const { t } = useT();
  const [panel, setPanel] = useState<Panel>('supernova');
  const showBlackHole = useGame(
    (s) =>
      s.game.prestige.blackHoles > 0 ||
      s.game.prestige.stardustCycle.gte(BALANCE.prestige.blackHoleMinStardust * 0.1) ||
      s.game.prestige.stardustTotal.gt(0),
  );
  const showChallenges = useGame((s) => s.game.prestige.supernovas >= 1);

  const options: { value: Panel; label: string }[] = [
    { value: 'supernova', label: t('prestige.supernova') },
    { value: 'talents', label: t('prestige.talents') },
  ];
  if (showBlackHole) options.push({ value: 'blackhole', label: t('prestige.blackhole') });
  if (showChallenges) options.push({ value: 'challenges', label: t('challenges.title') });

  return (
    <div>
      <Seg options={options} value={panel} onChange={setPanel} />
      <div style={{ marginTop: 8 }}>
        {panel === 'supernova' && <SupernovaPanel />}
        {panel === 'talents' && <TalentsPanel />}
        {panel === 'blackhole' && showBlackHole && <BlackHolePanel />}
        {panel === 'challenges' && showChallenges && <ChallengesPanel />}
      </div>
    </div>
  );
}
