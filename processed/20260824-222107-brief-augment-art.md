# Brief: Real art for Grenade/Land Mine + their explosions

Today, `AoeLob.ts` (the shared engine for every `aoe_lob`-type Augment — Grenade, Land Mine)
renders as a plain `Phaser.GameObjects.Arc` (a flat-colored circle, no sprite) for both the
thrown/placed object and its explosion — `brief-augment.md` deliberately deferred real art.
This brief replaces the placeholder shapes with real sprites. **No art generation pipeline
exists in this repo** (checked — PixelLab is only mentioned as a future idea in the GDD, never
wired up), so the files were sourced directly by Studio Head, not produced by this pipeline.

## What's already on disk

Real, CC0-sourced assets already exist at:
```
public/assets/weapons/augments/grenade/grenade.png        -- static, 992x992
public/assets/weapons/augments/landmine/landmine.png       -- static, 320x320
public/assets/vfx/explosion/explosion_1/explosion_0.png..explosion_6.png    -- 7 frames, Grenade's
public/assets/vfx/explosion/explosion_2/explosion_0.png..explosion_9.png    -- 10 frames, Land Mine's
```
**Revised from the original plan: two separate explosion animations, not one shared sprite.**
The original brief planned a single shared explosion tinted per-augment via `explosion_color`,
to avoid sourcing two assets. Studio Head found two genuinely different explosion animations
instead — different frame counts (7 vs 10), different source dimensions (48×48 vs 128×80),
different look — and that's a better outcome, not a compromise, so the brief changes to match
what's actually on disk rather than force the old plan onto it. Frame files are already
renamed to a fixed `explosion_0.png`, `explosion_1.png`, ... convention (matching the exact
naming pattern `characterAssets.ts` already uses for `idle_0`/`walk_0`/etc.) — originally
`frame1.png..frame7.png` and `explosion-c1.png..c10.png`, inconsistent with each other and
with the project's own convention, and alphabetically mis-sortable (`c10` sorts before `c2`).

**Explicit design goal for this brief: zero per-augment-name branching in code.** Everything
that differs between Grenade and Land Mine (object sprite, explosion frames, frame count,
tint) must come from CSV data plus a fixed folder-naming convention — the same generic
`asset`-column pattern `weapon.csv`/`enemy.csv` already use, extended to also carry an
animated sequence. Adding a third `aoe_lob` augment later should mean a new CSV row and a new
asset folder, not a new `if` branch anywhere in `AoeLob.ts` or `content/augments.ts`.

## Data model — `augment_weapon.csv` gains three columns

```
id,name,desc,type,visual_radius,color,explosion_color,explosion_visual_ms,asset,explosion_asset,explosion_frame_count
1,Grenade,Lobbed explosive that deals area damage,aoe_lob,10,0x88cc44,0xff8800,250,weapons/augments/grenade/grenade,vfx/explosion/explosion_1,7
3,Land Mine,Placed explosive that waits before it detonates,aoe_lob,10,0x996633,0xff8800,250,weapons/augments/landmine/landmine,vfx/explosion/explosion_2,10
```
- `asset` — path to the object's static sprite, **no file extension** (matches `weapon.csv`'s
  existing convention: `scene.load.image(key, 'assets/' + asset + '.png')`). Note this points
  at the *file*, not just the folder, since the object sprite's filename doesn't follow a
  predictable per-augment pattern the way frame sequences do (`grenade/grenade.png`, not
  `grenade/idle.png`).
- `explosion_asset` — path to the *folder* containing that augment's explosion frames. The
  frame filenames themselves are NOT in the CSV — they're always `explosion_0.png` through
  `explosion_{explosion_frame_count - 1}.png` inside that folder, a fixed convention, not
  per-row data. This is what keeps loading code generic: `for (let i = 0; i <
  explosionFrameCount; i++) load(\`assets/${explosionAsset}/explosion_${i}.png\`)`, same loop
  body regardless of which augment it's loading for.
- `explosion_frame_count` — how many frames to loop over in the loading loop above, and how
  many frames the generated Phaser animation should contain.

`color`/`explosion_color` stay meaningful even with real per-augment explosion art — keep
applying both as tints (see `AoeLob.ts` changes below), same reasoning as the original brief:
real art doesn't retire an existing CSV column just because it's no longer strictly load-bearing
for distinguishing one explosion from another.

## `content/augments.ts` changes

