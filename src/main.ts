import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './game/constants';
import { GameScene } from './scenes/GameScene';
import { StoreScene } from './scenes/StoreScene';
import { TitleScene } from './scenes/TitleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0f0f14',
  scale: {
    mode: Phaser.Scale.FIT,
    /**
     * `NO_CENTER` on purpose: the host page (`index.html`) centers `#app` with
     * flexbox. Adding `CENTER_BOTH` here would make Phaser set an inline
     * `margin-left` on the canvas, which the flex layout then *adds* on top of
     * its own centering — pushing the whole game to the right and desyncing
     * pointer/hit-area math against the rendered button positions.
     */
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    /** Keep input aligned when the window resizes (dvh / zoom / devtools). */
    resizeInterval: 100,
  },
  input: {
    keyboard: true,
    activePointers: 3,
  },
  scene: [TitleScene, GameScene, StoreScene],
};

const game = new Phaser.Game(config);
window.addEventListener('resize', () => {
  game.scale.refresh();
});
