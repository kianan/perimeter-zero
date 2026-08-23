import Phaser from 'phaser';
import { parseCsv } from './csv';

const ENEMY_CSV_KEY = 'data_enemy';
const ENEMY_SCALE_CSV_KEY = 'data_enemy_scale';

/** Call from a scene's preload(). */
export function preloadEnemyData(scene: Phaser.Scene) {
  scene.load.text(ENEMY_CSV_KEY, 'data/enemy.csv');
  scene.load.text(ENEMY_SCALE_CSV_KEY, 'data/enemy_scale.csv');
}

export interface ResolvedEnemy {
  id: string;
  name: string;
  desc: string;
  type: string;
  asset: string;
  weapon: string;
  scale: number;
  damage: number;
  health: number;
  speed: number;
  // From enemy.csv -- shooter/charger-only columns, still unused by Enemy/GameScene (see
  // TICKET-015). Existing rusher/swarm/tank rows default to 0/blank so every archetype's
  // ResolvedEnemy shares this same shape rather than these fields being optional.
  preferredRange: number;
  dashBurstMult: number;
  dashBurstMs: number;
  dashCooldownMs: number;
}

/** Joins enemy.csv (identity) + enemy_scale.csv (per-level stats) by id/level. Call after
 * preloadEnemyData()'s load has completed (e.g. from create()), not from preload() itself. */
export function getEnemy(scene: Phaser.Scene, enemyId: string, level: number): ResolvedEnemy {
  const identities = parseCsv(scene.cache.text.get(ENEMY_CSV_KEY));
  const scales = parseCsv(scene.cache.text.get(ENEMY_SCALE_CSV_KEY));

  const identity = identities.find((row) => row.id === enemyId);
  const scale = scales.find((row) => row.enemy_id === enemyId && Number(row.level) === level);

  if (!identity || !scale) {
    throw new Error(`No enemy data for "${enemyId}" level ${level}`);
  }

  return {
    id: identity.id,
    name: identity.name,
    desc: identity.desc,
    type: identity.type,
    asset: identity.asset,
    weapon: identity.weapon,
    scale: Number(identity.scale),
    damage: Number(scale.damage),
    health: Number(scale.health),
    speed: Number(scale.speed),
    preferredRange: Number(identity.preferred_range),
    dashBurstMult: Number(identity.dash_burst_mult),
    dashBurstMs: Number(identity.dash_burst_ms),
    dashCooldownMs: Number(identity.dash_cooldown_ms),
  };
}
