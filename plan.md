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
- [ ] 6. Basic spawner — enemies appear on a timer
- [ ] 7. Win condition (survive N seconds) + minimal HUD (health, timer)
- [ ] 8. Swap in generated names from `content_pipeline/` (weapons.md / enemies.md)

Once 0–7 are playable end to end, resume routing well-scoped **additive** work (a second enemy
type, a second weapon, a second wave) to the agent pipeline — that's genuine incremental
extension of an established pattern, which is what it's actually good at. Foundational,
interdependent systems (this list) get hand-built.

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
