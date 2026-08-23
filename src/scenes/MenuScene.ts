import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { preloadBgmData, playBgm } from '../content/bgm';
import { preloadSfxData } from '../content/sfx';
import { preloadPlayerState, getLevelCompleted, setLevelCompleted } from '../content/playerState';

/** Entry point scene: title + Start/Continue buttons. Credits button is future work
 * (plan.md step 10) -- not built yet, nothing to link it to. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  preload() {
    preloadBgmData(this);
    // Button.ts's ui_click fires from this scene's buttons too, not just GameScene's
    // popups -- sfx.csv needs to be loaded here as well, or playSfx() crashes on click
    // (found live: "Cannot read properties of undefined (reading 'trim')" in parseCsv,
    // since scene.cache.text.get() returned undefined for a CSV this scene never loaded).
    preloadSfxData(this);
    // getLevelCompleted()'s player_state.json fallback path (first run ever, before
    // anything's been persisted to localStorage) reads through this.
    preloadPlayerState(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f14');
    const { width, height } = this.cameras.main;
    playBgm(this);

    this.add
      .text(width / 2, height / 2 - 100, 'Perimeter Zero', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const levelCompleted = getLevelCompleted(this);

    new Button(this, width / 2, height / 2, 'Start', () => {
      // Fresh run: clear any persisted progress so GameScene's levelCompleted+1 resolves
      // to Stage 1, not wherever a previous run left off.
      setLevelCompleted(0);
      this.scene.start('game');
    });

    // Only meaningful once something's actually been persisted -- levelCompleted === 0
    // means either a first-ever run or a fresh Start, either way there's nothing to
    // resume into that Start doesn't already do.
    if (levelCompleted > 0) {
      new Button(
        this,
        width / 2,
        height / 2 + 76,
        `Continue - Level ${levelCompleted + 1}`,
        () => this.scene.start('game'),
      );
    }
  }
}
