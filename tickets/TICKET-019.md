---
id: TICKET-019
title: Full regression pass + acceptance sign-off
increment: 19
status: blocked
acceptance:
- '`tsc --noEmit` passes with zero errors'
- Manual/QA playthrough confirms rusher and swarm movement and contact-damage timing
  are identical to pre-brief behavior
- Tank spawns with `assets/enemies/tank/*.png` frames, identical stats/movement to
  before, no missing-texture warnings
- Shooter spawns, stands off at `preferred_range`, fires damaging bullets, deals no
  contact damage while idle next to the player, and renders `assets/enemies/ranged/*.png`
  frames
- Charger spawns, visibly tint-flashes and speeds up on a cycle (confirmed via `window.__qaGame`
  velocity magnitude), then returns to normal pace
- Player-fired bullet damage matches pre-refactor values exactly
- No console errors or missing-texture warnings during a full stage-1 run covering
  all 5 enemy types
---

Final verification pass across the whole brief with no further code changes expected unless a regression is found. Confirm end-to-end: rusher and swarm are pixel-for-pixel unchanged from before this brief; Tank's behavior (stats/movement) is unchanged while its appearance now uses real sprite frames; player-fired bullets still deal exactly the same damage as before the `Bullet.damage` refactor; Shooter and Charger both spawn via `level_enemies.csv` and behave per their acceptance criteria; no missing-texture warnings anywhere in a full playthrough of stage 1.
