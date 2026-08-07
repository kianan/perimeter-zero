import Phaser from 'phaser';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { Bullet } from '../weapons/Bullet';
import { preloadCharacterAssets, createCharacterAnims } from '../content/characterAssets';
import { Popup } from '../ui/Popup';

const WORLD = 2000; // square ground, px
const ENEMY_SPAWN_OFFSET = 400; // px from the player -- spawn ring radius
const RUSHER_CONTACT_DAMAGE = 10; // placeholder -- no per-archetype damage stats yet
const BULLET_DAMAGE = 10; // placeholder -- matches the GDD §4 spec table's starter-gun base damage
const SPAWN_INTERVAL_MS = 3000; // placeholder -- no wave/difficulty curve yet, just a steady drip
const SURVIVE_SECONDS = 60; // placeholder -- no tuned run length yet

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private hudText!: Phaser.GameObjects.Text;
  private roundStartTime = 0;
  // Covers both win and lose -- either one freezes the world the same way.
  private roundOver = false;

  constructor() {
    super('game');
  }

  preload() {
    preloadCharacterAssets(this);
  }

  create() {
    // scene.restart() (see endRound()'s Restart button) re-runs create(), not the constructor
    // -- class-field initializers below only fire once, ever, so reset mutable state here or
    // a restarted run inherits stale enemies/bullets/roundOver from the previous one.
    this.enemies = [];
    this.bullets = [];
    this.roundOver = false;

    this.drawGround();
    createCharacterAnims(this);

    this.player = new Player(
      this,
      WORLD / 2,
      WORLD / 2,
      (bullet) => this.trackBullet(bullet),
      () => this.gameOver(),
    );
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);

    this.spawnEnemy(); // one immediately, so the player isn't waiting out the first interval
    this.time.addEvent({ delay: SPAWN_INTERVAL_MS, loop: true, callback: () => this.spawnEnemy() });

    this.physics.add.overlap(this.bullets, this.enemies, (bulletObj, enemyObj) => {
      (bulletObj as Bullet).destroy();
      (enemyObj as Enemy).takeDamage(BULLET_DAMAGE);
    });
    this.physics.add.overlap(this.player, this.enemies, (_playerObj, _enemyObj) => {
      this.player.takeDamage(RUSHER_CONTACT_DAMAGE);
    });

    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;

    this.hudText = this.add
      .text(16, 16, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(1000);
    this.roundStartTime = this.time.now;
  }

  update() {
    if (this.roundOver) return;

    const x = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0);
    const y = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0);
    this.player.move({ x, y });

    for (const enemy of this.enemies) enemy.chase(this.player.x, this.player.y);

    const remaining = Math.max(0, SURVIVE_SECONDS - (this.time.now - this.roundStartTime) / 1000);
    this.hudText.setText(
      `HP: ${this.player.getHp()}/${this.player.getMaxHp()}    Time: ${Math.ceil(remaining)}s`,
    );
    if (remaining <= 0) this.win();
  }

  /** Player hit 0 HP. Freeze the world (physics pause -- doesn't stop the player's death
   * anim, which runs off the anim system, not physics) and show a game-over popup. */
  private gameOver() {
    this.endRound('GAME OVER', '#ff3b3b', false);
  }

  /** Survived the timer. Same freeze as gameOver(), different message/buttons. */
  private win() {
    this.endRound('YOU SURVIVED', '#4ade80', true);
  }

  private endRound(message: string, color: string, won: boolean) {
    if (this.roundOver) return;
    this.roundOver = true;
    this.player.freeze();
    this.physics.pause();

    const buttons = won
      ? [{ label: 'Main Menu', onClick: () => this.scene.start('menu') }]
      : [
          { label: 'Restart', onClick: () => this.scene.restart() },
          { label: 'Main Menu', onClick: () => this.scene.start('menu') },
        ];

    const { width, height } = this.cameras.main;
    new Popup(this, width / 2, height / 2, { message, color, buttons }).setDepth(1000);
  }

  /** Spawns a rusher at a random angle around the player, at a fixed ring distance,
   * clamped inside the world bounds so it can't land off the playable ground. */
  private spawnEnemy() {
    if (this.roundOver) return;
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * ENEMY_SPAWN_OFFSET, 0, WORLD);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * ENEMY_SPAWN_OFFSET, 0, WORLD);
    this.trackEnemy(new Enemy(this, x, y));
  }

  // `overlap()` below keeps a reference to these arrays and re-reads them each frame --
  // remove in place (splice) rather than reassigning, or the collider goes stale.
  private trackBullet(bullet: Bullet) {
    this.bullets.push(bullet);
    bullet.once(Phaser.GameObjects.Events.DESTROY, () => {
      const i = this.bullets.indexOf(bullet);
      if (i !== -1) this.bullets.splice(i, 1);
    });
  }

  private trackEnemy(enemy: Enemy) {
    this.enemies.push(enemy);
    enemy.once(Phaser.GameObjects.Events.DESTROY, () => {
      const i = this.enemies.indexOf(enemy);
      if (i !== -1) this.enemies.splice(i, 1);
    });
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
