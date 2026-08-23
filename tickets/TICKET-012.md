---
id: TICKET-012
title: 'GameScene progression: advance through stages 1-10'
increment: 12
status: done
acceptance:
- tsc --noEmit passes
- GameScene.ts no longer has a module-level `const LEVEL_ID = '1'`; currentLevelId
  is a private instance field
- currentLevelId's initial value is computed from content/playerState.ts's levelCompleted
  read + 1, clamped to '1' when that value is 0 or less
- win() when currentLevelId < '10' calls the localStorage write path from content/playerState.ts,
  increments currentLevelId, and calls this.scene.restart() without calling endRound(true)
- win() when currentLevelId === '10' calls endRound(true) exactly as before, with
  no persistence of a stage beyond 10
- endRound(false) (death path) contains no calls to the levelCompleted write path
  and no currentLevelId increment
---

Replace the hardcoded module-level LEVEL_ID constant with an instance field currentLevelId, initialized from content/playerState.ts's levelCompleted read (localStorage-backed, +1, clamped to '1'). Update win() so stages 1-9 persist levelCompleted via the write path from the previous increment, increment currentLevelId, and restart the scene instead of ending the run; stage 10 keeps today's endRound(true) behavior. endRound(false) remains unchanged (no advance, no persist).
