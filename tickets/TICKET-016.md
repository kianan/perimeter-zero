---
id: TICKET-016
title: 'Enemy.ts: preferred-range stand-off + dash-burst cycle'
increment: 16
status: done
acceptance:
- '`tsc --noEmit` passes'
- '`EnemyStats`/`Enemy` constructor accepts `preferredRange`, `dashBurstMult`, `dashBurstMs`,
  `dashCooldownMs`, all defaulting to 0'
- '`chase()` stops the enemy (zero velocity, idle anim) when `preferredRange > 0 &&
  dist <= preferredRange`, and is byte-for-byte equivalent to prior behavior when
  `preferredRange === 0`'
- '`startDashCycle()` exists, uses `scene.time.addEvent` at `dashCooldownMs`, applies
  a distinct tint and multiplies `this.speed` by `dashBurstMult` for `dashBurstMs`,
  then reverts both'
- "Existing rusher/swarm/tank spawns (all `preferredRange === 0`, no dash fields set)\
  \ are unaffected \u2014 no call to `startDashCycle()` exists yet"
---

Add the two new core behaviors to `Enemy.ts` without wiring them to spawning yet. Constructor gains `preferredRange`, `dashBurstMult`, `dashBurstMs`, `dashCooldownMs` on `EnemyStats`, all defaulting to 0 so the 3 existing spawn calls are unaffected. `chase(targetX, targetY)`: when `preferredRange > 0` and `dist <= preferredRange`, zero velocity and play idle anim instead of continuing to close in; `dist > preferredRange` is unchanged. Add `startDashCycle()`: a repeating `scene.time.addEvent` at `dashCooldownMs` that tints the sprite (reusing the hit-flash tint call with a different color) and multiplies `this.speed` by `dashBurstMult` for `dashBurstMs` before reverting both tint and speed. `startDashCycle()` is not yet called by anything.
