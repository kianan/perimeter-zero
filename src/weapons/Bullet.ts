import Phaser from 'phaser';

export interface BulletConfig {
  angle: number;
  speed: number;
  lifespanMs: number;
  scale: number;
  radius: number;
}

/** A simple travelling projectile: spawns, flies straight at a fixed angle, expires
 * after its lifespan. scale/radius come from weapon.csv (see content/weapons.ts) -- a
 * different weapon's bullet can look/collide differently. */
export class Bullet extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig) {
    super(scene, x, y, 'bullet');
    this.setScale(config.scale);
    this.setRotation(config.angle); // orient the glow toward its travel direction
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const pbody = this.body as Phaser.Physics.Arcade.Body;
    pbody.setCircle(config.radius, -config.radius, -config.radius);
    pbody.setVelocity(Math.cos(config.angle) * config.speed, Math.sin(config.angle) * config.speed);

    scene.time.delayedCall(config.lifespanMs, () => this.destroy());
  }
}