- `AugmentIdentity` gains `asset: string`, `explosionAsset: string`, `explosionFrameCount: number`
  (parsed the same way `weapon`/`type` already are — `Number()` for the count, straight
  pass-through for the two paths).
- `preloadAugmentData(scene)`: after the existing `augment_weapon.csv`/`augment_weapon_scale.csv`
  loads, this needs the *parsed* identities to know what to preload — same ordering constraint
  `preloadEnemyData`/`preloadCharacterAssets` already navigate elsewhere in this codebase (CSV
  text loads synchronously before `create()`, so a two-phase preload — load the CSV, then in a
  `create()`-time step load images by parsed path — is the existing pattern to follow, not a
  new one).
- For each augment identity: `scene.load.image(\`augment_${id}_object\`, \`assets/${asset}.png\`)`,
  then a loop of `explosionFrameCount` calls to `scene.load.image(\`augment_${id}_explosion_${i}\`,
  \`assets/${explosionAsset}/explosion_${i}.png\`)`. Fully generic — no `id === 'grenade'` or
  string-literal branching anywhere in this loop.
- A generic anim-registration step (alongside or inside `createCharacterAnims()`, or its own
  function if that one's scoped to characters specifically — Engineer's call) creates one
  Phaser animation per augment: key `augment_${id}_explosion`, frames
  `augment_${id}_explosion_0..{explosionFrameCount-1}`, same loop-driven construction as the
  load step above.

## `AoeLob.ts` changes

- Change base class from `Phaser.GameObjects.Arc` to `Phaser.GameObjects.Sprite`, texture key
  `augment_${identity.id}_object` (resolved via `content/augments.ts`'s pass-through, same
  pattern `weapon`/`enemy`'s `asset` fields already use elsewhere).
- Keep applying `config.color` as a tint on the object sprite (`setTint`) — still meaningful,
  don't orphan the existing CSV column.
- `explode()`: replace `scene.add.circle(...)` with `scene.add.sprite(x, y,
  \`augment_${identity.id}_explosion_0\`)`, tinted with `config.explosionColor`, then
  `.play(\`augment_${identity.id}_explosion\`)` to run the real per-augment animation — same
  scale-up/fade-out tween wrapping it as before, same `explosionVisualMs` duration for that
  tween (independent of the animation's own frame timing; if the two durations end up visibly
  mismatched once this is actually running, that's a real follow-up, not something to
  pre-solve here).
- `visualRadius`/`radius` CSV columns keep meaning "the actual gameplay hit radius" — sprite
  scale derives from `visualRadius`, same as before, not left at native texture size (source
  images are 992×992/320×320 and 48×48/128×80 — real scaling is not optional here, unlike the
  old placeholder circles which had no native size to fight against).

## Explicitly out of scope

- Any change to `AoeLob`'s actual gameplay logic (travel, delay, damage radius) — this brief
  is visuals-only.
- Sourcing art for anything beyond these two augments (e.g. future artillery/orbital-strike
  augments from the GDD's roster) — new augments bring their own art request when they're
  actually built.
- Reconciling the explosion animation's own playback duration against `explosion_visual_ms`'s
  tween duration if they turn out to look mismatched live — flagged above, not solved here.

## Constraints

- Phaser 3 + TypeScript, no new libraries.
- Don't touch `augment_weapon_scale.csv` — this brief only adds columns to
  `augment_weapon.csv` (identity/visuals table), nothing on the per-level stats table.
- No per-augment-id branching (`if (id === 'grenade')` or similar) anywhere in the loading,
  animation-registration, or rendering code — everything must be driven by the new CSV columns
  plus the fixed `explosion_{i}.png` naming convention.

## Acceptance (QA)

- `tsc --noEmit` passes.
- Grenade and Land Mine both render as their real static sprite (not a flat circle) in a live
  run, correctly tinted per their `color` column.
- Explosion on detonation plays the augment's own real animation (Grenade: 7 frames; Land
  Mine: 10 frames) — visibly different between the two, not the same sprite tinted two ways.
- Visual size still matches the actual damage radius closely enough that a hit enemy visibly
  overlaps the explosion sprite (regression check on the existing "shouldn't visually overshoot
  the real hit area" comment already in `AoeLob.ts`).
- Grepping the diff for `'grenade'`/`'landmine'`/`"grenade"`/`"landmine"` string literals in
  any `.ts` file finds none — confirms the no-hardcoding constraint held.
