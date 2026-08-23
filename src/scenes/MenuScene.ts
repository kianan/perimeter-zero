import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { preloadBgmData, playBgm } from '../content/bgm';
import { preloadSfxData } from '../content/sfx';

/** Entry point scene: title + Start button. Credits button is future work (plan.md step 10)
 * -- not built yet, nothing to link it to. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  preload() {
    preloadBgmData(this);
    // Button.ts's ui_click fires from this scene's Start button too, not just GameScene's
    // popups -- sfx.csv needs to be loaded here as well, or playSfx() crashes on click
    // (found live: "Cannot read properties of undefined (reading 'trim')" in parseCsv,
    // since scene.cache.text.get() returned undefined for a CSV this scene never loaded).
    preloadSfxData(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f14');
    const { width, height } = this.cameras.main;
    playBgm(this);

    this.add
      .text(width / 2, height / 2 - 80, 'Perimeter Zero', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    new Button(this, width / 2, height / 2 + 20, 'Start', () => this.scene.start('game'));
  }
}
