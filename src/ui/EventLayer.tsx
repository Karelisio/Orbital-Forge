import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BALANCE } from '../config/balance';
import { Decimal } from '../economy/decimal';
import { formatNumber } from '../economy/format';
import { scene } from '../render/sceneInstance';
import { useGame } from '../store/gameStore';
import { useUi } from '../store/uiStore';
import { shieldCost } from '../systems/events';
import { useT } from '../i18n';
import { resName } from '../i18n/describe';
import { playSfx } from '../audio';
import { haptic } from '../platform/haptics';
import { ResIcon } from './components/common';

interface Meteor {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  dur: number;
}

function Meteors() {
  const active = useGame((s) => s.game.events.active?.type === 'meteors');
  const caught = useGame((s) => (s.game.events.active?.type === 'meteors' ? s.game.events.active.caught : 0));
  const catchMeteor = useGame((s) => s.catchMeteor);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  useEffect(() => {
    if (!active) {
      setMeteors([]);
      return;
    }
    let id = 0;
    const spawn = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const fromLeft = Math.random() < 0.5;
      setMeteors((m) => [
        ...m.slice(-6),
        {
          id: ++id,
          x: fromLeft ? -40 : w + 40,
          y: h * (0.12 + Math.random() * 0.45),
          dx: (fromLeft ? 1 : -1) * (w + 80),
          dy: h * (0.1 + Math.random() * 0.25),
          dur: 2.4 + Math.random() * 1.6,
        },
      ]);
    };
    spawn();
    const timer = window.setInterval(
      spawn,
      (BALANCE.events.meteorDuration * 1000) / (BALANCE.events.meteorCount + 3),
    );
    return () => window.clearInterval(timer);
  }, [active]);
  if (!active || caught >= BALANCE.events.meteorCount) return null;
  return (
    <>
      {meteors.map((m) => (
        <motion.button
          key={m.id}
          aria-label="meteor"
          initial={{ x: m.x, y: m.y, rotate: 0 }}
          animate={{ x: m.x + m.dx, y: m.y + m.dy, rotate: 360 }}
          transition={{ duration: m.dur, ease: 'linear' }}
          onAnimationComplete={() => setMeteors((list) => list.filter((q) => q.id !== m.id))}
          onPointerDown={(e) => {
            const gain = catchMeteor();
            if (gain) {
              const notation = useGame.getState().game.settings.notation;
              scene.burst(e.clientX, e.clientY, 0xff9f43, 30, 320);
              scene.floatText(e.clientX, e.clientY, `+${formatNumber(gain, notation)}`, 0xff9f43, true);
              playSfx('meteor');
              haptic('crit');
            }
            setMeteors((list) => list.filter((q) => q.id !== m.id));
          }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 40,
            width: 64,
            height: 64,
            marginLeft: -32,
            marginTop: -32,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 35%, #ffd29b, #ff7b00 45%, #6a2c00 70%, transparent 72%)',
            boxShadow: '0 0 24px #ff9f43, -20px -10px 30px #ff5a3655',
          }}
        />
      ))}
    </>
  );
}

function Comet() {
  const active = useGame((s) => s.game.events.active?.type === 'comet');
  const catchComet = useGame((s) => s.catchComet);
  const toast = useUi((s) => s.toast);
  const { t } = useT();
  const path = useMemo(() => {
    const h = window.innerHeight;
    return { y0: h * (0.15 + Math.random() * 0.3), y1: h * (0.2 + Math.random() * 0.3) };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AnimatePresence>
      {active && (
        <motion.button
          aria-label="comet"
          initial={{ x: window.innerWidth + 60, y: path.y0 }}
          animate={{ x: -80, y: path.y1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: BALANCE.events.cometDuration, ease: 'linear' }}
          onPointerDown={(e) => {
            const res = catchComet();
            if (!res) return;
            scene.supernova(0xffd23f);
            scene.burst(e.clientX, e.clientY, 0xffd23f, 60, 450);
            playSfx('comet');
            haptic('prestige');
            const notation = useGame.getState().game.settings.notation;
            toast(
              res.kind === 'frenzy'
                ? t('event.cometFrenzy', {
                    v: BALANCE.events.cometFrenzyMult,
                    t: `${Math.round(res.seconds)}s`,
                  })
                : t('event.cometLump', { v: formatNumber(res.ore, notation) }),
              'gold',
              '☄',
            );
          }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 41,
            width: 70,
            height: 70,
            marginLeft: -35,
            marginTop: -35,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff 0%, #ffe14d 30%, #ffb300 55%, transparent 70%)',
            boxShadow: '0 0 40px #ffd23f, 60px 0 60px -10px #ffd23f88, 120px 0 80px -20px #ffd23f44',
          }}
        />
      )}
    </AnimatePresence>
  );
}

