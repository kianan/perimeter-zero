import Phaser from 'phaser';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { Bullet } from '../weapons/Bullet';
import { AoeLob } from '../weapons/AoeLob';
import { preloadCharacterAssets, createCharacterAnims } from '../content/characterAssets';
import { GameEndPopup } from '../ui/GameEndPopup';
import { AugmentChoicePopup } from '../ui/AugmentChoicePopup';
import { DevLog } from '../ui/DevLog';
import { preloadWeaponData, getWeapon } from '../content/weapons';
import {
  preloadPlayerState,
  getPlayerState,
  getLevelCompleted,
  setLevelCompleted,
} from '../content/playerState';
import { preloadLevelData, getLevel, getLevelEnemies } from '../content/levels';
import { preloadEnemyData, getEnemy } from '../content/enemies';
import { preloadPlayerLevelData, getPlayerLevel } from '../content/playerLevel';
import {
  preloadAugmentData,
  getAllAugmentIdentities,
  getRootTier,
  getChildTiers,
  AugmentIdentity,
  AugmentTier,
} from '../content/augments';
import { preloadAugmentLevelData, getAugmentLevelThreshold } from '../content/augmentLevel';
import { ENEMY_ARCHETYPES } from '../enemies/archetypes';
import { preloadSfxData, playSfx } from '../content/sfx';

// Stages run 1-10 (level.csv). The final stage id, as a string to match currentLevelId's type.
const FINAL_LEVEL_ID = '10';

const MAX_AUGMENT_CHOICES = 3;

/** One augment the player currently owns: which tier it's at, and the live timer firing it.
 * Replacing a tier (picking a child of the current one) removes the old timer and arms a
 * new one, since a child tier can have a different cooldown. */
