---
id: TICKET-005
title: Add Player paused state and gate fire()
increment: 5
status: done
acceptance:
- Player.ts declares a `private paused = false` field distinct from `frozen`
- 'Player.ts exposes `pause(): void` that sets `this.paused = true` and `resume():
  void` that sets `this.paused = false`'
- fire()'s early-return condition reads `if (this.dead || this.frozen || this.paused)
  return;`
- move() is unchanged (no reference to the new `paused` field)
- '`tsc --noEmit` passes'
---

In Player.ts, add a new `private paused = false` field (separate from the existing `frozen` field) and two public methods, `pause()` and `resume()`, that set/clear it. Update fire()'s early-return guard to include the new flag.
