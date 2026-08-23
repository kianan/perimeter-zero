import Phaser from 'phaser';
import { Popup, PopupButtonSpec } from './Popup';

export interface AugmentChoiceOption {
  name: string;
  desc: string;
  damage: number;
  onChoose: () => void;
}

export interface AugmentChoicePopupOptions {
  options: AugmentChoiceOption[];
  /** First-ever popup only (brief-tutorial.md) -- reuses Popup's own `lines` field, same as
   * IntroDialoguePopup does for the level-1 backstory. */
  hintLines?: string[];
}

/** Shown on an in-battle Augment level-up (brief-augment.md step 4): offers a choice between
 * whatever Augments actually exist. With one Augment (today), this degrades to a single
 * "confirm" button rather than duplicating it to fill 3 slots -- identical choices aren't a
 * real choice; this naturally becomes a real 3-way pick once the pool has more Augments,
 * with no further code changes needed here. Each option shows its description and damage as
 * Popup sublines (brief-tutorial.md) -- previously name-only, even though AugmentTier already
 * carried desc/damage unused. */
export class AugmentChoicePopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: AugmentChoicePopupOptions) {
    const buttons: PopupButtonSpec[] = opts.options.map((option) => ({
      label: option.name,
      onClick: option.onChoose,
      sublines: [option.desc, `Damage: ${option.damage}`],
    }));

    super(scene, x, y, {
      message: 'LEVEL UP!',
      color: '#4ade80',
      lines: opts.hintLines,
      buttons,
    });
  }
}
