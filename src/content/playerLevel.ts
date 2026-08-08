import Phaser from 'phaser';
import { parseCsv } from './csv';

const PLAYER_LEVEL_CSV_KEY = 'data_player_level';

/** Call from a scene's preload(). */
export function preloadPlayerLevelData(scene: Phaser.Scene) {
  scene.load.text(PLAYER_LEVEL_CSV_KEY, 'data/player_level.csv');
}

export interface ResolvedPlayerLevel {
  level: number;
  exp: number;
  health: number;
  speed: number;
}

/** Call after preloadPlayerLevelData()'s load has completed (e.g. from create()). */
export function getPlayerLevel(scene: Phaser.Scene, level: number): ResolvedPlayerLevel {
  const rows = parseCsv(scene.cache.text.get(PLAYER_LEVEL_CSV_KEY));
  const row = rows.find((r) => Number(r.level) === level);

  if (!row) {
    throw new Error(`No player_level data for level ${level}`);
  }

  return {
    level: Number(row.level),
    exp: Number(row.exp),
    health: Number(row.health),
    speed: Number(row.speed),
  };
}
