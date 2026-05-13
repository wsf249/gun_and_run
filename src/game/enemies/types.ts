/**
 * Extend when adding enemy variants (bosses, elites, biome packs).
 */
export type EnemyId =
  | 'walker_basic'
  | 'runner_swarm'
  | 'bruiser'
  | 'walker_jumper'
  | 'sidewinder'
  | 'boss_wave_1'
  | 'boss_wave_2'
  | 'boss_wave_3'
  | 'boss_wave_4'
  | 'boss_wave_5';

export type EnemyTag = 'boss' | 'jumper';

export interface EnemyVisualBlock {
  readonly width: number;
  readonly height: number;
  readonly color: number;
  readonly strokeColor?: number;
  readonly strokeAlpha?: number;
}

/**
 * Data-only enemy profile. Spawn tables / waves reference `EnemyId`; tuning lives here.
 *
 * Core stats: **health** (`maxHealth`), **speed** (`moveSpeed`), **defense** (flat vs bullets), **attack** (damage to player on touch).
 */
export interface EnemyDefinition {
  readonly id: EnemyId;
  readonly displayName: string;
  readonly maxHealth: number;
  /** Down-screen speed in px/s (+Y). */
  readonly moveSpeed: number;
  /** Flat armor: reduces incoming bullet damage; see `applyFlatArmor`. */
  readonly defense: number;
  /** Damage dealt to the player per overlap while not invulnerable. */
  readonly attack: number;
  readonly visual: EnemyVisualBlock;
  readonly tags?: readonly EnemyTag[];
  /** Boss milestone index (1–5); only on boss defs. */
  readonly bossMinuteIndex?: 1 | 2 | 3 | 4 | 5;
  /**
   * When both set, descent motion adds lateral sine offset (see `EnemyManager`).
   * `lateralT` stays the lane center until chase; amplitude is in half-road units (0–1 scale of half-width).
   */
  readonly lateralWeaveHz?: number;
  readonly lateralWeaveAmplitudeT?: number;
}
