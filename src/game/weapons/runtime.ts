import type { WeaponDefinition } from './types';
import { rollProjectileDamage } from '../combat/damage';
import { ProjectileManager } from './projectiles';

export type AimTarget = { x: number; y: number };

/** Pellet split + integer rounding; matches `WeaponRuntime` before crit. */
export function baseDamagePerTriggerFromDefinition(
  def: WeaponDefinition,
  damageMultiplier = 1,
): number {
  const pellets = Math.max(1, def.pelletsPerShot);
  const rawEach =
    pellets > 1
      ? Math.max(1, Math.round(def.projectileDamage / pellets))
      : def.projectileDamage;
  const dmgEach = Math.max(1, Math.round(rawEach * damageMultiplier));
  return pellets * dmgEach;
}

/**
 * Sustained DPS without crit rolls — same formula as `WeaponRuntime.getBaseMaxDps` at the given multipliers.
 */
export function definitionBaseMaxDps(
  def: WeaponDefinition,
  fireRateMultiplier = 1,
  damageMultiplier = 1,
): number {
  const damagePerTrigger = baseDamagePerTriggerFromDefinition(def, damageMultiplier);
  const mult = fireRateMultiplier;

  if (def.fireMode === 'burst') {
    const burstSize = def.burstSize ?? 3;
    const betweenMs = (def.burstBetweenShotsMs ?? 60) / mult;
    const cooldownMs = (def.burstCooldownMs ?? 400) / mult;
    const burstSpanMs = burstSize <= 1 ? 0 : (burstSize - 1) * betweenMs;
    const cycleMs = burstSpanMs + cooldownMs;
    if (cycleMs <= 0) {
      return 0;
    }
    return (burstSize * damagePerTrigger) / (cycleMs / 1000);
  }

  if (def.fireMode === 'automatic' || def.fireMode === 'semi') {
    return def.roundsPerSecond * mult * damagePerTrigger;
  }

  return 0;
}

/**
 * Per-run weapon behaviour (fire timing + spawning projectiles). Separate from `WeaponDefinition` data.
 */
export class WeaponRuntime {
  private fireAccumulatorMs = 0;
  /**
   * Run-level modifier from gates/buffs; multiplies effective fire rate.
   * Stacks multiplicatively via `applyFireRateBonusPercent`.
   */
  private fireRateMultiplier = 1;
  /** Gates/buffs; multiplies per-pellet base damage before crit roll. */
  private damageMultiplier = 1;
  /** Added to weapon crit multiplier on each projectile roll. */
  private critMultiplierFlat = 0;

  /** Burst phase: shots remaining in the active burst (0 = in cooldown or idle between bursts). */
  private burstShotsPending = 0;
  /** Time until next pellet group inside the burst; starts at 0 so the first shot fires immediately. */
  private intraBurstTimerMs = 0;
  /** Cooldown after a burst completes before the next burst begins. */
  private burstCooldownRemainingMs = 0;

  constructor(
    private readonly def: WeaponDefinition,
    private readonly projectiles: ProjectileManager,
  ) {
    if (this.def.fireMode === 'burst') {
      this.burstShotsPending = this.def.burstSize ?? 3;
      this.intraBurstTimerMs = 0;
      this.burstCooldownRemainingMs = 0;
    }
  }

  /** Gate/buff hook: +5 means multiply effective fire rate by 1.05 (multiplicative stacks). */
  applyFireRateBonusPercent(percent: number): void {
    this.fireRateMultiplier *= 1 + percent / 100;
  }

  /** +5 → multiply bullet damage by 1.05 (multiplicative stacks). */
  applyDamageBonusPercent(percent: number): void {
    this.damageMultiplier *= 1 + percent / 100;
  }

  /** Adds to weapon crit multiplier (e.g. +0.5). */
  applyCritMultiplierFlat(amount: number): void {
    this.critMultiplierFlat += amount;
  }

  /** Base weapon × gates (no random crit). */
  getEffectiveCritMultiplier(): number {
    return this.def.critMultiplier + this.critMultiplierFlat;
  }

  /**
   * Theoretical sustained damage per second without crits (matches pellet split + cadence;
   * includes `fireRateMultiplier` and damage gates). Ignores hit/miss.
   */
  getBaseMaxDps(): number {
    return definitionBaseMaxDps(this.def, this.fireRateMultiplier, this.damageMultiplier);
  }

