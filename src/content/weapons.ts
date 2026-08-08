import Phaser from 'phaser';
import { parseCsv } from './csv';

const WEAPON_CSV_KEY = 'data_weapon';
const WEAPON_SCALE_CSV_KEY = 'data_weapon_scale';

/** Call from a scene's preload(). */
export function preloadWeaponData(scene: Phaser.Scene) {
  scene.load.text(WEAPON_CSV_KEY, 'data/weapon.csv');
  scene.load.text(WEAPON_SCALE_CSV_KEY, 'data/weapon_scale.csv');
}

export interface ResolvedWeapon {
  id: string;
  name: string;
  desc: string;
  damage: number;
  bulletSpeed: number;
  fireRate: number;
  cost: number;
}

/** Joins weapon.csv (identity) + weapon_scale.csv (per-level stats) by id/level. Call after
 * preloadWeaponData()'s load has completed (e.g. from create()), not from preload() itself. */
export function getWeapon(scene: Phaser.Scene, weaponId: string, level: number): ResolvedWeapon {
  const identities = parseCsv(scene.cache.text.get(WEAPON_CSV_KEY));
  const scales = parseCsv(scene.cache.text.get(WEAPON_SCALE_CSV_KEY));

  const identity = identities.find((row) => row.id === weaponId);
  const scale = scales.find((row) => row.weapon_id === weaponId && Number(row.level) === level);

  if (!identity || !scale) {
    throw new Error(`No weapon data for "${weaponId}" level ${level}`);
  }

  return {
    id: identity.id,
    name: identity.name,
    desc: identity.desc,
    damage: Number(scale.damage),
    bulletSpeed: Number(scale.bullet_speed),
    fireRate: Number(scale.fire_rate),
    cost: Number(scale.cost),
  };
}
