import Phaser from 'phaser';
import { Button } from '../ui/Button';

/** Entry point scene: title + Start button. Credits button is future work (plan.md step 10)
 * -- not built yet, nothing to link it to. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f14');
    const { width, height } = this.cameras.main;

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
