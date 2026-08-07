import Phaser from 'phaser';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';

// Animation frame counts per layer (see public/assets/characters/player/).
const ANIMS: Record<'idle' | 'walk', number> = { idle: 6, walk: 8 };
const LAYERS = ['body', 'weapon'] as const;

const WORLD = 2000; // square ground, px
const ENEMY_SPAWN_OFFSET = 400; // px from player, spawn-in distance for the step-2 test enemy

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('game');
  }

  preload() {
    for (const layer of LAYERS) {
      for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
        for (let i = 0; i < ANIMS[anim]; i++) {
          this.load.image(
            `${layer}_${anim}_${i}`,
            `assets/characters/player/${layer}/${anim}_${i}.png`,
          );
        }
      }
    }
    this.load.image('bullet', 'assets/weapons/projectiles/bullet.png');

    for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
      for (let i = 0; i < ANIMS[anim]; i++) {
        this.load.image(`rusher_${anim}_${i}`, `assets/enemies/rusher/${anim}_${i}.png`);
      }
    }
  }

  create() {
    this.drawGround();

    for (const layer of LAYERS) {
      for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
        this.anims.create({
          key: `${layer}_${anim}`,
          frames: Array.from({ length: ANIMS[anim] }, (_, i) => ({
            key: `${layer}_${anim}_${i}`,
          })),
          frameRate: anim === 'walk' ? 12 : 8,
          repeat: -1,
        });
      }
    }
    for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
      this.anims.create({
        key: `rusher_${anim}`,
        frames: Array.from({ length: ANIMS[anim] }, (_, i) => ({
          key: `rusher_${anim}_${i}`,
        })),
        frameRate: anim === 'walk' ? 12 : 8,
        repeat: -1,
      });
    }

    this.player = new Player(this, WORLD / 2, WORLD / 2);
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);

    this.enemies.push(new Enemy(this, WORLD / 2 + ENEMY_SPAWN_OFFSET, WORLD / 2));

    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
  }

  update() {
    const x = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0);
    const y = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0);
    this.player.move({ x, y });

    for (const enemy of this.enemies) enemy.chase(this.player.x, this.player.y);
  }

  private drawGround() {
    const cell = 64;
    const g = this.add.graphics();
    g.fillStyle(0x131a22, 1).fillRect(0, 0, WORLD, WORLD);
    g.lineStyle(1, 0x1f2a36, 1);
    for (let x = 0; x <= WORLD; x += cell) g.lineBetween(x, 0, x, WORLD);
    for (let y = 0; y <= WORLD; y += cell) g.lineBetween(0, y, WORLD, y);
    this.physics.world.setBounds(0, 0, WORLD, WORLD);
  }
}
