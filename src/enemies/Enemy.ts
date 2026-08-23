import Phaser from 'phaser';
import { EnemyArchetype } from './archetypes';
import { playSfx } from '../content/sfx';

const HIT_FLASH_MS = 120;
const DEATH_FADE_MS = 300; // used when an archetype has no death anim (see archetypes.ts)
// Distinct from the hit-flash red (0xff3b3b) so a dash burst reads differently from taking
// damage -- reuses the same setTint/clearTint call shape as takeDamage(), just a different
// color, alongside a temporary speed multiply (see startDashCycle()).
const DASH_TINT = 0xffe066;

export interface EnemyStats {
  hp: number;
  speed: number;
  damage: number;
  scale: number;
  // Charger/shooter-only fields (enemy.csv's preferred_range/dash_burst_*/dash_cooldown_ms
  // columns, via content/enemies.ts). All default to 0 so rusher/swarm/tank's existing spawn
  // calls -- which don't set these -- are unaffected: preferredRange === 0 keeps chase() on
  // its original always-close-in behavior, and dashCooldownMs === 0 just means nothing calls
  // startDashCycle() (it isn't wired to spawning yet regardless -- see the class doc below /
  // GameScene.spawnEnemy()).
  preferredRange?: number;
  dashBurstMult?: number;
  dashBurstMs?: number;
  dashCooldownMs?: number;
  // enemy.csv's `weapon` FK -- blank for melee/swarm archetypes with no ranged attack.
  // Stored so GameScene.fireEnemyWeapon() can resolve it off the Enemy instance itself
  // (its signature only takes the Enemy, not a separately-threaded weapon id).
  weaponId?: string;
}

/**
 * Archetype-agnostic enemy: visuals (animation keys) come from EnemyArchetype, stats (hp,
 * speed, contact damage) come from enemy.csv/enemy_scale.csv via EnemyStats (see
 * content/enemies.ts and GameScene.spawnEnemy()). Adding a new archetype means a new CSV row
 * + an archetypes.ts entry, not a new Enemy subclass -- see workspace/onslaught/plan.md.
 *
 * `preferredRange` (chase() stand-off) and the dash-burst cycle (startDashCycle()) are the
 * two core behaviors for ranged/charger-style archetypes, wired to spawning by
 * GameScene.spawnEnemy() (TICKET-017). `weaponId` (see EnemyStats) is read by
 * GameScene.fireEnemyWeapon() to arm a ranged enemy's fire timer.
 */
export class Enemy extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private pbody!: Phaser.Physics.Arcade.Body;
  private anim: 'idle' | 'move' = 'idle';
  private dying = false;
  private hp: number;
  private speed: number;
  // Undashed speed -- startDashCycle() multiplies/reverts this.speed against this baseline
  // rather than dividing back by dashBurstMult, so a revert is always exact regardless of
  // rounding.
  private readonly baseSpeed: number;
  private readonly preferredRange: number;
  private readonly dashBurstMult: number;
  private readonly dashBurstMs: number;
  private readonly dashCooldownMs: number;
  /** Contact damage dealt to the player on touch -- read by GameScene's player-enemy overlap. */
  readonly damage: number;
  /** enemy.csv's `weapon` FK, blank if this archetype doesn't fire a weapon -- read by
   * GameScene.fireEnemyWeapon() to resolve the weapon's stats. */
  readonly weaponId: string;

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
    this.baseSpeed = stats.speed;
    this.damage = stats.damage;
    this.preferredRange = stats.preferredRange ?? 0;
    this.dashBurstMult = stats.dashBurstMult ?? 0;
    this.dashBurstMs = stats.dashBurstMs ?? 0;
    this.dashCooldownMs = stats.dashCooldownMs ?? 0;
    this.weaponId = stats.weaponId ?? '';

    this.bodySprite = scene.add.sprite(0, 0, archetype.initialTexture).setScale(stats.scale);
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
    playSfx(this.scene, 'enemy_hit');
  }

  /** Plays the death anim if the archetype has one, otherwise fades out -- either way,
   * destroys the container once it finishes. */
  private die() {
    if (this.dying) return;
    this.dying = true;
    this.pbody.setVelocity(0, 0);
    this.pbody.enable = false;
    this.bodySprite.clearTint();
    playSfx(this.scene, 'enemy_death');

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

  /** True once this enemy has begun its death sequence -- same flag chase() checks before
   * moving. Exposed so GameScene.fireEnemyWeapon()'s fire-timer callback can stop spawning
   * new bullets the instant death starts, even though that timer isn't gated by the
   * enemies[] list the way chase()'s per-frame loop is. */
  isDying(): boolean {
    return this.dying;
  }

  /** Steers straight toward (targetX, targetY) -- e.g. the player's position. Ranged/charger
   * archetypes with a preferredRange > 0 (see EnemyStats) hold station instead of closing
   * the last of the distance once within that range -- everything else (preferredRange === 0,
   * i.e. every archetype so far) keeps the original always-close-in behavior untouched. */
  chase(targetX: number, targetY: number) {
    if (this.dying) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.preferredRange > 0 && dist <= this.preferredRange) {
      this.pbody.setVelocity(0, 0);
      this.setAnim('idle');
      return;
    }

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

  /** Arms a repeating dash-burst cycle: every dashCooldownMs, tints the sprite (distinct
   * from the hit-flash color) and multiplies this.speed by dashBurstMult for dashBurstMs,
   * then reverts both tint and speed. Purely a self-contained speed/visual modifier --
   * chase() just reads whatever this.speed currently is, so a burst in progress
   * transparently speeds up the existing chase (or stand-off) motion. Called by
   * GameScene.spawnEnemy() for any archetype whose dashBurstMult > 0 (e.g. charger). */
  startDashCycle() {
    this.scene.time.addEvent({
      delay: this.dashCooldownMs,
      loop: true,
      callback: () => {
        if (this.dying) return;
        this.bodySprite.setTint(DASH_TINT);
        this.speed = this.baseSpeed * this.dashBurstMult;
        this.scene.time.delayedCall(this.dashBurstMs, () => {
          if (this.dying) return;
          this.bodySprite.clearTint();
          this.speed = this.baseSpeed;
        });
      },
    });
  }

  private setAnim(anim: 'idle' | 'move') {
    if (this.anim === anim) return;
    this.anim = anim;
    this.bodySprite.play(anim === 'idle' ? this.archetype.idleAnim : this.archetype.moveAnim);
  }
}
