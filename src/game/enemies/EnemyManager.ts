import Phaser from 'phaser';
import {
  ENEMY_CHASE_LATERAL_SPEED,
  ENEMY_ONSCREEN_BOTTOM_MARGIN,
  GAME_HEIGHT,
  GAME_WIDTH,
  ROAD_TOP_Y,
  enemyChaseThresholdY,
  enemyPerspectiveScale,
  roadHalfWidthAlongPerspective,
} from '../constants';
import { applyFlatArmor } from '../combat/damage';
import { spawnEnemyDamageNumber } from '../fx/damageNumbers';
import { ProjectileManager } from '../weapons/projectiles';
import type { EnemyDefinition, EnemyId } from './types';
import { getEnemy } from './definitions';

export const ENEMY_KILLED_EVENT = 'enemy-killed' as const;

export const BOSS_DEFEATED_EVENT = 'boss-defeated' as const;

export interface EnemyKilledPayload {
  readonly enemyId: EnemyId;
  readonly worldX: number;
  readonly worldY: number;
  readonly reason: 'bullet' | 'power';
  readonly isBoss: boolean;
}

export interface BossDefeatedPayload {
  readonly bossMinuteIndex: 1 | 2 | 3 | 4 | 5;
}

export interface EnemyUpdateOpts {
  /** When null, trash spawning is paused (boss fight). */
  readonly spawnEnemyId: EnemyId | null;
  /**
   * Trash spawn rate vs wave-1 baseline: interval rolls are divided by this value.
   * Omit or pass 1 for legacy pacing.
   */
  readonly trashSpawnFrequencyMult?: number;
  readonly playerX: number;
  readonly playerY: number;
}

export interface ActiveEnemyInstance {
  readonly def: EnemyDefinition;
  readonly sprite: Phaser.GameObjects.Rectangle;
  hp: number;
  /** -1..1 across road half-width at spawn; updated after jumper lane shifts. */
  lateralT: number;
  jumpCooldownUntilMs: number;
  readonly bossMinuteIndex: 1 | 2 | 3 | 4 | 5 | null;
  /** Random phase for `lateralWeave*` defs; unused otherwise. */
  weavePhase0: number;
  /** Time stone: `scene.time.now` until which this enemy uses `slowMoveMult` on movement. */
  slowUntilMs: number;
  /** 1 = no slow; set with pulse from Time stone. */
  slowMoveMult: number;
}

const JUMP_COOLDOWN_MS = 520;
const JUMP_LANE_FRACTION = 0.38;

export class EnemyManager {
  private readonly active: ActiveEnemyInstance[] = [];
  private spawnAccumMs = 0;
  private nextSpawnMs = 1100;
  /** Multiplies bullet damage dealt to bosses after armor (meta). */
  private bossOutgoingDamageMult = 1;

  constructor(private readonly scene: Phaser.Scene) {
    this.rollNextSpawnInterval(1);
  }

  setBossOutgoingDamageMult(mult: number): void {
    this.bossOutgoingDamageMult = Math.max(1, mult);
  }

  private rollNextSpawnInterval(trashSpawnFrequencyMult: number): void {
    const mult = Math.max(0.2, trashSpawnFrequencyMult);
    const baseMs = Phaser.Math.FloatBetween(0.72, 1.35) * 1000;
    this.nextSpawnMs = baseMs / mult;
    this.spawnAccumMs = 0;
  }

  spawnEnemy(def: EnemyDefinition): void {
    const spawnY = ROAD_TOP_Y - Phaser.Math.FloatBetween(56, 168);
    const cx = GAME_WIDTH / 2;
    const halfRoad = roadHalfWidthAlongPerspective(spawnY);
    const pad = 36;
    const maxOffset = Math.max(16, halfRoad - pad);
    const x = cx + Phaser.Math.FloatBetween(-maxOffset, maxOffset);
    const lateralT =
      halfRoad > 1e-3 ? Phaser.Math.Clamp((x - cx) / halfRoad, -1, 1) : 0;

    const sprite = this.scene.add.rectangle(
      x,
      spawnY,
      def.visual.width,
      def.visual.height,
      def.visual.color,
    );
    if (def.visual.strokeColor !== undefined) {
      sprite.setStrokeStyle(2, def.visual.strokeColor, def.visual.strokeAlpha ?? 1);
    }
    sprite.setDepth(8);
    sprite.setScale(enemyPerspectiveScale(spawnY));

    const bossMinuteIndex = def.bossMinuteIndex ?? null;

    this.active.push({
      def,
      sprite,
      hp: def.maxHealth,
      lateralT,
      jumpCooldownUntilMs: 0,
      bossMinuteIndex,
      weavePhase0: this.defHasWeave(def)
        ? Phaser.Math.FloatBetween(0, Math.PI * 2)
        : 0,
      slowUntilMs: 0,
      slowMoveMult: 1,
    });
  }

