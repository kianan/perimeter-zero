import Phaser from 'phaser';
import { Bullet } from '../weapons/Bullet';

const SPEED = 260;      // px/sec
const SCALE = 0.16;     // 2048px source frames -> ~a game-sized character
const WEAPON_SCALE = 0.1;     // 2048px source frames -> ~a game-sized character
// Weapon frames are canvas-centered (see public/assets/README), same as the body's own
// canvas-center sits near the top of the head -- drop the weapon to roughly chest/hand
// height. Estimated from body proportions; nudge if it still reads too high/low.
const WEAPON_Y_OFFSET = 100;

// Default starter gun stats (GDD weapon spec table: 2 shots/sec). Traveling projectile
// for now, not hitscan -- easier to see it working; can swap later per weapon.
const FIRE_INTERVAL_MS = 500;
const MUZZLE_OFFSET = 45; // px forward from the weapon pivot, along aim -- approximate, nudge to taste
const BULLET_SPEED = 600;
const BULLET_LIFESPAN_MS = 1200;

// No tuned values in the GDD yet (meta-progression stats exist, base stats don't) --
// placeholders, same as the fire/bullet constants above. Nudge once balance matters.
const MAX_HP = 100;
const INVULN_MS = 500; // grace window after a hit so touching an enemy doesn't melt HP per-frame
const HIT_FLASH_MS = 120;

/**
 * Layered player rig: body + weapon are two pixel-aligned sprites in one
 * Container, playing idle/walk in sync. Movement is Arcade-physics velocity;
 * animation state is derived from that velocity. Kept self-contained so
 * weapons/enemies can extend it later (GDD §13).
 */
export class Player extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private weaponSprite: Phaser.GameObjects.Sprite;
  private pbody!: Phaser.Physics.Arcade.Body;
  private anim: 'idle' | 'walk' = 'idle';
  private targetPos = new Phaser.Math.Vector2();
  private aimAngle = 0;
  private hp = MAX_HP;
  private invulnerableUntil = 0;

  private dead = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private onFire?: (bullet: Bullet) => void,
    private onDeath?: () => void,
  ) {
    super(scene, x, y);

    this.bodySprite = scene.add.sprite(0, 0, 'body_idle_0').setScale(SCALE);
    // weapon frames are pre-shifted (see public/assets/README) so the grip sits at each
    // frame's canvas center -- default origin (0.5, 0.5) is correct. Position dropped to
    // roughly hand height (see WEAPON_Y_OFFSET); the grip stays the rotation pivot either way.
    this.weaponSprite = scene.add
      .sprite(0, WEAPON_Y_OFFSET, 'weapon_idle_0')
      .setScale(WEAPON_SCALE);
    this.add([this.bodySprite, this.weaponSprite]);
    this.setSize(110, 150); // physics body footprint

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.pbody = this.body as Phaser.Physics.Arcade.Body;
    this.pbody.setCollideWorldBounds(true);

    this.bodySprite.play('body_idle');
    this.weaponSprite.play('weapon_idle');

    this.scene.events.on('update', this.update, this);
    scene.time.addEvent({ delay: FIRE_INTERVAL_MS, loop: true, callback: () => this.fire() });
  }

  private fire() {
    if (this.dead) return;
    // Spawn from the actual muzzle, not the player's center: weapon pivot (player pos +
    // weapon's local offset) pushed forward along the weapon's current rendered rotation
    // (not the raw aimAngle -- that lags behind via the lerp smoothing in update()).
    const pivotX = this.x + this.weaponSprite.x;
    const pivotY = this.y + this.weaponSprite.y;
    const rot = this.weaponSprite.rotation;
    const muzzleX = pivotX + Math.cos(rot) * MUZZLE_OFFSET;
    const muzzleY = pivotY + Math.sin(rot) * MUZZLE_OFFSET;
    const bullet = new Bullet(this.scene, muzzleX, muzzleY, rot, BULLET_SPEED, BULLET_LIFESPAN_MS);
    this.onFire?.(bullet);
  }

  getHp() {
    return this.hp;
  }

  /** Contact damage from an enemy. Ignored while within the post-hit invuln window,
   * so standing inside an enemy doesn't drain HP every physics step. */
  takeDamage(amount: number) {
    if (this.dead) return;
    const now = this.scene.time.now;
    if (now < this.invulnerableUntil) return;
    this.invulnerableUntil = now + INVULN_MS;
    this.hp = Math.max(0, this.hp - amount);

    // setTint (multiply blend, needs WebGL -- see main.ts) keeps the sprite's own shading
    // visible under the red, unlike setTintFill's flat solid-color silhouette.
    this.bodySprite.setTint(0xff3b3b);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.bodySprite.clearTint());

    // No HUD yet (step 7) -- console is the only feedback for now besides the flash.
    console.log(`player hp: ${this.hp}`);

    if (this.hp === 0) {
      this.dead = true;
      this.pbody.setVelocity(0, 0);
      this.weaponSprite.setVisible(false); // no death frames for the weapon layer
      this.bodySprite.clearTint();
      this.bodySprite.play('body_death');
      this.onDeath?.();
    }
  }

  update(_time: number, _delta: number) {
    if (this.dead) return;
    this.scene.cameras.main.getWorldPoint(this.scene.input.activePointer!.x, this.scene.input.activePointer!.y, this.targetPos);
    this.bodySprite.flipX = this.targetPos.x < this.x;

    // Calculate weapon pivot world position
    const pivotX = this.x + this.weaponSprite.x;
    const pivotY = this.y + this.weaponSprite.y;

    // Calculate angle from pivot to pointer
    const dx = this.targetPos.x - pivotX;
    const dy = this.targetPos.y - pivotY;
    const angle = Math.atan2(dy, dx);
    this.aimAngle = angle;

    // Smooth 360° rotation — interpolate across ±π boundary to prevent snapping
    this.weaponSprite.rotation = this.lerpAngle(this.weaponSprite.rotation, angle, 0.15);
    // mirror the weapon vertically when aiming left so it never renders upside-down
    this.weaponSprite.setFlipY(Math.abs(angle) > Math.PI / 2);
  }

  private lerpAngle(current: number, target: number, t: number): number {
    let diff = target - current;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return current + diff * t;
  }

  private setAnim(anim: 'idle' | 'walk') {
    if (this.anim === anim) return;
    this.anim = anim;
    this.bodySprite.play(`body_${anim}`);
    // this.weaponSprite.play(`weapon_${anim}`);
  }

  /** input: {x,y} each in {-1,0,1} from WASD. */
  move(input: { x: number; y: number }) {
    if (this.dead) {
      this.pbody.setVelocity(0, 0);
      return;
    }
    const v = new Phaser.Math.Vector2(input.x, input.y);
    if (v.lengthSq() > 0) {
      v.normalize().scale(SPEED); // normalize -> no faster diagonals
      this.setAnim('walk');
      if (input.x !== 0) {
        const flip = input.x < 0;
        this.bodySprite.setFlipX(flip);
        // Weapon rotation is now handled by cursor tracking
      }
    } else {
      this.setAnim('idle');
    }
    this.pbody.setVelocity(v.x, v.y);
  }
}
