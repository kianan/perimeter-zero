---
id: TICKET-006
title: Wire Player pause/resume into GameScene's augment-choice pause
increment: 6
status: in_progress
acceptance:
- openAugmentChoice() (GameScene.ts:387) calls `this.player.pause()` in addition to
  `this.physics.pause()`
- resumeAfterAugmentChoice() (GameScene.ts:417) calls `this.player.resume()` in addition
  to `this.physics.resume()`
- No other lines in GameScene.ts changed; Bullet.ts and AoeLob.ts are untouched
- '`tsc --noEmit` passes'
---

In GameScene.ts, call `this.player.pause()` inside openAugmentChoice() alongside the existing `this.physics.pause()`, and call `this.player.resume()` inside resumeAfterAugmentChoice() alongside the existing `this.physics.resume()`.
