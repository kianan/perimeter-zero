import Phaser from 'phaser';
import { parseCsv } from './csv';

const AUGMENT_WEAPON_CSV_KEY = 'data_augment_weapon';
const AUGMENT_WEAPON_SCALE_CSV_KEY = 'data_augment_weapon_scale';

/** Call from a scene's preload(). */
export function preloadAugmentData(scene: Phaser.Scene) {
  scene.load.text(AUGMENT_WEAPON_CSV_KEY, 'data/augment_weapon.csv');
  scene.load.text(AUGMENT_WEAPON_SCALE_CSV_KEY, 'data/augment_weapon_scale.csv');
}

export interface ResolvedAugment {
  id: string;
  name: string;
  desc: string;
  type: string;
  visualRadius: number;
  color: number;
  explosionColor: number;
  explosionVisualMs: number;
  damage: number;
  radius: number;
  cooldownMs: number;
  delayMs: number;
  /** Type-A ("aoe_lob") shape columns -- shared shape for grenade/landmine/artillery
   * strike/orbital strike/homing missile (see brief-augment.md). Only Grenade's behavior
   * actually branches on these yet (always 1 explosion, always travels, never homes) --
   * parsed now so future siblings don't need a schema change, not yet read by Grenade.ts's
   * logic beyond what it already assumes. */
  explosionCount: number;
  travels: boolean;
  homing: boolean;
  travelSpeed: number;
  targetMinDist: number;
  targetMaxDist: number;
}

/** Joins augment_weapon.csv (identity) + augment_weapon_scale.csv (per-level stats) by
 * id/level. Call after preloadAugmentData()'s load has completed (e.g. from create()). */
export function getAugment(scene: Phaser.Scene, augmentId: string, level: number): ResolvedAugment {
  const identities = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_CSV_KEY));
  const scales = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_SCALE_CSV_KEY));

  const identity = identities.find((row) => row.id === augmentId);
  const scale = scales.find((row) => row.augment_id === augmentId && Number(row.level) === level);

  if (!identity || !scale) {
    throw new Error(`No augment data for "${augmentId}" level ${level}`);
  }

  return {
    id: identity.id,
    name: identity.name,
    desc: identity.desc,
    type: identity.type,
    visualRadius: Number(identity.visual_radius),
    color: Number(identity.color),
    explosionColor: Number(identity.explosion_color),
    explosionVisualMs: Number(identity.explosion_visual_ms),
    damage: Number(scale.damage),
    radius: Number(scale.radius),
    cooldownMs: Number(scale.cooldown_ms),
    delayMs: Number(scale.delay_ms),
    explosionCount: Number(scale.explosion_count),
    travels: scale.travels === '1',
    homing: scale.homing === '1',
    travelSpeed: Number(scale.travel_speed),
    targetMinDist: Number(scale.target_min_dist),
    targetMaxDist: Number(scale.target_max_dist),
  };
}
