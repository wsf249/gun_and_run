/**
 * Stable ids for save data, UI, and character loadouts. Extend this union when adding weapons.
 */
export type WeaponId = 'assault_rifle' | 'shotgun' | 'burst_smg';

export type FireMode = 'automatic' | 'semi' | 'burst';

export interface ProjectileSkin {
  readonly width: number;
  readonly height: number;
  readonly color: number;
  /** Optional outline for readability on busy backgrounds */
  readonly strokeColor?: number;
  readonly strokeAlpha?: number;
}

/**
 * Data-only weapon profile. Characters reference `WeaponId`; tuning happens here, not on the hero.
 */
export interface WeaponDefinition {
  readonly id: WeaponId;
  readonly displayName: string;
  readonly fireMode: FireMode;
  /** For automatic/semi: sustained rounds per second */
  readonly roundsPerSecond: number;
  /** World-space projectile speed magnitude (px/s). */
  readonly projectileSpeed: number;
  readonly projectile: ProjectileSkin;
  /** Base damage per pellet (split evenly when pelletsPerShot > 1 before crit roll). */
  readonly projectileDamage: number;
  /** Applied when `critChance` from character procs (rolled per pellet). */
  readonly critMultiplier: number;
  /** Max distance each projectile may travel in world space before despawn. */
  readonly maxRangePx: number;
  /** 1 = single projectile; >1 fans pellets using spreadHalfAngleRad. */
  readonly pelletsPerShot: number;
  /** Half-angle (radians) of pellet cone; 0 keeps all pellets aligned. */
  readonly spreadHalfAngleRad: number;
  /** How many enemies one projectile can damage before despawning (minimum 1). */
  readonly pierceCount: number;
  /** Required when fireMode is `burst`. */
  readonly burstSize?: number;
  readonly burstBetweenShotsMs?: number;
  readonly burstCooldownMs?: number;
  /** Offsets from player sprite center (negative Y is toward the top of the screen) */
  readonly muzzle: {
    readonly offsetX: number;
    readonly offsetY: number;
  };
}
