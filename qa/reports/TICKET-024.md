# QA Report — TICKET-024: AoeLob explosion rendering: circle → animated, tinted, scaled Sprite

**Method:** static code review

**Verdict:** PASS

**Summary:** Reviewed AoeLob.ts/augments.ts/GameScene.ts statically (no live run). explode() now creates `scene.add.sprite(x,y, explosionTextureKey)` with explosionTextureKey=`augment_${identity.id}_explosion_0`, `.setTint(explosionColor)`, and `.play(explosionAnimKey)` where explosionAnimKey=`augment_${identity.id}_explosion` — matches the anim registered in augments.ts's createAugmentExplosionAnims(). The scale-up/fade-out tween is preserved unchanged and still uses `duration: explosionVisualMs`; frameRate is derived so anim playtime exactly matches explosionVisualMs (7 frames@28fps and 10 frames@40fps both = 250ms), so the anim isn't cut short. Blast display size derives from visualRadius (`setDisplaySize(visualRadius*2, visualRadius*2)`), same convention as the existing object sprite (TICKET-023) — consistent, not overshooting. Grenade (explosion_1, 7 frames) and Land Mine (explosion_2, 10 frames) use distinct asset folders/frame counts via augment_weapon.csv, so they're genuinely different animations, not a shared sprite retinted. tsc/grep mechanical check reported clean, and no 'grenade'/'landmine' string literals appear in any .ts file — CSV data files (not .ts) are the only place those names live. One caveat worth a live-run check: visual_radius (10) is much smaller than the actual damage radius (120-180 in augment_weapon_scale.csv), so enemies killed near the edge of the blast radius may not visually overlap the small explosion sprite — but this follows the exact scaling convention the ticket mandates and inherited from TICKET-023, so it's a design-tuning risk, not a clear code defect. Can't independently confirm the two animations 'look genuinely different' on screen without a live run, but code wiring supports it correctly.

## Source reviewed
```
FILE: index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Perimeter Zero</title>
    <style>
      html, body { margin: 0; height: 100%; background: #0b0f14; overflow: hidden; }
      #app { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

FILE: package.json
```json
{
  "name": "perimeter-zero",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.87.0"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vite": "^6.0.3"
  }
}
```

FILE: plan.md
```md
# Perimeter Zero — Build Plan (Working Level)

Tracks the vertical-slice build: get one working level with the core gameplay loop playable,
before handing more feature work back to the agent pipeline. Scope is deliberately small —
prove the player can shoot, an enemy can spawn and die, and a run can be won or lost. Not the
full 10-stage / 9-weapon / 4-archetype / 2-boss vision yet — that comes after.

## Status

- **Bootstrap — done.** WASD movement, idle/walk animations, camera follow. `main` branch
  (`bbdf1dc`).
- **Aim — done, not merged.** Weapon rotates to the mouse, stays upright both sides.
  `run/brief-fix-aim` branch (`ebc8933`). Step 0 below merges this in.

## Build order

- [x] 0. Merge aim work (`run/brief-fix-aim`) into `main`
- [x] 1. Weapon fires — bullet spawns from aim direction, travels, expires
- [x] 2. One enemy — spawns, moves toward the player
- [x] 3. Bullet↔enemy collision → enemy dies
- [x] 4. Enemy↔player collision → player takes damage
- [x] 5. Player health + game-over on 0 HP
- [x] 6. Basic spawner — enemies appear on a timer
- [x] 7. Win condition (survive N seconds) + minimal HUD (health, timer)

Once 0–7 are playable end to end, resume routing well-scoped **additive** work (a second enemy
type, a second weapon, a second wave) to the agent pipeline — that's genuine incremental
extension of an established pattern, which is what it's actually good at. Foundational,
interdependent systems (this list) get hand-built.

## Next: base architecture scaffolding

The vertical slice (0–7) is playable end to end. Before routing further feature work to the
agent pipeline (local LLM), a few more foundational/reusable pieces are worth hand-building
first — UI chrome and a shared damage pattern that later content should build on top of, not
duplicate. Supersedes the old step 8 (swap in generated names) — see `brief-database.md`
instead: names/stats move into a `weapons.csv` data file rather than getting hardcoded here.

- [x] 8. Enemy health — `Enemy` gets `hp`/`takeDamage(amount)` (same shape as `Player`'s):
  deduct on hit, red tint flash, die only at 0 HP. `die()` is now private — the only way to
  kill an enemy is through `takeDamage()`. Was independent of the rest of this list — no
  dependency either way. Once both Player and Enemy share the same hp/tint/die shape, worth
  noticing whether it's worth pulling into a shared base (e.g. `Damageable`) rather than
  duplicating it again for the next enemy archetype.
- [x] 9. Reusable `Button` component — label + interactive rect/sprite + click callback.
  Shared primitive needed by both 10 and 11 below. Verified via a new dev-only kitchen sink
  page (`#kitchen` URL hash, `KitchenSinkScene.ts`) rather than wiring it into real UI yet —
  that's steps 10/11. Also extracted the preload/anim-creation code that used to be
  duplicated inline in `GameScene` into `src/content/characterAssets.ts`, shared by both
  scenes so they can't silently drift apart.
- [x] 10. Main menu scene — new `MenuScene` (Start button for now, Credits later), wired into
  `main.ts`'s scene list. Needs 9 (Button). Also becomes a required navigation *target*: 11's
  "Main Menu" button has nowhere to go until this exists.
- [x] 11. End-of-run popup — replaces the current plain "GAME OVER"/"YOU SURVIVED" text in
  `GameScene` with a proper popup: `[Restart, Main Menu]` buttons on a loss, `[Main Menu]` only
  on a win. Restart calls `this.scene.restart()` (Phaser's built-in scene reset — no separate
  state-reset system needed). Found and fixed a real bug along the way: `scene.restart()`
  re-runs `create()` but not the constructor, so `roundOver`/`enemies`/`bullets` needed an
  explicit reset in `create()` or a restarted run would inherit stale state and freeze
  immediately. Needs 9 (Button) and 10 (Main menu, as the Main-Menu button's
  target). Design the popup's content area as a generic slot (optional list of text lines
  between the message and the buttons) so a future loot/Scrap summary can drop in later as a
  content change, not a popup rewrite — no loot/economy system exists yet (GDD §7), so there's
  nothing to actually show there today.

Order: 8 is done. 9 → 10 → 11 is a hard chain — each needs the one before it.

## Known follow-ups

- **Prevent overlapping of bodies** — Player↔enemy (and eventually enemy↔enemy) currently use
  `physics.add.overlap()`, which only *detects* intersection to trigger contact damage; it
  doesn't stop the bodies from moving through each other. Rushers can walk fully on top of the
  player right now. Switch to (or add) `physics.add.collider()` so bodies physically separate,
  once it's clear how that should interact with contact-damage timing/knockback.

## Assets needed, by step

### Already have
- `public/assets/character_1/body/*` — player body: idle (6f), walk (8f); also
  death/fall/hit/jumpStart/jumpEnd/roll frames, unused so far
- `public/assets/character_1/weapon/*` — player-held gun: idle (6f), walk (8f) + unused frames

### Step 1 — Weapon fires
- Bullet sprite — **placeholder OK**: a small Phaser Graphics circle/rect for v1, doesn't
  block gameplay logic
- Muzzle flash — nice-to-have, skip for v1

### Step 2 — One enemy
- **Missing — no enemy art exists yet.** Need at least idle + move frames for one enemy.
  Recommend starting with the **rusher** archetype (already named "Gutrunner" by the content
  pipeline) — simplest behavior (walk straight at the player), best first AI test.
- If art isn't ready when this step comes up: a placeholder shape via Graphics is fine so
  logic work isn't blocked.

### Step 3 — Collision / death
- Enemy death effect — **placeholder OK** (fade/scale-down, no new art needed)
- Hit-flash on damage — free (tint flash, no asset needed)

### Steps 5–7 — Health, spawner, HUD
- No new art required — HUD (health, timer) built from Phaser text/graphics primitives

### Later (deferred until the core loop works)
- Impact/explosion VFX — sources already scouted: Kenney's All-in-1 pack (CC0, matches the
  GDD's existing art-sourcing plan), OpenGameArt Particle Pack, itch.io's CC0 explosions tag
- Real ground/level art — GDD §9 explicitly accepts flat/primitive-shape prototype visuals for
  now, so this is deliberately not blocking
- Object pooling (GDD §10) — deferred until the loop works and perf is actually a problem, not
  before. Bullets are the obvious first candidate: `fire()` currently does `new Bullet(...)`
  per shot and lets its lifespan timer call `destroy()` — at 2 shots/sec that's cheap for now,
  but should switch to a pool (reuse dead bullets instead of destroy/recreate) once fire rate
  or bullet count goes up.
```

FILE: public/data/README.md
```md
# public/data/*.csv — notes

## `level_enemies.csv`: `enemy_level` is not `level.csv`'s `id`

`level_enemies.csv`'s `enemy_level` column indexes into `enemy_scale.csv`'s own `level`
column — an enemy archetype's difficulty tier (1-5, capped by the ceiling added alongside
that CSV). It is a **completely separate namespace** from `level.csv`'s `id` column (which
stage/round number this is, 1-10). The two just happen to share the word "level". A
`level_id=3` row with `enemy_level=2` means "on stage 3, spawn this enemy at
enemy_scale.csv's tier 2" — it has nothing to do with `level.csv` row 2. (Same note lives in
`src/content/levels.ts` next to `LevelEnemySpawn`.)

## `level_enemies.csv` stage 1/2/3/10 rows are verbatim from the brief

Stages 1, 2, 3, and 10 (three rows each, rusher/swarm/tank) were copied exactly from the
brief's explicit example values — not estimated:

- Stage 1: rusher 3000/1, swarm 4000/1, tank 6000/1
- Stage 2: rusher 2800/1, swarm 3800/1, tank 5800/1
- Stage 3: rusher 2600/2, swarm 3600/2, tank 5600/1
- Stage 10: rusher 1800/5, swarm 2800/5, tank 4000/5

