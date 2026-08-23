import Phaser from 'phaser';

const PLAYER_STATE_KEY = 'data_player_state';
// localStorage key for the persisted override -- namespaced so it doesn't collide with any
// other key this page might use.
const LEVEL_COMPLETED_STORAGE_KEY = 'playerState.levelCompleted';

export interface PlayerState {
  levelCompleted: number;
  mainWeapon: { id: string; level: number };
  playerLevel: number;
}

/** Call from a scene's preload(). Hardcoded stand-in for the real save state (localStorage,
 * see brief-database.md) -- reads a fixed JSON file instead of persisting/loading a save. */
export function preloadPlayerState(scene: Phaser.Scene) {
  scene.load.json(PLAYER_STATE_KEY, 'data/player_state.json');
}

/** Call after preloadPlayerState()'s load has completed (e.g. from create()). mainWeapon and
 * playerLevel are still read straight from the baked-in JSON, unchanged -- only
 * levelCompleted has a localStorage-backed read/write path so far (see
 * getLevelCompleted()/setLevelCompleted() below). Callers that want the persisted
 * levelCompleted (rather than whatever's baked into player_state.json) should call
 * getLevelCompleted() instead of reading .levelCompleted off this return value. */
export function getPlayerState(scene: Phaser.Scene): PlayerState {
  return scene.cache.json.get(PLAYER_STATE_KEY) as PlayerState;
}

/** Reads levelCompleted from localStorage if a value has been persisted there (via
 * setLevelCompleted()), falling back to player_state.json's baked-in value otherwise (e.g.
 * first run ever, or localStorage cleared). Call after preloadPlayerState()'s load has
 * completed, since the fallback path reads through getPlayerState(). */
export function getLevelCompleted(scene: Phaser.Scene): number {
  const stored = localStorage.getItem(LEVEL_COMPLETED_STORAGE_KEY);
  if (stored !== null) {
    const parsed = Number(stored);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return getPlayerState(scene).levelCompleted;
}

/** Persists an updated levelCompleted value to localStorage. A subsequent
 * getLevelCompleted() call -- this session or a future one, same browser -- returns this
 * value instead of player_state.json's baked-in fallback. */
export function setLevelCompleted(value: number): void {
  localStorage.setItem(LEVEL_COMPLETED_STORAGE_KEY, String(value));
}
