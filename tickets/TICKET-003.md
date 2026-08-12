---
id: TICKET-003
title: Register tank archetype using the shared chase pattern
increment: 3
status: in_progress
acceptance:
- ENEMY_ARCHETYPES in archetypes.ts has a `tank` key whose value only sets existing
  EnemyArchetype fields (initialTexture, idleAnim, moveAnim, optional deathAnim);
  the EnemyArchetype interface itself is unchanged.
- tank's initialTexture/idleAnim/moveAnim (and deathAnim if set) reference texture/anim
  keys that are actually created in characterAssets.ts.
- src/enemies/Enemy.ts is unmodified in this increment (diff excludes it).
- Manually instantiating `new Enemy(scene, x, y, ENEMY_ARCHETYPES.tank, stats)` in
  a running scene and calling chase(targetX, targetY) renders the placeholder sprite,
  plays its idle/move animation, and moves toward the target with no Phaser missing-texture
  console warnings.
---

Add a `tank` entry to ENEMY_ARCHETYPES in src/enemies/archetypes.ts, referencing the tank_ texture/anim keys from the previous increment, using the exact same object shape already used for rusher/swarm. Tank enemies must use Enemy.ts's existing chase() verbatim -- no new AI, movement, or rendering code.
