import Phaser from 'phaser';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { Bullet } from '../weapons/Bullet';
import { preloadCharacterAssets, createCharacterAnims } from '../content/characterAssets';
import { Popup } from '../ui/Popup';
import { preloadWeaponData, getWeapon } from '../content/weapons';
import { preloadPlayerState, getPlayerState } from '../content/playerState';
import { preloadLevelData, getLevel, getLevelEnemies } from '../content/levels';
import { preloadEnemyData, getEnemy } from '../content/enemies';
import { ENEMY_ARCHETYPES } from '../enemies/archetypes';

const WORLD = 2000; // square ground, px
const ENEMY_SPAWN_OFFSET = 400; // px from the player -- spawn ring radius
// No level-select/progression system yet -- always load level 1's data.
const LEVEL_ID = '1';
// No level-up system for enemies exists yet either -- always resolve stats at level 1.
const ENEMY_LEVEL = 1;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private hudText!: Phaser.GameObjects.Text;
  private roundStartTime = 0;
  // Covers both win and lose -- either one freezes the world the same way.
  private roundOver = false;
  // Resolved from weapon.csv/weapon_scale.csv via the equipped weapon in player_state.json --
  // see content/weapons.ts and content/playerState.ts. Only damage is wired through yet; the
  // rest of the fire/bullet stats (fire rate, bullet speed) are still hardcoded in Player.ts.
  private bulletDamage = 0;
  // From level.csv's duration column, resolved in create().
  private surviveSeconds = 0;

  constructor() {
    super('game');
  }

  preload() {
    preloadCharacterAssets(this);
    preloadWeaponData(this);
    preloadPlayerState(this);
    preloadLevelData(this);
    preloadEnemyData(this);
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

    const playerState = getPlayerState(this);
    this.bulletDamage = getWeapon(this, playerState.mainWeapon.id, playerState.mainWeapon.level).damage;
    this.surviveSeconds = getLevel(this, LEVEL_ID).duration;

    this.player = new Player(
      this,
      WORLD / 2,
      WORLD / 2,
      (bullet) => this.trackBullet(bullet),
      () => this.gameOver(),
    );
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);

    // One timer per level_enemies.csv row for this level -- reads however many enemy types
    // the CSV lists for LEVEL_ID, not a hardcoded single enemy type.
    for (const spawn of getLevelEnemies(this, LEVEL_ID)) {
      this.spawnEnemy(spawn.enemyId); // one immediately per entry, so the player isn't waiting out the first interval
      this.time.addEvent({
        delay: spawn.spawnRate,
        loop: true,
        callback: () => this.spawnEnemy(spawn.enemyId),
      });
    }

    this.physics.add.overlap(this.bullets, this.enemies, (bulletObj, enemyObj) => {
      (bulletObj as Bullet).destroy();
      (enemyObj as Enemy).takeDamage(this.bulletDamage);
    });
    this.physics.add.overlap(this.player, this.enemies, (_playerObj, enemyObj) => {
      this.player.takeDamage((enemyObj as Enemy).damage);
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

    const remaining = Math.max(0, this.surviveSeconds - (this.time.now - this.roundStartTime) / 1000);
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

  /** Spawns the given enemy archetype at a random angle around the player, at a fixed ring
   * distance, clamped inside the world bounds so it can't land off the playable ground.
   * Dispatches on enemyId: archetypes.ts supplies the visuals, enemy.csv/enemy_scale.csv
   * (via content/enemies.ts) supply the stats -- adding a new archetype needs a CSV row +
   * an archetypes.ts entry, not a new spawn* method. */
  private spawnEnemy(enemyId: string) {
    if (this.roundOver) return;
    const archetype = ENEMY_ARCHETYPES[enemyId];
    if (!archetype) {
      throw new Error(`No archetype visuals registered for enemy "${enemyId}" (see archetypes.ts)`);
    }
    const stats = getEnemy(this, enemyId, ENEMY_LEVEL);

    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * ENEMY_SPAWN_OFFSET, 0, WORLD);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * ENEMY_SPAWN_OFFSET, 0, WORLD);
    this.trackEnemy(
      new Enemy(this, x, y, archetype, { hp: stats.health, speed: stats.speed, damage: stats.damage }),
    );
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
