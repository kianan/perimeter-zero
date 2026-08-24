import Phaser from 'phaser';
import { parseCsv } from './csv';

const AUGMENT_WEAPON_CSV_KEY = 'data_augment_weapon';
const AUGMENT_WEAPON_SCALE_CSV_KEY = 'data_augment_weapon_scale';

/** Call from a scene's preload(). */
export function preloadAugmentData(scene: Phaser.Scene) {
  scene.load.text(AUGMENT_WEAPON_CSV_KEY, 'data/augment_weapon.csv');
  scene.load.text(AUGMENT_WEAPON_SCALE_CSV_KEY, 'data/augment_weapon_scale.csv');
}

/** Phase 2 of loading augment art (TICKET-021): the object sprite + explosion frames can't
 * be queued from preload() itself, since which images to load depends on augment_weapon.csv's
 * *parsed* rows (id/asset/explosionAsset/explosionFrameCount), and that CSV's text isn't
 * parseable until its own load (queued by preloadAugmentData() above) has completed -- i.e.
 * not until create(). Same two-phase split every other content/*.ts loader already follows
 * (preloadXData() in preload(), getX()/getAllX() reading the parsed result in create()), just
 * with an extra scene.load.start() here since these image loads are queued *after*
 * preload()'s own automatic load phase has already run to completion, so nothing would kick
 * them off otherwise. Call once from a scene's create(), after preloadAugmentData()'s CSV
 * load has completed. Loop body is identical for every augment identity -- no per-id/per-name
 * special-casing, so a new augment_weapon.csv row needs no changes here.
 *
 * TICKET-022: also registers each identity's `augment_${id}_explosion` animation once this
 * load batch's frames have actually finished loading (scene.load's own 'complete' event) --
 * anims.create() resolves each frame against the texture manager at creation time, so
 * registering before the explosion PNGs exist would bind the animation to whatever
 * placeholder/missing texture is there yet. Listener is attached before scene.load.start()
 * is called, so it can't miss the completion of the very batch queued above. */
export function loadAugmentAssets(scene: Phaser.Scene): void {
  const identities = getAllAugmentIdentities(scene);
  for (const identity of identities) {
    scene.load.image(`augment_${identity.id}_object`, `assets/${identity.asset}.png`);
    for (let i = 0; i < identity.explosionFrameCount; i++) {
      scene.load.image(
        `augment_${identity.id}_explosion_${i}`,
        `assets/${identity.explosionAsset}/explosion_${i}.png`,
      );
    }
  }
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => createAugmentExplosionAnims(scene, identities));
  scene.load.start();
}

/** Registers one `augment_${id}_explosion` animation per augment identity, built entirely
 * from parsed augment_weapon.csv data -- frame count from explosionFrameCount, frame keys
 * from the `augment_${id}_explosion_${i}` textures loadAugmentAssets() above just queued,
 * and playback speed derived from explosionVisualMs (so the anim's duration matches the
 * augment's own configured VFX duration) rather than a hardcoded constant. No branching on
 * id/name -- a new augment_weapon.csv row needs no changes here, same as the rest of this
 * file. Guards against re-registering an already-known key, same reasoning as
 * characterAssets.ts's createCharacterAnims() (anims are global across scenes/restarts, not
 * scene-scoped). */
export function createAugmentExplosionAnims(scene: Phaser.Scene, identities: AugmentIdentity[]): void {
  for (const identity of identities) {
    const key = `augment_${identity.id}_explosion`;
    if (scene.anims.exists(key)) continue;

    scene.anims.create({
      key,
      frames: Array.from({ length: identity.explosionFrameCount }, (_, i) => ({
        key: `augment_${identity.id}_explosion_${i}`,
      })),
      frameRate: identity.explosionFrameCount / (identity.explosionVisualMs / 1000),
      repeat: 0,
    });
  }
}

