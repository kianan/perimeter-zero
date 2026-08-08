import Phaser from 'phaser';
import { EnemyArchetype } from './archetypes';

const HIT_FLASH_MS = 120;
const DEATH_FADE_MS = 300; // used when an archetype has no death anim (see archetypes.ts)

export interface EnemyStats {
  hp: number;
  speed: number;
  damage: number;
}

/**
 * Archetype-agnostic enemy: visuals (animation keys) come from EnemyArchetype, stats (hp,
 * speed, contact damage) come from enemy.csv/enemy_scale.csv via EnemyStats (see
 * content/enemies.ts and GameScene.spawnEnemy()). Adding a new archetype means a new CSV row
 * + an archetypes.ts entry, not a new Enemy subclass -- see workspace/onslaught/plan.md.
 */
export class Enemy extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private pbody!: Phaser.Physics.Arcade.Body;
  private anim: 'idle' | 'move' = 'idle';
  private dying = false;
  private hp: number;
  private speed: number;
  /** Contact damage dealt to the player on touch -- read by GameScene's player-enemy overlap. */
  readonly damage: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private archetype: EnemyArchetype,
    stats: EnemyStats,
  ) {
    super(scene, x, y);
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.damage = stats.damage;

    this.bodySprite = scene.add.sprite(0, 0, archetype.initialTexture).setScale(archetype.scale);
    this.add(this.bodySprite);
    this.setSize(110, 150);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.pbody = this.body as Phaser.Physics.Arcade.Body;

    this.bodySprite.play(archetype.idleAnim);
  }

  /** Deducts hp and flashes red; dies only once hp reaches 0. */
  takeDamage(amount: number) {
    if (this.dying) return;
    this.hp = Math.max(0, this.hp - amount);

    if (this.hp === 0) {
      this.die();
      return;
    }

    this.bodySprite.setTint(0xff3b3b);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.bodySprite.clearTint());
  }

  /** Plays the death anim if the archetype has one, otherwise fades out -- either way,
   * destroys the container once it finishes. */
  private die() {
    if (this.dying) return;
    this.dying = true;
    this.pbody.setVelocity(0, 0);
    this.pbody.enable = false;
    this.bodySprite.clearTint();

    if (this.archetype.deathAnim) {
      this.bodySprite.once('animationcomplete', () => this.destroy());
      this.bodySprite.play(this.archetype.deathAnim);
    } else {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0,
        duration: DEATH_FADE_MS,
        onComplete: () => this.destroy(),
      });
    }
  }

  /** Steers straight toward (targetX, targetY) -- e.g. the player's position. */
  chase(targetX: number, targetY: number) {
    if (this.dying) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 4) {
      const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.speed);
      this.pbody.setVelocity(v.x, v.y);
      this.bodySprite.setFlipX(dx < 0);
      this.setAnim('move');
    } else {
      this.pbody.setVelocity(0, 0);
      this.setAnim('idle');
    }
  }

  private setAnim(anim: 'idle' | 'move') {
    if (this.anim === anim) return;
    this.anim = anim;
    this.bodySprite.play(anim === 'idle' ? this.archetype.idleAnim : this.archetype.moveAnim);
  }
}
