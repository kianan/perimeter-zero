import Phaser from 'phaser';
import { parseCsv } from './csv';

const AUGMENT_LEVEL_CSV_KEY = 'data_augment_level';

/** Call from a scene's preload(). */
export function preloadAugmentLevelData(scene: Phaser.Scene) {
  scene.load.text(AUGMENT_LEVEL_CSV_KEY, 'data/augment_level.csv');
}

/** Cumulative exp needed to reach `level`, or null if there's no row for it -- the curve
 * currently tops out at level 4 (see augment_level.csv), so this is a real "maxed out" case,
 * not an error. Call after preloadAugmentLevelData()'s load has completed (e.g. from create()). */
export function getAugmentLevelThreshold(scene: Phaser.Scene, level: number): number | null {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_LEVEL_CSV_KEY));
  const row = rows.find((r) => Number(r.level) === level);
  return row ? Number(row.exp_required) : null;
}
