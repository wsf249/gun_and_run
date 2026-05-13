export type PowerId =
  | 'damage_shield'
  | 'damage_aura'
  | 'fire_wall'
  | 'martyrdom'
  | 'kamahaha_wave'
  | 'lightning'
  | 'time_stone'
  | 'soul_feast'
  | 'thorns';

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
  /** Band top = chase line minus this (px), clamped — larger = fire reaches farther up the road. */
  readonly extendAboveChasePx: number;
}

export interface MartyrdomStats {
  /** 0–1 chance per kill to spawn a mine. */
  readonly procChance: number;
  readonly mineDamage: number;
  readonly blastRadiusPx: number;
  /** Time until mine explodes if nothing triggers (proximity could be added later). */
  readonly fuseMs: number;
}

/** Full cycle = windup + beam + wait = `cycleMs` (8s); wait = cycleMs - windupMs - beamMs. */
export interface KamahahaWaveStats {
  readonly cycleMs: number;
  readonly windupMs: number;
  readonly beamMs: number;
  /** Half-width of vertical damage strip (px), screen space. */
  readonly beamHalfWidthPx: number;
  readonly damagePerTick: number;
  /** Ms between damage ticks while beam is active. */
  readonly beamTickIntervalMs: number;
}

export interface LightningStats {
  /** Ms between strikes. */
  readonly strikeIntervalMs: number;
  readonly damagePerHop: number;
  /** Extra targets after primary = level - 1; stored explicitly for clarity. */
  readonly chainExtraTargets: number;
}

export interface TimeStoneStats {
  readonly pulseIntervalMs: number;
  readonly slowDurationMs: number;
  /** Multiply enemy move + lateral chase speeds (0–1). */
  readonly slowMoveMult: number;
}

export interface SoulFeastStats {
  /** Heal fraction of max HP on non-boss kill (0–1). Boss kills use `bossHealPercent`. */
  readonly healPercentOfMax: number;
  /** Heal fraction on boss kill (0 = none). */
  readonly bossHealPercentOfMax: number;
}

export interface ThornsStats {
  /** Raw power damage before armor when you lose HP to a touch. */
  readonly retaliateDamage: number;
}

export type PowerStatsAtLevel =
  | { powerId: 'damage_shield'; stats: DamageShieldStats }
  | { powerId: 'damage_aura'; stats: DamageAuraStats }
  | { powerId: 'fire_wall'; stats: FireWallStats }
  | { powerId: 'martyrdom'; stats: MartyrdomStats }
  | { powerId: 'kamahaha_wave'; stats: KamahahaWaveStats }
  | { powerId: 'lightning'; stats: LightningStats }
  | { powerId: 'time_stone'; stats: TimeStoneStats }
  | { powerId: 'soul_feast'; stats: SoulFeastStats }
  | { powerId: 'thorns'; stats: ThornsStats };
