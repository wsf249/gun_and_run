import type { EnemyDefinition, EnemyId } from './types';

/** Wave 1 — orange */
export const WALKER_BASIC: EnemyDefinition = {
  id: 'walker_basic',
  displayName: 'Walker',
  maxHealth: 55,
  moveSpeed: 195,
  defense: 0,
  attack: 22,
  visual: {
    width: 46,
    height: 54,
    color: 0xf97316,
    strokeColor: 0xc2410c,
    strokeAlpha: 0.55,
  },
};

/** Wave 2 — red */
export const RUNNER_SWARM: EnemyDefinition = {
  id: 'runner_swarm',
  displayName: 'Runner',
  maxHealth: 40,
  moveSpeed: 265,
  defense: 0,
  attack: 18,
  visual: {
    width: 34,
    height: 42,
    color: 0xef4444,
    strokeColor: 0xb91c1c,
    strokeAlpha: 0.55,
  },
};

/** Wave 3 — purple */
export const BRUISER: EnemyDefinition = {
  id: 'bruiser',
  displayName: 'Bruiser',
  maxHealth: 155,
  moveSpeed: 115,
  defense: 2,
  attack: 30,
  visual: {
    width: 58,
    height: 68,
    color: 0xa855f7,
    strokeColor: 0x6b21a8,
    strokeAlpha: 0.55,
  },
};

/** Wave 4 — orange + jumper */
export const WALKER_JUMPER: EnemyDefinition = {
  id: 'walker_jumper',
  displayName: 'Walker',
  maxHealth: 55,
  moveSpeed: 195,
  defense: 0,
  attack: 22,
  visual: {
    width: 46,
    height: 54,
    color: 0xf97316,
    strokeColor: 0xc2410c,
    strokeAlpha: 0.55,
  },
  tags: ['jumper'],
};

/** Boss 1 — wave 1 colors, larger */
export const BOSS_WAVE_1: EnemyDefinition = {
  id: 'boss_wave_1',
  displayName: 'Boss',
  maxHealth: 580,
  moveSpeed: 175,
  defense: 0,
  attack: 38,
  visual: {
    width: 62,
    height: 72,
    color: 0xf97316,
    strokeColor: 0xc2410c,
    strokeAlpha: 0.65,
  },
  tags: ['boss'],
  bossMinuteIndex: 1,
};

/** Boss 2 — wave 2 colors */
export const BOSS_WAVE_2: EnemyDefinition = {
  id: 'boss_wave_2',
  displayName: 'Boss',
  maxHealth: 480,
  moveSpeed: 220,
  defense: 0,
  attack: 34,
  visual: {
    width: 48,
    height: 58,
    color: 0xef4444,
    strokeColor: 0xb91c1c,
    strokeAlpha: 0.65,
  },
  tags: ['boss'],
  bossMinuteIndex: 2,
};

/** Boss 3 — wave 3 colors */
export const BOSS_WAVE_3: EnemyDefinition = {
  id: 'boss_wave_3',
  displayName: 'Boss',
  maxHealth: 980,
  moveSpeed: 95,
  defense: 3,
  attack: 42,
  visual: {
    width: 72,
    height: 84,
    color: 0xa855f7,
    strokeColor: 0x6b21a8,
    strokeAlpha: 0.65,
  },
  tags: ['boss'],
  bossMinuteIndex: 3,
};

/** Boss 4 — wave 4 + jumper */
export const BOSS_WAVE_4: EnemyDefinition = {
  id: 'boss_wave_4',
  displayName: 'Boss',
  maxHealth: 720,
  moveSpeed: 185,
  defense: 0,
  attack: 36,
  visual: {
    width: 58,
    height: 68,
    color: 0xf97316,
    strokeColor: 0xc2410c,
    strokeAlpha: 0.65,
  },
  tags: ['boss', 'jumper'],
  bossMinuteIndex: 4,
};

/** Boss 5 — maroon / black mega */
export const BOSS_WAVE_5: EnemyDefinition = {
  id: 'boss_wave_5',
  displayName: 'Final boss',
  maxHealth: 1400,
  moveSpeed: 265,
  defense: 4,
  attack: 48,
  visual: {
    width: 78,
    height: 92,
    color: 0x7f1d1d,
    strokeColor: 0x000000,
    strokeAlpha: 1,
  },
  tags: ['boss', 'jumper'],
  bossMinuteIndex: 5,
};

const BY_ID: Record<EnemyId, EnemyDefinition> = {
  walker_basic: WALKER_BASIC,
  runner_swarm: RUNNER_SWARM,
  bruiser: BRUISER,
  walker_jumper: WALKER_JUMPER,
  boss_wave_1: BOSS_WAVE_1,
  boss_wave_2: BOSS_WAVE_2,
  boss_wave_3: BOSS_WAVE_3,
  boss_wave_4: BOSS_WAVE_4,
  boss_wave_5: BOSS_WAVE_5,
};

export const DEFAULT_SPAWN_ENEMY_ID: EnemyId = 'walker_basic';

const TRASH_BY_WAVE: readonly EnemyId[] = [
  'walker_basic',
  'runner_swarm',
  'bruiser',
  'walker_jumper',
];

export function getTrashEnemyIdForWave(waveIndex1Based: number): EnemyId {
  const idx = Math.min(TRASH_BY_WAVE.length - 1, Math.max(0, waveIndex1Based - 1));
  return TRASH_BY_WAVE[idx]!;
}

export function getBossDefinitionForMinute(minute: 1 | 2 | 3 | 4 | 5): EnemyDefinition {
  const map: Record<1 | 2 | 3 | 4 | 5, EnemyId> = {
    1: 'boss_wave_1',
    2: 'boss_wave_2',
    3: 'boss_wave_3',
    4: 'boss_wave_4',
    5: 'boss_wave_5',
  };
  return BY_ID[map[minute]];
}

export function getEnemy(id: EnemyId): EnemyDefinition {
  return BY_ID[id];
}
