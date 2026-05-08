export type PowerId = 'damage_shield' | 'damage_aura' | 'fire_wall' | 'martyrdom';

export interface PowerDefinition {
  readonly id: PowerId;
  readonly displayName: string;
  readonly description: string;
}

/** Levels are 1–5 inclusive when read from definitions. */
export interface DamageShieldStats {
  readonly maxCharges: number;
  /** Ms to restore one charge while below max. */
  readonly rechargeMs: number;
}

export interface DamageAuraStats {
  readonly tickIntervalMs: number;
  readonly damagePerTick: number;
  /** Horizontal semi-axis (px); ellipse centered on the player. */
  readonly radiusPx: number;
  /** Vertical semi-axis (px); ellipse centered on the player. */
  readonly verticalRadiusPx: number;
}

export interface FireWallStats {
  readonly tickIntervalMs: number;
  readonly damagePerTick: number;
}

export interface MartyrdomStats {
  /** 0–1 chance per kill to spawn a mine. */
  readonly procChance: number;
  readonly mineDamage: number;
  readonly blastRadiusPx: number;
  /** Time until mine explodes if nothing triggers (proximity could be added later). */
  readonly fuseMs: number;
}

export type PowerStatsAtLevel =
  | { powerId: 'damage_shield'; stats: DamageShieldStats }
  | { powerId: 'damage_aura'; stats: DamageAuraStats }
  | { powerId: 'fire_wall'; stats: FireWallStats }
  | { powerId: 'martyrdom'; stats: MartyrdomStats };
