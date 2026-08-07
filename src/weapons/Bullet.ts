import Phaser from 'phaser';

const SCALE = 0.012;   // 2048px source -> ~a small travelling round
const RADIUS = (2048 * SCALE) / 2;

/** A simple travelling projectile: spawns, flies straight at a fixed angle, expires
 * after its lifespan. */
export class Bullet extends Phaser.GameObjects.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    speed: number,
    lifespanMs: number,
  ) {
    super(scene, x, y, 'bullet');
    this.setScale(SCALE);
    this.setRotation(angle); // orient the glow toward its travel direction
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const pbody = this.body as Phaser.Physics.Arcade.Body;
    pbody.setCircle(RADIUS, -RADIUS, -RADIUS);
    pbody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    scene.time.delayedCall(lifespanMs, () => this.destroy());
  }
}
