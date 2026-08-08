import Phaser from 'phaser';

const MAX_LINES = 5;
const PADDING = 16;

/** Dev-only rolling log, bottom-left of the screen -- shows the most recent MAX_LINES
 * messages, newest at the bottom. Callers gate construction on import.meta.env.DEV; this
 * class doesn't check it itself. Origin (0,1) anchors the bottom-left corner, so the panel
 * grows upward as lines are added instead of shifting position. */
export class DevLog {
  private lines: string[] = [];
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { height } = scene.cameras.main;
    this.text = scene.add
      .text(PADDING, height - PADDING, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9fb3c8',
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(1000);
  }

  log(message: string) {
    this.lines.push(message);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.text.setText(this.lines.join('\n'));
  }
}
