import Phaser from 'phaser';

const SPEED = 110; // px/sec -- slower than the player (260) so it's escapable
const SCALE = 0.16; // same source-frame size and scale as the player body

/**
 * Rusher archetype: no ranged behavior, just walks straight at the player.
 * Single body sprite (no weapon layer). Simplest enemy AI, first one built
 * (see workspace/onslaught/plan.md step 2).
 */
export class Enemy extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private pbody!: Phaser.Physics.Arcade.Body;
  private anim: 'idle' | 'walk' = 'idle';
  private dying = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bodySprite = scene.add.sprite(0, 0, 'rusher_idle_0').setScale(SCALE);
    this.add(this.bodySprite);
    this.setSize(110, 150);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.pbody = this.body as Phaser.Physics.Arcade.Body;

    this.bodySprite.play('rusher_idle');
  }

  /** Plays the death anim, then destroys the container once it finishes. */
  die() {
    if (this.dying) return;
    this.dying = true;
    this.pbody.setVelocity(0, 0);
    this.pbody.enable = false;
    this.bodySprite.once('animationcomplete', () => this.destroy());
    this.bodySprite.play('rusher_death');
  }

  /** Steers straight toward (targetX, targetY) -- e.g. the player's position. */
  chase(targetX: number, targetY: number) {
    if (this.dying) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 4) {
      const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(SPEED);
      this.pbody.setVelocity(v.x, v.y);
      this.bodySprite.setFlipX(dx < 0);
      this.setAnim('walk');
    } else {
      this.pbody.setVelocity(0, 0);
      this.setAnim('idle');
    }
  }

  private setAnim(anim: 'idle' | 'walk') {
    if (this.anim === anim) return;
    this.anim = anim;
    this.bodySprite.play(`rusher_${anim}`);
  }
}