/** From augment_weapon.csv -- static per augment, doesn't vary by tier. */
export interface AugmentIdentity {
  id: string;
  name: string;
  desc: string;
  type: string;
  visualRadius: number;
  color: number;
  explosionColor: number;
  explosionVisualMs: number;
  /** Extension-less asset path, relative to assets/ (e.g. a weapon augment's object sprite
   * folder/file stem) -- loaded by loadAugmentAssets() above as texture key
   * `augment_${id}_object` (TICKET-021). Rendering against that texture key isn't wired up
   * yet, just the load. */
  asset: string;
  /** Folder path for the explosion VFX (e.g. "vfx/explosion/explosion_1") -- loadAugmentAssets()
   * loads `explosionFrameCount` frames from this folder as `augment_${id}_explosion_${i}`. */
  explosionAsset: string;
  explosionFrameCount: number;
}

/** From augment_weapon_scale.csv -- one node in an augment's tech tree. `parentTierId` is
 * null for the root tier (what you get on first pick); everything else's parent must be
 * picked first (see GameScene.buildAugmentChoicePool()). */
export interface AugmentTier {
  tierId: string;
  augmentId: string;
  parentTierId: string | null;
  name: string;
  desc: string;
  damage: number;
  radius: number;
  cooldownMs: number;
  delayMs: number;
  /** Type-A ("aoe_lob") shape columns -- shared shape across every augment identity of that
   * type (see brief-augment.md for the full roster). Repurposed for AoeLob-type augments to
   * mean "how many are thrown per activation" (each independently targeted), not "how many
   * explosions from one throw" -- that original meaning is still open for a future
   * non-AoeLob sibling that actually needs it. */
  explosionCount: number;
  travels: boolean;
  homing: boolean;
  travelSpeed: number;
  targetMinDist: number;
  targetMaxDist: number;
}

function toIdentity(row: Record<string, string>): AugmentIdentity {
  return {
    id: row.id,
    name: row.name,
    desc: row.desc,
    type: row.type,
    visualRadius: Number(row.visual_radius),
    color: Number(row.color),
    explosionColor: Number(row.explosion_color),
    explosionVisualMs: Number(row.explosion_visual_ms),
    asset: row.asset,
    explosionAsset: row.explosion_asset,
    explosionFrameCount: Number(row.explosion_frame_count),
  };
}

function toTier(row: Record<string, string>): AugmentTier {
  return {
    tierId: row.tier_id,
    augmentId: row.augment_id,
    parentTierId: row.parent_tier_id || null,
    name: row.name,
    desc: row.desc,
    damage: Number(row.damage),
    radius: Number(row.radius),
    cooldownMs: Number(row.cooldown_ms),
    delayMs: Number(row.delay_ms),
    explosionCount: Number(row.explosion_count),
    travels: row.travels === '1',
    homing: row.homing === '1',
    travelSpeed: Number(row.travel_speed),
    targetMinDist: Number(row.target_min_dist),
    targetMaxDist: Number(row.target_max_dist),
  };
}

/** Every augment's identity, in augment_weapon.csv's row order -- the full roster to build
 * the choice pool from (see GameScene.buildAugmentChoicePool()). */
export function getAllAugmentIdentities(scene: Phaser.Scene): AugmentIdentity[] {
  return parseCsv(scene.cache.text.get(AUGMENT_WEAPON_CSV_KEY)).map(toIdentity);
}

export function getAugmentTier(scene: Phaser.Scene, augmentId: string, tierId: string): AugmentTier {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_SCALE_CSV_KEY));
  const row = rows.find((r) => r.augment_id === augmentId && r.tier_id === tierId);
  if (!row) {
    throw new Error(`No augment tier "${tierId}" for augment "${augmentId}"`);
  }
  return toTier(row);
}

/** The tier you get on first picking this augment (parent_tier_id blank). */
export function getRootTier(scene: Phaser.Scene, augmentId: string): AugmentTier {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_SCALE_CSV_KEY));
  const row = rows.find((r) => r.augment_id === augmentId && !r.parent_tier_id);
  if (!row) {
    throw new Error(`No root tier for augment "${augmentId}"`);
  }
  return toTier(row);
}

/** Every tier directly unlocked by picking `parentTierId` -- empty if that tier is a leaf
 * (maxed out, nothing further to offer for this augment). */
export function getChildTiers(scene: Phaser.Scene, augmentId: string, parentTierId: string): AugmentTier[] {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_SCALE_CSV_KEY));
  return rows
    .filter((r) => r.augment_id === augmentId && r.parent_tier_id === parentTierId)
    .map(toTier);
}
