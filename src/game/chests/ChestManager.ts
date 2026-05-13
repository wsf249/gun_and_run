import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  ROAD_TOP_Y,
  enemyPerspectiveScale,
  roadHalfWidthAlongPerspective,
} from '../constants';
import { sampleNormalPositive } from '../random';
import type { ProjectileManager } from '../weapons/projectiles';

/** Next chest spawn: normal μ=20s, σ=5s, ≥ min. */
const SPAWN_DELAY_MEAN_MS = 20_000;
const SPAWN_DELAY_STD_MS = 5000;
const SPAWN_DELAY_MIN_MS = 250;

const FIRST_CHEST_DELAY_MS = 3500;
const DESPAWN_BELOW_PX = 220;

export const CHEST_MAX_HP = 100;

const CHEST_DESCEND_SPEED = 320;

const LANE_LATERAL_T = [-2 / 3, 0, 2 / 3] as const;

interface ActiveChest {
  /** Root holds aura + body circles; used for movement, scale, and hit tests. */
  readonly root: Phaser.GameObjects.Container;
  hp: number;
  readonly lateralT: number;
}

export interface ChestManagerOptions {
  /** Called after a chest is destroyed (HP ≤ 0). Scene decides whether to open the draft. */
  onChestDestroyed(): void;
}

export class ChestManager {
  private readonly active: ActiveChest[] = [];
  private nextSpawnInMs = 0;
  private readonly spawnDelayMult: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: ChestManagerOptions,
    opts?: { spawnDelayMult?: number },
  ) {
    this.spawnDelayMult = opts?.spawnDelayMult ?? 1;
    this.nextSpawnInMs = Math.max(
      SPAWN_DELAY_MIN_MS,
      Math.floor(FIRST_CHEST_DELAY_MS * this.spawnDelayMult),
    );
  }

  destroy(): void {
    for (const c of this.active) {
      c.root.destroy();
    }
    this.active.length = 0;
  }

  update(deltaMs: number): void {
    this.nextSpawnInMs -= deltaMs;
    if (this.nextSpawnInMs <= 0) {
      this.spawnChest();
      this.rollNextSpawnDelay();
    }

    const cx = GAME_WIDTH / 2;
    const dt = deltaMs / 1000;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const c = this.active[i];
      const root = c.root;

      root.y += CHEST_DESCEND_SPEED * dt;
      const half = roadHalfWidthAlongPerspective(root.y);
      root.x = cx + c.lateralT * half;
      root.setScale(enemyPerspectiveScale(root.y));

      if (root.y > GAME_HEIGHT + DESPAWN_BELOW_PX) {
        root.destroy();
        this.active.splice(i, 1);
      }
    }
  }

  /**
   * Resolve bullets vs chests before enemies so pierce can continue to enemies afterward.
   */
  tryDamageFromBullets(projectiles: ProjectileManager): void {
    const bullets = projectiles.getBullets();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bb = bullet.getBounds();
      const dmgRaw = bullet.getData('damage');
      const damage = typeof dmgRaw === 'number' && !Number.isNaN(dmgRaw) ? dmgRaw : 0;

      for (let j = this.active.length - 1; j >= 0; j--) {
        const chest = this.active[j];
        if (!Phaser.Geom.Rectangle.Overlaps(bb, chest.root.getBounds())) {
          continue;
        }

        let pierceHit = bullet.getData('pierceHitChests') as
          | Set<Phaser.GameObjects.GameObject>
          | undefined;
        if (pierceHit === undefined) {
          pierceHit = new Set();
          bullet.setData('pierceHitChests', pierceHit);
        }
        if (pierceHit.has(chest.root)) {
          continue;
        }
        pierceHit.add(chest.root);

        chest.hp -= damage;

        let pierceRemRaw = bullet.getData('pierceRemaining');
        let pierceRem =
          typeof pierceRemRaw === 'number' && !Number.isNaN(pierceRemRaw) ? pierceRemRaw : 1;
        pierceRem -= 1;
        bullet.setData('pierceRemaining', pierceRem);
        if (pierceRem <= 0) {
          projectiles.removeBulletAt(i);
        }

        if (chest.hp <= 0) {
          chest.root.destroy();
          this.active.splice(j, 1);
          this.options.onChestDestroyed();
        }
        break;
      }
    }
  }

  private spawnChest(): void {
    const laneIdx = Phaser.Math.Between(0, 2) as 0 | 1 | 2;
    const lateralT = LANE_LATERAL_T[laneIdx];

    const spawnY = ROAD_TOP_Y - Phaser.Math.FloatBetween(72, 220);
    const cx = GAME_WIDTH / 2;
    const x = cx + lateralT * roadHalfWidthAlongPerspective(spawnY);

    const bodyRadius = 28;
    const auraRadius = 46;

    const aura = this.scene.add.circle(0, 0, auraRadius, 0xffe066, 0.42);
    aura.setStrokeStyle(3, 0xffec8c, 0.65);

    const body = this.scene.add.circle(0, 0, bodyRadius, 0xc9a227);
    body.setStrokeStyle(2, 0xfff3bf, 0.9);

    const root = this.scene.add.container(x, spawnY, [aura, body]);
    root.setDepth(14);
    root.setScale(enemyPerspectiveScale(spawnY));

    this.active.push({ root, hp: CHEST_MAX_HP, lateralT });
  }

  private rollNextSpawnDelay(): void {
    const raw = sampleNormalPositive(SPAWN_DELAY_MEAN_MS, SPAWN_DELAY_STD_MS, SPAWN_DELAY_MIN_MS);
    this.nextSpawnInMs = Math.max(SPAWN_DELAY_MIN_MS, Math.floor(raw * this.spawnDelayMult));
  }
}
