import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  // CANVAS, not AUTO: some sandboxed dev/CI browsers hit a WebGL framebuffer error on this
  // scene. No shaders/advanced blending used yet, so Canvas has no real downside -- revisit
  // Phaser.AUTO once WebGL-only effects are actually needed.
  type: Phaser.CANVAS,
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
  scene: [GameScene],
};

new Phaser.Game(config);
