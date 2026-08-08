import Phaser from 'phaser';
import { Popup, PopupButtonSpec } from './Popup';

export interface GameEndPopupOptions {
  won: boolean;
  onRestart: () => void;
  onMainMenu: () => void;
}

/** The end-of-run popup: "GAME OVER" (loss -- Restart + Main Menu) or "YOU SURVIVED" (win --
 * Main Menu only). Extends the generic Popup shell rather than GameScene building the
 * message/color/button-set inline -- keeps that presentation logic out of GameScene, which
 * only needs to say "the round ended, won or lost." */
export class GameEndPopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: GameEndPopupOptions) {
    const buttons: PopupButtonSpec[] = opts.won
      ? [{ label: 'Main Menu', onClick: opts.onMainMenu }]
      : [
          { label: 'Restart', onClick: opts.onRestart },
          { label: 'Main Menu', onClick: opts.onMainMenu },
        ];

    super(scene, x, y, {
      message: opts.won ? 'YOU SURVIVED' : 'GAME OVER',
      color: opts.won ? '#4ade80' : '#ff3b3b',
      buttons,
    });
  }
}
