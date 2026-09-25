import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RESEARCH, RESEARCH_BY_ID } from '../../config/research';
import { RESOURCE_IDS } from '../../config/types';
import { formatDuration, formatNumber } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { MAX_QUEUE, canStartResearch, researchDuration, researchStatus } from '../../systems/research';
import { describeEffects } from '../../i18n/describe';
import { useT } from '../../i18n';
import { resName } from '../../i18n/describe';
import { feedback } from '../sfx';
import { ActionButton, Bar, Card, ResIcon, Section } from '../components/common';

function ActiveCard({ id }: { id: string }) {
  const { t, tk } = useT();
  const def = RESEARCH_BY_ID[id];
  const v = useGame(
    useShallow((s) => {
      const slot = s.game.research.active.find((a) => a.id === id);
      const remaining = slot ? slot.remaining : 0;
      const dur = researchDuration(def, s.mods);
      return {
        remaining: formatDuration(remaining / Math.max(0.0001, s.mods.research)),
        progress: dur > 0 ? 1 - remaining / def.duration : 1,
      };
    }),
  );
  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="bold small">{tk(id)}</span>
        <span className="tiny cyan num">{t('research.remaining', { t: v.remaining })}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        <Bar value={v.progress} color="var(--cyan)" />
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>
        {describeEffects(def.effects)}
      </div>
    </Card>
  );
}

function QueuedRow({ id }: { id: string }) {
  const { tk } = useT();
  const def = RESEARCH_BY_ID[id];
  const cancel = useGame((s) => s.cancelResearch);
  return (
    <div className="card row" style={{ padding: 8 }}>
      <ResIcon res={def.cost.res} size={16} />
      <span className="grow small">{tk(id)}</span>
      <button
        className="btn small ghost"
        onClick={() => {
          cancel(id);
          feedback('tap', 'click');
        }}
      >
        ✕
      </button>
    </div>
  );
}

function ResearchCard({ id, allSlotsBusy }: { id: string; allSlotsBusy: boolean }) {
  const { t, tk } = useT();
  const def = RESEARCH_BY_ID[id];
  const v = useGame(
    useShallow((s) => ({
      status: researchStatus(s.game, id),
      canStart: canStartResearch(s.game, s.mods, id),
      cost: formatNumber(def.cost.amount, s.game.settings.notation),
      duration: formatDuration(researchDuration(def, s.mods)),
    })),
  );
  const start = useGame((s) => s.startResearch);

  if (v.status === 'done' || v.status === 'active' || v.status === 'queued') return null;

  const locked = v.status === 'locked';

  return (
    <Card style={{ opacity: locked ? 0.5 : 1 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="bold small">{tk(id)}</span>
        <span className="tiny muted">{v.duration}</span>
      </div>
      <div className="tiny muted" style={{ marginTop: 2 }}>
        {describeEffects(def.effects)}
      </div>
      {locked ? (
        <div className="tiny warn" style={{ marginTop: 6 }}>
          {t('research.requires', { list: def.prereq.map((p) => tk(p)).join(', ') })}
        </div>
      ) : (
        <div className="row" style={{ marginTop: 8, gap: 6, justifyContent: 'space-between' }}>
          <span className="row num small" style={{ gap: 4 }}>
            <ResIcon res={def.cost.res} size={14} />
            {v.cost}
          </span>
          <ActionButton
            variant={v.canStart ? 'primary' : ''}
            disabled={!v.canStart}
            onClick={() => {
              if (start(id)) feedback('upgrade', 'upgrade');
              else feedback('error', 'error');
            }}
          >
            {allSlotsBusy ? t('research.queueIt') : t('research.start')}
          </ActionButton>
        </div>
      )}
    </Card>
  );
}

function DoneStrip() {
  const { t, tk } = useT();
  const [open, setOpen] = useState(false);
  const doneIds = useGame(
    useShallow((s) => RESEARCH.filter((r) => s.game.research.done[r.id]).map((r) => r.id)),
  );
  if (doneIds.length === 0) return null;
  return (
    <Section
      title={
        <button className="row" style={{ gap: 4 }} onClick={() => setOpen(!open)}>
          <span className="small muted">
            {t('common.done')} ({doneIds.length})
          </span>
          <span style={{ transform: `rotate(${open ? 90 : 0}deg)`, transition: 'transform .2s' }}>›</span>
        </button>
      }
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
              {doneIds.map((id) => (
                <span key={id} className="chip small good">
                  ✓ {tk(id)}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}

export function ResearchTab() {
  const { t } = useT();
  const disabled = useGame((s) => !!s.mods.rules.noResearch);
  const activeIds = useGame(useShallow((s) => s.game.research.active.map((a) => a.id)));
  const queueIds = useGame(useShallow((s) => [...s.game.research.queue]));
  // Research not yet done, active or queued (those are shown above / in the done strip).
  const pending = useGame((s) =>
    RESEARCH.filter(
      (r) =>
        !s.game.research.done[r.id] &&
        !s.game.research.queue.includes(r.id) &&
        !s.game.research.active.some((a) => a.id === r.id),
    )
      .map((r) => r.id)
      .join(','),
  ).split(',');
  const slotsTotal = useGame((s) => Math.floor(s.mods.researchSlots));
  const allSlotsBusy = useGame(
    (s) => s.game.research.active.length >= s.mods.researchSlots || s.game.research.queue.length > 0,
  );

  return (
    <div>
      <div className="h1">{t('research.title')}</div>
      {disabled && (
        <div className="card small warn" style={{ marginBottom: 8 }}>
          {t('research.disabled')}
        </div>
      )}
      <div className="row small muted" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <span>{t('research.slots', { a: activeIds.length, b: slotsTotal })}</span>
        <span>{t('research.queue', { a: queueIds.length, b: MAX_QUEUE })}</span>
      </div>

      {activeIds.map((id) => (
        <ActiveCard key={id} id={id} />
      ))}
      {queueIds.map((id) => (
        <QueuedRow key={id} id={id} />
      ))}

      {RESOURCE_IDS.map((res) => {
        const ids = RESEARCH.filter((r) => r.cost.res === res && pending.includes(r.id)).map((r) => r.id);
        if (ids.length === 0) return null;
        return (
          <Section
            key={res}
            title={
              <span className="row" style={{ gap: 4 }}>
                <ResIcon res={res} size={16} />
                {resName(res)}
              </span>
            }
          >
            {ids.map((id) => (
              <ResearchCard key={id} id={id} allSlotsBusy={allSlotsBusy} />
            ))}
          </Section>
        );
      })}

      <DoneStrip />
    </div>
  );
}
