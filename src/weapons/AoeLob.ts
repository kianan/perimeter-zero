import Phaser from 'phaser';
import { playSfx } from '../content/sfx';

// Pure animation shape, not a balance stat -- unlike radius/damage/etc, doesn't need to be
// data-driven (see augment_weapon_scale.csv). Blast sprite grows from 0.85x up to its full
// radius-derived size while fading out. REVISION (TICKET-024): sized off the AoE damage
// `radius`, not `visualRadius` -- visualRadius is the in-flight object's own compact
// footprint (TICKET-023's job) and is deliberately smaller than radius by design (see
// augment_weapon_scale.csv). Sizing the blast off visualRadius made it render smaller than
// the real hit area, so an enemy damaged near the edge of `radius` would visually read as
// unhit. Sizing off `radius` instead means the blast always visually covers the actual AoE
// hit area, matching the "shouldn't visually overshoot (or undershoot) the real hit area"
// goal.
const EXPLOSION_START_SCALE = 0.85;

export interface AoeLobConfig {
  targetX: number;
  targetY: number;
  /** AoE damage radius -- the actual hit-area size used for damage application
   * (onExplode below), independent of how big the explosion visual renders. Also drives the
   * explosion sprite's own display size (TICKET-024 revision) -- see explode() below. */
  radius: number;
  travelSpeed: number;
  delayMs: number; // sits after arriving (or after being placed, if !travels), before exploding
  /** Type-A shape column (augment_weapon_scale.csv's `travels`). True = tweens to
   * targetX/targetY like a lobbed identity. False = stays exactly where thrown, on a timed
   * fuse -- a placed identity's shape ("set it, forget it, get reminded when it goes off",
   * GDD_lore.md §4). Previously always true in practice: this field didn't exist and the
   * constructor tweened unconditionally, so augment_weapon_scale.csv's own `travels` column
   * was silently ignored even though it was already being parsed (content/augments.ts's
   * AugmentTier.travels). */
  travels: boolean;
  /** Texture key for the thrown/placed object sprite -- `augment_${identity.id}_object`,
   * loaded by content/augments.ts's loadAugmentAssets() (TICKET-021). Which PNG that
   * resolves to is entirely data-driven off augment_weapon.csv's `asset` column -- this
   * class has no per-identity branching. */
  textureKey: string;
  /** Real-world "radius" the in-flight object should visually read as -- diameter (2x this)
   * is used as the object sprite's on-screen size via setDisplaySize(), so a bigger
   * visual_radius CSV value renders a physically bigger object regardless of the source
   * PNG's native pixel size (TICKET-023: previously this doubled as the Arc primitive's
   * actual radius; now it drives scale on a real sprite instead). This is the object's own
   * compact footprint, not the (much larger) AoE damage radius -- the explosion sprite is
   * sized off `radius` instead, not this field (TICKET-024 revision, see explode() below). */
  visualRadius: number;
  color: number;
  explosionColor: number;
  explosionVisualMs: number;
  /** Texture key for the first frame of this augment's explosion VFX --
   * `augment_${identity.id}_explosion_0` (content/augments.ts's loadAugmentAssets(),
   * TICKET-021) -- set as the explosion sprite's initial texture before .play() below takes
   * over. Per-identity, entirely data-driven off augment_weapon.csv's `explosion_asset`
   * column -- no branching on which augment this is (TICKET-024). */
  explosionTextureKey: string;
  /** Animation key for this augment's full explosion VFX -- `augment_${identity.id}_explosion`,
   * registered by content/augments.ts's createAugmentExplosionAnims() (TICKET-022) with a
   * frame rate derived from explosionVisualMs. Playing this is what actually shows the
   * augment's real per-identity frames (e.g. a 7-frame vs. a 10-frame animation) -- the
   * scale-up/fade-out tween below is a separate, timing-independent wrapper around it
   * (TICKET-024). */
  explosionAnimKey: string;
  /** sfx.csv event id (augment_weapon.csv's `deploy_sfx` column, via
   * content/augments.ts's AugmentIdentity.deploySfx) to play the moment this object is
   * thrown/placed -- data-driven per identity so this shared engine never hardcodes an
   * identity-specific sfx key name (TICKET-023 revision: previously branched on `travels`
   * to pick between two literal event ids here). */
  deploySfx: string;
  /** Fired at the moment of detonation. AoeLob only owns its own visual lifecycle -- it
   * doesn't know about Enemy, same split as Bullet not knowing about Enemy either. The
   * caller (GameScene, which owns the enemies list) applies damage here. */
  onExplode: (x: number, y: number, radius: number) => void;
}

