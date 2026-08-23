import Phaser from 'phaser';
import { playSfx } from '../content/sfx';

// Pure animation shape, not a balance stat -- unlike radius/damage/etc, doesn't need to be
// data-driven (see augment_weapon_scale.csv). Blast grows from 0.85x up to exactly 1x (the
// true damage radius) while fading, so it never visually overshoots the actual hit area --
// previously scaled past 1x, which made enemies just outside the real radius look hit.
const EXPLOSION_START_SCALE = 0.85;

export interface AoeLobConfig {
  targetX: number;
  targetY: number;
  /** AoE damage radius -- also the explosion visual's size. */
  radius: number;
  travelSpeed: number;
  delayMs: number; // sits after arriving (or after being placed, if !travels), before exploding
  /** Type-A shape column (augment_weapon_scale.csv's `travels`). True = tweens to
   * targetX/targetY like Grenade. False = stays exactly where thrown, on a timed fuse --
   * Land Mine's shape ("set it, forget it, get reminded when it goes off", GDD_lore.md §4).
   * Previously always true in practice: this field didn't exist and the constructor tweened
   * unconditionally, so augment_weapon_scale.csv's own `travels` column was silently ignored
   * even though it was already being parsed (content/augments.ts's AugmentTier.travels). */
  travels: boolean;
  visualRadius: number;
  color: number;
  explosionColor: number;
  explosionVisualMs: number;
  /** Fired at the moment of detonation. AoeLob only owns its own visual lifecycle -- it
   * doesn't know about Enemy, same split as Bullet not knowing about Enemy either. The
   * caller (GameScene, which owns the enemies list) applies damage here. */
  onExplode: (x: number, y: number, radius: number) => void;
}

/** Type-A Augment mechanic ("aoe_lob" in augment_weapon.csv's `type` column -- see
 * brief-augment.md): either travels to a target point or is placed immediately (see
 * `config.travels`), sits with a fuse delay, then explodes, dealing damage in a radius.
 * Shared engine for every AoeLob-type Augment (Grenade, Frenade, Land Mine, and eventually
 * artillery strike/orbital strike/homing missile) -- was called Grenade until a second AoeLob
 * augment made that name dishonest. Placeholder visuals only (Phaser Shape circles, no new
 * art). Stats come from augment_weapon.csv/augment_weapon_scale.csv via content/augments.ts --
 * this class has no hardcoded numbers of its own. */
export class AoeLob extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, x: number, y: number, private config: AoeLobConfig) {
    super(scene, x, y, config.visualRadius, 0, 360, false, config.color);
    scene.add.existing(this);

    if (!config.travels) {
      playSfx(scene, 'landmine_place');
      scene.time.delayedCall(config.delayMs, () => this.explode());
      return;
    }

    playSfx(scene, 'grenade_lob');
    const travelDist = Phaser.Math.Distance.Between(x, y, config.targetX, config.targetY);
    const travelMs = Math.max(100, (travelDist / config.travelSpeed) * 1000);

    scene.tweens.add({
      targets: this,
      x: config.targetX,
      y: config.targetY,
      duration: travelMs,
      ease: 'Quad.easeOut',
      onComplete: () => scene.time.delayedCall(config.delayMs, () => this.explode()),
    });
  }

  private explode() {
    const scene = this.scene;
    const { x, y } = this;
    const { radius, onExplode, explosionColor, explosionVisualMs } = this.config;

    onExplode(x, y, radius);
    playSfx(scene, 'explode');

    const blast = scene.add.circle(x, y, radius, explosionColor, 0.5).setScale(EXPLOSION_START_SCALE);
    scene.tweens.add({
      targets: blast,
      scale: 1,
      alpha: 0,
      duration: explosionVisualMs,
      onComplete: () => blast.destroy(),
    });

    this.destroy();
  }
}
