---
id: TICKET-018
title: 'Real art: Shooter frames + Tank art swap'
increment: 18
status: in_progress
acceptance:
- '`tsc --noEmit` passes'
- '`archetypes.ts` loads `shooter_*` keys from `assets/enemies/ranged/*.png`, not
  from a rusher path'
- '`archetypes.ts` still loads `charger_*` keys from `assets/enemies/rusher/*.png`
  (placeholder retained)'
- '`characterAssets.ts` loads all `tank_*` keys from `assets/enemies/tank/${anim}_${i}.png`
  with unchanged key names and frame counts'
- Spawning a Shooter or a Tank produces no missing-texture warnings in the console
- Tank's stats/movement behavior is unchanged from before this increment (visual-only
  change)
---

Swap placeholder art for the two archetypes that now have real sprites. In `archetypes.ts`, point Shooter's `shooter_*` texture keys at `assets/enemies/ranged/*.png` (same `idle_0..5`/`walk_0..7`/`death_0..9` frame-count convention as rusher) instead of the rusher placeholder used in the previous increment. Charger keeps reusing `assets/enemies/rusher/*.png` under `charger_*` keys (still no real art — out of scope). Separately in `characterAssets.ts`, swap Tank's load paths from `assets/enemies/rusher/${anim}_${i}.png` to `assets/enemies/tank/${anim}_${i}.png`, keeping the same `tank_` key names and same `ANIMS`/`TANK_DEATH_FRAMES` counts.
