import Phaser from 'phaser';
import { PLAYER_HALF_WIDTH } from '../constants';
import type { CharacterId } from './types';

/** Same height as the Ranger triangle; apex is `halfH` above player origin. */
const RANGER_TRIANGLE_HEIGHT = 48;

const FILL_STARTER = 0x2dd4bf;
const FILL_RANGER = 0xb8c45c;
const STROKE = 0x115e59;
const STROKE_W = 2;
const STROKE_ALPHA = 0.9;

/**
 * Offset from player game object `(x, y)` to the weapon muzzle (world = player + this).
 * Ranger apex matches triangle local apex `(0, -halfH)`; Soldier keeps weapon offsets vs center.
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
  return { offsetX: weaponMuzzle.offsetX, offsetY: weaponMuzzle.offsetY };
}

/** Footprint matches former rectangle: `PLAYER_HALF_WIDTH * 2` × 48. */
export function addPlayerShape(
  scene: Phaser.Scene,
  characterId: CharacterId,
  x: number,
  y: number,
): Phaser.GameObjects.Shape {
  const w = PLAYER_HALF_WIDTH * 2;
  const h = 48;
  const halfW = w / 2;
  const halfH = characterId === 'ranger' ? RANGER_TRIANGLE_HEIGHT / 2 : h / 2;

  let shape: Phaser.GameObjects.Shape;
  if (characterId === 'ranger') {
    shape = scene.add.triangle(x, y, 0, -halfH, -halfW, halfH, halfW, halfH, FILL_RANGER);
  } else {
    const outer = Math.max(PLAYER_HALF_WIDTH, 26);
    const inner = outer * 0.42;
    shape = scene.add.star(x, y, 5, inner, outer, FILL_STARTER);
  }
  shape.setStrokeStyle(STROKE_W, STROKE, STROKE_ALPHA);
  shape.setDepth(10);
  return shape;
}