Stages 4-9 are placeholder interpolation between the stage 3 and stage 10 anchors per
`enemy_id`, per the brief's guidance: `spawn_rate` trends down (non-increasing) roughly
linearly, and `enemy_level` steps up roughly every 2 stages, capped at 5. Tank's
`enemy_level` intentionally lags behind rusher/swarm for a few stages since it started lower
at stage 3 (5600/1 vs. 2600/2 and 3600/2) — that's an accepted quirk of this placeholder
curve, not a balance pass.
```

FILE: public/data/augment_level.csv
```
level,exp_required
1,0
2,20
3,50
4,90
```

FILE: public/data/augment_weapon.csv
```
id,name,desc,type,visual_radius,color,explosion_color,explosion_visual_ms,asset,explosion_asset,explosion_frame_count,deploy_sfx
1,Grenade,Lobbed explosive that deals area damage,aoe_lob,10,0x88cc44,0xff8800,250,weapons/augments/grenade/grenade,vfx/explosion/explosion_1,7,grenade_lob
3,Land Mine,Placed explosive that waits before it detonates,aoe_lob,10,0x996633,0xff8800,250,weapons/augments/landmine/landmine,vfx/explosion/explosion_2,10,landmine_place
```

FILE: public/data/augment_weapon_scale.csv
```
tier_id,augment_id,parent_tier_id,name,desc,damage,radius,cooldown_ms,delay_ms,explosion_count,travels,homing,travel_speed,target_min_dist,target_max_dist
1,1,,Grenade,Lobs one explosive,30,120,2500,700,1,1,0,500,100,250
2a,1,1,Larger Grenade,Bigger blast radius,30,180,2500,700,1,1,0,500,100,250
2b,1,1,Twin Grenades,Throws two at once,30,120,2500,700,2,1,0,500,100,250
3a,1,2a,Bigger Boom,Even more damage,45,180,2500,700,1,1,0,500,100,250
3b,1,2b,Triple Threat,Throws three at once,30,120,2500,700,3,1,0,500,100,250
1,3,,Land Mine,Placed explosive that detonates after a delay,30,120,2500,2000,1,0,0,500,0,0
```

FILE: public/data/enemy.csv
```
id,name,desc,type,asset,weapon,scale,preferred_range,dash_burst_mult,dash_burst_ms,dash_cooldown_ms
rusher,Rusher,Walks straight at the player,melee,enemies/rusher,,0.16,0,0,0,0
swarm,Swarm,Flies in fast and erratic,swarm,enemies/swarm,,0.12,0,0,0,0
tank,Tank,Lumbering bruiser that shrugs off damage,melee,enemies/tank,,0.20,0,0,0,0
shooter,Shooter,Keeps its distance and fires,ranged,enemies/shooter,2,0.16,350,0,0,0
charger,Charger,Rushes in with sudden bursts of speed,melee,enemies/charger,,0.17,0,1.8,400,2200
```

FILE: public/data/enemy_scale.csv
```
enemy_id,level,damage,health,speed
rusher,1,10,20,110
rusher,2,13,25,138
rusher,3,16,31,173
rusher,4,20,39,216
rusher,5,25,49,270
swarm,1,5,10,150
swarm,2,6,13,188
swarm,3,8,16,235
swarm,4,10,20,294
swarm,5,13,25,368
tank,1,15,50,70
tank,2,19,63,88
tank,3,24,79,110
tank,4,30,99,138
tank,5,38,124,173
shooter,1,0,15,90
charger,1,18,25,140
```

FILE: public/data/level.csv
```
id,stage_name,duration,special_spawn,world_size,spawn_offset,augment_exp_min_drop,augment_exp_max_drop
1,Stage 1,60,,2000,400,3,8
2,Stage 2,70,,2200,420,4,9
3,Stage 3,80,,2400,440,4,10
4,Stage 4,90,,2600,460,5,11
5,Stage 5,100,,2800,480,5,12
6,Stage 6,110,,3000,500,6,13
7,Stage 7,120,,3200,520,6,14
8,Stage 8,130,,3400,540,7,15
9,Stage 9,140,,3600,560,7,16
10,Stage 10,150,,3800,580,8,17
```

FILE: public/data/level_enemies.csv
```
level_id,enemy_id,spawn_rate,enemy_level
1,rusher,3000,1
1,swarm,4000,1
1,tank,6000,1
1,shooter,5000,1
1,charger,5500,1
2,rusher,2800,1
2,swarm,3800,1
2,tank,5800,1
3,rusher,2600,2
3,swarm,3600,2
3,tank,5600,1
4,rusher,2500,2
4,swarm,3500,2
4,tank,5400,1
5,rusher,2400,3
5,swarm,3400,3
5,tank,5200,2
6,rusher,2200,3
6,swarm,3200,3
6,tank,5000,2
7,rusher,2100,4
7,swarm,3100,4
7,tank,4800,3
8,rusher,2000,4
8,swarm,3000,4
8,tank,4600,3
9,rusher,1900,5
9,swarm,2900,5
9,tank,4300,4
10,rusher,1800,5
10,swarm,2800,5
10,tank,4000,5
```

FILE: public/data/player_level.csv
```
level,exp,health,speed
1,0,100,260
```

FILE: public/data/player_state.json
```json
{
  "levelCompleted": 0,
  "mainWeapon": { "id": "1", "level": 1 },
  "playerLevel": 1
}
```

FILE: public/data/sfx.csv
```
event_id,wave_type,freq_start_hz,freq_end_hz,duration_ms,volume
bullet_fire,square,880,660,60,0.25
grenade_lob,triangle,300,500,150,0.3
explode,sawtooth,180,40,300,0.5
landmine_place,sine,220,220,80,0.25
enemy_hit,square,150,100,80,0.2
enemy_death,sawtooth,200,50,250,0.35
player_hit,square,120,80,120,0.4
player_death,sawtooth,220,40,500,0.5
level_up,triangle,440,880,200,0.35
round_win,triangle,523,1047,400,0.4
round_lose,sawtooth,300,80,500,0.4
ui_click,square,600,600,40,0.15
```

FILE: public/data/weapon.csv
```
id,name,desc,type,asset,lifespan_ms,weapon_scale,weapon_y_offset,muzzle_offset,bullet_scale,radius
1,Starter Gun,The sidearm you started with,main,characters/player/weapon,1200,0.1,100,45,0.012,12.288
2,Shooter Bolt,The Shooter's ranged attack,enemy,enemies/shooter,900,0.08,0,30,0.01,10
```

FILE: public/data/weapon_scale.csv
```
weapon_id,level,cost,damage,bullet_speed,fire_rate
1,1,0,10,600,2
2,1,0,8,450,1.2
```

FILE: src/content/augmentLevel.ts
```ts
import Phaser from 'phaser';
import { parseCsv } from './csv';

const AUGMENT_LEVEL_CSV_KEY = 'data_augment_level';

/** Call from a scene's preload(). */
export function preloadAugmentLevelData(scene: Phaser.Scene) {
  scene.load.text(AUGMENT_LEVEL_CSV_KEY, 'data/augment_level.csv');
}

/** Cumulative exp needed to reach `level`, or null if there's no row for it -- the curve
 * currently tops out at level 4 (see augment_level.csv), so this is a real "maxed out" case,
 * not an error. Call after preloadAugmentLevelData()'s load has completed (e.g. from create()). */
export function getAugmentLevelThreshold(scene: Phaser.Scene, level: number): number | null {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_LEVEL_CSV_KEY));
  const row = rows.find((r) => Number(r.level) === level);
  return row ? Number(row.exp_required) : null;
}
```

FILE: src/content/augments.ts
```ts
import Phaser from 'phaser';
import { parseCsv } from './csv';

const AUGMENT_WEAPON_CSV_KEY = 'data_augment_weapon';
const AUGMENT_WEAPON_SCALE_CSV_KEY = 'data_augment_weapon_scale';

/** Call from a scene's preload(). */
export function preloadAugmentData(scene: Phaser.Scene) {
  scene.load.text(AUGMENT_WEAPON_CSV_KEY, 'data/augment_weapon.csv');
  scene.load.text(AUGMENT_WEAPON_SCALE_CSV_KEY, 'data/augment_weapon_scale.csv');
}

/** Phase 2 of loading augment art (TICKET-021): the object sprite + explosion frames can't
 * be queued from preload() itself, since which images to load depends on augment_weapon.csv's
 * *parsed* rows (id/asset/explosionAsset/explosionFrameCount), and that CSV's text isn't
 * parseable until its own load (queued by preloadAugmentData() above) has completed -- i.e.
 * not until create(). Same two-phase split every other content/*.ts loader already follows
 * (preloadXData() in preload(), getX()/getAllX() reading the parsed result in create()), just
 * with an extra scene.load.start() here since these image loads are queued *after*
 * preload()'s own automatic load phase has already run to completion, so nothing would kick
 * them off otherwise. Call once from a scene's create(), after preloadAugmentData()'s CSV
 * load has completed. Loop body is identical for every augment identity -- no per-id/per-name
 * special-casing, so a new augment_weapon.csv row needs no changes here.
 *
 * TICKET-022: also registers each identity's `augment_${id}_explosion` animation once this
 * load batch's frames have actually finished loading (scene.load's own 'complete' event) --
 * anims.create() resolves each frame against the texture manager at creation time, so
 * registering before the explosion PNGs exist would bind the animation to whatever
 * placeholder/missing texture is there yet. Listener is attached before scene.load.start()
 * is called, so it can't miss the completion of the very batch queued above. */
export function loadAugmentAssets(scene: Phaser.Scene): void {
  const identities = getAllAugmentIdentities(scene);
  for (const identity of identities) {
    scene.load.image(`augment_${identity.id}_object`, `assets/${identity.asset}.png`);
    for (let i = 0; i < identity.explosionFrameCount; i++) {
      scene.load.image(
        `augment_${identity.id}_explosion_${i}`,
        `assets/${identity.explosionAsset}/explosion_${i}.png`,
      );
    }
  }
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => createAugmentExplosionAnims(scene, identities));
  scene.load.start();
}

/** Registers one `augment_${id}_explosion` animation per augment identity, built entirely
 * from parsed augment_weapon.csv data -- frame count from explosionFrameCount, frame keys
 * from the `augment_${id}_explosion_${i}` textures loadAugmentAssets() above just queued,
 * and playback speed derived from explosionVisualMs (so the anim's duration matches the
 * augment's own configured VFX duration) rather than a hardcoded constant. No branching on
 * id/name -- a new augment_weapon.csv row needs no changes here, same as the rest of this
 * file. Guards against re-registering an already-known key, same reasoning as
 * characterAssets.ts's createCharacterAnims() (anims are global across scenes/restarts, not
 * scene-scoped). */
export function createAugmentExplosionAnims(scene: Phaser.Scene, identities: AugmentIdentity[]): void {
  for (const identity of identities) {
    const key = `augment_${identity.id}_explosion`;
    if (scene.anims.exists(key)) continue;

    scene.anims.create({
      key,
      frames: Array.from({ length: identity.explosionFrameCount }, (_, i) => ({
        key: `augment_${identity.id}_explosion_${i}`,
      })),
      frameRate: identity.explosionFrameCount / (identity.explosionVisualMs / 1000),
      repeat: 0,
    });
  }
}

/** From augment_weapon.csv -- static per augment, doesn't vary by tier. */
export interface AugmentIdentity {
  id: string;
  name: string;
  desc: string;
  type: string;
  visualRadius: number;
  color: number;
  explosionColor: number;
  explosionVisualMs: number;
  /** Extension-less asset path, relative to assets/ -- an augment's object-sprite file stem
   * (image at `assets/${asset}.png`, a per-identity subfolder plus a file named after that
   * identity). Loaded by loadAugmentAssets() above as texture key `augment_${id}_object`
   * (TICKET-021). Rendered as a tinted, visualRadius-scaled Sprite (TICKET-023) -- see
   * weapons/AoeLob.ts. */
  asset: string;
  /** Folder path for the explosion VFX (e.g. "vfx/explosion/explosion_1") -- loadAugmentAssets()
   * loads `explosionFrameCount` frames from this folder as `augment_${id}_explosion_${i}`. */
  explosionAsset: string;
  explosionFrameCount: number;
  /** sfx.csv event id (see content/sfx.ts) to play the moment this augment's object is
   * thrown/placed -- e.g. a lobbed identity's throw sound vs. a placed identity's set-down
   * sound. Lives in data (augment_weapon.csv's `deploy_sfx` column) rather than a literal in
   * weapons/AoeLob.ts, which is a shared engine across every AoeLob-type augment and must
   * stay free of any per-identity branching or hardcoded sfx key names (TICKET-023 revision). */
  deploySfx: string;
}

/** From augment_weapon_scale.csv -- one node in an augment's tech tree. `parentTierId` is
 * null for the root tier (what you get on first pick); everything else's parent must be
 * picked first (see GameScene.buildAugmentChoicePool()). */
export interface AugmentTier {
  tierId: string;
  augmentId: string;
  parentTierId: string | null;
  name: string;
  desc: string;
  damage: number;
  radius: number;
  cooldownMs: number;
  delayMs: number;
  /** Type-A ("aoe_lob") shape columns -- shared shape across every augment identity of that
   * type (see brief-augment.md for the full roster and per-identity behavior differences,
   * rather than listing specific identities here). Repurposed for AoeLob-type augments to
   * mean "how many are thrown per activation" (each independently targeted), not "how many
   * explosions from one throw" -- that original meaning is still open for a future
   * non-AoeLob sibling that actually needs it. */
  explosionCount: number;
  travels: boolean;
  homing: boolean;
  travelSpeed: number;
  targetMinDist: number;
  targetMaxDist: number;
}

function toIdentity(row: Record<string, string>): AugmentIdentity {
  return {
    id: row.id,
    name: row.name,
    desc: row.desc,
    type: row.type,
    visualRadius: Number(row.visual_radius),
    color: Number(row.color),
    explosionColor: Number(row.explosion_color),
    explosionVisualMs: Number(row.explosion_visual_ms),
    asset: row.asset,
    explosionAsset: row.explosion_asset,
    explosionFrameCount: Number(row.explosion_frame_count),
    deploySfx: row.deploy_sfx,
  };
}

function toTier(row: Record<string, string>): AugmentTier {
  return {
    tierId: row.tier_id,
    augmentId: row.augment_id,
    parentTierId: row.parent_tier_id || null,
    name: row.name,
    desc: row.desc,
    damage: Number(row.damage),
    radius: Number(row.radius),
    cooldownMs: Number(row.cooldown_ms),
    delayMs: Number(row.delay_ms),
    explosionCount: Number(row.explosion_count),
    travels: row.travels === '1',
    homing: row.homing === '1',
    travelSpeed: Number(row.travel_speed),
    targetMinDist: Number(row.target_min_dist),
    targetMaxDist: Number(row.target_max_dist),
  };
}

/** Every augment's identity, in augment_weapon.csv's row order -- the full roster to build
 * the choice pool from (see GameScene.buildAugmentChoicePool()). */
export function getAllAugmentIdentities(scene: Phaser.Scene): AugmentIdentity[] {
  return parseCsv(scene.cache.text.get(AUGMENT_WEAPON_CSV_KEY)).map(toIdentity);
}

export function getAugmentTier(scene: Phaser.Scene, augmentId: string, tierId: string): AugmentTier {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_SCALE_CSV_KEY));
  const row = rows.find((r) => r.augment_id === augmentId && r.tier_id === tierId);
  if (!row) {
    throw new Error(`No augment tier "${tierId}" for augment "${augmentId}"`);
  }
  return toTier(row);
}

/** The tier you get on first picking this augment (parent_tier_id blank). */
export function getRootTier(scene: Phaser.Scene, augmentId: string): AugmentTier {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_SCALE_CSV_KEY));
  const row = rows.find((r) => r.augment_id === augmentId && !r.parent_tier_id);
  if (!row) {
    throw new Error(`No root tier for augment "${augmentId}"`);
  }
  return toTier(row);
}

/** Every tier directly unlocked by picking `parentTierId` -- empty if that tier is a leaf
 * (maxed out, nothing further to offer for this augment). */