  hasLivingBoss(): boolean {
    return this.active.some((e) => e.bossMinuteIndex !== null);
  }

  getActive(): ReadonlyArray<ActiveEnemyInstance> {
    return this.active;
  }

  update(deltaMs: number, opts: EnemyUpdateOpts): void {
    const dt = deltaMs / 1000;
    const chaseY = enemyChaseThresholdY();

    if (opts.spawnEnemyId !== null) {
      const freqMult = opts.trashSpawnFrequencyMult ?? 1;
      this.spawnAccumMs += deltaMs;
      if (this.spawnAccumMs >= this.nextSpawnMs) {
        this.spawnEnemy(getEnemy(opts.spawnEnemyId));
        this.rollNextSpawnInterval(freqMult);
      }
    }

    const nowMs = this.scene.time.now;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      const y = e.sprite.y;
      const slowM = nowMs < e.slowUntilMs ? e.slowMoveMult : 1;

      if (y < chaseY) {
        e.sprite.y += e.def.moveSpeed * slowM * dt;
        const cx = GAME_WIDTH / 2;
        const half = roadHalfWidthAlongPerspective(e.sprite.y);
        const pad = 22;
        let targetX = cx + e.lateralT * half;
        if (this.defHasWeave(e.def)) {
          const hz = e.def.lateralWeaveHz ?? 0;
          const ampT = e.def.lateralWeaveAmplitudeT ?? 0;
          const tSec = this.scene.time.now / 1000;
          targetX += Math.sin(e.weavePhase0 + Math.PI * 2 * hz * tSec) * ampT * half;
        }
        e.sprite.x = Phaser.Math.Clamp(targetX, cx - half + pad, cx + half - pad);
      } else {
        const maxStep = e.def.moveSpeed * slowM * dt;
        const toPx = opts.playerX - e.sprite.x;
        const maxStepX = ENEMY_CHASE_LATERAL_SPEED * slowM * dt;
        e.sprite.x += Phaser.Math.Clamp(toPx, -maxStepX, maxStepX);

        const rowGap = opts.playerY - e.sprite.y;
        e.sprite.y += Phaser.Math.Clamp(rowGap, -maxStep, maxStep);

        const maxY = GAME_HEIGHT - ENEMY_ONSCREEN_BOTTOM_MARGIN;
        e.sprite.y = Phaser.Math.Clamp(e.sprite.y, chaseY, maxY);

        const half = roadHalfWidthAlongPerspective(e.sprite.y);
        const pad = 22;
        e.sprite.x = Phaser.Math.Clamp(
          e.sprite.x,
          GAME_WIDTH / 2 - half + pad,
          GAME_WIDTH / 2 + half - pad,
        );
      }

      e.sprite.setScale(enemyPerspectiveScale(e.sprite.y));
      const chaseYAfter = enemyChaseThresholdY();
      if (!(this.defHasWeave(e.def) && e.sprite.y < chaseYAfter)) {
        this.syncLateralTFromSprite(e);
      }
    }
  }

  private defHasWeave(def: EnemyDefinition): boolean {
    const hz = def.lateralWeaveHz;
    const amp = def.lateralWeaveAmplitudeT;
    return hz != null && amp != null && hz > 0 && amp > 0;
  }

  private syncLateralTFromSprite(e: ActiveEnemyInstance): void {
    const cx = GAME_WIDTH / 2;
    const half = roadHalfWidthAlongPerspective(e.sprite.y);
    if (half > 1e-3) {
      e.lateralT = Phaser.Math.Clamp((e.sprite.x - cx) / half, -1, 1);
    }
  }

  /**
   * Remove without kill event (e.g. despawned off-screen).
   */
  removeEnemyAt(index: number): void {
    const e = this.active[index];
    if (e === undefined) return;
    e.sprite.destroy();
    this.active.splice(index, 1);
  }

  killEnemyAt(index: number, reason: EnemyKilledPayload['reason']): void {
    const e = this.active[index];
    if (e === undefined) return;
    const isBoss = e.bossMinuteIndex !== null;
    const payload: EnemyKilledPayload = {
      enemyId: e.def.id,
      worldX: e.sprite.x,
      worldY: e.sprite.y,
      reason,
      isBoss,
    };
    this.scene.events.emit(ENEMY_KILLED_EVENT, payload);
    if (isBoss && e.bossMinuteIndex !== null) {
      this.scene.events.emit(BOSS_DEFEATED_EVENT, {
        bossMinuteIndex: e.bossMinuteIndex,
      } satisfies BossDefeatedPayload);
    }
    e.sprite.destroy();
    this.active.splice(index, 1);
  }

  /**
   * Bullet–enemy resolution. Uses `damage`, `pierceRemaining`, and `pierceHitSprites` on each projectile.
   * Removes a bullet when pierce is exhausted or it leaves via ProjectileManager bounds/range.
   */
  tryDamageFromBullets(projectiles: ProjectileManager): void {
    const bullets = projectiles.getBullets();
    const now = this.scene.time.now;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bb = bullet.getBounds();
      const dmgRaw = bullet.getData('damage');
      const damage = typeof dmgRaw === 'number' && !Number.isNaN(dmgRaw) ? dmgRaw : 0;
      for (let j = this.active.length - 1; j >= 0; j--) {
        const e = this.active[j];
        if (!Phaser.Geom.Rectangle.Overlaps(bb, e.sprite.getBounds())) {
          continue;
        }

        let pierceHit = bullet.getData('pierceHitSprites') as
          | Set<Phaser.GameObjects.GameObject>
          | undefined;
        if (pierceHit === undefined) {
          pierceHit = new Set();
          bullet.setData('pierceHitSprites', pierceHit);
        }
        if (pierceHit.has(e.sprite)) {
          continue;
        }

        pierceHit.add(e.sprite);
        const dealt = applyFlatArmor(damage, e.def.defense);
        const hpLoss =
          e.bossMinuteIndex !== null
            ? Math.max(1, Math.floor(dealt * this.bossOutgoingDamageMult))
            : dealt;
        e.hp -= hpLoss;

        if (hpLoss > 0) {
          const s = e.sprite;
          spawnEnemyDamageNumber(this.scene, s.x, s.y - s.height * 0.25, hpLoss, 'gun');
        }

        let pierceRemRaw = bullet.getData('pierceRemaining');
        let pierceRem =
          typeof pierceRemRaw === 'number' && !Number.isNaN(pierceRemRaw) ? pierceRemRaw : 1;
        pierceRem -= 1;
        bullet.setData('pierceRemaining', pierceRem);
        if (pierceRem <= 0) {
          projectiles.removeBulletAt(i);
        }

        if (hpLoss > 0 && this.defHasJumper(e.def) && now >= e.jumpCooldownUntilMs) {
          this.tryJumperLaneShift(e, now);
        }

        if (e.hp <= 0) {
          this.killEnemyAt(j, 'bullet');
        }
        break;
      }
    }
  }

  private defHasJumper(def: EnemyDefinition): boolean {
    return def.tags?.includes('jumper') ?? false;
  }

  private tryJumperLaneShift(e: ActiveEnemyInstance, now: number): void {
    const cx = GAME_WIDTH / 2;
    const half = roadHalfWidthAlongPerspective(e.sprite.y);
    const pad = 22;
    if (half <= pad + 4) return;

    const dir = Math.random() < 0.5 ? -1 : 1;
    const step = half * JUMP_LANE_FRACTION * dir;
    e.sprite.x = Phaser.Math.Clamp(e.sprite.x + step, cx - half + pad, cx + half - pad);
    e.jumpCooldownUntilMs = now + JUMP_COOLDOWN_MS;
    this.syncLateralTFromSprite(e);
  }

  destroy(): void {
    for (const e of this.active) {
      e.sprite.destroy();
    }
    this.active.length = 0;
  }
}
