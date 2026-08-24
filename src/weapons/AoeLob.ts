import Phaser from 'phaser';
import { playSfx } from '../content/sfx';

// Pure animation shape, not a balance stat -- unlike radius/damage/etc, doesn't need to be
// data-driven (see augment_weapon_scale.csv). Blast grows from 0.85x up to exactly 1x (the
// true damage radius) while fading, so it never visually overshoots the actual hit area --
// previously scaled past 1x, which made enemies just outside the real radius look hit.
const EXPLOSION_START_SCALE = 0.85;

export interface AoeLobConfig {
  targetX: number;
  targetY: number;
  /** AoE damage radius -- also the explosion visual's size. */
  radius: number;
  travelSpeed: number;
  delayMs: number; // sits after arriving (or after being placed, if !travels), before exploding
  /** Type-A shape column (augment_weapon_scale.csv's `travels`). True = tweens to
   * targetX/targetY like Grenade. False = stays exactly where thrown, on a timed fuse --
   * Land Mine's shape ("set it, forget it, get reminded when it goes off", GDD_lore.md §4).
   * Previously always true in practice: this field didn't exist and the constructor tweened
   * unconditionally, so augment_weapon_scale.csv's own `travels` column was silently ignored
   * even though it was already being parsed (content/augments.ts's AugmentTier.travels). */
  travels: boolean;
  /** Texture key for the thrown/placed object sprite -- `augment_${identity.id}_object`,
   * loaded by content/augments.ts's loadAugmentAssets() (TICKET-021). Which PNG that
   * resolves to (grenade.png, landmine.png, ...) is entirely data-driven off
   * augment_weapon.csv's `asset` column -- this class has no per-identity branching. */
  textureKey: string;
  /** Real-world "radius" this object should visually read as -- diameter (2x this) is used
   * as the sprite's on-screen size via setDisplaySize(), so a bigger visual_radius CSV value
   * renders a physically bigger object regardless of the source PNG's native pixel size
   * (TICKET-023: previously this doubled as the Arc primitive's actual radius; now it drives
   * scale on a real sprite instead). */
  visualRadius: number;
  color: number;
  explosionColor: number;
  explosionVisualMs: number;
  /** Fired at the moment of detonation. AoeLob only owns its own visual lifecycle -- it
   * doesn't know about Enemy, same split as Bullet not knowing about Enemy either. The
   * caller (GameScene, which owns the enemies list) applies damage here. */
  onExplode: (x: number, y: number, radius: number) => void;
}

/** Type-A Augment mechanic ("aoe_lob" in augment_weapon.csv's `type` column -- see
 * brief-augment.md): either travels to a target point or is placed immediately (see
 * `config.travels`), sits with a fuse delay, then explodes, dealing damage in a radius.
 * Shared engine for every AoeLob-type Augment (Grenade, Land Mine, and eventually artillery
 * strike/orbital strike/homing missile) -- was called Grenade until a second AoeLob
 * augment made that name dishonest. Renders as the augment's real object sprite (TICKET-023:
 * texture `config.textureKey`, tinted `config.color`, scaled off `config.visualRadius`) --
 * no per-identity branching here, augment_weapon.csv's `asset`/`color`/`visual_radius`
 * columns are the only thing that changes what this looks like. Explosion VFX (below) is
 * still a placeholder Shape circle -- out of scope for this ticket, which only covers the
 * thrown/placed object itself. Stats come from augment_weapon.csv/augment_weapon_scale.csv
 * via content/augments.ts -- this class has no hardcoded numbers of its own. */
export class AoeLob extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, private config: AoeLobConfig) {
    super(scene, x, y, config.textureKey);
    scene.add.existing(this);

    this.setTint(config.color);
    // setDisplaySize adjusts scaleX/scaleY to hit an exact on-screen size regardless of the
    // source texture's native pixel dimensions -- diameter (2x visualRadius) matches what
    // the old Arc primitive's radius used to render as, so this keeps representing the same
    // gameplay-relevant scale, just via a real sprite now instead of a flat circle.
    this.setDisplaySize(config.visualRadius * 2, config.visualRadius * 2);

    if (!config.travels) {
      playSfx(scene, 'landmine_place');
      scene.time.delayedCall(config.delayMs, () => this.explode());
      return;
    }

    playSfx(scene, 'grenade_lob');
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
    playSfx(scene, 'explode');

    const blast = scene.add.circle(x, y, radius, explosionColor, 0.5).setScale(EXPLOSION_START_SCALE);
    scene.tweens.add({
      targets: blast,
      scale: 1,
      alpha: 0,
      duration: explosionVisualMs,
      onComplete: () => blast.destroy(),
    });

    this.destroy();
  }
}
