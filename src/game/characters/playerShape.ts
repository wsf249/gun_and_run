import Phaser from 'phaser';
import {
  HERO_SOLDIER_TEXTURE_KEY,
  HERO_SOLDIER_WALK_TEXTURE_KEY,
} from '../assets';
import {
  PLAYER_DISPLAY_HEIGHT,
  PLAYER_DISPLAY_WIDTH,
  PLAYER_HALF_WIDTH,
  SOLDIER_MOVE_TEXTURE_FLIP_MS,
} from '../constants';
import type { CharacterId } from './types';

/** Same height as the Ranger triangle; apex is `halfH` above player origin. */
const RANGER_TRIANGLE_HEIGHT = 48;

const FILL_RANGER = 0xb8c45c;
const STROKE = 0x115e59;
const STROKE_W = 2;
const STROKE_ALPHA = 0.9;

export type PlayerVisual = Phaser.GameObjects.Image | Phaser.GameObjects.Shape;

/**
 * Offset from player game object `(x, y)` to the weapon muzzle (world = player + this).
 * Soldier `(x,y)` is **feet** (bottom-center); weapon `muzzle` offsets are authored vs body center, so we lift by half display height.
 * Ranger apex matches triangle local apex `(0, -halfH)`.
 */
export function getMuzzleOffsetFromPlayer(
  characterId: CharacterId,
  weaponMuzzle: { readonly offsetX: number; readonly offsetY: number },
): { offsetX: number; offsetY: number } {
  if (characterId === 'ranger') {
    const halfH = RANGER_TRIANGLE_HEIGHT / 2;
    return {
      offsetX: weaponMuzzle.offsetX,
      offsetY: -halfH,
    };
  }
  return {
    offsetX: weaponMuzzle.offsetX,
    offsetY: weaponMuzzle.offsetY - PLAYER_DISPLAY_HEIGHT / 2,
  };
}

function applySoldierTextureKey(img: Phaser.GameObjects.Image, key: string): void {
  if (img.texture.key !== key) {
    img.setTexture(key);
    img.setOrigin(0.5, 1);
    img.setDisplaySize(PLAYER_DISPLAY_WIDTH, PLAYER_DISPLAY_HEIGHT);
  }
}

/**
 * When still: always idle (`hero_soldier`).
 * When moving (input): flip idle / walk on a timer so the two PNGs alternate.
 */
export function applySoldierMovementTexture(
  img: Phaser.GameObjects.Image,
  movingIntent: boolean,
  nowMs: number,
): void {
  if (!movingIntent) {
    applySoldierTextureKey(img, HERO_SOLDIER_TEXTURE_KEY);
    return;
  }
  const phase = Math.floor(nowMs / SOLDIER_MOVE_TEXTURE_FLIP_MS) % 2;
  applySoldierTextureKey(
    img,
    phase === 0 ? HERO_SOLDIER_TEXTURE_KEY : HERO_SOLDIER_WALK_TEXTURE_KEY,
  );
}

/**
 * Soldier: texture image with fixed display size and origin `(0.5, 1)` (feet on `y`).
 * Ranger: triangle placeholder (center origin at `y`).
 *
 * Soldier texture is preloaded in `BootScene`; do not start `Game` before boot completes.
 */
export function addPlayerVisual(
  scene: Phaser.Scene,
  characterId: CharacterId,
  x: number,
  y: number,
): PlayerVisual {
  if (characterId === 'ranger') {
    const w = PLAYER_HALF_WIDTH * 2;
    const halfW = w / 2;
    const halfH = RANGER_TRIANGLE_HEIGHT / 2;
    const shape = scene.add.triangle(x, y, 0, -halfH, -halfW, halfH, halfW, halfH, FILL_RANGER);
    shape.setStrokeStyle(STROKE_W, STROKE, STROKE_ALPHA);
    shape.setDepth(10);
    return shape;
  }

  const img = scene.add.image(x, y, HERO_SOLDIER_TEXTURE_KEY);
  img.setOrigin(0.5, 1);
  img.setDisplaySize(PLAYER_DISPLAY_WIDTH, PLAYER_DISPLAY_HEIGHT);
  img.setDepth(10);
  return img;
}
