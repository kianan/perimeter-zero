---
id: TICKET-015
title: CSV data model + ResolvedEnemy pass-through for Shooter/Charger
increment: 15
status: in_progress
acceptance:
- '`tsc --noEmit` passes'
- '`enemy.csv` has `shooter` and `charger` rows matching the brief''s values, and
  the 3 existing rows have 0/blank in all 4 new columns'
- '`weapon.csv` and `weapon_scale.csv` each have a new row with id `2` matching the
  brief''s values'
- '`enemy_scale.csv` has `shooter,1,0,15,90` and `charger,1,18,25,140` rows'
- '`ResolvedEnemy` in `content/enemies.ts` includes `preferred_range`, `dash_burst_mult`,
  `dash_burst_ms`, `dash_cooldown_ms` typed as numbers, and `getEnemy(''shooter'')`/`getEnemy(''charger'')`
  return the correct parsed values'
- No existing call site of `getEnemy()` is broken by the interface change
---

Add the new archetypes' data with no behavior change yet. Append the `shooter`/`charger` rows to `enemy.csv` with the new columns (`preferred_range`, `dash_burst_mult`, `dash_burst_ms`, `dash_cooldown_ms`), defaulted to 0/blank for the 3 existing rows. Append weapon id `2` to `weapon.csv` and `weapon_scale.csv` per the brief's exact rows. Add `shooter,1,...` and `charger,1,...` rows to `enemy_scale.csv` (shooter damage = 0). Extend the `ResolvedEnemy` interface in `content/enemies.ts` to include the new fields (same pattern as the already-unused `weapon`/`type` fields) so `getEnemy()` returns them, without yet wiring them into `Enemy`/`GameScene`.
