import Phaser from 'phaser';
import { preloadCharacterAssets, createCharacterAnims } from '../content/characterAssets';
import { Button } from '../ui/Button';
import { GameEndPopup } from '../ui/GameEndPopup';

const REPLAY_DELAY_MS = 600; // pause before replaying a one-shot (death) anim, so it's watchable
const SCROLL_BOTTOM_PADDING = 40;

/**
 * Dev-only visual reference page for every reusable component/asset in the game -- no
 * gameplay, nothing needs to happen (take damage, survive a timer) to see what something
 * looks like. Reached via the #kitchen URL hash (see main.ts); not part of the game's own
 * scene flow.
 */
export class KitchenSinkScene extends Phaser.Scene {
  private cursorY = 24;
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('kitchen-sink');
  }

  preload() {
    preloadCharacterAssets(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f14');
    createCharacterAnims(this);

    // Everything below is added into this one container so scrolling (below) can move it as
    // a block by setting its y -- Button forces scrollFactor(0) on itself (correct for real
    // UI use: HUD/menu/popup are screen-fixed), so camera-scroll-based scrolling would leave
    // the button demo stuck on screen while the rest of the page moved past it. Moving a
    // container's own position isn't affected by its children's scrollFactor, so this avoids
    // that conflict entirely.
    this.content = this.add.container(0, 0);

    this.text(24, this.cursorY, 'Kitchen Sink', 28, '#ffffff', true);
    this.cursorY += 56;

    this.section('UI — Button');
    this.content.add(
      new Button(this, 140, this.cursorY + 28, 'Button', () =>
        console.log('kitchen sink: button clicked'),
      ),
    );
    this.cursorY += 96;

    this.section('UI — GameEndPopup (extends Popup)');
    this.content.add(
      new GameEndPopup(this, 230, this.cursorY + 160, {
        won: false,
        onRestart: () => console.log('kitchen sink: restart clicked'),
        onMainMenu: () => console.log('kitchen sink: main menu clicked'),
      }),
    );
    this.content.add(
      new GameEndPopup(this, 690, this.cursorY + 160, {
        won: true,
        onRestart: () => console.log('kitchen sink: restart clicked'),
        onMainMenu: () => console.log('kitchen sink: main menu clicked'),
      }),
    );
    this.cursorY += 340;

    this.section('Character — Body');
    this.spriteDemo(100, 'body_idle_0', 'body_idle', 0.09, 'idle');
    this.spriteDemo(280, 'body_walk_0', 'body_walk', 0.09, 'walk');
    this.spriteDemo(460, 'body_death_0', 'body_death', 0.09, 'death', true);
    this.cursorY += 200;

    this.section('Character — Weapon');
    this.spriteDemo(100, 'weapon_idle_0', 'weapon_idle', 0.07, 'idle');
    this.spriteDemo(280, 'weapon_walk_0', 'weapon_walk', 0.07, 'walk (disabled in-game, see Player.ts)');
    this.cursorY += 200;

    this.section('Enemy — Rusher');
    this.spriteDemo(100, 'rusher_idle_0', 'rusher_idle', 0.09, 'idle');
    this.spriteDemo(280, 'rusher_walk_0', 'rusher_walk', 0.09, 'walk');
    this.spriteDemo(460, 'rusher_death_0', 'rusher_death', 0.09, 'death', true);
    this.cursorY += 200;

    this.section('Enemy — Swarm');
    // Only one anim exists (fly_0..5) -- no idle/walk/death split, no death art (see
    // enemies/archetypes.ts: die() fades out instead of playing a death anim).
    this.spriteDemo(100, 'swarm_fly_0', 'swarm_fly', 0.07, 'fly (idle + move + death fallback)');
    this.cursorY += 200;

    this.section('Weapons — Bullet');
    // Shown larger than its actual in-game scale (0.012, ~24px) so it's visible here.
    this.spriteDemo(100, 'bullet', null, 0.04, 'actual in-game size is much smaller');
    this.cursorY += 200;

    this.section('HUD text style');
    this.text(100, this.cursorY, 'HP: 73/100    Time: 47s', 20, '#ffffff');
    this.cursorY += 60;

    this.section('End-of-run message styles');
    this.text(100, this.cursorY, 'GAME OVER', 32, '#ff3b3b', true);
    this.text(320, this.cursorY, 'YOU SURVIVED', 32, '#4ade80', true);
    this.cursorY += 60;

    const totalHeight = this.cursorY;
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        const maxScroll = Math.max(0, totalHeight - this.cameras.main.height + SCROLL_BOTTOM_PADDING);
        this.content.y = Phaser.Math.Clamp(this.content.y - dy, -maxScroll, 0);
      },
    );
  }

  private section(title: string) {
    this.text(24, this.cursorY, title, 18, '#7fa8c9', true);
    this.cursorY += 32;
  }

  private text(x: number, y: number, value: string, fontSize: number, color: string, bold = false) {
    const t = this.add.text(x, y, value, {
      fontFamily: 'sans-serif',
      fontSize: `${fontSize}px`,
      color,
      fontStyle: bold ? 'bold' : 'normal',
    });
    this.content.add(t);
    return t;
  }

  /** One sprite + caption. If `animKey` is null, shows a static frame (e.g. the bullet).
   * `oneShot` replays a non-looping anim (death) after a pause so it stays watchable. */
  private spriteDemo(
    x: number,
    textureKey: string,
    animKey: string | null,
    scale: number,
    caption: string,
    oneShot = false,
  ) {
    const y = this.cursorY + 70;
    const sprite = this.add.sprite(x, y, textureKey).setScale(scale);
    this.content.add(sprite);

    if (animKey) {
      sprite.play(animKey);
      if (oneShot) {
        sprite.on('animationcomplete', () => {
          this.time.delayedCall(REPLAY_DELAY_MS, () => sprite.play(animKey));
        });
      }
    }

    this.text(x, y + 90, caption, 13, '#9fb3c8').setOrigin(0.5, 0);
  }
}