export function getChildTiers(scene: Phaser.Scene, augmentId: string, parentTierId: string): AugmentTier[] {
  const rows = parseCsv(scene.cache.text.get(AUGMENT_WEAPON_SCALE_CSV_KEY));
  return rows
    .filter((r) => r.augment_id === augmentId && r.parent_tier_id === parentTierId)
    .map(toTier);
}
```

FILE: src/content/bgm.ts
```ts
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
```

FILE: src/content/characterAssets.ts
```ts
import Phaser from 'phaser';

// Animation frame counts per layer (see public/assets/characters/player/).
export const ANIMS: Record<'idle' | 'walk', number> = { idle: 6, walk: 8 };
export const LAYERS = ['body', 'weapon'] as const;
export const RUSHER_DEATH_FRAMES = 10;
export const TANK_DEATH_FRAMES = 10;
// shooter has real art (TICKET-018) -- same idle_0..5/walk_0..7/death_0..9 frame-count
// convention as rusher, just its own asset folder.
export const SHOOTER_DEATH_FRAMES = 10;
export const PLAYER_DEATH_FRAMES = 10;
export const SWARM_FLY_FRAMES = 6; // enemies/swarm/fly_0..5 -- one anim, no idle/walk/death split

/** Loads every player (body/weapon), rusher, swarm, tank, and shooter frame, plus the bullet
 * sprite. Shared between GameScene and KitchenSinkScene so both use the exact same texture
 * keys/anims -- one source of truth instead of two copies drifting apart. */
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

  // Tank real art (TICKET-018): tank_-prefixed keys now load from tank's own asset folder
  // instead of reusing rusher's PNG frame files. Key names/frame counts unchanged from the
  // prior (rusher-placeholder) increment, so nothing downstream (archetypes.ts,
  // createCharacterAnims below) needs to change.
  for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
    for (let i = 0; i < ANIMS[anim]; i++) {
      scene.load.image(`tank_${anim}_${i}`, `assets/enemies/tank/${anim}_${i}.png`);
    }
  }
  for (let i = 0; i < TANK_DEATH_FRAMES; i++) {
    scene.load.image(`tank_death_${i}`, `assets/enemies/tank/death_${i}.png`);
  }

  // Shooter real art (TICKET-018): shooter_-prefixed keys, own asset folder -- previously
  // didn't exist at all (Shooter had no visuals of its own before this increment).
  for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
    for (let i = 0; i < ANIMS[anim]; i++) {
      scene.load.image(`shooter_${anim}_${i}`, `assets/enemies/ranged/${anim}_${i}.png`);
    }
  }
  for (let i = 0; i < SHOOTER_DEATH_FRAMES; i++) {
    scene.load.image(`shooter_death_${i}`, `assets/enemies/ranged/death_${i}.png`);
  }

  scene.load.image('bullet', 'assets/weapons/projectiles/bullet.png');
}

/** Creates every anim key used by Player/Enemy. Must run after the matching preload.
 * Animations are global to the whole game, not per-scene (Phaser's own AnimationManager
 * docs: "Keys created in one scene can be used from any other Scene... They are not Scene
 * specific") -- they persist across scene restarts/re-entries, so re-running this on a
 * second GameScene.create() would try to recreate ~30 already-registered keys. Phaser
 * handles that non-fatally (warns and returns the existing animation), but it's needless
 * console noise every time -- skip the whole batch if it's already done. */
export function createCharacterAnims(scene: Phaser.Scene) {
  if (scene.anims.exists('body_idle')) return;

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

  for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
    scene.anims.create({
      key: `tank_${anim}`,
      frames: Array.from({ length: ANIMS[anim] }, (_, i) => ({ key: `tank_${anim}_${i}` })),
      frameRate: anim === 'walk' ? 12 : 8,
      repeat: -1,
    });
  }
  scene.anims.create({
    key: 'tank_death',
    frames: Array.from({ length: TANK_DEATH_FRAMES }, (_, i) => ({ key: `tank_death_${i}` })),
    frameRate: 15,
    repeat: 0,
  });

  for (const anim of Object.keys(ANIMS) as (keyof typeof ANIMS)[]) {
    scene.anims.create({
      key: `shooter_${anim}`,
      frames: Array.from({ length: ANIMS[anim] }, (_, i) => ({ key: `shooter_${anim}_${i}` })),
      frameRate: anim === 'walk' ? 12 : 8,
      repeat: -1,
    });
  }
  scene.anims.create({
    key: 'shooter_death',
    frames: Array.from({ length: SHOOTER_DEATH_FRAMES }, (_, i) => ({ key: `shooter_death_${i}` })),
    frameRate: 15,
    repeat: 0,
  });
}
```

FILE: src/content/csv.ts
```ts
/** Minimal CSV parser -- fixed schema, no embedded commas/quotes (see brief-database.md).
 * Returns one object per row, keyed by the header row's column names. */
export function parseCsv(raw: string): Record<string, string>[] {
  const [headerLine, ...lines] = raw.trim().split('\n');
  const headers = headerLine.split(',');

  return lines
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = cells[i] ?? '';
      });
      return row;
    });
}
```

FILE: src/content/enemies.ts
```ts
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
```

FILE: src/content/levels.ts
```ts
import Phaser from 'phaser';
import { parseCsv } from './csv';

const LEVEL_CSV_KEY = 'data_level';
const LEVEL_ENEMIES_CSV_KEY = 'data_level_enemies';

/** Call from a scene's preload(). */
export function preloadLevelData(scene: Phaser.Scene) {
  scene.load.text(LEVEL_CSV_KEY, 'data/level.csv');
  scene.load.text(LEVEL_ENEMIES_CSV_KEY, 'data/level_enemies.csv');
}

export interface ResolvedLevel {
  id: string;
  stageName: string;
  duration: number;
  specialSpawn: string;
  worldSize: number;
  spawnOffset: number;
  augmentExpMinDrop: number;
  augmentExpMaxDrop: number;
}

// Note on public/data/level_enemies.csv's `enemy_level` column: it indexes into
// enemy_scale.csv's own `level` column (an enemy archetype's difficulty tier, 1-5, capped
// by the enemy_scale.csv ceiling added alongside this data). It is NOT a reference to
// level.csv's `id` column (which stage/round this is) -- those are two unrelated numbering
// schemes that happen to share the word "level". Don't conflate a level_id=3 row's
// enemy_level=2 with "level.csv row 2".
export interface LevelEnemySpawn {
  enemyId: string;
  spawnRate: number;
  enemyLevel: number;
}

/** Call after preloadLevelData()'s load has completed (e.g. from create()). */
export function getLevel(scene: Phaser.Scene, levelId: string): ResolvedLevel {
  const rows = parseCsv(scene.cache.text.get(LEVEL_CSV_KEY));
  const row = rows.find((r) => r.id === levelId);

  if (!row) {
    throw new Error(`No level data for "${levelId}"`);
  }

  return {
    id: row.id,
    stageName: row.stage_name,
    duration: Number(row.duration),
    specialSpawn: row.special_spawn,
    worldSize: Number(row.world_size),
    spawnOffset: Number(row.spawn_offset),
    augmentExpMinDrop: Number(row.augment_exp_min_drop),
    augmentExpMaxDrop: Number(row.augment_exp_max_drop),
  };
}

/** Every enemy_id/spawn_rate/enemy_level row for this level -- level_enemies.csv is a
 * many-to-many join, so a level can list multiple enemy types at different rates and
 * (independently) different enemy_scale.csv tiers. */
export function getLevelEnemies(scene: Phaser.Scene, levelId: string): LevelEnemySpawn[] {
  const rows = parseCsv(scene.cache.text.get(LEVEL_ENEMIES_CSV_KEY));
  return rows
    .filter((r) => r.level_id === levelId)
    .map((r) => ({
      enemyId: r.enemy_id,
      spawnRate: Number(r.spawn_rate),
      enemyLevel: Number(r.enemy_level),
    }));
}
```

FILE: src/content/playerLevel.ts
```ts
import Phaser from 'phaser';
import { parseCsv } from './csv';

const PLAYER_LEVEL_CSV_KEY = 'data_player_level';

/** Call from a scene's preload(). */
export function preloadPlayerLevelData(scene: Phaser.Scene) {
  scene.load.text(PLAYER_LEVEL_CSV_KEY, 'data/player_level.csv');
}

export interface ResolvedPlayerLevel {
  level: number;
  exp: number;
  health: number;
  speed: number;
}

/** Call after preloadPlayerLevelData()'s load has completed (e.g. from create()). */
export function getPlayerLevel(scene: Phaser.Scene, level: number): ResolvedPlayerLevel {
  const rows = parseCsv(scene.cache.text.get(PLAYER_LEVEL_CSV_KEY));
  const row = rows.find((r) => Number(r.level) === level);

  if (!row) {
    throw new Error(`No player_level data for level ${level}`);
  }

  return {
    level: Number(row.level),
    exp: Number(row.exp),
    health: Number(row.health),
    speed: Number(row.speed),
  };
}
```

FILE: src/content/playerState.ts
```ts
import Phaser from 'phaser';

const PLAYER_STATE_KEY = 'data_player_state';
// localStorage key for the persisted override -- namespaced so it doesn't collide with any
// other key this page might use.
const LEVEL_COMPLETED_STORAGE_KEY = 'playerState.levelCompleted';
// Tutorial seen-flag (brief-tutorial.md) -- same localStorage pattern as levelCompleted, but
// no player_state.json fallback: unset simply means "never seen," no baked-in default makes
// sense for a one-time flag the way it does for progress. The level-1 intro dialogue has no
// equivalent flag -- it just shows every time currentLevelId === '1' (see GameScene.create()).
const AUGMENT_TUTORIAL_SEEN_KEY = 'playerState.augmentTutorialSeen';

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

/** True once the first-ever Augment choice popup has been shown, this browser. */
export function hasSeenAugmentTutorial(): boolean {
  return localStorage.getItem(AUGMENT_TUTORIAL_SEEN_KEY) === '1';
}

export function setAugmentTutorialSeen(): void {
  localStorage.setItem(AUGMENT_TUTORIAL_SEEN_KEY, '1');
}
```

FILE: src/content/sfx.ts
```ts
import Phaser from 'phaser';
import { parseCsv } from './csv';
import { playTone, ToneSpec } from './tone';

const SFX_CSV_KEY = 'data_sfx';

/** Call from a scene's preload(). No audio assets to load (SFX are synthesized, not
 * sampled -- see tone.ts) -- this just fetches the CSV text, same as every other
 * preload*Data() function in content/. */
export function preloadSfxData(scene: Phaser.Scene) {
  scene.load.text(SFX_CSV_KEY, 'data/sfx.csv');
}

let cache: Map<string, ToneSpec> | null = null;

function getSpecs(scene: Phaser.Scene): Map<string, ToneSpec> {
  if (cache) return cache;
  const rows = parseCsv(scene.cache.text.get(SFX_CSV_KEY));
  cache = new Map(
    rows.map((row) => [
      row.event_id,
      {
        waveType: row.wave_type as OscillatorType,
        freqStartHz: Number(row.freq_start_hz),
        freqEndHz: Number(row.freq_end_hz),
        durationMs: Number(row.duration_ms),
        volume: Number(row.volume),
      },
    ]),
  );
  return cache;
}

/** Plays the synthesized tone for `eventId` (see public/data/sfx.csv for the full event
 * list -- brief-sound.md). Call sites never reference a frequency/waveform directly, so
 * tuning a sound is a CSV edit only. Silently does nothing for an unknown eventId, same
 * fail-soft reasoning as tone.ts's missing-AudioContext case -- a missing sound effect
 * shouldn't be able to crash gameplay. */
export function playSfx(scene: Phaser.Scene, eventId: string): void {
  const spec = getSpecs(scene).get(eventId);
  if (!spec) return;
  playTone(scene, spec);
}
```

FILE: src/content/tone.ts
```ts
/** Procedural oscillator-based SFX synth (brief-sound.md) -- no audio files, no MIDI files,
 * just Web Audio oscillators generating short tones on the fly, the same category of
 * technique NES-era games used. Bypasses Phaser's Sound Manager entirely (it's built around
 * loading/playing pre-loaded audio assets, not synthesizing tones), reaching into the raw
 * AudioContext it exposes when running on WebAudioSoundManager (the default under
 * Phaser.AUTO/WebGL -- see main.ts). No-ops if that context isn't available (e.g. a
 * HTML5AudioSoundManager fallback) rather than throwing -- a missing sound effect is a much
 * smaller problem than a crash. */

export interface ToneSpec {
  waveType: OscillatorType;
  freqStartHz: number;
  freqEndHz: number;
  durationMs: number;
  volume: number;
}

function getAudioContext(scene: Phaser.Scene): AudioContext | null {
  const sound = scene.sound as Phaser.Sound.WebAudioSoundManager;
  return sound && sound.context ? sound.context : null;
}

/** Plays one short tone: a linear frequency slide from freqStartHz to freqEndHz over
 * durationMs (equal start/end = a flat tone), with a short envelope so it doesn't click at
 * the start or cut off audibly at the end. */
