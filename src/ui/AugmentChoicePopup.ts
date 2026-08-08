import Phaser from 'phaser';
import { Popup, PopupButtonSpec } from './Popup';

export interface AugmentChoiceOption {
  name: string;
  onChoose: () => void;
}

export interface AugmentChoicePopupOptions {
  options: AugmentChoiceOption[];
}

/** Shown on an in-battle Augment level-up (brief-augment.md step 4): offers a choice between
 * whatever Augments actually exist. With one Augment (today), this degrades to a single
 * "confirm" button rather than duplicating it to fill 3 slots -- identical choices aren't a
 * real choice; this naturally becomes a real 3-way pick once the pool has more Augments,
 * with no further code changes needed here. */
export class AugmentChoicePopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: AugmentChoicePopupOptions) {
    const buttons: PopupButtonSpec[] = opts.options.map((option) => ({
      label: option.name,
      onClick: option.onChoose,
    }));

    super(scene, x, y, {
      message: 'LEVEL UP!',
      color: '#4ade80',
      buttons,
    });
  }
}