  update(
    deltaMs: number,
    muzzleX: number,
    muzzleY: number,
    aimTarget: AimTarget | null,
    critChance: number,
  ): void {
    if (this.def.fireMode === 'burst') {
      this.updateBurst(deltaMs, muzzleX, muzzleY, aimTarget, critChance);
      return;
    }

    if (this.def.fireMode !== 'automatic' && this.def.fireMode !== 'semi') {
      return;
    }

    const intervalMs = 1000 / (this.def.roundsPerSecond * this.fireRateMultiplier);
    this.fireAccumulatorMs += deltaMs;
    while (this.fireAccumulatorMs >= intervalMs) {
      this.fireAccumulatorMs -= intervalMs;
      const { vx, vy } = this.resolveAimVelocity(aimTarget, muzzleX, muzzleY);
      this.spawnPellets(muzzleX, muzzleY, vx, vy, critChance);
    }
  }

  private updateBurst(
    deltaMs: number,
    muzzleX: number,
    muzzleY: number,
    aimTarget: AimTarget | null,
    critChance: number,
  ): void {
    const mult = this.fireRateMultiplier;
    const burstSize = this.def.burstSize ?? 3;
    const betweenMs = (this.def.burstBetweenShotsMs ?? 60) / mult;
    const cooldownMs = (this.def.burstCooldownMs ?? 400) / mult;

    if (this.burstCooldownRemainingMs > 0) {
      this.burstCooldownRemainingMs -= deltaMs;
      if (this.burstCooldownRemainingMs <= 0) {
        this.burstShotsPending = burstSize;
        this.intraBurstTimerMs = 0;
      }
      return;
    }

    if (this.burstShotsPending <= 0) {
      this.burstCooldownRemainingMs = cooldownMs;
      return;
    }

    this.intraBurstTimerMs -= deltaMs;
    while (this.burstShotsPending > 0 && this.intraBurstTimerMs <= 0) {
      const { vx, vy } = this.resolveAimVelocity(aimTarget, muzzleX, muzzleY);
      this.spawnPellets(muzzleX, muzzleY, vx, vy, critChance);
      this.burstShotsPending -= 1;
      this.intraBurstTimerMs += betweenMs;
    }

    if (this.burstShotsPending <= 0) {
      this.burstCooldownRemainingMs = cooldownMs;
    }
  }

  private resolveAimVelocity(
    aimTarget: AimTarget | null,
    muzzleX: number,
    muzzleY: number,
  ): { vx: number; vy: number } {
    const speed = this.def.projectileSpeed;
    let vx = 0;
    let vy = -speed;
    if (aimTarget !== null) {
      const dx = aimTarget.x - muzzleX;
      const dy = aimTarget.y - muzzleY;
      const len = Math.hypot(dx, dy);
      if (len > 8) {
        vx = (dx / len) * speed;
        vy = (dy / len) * speed;
      }
    }
    return { vx, vy };
  }

  /** Spreads pellets by rotating velocity around the shared aim direction. */
  private spawnPellets(
    muzzleX: number,
    muzzleY: number,
    baseVx: number,
    baseVy: number,
    critChance: number,
  ): void {
    const pellets = Math.max(1, this.def.pelletsPerShot);
    const spread = this.def.spreadHalfAngleRad;
    const pierce = Math.max(1, this.def.pierceCount);
    const rawEach =
      pellets > 1
        ? Math.max(1, Math.round(this.def.projectileDamage / pellets))
        : this.def.projectileDamage;
    const dmgEach = Math.max(1, Math.round(rawEach * this.damageMultiplier));
    const critMult = this.def.critMultiplier + this.critMultiplierFlat;

    const baseAngle = Math.atan2(baseVy, baseVx);

    for (let p = 0; p < pellets; p++) {
      let theta = baseAngle;
      if (pellets > 1 && spread > 0) {
        const u = (p / (pellets - 1)) * 2 - 1;
        theta = baseAngle + u * spread;
      }
      const speed = this.def.projectileSpeed;
      const vx = Math.cos(theta) * speed;
      const vy = Math.sin(theta) * speed;
      const damage = rollProjectileDamage(dmgEach, critChance, critMult);
      this.projectiles.spawn(
        muzzleX,
        muzzleY,
        vx,
        vy,
        this.def.projectile,
        damage,
        this.def.maxRangePx,
        pierce,
      );
    }
  }
}