export function playTone(scene: Phaser.Scene, spec: ToneSpec): void {
  const ctx = getAudioContext(scene);
  if (!ctx) return;

  const durationSec = spec.durationMs / 1000;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = spec.waveType;
  osc.frequency.setValueAtTime(spec.freqStartHz, now);
  osc.frequency.linearRampToValueAtTime(spec.freqEndHz, now + durationSec);

  const gain = ctx.createGain();
  // Fade out over the last ~20% of the tone so it never clicks at cutoff. Fades in over a
  // few ms too (not audible as a fade, just avoids a hard edge at t=0).
  const attackSec = Math.min(0.005, durationSec * 0.1);
  const releaseStart = now + durationSec * 0.8;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(spec.volume, now + attackSec);
  gain.gain.setValueAtTime(spec.volume, releaseStart);
  gain.gain.linearRampToValueAtTime(0, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
```

FILE: src/content/weapons.ts
```ts
import Phaser from 'phaser';
import { parseCsv } from './csv';

const WEAPON_CSV_KEY = 'data_weapon';
const WEAPON_SCALE_CSV_KEY = 'data_weapon_scale';

/** Call from a scene's preload(). */
export function preloadWeaponData(scene: Phaser.Scene) {
  scene.load.text(WEAPON_CSV_KEY, 'data/weapon.csv');
  scene.load.text(WEAPON_SCALE_CSV_KEY, 'data/weapon_scale.csv');
}

export interface ResolvedWeapon {
  id: string;
  name: string;
  desc: string;
  lifespanMs: number;
  weaponScale: number;
  weaponYOffset: number;
  muzzleOffset: number;
  bulletScale: number;
  bulletRadius: number;
  damage: number;
  bulletSpeed: number;
  fireRate: number;
  cost: number;
}

/** Joins weapon.csv (identity) + weapon_scale.csv (per-level stats) by id/level. Call after
 * preloadWeaponData()'s load has completed (e.g. from create()), not from preload() itself. */
export function getWeapon(scene: Phaser.Scene, weaponId: string, level: number): ResolvedWeapon {
  const identities = parseCsv(scene.cache.text.get(WEAPON_CSV_KEY));
  const scales = parseCsv(scene.cache.text.get(WEAPON_SCALE_CSV_KEY));

  const identity = identities.find((row) => row.id === weaponId);
  const scale = scales.find((row) => row.weapon_id === weaponId && Number(row.level) === level);

  if (!identity || !scale) {
    throw new Error(`No weapon data for "${weaponId}" level ${level}`);
  }

  return {
    id: identity.id,
    name: identity.name,
    desc: identity.desc,
    lifespanMs: Number(identity.lifespan_ms),
    weaponScale: Number(identity.weapon_scale),
    weaponYOffset: Number(identity.weapon_y_offset),
    muzzleOffset: Number(identity.muzzle_offset),
    bulletScale: Number(identity.bullet_scale),
    bulletRadius: Number(identity.radius),
    damage: Number(scale.damage),
    bulletSpeed: Number(scale.bullet_speed),
    fireRate: Number(scale.fire_rate),
    cost: Number(scale.cost),
  };
}
```

FILE: src/enemies/Enemy.ts
```ts
import Phaser from 'phaser';
import { EnemyArchetype } from './archetypes';
import { playSfx } from '../content/sfx';

const HIT_FLASH_MS = 120;
const DEATH_FADE_MS = 300; // used when an archetype has no death anim (see archetypes.ts)
// Distinct from the hit-flash red (0xff3b3b) so a dash burst reads differently from taking
// damage -- reuses the same setTint/clearTint call shape as takeDamage(), just a different
// color, alongside a temporary speed multiply (see startDashCycle()).
const DASH_TINT = 0xffe066;

export interface EnemyStats {
  hp: number;
  speed: number;
  damage: number;
  scale: number;
  // Charger/shooter-only fields (enemy.csv's preferred_range/dash_burst_*/dash_cooldown_ms
  // columns, via content/enemies.ts). All default to 0 so rusher/swarm/tank's existing spawn
  // calls -- which don't set these -- are unaffected: preferredRange === 0 keeps chase() on
  // its original always-close-in behavior, and dashCooldownMs === 0 just means nothing calls
  // startDashCycle() (it isn't wired to spawning yet regardless -- see the class doc below /
  // GameScene.spawnEnemy()).
  preferredRange?: number;
  dashBurstMult?: number;
  dashBurstMs?: number;
  dashCooldownMs?: number;
  // enemy.csv's `weapon` FK -- blank for melee/swarm archetypes with no ranged attack.
  // Stored so GameScene.fireEnemyWeapon() can resolve it off the Enemy instance itself
  // (its signature only takes the Enemy, not a separately-threaded weapon id).
  weaponId?: string;
}

/**
 * Archetype-agnostic enemy: visuals (animation keys) come from EnemyArchetype, stats (hp,
 * speed, contact damage) come from enemy.csv/enemy_scale.csv via EnemyStats (see
 * content/enemies.ts and GameScene.spawnEnemy()). Adding a new archetype means a new CSV row
 * + an archetypes.ts entry, not a new Enemy subclass -- see workspace/onslaught/plan.md.
 *
 * `preferredRange` (chase() stand-off) and the dash-burst cycle (startDashCycle()) are the
 * two core behaviors for ranged/charger-style archetypes, wired to spawning by
 * GameScene.spawnEnemy() (TICKET-017). `weaponId` (see EnemyStats) is read by
 * GameScene.fireEnemyWeapon() to arm a ranged enemy's fire timer.
 */
export class Enemy extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private pbody!: Phaser.Physics.Arcade.Body;
  private anim: 'idle' | 'move' = 'idle';
  private dying = false;
  private hp: number;
  private speed: number;
  // Undashed speed -- startDashCycle() multiplies/reverts this.speed against this baseline
  // rather than dividing back by dashBurstMult, so a revert is always exact regardless of
  // rounding.
  private readonly baseSpeed: number;
  private readonly preferredRange: number;
  private readonly dashBurstMult: number;
  private readonly dashBurstMs: number;
  private readonly dashCooldownMs: number;
  /** Contact damage dealt to the player on touch -- read by GameScene's player-enemy overlap. */
  readonly damage: number;
  /** enemy.csv's `weapon` FK, blank if this archetype doesn't fire a weapon -- read by
   * GameScene.fireEnemyWeapon() to resolve the weapon's stats. */
  readonly weaponId: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private archetype: EnemyArchetype,
    stats: EnemyStats,
  ) {
    super(scene, x, y);
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.baseSpeed = stats.speed;
    this.damage = stats.damage;
    this.preferredRange = stats.preferredRange ?? 0;
    this.dashBurstMult = stats.dashBurstMult ?? 0;
    this.dashBurstMs = stats.dashBurstMs ?? 0;
    this.dashCooldownMs = stats.dashCooldownMs ?? 0;
    this.weaponId = stats.weaponId ?? '';

    this.bodySprite = scene.add.sprite(0, 0, archetype.initialTexture).setScale(stats.scale);
    this.add(this.bodySprite);
    this.setSize(110, 150);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.pbody = this.body as Phaser.Physics.Arcade.Body;

    this.bodySprite.play(archetype.idleAnim);
  }

  /** Deducts hp and flashes red; dies only once hp reaches 0. */
  takeDamage(amount: number) {
    if (this.dying) return;
    this.hp = Math.max(0, this.hp - amount);

    if (this.hp === 0) {
      this.die();
      return;
    }

    this.bodySprite.setTint(0xff3b3b);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.bodySprite.clearTint());
    playSfx(this.scene, 'enemy_hit');
  }

  /** Plays the death anim if the archetype has one, otherwise fades out -- either way,
   * destroys the container once it finishes. */
  private die() {
    if (this.dying) return;
    this.dying = true;
    this.pbody.setVelocity(0, 0);
    this.pbody.enable = false;
    this.bodySprite.clearTint();
    playSfx(this.scene, 'enemy_death');

    if (this.archetype.deathAnim) {
      this.bodySprite.once('animationcomplete', () => this.destroy());
      this.bodySprite.play(this.archetype.deathAnim);
    } else {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0,
        duration: DEATH_FADE_MS,
        onComplete: () => this.destroy(),
      });
    }
  }

  /** True once this enemy has begun its death sequence -- same flag chase() checks before
   * moving. Exposed so GameScene.fireEnemyWeapon()'s fire-timer callback can stop spawning
   * new bullets the instant death starts, even though that timer isn't gated by the
   * enemies[] list the way chase()'s per-frame loop is. */
  isDying(): boolean {
    return this.dying;
  }

  /** Steers straight toward (targetX, targetY) -- e.g. the player's position. Ranged/charger
   * archetypes with a preferredRange > 0 (see EnemyStats) hold station instead of closing
   * the last of the distance once within that range -- everything else (preferredRange === 0,
   * i.e. every archetype so far) keeps the original always-close-in behavior untouched. */
  chase(targetX: number, targetY: number) {
    if (this.dying) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.preferredRange > 0 && dist <= this.preferredRange) {
      this.pbody.setVelocity(0, 0);
      this.setAnim('idle');
      return;
    }

    if (dist > 4) {
      const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.speed);
      this.pbody.setVelocity(v.x, v.y);
      this.bodySprite.setFlipX(dx < 0);
      this.setAnim('move');
    } else {
      this.pbody.setVelocity(0, 0);
      this.setAnim('idle');
    }
  }

  /** Arms a repeating dash-burst cycle: every dashCooldownMs, tints the sprite (distinct
   * from the hit-flash color) and multiplies this.speed by dashBurstMult for dashBurstMs,
   * then reverts both tint and speed. Purely a self-contained speed/visual modifier --
   * chase() just reads whatever this.speed currently is, so a burst in progress
   * transparently speeds up the existing chase (or stand-off) motion. Called by
   * GameScene.spawnEnemy() for any archetype whose dashBurstMult > 0 (e.g. charger). */
  startDashCycle() {
    this.scene.time.addEvent({
      delay: this.dashCooldownMs,
      loop: true,
      callback: () => {
        if (this.dying) return;
        this.bodySprite.setTint(DASH_TINT);
        this.speed = this.baseSpeed * this.dashBurstMult;
        this.scene.time.delayedCall(this.dashBurstMs, () => {
          if (this.dying) return;
          this.bodySprite.clearTint();
          this.speed = this.baseSpeed;
        });
      },
    });
  }

  private setAnim(anim: 'idle' | 'move') {
    if (this.anim === anim) return;
    this.anim = anim;
    this.bodySprite.play(anim === 'idle' ? this.archetype.idleAnim : this.archetype.moveAnim);
  }
}
```

FILE: src/enemies/archetypes.ts
```ts
export interface EnemyArchetype {
  initialTexture: string;
  idleAnim: string;
  moveAnim: string;
  /** No death anim -- die() fades the sprite out instead (see plan.md: "placeholder OK"). */
  deathAnim?: string;
  // No `scale` here -- it lives in enemy.csv now (see content/enemies.ts's ResolvedEnemy),
  // passed through EnemyStats.scale, so it isn't a second disconnected source of the value.
}

/** Keyed by enemy.csv's `id`. Enemy itself is archetype-agnostic (see Enemy.ts) -- this is the
 * only place that needs editing to add a new archetype's visuals. */
export const ENEMY_ARCHETYPES: Record<string, EnemyArchetype> = {
  rusher: {
    initialTexture: 'rusher_idle_0',
    idleAnim: 'rusher_idle',
    moveAnim: 'rusher_walk',
    deathAnim: 'rusher_death',
  },
  swarm: {
    // Single fly anim, no idle/walk/death split -- enemies/swarm/fly_0..5 is all there is.
    initialTexture: 'swarm_fly_0',
    idleAnim: 'swarm_fly',
    moveAnim: 'swarm_fly',
  },
  tank: {
    // Real tank art (TICKET-018): characterAssets.ts's preloadCharacterAssets() loads
    // tank_idle_0..5/tank_walk_0..7/tank_death_0..9 from assets/enemies/tank/*.png, and
    // createCharacterAnims() registers the tank_idle/tank_walk/tank_death anim keys
    // referenced below -- same tank_-prefixed key names as the previous placeholder
    // increment, just pointed at tank's own asset folder now.
    initialTexture: 'tank_idle_0',
    idleAnim: 'tank_idle',
    moveAnim: 'tank_walk',
    deathAnim: 'tank_death',
  },
  // Shooter (TICKET-018): real art. characterAssets.ts loads shooter_idle_0..5/
  // shooter_walk_0..7/shooter_death_0..9 from assets/enemies/ranged/*.png (same frame-count
  // convention as rusher) -- no longer reusing rusher's placeholder texture/anim keys.
  shooter: {
    initialTexture: 'shooter_idle_0',
    idleAnim: 'shooter_idle',
    moveAnim: 'shooter_walk',
    deathAnim: 'shooter_death',
  },
  // Charger (TICKET-017): behavior is real (dash-burst cycle -- see Enemy.ts/
  // GameScene.spawnEnemy()), but has no art of its own yet. Still reuses rusher's
  // already-loaded texture/anim keys as a placeholder -- out of scope for TICKET-018, which
  // only swaps Shooter and Tank.
  charger: {
    initialTexture: 'rusher_idle_0',
    idleAnim: 'rusher_idle',
    moveAnim: 'rusher_walk',
    deathAnim: 'rusher_death',
  },
};
```

FILE: src/main.ts
```ts
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { KitchenSinkScene } from './scenes/KitchenSinkScene';

