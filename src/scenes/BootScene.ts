import Phaser from 'phaser';
import {
  HERO_SOLDIER_IMAGE_URL,
  HERO_SOLDIER_TEXTURE_KEY,
  HERO_SOLDIER_WALK_IMAGE_URL,
  HERO_SOLDIER_WALK_TEXTURE_KEY,
} from '../game/assets';

const SCENE_KEY = 'Boot';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY);
  }

  preload(): void {
    this.load.image(HERO_SOLDIER_TEXTURE_KEY, HERO_SOLDIER_IMAGE_URL);
    this.load.image(HERO_SOLDIER_WALK_TEXTURE_KEY, HERO_SOLDIER_WALK_IMAGE_URL);
  }

  create(): void {
    this.textures.get(HERO_SOLDIER_TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get(HERO_SOLDIER_WALK_TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scene.start('Title');
  }
}
