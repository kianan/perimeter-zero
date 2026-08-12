---
id: TICKET-004
title: Spawn tank in Stage 1
increment: 4
status: done
acceptance:
- 'public/data/level_enemies.csv has a new row: level_id=1, enemy_id=tank, a numeric
  spawn_rate, enemy_level=1.'
- The existing rusher and swarm rows in level_enemies.csv are unchanged.
- Playing Stage 1 long enough shows tank enemies spawning alongside rusher/swarm,
  visibly taking more hits to kill and moving slower than rusher/swarm, with no crashes
  or console errors tied to the tank enemy.
- No files other than public/data/level_enemies.csv are modified in this increment.
---

Add a `tank` spawn entry to public/data/level_enemies.csv for the existing Stage 1 (level_id=1) so tank enemies actually appear in a normal playthrough, using the stats and archetype wired up in the previous increments.
