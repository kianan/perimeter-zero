import Phaser from 'phaser';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { Bullet } from '../weapons/Bullet';
import { Grenade } from '../weapons/Grenade';
import { preloadCharacterAssets, createCharacterAnims } from '../content/characterAssets';
import { GameEndPopup } from '../ui/GameEndPopup';
import { DevLog } from '../ui/DevLog';
import { preloadWeaponData, getWeapon } from '../content/weapons';
import { preloadPlayerState, getPlayerState } from '../content/playerState';
import { preloadLevelData, getLevel, getLevelEnemies } from '../content/levels';
import { preloadEnemyData, getEnemy } from '../content/enemies';
import { preloadPlayerLevelData, getPlayerLevel } from '../content/playerLevel';
import { preloadAugmentData, getAugment, ResolvedAugment } from '../content/augments';
import { preloadAugmentLevelData, getAugmentLevelThreshold } from '../content/augmentLevel';
import { ENEMY_ARCHETYPES } from '../enemies/archetypes';

// No level-select/progression system yet -- always load level 1's data.
const LEVEL_ID = '1';

// No exp/leveling/choice system yet (brief-augment.md steps 2-5) -- Grenade auto-fires at a
// fixed id/level, same "hardcode the one that exists" approach as LEVEL_ID above.
const AUGMENT_ID = '1';
const AUGMENT_LEVEL = 1;

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
  // see content/weapons.ts and content/playerState.ts.
  private bulletDamage = 0;
  // From level.csv, resolved in create().
  private surviveSeconds = 0;
  private worldSize = 0;
  private spawnOffset = 0;
  private augmentExpMinDrop = 0;
  private augmentExpMaxDrop = 0;
  // Resolved from augment_weapon.csv/augment_weapon_scale.csv, see content/augments.ts.
  private grenade!: ResolvedAugment;
  // brief-augment.md: accumulates from enemy kills (see awardAugmentExp()).
  private augmentExp = 0;
  // Starts at 1 (matches augment_level.csv's level=1/exp_required=0 baseline). No choice
  // popup yet (step 4) -- checkAugmentLevelUp() just logs and increments for now.
  private augmentLevel = 1;
  // Dev-build-only on-screen log, bottom-left -- undefined (and logDev() a no-op) in a
  // production build. See ui/DevLog.ts.
  private devLog?: DevLog;

  constructor() {
    super('game');
  }

  preload() {
    preloadCharacterAssets(this);
    preloadWeaponData(this);
    preloadPlayerState(this);
    preloadLevelData(this);
    preloadEnemyData(this);
    preloadPlayerLevelData(this);
    preloadAugmentData(this);
    preloadAugmentLevelData(this);
  }

  create() {
    // scene.restart() (see endRound()'s Restart button) re-runs create(), not the constructor
    // -- class-field initializers below only fire once, ever, so reset mutable state here or
    // a restarted run inherits stale enemies/bullets/roundOver from the previous one.
    this.enemies = [];
    this.bullets = [];
    this.roundOver = false;
    this.augmentExp = 0;
    this.augmentLevel = 1;

    createCharacterAnims(this);

    const level = getLevel(this, LEVEL_ID);
    this.surviveSeconds = level.duration;
    this.worldSize = level.worldSize;
    this.spawnOffset = level.spawnOffset;
    this.augmentExpMinDrop = level.augmentExpMinDrop;
    this.augmentExpMaxDrop = level.augmentExpMaxDrop;

    this.drawGround();

    const playerState = getPlayerState(this);
    const weapon = getWeapon(this, playerState.mainWeapon.id, playerState.mainWeapon.level);
    const playerLevel = getPlayerLevel(this, playerState.playerLevel);
    this.bulletDamage = weapon.damage;

    this.player = new Player(this, this.worldSize / 2, this.worldSize / 2, {
      maxHp: playerLevel.health,
      speed: playerLevel.speed,
      fireRate: weapon.fireRate,
      bulletSpeed: weapon.bulletSpeed,
      bulletLifespanMs: weapon.lifespanMs,
      weaponScale: weapon.weaponScale,
      weaponYOffset: weapon.weaponYOffset,
      muzzleOffset: weapon.muzzleOffset,
      bulletScale: weapon.bulletScale,
      bulletRadius: weapon.bulletRadius,
      onFire: (bullet) => this.trackBullet(bullet),
      onDeath: () => this.gameOver(),
    });
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, this.worldSize, this.worldSize);

    // One timer per level_enemies.csv row for this level -- reads however many enemy types
    // the CSV lists for LEVEL_ID, not a hardcoded single enemy type. enemy_level comes from
    // the same row too, so nothing here hardcodes which enemy_scale.csv tier to spawn.
    for (const spawn of getLevelEnemies(this, LEVEL_ID)) {
      this.spawnEnemy(spawn.enemyId, spawn.enemyLevel); // one immediately, so the player isn't waiting out the first interval
      this.time.addEvent({
        delay: spawn.spawnRate,
        loop: true,
        callback: () => this.spawnEnemy(spawn.enemyId, spawn.enemyLevel),
      });
    }

    // Grenade is an Augment (GDD §4a): not owned at run start, only obtained via the
    // exp/level-up/choice-popup loop (brief-augment.md steps 2-5, not built yet). Resolved
    // here so the data's ready, but NOT auto-fired -- step 1's always-on timer was a
    // prototype to prove the mechanic, not the real activation trigger. fireGrenade() stays
    // dormant, ready for the choice popup's "pick Grenade" callback to call it later.
    this.grenade = getAugment(this, AUGMENT_ID, AUGMENT_LEVEL);

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

    if (import.meta.env.DEV) {
      this.devLog = new DevLog(this);
    }
  }

  private logDev(message: string) {
    this.devLog?.log(message);
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
    this.endRound(false);
  }

  /** Survived the timer. Same freeze as gameOver(), different popup. */
  private win() {
    this.endRound(true);
  }

  private endRound(won: boolean) {
    if (this.roundOver) return;
    this.roundOver = true;
    this.player.freeze();
    this.physics.pause();

    const { width, height } = this.cameras.main;
    new GameEndPopup(this, width / 2, height / 2, {
      won,
      onRestart: () => this.scene.restart(),
      onMainMenu: () => this.scene.start('menu'),
    }).setDepth(1000);
  }

  /** Spawns the given enemy archetype/level at a random angle around the player, at a fixed
   * ring distance, clamped inside the world bounds so it can't land off the playable ground.
   * Dispatches on enemyId: archetypes.ts supplies the visuals, enemy.csv/enemy_scale.csv
   * (via content/enemies.ts) supply the stats -- adding a new archetype needs a CSV row +
   * an archetypes.ts entry, not a new spawn* method. */
  private spawnEnemy(enemyId: string, level: number) {
    if (this.roundOver) return;
    const archetype = ENEMY_ARCHETYPES[enemyId];
    if (!archetype) {
      throw new Error(`No archetype visuals registered for enemy "${enemyId}" (see archetypes.ts)`);
    }
    const stats = getEnemy(this, enemyId, level);

    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * this.spawnOffset, 0, this.worldSize);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * this.spawnOffset, 0, this.worldSize);
    this.trackEnemy(
      new Enemy(this, x, y, archetype, {
        hp: stats.health,
        speed: stats.speed,
        damage: stats.damage,
        scale: stats.scale,
      }),
    );
  }

  /** Grenade (brief-augment.md): auto-fires on a timer, no player input or exp/leveling/choice
   * system yet (steps 2-5) -- just the mechanic itself, stats from augment_weapon.csv/
   * augment_weapon_scale.csv instead of hardcoded constants. */
  private fireGrenade() {
    if (this.roundOver) return;
    const target = this.pickGrenadeTarget();
    new Grenade(this, this.player.x, this.player.y, {
      targetX: target.x,
      targetY: target.y,
      radius: this.grenade.radius,
      travelSpeed: this.grenade.travelSpeed,
      delayMs: this.grenade.delayMs,
      visualRadius: this.grenade.visualRadius,
      color: this.grenade.color,
      explosionColor: this.grenade.explosionColor,
      explosionVisualMs: this.grenade.explosionVisualMs,
      onExplode: (x, y, radius) => this.applyGrenadeDamage(x, y, radius),
    });
  }

  /** Targets the nearest enemy's current position, or a random nearby point if none exist --
   * see brief-augment.md's open "targeting" decision. No aim/input logic needed either way. */
  private pickGrenadeTarget(): { x: number; y: number } {
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemies) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }
    if (nearest) return { x: nearest.x, y: nearest.y };

    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(this.grenade.targetMinDist, this.grenade.targetMaxDist);
    return {
      x: this.player.x + Math.cos(angle) * dist,
      y: this.player.y + Math.sin(angle) * dist,
    };
  }

  private applyGrenadeDamage(x: number, y: number, radius: number) {
    for (const enemy of this.enemies) {
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
        enemy.takeDamage(this.grenade.damage);
      }
    }
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

      // Enemy.destroy() only ever happens via die() (takeDamage reaching 0) today, so DESTROY
      // reliably means "killed by the player" -- fine to award exp here without a separate
      // "was this actually a kill" check.
      this.awardAugmentExp(Phaser.Math.Between(this.augmentExpMinDrop, this.augmentExpMaxDrop));
    });
  }

  private awardAugmentExp(amount: number) {
    this.augmentExp += amount;
    this.logDev(`+${amount} exp (total: ${this.augmentExp})`);
    this.checkAugmentLevelUp();
  }

  /** Compares augmentExp against augment_level.csv's next threshold; loops in case one big
   * gain crosses more than one level at once. No choice popup yet (step 4) -- just logs and
   * increments augmentLevel for now. */
  private checkAugmentLevelUp() {
    let nextThreshold = getAugmentLevelThreshold(this, this.augmentLevel + 1);
    while (nextThreshold !== null && this.augmentExp >= nextThreshold) {
      this.augmentLevel++;
      this.logDev(`LEVEL UP! now level ${this.augmentLevel}`);
      nextThreshold = getAugmentLevelThreshold(this, this.augmentLevel + 1);
    }
  }

  private drawGround() {
    const cell = 64;
    const g = this.add.graphics();
    g.fillStyle(0x131a22, 1).fillRect(0, 0, this.worldSize, this.worldSize);
    g.lineStyle(1, 0x1f2a36, 1);
    for (let x = 0; x <= this.worldSize; x += cell) g.lineBetween(x, 0, x, this.worldSize);
    for (let y = 0; y <= this.worldSize; y += cell) g.lineBetween(0, y, this.worldSize, y);
    this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);
  }
}
