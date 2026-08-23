import Phaser from 'phaser';
import { Bullet } from '../weapons/Bullet';
import { playSfx } from '../content/sfx';

const SCALE = 0.16;     // 2048px source frames -> ~a game-sized character -- player's own body,
                         // not weapon-specific, so stays fixed here rather than in weapon.csv

const INVULN_MS = 500; // grace window after a hit so touching an enemy doesn't melt HP per-frame
const HIT_FLASH_MS = 120;

export interface PlayerConfig {
  // From player_level.csv (see content/playerLevel.ts).
  maxHp: number;
  speed: number;
  // From weapon.csv/weapon_scale.csv, resolved via the equipped weapon in player_state.json
  // (see content/weapons.ts).
  fireRate: number; // shots/sec
  bulletSpeed: number;
  bulletLifespanMs: number;
  weaponScale: number;
  weaponYOffset: number;
  muzzleOffset: number;
  bulletScale: number;
  bulletRadius: number;
  /** Damage dealt by bullets this weapon fires -- stamped onto each Bullet at construction
   * (see Bullet.damage) so GameScene's overlap can read it off the bullet instead of a
   * scene-level field. */
  damage: number;
  onFire?: (bullet: Bullet) => void;
  onDeath?: () => void;
}

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

  private maxHp: number;
  private speed: number;
  private bulletSpeed: number;
  private bulletLifespanMs: number;
  private muzzleOffset: number;
  private bulletScale: number;
  private bulletRadius: number;
  private bulletDamage: number;
  private onFire?: (bullet: Bullet) => void;
  private onDeath?: () => void;

  private hp: number;
  private invulnerableUntil = 0;

  private dead = false;
  // Set on a win (round ends without the player dying) -- unlike `dead`, no death anim/callback.
  private frozen = false;
  // Set/cleared via pause()/resume() -- distinct from `frozen` (which is permanent, win-only).
  // Only gates fire() for now (see TICKET-005); move() is intentionally untouched.
  private paused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: PlayerConfig) {
    super(scene, x, y);
    this.maxHp = config.maxHp;
    this.speed = config.speed;
    this.bulletSpeed = config.bulletSpeed;
    this.bulletLifespanMs = config.bulletLifespanMs;
    this.muzzleOffset = config.muzzleOffset;
    this.bulletScale = config.bulletScale;
    this.bulletRadius = config.bulletRadius;
    this.bulletDamage = config.damage;
    this.onFire = config.onFire;
    this.onDeath = config.onDeath;
    this.hp = this.maxHp;

    this.bodySprite = scene.add.sprite(0, 0, 'body_idle_0').setScale(SCALE);
    // weapon frames are pre-shifted (see public/assets/README) so the grip sits at each
    // frame's canvas center -- default origin (0.5, 0.5) is correct. Position dropped to
    // roughly hand height (weaponYOffset, from weapon.csv); the grip stays the rotation
    // pivot either way.
    this.weaponSprite = scene.add
      .sprite(0, config.weaponYOffset, 'weapon_idle_0')
      .setScale(config.weaponScale);
    this.add([this.bodySprite, this.weaponSprite]);
    this.setSize(110, 150); // physics body footprint

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.pbody = this.body as Phaser.Physics.Arcade.Body;
    this.pbody.setCollideWorldBounds(true);

    this.bodySprite.play('body_idle');
    this.weaponSprite.play('weapon_idle');

    // Container isn't part of the display list's own update cycle, hence hooking the
    // scene's update event directly instead -- but that means it's a manually-registered
    // listener, not something Phaser cleans up automatically alongside this GameObject's
    // own destroy. Without the matching .off() below, a torn-down scene (any scene.restart(),
    // not just death/win) leaves this listener attached; it keeps firing update() against a
    // GameObject whose own `this.scene` is already gone, throwing on the first `this.scene.
    // cameras` read. Captures `scene` (the constructor param) rather than `this.scene` for
    // the .off() call, since `this.scene` itself may already be cleared by the time DESTROY
    // fires.
    scene.events.on('update', this.update, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off('update', this.update, this);
    });
    const fireIntervalMs = 1000 / config.fireRate;
    scene.time.addEvent({ delay: fireIntervalMs, loop: true, callback: () => this.fire() });
  }

  /** Stops shooting/moving/aiming without playing the death anim -- for a win, not a loss. */
  freeze() {
    this.frozen = true;
    this.pbody.setVelocity(0, 0);
  }

  /** Gates fire() only (see fire()'s guard). Distinct from `frozen`, which is permanent and
   * win-only -- this is meant to be toggled on/off (see resume()). */
  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  private fire() {
    if (this.dead || this.frozen || this.paused) return;
    // Spawn from the actual muzzle, not the player's center: weapon pivot (player pos +
    // weapon's local offset) pushed forward along the weapon's current rendered rotation
    // (not the raw aimAngle -- that lags behind via the lerp smoothing in update()).
    const pivotX = this.x + this.weaponSprite.x;
    const pivotY = this.y + this.weaponSprite.y;
    const rot = this.weaponSprite.rotation;
    const muzzleX = pivotX + Math.cos(rot) * this.muzzleOffset;
    const muzzleY = pivotY + Math.sin(rot) * this.muzzleOffset;
    const bullet = new Bullet(this.scene, muzzleX, muzzleY, {
      angle: rot,
      speed: this.bulletSpeed,
      lifespanMs: this.bulletLifespanMs,
      scale: this.bulletScale,
      radius: this.bulletRadius,
      damage: this.bulletDamage,
    });
    this.onFire?.(bullet);
    playSfx(this.scene, 'bullet_fire');
  }

  getHp() {
    return this.hp;
  }

  getMaxHp() {
    return this.maxHp;
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
      playSfx(this.scene, 'player_death');
      this.onDeath?.();
    } else {
      playSfx(this.scene, 'player_hit');
    }
  }

  update(_time: number, _delta: number) {
    if (this.dead || this.frozen) return;
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
    if (this.dead || this.frozen) {
      this.pbody.setVelocity(0, 0);
      return;
    }
    const v = new Phaser.Math.Vector2(input.x, input.y);
    if (v.lengthSq() > 0) {
      v.normalize().scale(this.speed); // normalize -> no faster diagonals
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
