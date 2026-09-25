import type { AchievementDef } from '../config/achievements';
import type { MissionReward } from '../config/missions';
import type { Effect, ResourceId } from '../config/types';
import type { UpgradeDef } from '../config/upgrades';
import { formatNumber } from '../economy/format';
import type { Notation } from '../engine/state';
import { tk } from './index';

const LOWER_IS_BETTER = new Set(['ratio', 'cost', 'boostCooldown']);
const PERCENT_ADD = new Set(['tapPct', 'critChance', 'eventFreq', 'artifactLuck', 'stardustUnspent']);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export function roman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

export function resName(r: ResourceId): string {
  return tk(`res.${r}`);
}

export function buildingName(id: string): string {
  return tk(`b.${id}`);
}

function statLabel(e: Extract<Effect, { k: 'mul' | 'lin' }>): string {
  if (e.stat === 'building') return tk('eff.building', { b: e.building ? buildingName(e.building) : '?' });
  if (e.stat === 'yield' || e.stat === 'speed' || e.stat === 'ratio' || e.stat === 'cost') {
    return e.tier ? tk(`eff.${e.stat}`, { res: resName(e.tier) }) : tk(`eff.${e.stat}All`);
  }
  return tk(`eff.${e.stat}`);
}

function pct(x: number): string {
  const v = Math.round(x * 1000) / 10;
  return `${v}%`;
}

/** Human-readable effect, at the given level (1 for one-shot sources). */
export function describeEffect(e: Effect, level = 1): string {
  switch (e.k) {
    case 'unlock':
      return tk(`unlock.${e.key}`);
    case 'mul': {
      const f = Math.pow(e.v, level);
      if (LOWER_IS_BETTER.has(e.stat)) return `${statLabel(e)} −${pct(1 - f)}`;
      return `${statLabel(e)} ×${formatNumber(f, 'short', 2)}`;
    }
    case 'lin': {
      const f = e.v * level;
      return `${statLabel(e)} +${pct(f)}`;
    }
    case 'add': {
      const v = e.v * level;
      const label = tk(`eff.${e.stat}`);
      if (PERCENT_ADD.has(e.stat)) return `${label} +${pct(v)}`;
      if (e.stat === 'offlineCap') return `${label} +${v} h`;
      if (e.stat === 'startOre') return `${label} : 1e${v}`;
      if (e.stat === 'autoTap') return `${label} +${Math.round(v * 10) / 10}/s`;
      return `${label} +${Math.round(v * 100) / 100}`;
    }
  }
}

export function describeEffects(effects: readonly Effect[], level = 1): string {
  return effects.map((e) => describeEffect(e, level)).join(' · ');
}

export function upgradeName(u: UpgradeDef): string {
  const l = u.label;
  return tk(l.key, {
    b: l.building ? buildingName(l.building) : '',
    res: l.tier ? resName(l.tier) : '',
    n: l.n ? roman(l.n) : '',
  });
}

export function achievementText(a: AchievementDef, notation: Notation): { name: string; desc: string } {
  const c = a.cond;
  const r = roman(a.rank + 1);
  if (c.type === 'produced') {
    return {
      name: tk('ach.name.prod', { res: resName(c.res), r }),
      desc: tk('ach.prod', { v: formatNumber(c.amount, notation, 0), res: resName(c.res).toLowerCase() }),
    };
  }
  if (c.type === 'tierAll') {
    const key = c.count === 1 ? 'tierAll1' : 'tierAll100';
    return {
      name: tk(`ach.name.${key}`, { res: resName(c.res) }),
      desc: tk(`ach.${key}`, { res: resName(c.res).toLowerCase() }),
    };
  }
  return {
    name: `${tk(`ach.n.${c.stat}`)} ${r}`,
    desc: tk(`ach.c.${c.stat}`, { v: formatNumber(c.value, notation, 0) }),
  };
}

export function rewardText(r: MissionReward): string {
  switch (r.type) {
    case 'warp':
      return tk('reward.warp', { n: r.minutes });
    case 'token':
      return tk('reward.token', { n: r.amount });
    case 'artifact':
      return tk('reward.artifact');
    case 'stardust':
      return tk('reward.stardust');
  }
}
