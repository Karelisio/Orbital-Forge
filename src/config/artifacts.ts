import type { Effect } from './types';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ArtifactDef {
  id: string;
  rarity: Rarity;
  icon: string;
  /** Effects applied with L = artifact level (only when equipped). */
  effects: Effect[];
}

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legendary: 2 };
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8c7d9',
  rare: '#39a0ff',
  epic: '#c77dff',
  legendary: '#ffd23f',
};

export const ARTIFACTS: readonly ArtifactDef[] = [
  { id: 'a_pick', rarity: 'common', icon: '⛏', effects: [{ k: 'lin', stat: 'tap', v: 0.15 }] },
  {
    id: 'a_geode',
    rarity: 'common',
    icon: '🪨',
    effects: [{ k: 'lin', stat: 'yield', tier: 'ore', v: 0.08 }],
  },
  {
    id: 'a_gear',
    rarity: 'common',
    icon: '⚙',
    effects: [{ k: 'lin', stat: 'yield', tier: 'metal', v: 0.08 }],
  },
  {
    id: 'a_coil',
    rarity: 'common',
    icon: '🌀',
    effects: [{ k: 'lin', stat: 'yield', tier: 'alloy', v: 0.08 }],
  },
  {
    id: 'a_chip',
    rarity: 'common',
    icon: '💾',
    effects: [{ k: 'lin', stat: 'yield', tier: 'component', v: 0.08 }],
  },
  { id: 'a_lens', rarity: 'common', icon: '🔍', effects: [{ k: 'add', stat: 'critChance', v: 0.005 }] },
  { id: 'a_map', rarity: 'common', icon: '🗺', effects: [{ k: 'lin', stat: 'expSpeed', v: 0.05 }] },
  { id: 'a_clock', rarity: 'common', icon: '🕰', effects: [{ k: 'lin', stat: 'offlineEff', v: 0.03 }] },
  { id: 'a_antenna', rarity: 'common', icon: '📡', effects: [{ k: 'add', stat: 'eventFreq', v: 0.03 }] },
  { id: 'a_flask', rarity: 'common', icon: '⚗', effects: [{ k: 'lin', stat: 'research', v: 0.04 }] },
  {
    id: 'a_battery',
    rarity: 'rare',
    icon: '🔋',
    effects: [{ k: 'lin', stat: 'yield', tier: 'energy', v: 0.1 }],
  },
  {
    id: 'a_prism',
    rarity: 'rare',
    icon: '🔷',
    effects: [{ k: 'lin', stat: 'yield', tier: 'crystal', v: 0.1 }],
  },
  { id: 'a_compass', rarity: 'rare', icon: '🧭', effects: [{ k: 'lin', stat: 'expLoot', v: 0.08 }] },
  { id: 'a_hammer', rarity: 'rare', icon: '🔨', effects: [{ k: 'lin', stat: 'critMult', v: 0.1 }] },
  { id: 'a_gloves', rarity: 'rare', icon: '🧤', effects: [{ k: 'add', stat: 'comboMax', v: 0.1 }] },
  { id: 'a_seed', rarity: 'rare', icon: '🌱', effects: [{ k: 'lin', stat: 'planet', v: 0.1 }] },
  { id: 'a_hourglass', rarity: 'rare', icon: '⏳', effects: [{ k: 'add', stat: 'offlineCap', v: 0.5 }] },
  { id: 'a_totem', rarity: 'rare', icon: '🗿', effects: [{ k: 'lin', stat: 'eventReward', v: 0.1 }] },
  { id: 'a_core', rarity: 'rare', icon: '🧿', effects: [{ k: 'lin', stat: 'speed', v: 0.04 }] },
  { id: 'a_drone', rarity: 'rare', icon: '🛸', effects: [{ k: 'add', stat: 'autoTap', v: 0.5 }] },
  { id: 'a_heart', rarity: 'epic', icon: '💠', effects: [{ k: 'lin', stat: 'global', v: 0.05 }] },
  { id: 'a_crown', rarity: 'epic', icon: '👑', effects: [{ k: 'lin', stat: 'stardust', v: 0.05 }] },
  { id: 'a_eye', rarity: 'epic', icon: '👁', effects: [{ k: 'add', stat: 'artifactLuck', v: 0.03 }] },
  { id: 'a_engine', rarity: 'epic', icon: '🚀', effects: [{ k: 'lin', stat: 'research', v: 0.1 }] },
  {
    id: 'a_shard',
    rarity: 'epic',
    icon: '🔮',
    effects: [{ k: 'lin', stat: 'yield', tier: 'darkMatter', v: 0.12 }],
  },
  { id: 'a_mirror', rarity: 'epic', icon: '🪞', effects: [{ k: 'mul', stat: 'ratio', v: 0.97 }] },
  { id: 'a_codex', rarity: 'epic', icon: '📜', effects: [{ k: 'mul', stat: 'cost', v: 0.97 }] },
  { id: 'a_star', rarity: 'legendary', icon: '🌟', effects: [{ k: 'lin', stat: 'global', v: 0.15 }] },
  { id: 'a_singular', rarity: 'legendary', icon: '🕳', effects: [{ k: 'lin', stat: 'singularity', v: 0.05 }] },
  {
    id: 'a_forge',
    rarity: 'legendary',
    icon: '🔥',
    effects: [
      { k: 'lin', stat: 'tap', v: 0.5 },
      { k: 'lin', stat: 'global', v: 0.05 },
    ],
  },
];

export const ARTIFACTS_BY_ID: Readonly<Record<string, ArtifactDef>> = Object.fromEntries(
  ARTIFACTS.map((a) => [a.id, a]),
);
