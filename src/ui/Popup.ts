import Phaser from 'phaser';
import { Button } from './Button';

const PANEL_WIDTH = 420;
const PANEL_COLOR = 0x131a22;
const PANEL_BORDER = 0x3a4a5c;
const BUTTON_HEIGHT = 56; // matches Button's own height, used for vertical layout math
const BUTTON_GAP = 16;

interface PopupButtonSpec {
  label: string;
  onClick: () => void;
}

interface PopupOptions {
  message: string;
  color?: string;
  /** Optional lines rendered between the message and the buttons -- reserved for a future
   * loot/Scrap run-summary (plan.md step 11); nothing populates this yet. */
  lines?: string[];
  buttons: PopupButtonSpec[];
}

/**
 * Generic modal popup: message + optional content lines + a stack of buttons. Used for the
 * end-of-run screen. Every child forces scrollFactor(0), same reasoning as Button -- a
 * container's own scrollFactor doesn't propagate to its children for input hit-testing, so
 * each render/interactive object needs to set it itself.
 */
export class Popup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: PopupOptions) {
    super(scene, x, y);

    const lines = opts.lines ?? [];
    const panelHeight = 140 + lines.length * 28 + opts.buttons.length * (BUTTON_HEIGHT + BUTTON_GAP);

    const panel = scene.add
      .rectangle(0, 0, PANEL_WIDTH, panelHeight, PANEL_COLOR)
      .setStrokeStyle(2, PANEL_BORDER)
      .setScrollFactor(0);
    const message = scene.add
      .text(0, -panelHeight / 2 + 40, opts.message, {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: opts.color ?? '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add([panel, message]);

    let cursorY = -panelHeight / 2 + 90;
    for (const line of lines) {
      const lineText = scene.add
        .text(0, cursorY, line, { fontFamily: 'sans-serif', fontSize: '16px', color: '#9fb3c8' })
        .setOrigin(0.5)
        .setScrollFactor(0);
      this.add(lineText);
      cursorY += 28;
    }

    cursorY += 20;
    for (const btn of opts.buttons) {
      this.add(new Button(scene, 0, cursorY + BUTTON_HEIGHT / 2, btn.label, btn.onClick));
      cursorY += BUTTON_HEIGHT + BUTTON_GAP;
    }

    this.setScrollFactor(0);
    scene.add.existing(this);
  }
}
