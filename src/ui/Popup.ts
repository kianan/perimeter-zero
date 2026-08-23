import Phaser from 'phaser';
import { Button } from './Button';

const PANEL_WIDTH = 420;
const PANEL_COLOR = 0x131a22;
const PANEL_BORDER = 0x3a4a5c;
const BUTTON_HEIGHT = 56; // matches Button's own height, used for vertical layout math
const BUTTON_GAP = 16;
const LINE_GAP = 10;
const SUBLINE_TOP_PADDING = 10; // extra gap between a button and its own sublines below it
const PANEL_PADDING_TOP = 32;
const PANEL_PADDING_BOTTOM = 32;
// Horizontal padding on each side, inside the panel -- also the wordWrap width for every
// text element, so copy wraps inside the panel instead of overflowing its edges.
const CONTENT_WIDTH = PANEL_WIDTH - 48;

export interface PopupButtonSpec {
  label: string;
  onClick: () => void;
  /** Optional small text lines rendered directly below this button (e.g. an Augment's
   * description + damage in AugmentChoicePopup) -- generic on Popup itself, not
   * AugmentChoicePopup-specific, since any future multi-option popup could reasonably want
   * per-option detail without inventing its own layout math from scratch. */
  sublines?: string[];
}

export interface PopupOptions {
  message: string;
  color?: string;
  /** Optional lines rendered between the message and the buttons -- used by
   * IntroDialoguePopup's backstory copy and AugmentChoicePopup's first-time hint line
   * (brief-tutorial.md). */
  lines?: string[];
  buttons: PopupButtonSpec[];
}

/**
 * Base modal shell: panel + message + optional content lines + a stack of buttons. Deliberately
 * thin -- specific popups (GameEndPopup today; stage-select/weapon-upgrade/level-up later) each
 * extend this for their own content/behavior rather than this class growing a case for every
 * popup that will ever exist. Every child forces scrollFactor(0), same reasoning as Button -- a
 * container's own scrollFactor doesn't propagate to its children for input hit-testing, so
 * each render/interactive object needs to set it itself.
 *
 * Layout is two-pass: every text/button element is created and measured (real height, after
 * word-wrap) at a provisional y first, then the whole content block is re-centered and the
 * panel sized to fit it. Height can't be predicted from a fixed lines-count/buttons-count
 * formula once wordWrap is involved -- one line of copy can render as 1-3 visual lines
 * depending on length, so the panel has to be sized from what actually got rendered.
 */
export class Popup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: PopupOptions) {
    super(scene, x, y);

    // Positioned provisionally (top-down from local y=0); shifted into their final,
    // re-centered position once the total content height is known.
    const children: (Phaser.GameObjects.Text | Button)[] = [];
    let cursorY = 0;

    const message = scene.add
      .text(0, cursorY, opts.message, {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: opts.color ?? '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: CONTENT_WIDTH },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    children.push(message);
    cursorY += message.height + 24;

    for (const line of opts.lines ?? []) {
      const lineText = scene.add
        .text(0, cursorY, line, {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#9fb3c8',
          align: 'center',
          wordWrap: { width: CONTENT_WIDTH },
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0);
      children.push(lineText);
      cursorY += lineText.height + LINE_GAP;
    }

    cursorY += 20;
    for (const btn of opts.buttons) {
      const button = new Button(scene, 0, cursorY + BUTTON_HEIGHT / 2, btn.label, btn.onClick);
      children.push(button);
      cursorY += BUTTON_HEIGHT;
      if (btn.sublines?.length) cursorY += SUBLINE_TOP_PADDING;
      for (const subline of btn.sublines ?? []) {
        const subText = scene.add
          .text(0, cursorY, subline, {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            color: '#9fb3c8',
            align: 'center',
            wordWrap: { width: CONTENT_WIDTH },
          })
          .setOrigin(0.5, 0)
          .setScrollFactor(0);
        children.push(subText);
        cursorY += subText.height;
      }
      cursorY += BUTTON_GAP;
    }

    const panelHeight = cursorY + PANEL_PADDING_BOTTOM + PANEL_PADDING_TOP;

    // Re-center: content was laid out top-down starting at local y=0 -- shift everything up
    // so the panel (and this popup's x/y, which callers treat as the visual center) stays
    // centered regardless of how tall the wrapped content turned out to be.
    const shiftY = -panelHeight / 2 + PANEL_PADDING_TOP;
    for (const child of children) {
      child.y += shiftY;
    }

    const panel = scene.add
      .rectangle(0, 0, PANEL_WIDTH, panelHeight, PANEL_COLOR)
      .setStrokeStyle(2, PANEL_BORDER)
      .setScrollFactor(0);

    this.add(panel);
    this.add(children);

    this.setScrollFactor(0);
    scene.add.existing(this);
  }
}
