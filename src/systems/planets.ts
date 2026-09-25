import { PLANETS, PLANETS_BY_ID, planetLevelCost } from '../config/planets';
import type { PlanetId } from '../config/types';
import type { Modifiers } from '../economy/modifiers';
import { isTierAllowed } from '../economy/production';
import type { GameState } from '../engine/state';

export function planetVisible(s: GameState, id: PlanetId): boolean {
  const i = PLANETS.findIndex((p) => p.id === id);
  return i === 0 || s.planets[PLANETS[i - 1].id] > 0 || s.planets[id] > 0;
}

export function canColonize(s: GameState, mods: Modifiers, id: PlanetId): boolean {
  const def = PLANETS_BY_ID[id];
  if (s.planets[id] > 0 || mods.rules.noResearch || !isTierAllowed(def.colonize.res, mods)) return false;
  return planetVisible(s, id) && s.resources[def.colonize.res].gte(def.colonize.amount);
}

export function colonize(s: GameState, mods: Modifiers, id: PlanetId): boolean {
  if (!canColonize(s, mods, id)) return false;
  const def = PLANETS_BY_ID[id];
  s.resources[def.colonize.res] = s.resources[def.colonize.res].sub(def.colonize.amount).max(0);
  s.planets[id] = 1;
  s.run.sinceLastPurchase = 0;
  return true;
}

export function canLevelPlanet(s: GameState, id: PlanetId): boolean {
  const lvl = s.planets[id];
  return lvl > 0 && s.planetRes[id].gte(planetLevelCost(PLANETS_BY_ID[id], lvl));
}

export function levelPlanet(s: GameState, id: PlanetId): boolean {
  if (!canLevelPlanet(s, id)) return false;
  const cost = planetLevelCost(PLANETS_BY_ID[id], s.planets[id]);
  s.planetRes[id] = s.planetRes[id].sub(cost).max(0);
  s.planets[id]++;
  return true;
}
