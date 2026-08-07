import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { KitchenSinkScene } from './scenes/KitchenSinkScene';

// #kitchen boots straight into the dev-only component reference page instead of the game.
// Otherwise boot into the menu (first in the array) -- Start takes you into GameScene.
const scenes = window.location.hash === '#kitchen' ? [KitchenSinkScene] : [MenuScene, GameScene];

const config: Phaser.Types.Core.GameConfig = {
  // AUTO (WebGL, falling back to Canvas): sprite tint (setTint/setTintFill) is a WebGL
  // shader feature and is a total no-op under Phaser's Canvas 2D renderer -- confirmed via
  // CanvasRenderer's batchSprite, which never reads sprite.tint at all. Canvas was pinned
  // briefly as a workaround for a sandboxed dev-preview tool hitting a WebGL framebuffer
  // error; that tool isn't the target environment, so it's not worth losing tint over.
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0f14',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: scenes,
};

new Phaser.Game(config);