interface OwnedAugment {
  identity: AugmentIdentity;
  tier: AugmentTier;
  timer: Phaser.Time.TimerEvent;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private hudText!: Phaser.GameObjects.Text;
  private roundStartTime = 0;
  // Covers both win and lose -- either one freezes the world the same way.
  private roundOver = false;
  // True while an AugmentChoicePopup is up -- unlike roundOver, this resumes. Gameplay
  // (movement, enemy chase, spawning) freezes; the round itself keeps going once resumed.
  private paused = false;
  // Which stage (level.csv's `id`) this run is playing. Recomputed each create() (including
  // on scene.restart(), see win()) from content/playerState.ts's persisted levelCompleted --
  // reads that value + 1, clamped to '1' when the result would be 0 or less (levelCompleted
  // is never negative in practice, but the clamp guards against a bad/cleared localStorage
  // value). A stage-N win persists levelCompleted=N via setLevelCompleted() before restarting,
  // so the next create() naturally picks up stage N+1 -- see win().
  private currentLevelId!: string;
  // Resolved from weapon.csv/weapon_scale.csv via the equipped weapon in player_state.json --
  // see content/weapons.ts and content/playerState.ts.
  private bulletDamage = 0;
  // From level.csv, resolved in create().
  private surviveSeconds = 0;
  private worldSize = 0;
  private spawnOffset = 0;
  private augmentExpMinDrop = 0;
  private augmentExpMaxDrop = 0;
  // brief-augment.md: accumulates from enemy kills (see awardAugmentExp()).
  private augmentExp = 0;
  // Starts at 1 (matches augment_level.csv's level=1/exp_required=0 baseline).
  private augmentLevel = 1;
  // Keyed by augment id (see content/augments.ts). Empty at run start -- every Augment is
  // obtained in-battle via the exp/level-up/choice-popup loop, never owned by default.
  private ownedAugments = new Map<string, OwnedAugment>();
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
    preloadSfxData(this);
  }

  create() {
    // scene.restart() (see endRound()'s Restart button, and win()'s stage-advance path)
    // re-runs create(), not the constructor -- class-field initializers below only fire once,
    // ever, so reset mutable state here or a restarted run inherits stale enemies/bullets/
    // roundOver from the previous one. Old timers don't need manual cleanup -- Phaser's scene
    // shutdown (part of restart()) already clears every registered time event from the
    // previous run.
    this.enemies = [];
    this.bullets = [];
    this.roundOver = false;
    this.paused = false;
    this.augmentExp = 0;
    this.augmentLevel = 1;
    this.ownedAugments = new Map();

    const nextLevelId = getLevelCompleted(this) + 1;
    this.currentLevelId = String(nextLevelId <= 0 ? 1 : nextLevelId);

    createCharacterAnims(this);

    const level = getLevel(this, this.currentLevelId);
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
    // the CSV lists for currentLevelId, not a hardcoded single enemy type. enemy_level comes
    // from the same row too, so nothing here hardcodes which enemy_scale.csv tier to spawn.
    for (const spawn of getLevelEnemies(this, this.currentLevelId)) {
      this.spawnEnemy(spawn.enemyId, spawn.enemyLevel); // one immediately, so the player isn't waiting out the first interval
      this.time.addEvent({
        delay: spawn.spawnRate,
        loop: true,
        callback: () => this.spawnEnemy(spawn.enemyId, spawn.enemyLevel),
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

    if (import.meta.env.DEV) {
      this.devLog = new DevLog(this);
    }
  }

  private logDev(message: string) {
    this.devLog?.log(message);
  }

  update() {
    if (this.roundOver || this.paused) return;

    const x = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0);
    const y = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0);
    this.player.move({ x, y });

    for (const enemy of this.enemies) enemy.chase(this.player.x, this.player.y);

    const remaining = Math.max(0, this.surviveSeconds - (this.time.now - this.roundStartTime) / 1000);
    this.hudText.setText(
      `Level: ${this.currentLevelId}\nTime: ${Math.ceil(remaining)}s\nHP: ${this.player.getHp()}/${this.player.getMaxHp()}`,
    );
    if (remaining <= 0) this.win();
  }

  /** Player hit 0 HP. Freeze the world (physics pause -- doesn't stop the player's death
   * anim, which runs off the anim system, not physics) and show a game-over popup. No
   * progression: levelCompleted is not persisted and currentLevelId is not advanced -- a
   * death replays the same stage, it doesn't roll progress back. */
  private gameOver() {
    this.endRound(false);
  }

  /** Survived the timer. Stages 1-9: persist this stage as completed, advance to the next
   * stage, and restart the scene straight into it -- no end-of-run popup, the run keeps
   * going. Stage 10 (the final stage): unchanged from before -- show the win popup via
   * endRound(true), with no persistence beyond stage 10. */
  private win() {
    if (this.currentLevelId !== FINAL_LEVEL_ID) {
      setLevelCompleted(Number(this.currentLevelId));
      this.currentLevelId = String(Number(this.currentLevelId) + 1);
      // trackEnemy()'s DESTROY listener guards on roundOver to tell "the scene is tearing
      // down, don't touch already-destroyed objects like DevLog's Text" apart from a real
      // kill -- endRound() normally sets this, but a stage-advance restart bypasses
      // endRound() entirely. Without this, scene.restart() below destroys every remaining
      // live enemy, each DESTROY fires awardAugmentExp() -> logDev() against a Text object
      // mid-teardown, and it throws (same crash the roundOver guard was originally added
      // to prevent -- see trackEnemy()'s comment).
      this.roundOver = true;
      this.scene.restart();
      return;
    }
    this.endRound(true);
  }

  private endRound(won: boolean) {
    if (this.roundOver) return;
    this.roundOver = true;
    this.player.freeze();
    this.physics.pause();
    playSfx(this, won ? 'round_win' : 'round_lose');

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
    if (this.roundOver || this.paused) return;
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

  /** Fires one activation of an AoeLob-type Augment: tier.explosionCount independently
   * targeted AoeLob instances (see pickAoeLobTargets()), using identity for visuals and
   * tier for behavior/stats. */
  private fireAoeLob(identity: AugmentIdentity, tier: AugmentTier) {
    if (this.roundOver || this.paused) return;
    const targets = this.pickAoeLobTargets(tier.explosionCount, tier.targetMinDist, tier.targetMaxDist);
    for (const target of targets) {
      new AoeLob(this, this.player.x, this.player.y, {
        targetX: target.x,
        targetY: target.y,
        radius: tier.radius,
        travelSpeed: tier.travelSpeed,
        delayMs: tier.delayMs,
        travels: tier.travels,
        visualRadius: identity.visualRadius,
        color: identity.color,
        explosionColor: identity.explosionColor,
        explosionVisualMs: identity.explosionVisualMs,
        onExplode: (x, y, radius) => this.applyAoeLobDamage(x, y, radius, tier.damage),
      });
    }
  }

  /** Targets the `count` nearest enemies (nearest, 2nd-nearest, ...), spreading multiple
   * simultaneous throws across different targets instead of piling them on one. Falls back
   * to a random nearby point per throw once there aren't enough enemies left. */
  private pickAoeLobTargets(count: number, minDist: number, maxDist: number): { x: number; y: number }[] {
    const sorted = [...this.enemies].sort(
      (a, b) =>
        Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y),
    );

    const targets: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const enemy = sorted[i];
      if (enemy) {
        targets.push({ x: enemy.x, y: enemy.y });
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(minDist, maxDist);
      targets.push({
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
      });
    }
    return targets;
  }

  private applyAoeLobDamage(x: number, y: number, radius: number, damage: number) {
    for (const enemy of this.enemies) {
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
        enemy.takeDamage(damage);
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

      // DESTROY also fires when the scene itself tears down (e.g. GameEndPopup's Main Menu
      // button -> scene.start('menu') destroys every GameObject GameScene owns, including
      // every remaining enemy) -- not just from a real kill via Enemy.die(). roundOver is
      // already true by the time that's reachable (Main Menu only exists on GameEndPopup,
      // which only shows after endRound() sets it), so this guard tells the two cases apart.
      // Without it, awardAugmentExp() -> logDev() tried to draw onto DevLog's Text object
      // after it was already destroyed in the same teardown, throwing and hanging the
      // scene transition mid-flight.
      if (this.roundOver) return;
      this.awardAugmentExp(Phaser.Math.Between(this.augmentExpMinDrop, this.augmentExpMaxDrop));
    });
  }

  private awardAugmentExp(amount: number) {
    this.augmentExp += amount;
    this.logDev(`+${amount} exp (total: ${this.augmentExp})`);
    this.checkAugmentLevelUp();
  }

  /** Compares augmentExp against augment_level.csv's next threshold. One level at a time --
   * if a big exp gain crosses more than one, resumeAfterAugmentChoice() re-checks after each
   * popup closes, so multiple crossings show sequential popups instead of stacking them. */
  private checkAugmentLevelUp() {
    if (this.paused || this.roundOver) return;
    const nextThreshold = getAugmentLevelThreshold(this, this.augmentLevel + 1);
    if (nextThreshold === null || this.augmentExp < nextThreshold) return;

    this.augmentLevel++;
    this.logDev(`LEVEL UP! now level ${this.augmentLevel}`);

    const choices = this.sampleAugmentChoices(this.buildAugmentChoicePool(), MAX_AUGMENT_CHOICES);
    if (choices.length === 0) {
      // Every owned augment is maxed out and there's nothing new to offer -- no popup.
      this.logDev('no augment choices available');
      return;
    }
    this.openAugmentChoice(choices);
  }

  /** For each augment in the roster: if owned, its current tier's children (empty if maxed
   * out); if not owned, its root tier. This is the full set of currently-legal next picks,
   * flattened across every augment -- sampleAugmentChoices() then randomly narrows it down. */
  private buildAugmentChoicePool(): { identity: AugmentIdentity; tier: AugmentTier }[] {
    const pool: { identity: AugmentIdentity; tier: AugmentTier }[] = [];
    for (const identity of getAllAugmentIdentities(this)) {
      const owned = this.ownedAugments.get(identity.id);
      if (owned) {
        for (const child of getChildTiers(this, identity.id, owned.tier.tierId)) {
          pool.push({ identity, tier: child });
        }
      } else {
        pool.push({ identity, tier: getRootTier(this, identity.id) });
      }
    }
    return pool;
  }

  /** Random sample without replacement, up to `max` -- shows fewer if the pool itself is
   * smaller (the "confirm" degraded case with only 1-2 legal options). */
  private sampleAugmentChoices<T>(pool: T[], max: number): T[] {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, max);
  }

  private openAugmentChoice(choices: { identity: AugmentIdentity; tier: AugmentTier }[]) {
    this.paused = true;
    this.player.pause();
    this.physics.pause();
    playSfx(this, 'level_up');

    const { width, height } = this.cameras.main;
    const popup = new AugmentChoicePopup(this, width / 2, height / 2, {
      options: choices.map((choice) => ({
        name: choice.tier.name,
        onChoose: () => {
          this.pickAugmentTier(choice.identity, choice.tier);
          popup.destroy();
          this.resumeAfterAugmentChoice();
        },
      })),
    }).setDepth(1000);
  }

  /** Arms (or re-arms, replacing the old timer -- a child tier can have a different
   * cooldown) the auto-fire timer for this augment at its newly picked tier. */
  private pickAugmentTier(identity: AugmentIdentity, tier: AugmentTier) {
    this.ownedAugments.get(identity.id)?.timer.remove();

    const timer = this.time.addEvent({
      delay: tier.cooldownMs,
      loop: true,
      callback: () => this.fireAoeLob(identity, tier),
    });
    this.ownedAugments.set(identity.id, { identity, tier, timer });
  }

  private resumeAfterAugmentChoice() {
    this.paused = false;
    this.player.resume();
    this.physics.resume();
    this.checkAugmentLevelUp(); // augmentExp may already clear the next threshold too
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
