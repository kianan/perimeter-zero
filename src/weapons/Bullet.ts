import Phaser from 'phaser';

export interface BulletConfig {
  angle: number;
  speed: number;
  lifespanMs: number;
  scale: number;
  radius: number;
  /** Damage this bullet deals on hit -- read off the bullet itself (not a scene-level
   * weapon damage field) so player and (eventually) enemy bullets can carry independent
   * values. */
  damage: number;
}

/** A simple travelling projectile: spawns, flies straight at a fixed angle, expires
 * after its lifespan. scale/radius come from weapon.csv (see content/weapons.ts) -- a
 * different weapon's bullet can look/collide differently. */
export class Bullet extends Phaser.GameObjects.Sprite {
  /** Read by GameScene's overlap callbacks instead of a scene-level damage field --
   * lets player bullets and (future) enemy bullets carry their own damage value. */
  readonly damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig) {
    super(scene, x, y, 'bullet');
    this.damage = config.damage;
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
