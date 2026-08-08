import Phaser from 'phaser';

const PLAYER_STATE_KEY = 'data_player_state';

export interface PlayerState {
  levelCompleted: number;
  mainWeapon: { id: string; level: number };
}

/** Call from a scene's preload(). Hardcoded stand-in for the real save state (localStorage,
 * see brief-database.md) -- reads a fixed JSON file instead of persisting/loading a save. */
export function preloadPlayerState(scene: Phaser.Scene) {
  scene.load.json(PLAYER_STATE_KEY, 'data/player_state.json');
}

/** Call after preloadPlayerState()'s load has completed (e.g. from create()). */
export function getPlayerState(scene: Phaser.Scene): PlayerState {
  return scene.cache.json.get(PLAYER_STATE_KEY) as PlayerState;
}
