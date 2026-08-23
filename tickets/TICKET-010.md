---
id: TICKET-010
title: Expand level_enemies.csv spawn table for stages 1-10
increment: 10
status: done
acceptance:
- level_enemies.csv has exactly 3 rows (rusher/swarm/tank) for each level_id 1-10
  (30 data rows total)
- Every enemy_level value in the file is between 1 and 5 inclusive (no reference to
  a nonexistent tier 6+)
- spawn_rate values are non-increasing (or trending down) across ascending level_id
  for each enemy_id
- Stage 1, 2, 3, and 10 rows match the brief's explicit example values exactly
- The enemy_level column name is unchanged (not renamed) and a comment exists in the
  CSV or adjacent doc noting it's a distinct namespace from level.csv's id
---

Add spawn rows for level_id 2-10 (rusher/swarm/tank each) following the brief's interpolation: spawn_rate trending down per stage, enemy_level stepping up roughly every 2 stages, capped at tier 5 (the ceiling added in increment 1). Fill in the unspecified stages 4-9 consistent with the given stage 1-3 and stage 10 anchors.

**Manually closed by Studio Head, 2026-08-23.** The Engineer's actual output is correct and
complete — checked directly against `brief-10-levels.md`'s exact stage 1/2/3/10 anchor values
and it matches verbatim, stages 4-9 interpolate reasonably, and `public/data/README.md` (added
by the Engineer) documents the `enemy_level`/`level.csv id` namespace distinction the last
acceptance criterion asked for. The 4 REVISE cycles were the Producer's review repeatedly
flagging this ticket for not literally embedding the brief's source numbers in its own
description (a ticket-authoring gap, not a code gap) — same class of issue as TICKET-006's
block on the previous brief, not a new failure mode.