function EventBanner() {
  const { t } = useT();
  const ev = useGame(
    useShallow((s) => {
      const a = s.game.events.active;
      if (!a) return null;
      return {
        type: a.type,
        remaining: Math.ceil(a.remaining),
        shielded: a.type === 'storm' ? a.shielded : false,
        offers: a.type === 'merchant' ? a.offers.map((o) => JSON.stringify(o)).join('§') : '',
      };
    }),
  );
  const notation = useGame((s) => s.game.settings.notation);
  const shield = useGame((s) => (s.game.events.active?.type === 'storm' ? shieldCost(s.game) : null));
  const buyOffer = useGame((s) => s.buyOffer);
  const shieldStorm = useGame((s) => s.shieldStorm);
  if (!ev || ev.type === 'meteors' || ev.type === 'comet') return null;
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="card"
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-top) + 58px)',
        left: 10,
        right: 10,
        zIndex: 35,
        background: 'var(--panel-solid)',
        borderColor: ev.type === 'storm' ? 'var(--warn)' : 'var(--gold)',
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="bold">
          {ev.type === 'storm' ? '☀' : '🛸'} {t(`event.${ev.type}`)}
        </span>
        <span className="chip num">{ev.remaining}s</span>
      </div>
      <div className="tiny muted">{t(`event.${ev.type}.desc`)}</div>
      {ev.type === 'storm' && shield && (
        <button
          className={`btn small block ${ev.shielded ? '' : 'gold'}`}
          style={{ marginTop: 8 }}
          aria-disabled={ev.shielded}
          onClick={() => {
            if (shieldStorm()) {
              playSfx('upgrade');
              haptic('success');
            }
          }}
        >
          {ev.shielded
            ? `🛡 ${t('event.shielded')}`
            : `🛡 ${t('event.shield', { v: formatNumber(shield.amount, notation), res: resName(shield.res).toLowerCase() })}`}
        </button>
      )}
      {ev.type === 'merchant' && (
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {ev.offers.split('§').map((raw, i) => {
            const o = JSON.parse(raw) as import('../engine/state').MerchantOffer;
            const res = o.kind === 'swap' ? o.from : o.res;
            const label =
              o.kind === 'swap'
                ? t('offer.swap', {
                    a: formatNumber(new Decimal(o.amount), notation),
                    from: resName(o.from).toLowerCase(),
                    b: formatNumber(new Decimal(o.gain), notation),
                    to: resName(o.to).toLowerCase(),
                  })
                : t(`offer.${o.kind}`);
            return (
              <button
                key={i}
                className={`btn small ${o.bought ? '' : 'primary'}`}
                aria-disabled={o.bought}
                style={{ justifyContent: 'space-between' }}
                onClick={() => {
                  if (buyOffer(i)) {
                    playSfx('buy');
                    haptic('buy');
                  } else {
                    playSfx('error');
                    haptic('error');
                  }
                }}
              >
                <span className="ellipsis">{label}</span>
                <span className="row num" style={{ gap: 4 }}>
                  {o.bought ? (
                    t('offer.bought')
                  ) : (
                    <>
                      <ResIcon res={res} size={12} />
                      {formatNumber(new Decimal(o.amount), notation)}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export function EventLayer() {
  return (
    <>
      <Meteors />
      <Comet />
      <AnimatePresence>
        <EventBanner />
      </AnimatePresence>
    </>
  );
}
