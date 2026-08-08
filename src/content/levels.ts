import Phaser from 'phaser';
import { parseCsv } from './csv';

const LEVEL_CSV_KEY = 'data_level';
const LEVEL_ENEMIES_CSV_KEY = 'data_level_enemies';

/** Call from a scene's preload(). */
export function preloadLevelData(scene: Phaser.Scene) {
  scene.load.text(LEVEL_CSV_KEY, 'data/level.csv');
  scene.load.text(LEVEL_ENEMIES_CSV_KEY, 'data/level_enemies.csv');
}

export interface ResolvedLevel {
  id: string;
  stageName: string;
  duration: number;
  specialSpawn: string;
  worldSize: number;
  spawnOffset: number;
}

export interface LevelEnemySpawn {
  enemyId: string;
  spawnRate: number;
  enemyLevel: number;
}

/** Call after preloadLevelData()'s load has completed (e.g. from create()). */
export function getLevel(scene: Phaser.Scene, levelId: string): ResolvedLevel {
  const rows = parseCsv(scene.cache.text.get(LEVEL_CSV_KEY));
  const row = rows.find((r) => r.id === levelId);

  if (!row) {
    throw new Error(`No level data for "${levelId}"`);
  }

  return {
    id: row.id,
    stageName: row.stage_name,
    duration: Number(row.duration),
    specialSpawn: row.special_spawn,
    worldSize: Number(row.world_size),
    spawnOffset: Number(row.spawn_offset),
  };
}

/** Every enemy_id/spawn_rate/enemy_level row for this level -- level_enemies.csv is a
 * many-to-many join, so a level can list multiple enemy types at different rates and
 * (independently) different enemy_scale.csv tiers. */
export function getLevelEnemies(scene: Phaser.Scene, levelId: string): LevelEnemySpawn[] {
  const rows = parseCsv(scene.cache.text.get(LEVEL_ENEMIES_CSV_KEY));
  return rows
    .filter((r) => r.level_id === levelId)
    .map((r) => ({
      enemyId: r.enemy_id,
      spawnRate: Number(r.spawn_rate),
      enemyLevel: Number(r.enemy_level),
    }));
}
