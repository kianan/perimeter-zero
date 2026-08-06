import Phaser from 'phaser';

const SPEED = 260;      // px/sec
const SCALE = 0.16;     // 2048px source frames -> ~a game-sized character

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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bodySprite = scene.add.sprite(0, 0, 'body_idle_0').setScale(SCALE);
    this.weaponSprite = scene.add.sprite(0, 0, 'weapon_idle_0').setScale(SCALE);
    // weapon shares the body's origin (frame centre) so the layers stay aligned
    // and the gun rotates about the character rather than flying off.
    this.add([this.bodySprite, this.weaponSprite]);
    this.setSize(110, 150); // physics body footprint

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.pbody = this.body as Phaser.Physics.Arcade.Body;
    this.pbody.setCollideWorldBounds(true);

    this.bodySprite.play('body_idle');
    this.weaponSprite.play('weapon_idle');

    this.scene.events.on('update', this.update, this);
  }

  update(_time: number, _delta: number) {
    this.scene.cameras.main.getWorldPoint(this.scene.input.activePointer!.x, this.scene.input.activePointer!.y, this.targetPos);
    this.bodySprite.flipX = this.targetPos.x < this.x;

    // Calculate weapon pivot world position
    const pivotX = this.x + this.weaponSprite.x;
    const pivotY = this.y + this.weaponSprite.y;

    // Calculate angle from pivot to pointer
    const dx = this.targetPos.x - pivotX;
    const dy = this.targetPos.y - pivotY;
    const angle = Math.atan2(dy, dx);

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
    this.weaponSprite.play(`weapon_${anim}`);
  }

  /** input: {x,y} each in {-1,0,1} from WASD. */
  move(input: { x: number; y: number }) {
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
