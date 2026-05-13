import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  ROAD_TOP_Y,
  enemyPerspectiveScale,
  roadHalfWidthAlongPerspective,
} from '../constants';
import { ALL_GATE_IDS, getGate } from './definitions';
import { sampleNormalPositive } from '../random';
import { createGateVisual, type GateVisual } from './GateVisual';
import type { GateDefinition, GateId } from './types';

/** Next spawn delay: normal μ=10s, σ=5s, ≥ min. */
const SPAWN_DELAY_MEAN_MS = 10_000;
const SPAWN_DELAY_STD_MS = 5000;
const SPAWN_DELAY_MIN_MS = 250;

/** First gate after scene start (later spawns use normal delay above). */
const FIRST_GATE_DELAY_MS = 2000;

/** Match enemy despawn: fully off-screen below. */
const DESPAWN_BELOW_PX = 220;

/**
 * World path (each gate):
 * 1. Spawn at Y above the viewport (`spawnY < ROAD_TOP_Y`), centered on a lane at that depth.
 * 2. Each frame: move down `def.descendSpeed` px/s; X tracks lane center:
 *    `x = GAME_WIDTH/2 + lateralT * roadHalfWidthAlongPerspective(y)`.
 * 3. Despawn when `y > GAME_HEIGHT + DESPAWN_BELOW_PX`.
 */

/** Lane centers as fraction of road half-width at current Y. */
const LANE_LATERAL_T = [-2 / 3, 0, 2 / 3] as const;

export interface GateEffectHandlers {
  applyHealMaxPercent(percent: number): void;
  applyWeaponFireRatePercent(percent: number): void;
  applyWeaponDamagePercent(percent: number): void;
  applyWeaponCritMultiplierFlat(amount: number): void;
  applyArmorPercent(percent: number): void;
  applyMoveSpeedPercent(percent: number): void;
  applyCritChancePercentPoints(points: number): void;
  applyHpRegenTimed(durationMs: number, percentMaxHpPerSecond: number): void;
}

interface ActiveGate {
  readonly def: GateDefinition;
  readonly visual: GateVisual;
  /** Lateral path -1..1 for lane center. */
  readonly lateralT: number;
}

export class GateManager {
  private readonly active: ActiveGate[] = [];
  private nextSpawnInMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly handlers: GateEffectHandlers,
  ) {
    this.nextSpawnInMs = FIRST_GATE_DELAY_MS;
  }

  destroy(): void {
    for (const g of this.active) {
      g.visual.destroy(true);
    }
    this.active.length = 0;
  }

  update(deltaMs: number, playerBounds: Phaser.Geom.Rectangle): void {
    this.nextSpawnInMs -= deltaMs;
    if (this.nextSpawnInMs <= 0) {
      this.spawnGate();
      this.rollNextSpawnDelay();
    }

    const cx = GAME_WIDTH / 2;
    const dt = deltaMs / 1000;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const g = this.active[i];
      const sprite = g.visual;

      sprite.y += g.def.descendSpeed * dt;
      const half = roadHalfWidthAlongPerspective(sprite.y);
      sprite.x = cx + g.lateralT * half;
      sprite.setScale(enemyPerspectiveScale(sprite.y));

      if (sprite.y > GAME_HEIGHT + DESPAWN_BELOW_PX) {
        sprite.destroy(true);
        this.active.splice(i, 1);
        continue;
      }

      const hb = this.pickupRect(sprite, sprite.x, sprite.y);
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, hb)) {
        this.applyGateEffect(g.def);
        sprite.destroy(true);
        this.active.splice(i, 1);
        continue;
      }
    }
  }

  /**
   * Vertical extent from the gate `Container` world AABB (`getBounds`) so pickup matches
   * the scaled art (same idea as TitleScene: avoid a synthetic rect that drifts from pixels).
   * Width stays a lane-centered strip — narrower than full lane — so neighbor lanes do not steal.
   */
  private pickupRect(sprite: GateVisual, centerX: number, centerY: number): Phaser.Geom.Rectangle {
    const halfRoad = roadHalfWidthAlongPerspective(centerY);
    const laneW = (2 * halfRoad) / 3;
    const w = Math.max(124, laneW * 0.62);
    const vb = sprite.getBounds();
    return new Phaser.Geom.Rectangle(centerX - w / 2, vb.y, w, vb.height);
  }

  private applyGateEffect(def: GateDefinition): void {
    const e = def.effect;
    switch (e.kind) {
      case 'heal_max_percent':
        this.handlers.applyHealMaxPercent(e.percent);
        return;
      case 'weapon_fire_rate_percent':
        this.handlers.applyWeaponFireRatePercent(e.percent);
        return;
      case 'weapon_damage_percent':
        this.handlers.applyWeaponDamagePercent(e.percent);
        return;
      case 'weapon_crit_multiplier_flat':
        this.handlers.applyWeaponCritMultiplierFlat(e.amount);
        return;
      case 'armor_percent':
        this.handlers.applyArmorPercent(e.percent);
        return;
      case 'move_speed_percent':
        this.handlers.applyMoveSpeedPercent(e.percent);
        return;
      case 'crit_chance_percent_points':
        this.handlers.applyCritChancePercentPoints(e.points);
        return;
      case 'hp_regen_timed':
        this.handlers.applyHpRegenTimed(e.durationMs, e.percentMaxHpPerSecond);
        return;
    }
  }

  private spawnGate(): void {
    const rollIdx = Phaser.Math.Between(0, ALL_GATE_IDS.length - 1);
    const id = ALL_GATE_IDS[rollIdx] as GateId;
    const def = getGate(id);
    const laneIdx = Phaser.Math.Between(0, 2) as 0 | 1 | 2;
    const lateralT = LANE_LATERAL_T[laneIdx];

    const spawnY = ROAD_TOP_Y - Phaser.Math.FloatBetween(72, 220);
    const cx = GAME_WIDTH / 2;
    const x = cx + lateralT * roadHalfWidthAlongPerspective(spawnY);

    const visual = createGateVisual(this.scene, def);
    /** `Container` built with `new` must be registered or nothing renders. */
    this.scene.add.existing(visual);
    visual.setPosition(x, spawnY);
    /** Above road/enemies (8); above player (10) so pickups stay readable at the lane baseline. */
    visual.setDepth(15);
    visual.setScale(enemyPerspectiveScale(spawnY));

    this.active.push({ def, visual, lateralT });
  }

  private rollNextSpawnDelay(): void {
    this.nextSpawnInMs = sampleNormalPositive(
      SPAWN_DELAY_MEAN_MS,
      SPAWN_DELAY_STD_MS,
      SPAWN_DELAY_MIN_MS,
    );
  }
}
