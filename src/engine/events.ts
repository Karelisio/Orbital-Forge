import type { ResourceId } from '../config/types';

/** Notable things that happened during a step, consumed by UI/audio layers. */
export type GameEvent =
  | { type: 'achievement'; id: string }
  | { type: 'researchDone'; id: string }
  | { type: 'expeditionDone'; index: number }
  | { type: 'artifact'; id: string; level: number }
  | { type: 'eventStart'; event: 'meteors' | 'comet' | 'merchant' | 'storm' }
  | { type: 'eventEnd' }
  | { type: 'challengeDone'; id: string }
  | { type: 'challengeFailed'; id: string }
  | { type: 'milestone'; building: string; count: number }
  | { type: 'autoSupernova'; gain: string }
  | { type: 'tierUnlocked'; tier: ResourceId };

export interface StepContext {
  offline?: boolean;
  emit?: (e: GameEvent) => void;
}

export function emit(ctx: StepContext | undefined, e: GameEvent): void {
  ctx?.emit?.(e);
}
