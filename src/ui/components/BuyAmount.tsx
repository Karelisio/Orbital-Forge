import type { BuyAmount as BA } from '../../engine/state';
import { useGame } from '../../store/gameStore';
import { useT } from '../../i18n';
import { Seg } from './common';

export function BuyAmountToggle() {
  const value = useGame((s) => s.game.settings.buyAmount);
  const set = useGame((s) => s.setBuyAmount);
  const { t } = useT();
  const options: { value: BA; label: string }[] = [
    { value: 1, label: 'x1' },
    { value: 10, label: 'x10' },
    { value: 100, label: 'x100' },
    { value: 'next', label: t('common.next') },
    { value: 'max', label: t('common.max') },
  ];
  return <Seg options={options} value={value} onChange={set} />;
}