/** Type-A Augment mechanic ("aoe_lob" in augment_weapon.csv's `type` column -- see
 * brief-augment.md): either travels to a target point or is placed immediately (see
 * `config.travels`), sits with a fuse delay, then explodes, dealing damage in a radius.
 * Shared engine for every AoeLob-type Augment (a lobbed identity, a placed identity, and
 * eventually artillery strike/orbital strike/homing missile) -- has no per-identity
 * branching anywhere in this file. Renders as the augment's real object sprite in flight
 * (TICKET-023: texture `config.textureKey`, tinted `config.color`, scaled off
 * `config.visualRadius`) and, on detonation, as that same identity's real explosion
 * animation (TICKET-024: texture `config.explosionTextureKey`, tinted
 * `config.explosionColor`, playing `config.explosionAnimKey`, scaled off `config.radius`) --
 * augment_weapon.csv's `asset`/`color`/`visual_radius`/`explosion_asset`/`explosion_color`/
 * `deploy_sfx` columns are the only thing that changes what any given augment looks and
 * sounds like. Stats come from augment_weapon.csv/augment_weapon_scale.csv via
 * content/augments.ts -- this class has no hardcoded numbers of its own. */
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

    playSfx(scene, config.deploySfx);

    if (!config.travels) {
      scene.time.delayedCall(config.delayMs, () => this.explode());
      return;
    }

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
    const {
      radius,
      onExplode,
      explosionColor,
      explosionVisualMs,
      explosionTextureKey,
      explosionAnimKey,
    } = this.config;

    // Damage application uses the real AoE `radius`, independent of however big the
    // explosion visual itself renders below.
    onExplode(x, y, radius);
    playSfx(scene, 'explode');

    // Real per-identity explosion art (TICKET-024) -- textured with this identity's first
    // explosion frame, tinted config.explosionColor, then handed off to .play() to run the
    // full animation (a 7-frame Grenade blast looks nothing like a 10-frame Land Mine blast,
    // not just the same shape tinted two ways). Sized off the AoE damage `radius` -- REVISION:
    // previously sized off `visualRadius` (the same scale as the in-flight object sprite),
    // but visualRadius is deliberately smaller than radius (the object's own compact
    // footprint vs. the actual, much larger AoE hit area used by onExplode above), so an
    // enemy damaged near the edge of `radius` didn't visually overlap the old, too-small
    // blast sprite. Sizing off `radius` instead makes the blast visual match the real hit
    // area exactly, so it neither overshoots nor undershoots it.
    const blast = scene.add.sprite(x, y, explosionTextureKey).setTint(explosionColor);
    blast.setDisplaySize(radius * 2, radius * 2);
    const fullScaleX = blast.scaleX;
    const fullScaleY = blast.scaleY;
    blast.setScale(fullScaleX * EXPLOSION_START_SCALE, fullScaleY * EXPLOSION_START_SCALE);
    blast.play(explosionAnimKey);

    // Scale-up/fade-out tween wrapper, unchanged in shape/duration from the placeholder
    // circle it replaces -- explosionVisualMs governs this tween's timing, entirely
    // independent of the animation's own frame timing (which comes from
    // createAugmentExplosionAnims()'s frameRate, see content/augments.ts).
    scene.tweens.add({
      targets: blast,
      scaleX: fullScaleX,
      scaleY: fullScaleY,
      alpha: 0,
      duration: explosionVisualMs,
      onComplete: () => blast.destroy(),
    });

    this.destroy();
  }
}
