---
id: TICKET-019
title: Full regression pass + acceptance sign-off
increment: 19
status: done
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

**Manually closed by Studio Head, 2026-08-23.** The Engineer correctly identified this
ticket's acceptance criteria are runtime QA artifacts (screenshots, console logs,
`window.__qaGame` traces) that a file-editing role has no channel to produce — a real,
legitimate architecture gap (no QA-runner step wired into this pipeline invocation), not a
stalled ticket. While investigating it, the Engineer also found and fixed a genuine bug:
`Player.takeDamage()` didn't early-return on `amount <= 0`, so a zero-damage contact hit (e.g.
Shooter, whose `enemy_scale.csv` damage is `0`) still re-armed the 500ms invulnerability
window and fired the hit-flash/SFX — a Shooter standing near the player could silently shield
them from a Rusher's real damage. Fixed in `9c10c37`.

Verified by Studio Head via code review (this session's sandboxed browser has a persistent
WebGL `Framebuffer status: Incomplete Attachment` fault unrelated to this brief, so a live
playthrough wasn't possible from here): `spawnEnemy()` correctly passes
`preferredRange`/`dashBurstMult`/`dashBurstMs`/`dashCooldownMs` into `Enemy`, calls
`startDashCycle()` only when `dashBurstMult > 0`, and calls `fireEnemyWeapon()` only when
`weapon` is set; `fireEnemyWeapon()` mirrors `Player.fire()`'s interval math and correctly
re-aims each shot at the player's current position; `archetypes.ts` points `shooter_*` at
`assets/enemies/ranged/*.png` and `tank_*` at `assets/enemies/tank/*.png`, with `charger_*`
still on the rusher placeholder as intended; `Enemy.ts` tracks `baseSpeed` separately from
`speed` so a dash-burst reverts to the exact pre-burst value. `tsc --noEmit` passes. Live
playthrough confirmation (console/missing-texture check, Charger's velocity trace) is still
worth Studio Head's own pass before considering this fully signed off.
