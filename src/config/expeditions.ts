export interface DestinationDef {
  id: string;
  /** Duration in seconds at speed 1. */
  duration: number;
  /** Minutes of production granted per resource roll. */
  lootMinutes: number;
  artifactChance: number;
  stardustChance: number;
  requiredSupernovas: number;
}

export const DESTINATIONS: readonly DestinationDef[] = [
  {
    id: 'belt',
    duration: 15 * 60,
    lootMinutes: 20,
    artifactChance: 0.05,
    stardustChance: 0,
    requiredSupernovas: 0,
  },
  {
    id: 'moon',
    duration: 30 * 60,
    lootMinutes: 45,
    artifactChance: 0.1,
    stardustChance: 0,
    requiredSupernovas: 0,
  },
  {
    id: 'nebula',
    duration: 60 * 60,
    lootMinutes: 100,
    artifactChance: 0.18,
    stardustChance: 0.05,
    requiredSupernovas: 0,
  },
  {
    id: 'derelict',
    duration: 2 * 3600,
    lootMinutes: 220,
    artifactChance: 0.3,
    stardustChance: 0.1,
    requiredSupernovas: 1,
  },
  {
    id: 'rift',
    duration: 4 * 3600,
    lootMinutes: 480,
    artifactChance: 0.45,
    stardustChance: 0.15,
    requiredSupernovas: 1,
  },
  {
    id: 'void',
    duration: 8 * 3600,
    lootMinutes: 1000,
    artifactChance: 0.7,
    stardustChance: 0.25,
    requiredSupernovas: 2,
  },
];

export const DESTINATIONS_BY_ID: Readonly<Record<string, DestinationDef>> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.id, d]),
);
