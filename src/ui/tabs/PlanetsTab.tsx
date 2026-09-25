import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { PLANETS } from '../../config/planets';
import { planetLevelCost } from '../../config/planets';
import type { PlanetId } from '../../config/types';
import { formatNumber } from '../../economy/format';
import { useGame } from '../../store/gameStore';
import { canColonize, canLevelPlanet, planetVisible } from '../../systems/planets';
import { describeEffects } from '../../i18n/describe';
import { useT } from '../../i18n';
import { feedback } from '../sfx';
import { ActionButton, Card, ResIcon } from '../components/common';

function Sphere({ palette, size = 56 }: { palette: readonly [string, string, string]; size?: number }) {
  const [core, highlight, atmosphere] = palette;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `radial-gradient(circle at 32% 28%, ${highlight} 0%, ${core} 55%, #05060f 100%)`,
        boxShadow: `0 0 ${size * 0.5}px ${atmosphere}66, inset -6px -6px 14px rgba(0,0,0,0.5)`,
      }}
    />
  );
}

function PlanetCard({ id }: { id: PlanetId }) {
  const { t, tk } = useT();
  const def = PLANETS.find((p) => p.id === id)!;
  const v = useGame(
    useShallow((s) => {
      const n = s.game.settings.notation;
      const lvl = s.game.planets[id];
      const colonized = lvl > 0;
      return {
        visible: planetVisible(s.game, id),
        colonized,
        level: lvl,
        canColonize: canColonize(s.game, s.mods, id),
        canLevel: colonized && canLevelPlanet(s.game, id),
        colonizeCost: formatNumber(def.colonize.amount, n),
        stock: formatNumber(s.game.planetRes[id], n),
        prod: formatNumber(def.baseProd * lvl * s.mods.planet, n),
        levelCost: colonized ? formatNumber(planetLevelCost(def, lvl), n) : '',
        bonus: describeEffects(def.effects, Math.max(1, lvl)),
        nextBonus: colonized ? describeEffects(def.effects, lvl + 1) : '',
      };
    }),
  );
  const colonize = useGame((s) => s.colonize);
  const levelPlanet = useGame((s) => s.levelPlanet);

  if (!v.visible) {
    return (
      <Card className="row" style={{ opacity: 0.35 }}>
        <Sphere palette={def.palette} size={40} />
        <span className="muted small">{t('planets.locked')}</span>
      </Card>
    );
  }

  return (
    <Card style={{ borderColor: `${def.palette[2]}44` }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Sphere palette={def.palette} />
        <div className="grow col">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="bold">{tk(`planet.${id}`)}</span>
            {v.colonized && <span className="chip num">{t('common.level', { n: v.level })}</span>}
          </div>
          <span className="tiny muted">{tk(`planet.${id}.desc`)}</span>
        </div>
      </div>

      {v.colonized ? (
        <>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="small muted">{tk(`pres.${id}`)}</span>
            <span className="num small">
              {v.stock} ({v.prod}
              {t('common.perSec')})
            </span>
          </div>
          <div className="tiny cyan" style={{ marginTop: 6, minHeight: 16 }}>
            {t('planets.bonus')}: {v.bonus}
          </div>
          {v.nextBonus && (
            <div className="tiny muted" style={{ marginTop: 2 }}>
              → {v.nextBonus}
            </div>
          )}
          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <ActionButton
              className="grow"
              variant={v.canLevel ? 'primary' : ''}
              disabled={!v.canLevel}
              onClick={() => {
                if (levelPlanet(id)) feedback('upgrade', 'upgrade');
                else feedback('error', 'error');
              }}
            >
              <span className="row" style={{ gap: 4, justifyContent: 'center' }}>
                {t('planets.levelUp')} · {v.levelCost}
              </span>
            </ActionButton>
            <ActionButton
              variant="gold"
              disabled={!v.canLevel}
              onClick={() => {
                if (levelPlanet(id, true)) feedback('upgrade', 'upgrade');
                else feedback('error', 'error');
              }}
            >
              {t('common.max')}
            </ActionButton>
          </div>
        </>
      ) : (
        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          <span className="row grow num small" style={{ gap: 4 }}>
            <ResIcon res={def.colonize.res} size={14} />
            {v.colonizeCost}
          </span>
          <ActionButton
            variant={v.canColonize ? 'primary' : ''}
            disabled={!v.canColonize}
            onClick={() => {
              if (colonize(id)) feedback('upgrade', 'upgrade');
              else feedback('error', 'error');
            }}
          >
            {t('planets.colonize')}
          </ActionButton>
        </div>
      )}
    </Card>
  );
}

export function PlanetsTab() {
  const { t } = useT();
  const disabled = useGame((s) => !!s.mods.rules.noResearch);
  return (
    <div>
      <div className="h1">{t('planets.title')}</div>
      {disabled && (
        <div className="card small warn" style={{ marginBottom: 8 }}>
          {t('planets.disabled')}
        </div>
      )}
      {PLANETS.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 4) * 0.03 }}
        >
          <PlanetCard id={p.id} />
        </motion.div>
      ))}
    </div>
  );
}
