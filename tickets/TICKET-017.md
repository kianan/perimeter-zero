---
id: TICKET-017
title: 'GameScene wiring: spawn Shooter/Charger with real behavior + enemy weapon
  fire'
increment: 17
status: done
acceptance:
- '`tsc --noEmit` passes'
- '`spawnEnemy()` passes `preferredRange`/`dashBurstMult`/`dashBurstMs`/`dashCooldownMs`
  from `getEnemy()` into the `Enemy` constructor, and calls `startDashCycle()` only
  when `dashBurstMult > 0`'
- '`fireEnemyWeapon(enemy)` exists, is invoked for spawned enemies with a non-blank
  `weapon` FK, spawns `Bullet`s into `this.enemyBullets` aimed at the player at the
  correct fire-rate interval, and stops once the enemy is `dying`'
- Spawned Shooter stops at `preferred_range` instead of walking into the player, and
  standing still next to it with no bullet in flight deals no contact damage to the
  player (its `enemy_scale.csv` damage is 0)
- Shooter's fired bullets damage the player on hit and are destroyed/expire otherwise
- Spawned Charger periodically speeds up then returns to normal pace; `window.__qaGame`
  shows its velocity magnitude actually increases during a burst window
- '`level_enemies.csv` contains the `shooter`/`charger` rows for stage 1'
- Existing rusher/swarm spawn behavior is unchanged (regression check)
---

Wire the previous two increments together so Shooter and Charger are actually playable. In `spawnEnemy()`, read the new `enemy.csv` fields via `getEnemy()`, pass them into the `Enemy` constructor, and call `startDashCycle()` when `dashBurstMult > 0`. Add `fireEnemyWeapon(enemy: Enemy)`: for a spawned enemy with a non-blank `weapon` FK, arm a `scene.time.addEvent` at the `1000 / fireRate`-derived interval (mirroring `Player.ts`) that spawns a `Bullet` (with `damage` from the resolved weapon) aimed from the enemy toward the player's current position, pushed into `this.enemyBullets`; stop firing once the enemy is `dying` (same guard `chase()` uses). Add `shooter`/`charger` entries to `archetypes.ts` using placeholder art reuse for both for now (real art swap is the next increment). Add `1,shooter,5000,1` and `1,charger,5500,1` to `level_enemies.csv` so both are reachable for manual QA.
