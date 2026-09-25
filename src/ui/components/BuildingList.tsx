import { BUILDINGS_BY_TIER } from '../../config/buildings';
import type { ResourceId } from '../../config/types';
import { useGame } from '../../store/gameStore';
import { buildingVisible } from '../../systems/buildings';
import { BuildingRow } from './BuildingRow';

/** Visible buildings of a tier plus one locked teaser. */
export function BuildingList({ tier }: { tier: ResourceId }) {
  const list = BUILDINGS_BY_TIER[tier];
  const visibleCount = useGame((s) => list.filter((b) => buildingVisible(s.game, b)).length);
  const shown = list.slice(0, Math.min(list.length, visibleCount + 1));
  return (
    <>
      {shown.map((b) => (
        <BuildingRow key={b.id} id={b.id} />
      ))}
    </>
  );
}
