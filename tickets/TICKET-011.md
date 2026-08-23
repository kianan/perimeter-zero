---
id: TICKET-011
title: Wire levelCompleted read/write in player state
increment: 11
status: in_progress
acceptance:
- content/playerState.ts exports a function that writes an updated levelCompleted
  value to player_state.json on disk
- Calling the write function with a value updates the on-disk JSON's levelCompleted
  field and leaves other fields untouched
- Existing read of levelCompleted from player_state.json still returns the correct
  value after a write
- tsc --noEmit passes
---

Add (or confirm/extend) a write path in content/playerState.ts so levelCompleted can be persisted to player_state.json, alongside the existing read of that field. No GameScene changes yet — this increment only makes persistence possible and independently testable.
