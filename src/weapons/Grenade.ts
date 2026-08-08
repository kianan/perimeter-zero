import Phaser from 'phaser';

export interface GrenadeConfig {
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
  /** Fired at the moment of detonation. Grenade only owns its own visual lifecycle -- it
   * doesn't know about Enemy, same split as Bullet not knowing about Enemy either. The
   * caller (GameScene, which owns the enemies list) applies damage here. */
  onExplode: (x: number, y: number, radius: number) => void;
}

/** Augment (see brief-augment.md) -- lobbed AoE explosive. Travels to a target point, sits
 * with a visible fuse delay, then explodes. Placeholder visuals only (Phaser Shape circles,
 * no new art). Stats come from augment_weapon.csv/augment_weapon_scale.csv via
 * content/augments.ts -- this class has no hardcoded numbers of its own. */
export class Grenade extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, x: number, y: number, private config: GrenadeConfig) {
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

    const blast = scene.add.circle(x, y, radius, explosionColor, 0.5);
    scene.tweens.add({
      targets: blast,
      scale: 1.15,
      alpha: 0,
      duration: explosionVisualMs,
      onComplete: () => blast.destroy(),
    });

    this.destroy();
  }
}
