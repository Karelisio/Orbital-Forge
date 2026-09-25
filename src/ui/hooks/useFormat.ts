import { useCallback } from 'react';
import { Decimal } from '../../economy/decimal';
import { formatDuration, formatNumber } from '../../economy/format';
import { useGame } from '../../store/gameStore';

/** Returns a number formatter bound to the player's notation setting. */
export function useFormat(): (v: Decimal | number, digits?: number) => string {
  const notation = useGame((s) => s.game.settings.notation);
  return useCallback((v: Decimal | number, digits = 2) => formatNumber(v, notation, digits), [notation]);
}

export { formatDuration };
