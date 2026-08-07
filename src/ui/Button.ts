import Phaser from 'phaser';

const WIDTH = 220;
const HEIGHT = 56;
const BG_COLOR = 0x1f2a36;
const BG_HOVER_COLOR = 0x2c3b4d;
const BORDER_COLOR = 0x3a4a5c;
const TEXT_COLOR = '#ffffff';

/**
 * Reusable clickable button: background rect + centered label, hover feedback.
 * Shared primitive for the main menu and the end-of-run popup (plan.md steps 9-11).
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
    super(scene, x, y);

    const bg = scene.add
      .rectangle(0, 0, WIDTH, HEIGHT, BG_COLOR)
      .setStrokeStyle(2, BORDER_COLOR);
    const text = scene.add
      .text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '20px', color: TEXT_COLOR })
      .setOrigin(0.5);

    this.add([bg, text]);
    this.setSize(WIDTH, HEIGHT);

    // Every use so far (HUD, menu, popup) is screen-fixed UI. Phaser's input hit-test reads
    // each interactive object's OWN scrollFactor, not its parent Container's -- setting
    // scrollFactor(0) only on this outer container makes the button *render* fixed to the
    // screen while its actual click target stays anchored in world space and drifts the
    // moment the camera scrolls. Set it on every child that participates in rendering/hit
    // testing, not just the container, so this can't silently break for the next caller.
    this.setScrollFactor(0);
    bg.setScrollFactor(0);
    text.setScrollFactor(0);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(BG_HOVER_COLOR));
    bg.on('pointerout', () => bg.setFillStyle(BG_COLOR));
    bg.on('pointerdown', onClick);

    scene.add.existing(this);
  }
}
