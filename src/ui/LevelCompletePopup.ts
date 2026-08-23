import Phaser from 'phaser';
import { Popup } from './Popup';

export interface LevelCompletePopupOptions {
  levelId: string;
  onNext: () => void;
}

/** Shown when a stage's survive-timer runs out and the run isn't over (see GameScene.win())
 * -- distinct from GameEndPopup's win/loss framing since the run itself keeps going, just
 * into the next stage. Single "Next" button; GameScene owns what actually happens on click
 * (persist progress, advance currentLevelId, restart), same split GameEndPopup already uses
 * for onRestart/onMainMenu. */
export class LevelCompletePopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: LevelCompletePopupOptions) {
    super(scene, x, y, {
      message: `LEVEL ${opts.levelId} COMPLETE`,
      color: '#4ade80',
      buttons: [{ label: 'Next', onClick: opts.onNext }],
    });
  }
}
