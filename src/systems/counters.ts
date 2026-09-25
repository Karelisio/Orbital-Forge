import type { CounterStat } from '../config/achievements';
import { PLANET_IDS } from '../config/types';
import type { GameState } from '../engine/state';

export function totalBuildings(s: GameState): number {
  let n = 0;
  for (const id in s.buildings) n += s.buildings[id];
  return n;
}

export function counterValue(s: GameState, stat: CounterStat): number {
  switch (stat) {
    case 'taps':
      return s.stats.taps;
    case 'crits':
      return s.stats.crits;
    case 'maxCombo':
      return s.stats.maxCombo;
    case 'buildingsOwned':
      return totalBuildings(s);
    case 'buildingsBought':
      return s.stats.buildingsBought;
    case 'upgradesBought':
      return s.stats.upgradesBought;
    case 'supernovas':
      return s.prestige.supernovas;
    case 'blackHoles':
      return s.prestige.blackHoles;
    case 'planetsColonized':
      return PLANET_IDS.filter((p) => s.planets[p] > 0).length;
    case 'planetMaxLevel':
      return Math.max(0, ...PLANET_IDS.map((p) => s.planets[p]));
    case 'researchDone':
      return s.stats.researchDone;
    case 'artifactsDistinct':
      return Object.keys(s.artifacts.owned).length;
    case 'expeditionsDone':
      return s.stats.expeditionsDone;
    case 'challengesDone':
      return s.stats.challengesDone;
    case 'eventsCaught':
      return s.stats.eventsCaught;
    case 'meteors':
      return s.stats.meteors;
    case 'playHours':
      return s.stats.playTime / 3600;
    case 'missionsDone':
      return s.stats.missionsDone;
    case 'streak':
      return s.stats.maxStreak;
    case 'stardustTotal':
      return s.prestige.stardustTotal.toNumber();
  }
}
