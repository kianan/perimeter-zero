import Phaser from 'phaser';

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
  delayMs: number; // sits after arriving, before it explodes (augment_weapon_scale.csv)
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
 * brief-augment.md): travels to a target point, sits with a visible fuse delay, then
 * explodes, dealing damage in a radius. Shared engine for every AoeLob-type Augment (Grenade,
 * Frenade, and eventually landmine/artillery strike/orbital strike/homing missile) -- was
 * called Grenade until a second AoeLob augment made that name dishonest. Placeholder visuals
 * only (Phaser Shape circles, no new art). Stats come from augment_weapon.csv/
 * augment_weapon_scale.csv via content/augments.ts -- this class has no hardcoded numbers
 * of its own. */
export class AoeLob extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, x: number, y: number, private config: AoeLobConfig) {
    super(scene, x, y, config.visualRadius, 0, 360, false, config.color);
    scene.add.existing(this);

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
