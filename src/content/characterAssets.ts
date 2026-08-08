import Phaser from 'phaser';

// Animation frame counts per layer (see public/assets/characters/player/).
export const ANIMS: Record<'idle' | 'walk', number> = { idle: 6, walk: 8 };
export const LAYERS = ['body', 'weapon'] as const;
export const RUSHER_DEATH_FRAMES = 10;
export const PLAYER_DEATH_FRAMES = 10;
export const SWARM_FLY_FRAMES = 6; // enemies/swarm/fly_0..5 -- one anim, no idle/walk/death split

/** Loads every player (body/weapon), rusher, and swarm frame, plus the bullet sprite. Shared
 * between GameScene and KitchenSinkScene so both use the exact same texture keys/anims -- one
 * source of truth instead of two copies drifting apart. */
export function preloadCharacterAssets(scene: Phaser.Scene) {
  for (const layer of LAYERS) {
    for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
      for (let i = 0; i < ANIMS[anim]; i++) {
        scene.load.image(
          `${layer}_${anim}_${i}`,
          `assets/characters/player/${layer}/${anim}_${i}.png`,
        );
      }
    }
  }
  for (let i = 0; i < PLAYER_DEATH_FRAMES; i++) {
    scene.load.image(`body_death_${i}`, `assets/characters/player/body/death_${i}.png`);
  }

  for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
    for (let i = 0; i < ANIMS[anim]; i++) {
      scene.load.image(`rusher_${anim}_${i}`, `assets/enemies/rusher/${anim}_${i}.png`);
    }
  }
  for (let i = 0; i < RUSHER_DEATH_FRAMES; i++) {
    scene.load.image(`rusher_death_${i}`, `assets/enemies/rusher/death_${i}.png`);
  }

  for (let i = 0; i < SWARM_FLY_FRAMES; i++) {
    scene.load.image(`swarm_fly_${i}`, `assets/enemies/swarm/fly_${i}.png`);
  }

  scene.load.image('bullet', 'assets/weapons/projectiles/bullet.png');
}

/** Creates every anim key used by Player/Enemy. Must run after the matching preload. */
export function createCharacterAnims(scene: Phaser.Scene) {
  for (const layer of LAYERS) {
    for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
      scene.anims.create({
        key: `${layer}_${anim}`,
        frames: Array.from({ length: ANIMS[anim] }, (_, i) => ({ key: `${layer}_${anim}_${i}` })),
        frameRate: anim === 'walk' ? 12 : 8,
        repeat: -1,
      });
    }
  }
  scene.anims.create({
    key: 'body_death',
    frames: Array.from({ length: PLAYER_DEATH_FRAMES }, (_, i) => ({ key: `body_death_${i}` })),
    frameRate: 15,
    repeat: 0,
  });

  for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
    scene.anims.create({
      key: `rusher_${anim}`,
      frames: Array.from({ length: ANIMS[anim] }, (_, i) => ({ key: `rusher_${anim}_${i}` })),
      frameRate: anim === 'walk' ? 12 : 8,
      repeat: -1,
    });
  }
  scene.anims.create({
    key: 'rusher_death',
    frames: Array.from({ length: RUSHER_DEATH_FRAMES }, (_, i) => ({ key: `rusher_death_${i}` })),
    frameRate: 15,
    repeat: 0,
  });

  scene.anims.create({
    key: 'swarm_fly',
    frames: Array.from({ length: SWARM_FLY_FRAMES }, (_, i) => ({ key: `swarm_fly_${i}` })),
    frameRate: 12,
    repeat: -1,
  });
}