// #kitchen boots straight into the dev-only component reference page instead of the game.
// Otherwise boot into the menu (first in the array) -- Start takes you into GameScene.
const scenes = window.location.hash === '#kitchen' ? [KitchenSinkScene] : [MenuScene, GameScene];

const config: Phaser.Types.Core.GameConfig = {
  // AUTO (WebGL, falling back to Canvas): sprite tint (setTint/setTintFill) is a WebGL
  // shader feature and is a total no-op under Phaser's Canvas 2D renderer -- confirmed via
  // CanvasRenderer's batchSprite, which never reads sprite.tint at all. Canvas was pinned
  // briefly as a workaround for a sandboxed dev-preview tool hitting a WebGL framebuffer
  // error; that tool isn't the target environment, so it's not worth losing tint over.
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0f14',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: scenes,
};

const game = new Phaser.Game(config);

// Dev-only state hook for the adversarial QA agent (ai_studio/adversarial_qa/) -- same
// import.meta.env.DEV gate DevLog already uses. No production impact.
if (import.meta.env.DEV) (window as any).__qaGame = game;
```

FILE: src/player/Player.ts
```ts
import Phaser from 'phaser';
import { Bullet } from '../weapons/Bullet';
import { playSfx } from '../content/sfx';

const SCALE = 0.16;     // 2048px source frames -> ~a game-sized character -- player's own body,
                         // not weapon-specific, so stays fixed here rather than in weapon.csv

const INVULN_MS = 500; // grace window after a hit so touching an enemy doesn't melt HP per-frame
const HIT_FLASH_MS = 120;

export interface PlayerConfig {
  // From player_level.csv (see content/playerLevel.ts).
  maxHp: number;
  speed: number;
  // From weapon.csv/weapon_scale.csv, resolved via the equipped weapon in player_state.json
  // (see content/weapons.ts).
  fireRate: number; // shots/sec
  bulletSpeed: number;
  bulletLifespanMs: number;
  weaponScale: number;
  weaponYOffset: number;
  muzzleOffset: number;
  bulletScale: number;
  bulletRadius: number;
  /** Damage dealt by bullets this weapon fires -- stamped onto each Bullet at construction
   * (see Bullet.damage) so GameScene's overlap can read it off the bullet instead of a
   * scene-level field. */
  damage: number;
  onFire?: (bullet: Bullet) => void;
  onDeath?: () => void;
}

/**
 * Layered player rig: body + weapon are two pixel-aligned sprites in one
 * Container, playing idle/walk in sync. Movement is Arcade-physics velocity;
 * animation state is derived from that velocity. Kept self-contained so
 * weapons/enemies can extend it later (GDD §13).
 */
