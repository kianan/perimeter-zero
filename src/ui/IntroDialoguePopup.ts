import Phaser from 'phaser';
import { Popup } from './Popup';

export interface IntroDialoguePopupOptions {
  onDismiss: () => void;
}

/** Shown once ever (brief-tutorial.md), at the very start of a first-time player's level 1,
 * before the round timer starts. Backstory copy is lifted from content_pipeline/GDD_lore.md
 * §1's actual premise, not invented here -- "nobody else showed up to hold it, you did" is
 * the source doc's own hook. Reuses Popup's `lines` field for the body text, its first real
 * populated use. */
export class IntroDialoguePopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: IntroDialoguePopupOptions) {
    super(scene, x, y, {
      message: 'PERIMETER ZERO',
      lines: [
        "An excavation crew cracked open a demon portal nobody knew was down there.",
        'This breach point is the only thing between them and everywhere else.',
        'Nobody else showed up to hold it. You did.',
      ],
      buttons: [{ label: "Let's go", onClick: opts.onDismiss }],
    });
  }
}
