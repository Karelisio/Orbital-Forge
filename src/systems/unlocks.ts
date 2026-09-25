import { BALANCE } from '../config/balance';
import type { Modifiers } from '../economy/modifiers';
import { runScore } from '../economy/prestige';
import type { GameState } from '../engine/state';

export type TabId = 'mine' | 'factory' | 'planets' | 'research' | 'prestige' | 'more';

export function tabUnlocked(s: GameState, tab: TabId): boolean {
  const veteran = s.prestige.supernovas > 0 || s.prestige.blackHoles > 0;
  switch (tab) {
    case 'mine':
    case 'more':
      return true;
    case 'factory':
      return veteran || s.stats.produced.ore.gte(150);
    case 'research':
      return veteran || s.stats.produced.metal.gte(30);
    case 'planets':
      return veteran || s.stats.produced.metal.gte(1000);
    case 'prestige':
      return veteran || runScore(s).gte(BALANCE.prestige.scoreDiv * 0.2);
  }
}

export type MoreSection =
  | 'missions'
  | 'achievements'
  | 'artifacts'
  | 'expeditions'
  | 'managers'
  | 'challenges'
  | 'boosts'
  | 'stats'
  | 'settings';

export function sectionUnlocked(s: GameState, mods: Modifiers, section: MoreSection): boolean {
  switch (section) {
    case 'artifacts':
      return mods.unlocks.artifacts || Object.keys(s.artifacts.owned).length > 0;
    case 'expeditions':
      return mods.unlocks.expeditions;
    case 'managers':
      return mods.unlocks.managers1;
    case 'challenges':
      return s.prestige.supernovas > 0;
    case 'boosts':
      return s.stats.produced.metal.gt(0) || s.prestige.supernovas > 0;
    default:
      return true;
  }
}