export class Player extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private weaponSprite: Phaser.GameObjects.Sprite;
  private pbody!: Phaser.Physics.Arcade.Body;
  private anim: 'idle' | 'walk' = 'idle';
  private targetPos = new Phaser.Math.Vector2();
  private aimAngle = 0;

  private maxHp: number;
  private speed: number;
  private bulletSpeed: number;
  private bulletLifespanMs: number;
  private muzzleOffset: number;
  private bulletScale: number;
  private bulletRadius: number;
  private bulletDamage: number;
  private onFire?: (bullet: Bullet) => void;
  private onDeath?: () => void;

  private hp: number;
  private invulnerableUntil = 0;

  private dead = false;
  // Set on a win (round ends without the player dying) -- unlike `dead`, no death anim/callback.
  private frozen = false;
  // Set/cleared via pause()/resume() -- distinct from `frozen` (which is permanent, win-only).
  // Only gates fire() for now (see TICKET-005); move() is intentionally untouched.
  private paused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: PlayerConfig) {
    super(scene, x, y);
    this.maxHp = config.maxHp;
    this.speed = config.speed;
    this.bulletSpeed = config.bulletSpeed;
    this.bulletLifespanMs = config.bulletLifespanMs;
    this.muzzleOffset = config.muzzleOffset;
    this.bulletScale = config.bulletScale;
    this.bulletRadius = config.bulletRadius;
    this.bulletDamage = config.damage;
    this.onFire = config.onFire;
    this.onDeath = config.onDeath;
    this.hp = this.maxHp;

    this.bodySprite = scene.add.sprite(0, 0, 'body_idle_0').setScale(SCALE);
    // weapon frames are pre-shifted (see public/assets/README) so the grip sits at each
    // frame's canvas center -- default origin (0.5, 0.5) is correct. Position dropped to
    // roughly hand height (weaponYOffset, from weapon.csv); the grip stays the rotation
    // pivot either way.
    this.weaponSprite = scene.add
      .sprite(0, config.weaponYOffset, 'weapon_idle_0')
      .setScale(config.weaponScale);
    this.add([this.bodySprite, this.weaponSprite]);
    this.setSize(110, 150); // physics body footprint

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.pbody = this.body as Phaser.Physics.Arcade.Body;
    this.pbody.setCollideWorldBounds(true);

    this.bodySprite.play('body_idle');
    this.weaponSprite.play('weapon_idle');

    // Container isn't part of the display list's own update cycle, hence hooking the
    // scene's update event directly instead -- but that means it's a manually-registered
    // listener, not something Phaser cleans up automatically alongside this GameObject's
    // own destroy. Without the matching .off() below, a torn-down scene (any scene.restart(),
    // not just death/win) leaves this listener attached; it keeps firing update() against a
    // GameObject whose own `this.scene` is already gone, throwing on the first `this.scene.
    // cameras` read. Captures `scene` (the constructor param) rather than `this.scene` for
    // the .off() call, since `this.scene` itself may already be cleared by the time DESTROY
    // fires.
    scene.events.on('update', this.update, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off('update', this.update, this);
    });
    const fireIntervalMs = 1000 / config.fireRate;
    scene.time.addEvent({ delay: fireIntervalMs, loop: true, callback: () => this.fire() });
  }

  /** Stops shooting/moving/aiming without playing the death anim -- for a win, not a loss. */
  freeze() {
    this.frozen = true;
    this.pbody.setVelocity(0, 0);
  }

  /** Gates fire() only (see fire()'s guard). Distinct from `frozen`, which is permanent and
   * win-only -- this is meant to be toggled on/off (see resume()). */
  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  private fire() {
    if (this.dead || this.frozen || this.paused) return;
    // Spawn from the actual muzzle, not the player's center: weapon pivot (player pos +
    // weapon's local offset) pushed forward along the weapon's current rendered rotation
    // (not the raw aimAngle -- that lags behind via the lerp smoothing in update()).
    const pivotX = this.x + this.weaponSprite.x;
    const pivotY = this.y + this.weaponSprite.y;
    const rot = this.weaponSprite.rotation;
    const muzzleX = pivotX + Math.cos(rot) * this.muzzleOffset;
    const muzzleY = pivotY + Math.sin(rot) * this.muzzleOffset;
    const bullet = new Bullet(this.scene, muzzleX, muzzleY, {
      angle: rot,
      speed: this.bulletSpeed,
      lifespanMs: this.bulletLifespanMs,
      scale: this.bulletScale,
      radius: this.bulletRadius,
      damage: this.bulletDamage,
    });
    this.onFire?.(bullet);
    playSfx(this.scene, 'bullet_fire');
  }

  getHp() {
    return this.hp;
  }

  getMaxHp() {
    return this.maxHp;
  }

  /** Contact damage from an enemy. Ignored while within the post-hit invuln window,
   * so standing inside an enemy doesn't drain HP every physics step. Also ignores a
   * non-positive amount outright (before touching invulnerableUntil at all) -- some
   * archetypes (e.g. Shooter, enemy_scale.csv: damage=0) deal zero contact damage by
   * design, relying purely on their ranged attack instead. Without this guard, a
   * zero-damage "hit" from an enemy standing/overlapping next to the player still
   * re-armed the same 500ms invuln window real contact damage uses, plus fired the hit
   * flash/SFX for no actual damage -- e.g. a Shooter overlapping the player could
   * silently eat a Rusher's real contact damage by continuously refreshing invulnerableUntil,
   * which is exactly the "identical contact-damage timing" regression this ticket's QA
   * pass exists to catch. */
  takeDamage(amount: number) {
    if (this.dead) return;
    if (amount <= 0) return;
    const now = this.scene.time.now;
    if (now < this.invulnerableUntil) return;
    this.invulnerableUntil = now + INVULN_MS;
    this.hp = Math.max(0, this.hp - amount);

    // setTint (multiply blend, needs WebGL -- see main.ts) keeps the sprite's own shading
    // visible under the red, unlike setTintFill's flat solid-color silhouette.
    this.bodySprite.setTint(0xff3b3b);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.bodySprite.clearTint());

    // No HUD yet (step 7) -- console is the only feedback for now besides the flash.
    console.log(`player hp: ${this.hp}`);

    if (this.hp === 0) {
      this.dead = true;
      this.pbody.setVelocity(0, 0);
      this.weaponSprite.setVisible(false); // no death frames for the weapon layer
      this.bodySprite.clearTint();
      this.bodySprite.play('body_death');
      playSfx(this.scene, 'player_death');
      this.onDeath?.();
    } else {
      playSfx(this.scene, 'player_hit');
    }
  }

  update(_time: number, _delta: number) {
    if (this.dead || this.frozen) return;
    this.scene.cameras.main.getWorldPoint(this.scene.input.activePointer!.x, this.scene.input.activePointer!.y, this.targetPos);
    this.bodySprite.flipX = this.targetPos.x < this.x;

    // Calculate weapon pivot world position
    const pivotX = this.x + this.weaponSprite.x;
    const pivotY = this.y + this.weaponSprite.y;

    // Calculate angle from pivot to pointer
    const dx = this.targetPos.x - pivotX;
    const dy = this.targetPos.y - pivotY;
    const angle = Math.atan2(dy, dx);
    this.aimAngle = angle;

    // Smooth 360° rotation — interpolate across ±π boundary to prevent snapping
    this.weaponSprite.rotation = this.lerpAngle(this.weaponSprite.rotation, angle, 0.15);
    // mirror the weapon vertically when aiming left so it never renders upside-down
    this.weaponSprite.setFlipY(Math.abs(angle) > Math.PI / 2);
  }

  private lerpAngle(current: number, target: number, t: number): number {
    let diff = target - current;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return current + diff * t;
  }

  private setAnim(anim: 'idle' | 'walk') {
    if (this.anim === anim) return;
    this.anim = anim;
    this.bodySprite.play(`body_${anim}`);
    // this.weaponSprite.play(`weapon_${anim}`);
  }

  /** input: {x,y} each in {-1,0,1} from WASD. */
  move(input: { x: number; y: number }) {
    if (this.dead || this.frozen) {
      this.pbody.setVelocity(0, 0);
      return;
    }
    const v = new Phaser.Math.Vector2(input.x, input.y);
    if (v.lengthSq() > 0) {
      v.normalize().scale(this.speed); // normalize -> no faster diagonals
      this.setAnim('walk');
      if (input.x !== 0) {
        const flip = input.x < 0;
        this.bodySprite.setFlipX(flip);
        // Weapon rotation is now handled by cursor tracking
      }
    } else {
      this.setAnim('idle');
    }
    this.pbody.setVelocity(v.x, v.y);
  }
}
```

FILE: src/scenes/GameScene.ts
```ts
import Phaser from 'phaser';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { Bullet } from '../weapons/Bullet';
import { AoeLob } from '../weapons/AoeLob';
import { preloadCharacterAssets, createCharacterAnims } from '../content/characterAssets';
import { GameEndPopup } from '../ui/GameEndPopup';
import { LevelCompletePopup } from '../ui/LevelCompletePopup';
import { IntroDialoguePopup } from '../ui/IntroDialoguePopup';
import { AugmentChoicePopup } from '../ui/AugmentChoicePopup';
import { DevLog } from '../ui/DevLog';
import { preloadWeaponData, getWeapon } from '../content/weapons';
import {
  preloadPlayerState,
  getPlayerState,
  getLevelCompleted,
  setLevelCompleted,
  hasSeenAugmentTutorial,
  setAugmentTutorialSeen,
} from '../content/playerState';
import { preloadLevelData, getLevel, getLevelEnemies } from '../content/levels';
import { preloadEnemyData, getEnemy } from '../content/enemies';
import { preloadPlayerLevelData, getPlayerLevel } from '../content/playerLevel';
import {
  preloadAugmentData,
  loadAugmentAssets,
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

// enemy.csv's weapon FKs are always resolved at this weapon_scale.csv level -- enemy
// difficulty scales via enemy_scale.csv's own `level` column (a separate namespace, see
// content/levels.ts's LevelEnemySpawn doc), not via the weapon's level.
const ENEMY_WEAPON_LEVEL = 1;

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
  // Enemy-fired bullets (e.g. Shooter's ranged attack, see fireEnemyWeapon()), tracked
  // separately from the player's own -- needs its own overlap handler targeting the player
  // rather than enemies. Same push/splice-on-DESTROY pattern as `bullets`/`enemies` -- see
  // trackEnemyBullet()/trackEnemy() below.
  private enemyBullets: Bullet[] = [];
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
  // see content/weapons.ts and content/playerState.ts. Passed into Player as its bullets'
  // damage (see Player's `damage` config field / Bullet.damage) -- overlap callbacks read
  // damage off the bullet itself now, not this field.
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
    this.enemyBullets = [];
    this.roundOver = false;
    this.paused = false;
    this.augmentExp = 0;
    this.augmentLevel = 1;
    this.ownedAugments = new Map();

    const nextLevelId = getLevelCompleted(this) + 1;
    this.currentLevelId = String(nextLevelId <= 0 ? 1 : nextLevelId);

    createCharacterAnims(this);

    // TICKET-021: augment object sprite + explosion frames can only be queued once
    // augment_weapon.csv's text load (preloadAugmentData(), preload()) has been parsed --
    // that's not until now. Kicks off its own load phase (scene.load.start()); nothing here
    // blocks on it finishing, since no rendering reads these textures yet.
    loadAugmentAssets(this);

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
      damage: this.bulletDamage,
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
      (enemyObj as Enemy).takeDamage((bulletObj as Bullet).damage);
    });
    this.physics.add.overlap(this.player, this.enemies, (_playerObj, enemyObj) => {
      this.player.takeDamage((enemyObj as Enemy).damage);
    });
    // Shooter (and any future ranged archetype) pushes its fired bullets into `enemyBullets`
    // via fireEnemyWeapon() -> trackEnemyBullet() below.
    this.physics.add.overlap(this.player, this.enemyBullets, (_playerObj, bulletObj) => {
      (bulletObj as Bullet).destroy();
      this.player.takeDamage((bulletObj as Bullet).damage);
    });

    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;

    this.hudText = this.add
      .text(16, 16, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(1000);

    const { width, height } = this.cameras.main;

    // Control hint (brief-tutorial.md): level-scoped, not seen-flag-gated -- a player who
    // quits mid-level-1 and comes back should still see it, unlike the one-time intro dialogue
    // below.
    if (this.currentLevelId === '1') {
      this.add
        .text(width / 2, height - 24, 'WASD to move  ·  Mouse to aim & fire', {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#9fb3c8',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1000);
    }

    if (import.meta.env.DEV) {
      this.devLog = new DevLog(this);
    }

    // Intro dialogue (brief-tutorial.md): shows every time level 1 starts (no seen-flag --
    // simpler, and level 1 is the tutorial stage regardless of whether this browser's seen it
    // before), before the round timer starts, so a player doesn't lose survive-timer seconds
    // to reading it. Gates on `this.paused` (already checked by spawnEnemy()/update()'s
    // early-return) and the player's own separate paused flag (its auto-fire timer isn't
    // gated by GameScene.paused -- see brief-pause-bug.md), same pattern openAugmentChoice()
    // uses, just with nothing yet in physics motion at level start to also need
    // physics.pause() for.
    if (this.currentLevelId === '1') {
      this.paused = true;
      this.player.pause();
      const intro = new IntroDialoguePopup(this, width / 2, height / 2, {
        onDismiss: () => {
          intro.destroy();
          this.paused = false;
          this.player.resume();
          this.roundStartTime = this.time.now;
        },
      }).setDepth(1000);
    } else {
      this.roundStartTime = this.time.now;
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

  /** Survived the timer. Stages 1-9: freeze the world and show a "Level Complete" popup
   * (stage clears keep the run going, so a different message/button than GameEndPopup's
   * win/loss framing) -- persisting progress and actually advancing into the next stage
   * only happens once the player clicks Next (see showLevelComplete() below). Stage 10
   * (the final stage): unchanged -- show the win popup via endRound(true), no persistence
   * beyond stage 10. */
  private win() {
    if (this.currentLevelId !== FINAL_LEVEL_ID) {
      this.showLevelComplete();
      return;
    }
    this.endRound(true);
  }

  /** Freeze-and-popup twin of endRound(), for a mid-run stage clear rather than the run
   * actually ending. Same roundOver guard for the same reason endRound() sets it --
   * trackEnemy()'s DESTROY listener relies on roundOver to tell "the scene is tearing down"
   * apart from a real kill; without it, the eventual scene.restart() (from the popup's Next
   * button) destroys every remaining live enemy and each DESTROY fires awardAugmentExp() ->
   * logDev() against an already-destroyed Text object mid-teardown. */
  private showLevelComplete() {
    if (this.roundOver) return;
    this.roundOver = true;
    this.player.freeze();
    this.physics.pause();
    playSfx(this, 'round_win');

    const clearedLevelId = this.currentLevelId;
    const { width, height } = this.cameras.main;
    new LevelCompletePopup(this, width / 2, height / 2, {
      levelId: clearedLevelId,
      onNext: () => {
        setLevelCompleted(Number(clearedLevelId));
        this.currentLevelId = String(Number(clearedLevelId) + 1);
        this.scene.restart();
      },
    }).setDepth(1000);
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
   * an archetypes.ts entry, not a new spawn* method. preferredRange/dashBurst* are passed
   * through for every archetype (defaulting to enemy.csv's 0 for rusher/swarm/tank, so their
   * behavior is unchanged); startDashCycle() only actually runs for archetypes whose
   * dashBurstMult > 0 (e.g. charger), and fireEnemyWeapon() only arms for archetypes with a
   * non-blank weapon FK (e.g. shooter). */
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
    const enemy = new Enemy(this, x, y, archetype, {
      hp: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      scale: stats.scale,
      preferredRange: stats.preferredRange,
      dashBurstMult: stats.dashBurstMult,
      dashBurstMs: stats.dashBurstMs,
      dashCooldownMs: stats.dashCooldownMs,
      weaponId: stats.weapon,
    });
    this.trackEnemy(enemy);

    if (stats.dashBurstMult > 0) {
      enemy.startDashCycle();
    }
    if (stats.weapon) {
      this.fireEnemyWeapon(enemy);
    }
  }

  /** Arms a repeating fire timer for a ranged enemy (non-blank enemy.csv `weapon` FK, e.g.
   * shooter) -- interval is `1000 / fireRate`, same derivation Player.ts's constructor uses
   * for the player's own auto-fire. Each tick spawns a Bullet at the enemy's current position
   * aimed at the player's current position (not a fixed angle at spawn time -- the player
   * moves), carrying the resolved weapon's damage, and tracks it into `enemyBullets` so the
   * player-vs-enemyBullets overlap (see create()) can damage the player on hit. Stops
   * spawning new bullets once the enemy is dying (same `dying` guard chase() checks), and the
   * timer itself is torn down once the enemy is actually destroyed. */
  private fireEnemyWeapon(enemy: Enemy) {
    const weapon = getWeapon(this, enemy.weaponId, ENEMY_WEAPON_LEVEL);
    const fireIntervalMs = 1000 / weapon.fireRate;

    const timer = this.time.addEvent({
      delay: fireIntervalMs,
      loop: true,
      callback: () => {
        if (enemy.isDying()) return;
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const bullet = new Bullet(this, enemy.x, enemy.y, {
          angle,
          speed: weapon.bulletSpeed,
          lifespanMs: weapon.lifespanMs,
          scale: weapon.bulletScale,
          radius: weapon.bulletRadius,
          damage: weapon.damage,
        });
        this.trackEnemyBullet(bullet);
      },
    });

    enemy.once(Phaser.GameObjects.Events.DESTROY, () => timer.remove());
  }

  /** Fires one activation of an AoeLob-type Augment: tier.explosionCount independently
   * targeted AoeLob instances (see pickAoeLobTargets()), using identity for visuals/sfx and
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
        textureKey: `augment_${identity.id}_object`,
        visualRadius: identity.visualRadius,
        color: identity.color,
        explosionColor: identity.explosionColor,
        explosionVisualMs: identity.explosionVisualMs,
        explosionTextureKey: `augment_${identity.id}_explosion_0`,
        explosionAnimKey: `augment_${identity.id}_explosion`,
        deploySfx: identity.deploySfx,
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

  /** Same push/splice-on-DESTROY pattern as trackBullet(), for enemy-fired bullets (see
   * fireEnemyWeapon()) -- kept as a separate array/method since it backs the
   * player-vs-enemyBullets overlap rather than the bullets-vs-enemies one. */
  private trackEnemyBullet(bullet: Bullet) {
    this.enemyBullets.push(bullet);
    bullet.once(Phaser.GameObjects.Events.DESTROY, () => {
      const i = this.enemyBullets.indexOf(bullet);
      if (i !== -1) this.enemyBullets.splice(i, 1);
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

    const showTutorialHint = !hasSeenAugmentTutorial();
    setAugmentTutorialSeen();

    const { width, height } = this.cameras.main;
    const popup = new AugmentChoicePopup(this, width / 2, height / 2, {
      hintLines: showTutorialHint
        ? ['Pick an augment to back you up — new firepower, permanent for this run.']
        : undefined,
      options: choices.map((choice) => ({
        name: choice.tier.name,
        desc: choice.tier.desc,
        damage: choice.tier.damage,
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
```

FILE: src/scenes/KitchenSinkScene.ts
```ts
import Phaser from 'phaser';
import { preloadCharacterAssets, createCharacterAnims } from '../content/characterAssets';
import { Button } from '../ui/Button';
import { GameEndPopup } from '../ui/GameEndPopup';

const REPLAY_DELAY_MS = 600; // pause before replaying a one-shot (death) anim, so it's watchable
const SCROLL_BOTTOM_PADDING = 40;

/**
 * Dev-only visual reference page for every reusable component/asset in the game -- no
 * gameplay, nothing needs to happen (take damage, survive a timer) to see what something
 * looks like. Reached via the #kitchen URL hash (see main.ts); not part of the game's own
 * scene flow.
 */
export class KitchenSinkScene extends Phaser.Scene {
  private cursorY = 24;
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('kitchen-sink');
  }

  preload() {
    preloadCharacterAssets(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f14');
    createCharacterAnims(this);

    // Everything below is added into this one container so scrolling (below) can move it as
    // a block by setting its y -- Button forces scrollFactor(0) on itself (correct for real
    // UI use: HUD/menu/popup are screen-fixed), so camera-scroll-based scrolling would leave
    // the button demo stuck on screen while the rest of the page moved past it. Moving a
    // container's own position isn't affected by its children's scrollFactor, so this avoids
    // that conflict entirely.
    this.content = this.add.container(0, 0);

    this.text(24, this.cursorY, 'Kitchen Sink', 28, '#ffffff', true);
    this.cursorY += 56;

    this.section('UI — Button');
    this.content.add(
      new Button(this, 140, this.cursorY + 28, 'Button', () =>
        console.log('kitchen sink: button clicked'),
      ),
    );
    this.cursorY += 96;

    this.section('UI — GameEndPopup (extends Popup)');
    this.content.add(
      new GameEndPopup(this, 230, this.cursorY + 160, {
        won: false,
        onRestart: () => console.log('kitchen sink: restart clicked'),
        onMainMenu: () => console.log('kitchen sink: main menu clicked'),
      }),
    );
    this.content.add(
      new GameEndPopup(this, 690, this.cursorY + 160, {
        won: true,
        onRestart: () => console.log('kitchen sink: restart clicked'),
        onMainMenu: () => console.log('kitchen sink: main menu clicked'),
      }),
    );
    this.cursorY += 340;

    this.section('Character — Body');
    this.spriteDemo(100, 'body_idle_0', 'body_idle', 0.09, 'idle');
    this.spriteDemo(280, 'body_walk_0', 'body_walk', 0.09, 'walk');
    this.spriteDemo(460, 'body_death_0', 'body_death', 0.09, 'death', true);
    this.cursorY += 200;

    this.section('Character — Weapon');
    this.spriteDemo(100, 'weapon_idle_0', 'weapon_idle', 0.07, 'idle');
    this.spriteDemo(280, 'weapon_walk_0', 'weapon_walk', 0.07, 'walk (disabled in-game, see Player.ts)');
    this.cursorY += 200;

    this.section('Enemy — Rusher');
    this.spriteDemo(100, 'rusher_idle_0', 'rusher_idle', 0.09, 'idle');
    this.spriteDemo(280, 'rusher_walk_0', 'rusher_walk', 0.09, 'walk');
    this.spriteDemo(460, 'rusher_death_0', 'rusher_death', 0.09, 'death', true);
    this.cursorY += 200;

    this.section('Enemy — Swarm');
    // Only one anim exists (fly_0..5) -- no idle/walk/death split, no death art (see
    // enemies/archetypes.ts: die() fades out instead of playing a death anim).
    this.spriteDemo(100, 'swarm_fly_0', 'swarm_fly', 0.07, 'fly (idle + move + death fallback)');
    this.cursorY += 200;

    this.section('Weapons — Bullet');
    // Shown larger than its actual in-game scale (0.012, ~24px) so it's visible here.
    this.spriteDemo(100, 'bullet', null, 0.04, 'actual in-game size is much smaller');
    this.cursorY += 200;

    this.section('HUD text style');
    this.text(100, this.cursorY, 'HP: 73/100    Time: 47s', 20, '#ffffff');
    this.cursorY += 60;

    this.section('End-of-run message styles');
    this.text(100, this.cursorY, 'GAME OVER', 32, '#ff3b3b', true);
    this.text(320, this.cursorY, 'YOU SURVIVED', 32, '#4ade80', true);
    this.cursorY += 60;

    const totalHeight = this.cursorY;
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        const maxScroll = Math.max(0, totalHeight - this.cameras.main.height + SCROLL_BOTTOM_PADDING);
        this.content.y = Phaser.Math.Clamp(this.content.y - dy, -maxScroll, 0);
      },
    );
  }

  private section(title: string) {
    this.text(24, this.cursorY, title, 18, '#7fa8c9', true);
    this.cursorY += 32;
  }

  private text(x: number, y: number, value: string, fontSize: number, color: string, bold = false) {
    const t = this.add.text(x, y, value, {
      fontFamily: 'sans-serif',
      fontSize: `${fontSize}px`,
      color,
      fontStyle: bold ? 'bold' : 'normal',
    });
    this.content.add(t);
    return t;
  }

  /** One sprite + caption. If `animKey` is null, shows a static frame (e.g. the bullet).
   * `oneShot` replays a non-looping anim (death) after a pause so it stays watchable. */
  private spriteDemo(
    x: number,
    textureKey: string,
    animKey: string | null,
    scale: number,
    caption: string,
    oneShot = false,
  ) {
    const y = this.cursorY + 70;
    const sprite = this.add.sprite(x, y, textureKey).setScale(scale);
    this.content.add(sprite);

    if (animKey) {
      sprite.play(animKey);
      if (oneShot) {
        sprite.on('animationcomplete', () => {
          this.time.delayedCall(REPLAY_DELAY_MS, () => sprite.play(animKey));
        });
      }
    }

    this.text(x, y + 90, caption, 13, '#9fb3c8').setOrigin(0.5, 0);
  }
}
```

FILE: src/scenes/MenuScene.ts
```ts
import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { preloadBgmData, playBgm } from '../content/bgm';
import { preloadSfxData } from '../content/sfx';
import { preloadPlayerState, getLevelCompleted, setLevelCompleted } from '../content/playerState';

/** Entry point scene: title + Start/Continue buttons. Credits button is future work
 * (plan.md step 10) -- not built yet, nothing to link it to. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  preload() {
    preloadBgmData(this);
    // Button.ts's ui_click fires from this scene's buttons too, not just GameScene's
    // popups -- sfx.csv needs to be loaded here as well, or playSfx() crashes on click
    // (found live: "Cannot read properties of undefined (reading 'trim')" in parseCsv,
    // since scene.cache.text.get() returned undefined for a CSV this scene never loaded).
    preloadSfxData(this);
    // getLevelCompleted()'s player_state.json fallback path (first run ever, before
    // anything's been persisted to localStorage) reads through this.
    preloadPlayerState(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f14');
    const { width, height } = this.cameras.main;
    playBgm(this);

    this.add
      .text(width / 2, height / 2 - 100, 'Perimeter Zero', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const levelCompleted = getLevelCompleted(this);

    new Button(this, width / 2, height / 2, 'Start', () => {
      // Fresh run: clear any persisted progress so GameScene's levelCompleted+1 resolves
      // to Stage 1, not wherever a previous run left off.
      setLevelCompleted(0);
      this.scene.start('game');
    });

    // Only meaningful once something's actually been persisted -- levelCompleted === 0
    // means either a first-ever run or a fresh Start, either way there's nothing to
    // resume into that Start doesn't already do.
    if (levelCompleted > 0) {
      new Button(
        this,
        width / 2,
        height / 2 + 76,
        `Continue - Level ${levelCompleted + 1}`,
        () => this.scene.start('game'),
      );
    }
  }
}
```

FILE: src/ui/AugmentChoicePopup.ts
```ts
import Phaser from 'phaser';
import { Popup, PopupButtonSpec } from './Popup';

export interface AugmentChoiceOption {
  name: string;
  desc: string;
  damage: number;
  onChoose: () => void;
}

export interface AugmentChoicePopupOptions {
  options: AugmentChoiceOption[];
  /** First-ever popup only (brief-tutorial.md) -- reuses Popup's own `lines` field, same as
   * IntroDialoguePopup does for the level-1 backstory. */
  hintLines?: string[];
}

/** Shown on an in-battle Augment level-up (brief-augment.md step 4): offers a choice between
 * whatever Augments actually exist. With one Augment (today), this degrades to a single
 * "confirm" button rather than duplicating it to fill 3 slots -- identical choices aren't a
 * real choice; this naturally becomes a real 3-way pick once the pool has more Augments,
 * with no further code changes needed here. Each option shows its description and damage as
 * Popup sublines (brief-tutorial.md) -- previously name-only, even though AugmentTier already
 * carried desc/damage unused. */
export class AugmentChoicePopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: AugmentChoicePopupOptions) {
    const buttons: PopupButtonSpec[] = opts.options.map((option) => ({
      label: option.name,
      onClick: option.onChoose,
      sublines: [option.desc, `Damage: ${option.damage}`],
    }));

    super(scene, x, y, {
      message: 'LEVEL UP!',
      color: '#4ade80',
      lines: opts.hintLines,
      buttons,
    });
  }
}
```

FILE: src/ui/Button.ts
```ts
import Phaser from 'phaser';
import { playSfx } from '../content/sfx';

const WIDTH = 220;
const HEIGHT = 56;
const BG_COLOR = 0x1f2a36;
const BG_HOVER_COLOR = 0x2c3b4d;
const BORDER_COLOR = 0x3a4a5c;
const TEXT_COLOR = '#ffffff';

/**
 * Reusable clickable button: background rect + centered label, hover feedback.
 * Shared primitive for the main menu and the end-of-run popup (plan.md steps 9-11).
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
    super(scene, x, y);

    const bg = scene.add
      .rectangle(0, 0, WIDTH, HEIGHT, BG_COLOR)
      .setStrokeStyle(2, BORDER_COLOR);
    const text = scene.add
      .text(0, 0, label, { fontFamily: 'sans-serif', fontSize: '20px', color: TEXT_COLOR })
      .setOrigin(0.5);

    this.add([bg, text]);
    this.setSize(WIDTH, HEIGHT);

    // Every use so far (HUD, menu, popup) is screen-fixed UI. Phaser's input hit-test reads
    // each interactive object's OWN scrollFactor, not its parent Container's -- setting
    // scrollFactor(0) only on this outer container makes the button *render* fixed to the
    // screen while its actual click target stays anchored in world space and drifts the
    // moment the camera scrolls. Set it on every child that participates in rendering/hit
    // testing, not just the container, so this can't silently break for the next caller.
    this.setScrollFactor(0);
    bg.setScrollFactor(0);
    text.setScrollFactor(0);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(BG_HOVER_COLOR));
    bg.on('pointerout', () => bg.setFillStyle(BG_COLOR));
    bg.on('pointerdown', () => {
      playSfx(scene, 'ui_click');
      onClick();
    });

    scene.add.existing(this);
  }
}
```

FILE: src/ui/DevLog.ts
```ts
import Phaser from 'phaser';

const MAX_LINES = 5;
const PADDING = 16;

/** Dev-only rolling log, bottom-left of the screen -- shows the most recent MAX_LINES
 * messages, newest at the bottom. Callers gate construction on import.meta.env.DEV; this
 * class doesn't check it itself. Origin (0,1) anchors the bottom-left corner, so the panel
 * grows upward as lines are added instead of shifting position. */
export class DevLog {
  private lines: string[] = [];
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { height } = scene.cameras.main;
    this.text = scene.add
      .text(PADDING, height - PADDING, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#9fb3c8',
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(1000);
  }

  log(message: string) {
    this.lines.push(message);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.text.setText(this.lines.join('\n'));
  }
}
```

FILE: src/ui/GameEndPopup.ts
```ts
import Phaser from 'phaser';
import { Popup, PopupButtonSpec } from './Popup';

export interface GameEndPopupOptions {
  won: boolean;
  onRestart: () => void;
  onMainMenu: () => void;
}

/** The end-of-run popup: "GAME OVER" (loss -- Restart + Main Menu) or "YOU SURVIVED" (win --
 * Main Menu only). Extends the generic Popup shell rather than GameScene building the
 * message/color/button-set inline -- keeps that presentation logic out of GameScene, which
 * only needs to say "the round ended, won or lost." */
export class GameEndPopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: GameEndPopupOptions) {
    const buttons: PopupButtonSpec[] = opts.won
      ? [{ label: 'Main Menu', onClick: opts.onMainMenu }]
      : [
          { label: 'Restart', onClick: opts.onRestart },
          { label: 'Main Menu', onClick: opts.onMainMenu },
        ];

    super(scene, x, y, {
      message: opts.won ? 'YOU SURVIVED' : 'GAME OVER',
      color: opts.won ? '#4ade80' : '#ff3b3b',
      buttons,
    });
  }
}
```

FILE: src/ui/IntroDialoguePopup.ts
```ts
import Phaser from 'phaser';
import { Popup } from './Popup';

export interface IntroDialoguePopupOptions {
  onDismiss: () => void;
}

/** Shown once ever (brief-tutorial.md), at the very start of a first-time player's level 1,
 * before the round timer starts. Backstory copy is lifted from content_pipeline/GDD_lore.md
 * §1's actual premise, not invented here -- "nobody else showed up to hold it, you did" is
 * the source doc's own hook. Reuses Popup's `lines` field for the body text, its first real
 * populated use. */
export class IntroDialoguePopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: IntroDialoguePopupOptions) {
    super(scene, x, y, {
      message: 'PERIMETER ZERO',
      lines: [
        "An excavation crew cracked open a demon portal nobody knew was down there.",
        'This breach point is the only thing between them and everywhere else.',
        'Nobody else showed up to hold it. You did.',
      ],
      buttons: [{ label: "Let's go", onClick: opts.onDismiss }],
    });
  }
}
```

FILE: src/ui/LevelCompletePopup.ts
```ts
import Phaser from 'phaser';
import { Popup } from './Popup';

export interface LevelCompletePopupOptions {
  levelId: string;
  onNext: () => void;
}

/** Shown when a stage's survive-timer runs out and the run isn't over (see GameScene.win())
 * -- distinct from GameEndPopup's win/loss framing since the run itself keeps going, just
 * into the next stage. Single "Next" button; GameScene owns what actually happens on click
 * (persist progress, advance currentLevelId, restart), same split GameEndPopup already uses
 * for onRestart/onMainMenu. */
export class LevelCompletePopup extends Popup {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: LevelCompletePopupOptions) {
    super(scene, x, y, {
      message: `LEVEL ${opts.levelId} COMPLETE`,
      color: '#4ade80',
      buttons: [{ label: 'Next', onClick: opts.onNext }],
    });
  }
}
```

FILE: src/ui/Popup.ts
```ts
import Phaser from 'phaser';
import { Button } from './Button';

const PANEL_WIDTH = 420;
const PANEL_COLOR = 0x131a22;
const PANEL_BORDER = 0x3a4a5c;
const BUTTON_HEIGHT = 56; // matches Button's own height, used for vertical layout math
const BUTTON_GAP = 16;
const LINE_GAP = 10;
const SUBLINE_TOP_PADDING = 10; // extra gap between a button and its own sublines below it
const PANEL_PADDING_TOP = 32;
const PANEL_PADDING_BOTTOM = 32;
// Horizontal padding on each side, inside the panel -- also the wordWrap width for every
// text element, so copy wraps inside the panel instead of overflowing its edges.
const CONTENT_WIDTH = PANEL_WIDTH - 48;

export interface PopupButtonSpec {
  label: string;
  onClick: () => void;
  /** Optional small text lines rendered directly below this button (e.g. an Augment's
   * description + damage in AugmentChoicePopup) -- generic on Popup itself, not
   * AugmentChoicePopup-specific, since any future multi-option popup could reasonably want
   * per-option detail without inventing its own layout math from scratch. */
  sublines?: string[];
}

export interface PopupOptions {
  message: string;
  color?: string;
  /** Optional lines rendered between the message and the buttons -- used by
   * IntroDialoguePopup's backstory copy and AugmentChoicePopup's first-time hint line
   * (brief-tutorial.md). */
  lines?: string[];
  buttons: PopupButtonSpec[];
}

/**
 * Base modal shell: panel + message + optional content lines + a stack of buttons. Deliberately
 * thin -- specific popups (GameEndPopup today; stage-select/weapon-upgrade/level-up later) each
 * extend this for their own content/behavior rather than this class growing a case for every
 * popup that will ever exist. Every child forces scrollFactor(0), same reasoning as Button -- a
 * container's own scrollFactor doesn't propagate to its children for input hit-testing, so
 * each render/interactive object needs to set it itself.
 *
 * Layout is two-pass: every text/button element is created and measured (real height, after
 * word-wrap) at a provisional y first, then the whole content block is re-centered and the
 * panel sized to fit it. Height can't be predicted from a fixed lines-count/buttons-count
 * formula once wordWrap is involved -- one line of copy can render as 1-3 visual lines
 * depending on length, so the panel has to be sized from what actually got rendered.
 */
export class Popup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: PopupOptions) {
    super(scene, x, y);

    // Positioned provisionally (top-down from local y=0); shifted into their final,
    // re-centered position once the total content height is known.
    const children: (Phaser.GameObjects.Text | Button)[] = [];
    let cursorY = 0;

    const message = scene.add
      .text(0, cursorY, opts.message, {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: opts.color ?? '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: CONTENT_WIDTH },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    children.push(message);
    cursorY += message.height + 24;

    for (const line of opts.lines ?? []) {
      const lineText = scene.add
        .text(0, cursorY, line, {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#9fb3c8',
          align: 'center',
          wordWrap: { width: CONTENT_WIDTH },
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0);
      children.push(lineText);
      cursorY += lineText.height + LINE_GAP;
    }

    cursorY += 20;
    for (const btn of opts.buttons) {
      const button = new Button(scene, 0, cursorY + BUTTON_HEIGHT / 2, btn.label, btn.onClick);
      children.push(button);
      cursorY += BUTTON_HEIGHT;
      if (btn.sublines?.length) cursorY += SUBLINE_TOP_PADDING;
      for (const subline of btn.sublines ?? []) {
        const subText = scene.add
          .text(0, cursorY, subline, {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            color: '#9fb3c8',
            align: 'center',
            wordWrap: { width: CONTENT_WIDTH },
          })
          .setOrigin(0.5, 0)
          .setScrollFactor(0);
        children.push(subText);
        cursorY += subText.height;
      }
      cursorY += BUTTON_GAP;
    }

    const panelHeight = cursorY + PANEL_PADDING_BOTTOM + PANEL_PADDING_TOP;

    // Re-center: content was laid out top-down starting at local y=0 -- shift everything up
    // so the panel (and this popup's x/y, which callers treat as the visual center) stays
    // centered regardless of how tall the wrapped content turned out to be.
    const shiftY = -panelHeight / 2 + PANEL_PADDING_TOP;
    for (const child of children) {
      child.y += shiftY;
    }

    const panel = scene.add
      .rectangle(0, 0, PANEL_WIDTH, panelHeight, PANEL_COLOR)
      .setStrokeStyle(2, PANEL_BORDER)
      .setScrollFactor(0);

    this.add(panel);
    this.add(children);

    this.setScrollFactor(0);
    scene.add.existing(this);
  }
}
```

FILE: src/vite-env.d.ts
```ts
// Minimal ambient declaration for import.meta.env.DEV -- this project's tsconfig.json has
// "types": [], which deliberately excludes vite/client's full ambient types (same reason the
// CSV loaders use Phaser's load.text() instead of Vite's ?raw import). Only DEV is used
// anywhere in the codebase; add more fields here if that changes.
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

FILE: src/weapons/AoeLob.ts
```ts
import Phaser from 'phaser';
import { playSfx } from '../content/sfx';

// Pure animation shape, not a balance stat -- unlike radius/damage/etc, doesn't need to be
// data-driven (see augment_weapon_scale.csv). Blast sprite grows from 0.85x up to its full
// visualRadius-derived size while fading out.
const EXPLOSION_START_SCALE = 0.85;

export interface AoeLobConfig {
  targetX: number;
  targetY: number;
  /** AoE damage radius -- the actual hit-area size used for damage application
   * (onExplode below), independent of how big the explosion visual renders. */
  radius: number;
  travelSpeed: number;
  delayMs: number; // sits after arriving (or after being placed, if !travels), before exploding
  /** Type-A shape column (augment_weapon_scale.csv's `travels`). True = tweens to
   * targetX/targetY like a lobbed identity. False = stays exactly where thrown, on a timed
   * fuse -- a placed identity's shape ("set it, forget it, get reminded when it goes off",
   * GDD_lore.md §4). Previously always true in practice: this field didn't exist and the
   * constructor tweened unconditionally, so augment_weapon_scale.csv's own `travels` column
   * was silently ignored even though it was already being parsed (content/augments.ts's
   * AugmentTier.travels). */
  travels: boolean;
  /** Texture key for the thrown/placed object sprite -- `augment_${identity.id}_object`,
   * loaded by content/augments.ts's loadAugmentAssets() (TICKET-021). Which PNG that
   * resolves to is entirely data-driven off augment_weapon.csv's `asset` column -- this
   * class has no per-identity branching. */
  textureKey: string;
  /** Real-world "radius" the in-flight object -- and, on detonation, the explosion sprite --
   * should visually read as; diameter (2x this) is used as each sprite's on-screen size via
   * setDisplaySize(), so a bigger visual_radius CSV value renders a physically bigger object
   * regardless of the source PNG's native pixel size (TICKET-023: previously this doubled as
   * the Arc primitive's actual radius; now it drives scale on a real sprite instead).
   * Deliberately smaller than the AoE damage `radius` -- this is the augment's own compact
   * footprint, not the (much larger) area actually checked for damage in onExplode below. */
  visualRadius: number;
  color: number;
  explosionColor: number;
  explosionVisualMs: number;
  /** Texture key for the first frame of this augment's explosion VFX --
   * `augment_${identity.id}_explosion_0` (content/augments.ts's loadAugmentAssets(),
   * TICKET-021) -- set as the explosion sprite's initial texture before .play() below takes
   * over. Per-identity, entirely data-driven off augment_weapon.csv's `explosion_asset`
   * column -- no branching on which augment this is (TICKET-024). */
  explosionTextureKey: string;
  /** Animation key for this augment's full explosion VFX -- `augment_${identity.id}_explosion`,
   * registered by content/augments.ts's createAugmentExplosionAnims() (TICKET-022) with a
   * frame rate derived from explosionVisualMs. Playing this is what actually shows the
   * augment's real per-identity frames (e.g. a 7-frame vs. a 10-frame animation) -- the
   * scale-up/fade-out tween below is a separate, timing-independent wrapper around it
   * (TICKET-024). */
  explosionAnimKey: string;
  /** sfx.csv event id (augment_weapon.csv's `deploy_sfx` column, via
   * content/augments.ts's AugmentIdentity.deploySfx) to play the moment this object is
   * thrown/placed -- data-driven per identity so this shared engine never hardcodes an
   * identity-specific sfx key name (TICKET-023 revision: previously branched on `travels`
   * to pick between two literal event ids here). */
  deploySfx: string;
  /** Fired at the moment of detonation. AoeLob only owns its own visual lifecycle -- it
   * doesn't know about Enemy, same split as Bullet not knowing about Enemy either. The
   * caller (GameScene, which owns the enemies list) applies damage here. */
  onExplode: (x: number, y: number, radius: number) => void;
}

/** Type-A Augment mechanic ("aoe_lob" in augment_weapon.csv's `type` column -- see
 * brief-augment.md): either travels to a target point or is placed immediately (see
 * `config.travels`), sits with a fuse delay, then explodes, dealing damage in a radius.
 * Shared engine for every AoeLob-type Augment (a lobbed identity, a placed identity, and
 * eventually artillery strike/orbital strike/homing missile) -- has no per-identity
 * branching anywhere in this file. Renders as the augment's real object sprite in flight
 * (TICKET-023: texture `config.textureKey`, tinted `config.color`, scaled off
 * `config.visualRadius`) and, on detonation, as that same identity's real explosion
 * animation (TICKET-024: texture `config.explosionTextureKey`, tinted
 * `config.explosionColor`, playing `config.explosionAnimKey`, scaled off
 * `config.visualRadius` the same way the object sprite is, so the blast doesn't visually
 * overshoot the real hit area) -- augment_weapon.csv's
 * `asset`/`color`/`visual_radius`/`explosion_asset`/`explosion_color`/`deploy_sfx` columns
 * are the only thing that changes what any given augment looks and sounds like. Stats come
 * from augment_weapon.csv/augment_weapon_scale.csv via content/augments.ts -- this class has
 * no hardcoded numbers of its own. */
export class AoeLob extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, private config: AoeLobConfig) {
    super(scene, x, y, config.textureKey);
    scene.add.existing(this);

    this.setTint(config.color);
    // setDisplaySize adjusts scaleX/scaleY to hit an exact on-screen size regardless of the
    // source texture's native pixel dimensions -- diameter (2x visualRadius) matches what
    // the old Arc primitive's radius used to render as, so this keeps representing the same
    // gameplay-relevant scale, just via a real sprite now instead of a flat circle.
    this.setDisplaySize(config.visualRadius * 2, config.visualRadius * 2);

    playSfx(scene, config.deploySfx);

    if (!config.travels) {
      scene.time.delayedCall(config.delayMs, () => this.explode());
      return;
    }

    const travelDist = Phaser.Math.Distance.Between(x, y, config.targetX, config.targetY);
    const travelMs = Math.max(100, (travelDist / config.travelSpeed) * 1000);

    scene.tweens.add({
      targets: this,
      x: config.targetX,
      y: config.targetY,
      duration: travelMs,
      ease: 'Quad.easeOut',
      onComplete: () => scene.time.delayedCall(config.delayMs, () => this.explode()),
    });
  }

  private explode() {
    const scene = this.scene;
    const { x, y } = this;
    const {
      radius,
      onExplode,
      visualRadius,
      explosionColor,
      explosionVisualMs,
      explosionTextureKey,
      explosionAnimKey,
    } = this.config;

    // Damage application uses the real AoE `radius`, independent of however big the
    // explosion visual itself renders below.
    onExplode(x, y, radius);
    playSfx(scene, 'explode');

    // Real per-identity explosion art (TICKET-024) -- textured with this identity's first
    // explosion frame, tinted config.explosionColor, then handed off to .play() to run the
    // full animation (a 7-frame Grenade blast looks nothing like a 10-frame Land Mine blast,
    // not just the same shape tinted two ways). Scaled off `visualRadius`, the same way the
    // in-flight object sprite is scaled (see constructor above), so the blast doesn't
    // visually overshoot the real hit area.
    const blast = scene.add.sprite(x, y, explosionTextureKey).setTint(explosionColor);
    blast.setDisplaySize(visualRadius * 2, visualRadius * 2);
    const fullScaleX = blast.scaleX;
    const fullScaleY = blast.scaleY;
    blast.setScale(fullScaleX * EXPLOSION_START_SCALE, fullScaleY * EXPLOSION_START_SCALE);
    blast.play(explosionAnimKey);

    // Scale-up/fade-out tween wrapper, unchanged in shape/duration from the placeholder
    // circle it replaces -- explosionVisualMs governs this tween's timing, entirely
    // independent of the animation's own frame timing (which comes from
    // createAugmentExplosionAnims()'s frameRate, see content/augments.ts).
    scene.tweens.add({
      targets: blast,
      scaleX: fullScaleX,
      scaleY: fullScaleY,
      alpha: 0,
      duration: explosionVisualMs,
      onComplete: () => blast.destroy(),
    });

    this.destroy();
  }
}
```

FILE: src/weapons/Bullet.ts
```ts
import Phaser from 'phaser';

export interface BulletConfig {
  angle: number;
  speed: number;
  lifespanMs: number;
  scale: number;
  radius: number;
  /** Damage this bullet deals on hit -- read off the bullet itself (not a scene-level
   * weapon damage field) so player and (eventually) enemy bullets can carry independent
   * values. */
  damage: number;
}

/** A simple travelling projectile: spawns, flies straight at a fixed angle, expires
 * after its lifespan. scale/radius come from weapon.csv (see content/weapons.ts) -- a
 * different weapon's bullet can look/collide differently. */
export class Bullet extends Phaser.GameObjects.Sprite {
  /** Read by GameScene's overlap callbacks instead of a scene-level damage field --
   * lets player bullets and (future) enemy bullets carry their own damage value. */
  readonly damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig) {
    super(scene, x, y, 'bullet');
    this.damage = config.damage;
    this.setScale(config.scale);
    this.setRotation(config.angle); // orient the glow toward its travel direction
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const pbody = this.body as Phaser.Physics.Arcade.Body;
    pbody.setCircle(config.radius, -config.radius, -config.radius);
    pbody.setVelocity(Math.cos(config.angle) * config.speed, Math.sin(config.angle) * config.speed);

    scene.time.delayedCall(config.lifespanMs, () => this.destroy());
  }
}
```

FILE: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "types": []
  },
  "include": ["src"]
}
```

FILE: vite.config.ts
```ts
import { defineConfig } from 'vite';

// host: true exposes the dev server on the LAN / Tailscale IP too.
export default defineConfig({
  server: { host: true },
  // Itch.io serves an uploaded HTML5 build from inside a subdirectory, not domain root --
  // Vite's default absolute asset paths (/assets/...) 404 there, which is exactly what a
  // black screen with no visible error looks like (canvas exists, nothing ever loads into
  // it). Relative paths resolve correctly regardless of what subdirectory it's served from.
  base: './',
});
```
```
