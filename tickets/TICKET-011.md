---
id: TICKET-011
title: Wire levelCompleted read/write in player state
increment: 11
status: in_progress
acceptance:
- content/playerState.ts exports a function that reads levelCompleted from
  localStorage if present, falling back to player_state.json's baked-in value
  (currently 0) if localStorage has nothing set yet
- content/playerState.ts exports a function that writes an updated levelCompleted
  value to localStorage
- Calling the write function then calling the read function returns the newly
  written value, not the player_state.json fallback
- No other fields read from player_state.json (mainWeapon, playerLevel) change
  behavior — they keep reading from the static JSON exactly as before
- tsc --noEmit passes
---

Add (or confirm/extend) a read/write path in content/playerState.ts so levelCompleted can be
persisted, alongside the existing read of that field. No GameScene changes yet — this
increment only makes persistence possible and independently testable.

**Revised by Studio Head, 2026-08-23** — the Engineer correctly pushed back that this is a
pure client-side Vite/Phaser bundle with no Node `fs`/backend access, so writing to
`player_state.json` on disk from browser code isn't actually possible. Persist via
`localStorage` instead (key suggestion: `pz_levelCompleted`, but that's an implementation
detail, not an acceptance criterion). `player_state.json`'s `levelCompleted: 0` remains the
fallback for a browser that has never persisted anything yet — don't remove that field from
the JSON.
