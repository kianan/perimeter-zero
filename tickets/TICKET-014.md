---
id: TICKET-014
title: Bullet damage field + enemy-bullet damage path
increment: 14
status: done
acceptance:
- '`tsc --noEmit` passes'
- '`BulletConfig` has a `damage: number` field and `Bullet` exposes it as a public
  readonly property'
- '`Player.ts`''s `onFire` passes `damage: this.bulletDamage` when constructing bullets'
- GameScene's player-bullet/enemy overlap callback reads `(bulletObj as Bullet).damage`
  and no longer references the old scene-level `this.bulletDamage` field at that call
  site
- 'GameScene declares `private enemyBullets: Bullet[] = []`, resets it in `create()`,
  and registers a `physics.add.overlap(this.player, this.enemyBullets, ...)` handler
  that destroys the bullet and calls `this.player.takeDamage(bulletDamage)`'
- Firing the player's current weapon deals exactly the same damage as before this
  change (regression check)
---

Shared prerequisite: give bullets their own damage value instead of relying on the scene-level weapon damage, and add the missing enemy-to-player damage path. Add `damage: number` to `BulletConfig` and store it as a public readonly field on `Bullet` (Bullet.ts). Update `Player.ts`'s `onFire` to pass `damage: this.bulletDamage` when constructing the player's bullets. Change `GameScene`'s existing player-bullet/enemy overlap to read `(bulletObj as Bullet).damage` instead of `this.bulletDamage`. Add `private enemyBullets: Bullet[] = []` to `GameScene`, reset it in `create()` alongside the other arrays, and add a new `physics.add.overlap(this.player, this.enemyBullets, ...)` that destroys the bullet and calls `this.player.takeDamage((bulletObj as Bullet).damage)`. No enemy fires bullets yet in this increment.
