import { GAME_HEIGHT, GAME_WIDTH, ROAD_TOP_Y } from '../constants';
import type { ProjectileSkin } from './types';

const DESPAWN_MARGIN_TOP = 100;
const DESPAWN_MARGIN_SIDE = 80;
const DESPAWN_MARGIN_BOTTOM = 120;

/**
 * Velocity-based bullets (world px/s). Keeps a flat array — O(bullets) per frame;
 * aim-assist does O(enemies) per shot from WeaponRuntime (fine until counts explode; then bucket by Y).
 */
export class ProjectileManager {
  private readonly bullets: Phaser.GameObjects.Rectangle[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * @param vx - horizontal velocity (px/s)
   * @param vy - vertical velocity (px/s, negative = up)
   */
  spawn(
    worldX: number,
    worldY: number,
    vx: number,
    vy: number,
    skin: ProjectileSkin,
    damage: number,
    maxRangePx: number,
    pierceRemaining: number,
    depth = 15,
  ): void {
    const rect = this.scene.add.rectangle(worldX, worldY, skin.width, skin.height, skin.color);
    if (skin.strokeColor !== undefined) {
      rect.setStrokeStyle(1, skin.strokeColor, skin.strokeAlpha ?? 1);
    }
    rect.setDepth(depth);
    rect.setData('vx', vx);
    rect.setData('vy', vy);
    rect.setData('damage', damage);
    rect.setData('travelledPx', 0);
    rect.setData('maxRangePx', maxRangePx);
    rect.setData('pierceRemaining', pierceRemaining);
    rect.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
    this.bullets.push(rect);
  }

  getBullets(): readonly Phaser.GameObjects.Rectangle[] {
    return this.bullets;
  }

  removeBulletAt(index: number): void {
    const rect = this.bullets[index];
    if (rect === undefined) return;
    rect.destroy();
    this.bullets.splice(index, 1);
  }

  update(deltaSeconds: number): void {
    const top = ROAD_TOP_Y - DESPAWN_MARGIN_TOP;
    const bottom = GAME_HEIGHT + DESPAWN_MARGIN_BOTTOM;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const rect = this.bullets[i];
      const vx = rect.getData('vx') as number;
      const vy = rect.getData('vy') as number;
      const dx = vx * deltaSeconds;
      const dy = vy * deltaSeconds;
      rect.x += dx;
      rect.y += dy;

      const step = Math.hypot(dx, dy);
      const travelled = (rect.getData('travelledPx') as number) + step;
      rect.setData('travelledPx', travelled);
      const maxRange = rect.getData('maxRangePx') as number;

      if (
        travelled >= maxRange ||
        rect.y < top ||
        rect.y > bottom ||
        rect.x < -DESPAWN_MARGIN_SIDE ||
        rect.x > GAME_WIDTH + DESPAWN_MARGIN_SIDE
      ) {
        rect.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const rect of this.bullets) {
      rect.destroy();
    }
    this.bullets.length = 0;
  }
}
