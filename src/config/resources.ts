import { RESOURCE_IDS, type ResourceId, type PlanetId } from './types';

export interface ResourceDef {
  id: ResourceId;
  tier: number;
  color: string;
  icon: string;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  ore: { id: 'ore', tier: 0, color: '#c9a27a', icon: '⛏' },
  metal: { id: 'metal', tier: 1, color: '#b8c7d9', icon: '⚙' },
  alloy: { id: 'alloy', tier: 2, color: '#ff9f43', icon: '◆' },
  component: { id: 'component', tier: 3, color: '#39f3ff', icon: '⌬' },
  energy: { id: 'energy', tier: 4, color: '#ffe14d', icon: 'ϟ' },
  crystal: { id: 'crystal', tier: 5, color: '#c77dff', icon: '✦' },
  darkMatter: { id: 'darkMatter', tier: 6, color: '#ff4fd8', icon: '◉' },
};

export function tierIndex(id: ResourceId): number {
  return RESOURCES[id].tier;
}

export function prevResource(id: ResourceId): ResourceId | null {
  const i = RESOURCES[id].tier;
  return i > 0 ? RESOURCE_IDS[i - 1] : null;
}

export function nextResource(id: ResourceId): ResourceId | null {
  const i = RESOURCES[id].tier;
  return i < RESOURCE_IDS.length - 1 ? RESOURCE_IDS[i + 1] : null;
}

export const PLANET_RES_COLOR: Record<PlanetId, string> = {
  cryon: '#9be7ff',
  vulcara: '#ff5a36',
  sylva: '#5dff8f',
  aquor: '#3d8bff',
  zephyr: '#ffd29b',
  nyx: '#8a5cff',
  aurum: '#ffd23f',
  omega: '#ff3df0',
};
