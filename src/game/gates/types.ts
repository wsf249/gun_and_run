/**
 * Stable ids for saves/UI later. Extend when adding gate variants.
 */
export type GateId =
  | 'heal_max_20'
  | 'fire_rate_5'
  | 'weapon_damage_5'
  | 'weapon_crit_flat_half'
  | 'armor_percent_5'
  | 'speed_percent_5'
  | 'crit_chance_percent_2'
  | 'hp_regen_timed';

export type GateEffect =
  | { kind: 'heal_max_percent'; percent: number }
  | { kind: 'weapon_fire_rate_percent'; percent: number }
  | { kind: 'weapon_damage_percent'; percent: number }
  | { kind: 'weapon_crit_multiplier_flat'; amount: number }
  | { kind: 'armor_percent'; percent: number }
  | { kind: 'move_speed_percent'; percent: number }
  /** Adds percentage points to crit chance (e.g. 2 → +0.02). */
  | { kind: 'crit_chance_percent_points'; points: number }
  | { kind: 'hp_regen_timed'; durationMs: number; percentMaxHpPerSecond: number };

export interface GateDefinition {
  readonly id: GateId;
  /** Shown inside the gate panel (can use \\n). */
  readonly labelText: string;
  /** Vertical speed toward the bottom of the screen (px/s). */
  readonly descendSpeed: number;
  readonly effect: GateEffect;
}
