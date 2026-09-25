import { useMemo } from 'react';
import { useGame, type GameStore } from '../../store/gameStore';

/**
 * Selects structured, JSON-serializable data from the store. The selector result is compared as a string,
 * so components re-render only when the data actually changes (safe for arrays of objects, unlike useShallow).
 */
export function useGameJson<T>(selector: (s: GameStore) => T): T {
  const json = useGame((s) => JSON.stringify(selector(s)));
  return useMemo(() => JSON.parse(json) as T, [json]);
}
