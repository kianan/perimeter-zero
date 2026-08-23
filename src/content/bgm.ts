import Phaser from 'phaser';

const BGM_KEY = 'bgm';
const BGM_VOLUME = 0.3;

/** Call from a scene's preload(). Real audio (not synthesized, unlike sfx.ts) -- goes
 * through Phaser's normal Sound Manager like any other asset. brief-sound.md: single
 * Studio-Head-supplied track, one file, no CSV needed for a roster of one. */
export function preloadBgmData(scene: Phaser.Scene) {
  scene.load.audio(BGM_KEY, 'assets/audio/bgm/background_bgm.mp3');
}

/** Starts the (looping) BGM track if it isn't already playing. `scene.sound` is a
 * game-wide manager shared across every Scene, not scene-owned -- calling this once from
 * MenuScene.create() is enough for it to keep playing straight through the transition into
 * GameScene. The `sound.get()` guard matters because MenuScene.create() runs again every
 * time the player returns via GameEndPopup's "Main Menu" button; without it, the track
 * would restart from the top on every menu visit instead of continuing. */
export function playBgm(scene: Phaser.Scene) {
  if (scene.sound.get(BGM_KEY)) return;
  const bgm = scene.sound.add(BGM_KEY, { loop: true, volume: BGM_VOLUME });
  bgm.play();
}
